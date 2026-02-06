import type { ZohoAuth } from './auth/zoho-auth';
import type { AccessToken, ZohoRegion, ZohoTokenResponse } from './auth/types';
import type { HttpClientOptions, RetryConfig } from './http/types';
import { HttpClient } from './http/http-client';
import { normalizeLogger, type Logger, type RedactionConfig } from './logger';
import { normalizeMetrics, type Metrics } from './metrics';
import { normalizeTelemetry, type Telemetry } from './telemetry';
import { RateLimiter, type RateLimiterOptions } from './rate-limiter';
import { normalizeValidationOptions, type ValidationOptions } from './validation';
import { normalizeProfiler, type NormalizedProfiler, type ProfilerOptions } from './profiling';
import { ContactsModule } from './modules/contacts';
import { DealsModule } from './modules/deals';
import { LeadsModule } from './modules/leads';
import { WebhooksModule } from './modules/webhooks';
import { BulkModule } from './modules/bulk';
import { assertEnum } from './utils/input-validation';
import { normalizeAudit, type AuditConfig, type NormalizedAuditConfig } from './audit';
import { configureDeprecations, type DeprecationConfig } from './deprecation';
import {
  applyValidationFeatureFlags,
  getFeatureFlag,
  type ExperimentalFeatures,
  type FeatureFlags,
  isFeatureEnabled
} from './feature-flags';
import { PluginManager, type ZohoCRMPlugin } from './plugins';
import { normalizeLegacyConfig, type LegacyZohoCRMConfig } from './compat/legacy-config';
import { buildCompatibilityReport, type CompatibilityReport } from './compat/compatibility';
import { createDeprecatedProxy } from './compat/deprecated-proxy';
import type { FieldNameStyle } from './utils/field-mapping';

export interface ZohoCRMConfig {
  auth: ZohoAuth;
  region: ZohoRegion;
  retry?: Partial<RetryConfig>;
  logger?: Logger;
  // Optional redaction configuration for logs.
  logRedaction?: RedactionConfig;
  // Optional soft safeguard to avoid client-side burst traffic. Set false to disable.
  rateLimit?: RateLimiterOptions | false;
  // Optional limiter specifically for bulk result downloads. Defaults to 10 per minute if omitted.
  bulkDownloadRateLimit?: RateLimiterOptions | false;
  metrics?: Metrics;
  validation?: ValidationOptions;
  profiler?: ProfilerOptions;
  http?: HttpClientOptions;
  // Optional structured audit logging for compliance.
  audit?: AuditConfig | false;
  // Optional SDK plugins.
  plugins?: ZohoCRMPlugin[];
  // Optional deprecation warning configuration.
  deprecations?: DeprecationConfig;
  // Optional experimental feature flags.
  experimentalFeatures?: ExperimentalFeatures;
  // Optional telemetry sink for opt-in experimental usage signals.
  telemetry?: Telemetry;
  // Feature flags for gradual behavior changes.
  featureFlags?: FeatureFlags;
  // Return raw Zoho field names (legacy). Set false to return camelCase for mapped fields.
  useLegacyFieldNames?: boolean;
}

export type ZohoCRMInitConfig = ZohoCRMConfig | (Omit<ZohoCRMConfig, 'auth' | 'region'> & LegacyZohoCRMConfig);

export class ZohoCRM {
  readonly auth: ZohoAuth;
  readonly http: HttpClient;
  readonly region: ZohoRegion;
  readonly leads: LeadsModule;
  readonly contacts: ContactsModule;
  readonly deals: DealsModule;
  readonly webhooks: WebhooksModule;
  readonly bulk: BulkModule;
  readonly logger: Required<Logger>;
  readonly metrics: Required<Metrics>;
  readonly telemetry: Required<Telemetry>;
  readonly featureFlags: FeatureFlags;
  readonly validation: ReturnType<typeof normalizeValidationOptions>;
  readonly profiler: NormalizedProfiler;
  readonly rateLimiter?: RateLimiter;
  readonly bulkDownloadLimiter?: RateLimiter;
  readonly audit?: NormalizedAuditConfig;
  readonly plugins: PluginManager;
  readonly experimentalFeatures: ExperimentalFeatures;
  readonly fieldNameStyle: FieldNameStyle;
  readonly legacyConfigUsed: boolean;
  private readonly extensions = new Set<string>();

