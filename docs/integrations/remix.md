# Remix Integration

## Best Practices
- Keep SDK usage in loaders/actions.
- Use `verifyWebhookRequest` to validate webhook signatures.

## Loaders

```ts
import { withZohoCRMLoader, createZohoCRMFromEnv } from '@yourcompany/zoho-crm-remix';

const crmFactory = () => createZohoCRMFromEnv();
export const loader = withZohoCRMLoader(crmFactory, (crm) => crm.leads.list({ page: 1, perPage: 10 }));
```

## Webhooks

```ts
import { verifyWebhookRequest } from '@yourcompany/zoho-crm-remix';

export const action = async ({ request }: { request: Request }) => {
  const payload = await verifyWebhookRequest(request, process.env.ZOHO_WEBHOOK_SECRET ?? '');
  return new Response('ok');
};
```

## Anti-Patterns
- Storing tokens in cookies.
- Using the SDK in client components.
