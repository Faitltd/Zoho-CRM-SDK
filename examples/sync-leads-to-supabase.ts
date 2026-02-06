import { ZohoAuth, ZohoCRM } from '@yourcompany/zoho-crm';
// If you want real Supabase writes, install @supabase/supabase-js
// and uncomment the import below.
// import { createClient } from '@supabase/supabase-js';

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

// const supabase = createClient(
//   process.env.SUPABASE_URL ?? '',
//   process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
// );

async function upsertLeads(leads: Array<Record<string, unknown>>) {
  // Replace with a real Supabase call:
  // await supabase.from('zoho_leads').upsert(leads, { onConflict: 'id' });
  console.log(`[supabase] upserting ${leads.length} leads`);
}

async function main() {
  const leads = await crm.leads.list({ page: 1, perPage: 200 });

  // Map Zoho leads to your table schema.
  const payload = leads.map((lead) => ({
    id: lead.id,
    first_name: lead.firstName ?? null,
    last_name: lead.lastName ?? null,
    company: lead.company ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    updated_at: lead.modifiedAt ?? null
  }));

  await upsertLeads(payload);
  console.log('Sync complete.');
}

main().catch((error) => {
  console.error('Lead sync failed:', error);
  process.exitCode = 1;
});
