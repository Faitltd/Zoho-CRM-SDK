import type { HttpClient } from '../http/http-client';
import { InputValidationError } from '../http/errors';
import { ZohoDataResponseSchema, type Schema } from '../validation';
import { assertNonEmptyString } from '../utils/input-validation';
import type { Lead } from '../types/leads';

export interface LeadSearchOptions {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  fields?: string[];
}

type ZohoListResponse<T> = {
  data?: T[];
};

type CriteriaClause = {
  field: string;
  operator: string;
  value: unknown;
};

/**
 * Builder for Zoho CRM search queries.
 *
 * @stability beta
 * @since 0.2.0
 */
export class LeadQueryBuilder {
  private readonly http: HttpClient;
  private readonly moduleName: string;
  private readonly responseSchema?: Schema<ZohoListResponse<Lead>>;
  private readonly clauses: CriteriaClause[] = [];
  private rawCriteria?: string;
  private selectedFields?: string[];
  private sortBy?: string;
  private sortOrder?: 'asc' | 'desc';
  private page?: number;
  private perPage?: number;

  constructor(http: HttpClient, moduleName = 'Leads', schema?: Schema<Lead>) {
    this.http = http;
    this.moduleName = moduleName;
    this.responseSchema = schema ? (ZohoDataResponseSchema(schema) as Schema<ZohoListResponse<Lead>>) : undefined;
  }

  /**
   * Add a criteria clause, joined with AND.
   */
  where(field: string, operator: string, value: unknown): this {
    assertNonEmptyString(field, 'field');
    assertNonEmptyString(operator, 'operator');
    this.clauses.push({ field, operator, value });
    return this;
  }

  /**
   * Provide a raw Zoho criteria string for advanced use cases.
   */
  whereRaw(criteria: string): this {
    assertNonEmptyString(criteria, 'criteria');
    this.rawCriteria = criteria;
    return this;
  }

  /**
   * Select fields to return.
   */
  select(fields: string[]): this {
    this.selectedFields = fields;
    return this;
  }

  /**
   * Set sorting for the query.
   */
  orderBy(field: string, direction: 'asc' | 'desc'): this {
    assertNonEmptyString(field, 'field');
    this.sortBy = field;
    this.sortOrder = direction;
    return this;
  }

  /**
   * Set page number for pagination.
   */
  pageNumber(page: number): this {
    this.page = page;
    return this;
  }

  /**
   * Set number of records per page.
   */
  perPageCount(perPage: number): this {
    this.perPage = perPage;
    return this;
  }

  /**
   * Set a limit (mapped to per_page in Zoho search endpoints).
   */
  limit(perPage: number): this {
    this.perPage = perPage;
    return this;
  }

  /**
   * Apply standard search options in one call.
   */
  applyOptions(options?: LeadSearchOptions): this {
    if (!options) {
      return this;
    }
    if (options.fields) {
      this.select(options.fields);
    }
    if (options.sortBy && options.sortOrder) {
      this.orderBy(options.sortBy, options.sortOrder);
    } else if (options.sortBy) {
      this.sortBy = options.sortBy;
    }
    if (options.page) {
      this.page = options.page;
    }
    if (options.perPage) {
      this.perPage = options.perPage;
    }
    return this;
  }

  /**
   * Execute the query and return matching leads.
   */
  async execute(): Promise<Lead[]> {
    const criteria = this.rawCriteria ?? this.buildCriteria();
    if (!criteria) {
      throw new InputValidationError('Lead search requires at least one criteria clause.');
    }

    const response = await this.http.get<ZohoListResponse<Lead>>(
      `/crm/v2/${this.moduleName}/search`,
      {
        criteria,
        fields: this.selectedFields ? this.selectedFields.join(',') : undefined,
        sort_by: this.sortBy,
        sort_order: this.sortOrder,
        page: this.page,
        per_page: this.perPage
      },
      undefined,
      this.responseSchema
    );

    return response.data.data ?? [];
  }

  private buildCriteria(): string | undefined {
    if (this.clauses.length === 0) {
      return undefined;
    }

    return this.clauses
      .map((clause) => `(${clause.field}:${clause.operator}:${escapeCriteriaValue(clause.value)})`)
      .join('and');
  }
}

/**
 * Namespaced search helpers for Leads.
 *
 * @stability beta
 * @since 0.2.0
 */
export class LeadSearch {
  private readonly http: HttpClient;
  private readonly moduleName: string;
  private readonly schema?: Schema<Lead>;

  constructor(http: HttpClient, moduleName = 'Leads', schema?: Schema<Lead>) {
    this.http = http;
    this.moduleName = moduleName;
    this.schema = schema;
  }

  byEmail(email: string, options?: LeadSearchOptions): Promise<Lead[]> {
    assertNonEmptyString(email, 'email');
    const builder = new LeadQueryBuilder(this.http, this.moduleName, this.schema)
      .where('Email', 'equals', email)
      .applyOptions(options);

    return builder.execute();
  }

  byPhone(phone: string, options?: LeadSearchOptions): Promise<Lead[]> {
    assertNonEmptyString(phone, 'phone');
    const builder = new LeadQueryBuilder(this.http, this.moduleName, this.schema)
      .where('Phone', 'equals', phone)
      .applyOptions(options);

    return builder.execute();
  }

  advanced(builder: LeadQueryBuilder): Promise<Lead[]> {
    return builder.execute();
  }
}

function escapeCriteriaValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.replace(/[():]/g, '\\$&');
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}
