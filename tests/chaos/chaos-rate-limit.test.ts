import { describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { HttpClient } from '../../src/http/http-client';
import { RateLimitError } from '../../src/http/errors';
import type { ZohoAuth } from '../../src/auth/zoho-auth';

vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal<typeof import('undici')>();
  return {
    ...actual,
    request: vi.fn()
  };
});

const requestMock = request as unknown as vi.MockedFunction<typeof request>;

const authMock = {
  getAccessToken: vi.fn().mockResolvedValue('token-123')
} as unknown as ZohoAuth;

const createResponse = (statusCode: number, payload: unknown, headers: Record<string, string> = {}) => ({
  statusCode,
  headers,
  body: {
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  }
});

describe('Chaos: rate limiting', () => {
  it('captures retry-after headers', async () => {
    requestMock.mockResolvedValue(
      createResponse(429, { code: 'RATE_LIMIT', message: 'Too many', status: 'error' }, { 'retry-after': '5' })
    );

    const client = new HttpClient(authMock, 'US');

    try {
      await client.get('/Leads');
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfter).toBe(5);
    }
  });
});
