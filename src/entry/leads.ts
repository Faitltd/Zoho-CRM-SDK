import type { BaseClientConfig } from './base-client';
import { BaseClient } from './base-client';
import { LeadsModule } from '../modules/leads';

export class ZohoCRM extends BaseClient {
  readonly leads: LeadsModule;

  constructor(config: BaseClientConfig) {
    super(config);
    this.leads = new LeadsModule(this.http);
  }
}

export { LeadsModule } from '../modules/leads';
export { LeadQueryBuilder, LeadSearch } from '../modules/leads-query';
export type { LeadSearchOptions } from '../modules/leads-query';
export type { Lead, CreateLead, UpdateLead } from '../types/leads';
export type { BaseClientConfig as ZohoCRMConfig } from './base-client';
