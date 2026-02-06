import { request } from 'undici';
import { AuthError, ClientClosedError, SchemaMismatchError } from '../errors';
import { normalizeLogger, type Logger } from '../logger';
import { normalizeMetrics, type Metrics } from '../metrics';
import type { AccessToken, ZohoOAuthConfig, ZohoOAuthError, ZohoRegion, ZohoTokenResponse } from './types';
import { OAuthTokenResponseSchema, normalizeValidationOptions, validateSchema, type NormalizedValidationOptions } from '../validation';
import { endSpan, normalizeProfiler, startSpan, type NormalizedProfiler, type ProfilerOptions } from '../profiling';
import { assertEnum, assertNonEmptyString } from '../utils/input-validation';

const REGION_AUTH_BASE_URL: Record<ZohoRegion, string> = {
  US: 'https://accounts.zoho.com',
  EU: 'https://accounts.zoho.eu',
  IN: 'https://accounts.zoho.in',
  AU: 'https://accounts.zoho.com.au',
  CN: 'https://accounts.zoho.com.cn',
  JP: 'https://accounts.zoho.jp'
};

const EARLY_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes to avoid edge-expiry races.

type UndiciBody = {
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

type UndiciResponse = {
  statusCode: number;
  body: UndiciBody;
};

export class ZohoAuth {
  private readonly config: ZohoOAuthConfig;
  private readonly tokenCache = new Map<string, AccessToken>();
  private readonly refreshPromises = new Map<string, Promise<AccessToken>>();
  private readonly tokenRefreshListeners = new Set<
    (token: AccessToken, raw: ZohoTokenResponse, cacheKey?: string) => void | Promise<void>
  >();
  private readonly cacheOrder: string[] = [];
  private readonly maxCachedTokens: number;
  private readonly requestTimeoutMs: number;
  private readonly activeControllers = new Set<AbortController>();
  private logger: Required<Logger>;
  private metrics: Required<Metrics>;
  private validation: NormalizedValidationOptions;
  private profiler: NormalizedProfiler;
  private closed = false;

  constructor(config: ZohoOAuthConfig) {
    assertNonEmptyString(config.clientId, 'clientId');
    assertNonEmptyString(config.clientSecret, 'clientSecret');
    assertNonEmptyString(config.refreshToken, 'refreshToken');
    assertEnum(config.region, 'region', ['US', 'EU', 'IN', 'AU', 'CN', 'JP']);
    this.config = config;
    this.logger = normalizeLogger(config.logger, config.logRedaction);
    this.metrics = normalizeMetrics(config.metrics);
    this.validation = normalizeValidationOptions(config.validation);
    this.profiler = normalizeProfiler(config.profiler);
    this.maxCachedTokens = Math.max(1, config.maxCachedTokens ?? 1);
    this.requestTimeoutMs = config.requestTimeoutMs ?? 30_000;
  }

  async getAccessToken(cacheKey = 'default'): Promise<string> {
    if (this.closed) {
      throw new ClientClosedError('ZohoAuth has been closed.');
    }

    const cached = this.tokenCache.get(cacheKey);

    // If a custom retriever is provided, we only consult it when our cache is empty or expired.
    if (!this.isTokenValid(cached) && this.config.onTokenRetrieve) {
      const retrieved = await this.config.onTokenRetrieve(cacheKey);
      if (retrieved && this.isTokenValid(retrieved)) {
        this.setToken(cacheKey, retrieved);
      }
    }

    const existing = this.tokenCache.get(cacheKey);
    if (this.isTokenValid(existing)) {
      return existing.token;
    }

    const refreshed = await this.refreshAccessToken(cacheKey);
    return refreshed.token;
  }

  invalidateToken(cacheKey = 'default'): void {
    // Explicitly drop the cached token so the next call forces a refresh.
    this.tokenCache.delete(cacheKey);
    const index = this.cacheOrder.indexOf(cacheKey);
    if (index !== -1) {
      this.cacheOrder.splice(index, 1);
    }
    this.metrics.gauge('sdk.auth.cached_tokens', this.tokenCache.size);
  }

  clearTokenCache(): void {
    this.tokenCache.clear();
    this.cacheOrder.splice(0, this.cacheOrder.length);
    this.metrics.gauge('sdk.auth.cached_tokens', 0);
  }

  setLogger(logger: Logger, redaction?: ZohoOAuthConfig['logRedaction']): void {
    this.logger = normalizeLogger(logger, redaction);
  }

  setMetrics(metrics: Metrics): void {
    this.metrics = normalizeMetrics(metrics);
  }

  setValidation(validation?: ZohoOAuthConfig['validation']): void {
    this.validation = normalizeValidationOptions(validation);
  }

  setProfiler(profiler?: ProfilerOptions | NormalizedProfiler): void {
    this.profiler = normalizeProfiler(profiler);
  }

  addTokenRefreshListener(
    listener: (token: AccessToken, raw: ZohoTokenResponse, cacheKey?: string) => void | Promise<void>
  ): () => void {
    this.tokenRefreshListeners.add(listener);
    return () => {
      this.tokenRefreshListeners.delete(listener);
    };
  }

  removeTokenRefreshListener(
    listener: (token: AccessToken, raw: ZohoTokenResponse, cacheKey?: string) => void | Promise<void>
  ): void {
    this.tokenRefreshListeners.delete(listener);
  }

  close(): void {
    this.closed = true;
    for (const controller of this.activeControllers) {
      controller.abort(new ClientClosedError('ZohoAuth closed.'));
    }
    this.activeControllers.clear();
    this.clearTokenCache();
    this.refreshPromises.clear();
    this.metrics.gauge('sdk.auth.cached_tokens', 0);
  }

  private isTokenValid(token?: AccessToken): token is AccessToken {
    if (!token) {
      return false;
    }

    // Use a buffer to avoid issuing requests with a token that's about to expire.
    return token.expiresAt - EARLY_REFRESH_BUFFER_MS > Date.now();
  }

  private async refreshAccessToken(cacheKey: string): Promise<AccessToken> {
    if (this.closed) {
      throw new ClientClosedError('ZohoAuth has been closed.');
    }
    // Coalesce concurrent refreshes into a single inflight request.
    const inflight = this.refreshPromises.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const promise = this.performRefresh(cacheKey).finally(() => {
      this.refreshPromises.delete(cacheKey);
    });

    this.refreshPromises.set(cacheKey, promise);
    return promise;
  }

  private async performRefresh(cacheKey: string): Promise<AccessToken> {
    if (this.closed) {
      throw new ClientClosedError('ZohoAuth has been closed.');
    }
    const span = startSpan(this.profiler, 'sdk.auth.refresh', { region: this.config.region });
    try {
      const { clientId, clientSecret, refreshToken, region } = this.config;
      const baseUrl = REGION_AUTH_BASE_URL[region];
      const url = `${baseUrl}/oauth/v2/token`;

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      });

      const controller = new AbortController();
      const timeoutId = this.requestTimeoutMs
        ? setTimeout(() => {
            controller.abort(new AuthError('OAuth request timed out.', { statusCode: 408 }));
          }, this.requestTimeoutMs)
        : undefined;
      this.activeControllers.add(controller);

      let response: UndiciResponse;

      try {
        response = (await request(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: body.toString(),
          signal: controller.signal,
          headersTimeout: this.requestTimeoutMs,
          bodyTimeout: this.requestTimeoutMs
        })) as UndiciResponse;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.activeControllers.delete(controller);
        if (controller.signal.aborted) {
          const reason = controller.signal.reason;
          if (reason instanceof Error) {
            throw reason;
          }
          throw new AuthError('OAuth request aborted.', { cause: error });
        }
        throw new AuthError('Failed to reach Zoho OAuth endpoint.', { cause: error });
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      this.activeControllers.delete(controller);

      const payload = await readJsonSafely(response.body);

      if (response.statusCode >= 400) {
        if (isZohoOAuthError(payload)) {
          throw AuthError.fromOAuth(payload, response.statusCode);
        }
        throw new AuthError(`Zoho OAuth error (HTTP ${response.statusCode}).`, {
          statusCode: response.statusCode,
          rawResponse: payload
        });
      }

      if (isZohoOAuthError(payload)) {
        throw AuthError.fromOAuth(payload, response.statusCode);
      }

      let tokenResponse: ZohoTokenResponse;

      if (this.validation.enabled && this.validation.mode !== 'off') {
        const result = validateSchema(OAuthTokenResponseSchema, payload, this.validation);
        if (!result.success) {
          throw new SchemaMismatchError(
            buildSchemaMismatchMessage(OAuthTokenResponseSchema.name, result.issues),
            {
              rawResponse: payload,
              schemaName: OAuthTokenResponseSchema.name,
              issues: result.issues
            }
          );
        }
        tokenResponse = result.data;
      } else {
        if (!isZohoTokenResponse(payload)) {
          throw new AuthError('Unexpected OAuth response format.', {
            statusCode: response.statusCode,
            rawResponse: payload
          });
        }
        tokenResponse = payload;
      }

      const token: AccessToken = {
        token: tokenResponse.access_token,
        type: tokenResponse.token_type ?? 'Bearer',
        expiresAt: Date.now() + tokenResponse.expires_in * 1000
      };

      this.setToken(cacheKey, token);
      this.metrics.increment('sdk.auth.refresh.success', 1, { region: this.config.region });
      endSpan(this.profiler, span, { status: response.statusCode });

      // Notify callers so they can persist refreshed tokens.
      if (this.config.onTokenRefresh) {
        await this.config.onTokenRefresh(token, tokenResponse, cacheKey);
      }

      if (this.tokenRefreshListeners.size > 0) {
        await this.notifyTokenRefreshListeners(token, tokenResponse, cacheKey);
      }

      return token;
    } catch (error) {
      endSpan(this.profiler, span, {
        status: error instanceof AuthError ? error.statusCode : undefined,
        error: error instanceof Error ? error.name : 'UnknownError'
      });
      if (error instanceof AuthError || error instanceof SchemaMismatchError) {
        this.metrics.increment('sdk.auth.refresh.error', 1, { region: this.config.region });
        this.logAuthFailure(error);
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown OAuth error.';
      const wrapped = new AuthError(message, { cause: error });
      this.metrics.increment('sdk.auth.refresh.error', 1, { region: this.config.region });
      this.logAuthFailure(wrapped);
      throw wrapped;
    }
  }

  private logAuthFailure(error: AuthError | SchemaMismatchError): void {
    const meta: Record<string, unknown> = {
      status: 'statusCode' in error ? error.statusCode : undefined,
      code: 'code' in error ? error.code : undefined,
      region: this.config.region
    };

    if (!error.statusCode || error.statusCode >= 500) {
      this.logger.error('Zoho OAuth request failed.', meta);
      return;
    }

    this.logger.warn('Zoho OAuth request failed.', meta);
  }

  private setToken(cacheKey: string, token: AccessToken): void {
    if (this.tokenCache.has(cacheKey)) {
      this.tokenCache.set(cacheKey, token);
      this.bumpCacheKey(cacheKey);
      this.metrics.gauge('sdk.auth.cached_tokens', this.tokenCache.size);
      return;
    }

    this.tokenCache.set(cacheKey, token);
    this.cacheOrder.push(cacheKey);
    this.evictIfNeeded();
    this.metrics.gauge('sdk.auth.cached_tokens', this.tokenCache.size);
  }

  private bumpCacheKey(cacheKey: string): void {
    const index = this.cacheOrder.indexOf(cacheKey);
    if (index !== -1) {
      this.cacheOrder.splice(index, 1);
      this.cacheOrder.push(cacheKey);
    }
  }

  private evictIfNeeded(): void {
    while (this.tokenCache.size > this.maxCachedTokens) {
      const oldest = this.cacheOrder.shift();
      if (!oldest) {
        break;
      }
      this.tokenCache.delete(oldest);
      this.logger.warn('Token cache limit reached; evicting oldest token.', {
        cacheKey: oldest,
        maxCachedTokens: this.maxCachedTokens
      });
    }
  }

  private async notifyTokenRefreshListeners(
    token: AccessToken,
    raw: ZohoTokenResponse,
    cacheKey: string
  ): Promise<void> {
    for (const listener of this.tokenRefreshListeners) {
      try {
        await listener(token, raw, cacheKey);
      } catch (error) {
        this.logger.warn('Token refresh listener failed.', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}

async function readJsonSafely(body: UndiciBody): Promise<unknown> {
  try {
    return await body.json();
  } catch (error) {
    // Fall back to text to aid troubleshooting when JSON parsing fails.
    try {
      const text = await body.text();
      return { error: 'invalid_json', error_description: text } satisfies ZohoOAuthError;
    } catch {
      return { error: 'invalid_json' } satisfies ZohoOAuthError;
    }
  }
}

function isZohoOAuthError(value: unknown): value is ZohoOAuthError {
  return Boolean(value && typeof value === 'object' && 'error' in value);
}

function isZohoTokenResponse(value: unknown): value is ZohoTokenResponse {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'access_token' in value &&
      'expires_in' in value
  );
}

function buildSchemaMismatchMessage(schemaName: string, issues?: { message: string }[]): string {
  const detail = issues?.[0]?.message ? ` ${issues[0].message}` : '';
  return `Response did not match schema "${schemaName}".${detail} This may indicate a Zoho API change or outdated SDK.`;
}
