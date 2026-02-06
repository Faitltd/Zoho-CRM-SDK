import { Readable } from 'node:stream';
import { InputValidationError, RequestError } from '../errors';
import type { HttpClient } from '../http/http-client';
import type { RawResponse } from '../http/types';
import type { RateLimiter } from '../rate-limiter';
import type {
  BulkReadJobConfig,
  BulkReadJobStatus,
  BulkWriteJobConfig,
  BulkWriteJobStatus
} from '../types/bulk';
import { BulkReadJobStatusSchema, BulkWriteJobStatusSchema, ZohoDataResponseSchema } from '../validation';
import {
  assertEnum,
  assertNonEmptyObject,
  assertNonEmptyString,
  assertOptionalBoolean,
  assertOptionalEnum,
  assertOptionalNumber,
  assertOptionalString,
  assertOptionalStringArray,
  assertPathSegment
} from '../utils/input-validation';

const BULK_READ_BASE_PATH = '/crm/bulk/v8/read';
const BULK_WRITE_BASE_PATH = '/crm/bulk/v8/write';
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const BULK_READ_RESPONSE_SCHEMA = ZohoDataResponseSchema(BulkReadJobStatusSchema);
const BULK_WRITE_RESPONSE_SCHEMA = ZohoDataResponseSchema(BulkWriteJobStatusSchema);

type BulkReadClient = Pick<BulkModule, 'initRead' | 'getReadStatus' | 'downloadReadResult'>;

export interface BulkReadIteratorOptions {
  pollIntervalMs?: number;
  maxWaitMs?: number;
}

export class BulkModule {
  private readonly http: HttpClient;
  private readonly downloadLimiter?: RateLimiter;

  constructor(http: HttpClient, downloadLimiter?: RateLimiter) {
    this.http = http;
    this.downloadLimiter = downloadLimiter;
  }

  async initRead(config: BulkReadJobConfig): Promise<BulkReadJobStatus> {
    validateBulkReadConfig(config);
    const payload = buildBulkReadPayload(config);
    const response = await this.http.post<Record<string, unknown>>(
      BULK_READ_BASE_PATH,
      payload,
      undefined,
      BULK_READ_RESPONSE_SCHEMA
    );
    return extractBulkJob<BulkReadJobStatus>(response.data);
  }

  async getReadStatus(jobId: string): Promise<BulkReadJobStatus> {
    assertPathSegment(jobId, 'jobId');
    const response = await this.http.get<Record<string, unknown>>(
      `${BULK_READ_BASE_PATH}/${encodeURIComponent(jobId)}`,
      undefined,
      undefined,
      BULK_READ_RESPONSE_SCHEMA
    );
    return extractBulkJob<BulkReadJobStatus>(response.data);
  }

  async downloadReadResult(jobId: string): Promise<NodeJS.ReadableStream | AsyncIterable<string>> {
    assertPathSegment(jobId, 'jobId');
    const path = `${BULK_READ_BASE_PATH}/${encodeURIComponent(jobId)}/result`;
    const execute = () => this.http.requestRaw({ method: 'GET', path });
    const response = this.downloadLimiter ? await this.downloadLimiter.schedule(execute) : await execute();

    return normalizeStream(response);
  }

  async initWrite(config: BulkWriteJobConfig): Promise<BulkWriteJobStatus> {
    validateBulkWriteConfig(config);
    const payload = buildBulkWritePayload(config);
    const response = await this.http.post<Record<string, unknown>>(
      BULK_WRITE_BASE_PATH,
      payload,
      undefined,
      BULK_WRITE_RESPONSE_SCHEMA
    );
    return extractBulkJob<BulkWriteJobStatus>(response.data);
  }

  async getWriteStatus(jobId: string): Promise<BulkWriteJobStatus> {
    assertPathSegment(jobId, 'jobId');
    const response = await this.http.get<Record<string, unknown>>(
      `${BULK_WRITE_BASE_PATH}/${encodeURIComponent(jobId)}`,
      undefined,
      undefined,
      BULK_WRITE_RESPONSE_SCHEMA
    );
    return extractBulkJob<BulkWriteJobStatus>(response.data);
  }
}

