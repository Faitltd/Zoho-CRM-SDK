# Bundle Size & Tree-Shaking

This SDK is optimized for tree-shaking and small bundles. Use subpath imports to only include what you need.

## Subpath Imports

```ts
import { ZohoCRM } from '@yourcompany/zoho-crm/leads';
```

This entry only includes auth, HTTP, and the Leads module.

Available subpaths:
- `@yourcompany/zoho-crm/core`
- `@yourcompany/zoho-crm/leads`
- `@yourcompany/zoho-crm/contacts`
- `@yourcompany/zoho-crm/deals`
- `@yourcompany/zoho-crm/webhooks`
- `@yourcompany/zoho-crm/bulk`

## Bundle Size Budgets
- Core (auth + http): `< 15kb` gzip
- Each module entry: `< 5kb` gzip
- Full bundle: `< 50kb` gzip

Run size checks:

```bash
npm run bundle:size
npm run bundle:compare
```

CI runs these checks on every PR and fails if:
- Any entry exceeds the bundle budget.
- Size regresses by more than 10% versus the baseline.

## Guidance
- Prefer subpath imports for web apps and serverless usage.
- Disable runtime validation in hot paths if you need the lowest overhead.
- Bulk operations pull in NDJSON parsing helpers; avoid importing `bulk` if you don't need it.
- Undici is included for HTTP and connection pooling. It is the only runtime dependency.
