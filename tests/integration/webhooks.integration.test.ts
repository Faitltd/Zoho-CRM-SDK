import { describe, expect, it } from 'vitest';
import { ZohoAuth } from '../../src/auth/zoho-auth';
import { ZohoCRM } from '../../src/zoho-crm';

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_REGION,
  ZOHO_WEBHOOK_URL,
  ZOHO_WEBHOOK_EVENTS,
  ZOHO_WEBHOOK_MODULE,
  ZOHO_WEBHOOK_SECRET
} = process.env;

const hasEnv = Boolean(ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET && ZOHO_REFRESH_TOKEN);
const hasWebhookEnv = hasEnv && Boolean(ZOHO_WEBHOOK_URL && ZOHO_WEBHOOK_EVENTS);
const region = (ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US';

const describeIf = hasWebhookEnv ? describe : describe.skip;

const events = ZOHO_WEBHOOK_EVENTS
  ? ZOHO_WEBHOOK_EVENTS.split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  : [];

describeIf('Integration: Webhooks', () => {
  it('creates, fetches, updates, and deletes a webhook', async () => {
    const auth = new ZohoAuth({
      clientId: ZOHO_CLIENT_ID ?? '',
      clientSecret: ZOHO_CLIENT_SECRET ?? '',
      refreshToken: ZOHO_REFRESH_TOKEN ?? '',
      region
    });

    const crm = new ZohoCRM({ auth, region, rateLimit: false });

    let webhookId: string | undefined;

    try {
      const created = await crm.webhooks.create({
        name: `SDK Webhook ${Date.now()}`,
        url: ZOHO_WEBHOOK_URL ?? '',
        module: ZOHO_WEBHOOK_MODULE ?? 'Leads',
        events,
        httpMethod: 'POST',
        parameters: ZOHO_WEBHOOK_SECRET ? { secret: ZOHO_WEBHOOK_SECRET } : undefined
      });

      webhookId = created.id;
      expect(webhookId).toBeTruthy();

      if (!webhookId) {
        return;
      }

      const fetched = await crm.webhooks.get(webhookId);
      expect(fetched.id).toBe(webhookId);

      const updated = await crm.webhooks.update(webhookId, {
        description: 'SDK webhook integration test'
      });
      expect(updated.id).toBe(webhookId);

      await crm.webhooks.delete(webhookId);
      webhookId = undefined;
    } finally {
      if (webhookId) {
        await crm.webhooks.delete(webhookId);
      }
      await crm.close();
    }
  });
});
