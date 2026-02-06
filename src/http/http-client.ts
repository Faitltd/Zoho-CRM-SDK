import { Agent, request } from 'undici';
import {
  AuthError,
  ClientClosedError,
  extractZohoApiError,
  InputValidationError,
  NotFoundError,
  RateLimitError,
  RequestError,
  ResourceLimitError,
  SchemaMismatchError,
  ValidationError
} from '../errors';
import { normalizeLogger, type Logger } from '../logger';
import { normalizeMetrics, type Metrics } from '../metrics';
import {
  normalizeValidationOptions,
  validateSchema,
  type NormalizedValidationOptions,
  type Schema,
  type UnknownFieldInfo
} from '../validation';
import { redactAuditContext, type NormalizedAuditConfig } from '../audit';
import { endSpan, normalizeProfiler, startSpan, type NormalizedProfiler } from '../profiling';
import type { PluginManager } from '../plugins';
import type { RateLimiter } from '../rate-limiter';
import type { ZohoAuth } from '../auth/zoho-auth';
import type { ZohoRegion } from '../auth/types';
import { Readable } from 'node:stream';
import type { ApiResponse, HttpClientOptions, RawResponse, RequestConfig, RetryConfig } from './types';

const REGION_API_BASE_URL: Record<ZohoRegion, string> = {
  US: 'https://www.zohoapis.com',
  EU: 'https://www.zohoapis.eu',
  IN: 'https://www.zohoapis.in',
  AU: 'https://www.zohoapis.com.au',
  CN: 'https://www.zohoapis.com.cn',
  JP: 'https://www.zohoapis.jp'
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  initialDelay: 250,
  backoffMultiplier: 2,
  maxDelay: 2_000
};

const DEFAULT_HTTP_TIMEOUT_MS = 30_000;
const DEFAULT_CONNECTION_POOL = {
  connections: 10,
  pipelining: 1,
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 120_000,
  headersTimeout: DEFAULT_HTTP_TIMEOUT_MS,
  bodyTimeout: DEFAULT_HTTP_TIMEOUT_MS
};

// Default to v2, but allow callers to pass a full /crm/v8/... path explicitly.
const CRM_DEFAULT_BASE_PATH = '/crm/v2';

