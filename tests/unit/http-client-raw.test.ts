import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { HttpClient } from '../../src/http/http-client';
import { InputValidationError, RequestError } from '../../src/http/errors';
import type { ZohoAuth } from '../../src/auth/zoho-auth';

vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal<typeof import('undici')>();
  return {
    ...actual,
    request: vi.fn()
  };
});

const requestMock = request as unknown as vi.MockedFunction<typeof request>;

const createAuthMock = () =>
  ({
    getAccessToken: vi.fn().mockResolvedValue('token-raw')
  }) as unknown as ZohoAuth;

describe('HttpClient requestRaw', () => {
  it('returns a readable stream for successful responses', async () => {
    const auth = createAuthMock();
    const client = new HttpClient(auth, 'US');
    const body = Readable.from(['hello']);

    requestMock.mockResolvedValue({
      statusCode: 200,
      headers: {},
      body
    } as unknown as Awaited<ReturnType<typeof request>>);

    const response = await client.requestRaw({ method: 'GET', path: '/Leads' });

    expect(response.status).toBe(200);
    const chunks: Buffer[] = [];
    for await (const chunk of response.body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    expect(Buffer.concat(chunks).toString('utf8')).toBe('hello');
  });

  it('maps non-2xx responses to RequestError', async () => {
    const auth = createAuthMock();
    const client = new HttpClient(auth, 'US');

    requestMock.mockResolvedValue({
      statusCode: 500,
      headers: {},
      body: {
        json: async () => ({ message: 'server error' }),
        text: async () => 'server error',
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('');
        }
      }
    } as unknown as Awaited<ReturnType<typeof request>>);

    await expect(client.requestRaw({ method: 'GET', path: '/Leads' })).rejects.toBeInstanceOf(
      RequestError
    );
  });

  it('rejects insecure http URLs by default', async () => {
    const auth = createAuthMock();
    const client = new HttpClient(auth, 'US');

    await expect(
      client.requestRaw({ method: 'GET', path: 'http://localhost:9999/crm/v2/Leads' })
    ).rejects.toBeInstanceOf(InputValidationError);
  });
});
