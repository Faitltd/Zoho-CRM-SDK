import { describe, expect, it } from 'vitest';
import { ZohoAuth } from '../../src/auth/zoho-auth';
import { ZohoCRM } from '../../src/zoho-crm';

const chaosUrl = process.env.CHAOS_BASE_URL;
const hasCredentials = Boolean(
  process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REFRESH_TOKEN &&
    chaosUrl
);

// This test uses the chaos proxy and real credentials. It is optional.
// Run with: CHAOS_BASE_URL=http://localhost:5001 ZOHO_CLIENT_ID=... ZOHO_CLIENT_SECRET=... ZOHO_REFRESH_TOKEN=... npx vitest run tests/chaos

describe('Chaos proxy (optional)', () => {
  it.skipIf(!hasCredentials)('routes through chaos proxy and survives intermittent failures', async () => {
    const region = (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP' | undefined) ?? 'US';

    const auth = new ZohoAuth({
      clientId: process.env.ZOHO_CLIENT_ID ?? '',
      clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
      refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
      region
    });

    const crm = new ZohoCRM({
      auth,
      region,
      http: { allowInsecureHttp: true },
      logger: {
        warn: () => {},
        error: () => {}
      }
    });

    // Overwrite the base URL by using the full path with the chaos proxy base.
    // This requires setting CHAOS_BASE_URL to point at the proxy.
    const leads = await crm.http.request({
      method: 'GET',
      path: `${chaosUrl}/crm/v2/Leads`
    });

    expect(leads.status).toBeGreaterThanOrEqual(200);
  });
});
