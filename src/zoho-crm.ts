import type { ZohoAuth } from './auth/zoho-auth';
import type { ZohoRegion } from './auth/types';
import type { HttpClientOptions, RetryConfig } from './http/types';
import { HttpClient } from './http/http-client';
import { normalizeLogger, type Logger, type RedactionConfig } from './logger';
import { normalizeMetrics, type Metrics } from './metrics';
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
import { PluginManager, type ZohoCRMPlugin } from './plugins';

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
}

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
  readonly validation: ReturnType<typeof normalizeValidationOptions>;
  readonly profiler: NormalizedProfiler;
  readonly rateLimiter?: RateLimiter;
  readonly bulkDownloadLimiter?: RateLimiter;
  readonly audit?: NormalizedAuditConfig;
  readonly plugins: PluginManager;
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
  constructor(config: ZohoCRMConfig) {
    assertEnum(config.region, 'region', ['US', 'EU', 'IN', 'AU', 'CN', 'JP']);
    const rawLogger = config.logger;
    this.logger = normalizeLogger(rawLogger, config.logRedaction);
    this.metrics = normalizeMetrics(config.metrics);
    this.validation = normalizeValidationOptions(config.validation);
    this.profiler = normalizeProfiler(config.profiler);
    this.audit = normalizeAudit(config.audit);
    this.region = config.region;
    this.auth = config.auth;
    this.auth.setLogger(rawLogger ?? this.logger, config.logRedaction);
    this.auth.setMetrics(this.metrics);
    this.auth.setValidation(config.validation);
    this.auth.setProfiler(this.profiler);
    this.plugins = new PluginManager(this.logger);
    this.auth.addTokenRefreshListener?.((token, raw, cacheKey) =>
      this.plugins.runOnTokenRefresh({ token, raw, cacheKey, region: this.region })
    );
    this.rateLimiter = config.rateLimit
      ? new RateLimiter({
          ...config.rateLimit,
          onQueueChange: (size) => {
            this.metrics.gauge('sdk.rate_limiter.queue_depth', size, { scope: 'api' });
            config.rateLimit?.onQueueChange?.(size);
          },
          onWarning: ({ queueSize, maxQueue }) => {
            this.logger.warn('Rate limiter queue nearing capacity.', {
              queueSize,
              maxQueue,
              scope: 'api'
            });
            config.rateLimit?.onWarning?.({ queueSize, maxQueue });
          }
        })
      : undefined;
    this.bulkDownloadLimiter =
      config.bulkDownloadRateLimit === false
        ? undefined
        : new RateLimiter({
            maxRequestsPerInterval: 10,
            intervalMs: 60_000,
            ...config.bulkDownloadRateLimit,
            onQueueChange: (size) => {
              this.metrics.gauge('sdk.rate_limiter.queue_depth', size, { scope: 'bulk' });
              config.bulkDownloadRateLimit?.onQueueChange?.(size);
            },
            onWarning: ({ queueSize, maxQueue }) => {
              this.logger.warn('Bulk download limiter queue nearing capacity.', {
                queueSize,
                maxQueue,
                scope: 'bulk'
              });
              config.bulkDownloadRateLimit?.onWarning?.({ queueSize, maxQueue });
            }
          });
    this.http = new HttpClient(
      config.auth,
      config.region,
      config.retry,
      this.logger,
      this.rateLimiter,
      this.metrics,
      this.validation,
      this.profiler,
      config.http,
      this.audit,
      this.plugins
    );

    // Expose module instances for ergonomic access.
    this.leads = new LeadsModule(this.http);
    this.contacts = new ContactsModule(this.http);
    this.deals = new DealsModule(this.http);
    this.webhooks = new WebhooksModule(this.http);
    this.bulk = new BulkModule(this.http, this.bulkDownloadLimiter);

    if (config.plugins && config.plugins.length > 0) {
      for (const plugin of config.plugins) {
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
    const plugin = this.plugins.list().find((entry) => entry.name === name);
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

  registerMethod<T extends (...args: any[]) => unknown>(name: string, fn: T): void {
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
      'plugins'
    ]);
    return reserved.has(name);
  }
}
