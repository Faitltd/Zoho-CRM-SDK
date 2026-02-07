import { describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { HttpClient } from '../../src/http/http-client';
import { AuthError, RateLimitError, RequestError, ValidationError } from '../../src/errors';
import type { ZohoAuth } from '../../src/auth/zoho-auth';
import { PluginManager } from '../../src/plugins';
import { array, named, object, string } from '../../src/validation';

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
    getAccessToken: vi.fn().mockResolvedValue('token-123')
  }) as unknown as ZohoAuth;

const createResponse = (
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {}
) =>
  ({
    statusCode,
    headers,
    body: {
      json: async () => payload,
      text: async () => (payload === undefined ? '' : JSON.stringify(payload))
    }
  }) as unknown as Awaited<ReturnType<typeof request>>;

describe('HttpClient helpers', () => {
  it('reports unknown fields when validation exports are enabled', async () => {
    const auth = createAuthMock();
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const exporter = vi.fn();
    const client = new HttpClient(
      auth,
      'US',
      undefined,
      logger,
      undefined,
      undefined,
      { enabled: true, mode: 'permissive', warnUnknownFields: true, exportUnknownFields: exporter }
    );

    const responseSchema = named(
      object({
        data: array(
          object({
            id: string()
          })
        )
      }),
      'TestSchema'
    );

    requestMock.mockResolvedValue(createResponse(200, { data: [{ id: '1', extra: 'field' }] }));

    await client.get('/Leads', undefined, undefined, responseSchema);

    expect(logger.warn).toHaveBeenCalledWith('Zoho CRM response contained unexpected fields.', {
      schema: 'TestSchema',
      path: expect.any(String),
      fields: ['extra']
    });
    expect(exporter).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: 'TestSchema',
        fields: ['extra']
      })
    );
  });

  it('normalizes plugin response overrides', async () => {
    const auth = createAuthMock();
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const plugins = new PluginManager(logger);
    const client = new HttpClient(auth, 'US', undefined, logger, undefined, undefined, undefined, undefined, undefined, undefined, plugins);

    plugins.registerPlugin({ name: 'override', version: '1.0.0', install: vi.fn() });
    plugins.registerHooks('override', {
      beforeRequest: () => ({ data: { ok: true }, status: 201 })
    });

    const response = await client.get('/Leads');
    expect(response.status).toBe(201);
    expect(response.data).toEqual({ ok: true });
  });

  it('maps retry-after header into RateLimitError', async () => {
    const auth = createAuthMock();
    const client = new HttpClient(auth, 'US');

    requestMock.mockResolvedValue(
      createResponse(429, { message: 'Too many', status: 'error' }, { 'retry-after': '12' })
    );

    await expect(client.get('/Leads')).rejects.toBeInstanceOf(RateLimitError);
    await expect(client.get('/Leads')).rejects.toMatchObject({ retryAfter: 12 });
  });

  it('does not retry AuthError', async () => {
    const auth = createAuthMock();
    const client = new HttpClient(auth, 'US', { maxRetries: 2 });

    requestMock.mockResolvedValue(createResponse(401, { message: 'Unauthorized', status: 'error' }));
    await expect(client.get('/Leads')).rejects.toBeInstanceOf(AuthError);
  });

  it('treats validation errors as non-retryable', async () => {
    const auth = createAuthMock();
    const client = new HttpClient(auth, 'US', { maxRetries: 2 });

    requestMock.mockResolvedValue(createResponse(400, { message: 'Bad request', status: 'error' }));
    await expect(client.get('/Leads')).rejects.toBeInstanceOf(ValidationError);
  });

  it('wraps network failures as RequestError', async () => {
    const auth = createAuthMock();
    const client = new HttpClient(auth, 'US', { maxRetries: 0 });

    requestMock.mockRejectedValue(new Error('socket hang up'));
    await expect(client.get('/Leads')).rejects.toBeInstanceOf(RequestError);
  });
});