type UndiciBody = AsyncIterable<Uint8Array> & {
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

type UndiciResponse = {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: UndiciBody;
};

export class HttpClient {
  private readonly auth: ZohoAuth;
  private readonly region: ZohoRegion;
  private readonly retry: RetryConfig;
  private readonly logger: Required<Logger>;
  private readonly rateLimiter?: RateLimiter;
  private readonly metrics: Required<Metrics>;
  private readonly validation: NormalizedValidationOptions;
  private readonly profiler: NormalizedProfiler;
  private readonly requestTimeoutMs: number;
  private readonly dispatcher: Agent;
  private readonly allowInsecureHttp: boolean;
  private readonly audit?: NormalizedAuditConfig;
  private readonly plugins?: PluginManager;
  private readonly activeControllers = new Set<AbortController>();
  private closed = false;

  constructor(
    auth: ZohoAuth,
    region: ZohoRegion,
    retryConfig?: Partial<RetryConfig>,
    logger?: Logger,
    rateLimiter?: RateLimiter,
    metrics?: Metrics,
    validation?: NormalizedValidationOptions,
    profiler?: NormalizedProfiler,
    httpOptions?: HttpClientOptions,
    auditConfig?: NormalizedAuditConfig,
    plugins?: PluginManager
  ) {
    this.auth = auth;
    this.region = region;
    this.retry = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    if (this.retry.maxRetries < 0) {
      this.retry.maxRetries = 0;
    }
    this.logger = normalizeLogger(logger);
    this.rateLimiter = rateLimiter;
    this.metrics = normalizeMetrics(metrics);
    this.validation = normalizeValidationOptions(validation);
    this.profiler = normalizeProfiler(profiler);
    this.requestTimeoutMs = httpOptions?.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;
    this.allowInsecureHttp = httpOptions?.allowInsecureHttp ?? false;
    this.audit = auditConfig;
    this.plugins = plugins;
    const connection = { ...DEFAULT_CONNECTION_POOL, ...(httpOptions?.connection ?? {}) };
    this.dispatcher = new Agent(connection);
  }

  async request<T>(config: RequestConfig<T>): Promise<ApiResponse<T>> {
    if (this.closed) {
      throw new ClientClosedError('HttpClient has been closed.');
    }
    const maxAttempts = this.retry.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await this.schedule(() => this.performRequest<T>(config, attempt));
        return response;
      } catch (error) {
        // Retry only for retryable server failures.
        if (!shouldRetryError(error) || attempt === maxAttempts - 1) {
          this.logFailure(config, error);
          throw error;
        }

        const delayMs = calculateBackoff(
          this.retry.initialDelay,
          this.retry.backoffMultiplier,
          this.retry.maxDelay,
          attempt
        );

        this.metrics.increment('sdk.http.retry', 1, { method: config.method, path: config.path });
        this.metrics.timing('sdk.http.retry.backoff_ms', delayMs, { method: config.method, path: config.path });
        await sleep(delayMs);
      }
    }

    throw new RequestError('Unexpected retry state.', { statusCode: 500 }); // unreachable fallback
  }

  async requestRaw(config: RequestConfig): Promise<RawResponse> {
    if (this.closed) {
      throw new ClientClosedError('HttpClient has been closed.');
    }
    const maxAttempts = this.retry.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await this.schedule(() => this.performRequestRaw(config, attempt));
        return response;
      } catch (error) {
        if (!shouldRetryError(error) || attempt === maxAttempts - 1) {
          this.logFailure(config, error);
          throw error;
        }

        const delayMs = calculateBackoff(
          this.retry.initialDelay,
          this.retry.backoffMultiplier,
          this.retry.maxDelay,
          attempt
        );

        this.metrics.increment('sdk.http.retry', 1, { method: config.method, path: config.path });
        this.metrics.timing('sdk.http.retry.backoff_ms', delayMs, { method: config.method, path: config.path });
        await sleep(delayMs);
      }
    }

    throw new RequestError('Unexpected retry state.', { statusCode: 500 }); // unreachable fallback
  }

  private schedule<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.rateLimiter) {
      return fn();
    }

    // Rate limiting applies per request attempt, including retries.
    return this.rateLimiter.schedule(fn);
  }

  get<T>(
    path: string,
    params?: RequestConfig['params'],
    headers?: RequestConfig['headers'],
    schema?: Schema<T>,
    context?: RequestConfig['context']
  ) {
    return this.request<T>({ method: 'GET', path, params, headers, schema, context });
  }

  post<T>(
    path: string,
    body?: unknown,
    headers?: RequestConfig['headers'],
    schema?: Schema<T>,
    context?: RequestConfig['context']
  ) {
    return this.request<T>({ method: 'POST', path, body, headers, schema, context });
  }

  put<T>(
    path: string,
    body?: unknown,
    headers?: RequestConfig['headers'],
    schema?: Schema<T>,
    context?: RequestConfig['context']
  ) {
    return this.request<T>({ method: 'PUT', path, body, headers, schema, context });
  }

  patch<T>(
    path: string,
    body?: unknown,
    headers?: RequestConfig['headers'],
    schema?: Schema<T>,
    context?: RequestConfig['context']
  ) {
    return this.request<T>({ method: 'PATCH', path, body, headers, schema, context });
  }

  delete<T>(
    path: string,
    params?: RequestConfig['params'],
    headers?: RequestConfig['headers'],
    schema?: Schema<T>,
    context?: RequestConfig['context']
  ) {
    return this.request<T>({ method: 'DELETE', path, params, headers, schema, context });
  }

  private async performRequest<T>(config: RequestConfig<T>, attempt: number): Promise<ApiResponse<T>> {
    if (this.closed) {
      throw new ClientClosedError('HttpClient has been closed.');
    }
    const start = Date.now();
    const span = startSpan(this.profiler, 'sdk.http.request', {
      method: config.method,
      path: config.path,
      attempt
    });
    const baseDomain = REGION_API_BASE_URL[this.region];
    const params = { ...(config.params ?? {}) };
    const headers: Record<string, string> = { ...(config.headers ?? {}) };
    let bodyValue = config.body;
    const beforeContext = {
      method: config.method,
      path: config.path,
      params,
      headers,
      body: bodyValue,
      timeout: config.timeout,
      region: this.region,
      attempt,
      context: config.context
    };
    const beforeOverride = await this.plugins?.runBeforeRequest(beforeContext);
    bodyValue = beforeContext.body;

    if (beforeOverride) {
      const validated = this.maybeValidateResponse(config.schema, beforeOverride.data);
      const data = (validated ?? beforeOverride.data) as T;
      const durationMs = Date.now() - start;
      await this.plugins?.runAfterResponse({
        method: config.method,
        path: config.path,
        status: beforeOverride.status,
        headers: beforeOverride.headers ?? {},
        data,
        durationMs,
        region: this.region,
        attempt,
        context: config.context
      });
      this.emitAudit(config, {
        success: true,
        status: beforeOverride.status,
        durationMs,
        headers: beforeOverride.headers ?? {}
      });
      this.logger.debug('Zoho CRM request succeeded.', {
        method: config.method,
        path: config.path,
        status: beforeOverride.status
      });
      this.finishSpan(span, { status: beforeOverride.status });
      this.metrics.timing('sdk.http.duration_ms', durationMs, {
        method: config.method,
        path: config.path,
        status: beforeOverride.status
      });
      return {
        data,
        status: beforeOverride.status,
        headers: beforeOverride.headers ?? {}
      };
    }

    const token = await this.auth.getAccessToken();
    const url = buildUrl(baseDomain, CRM_DEFAULT_BASE_PATH, config.path, params);
    this.assertSecureUrl(url, config.path);

    headers.Authorization = `Zoho-oauthtoken ${token}`;

    let body: string | undefined;

    if (bodyValue !== undefined) {
      // Always send JSON payloads so consumers can pass plain objects.
      try {
        body = JSON.stringify(bodyValue);
      } catch (error) {
        throw new InputValidationError('Request body could not be serialized as JSON.', {
          statusCode: 400,
          fieldErrors: { body: ['Invalid JSON payload.'] },
          cause: error
        });
      }
      if (!hasHeader(headers, 'content-type')) {
        headers['content-type'] = 'application/json';
      }
    }

    const timeoutMs = beforeContext.timeout ?? this.requestTimeoutMs;
    const controller = new AbortController();
    const timeoutId = timeoutMs
      ? setTimeout(() => {
          controller.abort(new RequestError('Request timed out.', { statusCode: 408 }));
        }, timeoutMs)
      : undefined;
    this.activeControllers.add(controller);
    this.metrics.gauge('sdk.http.active_requests', this.activeControllers.size);

    let response: UndiciResponse;

    try {
      response = (await request(url, {
        method: config.method,
        headers,
        body,
        dispatcher: this.dispatcher,
        signal: controller.signal,
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs
      })) as UndiciResponse;
    } catch (error) {
      this.cleanupController(controller, timeoutId);
      if (controller.signal.aborted) {
        const reason = controller.signal.reason;
        if (reason instanceof Error) {
          await this.plugins?.runOnError({
            method: config.method,
            path: config.path,
            error: reason,
            status: getErrorStatus(reason),
            durationMs: Date.now() - start,
            region: this.region,
            attempt,
            context: config.context
          });
          this.emitAudit(config, {
            success: false,
            durationMs: Date.now() - start,
            errorName: reason.name
          });
          throw reason;
        }
        await this.plugins?.runOnError({
          method: config.method,
          path: config.path,
          error,
          status: getErrorStatus(error),
          durationMs: Date.now() - start,
          region: this.region,
          attempt,
          context: config.context
        });
        this.emitAudit(config, {
          success: false,
          durationMs: Date.now() - start,
          errorName: 'AbortError'
        });
        throw new RequestError('Request aborted.', { statusCode: 408, cause: error });
      }
      await this.plugins?.runOnError({
        method: config.method,
        path: config.path,
        error,
        status: getErrorStatus(error),
        durationMs: Date.now() - start,
        region: this.region,
        attempt,
        context: config.context
      });
      this.emitAudit(config, {
        success: false,
        durationMs: Date.now() - start,
        errorName: error instanceof Error ? error.name : 'NetworkError'
      });
      this.finishSpan(span, { error: 'network_error' });
      this.metrics.increment('sdk.http.error', 1, { method: config.method, path: config.path, attempt });
      throw new RequestError('Network error while calling Zoho CRM.', {
        statusCode: 500,
        rawResponse: undefined,
        cause: error
      });
    }

    const payload = await readJsonSafely(response.body);
    const normalizedHeaders = normalizeHeaders(response.headers);
    this.cleanupController(controller, timeoutId);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      const validated = this.maybeValidateResponse(config.schema, payload);
      await this.plugins?.runAfterResponse({
        method: config.method,
        path: config.path,
        status: response.statusCode,
        headers: normalizedHeaders,
        data: validated ?? payload,
        durationMs: Date.now() - start,
        region: this.region,
        attempt,
        context: config.context
      });
      this.emitAudit(config, {
        success: true,
        status: response.statusCode,
        durationMs: Date.now() - start,
        headers: normalizedHeaders
      });
      this.logger.debug('Zoho CRM request succeeded.', {
        method: config.method,
        path: config.path,
        status: response.statusCode
      });
      this.finishSpan(span, { status: response.statusCode });
      this.metrics.timing('sdk.http.duration_ms', Date.now() - start, {
        method: config.method,
        path: config.path,
        status: response.statusCode
      });
      return {
        data: (validated ?? payload) as T,
        status: response.statusCode,
        headers: normalizedHeaders
      };
    }

    this.emitAudit(config, {
      success: false,
      status: response.statusCode,
      durationMs: Date.now() - start,
      headers: normalizedHeaders,
      errorName: 'HttpError'
    });
    this.finishSpan(span, { status: response.statusCode });
    this.metrics.increment('sdk.http.error', 1, {
      method: config.method,
      path: config.path,
      status: response.statusCode
    });
    const mapped = mapError(response.statusCode, payload, normalizedHeaders, config.path);
    await this.plugins?.runOnError({
      method: config.method,
      path: config.path,
      error: mapped,
      status: mapped.statusCode,
      durationMs: Date.now() - start,
      region: this.region,
      attempt,
      context: config.context
    });
    throw mapped;
  }

  private logFailure(config: RequestConfig, error: unknown) {
    const statusCode = getErrorStatus(error);
    const meta: Record<string, unknown> = {
      method: config.method,
      path: config.path,
      status: statusCode
    };

    if (statusCode && statusCode >= 500) {
      this.logger.error('Zoho CRM request failed.', meta);
      return;
    }

    this.logger.warn('Zoho CRM request failed.', meta);
  }

  private maybeValidateResponse<T>(schema: Schema<T> | undefined, payload: unknown): T | undefined {
    if (!schema) {
      return undefined;
    }

    const result = validateSchema(schema, payload, this.validation);

    if (!result.success) {
      throw new SchemaMismatchError(buildSchemaMismatchMessage(schema.name, result.issues), {
        rawResponse: payload,
        schemaName: schema.name,
        issues: result.issues
      });
    }

    if (result.unknownFields && result.unknownFields.length > 0) {
      this.reportUnknownFields(result.unknownFields);
    }

    return result.data;
  }

  private reportUnknownFields(unknownFields: UnknownFieldInfo[]) {
    if (!this.validation.warnUnknownFields) {
      return;
    }

    for (const entry of unknownFields) {
      this.logger.warn('Zoho CRM response contained unexpected fields.', {
        schema: entry.schema,
        path: entry.path,
        fields: entry.fields
      });

      if (this.validation.exportUnknownFields) {
        this.validation.exportUnknownFields(entry);
      }
    }
  }

  private async performRequestRaw(config: RequestConfig, attempt: number): Promise<RawResponse> {
    if (this.closed) {
      throw new ClientClosedError('HttpClient has been closed.');
    }
    const start = Date.now();
    const span = startSpan(this.profiler, 'sdk.http.requestRaw', {
      method: config.method,
      path: config.path,
      attempt
    });
    const baseDomain = REGION_API_BASE_URL[this.region];
    const params = { ...(config.params ?? {}) };
    const headers: Record<string, string> = { ...(config.headers ?? {}) };
    let bodyValue = config.body;
    const beforeContext = {
      method: config.method,
      path: config.path,
      params,
      headers,
      body: bodyValue,
      timeout: config.timeout,
      region: this.region,
      attempt,
      context: config.context
    };
    const beforeOverride = await this.plugins?.runBeforeRequest(beforeContext);
    bodyValue = beforeContext.body;

    if (beforeOverride) {
      const durationMs = Date.now() - start;
      await this.plugins?.runAfterResponse({
        method: config.method,
        path: config.path,
        status: beforeOverride.status,
        headers: beforeOverride.headers ?? {},
        data: beforeOverride.data,
        durationMs,
        region: this.region,
        attempt,
        context: config.context
      });
      this.emitAudit(config, {
        success: true,
        status: beforeOverride.status,
        durationMs,
        headers: beforeOverride.headers ?? {}
      });
      this.logger.debug('Zoho CRM request succeeded.', {
        method: config.method,
        path: config.path,
        status: beforeOverride.status
      });
      this.finishSpan(span, { status: beforeOverride.status });
      this.metrics.timing('sdk.http.duration_ms', durationMs, {
        method: config.method,
        path: config.path,
        status: beforeOverride.status
      });
      const overrideBody = beforeOverride.data;
      const bodyStream =
        overrideBody === undefined
          ? Readable.from([])
          : typeof overrideBody === 'string' || Buffer.isBuffer(overrideBody)
            ? Readable.from([overrideBody])
            : isAsyncIterable(overrideBody)
              ? Readable.from(overrideBody)
              : Readable.from([JSON.stringify(overrideBody)]);

      return {
        status: beforeOverride.status,
        headers: beforeOverride.headers ?? {},
        body: bodyStream
      };
    }

    const token = await this.auth.getAccessToken();
    const url = buildUrl(baseDomain, CRM_DEFAULT_BASE_PATH, config.path, params);
    this.assertSecureUrl(url, config.path);

    headers.Authorization = `Zoho-oauthtoken ${token}`;

    let body: string | undefined;

    if (bodyValue !== undefined) {
      // Always send JSON payloads so consumers can pass plain objects.
      try {
        body = JSON.stringify(bodyValue);
      } catch (error) {
        throw new InputValidationError('Request body could not be serialized as JSON.', {
          statusCode: 400,
          fieldErrors: { body: ['Invalid JSON payload.'] },
          cause: error
        });
      }
      if (!hasHeader(headers, 'content-type')) {
        headers['content-type'] = 'application/json';
      }
    }

    const timeoutMs = beforeContext.timeout ?? this.requestTimeoutMs;
    const controller = new AbortController();
    const timeoutId = timeoutMs
      ? setTimeout(() => {
          controller.abort(new RequestError('Request timed out.', { statusCode: 408 }));
        }, timeoutMs)
      : undefined;
    this.activeControllers.add(controller);
    this.metrics.gauge('sdk.http.active_requests', this.activeControllers.size);

    let response: UndiciResponse;

    try {
      response = (await request(url, {
        method: config.method,
        headers,
        body,
        dispatcher: this.dispatcher,
        signal: controller.signal,
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs
      })) as UndiciResponse;
    } catch (error) {
      this.cleanupController(controller, timeoutId);
      if (controller.signal.aborted) {
        const reason = controller.signal.reason;
        if (reason instanceof Error) {
          await this.plugins?.runOnError({
            method: config.method,
            path: config.path,
            error: reason,
            status: getErrorStatus(reason),
            durationMs: Date.now() - start,
            region: this.region,
            attempt,
            context: config.context
          });
          this.emitAudit(config, {
            success: false,
            durationMs: Date.now() - start,
            errorName: reason.name
          });
          throw reason;
        }
        await this.plugins?.runOnError({
          method: config.method,
          path: config.path,
          error,
          status: getErrorStatus(error),
          durationMs: Date.now() - start,
          region: this.region,
          attempt,
          context: config.context
        });
        this.emitAudit(config, {
          success: false,
          durationMs: Date.now() - start,
          errorName: 'AbortError'
        });
        throw new RequestError('Request aborted.', { statusCode: 408, cause: error });
      }
      await this.plugins?.runOnError({
        method: config.method,
        path: config.path,
        error,
        status: getErrorStatus(error),
        durationMs: Date.now() - start,
        region: this.region,
        attempt,
        context: config.context
      });
      this.emitAudit(config, {
        success: false,
        durationMs: Date.now() - start,
        errorName: error instanceof Error ? error.name : 'NetworkError'
      });
      this.finishSpan(span, { error: 'network_error' });
      this.metrics.increment('sdk.http.error', 1, { method: config.method, path: config.path, attempt });
      throw new RequestError('Network error while calling Zoho CRM.', {
        statusCode: 500,
        rawResponse: undefined,
        cause: error
      });
    }

    const normalizedHeaders = normalizeHeaders(response.headers);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      this.cleanupController(controller, timeoutId);
      await this.plugins?.runAfterResponse({
        method: config.method,
        path: config.path,
        status: response.statusCode,
        headers: normalizedHeaders,
        durationMs: Date.now() - start,
        region: this.region,
        attempt,
        context: config.context
      });
      this.emitAudit(config, {
        success: true,
        status: response.statusCode,
        durationMs: Date.now() - start,
        headers: normalizedHeaders
      });
      this.logger.debug('Zoho CRM request succeeded.', {
        method: config.method,
        path: config.path,
        status: response.statusCode
      });
      this.finishSpan(span, { status: response.statusCode });
      this.metrics.timing('sdk.http.duration_ms', Date.now() - start, {
        method: config.method,
        path: config.path,
        status: response.statusCode
      });

      return {
        status: response.statusCode,
        headers: normalizedHeaders,
        body: toNodeStream(response.body)
      };
    }

    this.cleanupController(controller, timeoutId);
    this.emitAudit(config, {
      success: false,
      status: response.statusCode,
      durationMs: Date.now() - start,
      headers: normalizedHeaders,
      errorName: 'HttpError'
    });
    this.finishSpan(span, { status: response.statusCode });
    this.metrics.increment('sdk.http.error', 1, {
      method: config.method,
      path: config.path,
      status: response.statusCode
    });
    const payload = await readJsonSafely(response.body);
    const mapped = mapError(response.statusCode, payload, normalizedHeaders, config.path);
    await this.plugins?.runOnError({
      method: config.method,
      path: config.path,
      error: mapped,
      status: mapped.statusCode,
      durationMs: Date.now() - start,
      region: this.region,
      attempt,
      context: config.context
    });
    throw mapped;
  }

  private finishSpan(
    span: ReturnType<typeof startSpan>,
    meta: Record<string, unknown>
  ) {
    const payload = endSpan(this.profiler, span, meta);
    if (!payload) {
      return;
    }

    if (this.profiler.logSlowRequests && payload.durationMs >= this.profiler.slowRequestThresholdMs) {
      this.logger.warn('Slow Zoho CRM request detected.', {
        name: payload.name,
        durationMs: Math.round(payload.durationMs),
        ...payload.meta
      });
    }
  }

  private cleanupController(controller: AbortController, timeoutId?: NodeJS.Timeout) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    this.activeControllers.delete(controller);
    this.metrics.gauge('sdk.http.active_requests', this.activeControllers.size);
  }

  async close(): Promise<void> {
    this.closed = true;
    for (const controller of this.activeControllers) {
      controller.abort(new ClientClosedError('HttpClient closed.'));
    }
    this.activeControllers.clear();
    this.metrics.gauge('sdk.http.active_requests', 0);

    if (typeof this.dispatcher.close === 'function') {
      await this.dispatcher.close();
    } else if (typeof (this.dispatcher as { destroy?: () => void }).destroy === 'function') {
      (this.dispatcher as { destroy: () => void }).destroy();
    }
  }

  private assertSecureUrl(url: string, path: string) {
    if (this.allowInsecureHttp) {
      return;
    }
    if (url.startsWith('http://')) {
      throw new InputValidationError(
        'Insecure HTTP requests are not allowed. Use HTTPS or enable allowInsecureHttp for local testing.',
        {
          statusCode: 400,
          fieldErrors: { path: [`Insecure URL detected for path "${path}".`] }
        }
      );
    }
  }

  private emitAudit(
    config: RequestConfig,
    payload: {
      success: boolean;
      status?: number;
      durationMs?: number;
      headers?: Record<string, string>;
      errorName?: string;
    }
  ) {
    if (!this.audit) {
      return;
    }

    const context = {
      ...(this.audit.contextProvider?.() ?? {}),
      ...(config.context ?? {})
    };
    const redactedContext = redactAuditContext(
      Object.keys(context).length > 0 ? context : undefined,
      this.audit.redact
    );
    const requestId = payload.headers ? extractRequestId(payload.headers) : undefined;
    const path = sanitizePath(config.path);

    this.audit.logger.log({
      timestamp: new Date().toISOString(),
      method: config.method,
      path,
      status: payload.status,
      durationMs: payload.durationMs ? Math.round(payload.durationMs) : undefined,
      success: payload.success,
      region: this.region,
      requestId,
      errorName: payload.errorName,
      context: redactedContext
    });
  }
}

