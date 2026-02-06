import { describe, expect, it } from 'vitest';
import { generateWebhookSecret, signWebhookPayload, verifyWebhookSignature } from '../../src/webhooks/signature';

describe('Webhook signature helpers', () => {
  it('signs and verifies payloads', () => {
    const secret = generateWebhookSecret(16);
    const payload = JSON.stringify({ ok: true });
    const signature = signWebhookPayload(payload, secret);

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(payload, 'deadbeef', secret)).toBe(false);
  });

  it('accepts algorithm-prefixed signatures', () => {
    const secret = 'super-secret';
    const payload = 'test';
    const signature = signWebhookPayload(payload, secret);

    expect(verifyWebhookSignature(payload, `sha256=${signature}`, secret)).toBe(true);
  });
});
