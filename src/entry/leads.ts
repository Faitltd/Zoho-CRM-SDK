import type { BaseClientInitConfig } from './base-client';
import { BaseClient } from './base-client';
import { LeadsModule } from '../modules/leads';
import { getFeatureFlag } from '../feature-flags';
import { createDeprecatedProxy } from '../compat/deprecated-proxy';

export class ZohoCRM extends BaseClient {
  readonly leads: LeadsModule;

  constructor(config: BaseClientInitConfig) {
    super(config);
    const leadsModule = new LeadsModule(this.http, {
      fieldNameStyle: this.fieldNameStyle,
      useLegacyMethods: getFeatureFlag(this.featureFlags, 'useLegacyMethods', true),
      supportsAdvancedFilters: getFeatureFlag(this.featureFlags, 'advancedFilters')
    });
    this.leads = getFeatureFlag(this.featureFlags, 'useLegacyMethods', true)
      ? createDeprecatedProxy(leadsModule, {
          createLead: {
            target: 'create',
            message: 'createLead() is deprecated.',
            alternative: 'leads.create()',
            removalVersion: '3.0.0'
          },
          getLead: {
            target: 'get',
            message: 'getLead() is deprecated.',
            alternative: 'leads.get()',
            removalVersion: '3.0.0'
          },
          listLeads: {
            target: 'list',
            message: 'listLeads() is deprecated.',
            alternative: 'leads.list()',
            removalVersion: '3.0.0'
          },
          updateLead: {
            target: 'update',
            message: 'updateLead() is deprecated.',
            alternative: 'leads.update()',
            removalVersion: '3.0.0'
          },
          deleteLead: {
            target: 'delete',
            message: 'deleteLead() is deprecated.',
            alternative: 'leads.delete()',
            removalVersion: '3.0.0'
          }
        })
      : leadsModule;
  }
}

export { LeadsModule } from '../modules/leads';
export { LeadQueryBuilder, LeadSearch } from '../modules/leads-query';
export type { LeadSearchOptions } from '../modules/leads-query';
export type { Lead, CreateLead, UpdateLead } from '../types/leads';
export type { BaseClientInitConfig as ZohoCRMConfig } from './base-client';