function buildUrl(
  baseDomain: string,
  defaultBasePath: string,
  path: string,
  params?: RequestConfig['params']
): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return appendQueryParams(path, params);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // If caller already included /crm/v8 or /crm/v2, honor it verbatim.
  const base = normalizedPath.startsWith('/crm/')
    ? `${baseDomain}${normalizedPath}`
    : `${baseDomain}${defaultBasePath}${normalizedPath}`;

  return appendQueryParams(base, params);
}

function appendQueryParams(base: string, params?: RequestConfig['params']): string {
  if (!params || Object.keys(params).length === 0) {
    return base;
  }

  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    url.searchParams.append(key, String(value));
  }

  return url.toString();
}

function mapError(
  statusCode: number,
  payload: unknown,
  headers: Record<string, string>,
  path: string
): RequestError | ValidationError | AuthError | NotFoundError | RateLimitError {
  const details = extractZohoApiError(payload);
  const message = details?.message;

  switch (statusCode) {
    case 400:
      return new ValidationError(message ?? 'Validation error.', {
        statusCode,
        code: details?.code,
        details: details?.details as Record<string, unknown> | undefined,
        fieldErrors: extractFieldErrors(details),
        rawResponse: payload
      });
    case 401:
      return new AuthError(message ?? 'Unauthorized request.', {
        statusCode,
        code: details?.code,
        rawResponse: payload
      });
    case 404:
      return new NotFoundError(message ?? 'Resource not found.', {
        statusCode,
        code: details?.code,
        details: details?.details as Record<string, unknown> | undefined,
        rawResponse: payload,
        ...extractResourceInfo(path)
      });
    case 429:
      return new RateLimitError(message ?? 'Rate limit exceeded.', {
        statusCode,
        code: details?.code,
        details: details?.details as Record<string, unknown> | undefined,
        rawResponse: payload,
        retryAfter: parseRetryAfter(headers)
      });
    case 500:
    case 501:
    case 502:
    case 503:
    case 504:
      return new RequestError(message ?? 'Server error.', {
        statusCode,
        code: details?.code,
        details: details?.details as Record<string, unknown> | undefined,
        rawResponse: payload
      });
    default:
      return new RequestError(message ?? 'Unexpected API error.', {
        statusCode,
        code: details?.code,
        details: details?.details as Record<string, unknown> | undefined,
        rawResponse: payload
      });
  }
}

