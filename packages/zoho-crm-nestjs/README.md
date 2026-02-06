# @yourcompany/zoho-crm-nestjs

NestJS module for the Zoho CRM SDK.

## Install

```bash
npm install @yourcompany/zoho-crm @yourcompany/zoho-crm-nestjs
```

## Module Setup

```ts
import { Module } from '@nestjs/common';
import { ZohoCRMModule } from '@yourcompany/zoho-crm-nestjs';
import { ZohoAuth } from '@yourcompany/zoho-crm';

@Module({
  imports: [
    ZohoCRMModule.forRoot({
      auth: new ZohoAuth({
        clientId: process.env.ZOHO_CLIENT_ID ?? '',
        clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
        refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
        region: 'US'
      }),
      region: 'US'
    })
  ]
})
export class AppModule {}
```

## ConfigService Integration

```ts
ZohoCRMModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    auth: new ZohoAuth({
      clientId: config.get('ZOHO_CLIENT_ID') ?? '',
      clientSecret: config.get('ZOHO_CLIENT_SECRET') ?? '',
      refreshToken: config.get('ZOHO_REFRESH_TOKEN') ?? '',
      region: 'US'
    }),
    region: 'US'
  }),
  inject: [ConfigService]
});
```

## Webhook Guard
Attach raw-body middleware and use `ZohoCRMWebhookGuard` to validate `x-zoho-signature`.

## Health Checks
`ZohoCRMHealthService` provides a basic `check()` method for custom health endpoints.
