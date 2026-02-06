import { describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { ZohoAuth } from '../../src/auth/zoho-auth';
import { AuthError } from '../../src/auth/auth-error';

vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal<typeof import('undici')>();
  return {
    ...actual,
    request: vi.fn()
  };
});

const requestMock = request as unknown as vi.MockedFunction<typeof request>;

const baseConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
  region: 'US' as const
};

describe('Chaos: ZohoAuth', () => {
  it('surfaces token refresh failures', async () => {
    requestMock.mockResolvedValue({
      statusCode: 400,
      body: {
        json: async () => ({ error: 'invalid_client', error_description: 'bad client' }),
        text: async () => ''
      }
    });

    const auth = new ZohoAuth(baseConfig);
    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(AuthError);
  });

  it('coalesces concurrent refresh and handles failure', async () => {
    requestMock.mockResolvedValue({
      statusCode: 500,
      body: {
        json: async () => ({ error: 'server_error' }),
        text: async () => ''
      }
    });

    const auth = new ZohoAuth(baseConfig);
    const p1 = auth.getAccessToken();
    const p2 = auth.getAccessToken();

    await expect(Promise.all([p1, p2])).rejects.toBeInstanceOf(AuthError);
  });
});
