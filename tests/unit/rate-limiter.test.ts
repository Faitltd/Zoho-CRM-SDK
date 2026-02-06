import { describe, expect, it, vi } from 'vitest';
import { ClientClosedError, ResourceLimitError } from '../../src/errors';
import { RateLimiter } from '../../src/rate-limiter';

describe('RateLimiter', () => {
  it('allows at most N starts per interval', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const limiter = new RateLimiter({ maxRequestsPerInterval: 2, intervalMs: 1000 });
    const starts: number[] = [];

    const task = async () => {
      starts.push(Date.now());
    };

    const promises = [
      limiter.schedule(task),
      limiter.schedule(task),
      limiter.schedule(task)
    ];

    await vi.runAllTimersAsync();
    await Promise.all(promises);

    expect(starts).toHaveLength(3);
    expect(starts[2] - starts[0]).toBeGreaterThanOrEqual(1000);

    vi.useRealTimers();
  });

  it('delays requests when the window is saturated', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const limiter = new RateLimiter({ maxRequestsPerInterval: 1, intervalMs: 50 });
    const starts: number[] = [];

    const task = async () => {
      starts.push(Date.now());
    };

    const first = limiter.schedule(task);
    const second = limiter.schedule(task);

    await vi.runAllTimersAsync();
    await Promise.all([first, second]);

    expect(starts[0]).toBe(0);
    expect(starts[1]).toBeGreaterThanOrEqual(50);

    vi.useRealTimers();
  });

  it('rejects when queue limit is exceeded', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const limiter = new RateLimiter({ maxRequestsPerInterval: 1, intervalMs: 100, maxQueue: 1 });

    const task = async () => 'ok';

    const first = limiter.schedule(task);
    const second = limiter.schedule(task);
    const third = limiter.schedule(task);

    await expect(third).rejects.toBeInstanceOf(ResourceLimitError);
    await vi.runAllTimersAsync();
    await Promise.all([first, second]);

    vi.useRealTimers();
  });

  it('rejects when closed', async () => {
    const limiter = new RateLimiter({ maxRequestsPerInterval: 1, intervalMs: 100 });
    limiter.close();

    await expect(limiter.schedule(async () => 'ok')).rejects.toBeInstanceOf(ClientClosedError);
  });
});
