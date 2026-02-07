import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { AuthError } from '../../src/auth/auth-error';
import { ClientClosedError, SchemaMismatchError } from '../../src/errors';
import { ZohoAuth } from '../../src/auth/zoho-auth';
import type { ZohoOAuthConfig } from '../../src/auth/types';

vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal<typeof import('undici')>();
  return {
    ...actual,
    request: vi.fn()
  };
});

const requestMock = request as unknown as vi.MockedFunction<typeof request>;

const baseConfig: ZohoOAuthConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
  region: 'US'
};

const tokenResponse = {
  access_token: 'access-123',
  expires_in: 3600,
  token_type: 'Bearer',
  api_domain: 'https://www.zohoapis.com'
};

beforeEach(() => {
  requestMock.mockReset();
});

const createResponse = (statusCode: number, payload: unknown) =>
  ({
    statusCode,
    body: {
      json: async () => payload,
      text: async () => (payload === undefined ? '' : JSON.stringify(payload))
    }
  }) as unknown as Awaited<ReturnType<typeof request>>;

const createLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
});

describe('ZohoAuth', () => {
  it('refreshes when no valid token is present', async () => {
    requestMock.mockResolvedValue(createResponse(200, tokenResponse));

    const auth = new ZohoAuth(baseConfig);
    const token = await auth.getAccessToken();

    expect(token).toBe('access-123');
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('reuses cached tokens until near expiration', async () => {
    requestMock.mockResolvedValue(createResponse(200, tokenResponse));

    const auth = new ZohoAuth(baseConfig);
    const first = await auth.getAccessToken();
    const second = await auth.getAccessToken();

    expect(first).toBe('access-123');
    expect(second).toBe('access-123');
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent refresh calls into one request', async () => {
    let resolveResponse!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    requestMock.mockReturnValue(pending);

    const auth = new ZohoAuth(baseConfig);

    const promise1 = auth.getAccessToken();
    const promise2 = auth.getAccessToken();
    const promise3 = auth.getAccessToken();

    resolveResponse(createResponse(200, tokenResponse));

    const tokens = await Promise.all([promise1, promise2, promise3]);

    expect(new Set(tokens).size).toBe(1);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('calls onTokenRefresh with new token data', async () => {
    const onTokenRefresh = vi.fn();

    requestMock.mockResolvedValue(createResponse(200, tokenResponse));

    const auth = new ZohoAuth({
      ...baseConfig,
      onTokenRefresh
    });

    await auth.getAccessToken();

    expect(onTokenRefresh).toHaveBeenCalledTimes(1);
    const [token, raw] = onTokenRefresh.mock.calls[0];
    expect(token.token).toBe('access-123');
    expect(raw).toEqual(tokenResponse);
  });

  it('uses onTokenRetrieve when cache is empty', async () => {
    const onTokenRetrieve = vi.fn().mockResolvedValue({
      token: 'cached',
      type: 'Bearer',
      expiresAt: Date.now() + 10 * 60_000
    });

    const auth = new ZohoAuth({
      ...baseConfig,
      onTokenRetrieve
    });

    const token = await auth.getAccessToken('account-1');
    expect(token).toBe('cached');
    expect(onTokenRetrieve).toHaveBeenCalledWith('account-1');
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('invalidates cached tokens and forces refresh', async () => {
    requestMock.mockResolvedValue(createResponse(200, tokenResponse));

    const auth = new ZohoAuth(baseConfig);
    await auth.getAccessToken();
    auth.invalidateToken();
    await auth.getAccessToken();

    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('evicts oldest cached tokens when max size is reached', async () => {
    const logger = createLogger();
    requestMock
      .mockResolvedValueOnce(createResponse(200, { ...tokenResponse, access_token: 'a' }))
      .mockResolvedValueOnce(createResponse(200, { ...tokenResponse, access_token: 'b' }))
      .mockResolvedValueOnce(createResponse(200, { ...tokenResponse, access_token: 'c' }))
      .mockResolvedValueOnce(createResponse(200, { ...tokenResponse, access_token: 'a2' }));

    const auth = new ZohoAuth({ ...baseConfig, maxCachedTokens: 2, logger });
    await auth.getAccessToken('one');
    await auth.getAccessToken('two');
    await auth.getAccessToken('three');

    await auth.getAccessToken('one');

    expect(logger.warn).toHaveBeenCalledWith('Token cache limit reached; evicting oldest token.', {
      cacheKey: expect.any(String),
      maxCachedTokens: '[redacted]'
    });
    const warnedKeys = logger.warn.mock.calls.map((call) => call[1]?.cacheKey);
    expect(warnedKeys).toContain('one');
    expect(requestMock).toHaveBeenCalledTimes(4);
  });

  it('logs auth errors without leaking secrets', async () => {
    const logger = createLogger();

    requestMock.mockResolvedValue(
      createResponse(400, { error: 'invalid_client', error_description: 'bad client' })
    );

    const auth = new ZohoAuth({
      ...baseConfig,
      logger
    });

    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(AuthError);

    expect(logger.warn).toHaveBeenCalledWith('Zoho OAuth request failed.', {
      status: 400,
      code: 'invalid_client',
      region: 'US'
    });

    const meta = logger.warn.mock.calls[0]?.[1];
    const metaText = JSON.stringify(meta);
    expect(metaText).not.toContain('client-secret');
    expect(metaText).not.toContain('refresh-token');
  });

  it('throws SchemaMismatchError when validation is enabled and response is malformed', async () => {
    requestMock.mockResolvedValue(createResponse(200, { access_token: 123, expires_in: 'bad' }));

    const auth = new ZohoAuth({
      ...baseConfig,
      validation: { enabled: true, mode: 'strict' }
    });

    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(SchemaMismatchError);
  });

  it('rejects requests after close', async () => {
    const auth = new ZohoAuth(baseConfig);
    auth.close();

    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(ClientClosedError);
  });
});
