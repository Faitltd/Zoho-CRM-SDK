import { describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { HttpClient } from '../../src/http/http-client';
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

describe('Chaos: partial responses', () => {
  it('handles truncated response bodies gracefully', async () => {
    requestMock.mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: {
        json: async () => {
          throw new Error('Unexpected end of JSON');
        },
        text: async () => '{"data":[{"id":"1"}'
      }
    });

    const client = new HttpClient(authMock, 'US');
    const response = await client.get('/Leads');

    expect(response.data).toEqual({ message: '{"data":[{"id":"1"}' });
  });
});
