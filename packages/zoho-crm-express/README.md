# @yourcompany/zoho-crm-express

Express middleware helpers for the Zoho CRM SDK.

## Install

```bash
npm install @yourcompany/zoho-crm @yourcompany/zoho-crm-express
```

## Attach SDK to Requests

```ts
import express from 'express';
import { ZohoAuth, ZohoCRM } from '@yourcompany/zoho-crm';
import { createZohoCRMMiddleware } from '@yourcompany/zoho-crm-express';

const app = express();
const auth = new ZohoAuth({ clientId: '', clientSecret: '', refreshToken: '', region: 'US' });
const crm = new ZohoCRM({ auth, region: 'US' });

app.use(createZohoCRMMiddleware(crm));
```

## Webhook Handler

```ts
import { createWebhookHandler } from '@yourcompany/zoho-crm-express';

app.post('/webhooks/zoho', createWebhookHandler({
  secret: process.env.ZOHO_WEBHOOK_SECRET ?? '',
  handler: async (payload) => {
    console.log(payload);
  }
}));
```

## Error Handling

```ts
import { zohoErrorHandler } from '@yourcompany/zoho-crm-express';

app.use(zohoErrorHandler());
```
