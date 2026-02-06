import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { HttpClient } from '../../src/http/http-client';
import { normalizeAudit } from '../../src/audit';
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

const createResponse = (statusCode: number, payload: unknown) =>
  ({
    statusCode,
    headers: { 'x-request-id': 'req-1' },
    body: {
      json: async () => payload,
      text: async () => (payload === undefined ? '' : JSON.stringify(payload))
    }
  }) as unknown as Awaited<ReturnType<typeof request>>;

beforeEach(() => {
  requestMock.mockReset();
});

describe('Audit logging', () => {
  it('emits structured audit events with redacted context', async () => {
    requestMock.mockResolvedValue(createResponse(200, { ok: true }));

    const logger = { log: vi.fn() };
    const audit = normalizeAudit({
      enabled: true,
      logger,
      contextProvider: () => ({
        userId: 'user-1',
        email: 'person@example.com',
        token: 'secret-token'
      })
    });
    expect(audit).toBeDefined();

    const client = new HttpClient(
      authMock,
      'US',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      audit ?? undefined
    );

    await client.get('/Leads');

    expect(logger.log).toHaveBeenCalledTimes(1);
    const event = logger.log.mock.calls[0]?.[0] as { context?: Record<string, unknown> };
    expect(event.method).toBe('GET');
    expect(event.path).toBe('/Leads');
    expect(event.status).toBe(200);
    expect(event.success).toBe(true);
    expect(event.requestId).toBe('req-1');
    expect(event.context?.email).toBe('[redacted]');
    expect(event.context?.token).toBe('[redacted]');
    expect(event.context?.userId).toBe('user-1');
  });

  it('logs failed requests without leaking payloads', async () => {
    requestMock.mockResolvedValue(createResponse(400, { message: 'Bad request', status: 'error' }));

    const logger = { log: vi.fn() };
    const audit = normalizeAudit({ enabled: true, logger });
    expect(audit).toBeDefined();

    const client = new HttpClient(
      authMock,
      'US',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      audit ?? undefined
    );

    await expect(client.get('/Leads')).rejects.toBeDefined();

    const event = logger.log.mock.calls[0]?.[0];
    expect(event.success).toBe(false);
    expect(event.status).toBe(400);
  });
});
