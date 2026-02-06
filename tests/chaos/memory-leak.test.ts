import { describe, expect, it } from 'vitest';
import { ZohoAuth } from '../../src/auth/zoho-auth';
import { ZohoCRM } from '../../src/zoho-crm';

const hasGc = typeof global.gc === 'function';

describe('Memory leak checks (optional)', () => {
  it.skipIf(!hasGc)('does not grow unbounded after repeated create/close', async () => {
    global.gc?.();
    const start = process.memoryUsage().heapUsed;

    for (let i = 0; i < 200; i += 1) {
      const auth = new ZohoAuth({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        region: 'US'
      });
      const crm = new ZohoCRM({ auth, region: 'US' });
      await crm.close();
    }

    global.gc?.();
    const end = process.memoryUsage().heapUsed;
    const diffMb = (end - start) / 1024 / 1024;

    expect(diffMb).toBeLessThan(20);
  });
});
