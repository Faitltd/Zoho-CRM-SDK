import type { HttpClient } from '../http/http-client';
import type { CreateLead, Lead, UpdateLead } from '../types/leads';
import { LeadSchema } from '../validation';
import { BaseModule, type ListOptions } from './base';

/**
 * Leads module (stable).
 *
 * @stability stable
 * @since 0.1.0
 */
export class LeadsModule extends BaseModule<Lead, CreateLead, UpdateLead> {
  constructor(http: HttpClient) {
    super(http, 'Leads', LeadSchema);
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
}
