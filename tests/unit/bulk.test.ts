import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../../src/http/http-client';
import { RateLimiter } from '../../src/rate-limiter';
import { BulkModule, iterateBulkRead } from '../../src/modules/bulk';
import type { BulkReadJobConfig, BulkReadJobStatus } from '../../src/types/bulk';

const createHttpMock = () =>
  ({
    get: vi.fn(),
    post: vi.fn(),
    requestRaw: vi.fn()
  }) as unknown as HttpClient;

describe('BulkModule', () => {
  it('initializes bulk read with mapped payload', async () => {
    const http = createHttpMock();
    const module = new BulkModule(http);

    http.post.mockResolvedValue({
      data: { data: [{ id: 'job1', state: 'ADDED' }] },
      status: 200,
      headers: {}
    });

    const config: BulkReadJobConfig = {
      module: 'Leads',
      fields: ['Last_Name'],
      page: 1,
      perPage: 200,
      callback: { url: 'https://example.com/webhook', method: 'post' }
    };

    const result = await module.initRead(config);

    expect(result.id).toBe('job1');
    expect(http.post).toHaveBeenCalledWith(
      '/crm/bulk/v8/read',
      {
        callback: config.callback,
        query: {
          module: { api_name: 'Leads' },
          fields: ['Last_Name'],
          page: 1,
          per_page: 200
        }
      },
      undefined,
      expect.anything()
    );
  });

  it('downloads bulk read results through requestRaw', async () => {
    const http = createHttpMock();
    const module = new BulkModule(http);

    http.requestRaw.mockResolvedValue({
      status: 200,
      headers: {},
      body: Readable.from(['{"id":1}\n'])
    });

    const stream = await module.downloadReadResult('job1');

    expect(stream).toBeDefined();
    expect(http.requestRaw).toHaveBeenCalledWith({ method: 'GET', path: '/crm/bulk/v8/read/job1/result' });
  });

  it('rate limits bulk download requests', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const limiter = new RateLimiter({ maxRequestsPerInterval: 1, intervalMs: 1000 });
    const http = createHttpMock();
    const module = new BulkModule(http, limiter);

    const starts: number[] = [];

    http.requestRaw.mockImplementation(async () => {
      starts.push(Date.now());
      return {
        status: 200,
        headers: {},
        body: Readable.from([])
      };
    });

    const first = module.downloadReadResult('job1');
    const second = module.downloadReadResult('job1');

    await vi.runAllTimersAsync();
    await Promise.all([first, second]);

    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(1000);

    vi.useRealTimers();
  });
});

describe('iterateBulkRead', () => {
  it('yields records from multiple pages in order', async () => {
    const bulk = {
      initRead: vi.fn().mockResolvedValue({ id: 'job1', state: 'ADDED' } as BulkReadJobStatus),
      getReadStatus: vi
        .fn()
        .mockResolvedValueOnce({ id: 'job1', state: 'COMPLETED', result: { moreRecords: true } })
        .mockResolvedValueOnce({ id: 'job1', state: 'COMPLETED', result: { moreRecords: false } }),
      downloadReadResult: vi
        .fn()
        .mockResolvedValueOnce(asyncIterableFromLines(['{"id":1}\n', '{"id":2}\n']))
        .mockResolvedValueOnce(asyncIterableFromLines(['{"id":3}\n']))
    } as unknown as BulkModule;

    const records: Array<{ id: number }> = [];

    for await (const record of iterateBulkRead<{ id: number }>(bulk, { module: 'Leads' })) {
      records.push(record);
    }

    expect(records.map((record) => record.id)).toEqual([1, 2, 3]);
  });
});

async function* asyncIterableFromLines(lines: string[]): AsyncIterable<string> {
  for (const line of lines) {
    yield line;
  }
}
