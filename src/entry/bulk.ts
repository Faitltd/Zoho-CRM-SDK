import type { RateLimiterOptions } from '../rate-limiter';
import { BulkModule, iterateBulkRead } from '../modules/bulk';
import type { BulkReadIteratorOptions } from '../modules/bulk';
import { createLimiter, BaseClient, type BaseClientConfig } from './base-client';

export interface BulkClientConfig extends BaseClientConfig {
  bulkDownloadRateLimit?: RateLimiterOptions | false;
}

export class ZohoCRM extends BaseClient {
  readonly bulk: BulkModule;
  readonly bulkDownloadLimiter?: ReturnType<typeof createLimiter>;

  constructor(config: BulkClientConfig) {
    super(config);
    this.bulkDownloadLimiter =
      config.bulkDownloadRateLimit === false
        ? undefined
        : createLimiter(
            config.bulkDownloadRateLimit ?? { maxRequestsPerInterval: 10, intervalMs: 60_000 },
            this.logger,
            this.metrics,
            'bulk'
          );
    this.registerLimiter(this.bulkDownloadLimiter);
    this.bulk = new BulkModule(this.http, this.bulkDownloadLimiter);
  }
}

export { BulkModule, iterateBulkRead };
export type {
  BulkCallback,
  BulkReadJobConfig,
  BulkReadJobStatus,
  BulkWriteFieldMapping,
  BulkWriteJobConfig,
  BulkWriteJobStatus
} from '../types/bulk';
export type { BulkReadIteratorOptions };
export type { BulkClientConfig as ZohoCRMConfig };