// Helper async iterator that yields parsed NDJSON records from a bulk read job.
// Note: Zoho bulk read results are typically zipped CSV. Use your own parser for CSV/ZIP
// if needed. This helper is intended for NDJSON-style exports or pre-processed text streams.
export async function* iterateBulkRead<T = unknown>(
  bulk: BulkReadClient,
  config: BulkReadJobConfig,
  options: BulkReadIteratorOptions = {}
): AsyncIterable<T> {
  const job = await bulk.initRead(config);
  const jobId = extractJobId(job);
  const pollInterval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxWaitMs = options.maxWaitMs;
  const startedAt = Date.now();

  let status = await bulk.getReadStatus(jobId);

  while (!isTerminalState(status)) {
    if (maxWaitMs !== undefined && Date.now() - startedAt > maxWaitMs) {
      throw new RequestError('Bulk read job polling timed out.', {
        statusCode: 408,
        rawResponse: status
      });
    }
    await sleep(pollInterval);
    status = await bulk.getReadStatus(jobId);
  }

  if (isFailureState(status)) {
    throw new RequestError('Bulk read job failed.', { statusCode: 500, rawResponse: status });
  }

  let more = hasMoreRecords(status);

  do {
    const stream = await bulk.downloadReadResult(jobId);
    for await (const record of parseNdjson<T>(stream)) {
      yield record;
    }

    if (!more) {
      break;
    }

    status = await bulk.getReadStatus(jobId);
    more = hasMoreRecords(status);
  } while (more);
}

function buildBulkReadPayload(config: BulkReadJobConfig): Record<string, unknown> {
  const query = stripUndefined({
    module: { api_name: config.module },
    criteria: config.criteria,
    fields: config.fields,
    page: config.page,
    per_page: config.perPage,
    file_type: config.fileType
  });

  return stripUndefined({
    callback: config.callback,
    query
  });
}

function buildBulkWritePayload(config: BulkWriteJobConfig): Record<string, unknown> {
  return stripUndefined({
    operation: config.operation,
    character_encoding: config.characterEncoding,
    callback: config.callback,
    resource: [
      stripUndefined({
        type: 'data',
        module: config.module,
        file_id: config.fileId,
        field_mappings: config.fieldMappings?.map((mapping) =>
          stripUndefined({
            api_name: mapping.apiName,
            index: mapping.index,
            default_value: mapping.defaultValue
          })
        ),
        find_by: config.findBy,
        ignore_empty: config.ignoreEmpty
      })
    ]
  });
}

function validateBulkReadConfig(config: BulkReadJobConfig): void {
  assertNonEmptyObject(config, 'bulkRead');
  assertNonEmptyString(config.module, 'module');
  assertOptionalStringArray(config.fields, 'fields');
  assertOptionalNumber(config.page, 'page');
  assertOptionalNumber(config.perPage, 'perPage');
  assertOptionalEnum(config.fileType, 'fileType', ['csv', 'ics']);
  if (config.criteria !== undefined) {
    assertNonEmptyObject(config.criteria, 'criteria');
  }
  if (config.callback !== undefined) {
    validateBulkCallback(config.callback);
  }
}

