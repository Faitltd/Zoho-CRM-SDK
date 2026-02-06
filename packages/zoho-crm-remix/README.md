# @yourcompany/zoho-crm-remix

Remix integration helpers for the Zoho CRM SDK.

## Install

```bash
npm install @yourcompany/zoho-crm @yourcompany/zoho-crm-remix
```

## Loaders

```ts
import { withZohoCRMLoader, createZohoCRMFromEnv } from '@yourcompany/zoho-crm-remix';

const crmFactory = () => createZohoCRMFromEnv();

export const loader = withZohoCRMLoader(crmFactory, async (crm) => {
  return crm.leads.list({ page: 1, perPage: 10 });
});
```

## Webhooks

```ts
import { verifyWebhookRequest } from '@yourcompany/zoho-crm-remix';

export const action = async ({ request }: { request: Request }) => {
  const payload = await verifyWebhookRequest(request, process.env.ZOHO_WEBHOOK_SECRET ?? '');
  console.log(payload);
  return new Response('ok');
};
```
