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

export class BaseModule<TRecord, TCreate, TUpdate> {
  protected readonly http: HttpClient;
  protected readonly moduleName: string;
  protected readonly recordSchema?: Schema<TRecord>;
  protected readonly dataResponseSchema?: Schema<ZohoListResponse<TRecord>>;
  protected readonly actionResponseSchema: Schema<unknown> = ZohoActionResponseSchema;

  constructor(http: HttpClient, moduleName: string, recordSchema?: Schema<TRecord>) {
    this.http = http;
    assertPathSegment(moduleName, 'moduleName');
    this.moduleName = moduleName;
    this.recordSchema = recordSchema;
    this.dataResponseSchema = recordSchema
      ? (ZohoDataResponseSchema(recordSchema) as Schema<ZohoListResponse<TRecord>>)
      : undefined;
  }

  async list(options?: ListOptions): Promise<TRecord[]> {
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

    return response.data.data ?? [];
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

    return record;
  }

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

    return record;
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

    return record;
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