async function readJsonSafely(body: UndiciBody): Promise<unknown> {
  try {
    return await body.json();
  } catch {
    try {
      const text = await body.text();
      if (!text) {
        return undefined;
      }
      return { message: text };
    } catch {
      return undefined;
    }
  }
}

function normalizeHeaders(headers: Record<string, string | string[] | undefined>) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      normalized[key] = value.join(', ');
    } else if (value !== undefined) {
      normalized[key] = value;
    }
  }
  return normalized;
}

function hasHeader(headers: Record<string, string>, headerName: string): boolean {
  const target = headerName.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
}

function sanitizePath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const url = new URL(path);
      return url.pathname;
    } catch {
      return path.split('?')[0] ?? path;
    }
  }
  return path.split('?')[0] ?? path;
}

function extractRequestId(headers: Record<string, string>): string | undefined {
  const candidates = ['x-request-id', 'x-zoho-requestid', 'x-zoho-request-id', 'x-zoho-trace-id'];
  for (const name of candidates) {
    const key = Object.keys(headers).find((header) => header.toLowerCase() === name);
    if (key && headers[key]) {
      return headers[key];
    }
  }
  return undefined;
}

function shouldRetryError(error: unknown): boolean {
  if (
    error instanceof AuthError ||
    error instanceof ClientClosedError ||
    error instanceof InputValidationError ||
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof RateLimitError ||
    error instanceof SchemaMismatchError ||
    error instanceof ResourceLimitError
  ) {
    return false;
  }

  // Only retry server-side failures; 4xx are handled explicitly.
  return error instanceof RequestError && (error.statusCode ?? 0) >= 500;
}

