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

  it('initializes bulk write with mapped payload', async () => {
    const http = createHttpMock();
    const module = new BulkModule(http);

    http.post.mockResolvedValue({
      data: { data: [{ id: 'job2', state: 'ADDED' }] },
      status: 200,
      headers: {}
    });

    const result = await module.initWrite({
      operation: 'insert',
      module: 'Leads',
      fileId: 'file-1',
      fieldMappings: [{ apiName: 'Last_Name', index: 0 }]
    });

    expect(result.id).toBe('job2');
    expect(http.post).toHaveBeenCalledWith(
      '/crm/bulk/v8/write',
      {
        operation: 'insert',
        resource: [
          {
            type: 'data',
            module: 'Leads',
            file_id: 'file-1',
            field_mappings: [{ api_name: 'Last_Name', index: 0 }]
          }
        ]
      },
      undefined,
      expect.anything()
    );
  });

  it('gets bulk write status', async () => {
    const http = createHttpMock();
    const module = new BulkModule(http);

    http.get.mockResolvedValue({
      data: { data: [{ id: 'job2', state: 'IN_PROGRESS' }] },
      status: 200,
      headers: {}
    });

    const status = await module.getWriteStatus('job2');
    expect(status.id).toBe('job2');
    expect(http.get).toHaveBeenCalledWith(
      '/crm/bulk/v8/write/job2',
      undefined,
      undefined,
      expect.anything()
    );
  });

  it('rejects invalid bulk write configs', async () => {
    const http = createHttpMock();
    const module = new BulkModule(http);

    await expect(
      module.initWrite({
        operation: 'insert',
        module: 'Leads',
        fileId: 'file-1',
        fieldMappings: 'invalid' as unknown as []
      })
    ).rejects.toBeInstanceOf(Error);
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

  it('throws when bulk read job id is missing', async () => {
    const bulk = {
      initRead: vi.fn().mockResolvedValue({ state: 'COMPLETED' } as BulkReadJobStatus),
      getReadStatus: vi.fn(),
      downloadReadResult: vi.fn()
    } as unknown as BulkModule;

    const iterator = iterateBulkRead<{ id: number }>(bulk, { module: 'Leads' });
    await expect(iterator.next()).rejects.toBeInstanceOf(Error);
  });
});

async function* asyncIterableFromLines(lines: string[]): AsyncIterable<string> {
  for (const line of lines) {
    yield line;
  }
}
