import { describe, expect, it, vi } from 'vitest';
import type { ZohoAuth } from '../../src/auth/zoho-auth';
import { ZohoCRM } from '../../src/zoho-crm';

const createAuthMock = () =>
  ({
    setLogger: vi.fn(),
    setMetrics: vi.fn(),
    setValidation: vi.fn(),
    setProfiler: vi.fn(),
    close: vi.fn()
  }) as unknown as ZohoAuth;

describe('ZohoCRM', () => {
  it('disables rate limiter when rateLimit is false', () => {
    const auth = createAuthMock();
    const crm = new ZohoCRM({
      auth,
      region: 'US',
      rateLimit: false
    });

    expect((crm as { rateLimiter?: unknown }).rateLimiter).toBeUndefined();
  });

  it('closes auth on client close', async () => {
    const auth = createAuthMock() as unknown as { close: ReturnType<typeof vi.fn> };
    const crm = new ZohoCRM({ auth: auth as unknown as ZohoAuth, region: 'US' });

    await crm.close();

    expect(auth.close).toHaveBeenCalledTimes(1);
  });
});
