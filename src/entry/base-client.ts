import type { ZohoAuth } from '../auth/zoho-auth';
import type { AccessToken, ZohoRegion, ZohoTokenResponse } from '../auth/types';
import { HttpClient } from '../http/http-client';
import type { HttpClientOptions, RetryConfig } from '../http/types';
import { normalizeLogger, type Logger, type RedactionConfig } from '../logger';
import { normalizeMetrics, type Metrics } from '../metrics';
import { normalizeProfiler, type NormalizedProfiler, type ProfilerOptions } from '../profiling';
import { RateLimiter, type RateLimiterOptions } from '../rate-limiter';
import { normalizeValidationOptions, type NormalizedValidationOptions, type ValidationOptions } from '../validation';
import { normalizeAudit, type AuditConfig, type NormalizedAuditConfig } from '../audit';
import { configureDeprecations, type DeprecationConfig } from '../deprecation';
import { type ExperimentalFeatures, getFeatureFlag, isFeatureEnabled, type FeatureFlags, applyValidationFeatureFlags } from '../feature-flags';
import { normalizeTelemetry, type Telemetry } from '../telemetry';
import { PluginManager, type ZohoCRMPlugin } from '../plugins';
import type { ZohoCRM } from '../zoho-crm';
import { normalizeLegacyConfig, type LegacyZohoCRMConfig } from '../compat/legacy-config';
import { buildCompatibilityReport, type CompatibilityReport } from '../compat/compatibility';
import type { FieldNameStyle } from '../utils/field-mapping';

export interface BaseClientConfig {
  auth: ZohoAuth;
  region: ZohoRegion;
  retry?: Partial<RetryConfig>;
  logger?: Logger;
  logRedaction?: RedactionConfig;
  metrics?: Metrics;
  validation?: ValidationOptions;
  profiler?: ProfilerOptions;
  rateLimit?: RateLimiterOptions | false;
  http?: HttpClientOptions;
  audit?: AuditConfig | false;
  plugins?: ZohoCRMPlugin[];
  deprecations?: DeprecationConfig;
  experimentalFeatures?: ExperimentalFeatures;
  telemetry?: Telemetry;
  featureFlags?: FeatureFlags;
  useLegacyFieldNames?: boolean;
}

export type BaseClientInitConfig = BaseClientConfig | (Omit<BaseClientConfig, 'auth' | 'region'> & LegacyZohoCRMConfig);

export class BaseClient {
  readonly auth: ZohoAuth;
  readonly http: HttpClient;
  readonly logger: Required<Logger>;
  readonly metrics: Required<Metrics>;
  readonly telemetry: Required<Telemetry>;
  readonly validation: NormalizedValidationOptions;
  readonly profiler: NormalizedProfiler;
  readonly rateLimiter?: RateLimiter;
  readonly audit?: NormalizedAuditConfig;
  readonly plugins: PluginManager;
  readonly region: ZohoRegion;
  readonly featureFlags: FeatureFlags;
  readonly fieldNameStyle: FieldNameStyle;
  readonly legacyConfigUsed: boolean;
  readonly experimentalFeatures: ExperimentalFeatures;
  private readonly limiters: RateLimiter[] = [];
  private readonly extensions = new Set<string>();

  constructor(config: BaseClientInitConfig) {
    const rawLogger = config.logger;
    this.logger = normalizeLogger(rawLogger, config.logRedaction);
    const normalized = normalizeLegacyConfig(config as BaseClientInitConfig, this.logger);
    const normalizedConfig = normalized.config as BaseClientConfig;

    this.legacyConfigUsed = normalized.legacyDetected;
    this.metrics = normalizeMetrics(normalizedConfig.metrics);
    this.telemetry = normalizeTelemetry(normalizedConfig.telemetry);
    this.featureFlags = normalizedConfig.featureFlags ?? {};
    const validationConfig = applyValidationFeatureFlags(normalizedConfig.validation, this.featureFlags);
    this.validation = normalizeValidationOptions(validationConfig);
    this.profiler = normalizeProfiler(normalizedConfig.profiler);
    this.audit = normalizeAudit(normalizedConfig.audit);
    this.region = normalizedConfig.region;
    this.experimentalFeatures = normalizedConfig.experimentalFeatures ?? {};
    this.fieldNameStyle =
      normalizedConfig.useLegacyFieldNames === false || getFeatureFlag(this.featureFlags, 'normalizeFieldNames')
        ? 'camel'
        : 'raw';

    this.auth = normalizedConfig.auth;
    this.auth.setLogger(rawLogger ?? this.logger, config.logRedaction);
    this.auth.setMetrics(this.metrics);
    this.auth.setValidation(validationConfig);
    this.auth.setProfiler(this.profiler);
    this.plugins = new PluginManager(this.logger);
    configureDeprecations(normalizedConfig.deprecations, rawLogger ?? this.logger);
    this.auth.addTokenRefreshListener?.((token: AccessToken, raw: ZohoTokenResponse, cacheKey?: string) =>
      this.plugins.runOnTokenRefresh({ token, raw, cacheKey, region: this.region })
    );

    this.rateLimiter = createLimiter(normalizedConfig.rateLimit, this.logger, this.metrics, 'api');
    if (this.rateLimiter) {
      this.limiters.push(this.rateLimiter);
    }

    this.http = new HttpClient(
      normalizedConfig.auth,
      normalizedConfig.region,
      normalizedConfig.retry,
      this.logger,
      this.rateLimiter,
      this.metrics,
      this.validation,
      this.profiler,
      normalizedConfig.http,
      this.audit,
      this.plugins
    );

    if (normalizedConfig.plugins && normalizedConfig.plugins.length > 0) {
      for (const plugin of normalizedConfig.plugins) {
        void this.use(plugin);
      }
    }
  }

