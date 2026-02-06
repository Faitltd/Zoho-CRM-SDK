# Next.js Integration

## Best Practices
- Use Server Actions or Route Handlers; avoid calling the SDK in the browser.
- Keep secrets in server-only environment variables.
- Verify webhooks using `x-zoho-signature` and raw body.

## Server Actions

```ts
'use server';
import { createZohoCRMFromEnv, createServerAction } from '@yourcompany/zoho-crm-nextjs';

const crmFactory = () => createZohoCRMFromEnv();
export const listLeads = createServerAction(crmFactory, (crm) => crm.leads.list({ page: 1, perPage: 10 }));
```

## App Router Webhooks

```ts
import { createWebhookRouteHandler } from '@yourcompany/zoho-crm-nextjs';

export const POST = createWebhookRouteHandler({
  secret: process.env.ZOHO_WEBHOOK_SECRET ?? '',
  handler: async (payload) => new Response('ok')
});
```

## Edge Runtime
Use `createEdgeClient` for limited edge-safe requests and `verifyWebhookSignatureEdge` for signatures.
Do not use full OAuth refresh in Edge; provide access tokens explicitly.

## SWR / React Query
- Prefer API routes or server actions as fetchers.
- Never expose client secrets to the browser.

Example SWR pattern:

```ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const { data } = useSWR('/api/zoho/leads', fetcher);
```

## Anti-Patterns
- Client-side instantiation of `ZohoCRM`.
- Logging raw webhook payloads containing PII.
