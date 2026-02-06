import { request as undiciRequest } from 'undici';
import { RateLimiter } from '../src/rate-limiter';
import { HttpClient } from '../src/http/http-client';
import { iterateBulkRead } from '../src/modules/bulk';
import { LeadSchema, ZohoDataResponseSchema, normalizeValidationOptions } from '../src/validation';
import type { ApiResponse } from '../src/http/types';
import type { ZohoAuth } from '../src/auth/zoho-auth';

type AuthLike = {
  getAccessToken: () => Promise<string>;
  invalidateToken?: () => void;
};

export class BenchmarkAuth implements AuthLike {
  private token?: string;
  private expiresAt = 0;
  private readonly delayMs: number;

  constructor(delayMs: number) {
    this.delayMs = delayMs;
  }

  async getAccessToken(): Promise<string> {
    if (this.token && this.expiresAt > Date.now()) {
      return this.token;
    }

    await sleep(this.delayMs);
    this.token = 'benchmark-token';
    this.expiresAt = Date.now() + 60_000;
    return this.token;
  }

  invalidateToken(): void {
    this.token = undefined;
    this.expiresAt = 0;
  }

}

export async function rawHttpGet(url: string): Promise<ApiResponse<unknown>> {
  const response = await undiciRequest(url, { method: 'GET' });
  const payload = await response.body.json();
  return {
    data: payload,
    status: response.statusCode,
    headers: normalizeHeaders(response.headers)
  };
}

export function createHttpClient(auth: AuthLike, validationEnabled: boolean): HttpClient {
  return new HttpClient(
    auth as unknown as ZohoAuth,
    'US',
    { maxRetries: 0 },
    undefined,
    undefined,
    undefined,
    normalizeValidationOptions({ enabled: validationEnabled, mode: validationEnabled ? 'strict' : 'off' }),
    undefined,
    { allowInsecureHttp: true }
  );
}

export async function sdkGet(client: HttpClient, url: string, validate: boolean) {
  const schema = validate ? ZohoDataResponseSchema(LeadSchema) : undefined;
  return client.get(url, undefined, undefined, schema);
}

export function createRateLimiterScenario() {
  const limiter = new RateLimiter({ maxRequestsPerInterval: 1, intervalMs: 10 });
  const startTimes: number[] = [];

  return {
    limiter,
    startTimes,
    run: async (count: number) => {
      const tasks = Array.from({ length: count }, () =>
        limiter.schedule(async () => {
          startTimes.push(Date.now());
          return 'ok';
        })
      );

      await Promise.all(tasks);
    }
  };
}

export function createBulkStub(totalRecords: number, pageSize: number) {
  let pageIndex = 0;
  const pages = Math.ceil(totalRecords / pageSize);

  return {
    initRead: async () => ({ id: 'job-1', state: 'ADDED' }),
    getReadStatus: async () => ({
      id: 'job-1',
      state: 'COMPLETED',
      result: { moreRecords: pageIndex < pages }
    }),
    downloadReadResult: async () => {
      const start = pageIndex * pageSize;
      const remaining = totalRecords - start;
      const count = Math.min(pageSize, Math.max(remaining, 0));
      pageIndex += 1;
      return generateNdjson(count, start);
    }
  };
}

export async function consumeBulk(totalRecords: number, pageSize: number) {
  const bulk = createBulkStub(totalRecords, pageSize);
  let processed = 0;

  for await (const _record of iterateBulkRead(bulk, { module: 'Leads' })) {
    processed += 1;
  }

  return processed;
}

export async function consumeBulkWithMemory(totalRecords: number, pageSize: number) {
  const bulk = createBulkStub(totalRecords, pageSize);
  let processed = 0;
  let maxHeap = 0;

  for await (const _record of iterateBulkRead(bulk, { module: 'Leads' })) {
    processed += 1;
    const heap = process.memoryUsage().heapUsed;
    if (heap > maxHeap) {
      maxHeap = heap;
    }
  }

  return { processed, maxHeap };
}

function normalizeHeaders(headers: Record<string, string | string[] | undefined>) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      normalized[key] = value.join(', ');
    } else if (value) {
      normalized[key] = value;
    }
  }
  return normalized;
}

async function* generateNdjson(count: number, startIndex: number): AsyncIterable<string> {
  for (let i = 0; i < count; i += 1) {
    const id = startIndex + i + 1;
    yield JSON.stringify({ id, name: `Lead ${id}` }) + '\n';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
