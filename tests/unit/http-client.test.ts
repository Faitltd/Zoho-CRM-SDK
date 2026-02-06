import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from 'undici';
import { AuthError } from '../../src/auth/auth-error';
import { ZohoAuth } from '../../src/auth/zoho-auth';
import { HttpClient } from '../../src/http/http-client';
import {
  ClientClosedError,
  InputValidationError,
  NotFoundError,
  RateLimitError,
  RequestError,
  ValidationError
} from '../../src/http/errors';
import type { RateLimiter } from '../../src/rate-limiter';

vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal<typeof import('undici')>();
  return {
    ...actual,
    request: vi.fn()
  };
});

const requestMock = request as unknown as vi.MockedFunction<typeof request>;

const getAccessTokenMock = vi.fn();
const authMock = {
  getAccessToken: getAccessTokenMock
} as unknown as ZohoAuth;

beforeEach(() => {
  requestMock.mockReset();
  getAccessTokenMock.mockReset();
  getAccessTokenMock.mockResolvedValue('token-123');
});

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

const createLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
});

describe('HttpClient', () => {
  it('builds URLs with query params', async () => {
    requestMock.mockResolvedValue(createResponse(200, { ok: true }));

    const logger = createLogger();
    const client = new HttpClient(authMock, 'US', undefined, logger);
    await client.get('/Leads', { page: 2, per_page: 20 });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [url] = requestMock.mock.calls[0];
    expect(url).toBe('https://www.zohoapis.com/crm/v2/Leads?page=2&per_page=20');
    expect(logger.debug).toHaveBeenCalledWith('Zoho CRM request succeeded.', {
      method: 'GET',
      path: '/Leads',
      status: 200
    });
  });

  it('accepts absolute URLs without prepending base domain', async () => {
    requestMock.mockResolvedValue(createResponse(200, { ok: true }));

    const client = new HttpClient(authMock, 'US', undefined, undefined, undefined, undefined, undefined, undefined, {
      allowInsecureHttp: true
    });
    await client.get('http://localhost:1234/crm/v2/Leads', { page: 1 });

    const [url] = requestMock.mock.calls[0];
    expect(url).toBe('http://localhost:1234/crm/v2/Leads?page=1');
  });

  it('rejects insecure http requests by default', async () => {
    const client = new HttpClient(authMock, 'US');

    await expect(client.get('http://localhost:1234/crm/v2/Leads')).rejects.toBeInstanceOf(InputValidationError);
  });

  it('maps 400 to ValidationError', async () => {
    requestMock.mockResolvedValue(
      createResponse(400, { code: 'INVALID_DATA', message: 'Bad request', status: 'error' })
    );

    const logger = createLogger();
    const client = new HttpClient(authMock, 'US', undefined, logger);

    await expect(client.get('/Leads')).rejects.toBeInstanceOf(ValidationError);
    expect(logger.warn).toHaveBeenCalledWith('Zoho CRM request failed.', {
      method: 'GET',
      path: '/Leads',
      status: 400
    });
  });

  it('maps 401 to AuthError', async () => {
    requestMock.mockResolvedValue(
      createResponse(401, { code: 'INVALID_TOKEN', message: 'Unauthorized', status: 'error' })
    );

    const logger = createLogger();
    const client = new HttpClient(authMock, 'US', undefined, logger);

    await expect(client.get('/Leads')).rejects.toBeInstanceOf(AuthError);
    expect(logger.warn).toHaveBeenCalledWith('Zoho CRM request failed.', {
      method: 'GET',
      path: '/Leads',
      status: 401
    });
  });

  it('maps 404 to NotFoundError', async () => {
    requestMock.mockResolvedValue(
      createResponse(404, { code: 'NOT_FOUND', message: 'Missing', status: 'error' })
    );

    const logger = createLogger();
    const client = new HttpClient(authMock, 'US', undefined, logger);

    await expect(client.get('/Leads')).rejects.toBeInstanceOf(NotFoundError);
    expect(logger.warn).toHaveBeenCalledWith('Zoho CRM request failed.', {
      method: 'GET',
      path: '/Leads',
      status: 404
    });
  });

  it('maps 429 to RateLimitError and captures retry-after', async () => {
    requestMock.mockResolvedValue(
      createResponse(
        429,
        { code: 'RATE_LIMIT', message: 'Too many', status: 'error' },
        { 'retry-after': '30' }
      )
    );

    const logger = createLogger();
    const client = new HttpClient(authMock, 'US', undefined, logger);

    let caught: unknown;
    try {
      await client.get('/Leads');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(RateLimitError);
    expect((caught as RateLimitError).retryAfter).toBe(30);
    expect(logger.warn).toHaveBeenCalledWith('Zoho CRM request failed.', {
      method: 'GET',
      path: '/Leads',
      status: 429
    });
  });

  it('retries 5xx responses and eventually succeeds', async () => {
    requestMock
      .mockResolvedValueOnce(
        createResponse(500, { code: 'SERVER_ERROR', message: 'Fail', status: 'error' })
      )
      .mockResolvedValueOnce(
        createResponse(502, { code: 'SERVER_ERROR', message: 'Fail', status: 'error' })
      )
      .mockResolvedValueOnce(createResponse(200, { ok: true }));

    const logger = createLogger();
    const client = new HttpClient(
      authMock,
      'US',
      {
        maxRetries: 2,
        initialDelay: 1,
        backoffMultiplier: 1,
        maxDelay: 1
      },
      logger
    );

    const response = await client.get<{ ok: boolean }>('/Leads');

    expect(response.data.ok).toBe(true);
    expect(requestMock).toHaveBeenCalledTimes(3);
    expect(logger.debug).toHaveBeenCalledWith('Zoho CRM request succeeded.', {
      method: 'GET',
      path: '/Leads',
      status: 200
    });
  });

  it('does not retry 4xx errors', async () => {
    requestMock.mockResolvedValue(
      createResponse(400, { code: 'INVALID_DATA', message: 'Bad request', status: 'error' })
    );

    const logger = createLogger();
    const client = new HttpClient(
      authMock,
      'US',
      {
        maxRetries: 3,
        initialDelay: 1,
        backoffMultiplier: 1,
        maxDelay: 1
      },
      logger
    );

    await expect(client.get('/Leads')).rejects.toBeInstanceOf(ValidationError);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('throws RequestError when retries are exhausted', async () => {
    requestMock.mockResolvedValue(
      createResponse(500, { code: 'SERVER_ERROR', message: 'Fail', status: 'error' })
    );

    const logger = createLogger();
    const client = new HttpClient(
      authMock,
      'US',
      {
        maxRetries: 1,
        initialDelay: 1,
        backoffMultiplier: 1,
        maxDelay: 1
      },
      logger
    );

    await expect(client.get('/Leads')).rejects.toBeInstanceOf(RequestError);
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith('Zoho CRM request failed.', {
      method: 'GET',
      path: '/Leads',
      status: 500
    });
  });

  it('does not log secrets in metadata', async () => {
    requestMock.mockResolvedValue(createResponse(200, { ok: true }));

    const logger = createLogger();
    const client = new HttpClient(authMock, 'US', undefined, logger);

    await client.get('/Leads');

    const meta = logger.debug.mock.calls[0]?.[1];
    expect(JSON.stringify(meta)).not.toContain('token-123');
  });

  it('rejects requests after close', async () => {
    const client = new HttpClient(authMock, 'US');
    await client.close();

    await expect(client.get('/Leads')).rejects.toBeInstanceOf(ClientClosedError);
  });

  it('rejects non-serializable JSON bodies', async () => {
    const client = new HttpClient(authMock, 'US');
    const payload: Record<string, unknown> = {};
    payload.self = payload;

    await expect(client.post('/Leads', payload)).rejects.toBeInstanceOf(InputValidationError);
    expect(requestMock).not.toHaveBeenCalled();
  });
  
  it('uses rate limiter scheduling when provided', async () => {
    requestMock.mockResolvedValue(createResponse(200, { ok: true }));

    const logger = createLogger();
    const schedule = vi.fn((fn: () => Promise<unknown>) => fn());
    const limiter = { schedule } as unknown as RateLimiter;

    const client = new HttpClient(authMock, 'US', undefined, logger, limiter);

    await client.get('/Leads');

    expect(schedule).toHaveBeenCalledTimes(1);
  });
});
