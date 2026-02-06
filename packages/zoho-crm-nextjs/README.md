# @yourcompany/zoho-crm-nextjs

Next.js integration helpers for the Zoho CRM SDK.

## Install

```bash
npm install @yourcompany/zoho-crm @yourcompany/zoho-crm-nextjs
```

## Server Actions

```ts
// app/actions/zoho.ts
'use server';

import { createZohoCRMFromEnv, createServerAction } from '@yourcompany/zoho-crm-nextjs';

const clientFactory = () => createZohoCRMFromEnv();

export const listLeads = createServerAction(clientFactory, async (crm) => {
  return crm.leads.list({ page: 1, perPage: 10 });
});
```

## App Router Webhook Handler

```ts
// app/api/zoho/webhook/route.ts
import { createWebhookRouteHandler } from '@yourcompany/zoho-crm-nextjs';

export const POST = createWebhookRouteHandler({
  secret: process.env.ZOHO_WEBHOOK_SECRET ?? '',
  handler: async (payload) => {
    console.log('Webhook payload', payload);
    return new Response('ok');
  }
});
```

## Edge Runtime
Use `createEdgeClient` for limited edge-safe calls:

```ts
import { createEdgeClient } from '@yourcompany/zoho-crm-nextjs/edge';

const edge = createEdgeClient({
  region: 'US',
  getAccessToken: async () => process.env.ZOHO_ACCESS_TOKEN ?? ''
});
```

## SWR/React Query
Use server actions or API routes as fetchers. Avoid using the SDK directly in the browser.
