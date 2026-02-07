import { describe, expect, it } from 'vitest';
import { ZohoAuth } from '../../src/auth/zoho-auth';
import { ZohoCRM } from '../../src/zoho-crm';

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_REGION,
  ZOHO_BULK_MODULE,
  ZOHO_BULK_FIELDS
} = process.env;

const hasEnv = Boolean(ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET && ZOHO_REFRESH_TOKEN);
const hasBulkEnv = hasEnv && Boolean(ZOHO_BULK_MODULE);
const region = (ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US';

const describeIf = hasBulkEnv ? describe : describe.skip;

const fields = ZOHO_BULK_FIELDS
  ? ZOHO_BULK_FIELDS.split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  : undefined;

describeIf('Integration: Bulk Read', () => {
  it('initializes a bulk read job and fetches status', async () => {
    const auth = new ZohoAuth({
      clientId: ZOHO_CLIENT_ID ?? '',
      clientSecret: ZOHO_CLIENT_SECRET ?? '',
      refreshToken: ZOHO_REFRESH_TOKEN ?? '',
      region
    });

    const crm = new ZohoCRM({
      auth,
      region,
      rateLimit: false,
      bulkDownloadRateLimit: false
    });

    try {
      const job = await crm.bulk.initRead({
        module: ZOHO_BULK_MODULE ?? 'Leads',
        fields,
        perPage: 200,
        fileType: 'csv'
      });

      const jobId = job.id;
      expect(jobId).toBeTruthy();

      if (!jobId) {
        return;
      }

      const status = await crm.bulk.getReadStatus(jobId);
      expect(status).toBeDefined();
      expect(status.id ?? jobId).toBeTruthy();
    } finally {
      await crm.close();
    }
  });
});