  protected registerLimiter(limiter?: RateLimiter) {
    if (limiter) {
      this.limiters.push(limiter);
    }
  }

  async close(): Promise<void> {
    for (const limiter of this.limiters) {
      limiter.close();
    }
    if (typeof this.auth.close === 'function') {
      this.auth.close();
    }
    await this.http.close();
  }

  dispose(): Promise<void> {
    return this.close();
  }

  clearCachedState(): void {
    if (typeof this.auth.clearTokenCache === 'function') {
      this.auth.clearTokenCache();
    } else {
      this.auth.invalidateToken?.();
    }
  }

  async use(plugin: ZohoCRMPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn('Plugin already installed.', { plugin: plugin.name });
      return;
    }
    this.plugins.registerPlugin(plugin);
    try {
      await plugin.install(this as unknown as ZohoCRM);
    } catch (error) {
      this.plugins.unregisterPlugin(plugin.name);
      this.logger.warn('Plugin install failed.', {
        plugin: plugin.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async removePlugin(name: string): Promise<void> {
    const plugin = this.plugins.list().find((entry: ZohoCRMPlugin) => entry.name === name);
    if (!plugin) {
      return;
    }
    try {
      await plugin.uninstall?.(this as unknown as ZohoCRM);
    } catch (error) {
      this.logger.warn('Plugin uninstall failed.', {
        plugin: name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    this.plugins.unregisterPlugin(name);
  }

  listPlugins(): ZohoCRMPlugin[] {
    return this.plugins.list();
  }

  isExperimentalFeatureEnabled(name: string): boolean {
    return isFeatureEnabled(this.experimentalFeatures, name);
  }

  async checkCompatibility(): Promise<CompatibilityReport> {
    return buildCompatibilityReport({
      legacyConfigUsed: this.legacyConfigUsed,
      useLegacyFieldNames: this.fieldNameStyle === 'raw',
      featureFlags: this.featureFlags
    });
  }

  registerModule<T>(name: string, module: T): void {
    if (this.isReservedExtension(name)) {
      throw new Error(`Cannot register module "${name}" because it conflicts with core SDK keys.`);
    }
    if (name in this) {
      throw new Error(`Module "${name}" already exists on the client.`);
    }
    (this as Record<string, unknown>)[name] = module as unknown;
    this.extensions.add(name);
  }

  registerMethod<T extends (...args: unknown[]) => unknown>(name: string, fn: T): void {
    if (this.isReservedExtension(name)) {
      throw new Error(`Cannot register method "${name}" because it conflicts with core SDK keys.`);
    }
    if (name in this) {
      throw new Error(`Method "${name}" already exists on the client.`);
    }
    (this as Record<string, unknown>)[name] = fn;
    this.extensions.add(name);
  }

  unregisterExtension(name: string): void {
    if (!this.extensions.has(name)) {
      return;
    }
    delete (this as Record<string, unknown>)[name];
    this.extensions.delete(name);
  }

  private isReservedExtension(name: string): boolean {
    const reserved = new Set([
      'auth',
      'http',
      'leads',
      'contacts',
      'deals',
      'webhooks',
      'bulk',
      'logger',
      'metrics',
      'validation',
      'profiler',
      'rateLimiter',
      'bulkDownloadLimiter',
      'audit',
      'plugins',
      'experimentalFeatures',
      'featureFlags',
      'fieldNameStyle',
      'legacyConfigUsed',
      'telemetry'
    ]);
    return reserved.has(name);
  }
}

export function createLimiter(
  options: RateLimiterOptions | false | undefined,
  logger: Required<Logger>,
  metrics: Required<Metrics>,
  scope: 'api' | 'bulk'
): RateLimiter | undefined {
  if (!options) {
    return undefined;
  }

  return new RateLimiter({
    ...options,
    onQueueChange: (size: number) => {
      metrics.gauge('sdk.rate_limiter.queue_depth', size, { scope });
      options.onQueueChange?.(size);
    },
    onWarning: ({ queueSize, maxQueue }: { queueSize: number; maxQueue: number }) => {
      logger.warn('Rate limiter queue nearing capacity.', {
        queueSize,
        maxQueue,
        scope
      });
      options.onWarning?.({ queueSize, maxQueue });
    }
  });
}