function extractFieldErrors(
  details?: { details?: Record<string, unknown>; message?: string } | null
): Record<string, string[]> | undefined {
  if (!details?.details || typeof details.details !== 'object') {
    return undefined;
  }

  const detailMap = details.details;

  if ('api_name' in detailMap && typeof detailMap.api_name === 'string') {
    const apiName = detailMap.api_name;
    const message = typeof details.message === 'string' ? details.message : 'Validation error.';
    return { [apiName]: [message] };
  }

  if ('errors' in detailMap && typeof detailMap.errors === 'object' && detailMap.errors !== null) {
    const errors = detailMap.errors as Record<string, unknown>;
    const normalized: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(errors)) {
      if (Array.isArray(value)) {
        normalized[key] = value.filter((entry) => typeof entry === 'string') as string[];
      } else if (typeof value === 'string') {
        normalized[key] = [value];
      }
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  return undefined;
}

function parseRetryAfter(headers: Record<string, string>): number | undefined {
  const key = Object.keys(headers).find((name) => name.toLowerCase() === 'retry-after');
  const value = key ? headers[key] : undefined;
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toNodeStream(body: UndiciBody): NodeJS.ReadableStream {
  if (
    typeof (Readable as typeof Readable & { fromWeb?: unknown }).fromWeb === 'function' &&
    typeof (body as ReadableStream).getReader === 'function'
  ) {
    return (Readable as typeof Readable & { fromWeb: (stream: ReadableStream) => NodeJS.ReadableStream }).fromWeb(
      body as ReadableStream
    );
  }

  return Readable.from(body);
}

function isAsyncIterable(value: unknown): value is AsyncIterable<Uint8Array> {
  return Boolean(value && typeof value === 'object' && Symbol.asyncIterator in value);
}

function extractResourceInfo(path: string): { resource?: string; id?: string } {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) {
    return {};
  }

  // Expect /crm/v2/{module}/{id}
  const moduleIndex = parts.findIndex((part) => part.toLowerCase() === 'crm');
  if (moduleIndex !== -1 && parts.length > moduleIndex + 2) {
    const resource = parts[moduleIndex + 2];
    const id = parts[moduleIndex + 3];
    return { resource, id };
  }

  if (parts.length === 1) {
    return { resource: parts[0], id: undefined };
  }

  const resource = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  return { resource, id };
}

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (typeof status === 'number') {
      return status;
    }
  }
  return undefined;
}

function buildSchemaMismatchMessage(schemaName: string, issues?: { message: string }[]): string {
  const detail = issues?.[0]?.message ? ` ${issues[0].message}` : '';
  return `Response did not match schema "${schemaName}".${detail} This may indicate a Zoho API change or outdated SDK.`;
}

function calculateBackoff(
  initialDelay: number,
  multiplier: number,
  maxDelay: number,
  attempt: number
): number {
  const rawDelay = initialDelay * multiplier ** attempt;
  return Math.min(rawDelay, maxDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
