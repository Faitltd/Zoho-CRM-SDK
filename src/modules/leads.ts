import type { HttpClient } from '../http/http-client';
import type { CreateLead, Lead, UpdateLead } from '../types/leads';
import { LeadSchema } from '../validation';
import { BaseModule, type ListOptions } from './base';
import { LeadQueryBuilder, LeadSearch, type LeadSearchOptions } from './leads-query';

/**
 * Leads module (stable).
 *
 * @stability stable
 * @since 0.1.0
 */
export class LeadsModule extends BaseModule<Lead, CreateLead, UpdateLead> {
  /**
   * Namespaced search helpers.
   *
   * @stability beta
   * @since 0.2.0
   */
  readonly search: LeadSearch;

  constructor(http: HttpClient) {
    super(http, 'Leads', LeadSchema);
    this.search = new LeadSearch(this.http, 'Leads', LeadSchema);
  }

  /**
   * List leads with optional pagination and sorting.
   *
   * @stability stable
   * @since 0.1.0
   *
   * @example
   * ```ts
   * const leads = await crm.leads.list({ page: 1, perPage: 10 });
   * ```
   */
  override list(options?: ListOptions): Promise<Lead[]> {
    return super.list(options);
  }

  /**
   * Start a builder-style search query.
   *
   * @stability beta
   * @since 0.2.0
   */
  query(options?: LeadSearchOptions): LeadQueryBuilder {
    const builder = new LeadQueryBuilder(this.http, 'Leads', LeadSchema);
    return builder.applyOptions(options);
  }
}
