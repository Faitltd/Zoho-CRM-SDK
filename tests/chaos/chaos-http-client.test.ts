import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { HttpClient } from '../../src/http/http-client';
import { AuthError } from '../../src/auth/auth-error';
import { RequestError } from '../../src/http/errors';
import type { ZohoAuth } from '../../src/auth/zoho-auth';

vi.mock('undici', () => ({
  request: vi.fn()
}));

const requestMock = request as unknown as vi.MockedFunction<typeof request>;

const authMock = {
  getAccessToken: vi.fn().mockResolvedValue('token-123')
} as unknown as ZohoAuth;

const createResponse = (statusCode: number, payload: unknown) => ({
  statusCode,
  headers: {},
  body: {
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  }
});

beforeEach(() => {
  requestMock.mockReset();
});

describe('Chaos: HttpClient', () => {
  it('handles malformed JSON without crashing', async () => {
    requestMock.mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: {
        json: async () => {
          throw new Error('bad json');
        },
        text: async () => '{"partial":true'
      }
    });

    const client = new HttpClient(authMock, 'US');
    const response = await client.get('/Leads');

    expect(response.data).toEqual({ message: '{"partial":true' });
  });

  it('retries intermittently failing 500s', async () => {
    requestMock
      .mockResolvedValueOnce(createResponse(500, { code: 'SERVER', message: 'fail', status: 'error' }))
      .mockResolvedValueOnce(createResponse(200, { ok: true }));

    const client = new HttpClient(authMock, 'US', {
      maxRetries: 1,
      initialDelay: 1,
      backoffMultiplier: 1,
      maxDelay: 1
    });

    const result = await client.get<{ ok: boolean }>('/Leads');
    expect(result.data.ok).toBe(true);
  });

  it('surfaces 5xx failures when retries exhausted', async () => {
    requestMock.mockResolvedValue(createResponse(502, { code: 'BAD_GATEWAY', message: 'fail', status: 'error' }));

    const client = new HttpClient(authMock, 'US', {
      maxRetries: 1,
      initialDelay: 1,
      backoffMultiplier: 1,
      maxDelay: 1
    });

    await expect(client.get('/Leads')).rejects.toBeInstanceOf(RequestError);
  });

  it('does not retry auth errors', async () => {
    requestMock.mockResolvedValue(createResponse(401, { code: 'INVALID_TOKEN', message: 'bad', status: 'error' }));

    const client = new HttpClient(authMock, 'US', { maxRetries: 2 });
    await expect(client.get('/Leads')).rejects.toBeInstanceOf(AuthError);
  });

  it('wraps connection resets/timeouts as RequestError', async () => {
    requestMock.mockRejectedValue(new Error('ECONNRESET'));

    const client = new HttpClient(authMock, 'US');
    await expect(client.get('/Leads')).rejects.toBeInstanceOf(RequestError);
  });

  it('surfaces auth refresh failures before issuing a request', async () => {
    const failingAuth = {
      getAccessToken: vi.fn().mockRejectedValue(new AuthError('refresh failed'))
    } as unknown as ZohoAuth;

    const client = new HttpClient(failingAuth, 'US');
    await expect(client.get('/Leads')).rejects.toBeInstanceOf(AuthError);
    expect(requestMock).not.toHaveBeenCalled();
  });
});
