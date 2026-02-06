# Webhooks

## Webhook Lifecycle
- Create, list, update, delete

## Events
- Common event types
- Module-specific considerations

## Security
- Verify webhook signatures with `verifyWebhookSignature`.
- Store webhook secrets in environment variables or a secrets manager.
- Redact any sensitive headers/body fields before logging.

Example signature verification:

```ts
import { verifyWebhookSignature } from '@yourcompany/zoho-crm';

const signature = req.header('x-zoho-signature') ?? '';
const rawBody = req.rawBody ?? Buffer.from('');

if (!verifyWebhookSignature(rawBody, signature, process.env.ZOHO_WEBHOOK_SECRET ?? '')) {
  res.status(401).send('Unauthorized');
  return;
}
```

## Examples
- Create a webhook
- Express handler example