  /**
   * Create a ZohoCRM client using a configured ZohoAuth instance.
   *
   * @example
   * ```ts
   * const crm = new ZohoCRM({ auth, region: 'US' });
   * const leads = await crm.leads.list({ page: 1, perPage: 10 });
   * ```
   */
  constructor(config: ZohoCRMInitConfig) {
    const rawLogger = config.logger;
    this.logger = normalizeLogger(rawLogger, config.logRedaction);
    const normalized = normalizeLegacyConfig(config as ZohoCRMInitConfig, this.logger);
    const normalizedConfig = normalized.config as ZohoCRMConfig;

    assertEnum(normalizedConfig.region, 'region', ['US', 'EU', 'IN', 'AU', 'CN', 'JP']);
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
    const rateLimitOptions = normalizedConfig.rateLimit ? normalizedConfig.rateLimit : undefined;
    this.rateLimiter = rateLimitOptions
      ? new RateLimiter({
          ...rateLimitOptions,
          onQueueChange: (size: number) => {
            this.metrics.gauge('sdk.rate_limiter.queue_depth', size, { scope: 'api' });
            rateLimitOptions?.onQueueChange?.(size);
          },
          onWarning: ({ queueSize, maxQueue }: { queueSize: number; maxQueue: number }) => {
            this.logger.warn('Rate limiter queue nearing capacity.', {
              queueSize,
              maxQueue,
              scope: 'api'
            });
            rateLimitOptions?.onWarning?.({ queueSize, maxQueue });
          }
        })
      : undefined;
    const bulkRateLimitOptions = normalizedConfig.bulkDownloadRateLimit
      ? normalizedConfig.bulkDownloadRateLimit
      : undefined;
    this.bulkDownloadLimiter =
      normalizedConfig.bulkDownloadRateLimit === false
        ? undefined
        : new RateLimiter({
            maxRequestsPerInterval: 10,
            intervalMs: 60_000,
            ...bulkRateLimitOptions,
            onQueueChange: (size: number) => {
              this.metrics.gauge('sdk.rate_limiter.queue_depth', size, { scope: 'bulk' });
              bulkRateLimitOptions?.onQueueChange?.(size);
            },
            onWarning: ({ queueSize, maxQueue }: { queueSize: number; maxQueue: number }) => {
              this.logger.warn('Bulk download limiter queue nearing capacity.', {
                queueSize,
                maxQueue,
                scope: 'bulk'
              });
              bulkRateLimitOptions?.onWarning?.({ queueSize, maxQueue });
            }
          });
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

    // Expose module instances for ergonomic access.
    const leadsModule = new LeadsModule(this.http, {
      fieldNameStyle: this.fieldNameStyle,
      useLegacyMethods: getFeatureFlag(this.featureFlags, 'useLegacyMethods', true),
      supportsAdvancedFilters: getFeatureFlag(this.featureFlags, 'advancedFilters')
    });
    const legacyLeadProxy = getFeatureFlag(this.featureFlags, 'useLegacyMethods', true)
      ? createDeprecatedProxy(leadsModule, {
          createLead: {
            target: 'create',
            message: 'createLead() is deprecated.',
            alternative: 'leads.create()',
            removalVersion: '3.0.0'
          },
          getLead: {
            target: 'get',
            message: 'getLead() is deprecated.',
            alternative: 'leads.get()',
            removalVersion: '3.0.0'
          },
          listLeads: {
            target: 'list',
            message: 'listLeads() is deprecated.',
            alternative: 'leads.list()',
            removalVersion: '3.0.0'
          },
          updateLead: {
            target: 'update',
            message: 'updateLead() is deprecated.',
            alternative: 'leads.update()',
            removalVersion: '3.0.0'
          },
          deleteLead: {
            target: 'delete',
            message: 'deleteLead() is deprecated.',
            alternative: 'leads.delete()',
            removalVersion: '3.0.0'
          }
        })
      : leadsModule;
    this.leads = legacyLeadProxy;
    this.contacts = new ContactsModule(this.http, { fieldNameStyle: this.fieldNameStyle });
    this.deals = new DealsModule(this.http, { fieldNameStyle: this.fieldNameStyle });
    this.webhooks = new WebhooksModule(this.http);
    this.bulk = new BulkModule(this.http, this.bulkDownloadLimiter);

    if (normalizedConfig.plugins && normalizedConfig.plugins.length > 0) {
      for (const plugin of normalizedConfig.plugins) {
        void this.use(plugin);
      }
    }
  }

  async close(): Promise<void> {
    if (this.rateLimiter) {
      this.rateLimiter.close();
    }
    if (this.bulkDownloadLimiter) {
      this.bulkDownloadLimiter.close();
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
      await plugin.install(this);
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
      await plugin.uninstall?.(this);
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
