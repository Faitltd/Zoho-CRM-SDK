import type { HttpClient } from '../http/http-client';
import { NotFoundError } from '../http/errors';
import { ZohoActionResponseSchema, ZohoDataResponseSchema, type Schema } from '../validation';
import { assertNonEmptyObject, assertOptionalStringArray, assertPathSegment } from '../utils/input-validation';

export interface ListOptions {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  fields?: string[];
}

export interface GetOptions {
  fields?: string[];
}

type ZohoListResponse<T> = {
  data?: T[];
};

export type RecordTransformer<TRecord> = (record: TRecord) => TRecord;

export class BaseModule<TRecord, TCreate, TUpdate> {
  protected readonly http: HttpClient;
  protected readonly moduleName: string;
  protected readonly recordSchema?: Schema<TRecord>;
  protected readonly dataResponseSchema?: Schema<ZohoListResponse<TRecord>>;
  protected readonly actionResponseSchema: Schema<unknown> = ZohoActionResponseSchema;
  protected readonly transformRecord?: RecordTransformer<TRecord>;

  constructor(
    http: HttpClient,
    moduleName: string,
    recordSchema?: Schema<TRecord>,
    transformRecord?: RecordTransformer<TRecord>
  ) {
    this.http = http;
    assertPathSegment(moduleName, 'moduleName');
    this.moduleName = moduleName;
    this.recordSchema = recordSchema;
    this.transformRecord = transformRecord;
    this.dataResponseSchema = recordSchema
      ? (ZohoDataResponseSchema(recordSchema) as Schema<ZohoListResponse<TRecord>>)
      : undefined;
  }

  async list(): Promise<TRecord[]>;
  async list(page: number, perPage?: number): Promise<TRecord[]>;
  async list(options?: ListOptions): Promise<TRecord[]>;
  async list(pageOrOptions?: number | ListOptions, perPage?: number): Promise<TRecord[]> {
    const options =
      typeof pageOrOptions === 'number'
        ? { page: pageOrOptions, perPage }
        : (pageOrOptions ?? undefined);
    // Map ergonomic options to Zoho's expected query parameter names.
    if (options?.fields) {
      assertOptionalStringArray(options.fields, 'fields');
    }
    const params = options
      ? {
          page: options.page,
          per_page: options.perPage,
          sort_by: options.sortBy,
          sort_order: options.sortOrder,
          fields: options.fields?.join(',')
        }
      : undefined;

    const response = await this.http.get<ZohoListResponse<TRecord>>(
      this.modulePath(),
      params,
      undefined,
      this.dataResponseSchema
    );

    const records = response.data.data ?? [];
    const transformer = this.transformRecord;
    if (transformer) {
      return records.map((record) => transformer(record));
    }
    return records;
  }

  async get(id: string, options?: GetOptions): Promise<TRecord> {
    assertPathSegment(id, 'id');
    if (options?.fields) {
      assertOptionalStringArray(options.fields, 'fields');
    }
    const response = await this.http.get<ZohoListResponse<TRecord>>(
      this.recordPath(id),
      options?.fields ? { fields: options.fields.join(',') } : undefined,
      undefined,
      this.dataResponseSchema
    );
    const record = response.data.data?.[0];

    if (!record) {
      // Zoho sometimes returns an empty data array instead of a 404.
      throw new NotFoundError('Record not found.', {
        statusCode: 404,
        resource: this.moduleName,
        id
      });
    }

    return this.transformRecord ? this.transformRecord(record) : record;
  }

  /**
   * Create a record in the module.
   *
   * @stability stable
   * @since 0.1.0
   */
  async create(payload: TCreate): Promise<TRecord> {
    assertNonEmptyObject(payload, 'payload');
    // Zoho expects create payloads to be wrapped in a top-level data array.
    const response = await this.http.post<ZohoListResponse<TRecord>>(
      this.modulePath(),
      { data: [payload] },
      undefined,
      this.dataResponseSchema
    );

    const record = response.data.data?.[0];
    if (!record) {
      throw new Error(`Zoho create response for ${this.moduleName} was missing data.`);
    }

    return this.transformRecord ? this.transformRecord(record) : record;
  }

  async update(id: string, payload: TUpdate): Promise<TRecord> {
    assertPathSegment(id, 'id');
    assertNonEmptyObject(payload, 'payload');
    // Zoho expects update payloads to be wrapped in a top-level data array.
    const response = await this.http.put<ZohoListResponse<TRecord>>(
      this.recordPath(id),
      { data: [payload] },
      undefined,
      this.dataResponseSchema
    );

    const record = response.data.data?.[0];
    if (!record) {
      throw new Error(`Zoho update response for ${this.moduleName} was missing data.`);
    }

    return this.transformRecord ? this.transformRecord(record) : record;
  }

  async delete(id: string): Promise<void> {
    assertPathSegment(id, 'id');
    await this.http.delete<unknown>(
      this.recordPath(id),
      undefined,
      undefined,
      this.actionResponseSchema
    );
  }

  protected modulePath(): string {
    return `/crm/v2/${encodeURIComponent(this.moduleName)}`;
  }

  protected recordPath(id: string): string {
    return `${this.modulePath()}/${encodeURIComponent(id)}`;
  }
}
