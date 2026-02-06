import { createWriteStream } from 'node:fs';
import { ZohoAuth, ZohoCRM, iterateBulkRead } from '@yourcompany/zoho-crm';
import type { BulkReadJobConfig } from '@yourcompany/zoho-crm';

const auth = new ZohoAuth({
  clientId: process.env.ZOHO_CLIENT_ID ?? '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
  region: (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US'
});

const crm = new ZohoCRM({
  auth,
  region: (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US',
  bulkDownloadRateLimit: { maxRequestsPerInterval: 5, intervalMs: 60_000 }
});

async function main() {
  // NOTE: Bulk Read typically returns ZIP+CSV. The iterator helper in this SDK
  // expects NDJSON or pre-processed text. Use a CSV/ZIP parser for real exports.
  const config: BulkReadJobConfig = {
    module: 'Leads',
    fields: ['id', 'First_Name', 'Last_Name', 'Company', 'Email'],
    page: 1,
    perPage: 200
  };

  const output = createWriteStream('leads.csv');
  output.write('id,first_name,last_name,company,email\n');

  for await (const record of iterateBulkRead<Record<string, unknown>>(crm.bulk, config)) {
    const row = [
      record.id,
      record.First_Name,
      record.Last_Name,
      record.Company,
      record.Email
    ].map(escapeCsv);

    output.write(`${row.join(',')}\n`);
  }

  output.end();
  console.log('Export complete.');
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

main().catch((error) => {
  console.error('Bulk export failed:', error);
  process.exitCode = 1;
});
