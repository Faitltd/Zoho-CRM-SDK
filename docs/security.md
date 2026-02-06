# Security

## Credential Handling
- Never hardcode `clientSecret`, refresh tokens, or access tokens in source control.
- Prefer environment variables, a secrets manager, or injected runtime config.
- Use `.env` files only for local development.

Example using dotenv (local development only):

```ts
import 'dotenv/config';
import { ZohoAuth } from '@yourcompany/zoho-crm';

const auth = new ZohoAuth({
  clientId: process.env.ZOHO_CLIENT_ID ?? '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
  region: (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US'
});
```

Example using AWS Secrets Manager (production):

```ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { ZohoAuth } from '@yourcompany/zoho-crm';

const client = new SecretsManagerClient({ region: 'us-east-1' });
const secret = await client.send(new GetSecretValueCommand({ SecretId: 'zoho-crm' }));
const parsed = JSON.parse(secret.SecretString ?? '{}');

const auth = new ZohoAuth({
  clientId: parsed.clientId,
  clientSecret: parsed.clientSecret,
  refreshToken: parsed.refreshToken,
  region: parsed.region ?? 'US'
});
```

## HTTPS-Only Requests
The SDK enforces HTTPS by default. If you need HTTP for a local proxy or mock server, opt in:

```ts
const crm = new ZohoCRM({
  auth,
  region: 'US',
  http: { allowInsecureHttp: true }
});
```

TLS verification uses Node.js defaults (certificate validation enabled). Do not disable TLS checks in production.

## Input Validation
The SDK validates common inputs (IDs, webhook configs, bulk configs) before sending requests and encodes path segments
to reduce injection risks. Avoid concatenating raw query strings; pass query params as objects.

## Webhook Signature Verification
Always verify webhook signatures before trusting payloads.

```ts
import { verifyWebhookSignature } from '@yourcompany/zoho-crm';

const signature = req.header('x-zoho-signature') ?? '';
const rawBody = req.rawBody ?? Buffer.from('');

if (!verifyWebhookSignature(rawBody, signature, process.env.ZOHO_WEBHOOK_SECRET ?? '')) {
  res.status(401).send('Unauthorized');
  return;
}
```

## Logging
The SDK redacts common secret fields in log metadata. Avoid logging raw request/response bodies.
You can customize redaction via `logRedaction` in the client configuration.

## Dependency Scanning
- `npm audit` runs in CI.
- Dependabot keeps dependencies current.
- CodeQL runs static analysis for JavaScript/TypeScript.

If you need additional scanning (Snyk, Trivy, etc.), add it in your own CI.
