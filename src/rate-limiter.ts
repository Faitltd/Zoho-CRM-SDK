import { ClientClosedError, ResourceLimitError } from './errors';

export interface RateLimiterOptions {
  maxRequestsPerInterval: number;
  intervalMs: number;
  maxQueue?: number;
  maxQueueWaitMs?: number;
  warnAtFraction?: number;
  onWarning?: (info: { queueSize: number; maxQueue: number }) => void;
  onQueueChange?: (size: number) => void;
}

// Simple in-memory rate limiter. Soft safeguard only; server-side limits still apply.
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly intervalMs: number;
  private readonly maxQueue: number;
  private readonly maxQueueWaitMs?: number;
  private readonly warnAtFraction: number;
  private readonly onWarning?: RateLimiterOptions['onWarning'];
  private readonly onQueueChange?: RateLimiterOptions['onQueueChange'];
  private readonly timestamps: number[] = [];
  private readonly queue: Array<QueueEntry<unknown>> = [];
  private timer?: NodeJS.Timeout;
  private closed = false;
  private processing = false;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequestsPerInterval;
    this.intervalMs = options.intervalMs;
    this.maxQueue = options.maxQueue ?? Number.POSITIVE_INFINITY;
    this.maxQueueWaitMs = options.maxQueueWaitMs;
    this.warnAtFraction = options.warnAtFraction ?? 0.8;
    this.onWarning = options.onWarning;
    this.onQueueChange = options.onQueueChange;
  }

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    if (this.closed) {
      return Promise.reject(new ClientClosedError('Rate limiter is closed.'));
    }

    if (this.queue.length >= this.maxQueue) {
      if (this.onWarning) {
        this.onWarning({ queueSize: this.queue.length, maxQueue: this.maxQueue });
      }
      return Promise.reject(
        new ResourceLimitError('Rate limiter queue limit reached.', {
          resource: 'rate_limiter_queue',
          limit: this.maxQueue
        })
      );
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        enqueuedAt: Date.now()
      });
      this.emitQueueChange();
      this.maybeWarn();
      this.process();
    });
  }

  close(): void {
    this.closed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      if (entry) {
        entry.reject(new ClientClosedError('Rate limiter closed.'));
      }
    }
    this.emitQueueChange();
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  private process() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    this.drainQueue();
  }

  private drainQueue() {
    if (this.closed) {
      this.processing = false;
      return;
    }

    while (this.queue.length > 0) {
      const delay = this.calculateDelay();
      if (delay > 0) {
        this.scheduleTimer(delay);
        this.processing = false;
        return;
      }

      const entry = this.queue.shift();
      if (!entry) {
        continue;
      }

      if (this.maxQueueWaitMs !== undefined) {
        const waited = Date.now() - entry.enqueuedAt;
        if (waited > this.maxQueueWaitMs) {
          entry.reject(
            new ResourceLimitError('Rate limiter wait time exceeded.', {
              resource: 'rate_limiter_queue',
              limit: this.maxQueueWaitMs
            })
          );
          this.emitQueueChange();
          continue;
        }
      }

      const start = Date.now();
      this.trim(start);
      this.timestamps.push(start);
      this.emitQueueChange();

      Promise.resolve()
        .then(() => entry.fn())
        .then(entry.resolve, entry.reject);
    }

    this.processing = false;
  }

  private scheduleTimer(delay: number) {
    if (this.timer) {
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.drainQueue();
    }, delay);
  }

  private calculateDelay(): number {
    const now = Date.now();
    this.trim(now);

    if (this.timestamps.length < this.maxRequests || this.timestamps.length === 0) {
      return 0;
    }

    const earliest = this.timestamps[0];
    if (earliest === undefined) {
      return 0;
    }
    const nextAllowed = earliest + this.intervalMs;
    return Math.max(0, nextAllowed - now);
  }

  private trim(now: number) {
    const cutoff = now - this.intervalMs;
    while (this.timestamps.length > 0) {
      const earliest = this.timestamps[0];
      if (earliest === undefined || earliest > cutoff) {
        break;
      }
      this.timestamps.shift();
    }
  }

  private emitQueueChange() {
    if (this.onQueueChange) {
      this.onQueueChange(this.queue.length);
    }
  }

  private maybeWarn() {
    if (!this.onWarning || !Number.isFinite(this.maxQueue)) {
      return;
    }

    const warnAt = Math.ceil(this.maxQueue * this.warnAtFraction);
    if (this.queue.length >= warnAt) {
      this.onWarning({ queueSize: this.queue.length, maxQueue: this.maxQueue });
    }
  }
}

type QueueEntry<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  enqueuedAt: number;
};
