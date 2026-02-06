import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { InputValidationError } from '../errors';

export interface WebhookSignatureOptions {
  algorithm?: 'sha256' | 'sha1';
  encoding?: 'hex' | 'base64';
}

/**
 * Generate a cryptographically secure shared secret for webhook verification.
 */
export function generateWebhookSecret(bytes = 32): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw new InputValidationError('bytes must be a positive number.', {
      statusCode: 400,
      fieldErrors: { bytes: ['Expected a positive number.'] }
    });
  }
  return randomBytes(bytes).toString('hex');
}

/**
 * Sign a webhook payload using HMAC for verification in tests and tooling.
 */
export function signWebhookPayload(
  payload: string | Buffer,
  secret: string,
  options: WebhookSignatureOptions = {}
): string {
  if (!secret || typeof secret !== 'string') {
    throw new InputValidationError('secret must be a non-empty string.', {
      statusCode: 400,
      fieldErrors: { secret: ['Expected a non-empty string.'] }
    });
  }
  const algorithm = options.algorithm ?? 'sha256';
  const encoding = options.encoding ?? 'hex';
  return createHmac(algorithm, secret).update(payload).digest(encoding);
}

/**
 * Verify a webhook signature using constant-time comparison.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  options: WebhookSignatureOptions = {}
): boolean {
  if (!signature || typeof signature !== 'string') {
    return false;
  }
  const algorithm = options.algorithm ?? 'sha256';
  const encoding = options.encoding ?? 'hex';
  const cleanedSignature = signature.startsWith(`${algorithm}=`) ? signature.slice(algorithm.length + 1) : signature;
  const expected = signWebhookPayload(payload, secret, { algorithm, encoding });

  const expectedBuffer = Buffer.from(expected, encoding);
  const receivedBuffer = Buffer.from(cleanedSignature, encoding);
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
