import { describe, expect, it } from 'vitest';
import { ZohoAuth } from '../../src/auth/zoho-auth';
import { ZohoCRM } from '../../src/zoho-crm';

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_REGION
} = process.env;

const hasEnv = Boolean(ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET && ZOHO_REFRESH_TOKEN);
const region = (ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US';

const describeIf = hasEnv ? describe : describe.skip;

describeIf('Integration: Leads CRUD', () => {
  it('creates, fetches, updates, and deletes a lead', async () => {
    const auth = new ZohoAuth({
      clientId: ZOHO_CLIENT_ID ?? '',
      clientSecret: ZOHO_CLIENT_SECRET ?? '',
      refreshToken: ZOHO_REFRESH_TOKEN ?? '',
      region
    });

    const crm = new ZohoCRM({ auth, region, rateLimit: false });

    let leadId: string | undefined;
    try {
      const created = await crm.leads.create({
        lastName: `SDK Integration ${Date.now()}`,
        company: 'SDK Test'
      });
      leadId = created.id;

      const fetched = await crm.leads.get(leadId);
      expect(fetched.id).toBe(leadId);

      const updated = await crm.leads.update(leadId, { company: 'SDK Test Updated' });
      expect(updated.company).toBe('SDK Test Updated');

      await crm.leads.delete(leadId);
      leadId = undefined;
    } finally {
      if (leadId) {
        await crm.leads.delete(leadId);
      }
      await crm.close();
    }
  });
});