function validateBulkWriteConfig(config: BulkWriteJobConfig): void {
  assertNonEmptyObject(config, 'bulkWrite');
  assertEnum(config.operation, 'operation', ['insert', 'update', 'upsert', 'delete']);
  assertNonEmptyString(config.module, 'module');
  assertNonEmptyString(config.fileId, 'fileId');
  assertOptionalString(config.findBy, 'findBy');
  assertOptionalBoolean(config.ignoreEmpty, 'ignoreEmpty');
  assertOptionalString(config.characterEncoding, 'characterEncoding');
  if (config.callback !== undefined) {
    validateBulkCallback(config.callback);
  }
  if (config.fieldMappings !== undefined) {
    if (!Array.isArray(config.fieldMappings)) {
      throw new InputValidationError('fieldMappings must be an array.', {
        statusCode: 400,
        fieldErrors: { fieldMappings: ['Expected an array.'] }
      });
    }
    for (const [index, mapping] of config.fieldMappings.entries()) {
      assertNonEmptyObject(mapping, `fieldMappings[${index}]`);
      assertNonEmptyString(mapping.apiName, `fieldMappings[${index}].apiName`);
      assertOptionalNumber(mapping.index, `fieldMappings[${index}].index`);
    }
  }
}

function validateBulkCallback(callback: { url?: unknown; method?: unknown }): void {
  assertNonEmptyObject(callback, 'callback');
  assertNonEmptyString(callback.url, 'callback.url');
  assertOptionalEnum(callback.method, 'callback.method', ['post', 'get']);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) {
      continue;
    }
    output[key] = entry;
  }
  return output as T;
}

function extractBulkJob<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new RequestError('Bulk job response was empty.', { statusCode: 500, rawResponse: payload });
  }

  if ('data' in payload && Array.isArray((payload as { data?: unknown }).data)) {
    const [first] = (payload as { data?: unknown[] }).data ?? [];
    if (first) {
      return first as T;
    }
  }

  return payload as T;
}

function extractJobId(job: BulkReadJobStatus): string {
  const id = job.id ?? (job as { job_id?: string }).job_id;
  if (!id) {
    throw new RequestError('Bulk job response did not include a job id.', {
      statusCode: 500,
      rawResponse: job
    });
  }
  return id;
}

function isTerminalState(status: BulkReadJobStatus): boolean {
  const state = (status.state ?? status.status ?? '').toString().toUpperCase();
  return ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'CANCELLED'].includes(state);
}

function isFailureState(status: BulkReadJobStatus): boolean {
  const state = (status.state ?? status.status ?? '').toString().toUpperCase();
  return ['FAILED', 'CANCELLED'].includes(state);
}

function hasMoreRecords(status: BulkReadJobStatus): boolean {
  const result = status.result ?? (status as { result?: Record<string, unknown> }).result;
  if (!result) {
    return false;
  }

  const camel = (result as { moreRecords?: boolean }).moreRecords;
  const snake = (result as { more_records?: boolean }).more_records;
  const topCamel = (status as { moreRecords?: boolean }).moreRecords;
  const topSnake = (status as { more_records?: boolean }).more_records;

  return Boolean(camel ?? snake ?? topCamel ?? topSnake);
}

function normalizeStream(response: RawResponse): NodeJS.ReadableStream {
  const body = response.body as unknown;
  if (body instanceof Readable) {
    return body;
  }
  if (body && typeof (body as ReadableStream).getReader === 'function' && 'fromWeb' in Readable) {
    return (Readable as typeof Readable & { fromWeb: (stream: ReadableStream) => NodeJS.ReadableStream }).fromWeb(
      body as ReadableStream
    );
  }

  return Readable.from(body as AsyncIterable<Uint8Array>);
}

async function* parseNdjson<T>(
  source: NodeJS.ReadableStream | AsyncIterable<string>
): AsyncIterable<T> {
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of source as AsyncIterable<unknown>) {
    if (typeof chunk === 'string') {
      buffer += chunk;
    } else {
      buffer += decoder.decode(chunk as Uint8Array, { stream: true });
    }

    yield* flushLines<T>(buffer, (remaining) => {
      buffer = remaining;
    });
  }

  const final = buffer.trim();
  if (final) {
    yield JSON.parse(final) as T;
  }
}

function* flushLines<T>(buffer: string, setRemaining: (value: string) => void): Iterable<T> {
  const lines = buffer.split('\n');
  setRemaining(lines.pop() ?? '');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    yield JSON.parse(trimmed) as T;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
