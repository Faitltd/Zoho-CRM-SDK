import express from 'express';
import { verifyWebhookSignature } from '@yourcompany/zoho-crm';

const app = express();

// Capture raw body for signature verification, while still parsing JSON/form bodies.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as { rawBody?: Buffer }).rawBody = buf;
    }
  })
);
app.use(
  express.urlencoded({
    extended: false,
    verify: (req, _res, buf) => {
      (req as { rawBody?: Buffer }).rawBody = buf;
    }
  })
);

const WEBHOOK_SECRET = process.env.ZOHO_WEBHOOK_SECRET ?? 'replace-me';

app.post('/webhooks/zoho', (req, res) => {
  const signature = req.header('x-zoho-signature') ?? '';
  const rawBody = (req as { rawBody?: Buffer }).rawBody ?? Buffer.from('');

  if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }

  const redacted = redactPayload(req.body);
  console.log('[zoho-webhook] received', redacted);

  return res.status(200).send('ok');
});

function redactPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const sensitiveKeys = new Set([
    'authorization',
    'token',
    'secret',
    'signature',
    'client_secret',
    'refresh_token',
    'access_token'
  ]);

  const scrub = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => scrub(entry));
    }

    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        output[key] = '[redacted]';
      } else {
        output[key] = scrub(entry);
      }
    }

    return output;
  };

  return scrub(payload);
}

app.listen(3000, () => {
  console.log('Zoho webhook listener running on http://localhost:3000/webhooks/zoho');
});
