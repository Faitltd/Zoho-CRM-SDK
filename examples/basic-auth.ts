import { ZohoAuth, ZohoCRM } from '@yourcompany/zoho-crm';

// Basic auth + list leads from env vars.
const auth = new ZohoAuth({
  clientId: process.env.ZOHO_CLIENT_ID ?? '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
  region: (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US'
});

const crm = new ZohoCRM({
  auth,
  region: (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US'
});

async function main() {
  // Fetch the first 10 leads.
  const leads = await crm.leads.list({ page: 1, perPage: 10 });

  for (const lead of leads) {
    console.log(`${lead.id}: ${lead.lastName ?? 'Unknown'}`);
  }
}

main().catch((error) => {
  console.error('Failed to list leads:', error);
  process.exitCode = 1;
});
