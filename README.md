# Zoho CRM TypeScript SDK

A modern, type-safe Zoho CRM SDK for Node.js and TypeScript.

## Installation

```bash
npm install @yourcompany/zoho-crm
```

## Quickstart

```ts
import { ZohoAuth, ZohoCRM } from '@yourcompany/zoho-crm';

const auth = new ZohoAuth({
  clientId: process.env.ZOHO_CLIENT_ID ?? '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
  region: (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US'
});

const crm = new ZohoCRM({
  auth,
  region: (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US',
  rateLimit: { maxRequestsPerInterval: 30, intervalMs: 1000 }
});

async function main() {
  const leads = await crm.leads.list({ page: 1, perPage: 10 });
  for (const lead of leads) {
    console.log(`${lead.id}: ${lead.lastName ?? 'Unknown'}`);
  }
}

main().catch((error) => {
  console.error('SDK error:', error);
  process.exitCode = 1;
});
```

## Features

- TypeScript-first types with ergonomic camelCase fields
- OAuth 2.0 refresh token auth with automatic access token refresh
- CRUD modules for Leads, Contacts, and Deals
- Webhook management for Zoho CRM v8
- Bulk read/write helpers and async iterator utilities
- Client-side rate limiting and retry logic
- Optional runtime validation, profiling hooks, and audit logging
- Extensible plugin system for third-party enhancements
- Tree-shakeable subpath exports for smaller bundles

## Tree-Shaking

Import only what you need:

```ts
import { ZohoCRM } from '@yourcompany/zoho-crm/leads';
```

## Plugins

```ts
import { ZohoCRM } from '@yourcompany/zoho-crm';
import { AnalyticsPlugin } from '@yourcompany/zoho-crm-analytics';

const crm = new ZohoCRM({
  auth,
  region: 'US',
  plugins: [AnalyticsPlugin]
});
```

## Lifecycle

For long-running services, call `close()` (or `dispose()`) during shutdown to release pooled connections and cancel pending work.

```ts
process.on('SIGTERM', async () => {
  await crm.close();
  process.exit(0);
});
```

## Architecture (High Level)

- `ZohoCRM` is the main client that wires auth, HTTP, and modules.
- `ZohoAuth` manages OAuth refresh flows and token caching.
- `HttpClient` handles requests, retries, rate limits, and error mapping.
- `Modules` expose domain-specific operations (Leads, Contacts, Deals, Webhooks, Bulk).
- `Types` provide camelCase interfaces and field mapping constants.

## Docs and Examples

- Docs: `docs/01-getting-started.md`
- Auth: `docs/02-authentication.md`
- CRUD: `docs/03-crud-operations.md`
- Webhooks: `docs/04-webhooks.md`
- Bulk: `docs/05-bulk-operations.md`
- Migration: `docs/06-migrating-from-zcrmsdk.md`
- Bundle size: `docs/bundle-size.md`
- Security: `docs/security.md`
- Compliance: `docs/compliance.md`
- Versioning: `docs/versioning.md`
- Compatibility: `docs/compatibility-matrix.md`
- Breaking changes: `docs/breaking-changes.md`
- Breaking change proposal: `docs/breaking-change-proposal-template.md`
- Stability levels: `docs/stability.md`
- Migrations: `docs/migrations/README.md`
- Type evolution: `docs/type-evolution.md`
- Plugins: `docs/plugins.md`
- Integrations: `docs/integrations/README.md`
- Examples: `examples/`

## Examples

- `examples/basic-auth.ts` — initialize the client and list 10 leads
- `examples/sync-leads-to-supabase.ts` — sync leads into Supabase
- `examples/webhook-handler-express.ts` — receive and validate webhooks
- `examples/bulk-export-leads.ts` — bulk export to CSV
- `examples/construction-use-case.ts` — lead + deal workflow for a construction job request
- `examples/plugins/*.ts` — plugin examples (analytics, cache, retry, mock)

## Templates

- `templates/nextjs-app-router` — Next.js App Router starter
- `templates/nestjs-microservice` — NestJS microservice starter
- `templates/express-webhook` — Express webhook server

Run with:

```bash
npx ts-node examples/basic-auth.ts
```

Or build and run:

```bash
npm run build
node dist/examples/basic-auth.js
```

## TypeDoc (Snippet)

```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "tsconfig": "tsconfig.json",
  "excludeInternal": true
}
```

## Security

Please report vulnerabilities privately. See `SECURITY.md` for details.

## Contributing

1. Fork the repo and create a feature branch.
2. Add tests for changes.
3. Run `npm test` and ensure linting passes.
4. Open a PR with a clear description and rationale.

## License

MIT
