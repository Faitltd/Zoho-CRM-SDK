# NestJS Integration

## Best Practices
- Use `ZohoCRMModule` for DI.
- Store credentials in the ConfigService or secret store.
- Validate webhook signatures with `ZohoCRMWebhookGuard`.

## Module Setup

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
- Ensure your body parser preserves `rawBody` for signature verification.

## Health Checks
Use `ZohoCRMHealthService.check()` in your health endpoint or wire into Terminus.
