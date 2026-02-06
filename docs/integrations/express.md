# Express Integration

## Best Practices
- Attach the SDK to `req` via middleware.
- Use `createWebhookHandler` for signature verification.
- Add error handling middleware after routes.

## Middleware

```ts
import { createZohoCRMMiddleware, zohoErrorHandler } from '@yourcompany/zoho-crm-express';

app.use(createZohoCRMMiddleware(crm));
app.use(zohoErrorHandler());
```

## Webhooks

```ts
import { createWebhookHandler } from '@yourcompany/zoho-crm-express';

app.post('/webhooks/zoho', createWebhookHandler({
  secret: process.env.ZOHO_WEBHOOK_SECRET ?? '',
  handler: async (payload) => {
    console.log(payload);
  }
}));
```

## Rate Limiting
Use `createZohoRateLimiterMiddleware` to throttle webhook routes.
