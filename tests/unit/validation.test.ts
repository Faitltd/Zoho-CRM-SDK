import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { HttpClient } from '../../src/http/http-client';
import { SchemaMismatchError } from '../../src/errors';
import { array, normalizeValidationOptions, object, string, validateSchema } from '../../src/validation';
import type { ZohoAuth } from '../../src/auth/zoho-auth';

vi.mock('undici', () => ({
  request: vi.fn()
}));

const requestMock = request as unknown as vi.MockedFunction<typeof request>;

const authMock = {
  getAccessToken: vi.fn().mockResolvedValue('token-123')
} as unknown as ZohoAuth;

const createResponse = (statusCode: number, payload: unknown) =>
  ({
    statusCode,
    headers: {},
    body: {
      json: async () => payload,
      text: async () => (payload === undefined ? '' : JSON.stringify(payload))
    }
  }) as unknown as Awaited<ReturnType<typeof request>>;

beforeEach(() => {
  requestMock.mockReset();
});

describe('Runtime validation', () => {
  const responseSchema = object({
    data: array(object({ id: string() }))
  });

  it('allows valid responses to pass', async () => {
    requestMock.mockResolvedValue(createResponse(200, { data: [{ id: '1' }] }));

    const client = new HttpClient(
      authMock,
      'US',
      undefined,
      undefined,
      undefined,
      undefined,
      normalizeValidationOptions({ enabled: true, mode: 'strict' })
    );

    const response = await client.get('/Leads', undefined, undefined, responseSchema);
    expect(response.data).toEqual({ data: [{ id: '1' }] });
  });

  it('throws SchemaMismatchError on invalid responses', async () => {
    requestMock.mockResolvedValue(createResponse(200, { data: [{ id: 123 }] }));

    const client = new HttpClient(
      authMock,
      'US',
      undefined,
      undefined,
      undefined,
      undefined,
      normalizeValidationOptions({ enabled: true, mode: 'strict' })
    );

    let caught: unknown;
    try {
      await client.get('/Leads', undefined, undefined, responseSchema);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(SchemaMismatchError);
    const issues = (caught as SchemaMismatchError).issues ?? [];
    expect(issues[0]?.path).toBe('data[0].id');
    expect(issues[0]?.expected).toBe('string');
  });

  it('warns on unexpected fields in permissive mode', async () => {
    requestMock.mockResolvedValue(createResponse(200, { data: [{ id: '1', extra: 'value' }] }));

    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const client = new HttpClient(
      authMock,
      'US',
      undefined,
      logger,
      undefined,
      undefined,
      normalizeValidationOptions({ enabled: true, mode: 'permissive', warnUnknownFields: true })
    );

    await client.get('/Leads', undefined, undefined, responseSchema);

    expect(logger.warn).toHaveBeenCalledWith('Zoho CRM response contained unexpected fields.', {
      schema: 'object',
      path: 'data[0]',
      fields: ['extra']
    });
  });

  it('measures validation overhead in a tight loop', () => {
    const payload = { data: [{ id: '1' }] };
    const options = normalizeValidationOptions({ enabled: true, mode: 'strict' });

    const start = Date.now();
    for (let i = 0; i < 1000; i += 1) {
      validateSchema(responseSchema, payload, options);
    }
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThan(2000);
  });
});
