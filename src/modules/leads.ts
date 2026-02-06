import type { HttpClient } from '../http/http-client';
import type { CreateLead, Lead, UpdateLead } from '../types/leads';
import { LeadSchema } from '../validation';
import { BaseModule } from './base';
import { createRecordTransformer, type FieldNameStyle } from '../utils/field-mapping';
import { LEAD_FIELD_MAP } from '../types/leads';
import { LeadQueryBuilder, LeadSearch, type LeadSearchOptions } from './leads-query';
import { warnDeprecated } from '../deprecation';

/**
 * Leads module (stable).
 *
 * @stability stable
 * @since 0.1.0
 */
export interface LeadsModuleOptions {
  fieldNameStyle?: FieldNameStyle;
  useLegacyMethods?: boolean;
  supportsAdvancedFilters?: boolean;
}

export class LeadsModule extends BaseModule<Lead, CreateLead, UpdateLead> {
  /**
   * Namespaced search helpers.
   *
   * @stability beta
   * @since 0.2.0
   */
  readonly search: LeadSearch;

  private readonly supportsAdvancedFilters: boolean;

  constructor(http: HttpClient, options?: LeadsModuleOptions) {
    const fieldNameStyle = options?.fieldNameStyle ?? 'raw';
    const transformer =
      fieldNameStyle === 'camel'
        ? createRecordTransformer<Lead>(LEAD_FIELD_MAP, fieldNameStyle)
        : undefined;
    super(http, 'Leads', LeadSchema, transformer);
    this.search = new LeadSearch(this.http, 'Leads', LeadSchema, transformer);
    this.supportsAdvancedFilters = options?.supportsAdvancedFilters ?? false;
  }

  /**
   * Start a builder-style search query.
   *
   * @stability beta
   * @since 0.2.0
   */
  query(options?: LeadSearchOptions): LeadQueryBuilder {
    const builder = new LeadQueryBuilder(
      this.http,
      'Leads',
      LeadSchema,
      this.transformRecord
    );
    return builder.applyOptions(options);
  }

  /**
   * Legacy v1 method name. Deprecated.
   *
   * @deprecated Use `create()` instead. Will be removed in v3.0.0.
   */
  async createLead(payload: CreateLead): Promise<Lead> {
    warnDeprecated({
      feature: 'LeadsModule.createLead',
      message: 'Legacy v1 method name is deprecated.',
      alternative: 'LeadsModule.create',
      removalVersion: '3.0.0'
    });
    return this.create(payload);
  }

  /**
   * Legacy v1 method name. Deprecated.
   *
   * @deprecated Use `get()` instead. Will be removed in v3.0.0.
   */
  async getLead(id: string): Promise<Lead> {
    warnDeprecated({
      feature: 'LeadsModule.getLead',
      message: 'Legacy v1 method name is deprecated.',
      alternative: 'LeadsModule.get',
      removalVersion: '3.0.0'
    });
    return this.get(id);
  }

  /**
   * Legacy v1 method name. Deprecated.
   *
   * @deprecated Use `list()` instead. Will be removed in v3.0.0.
   */
  async listLeads(page?: number, perPage?: number): Promise<Lead[]> {
    warnDeprecated({
      feature: 'LeadsModule.listLeads',
      message: 'Legacy v1 method name is deprecated.',
      alternative: 'LeadsModule.list',
      removalVersion: '3.0.0'
    });
    return this.list(page ?? 1, perPage);
  }

  /**
   * Legacy v1 method name. Deprecated.
   *
   * @deprecated Use `update()` instead. Will be removed in v3.0.0.
   */
  async updateLead(id: string, payload: UpdateLead): Promise<Lead> {
    warnDeprecated({
      feature: 'LeadsModule.updateLead',
      message: 'Legacy v1 method name is deprecated.',
      alternative: 'LeadsModule.update',
      removalVersion: '3.0.0'
    });
    return this.update(id, payload);
  }

  /**
   * Legacy v1 method name. Deprecated.
   *
   * @deprecated Use `delete()` instead. Will be removed in v3.0.0.
   */
  async deleteLead(id: string): Promise<void> {
    warnDeprecated({
      feature: 'LeadsModule.deleteLead',
      message: 'Legacy v1 method name is deprecated.',
      alternative: 'LeadsModule.delete',
      removalVersion: '3.0.0'
    });
    return this.delete(id);
  }

  /**
   * Advanced filter search with graceful fallback to list().
   *
   * @stability beta
   * @since 0.2.0
   */
  async listWithAdvancedFilters(options: LeadSearchOptions): Promise<Lead[]> {
    if (!this.supportsAdvancedFilters) {
      console.warn(
        'Advanced filters not supported by this account. Falling back to basic list().'
      );
      return this.list(options);
    }

    return this.query(options).execute();
  }
}
