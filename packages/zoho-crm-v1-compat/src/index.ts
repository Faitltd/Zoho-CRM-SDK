import type { ZohoCRM } from '@yourcompany/zoho-crm';
import { warnDeprecated } from '@yourcompany/zoho-crm';

export type V1LeadPayload = Record<string, unknown> & {
  first_name?: string;
  last_name?: string;
  lead_status?: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
};

export interface V1Adapter {
  createLead(payload: V1LeadPayload): Promise<unknown>;
  getLead(id: string): Promise<unknown>;
  listLeads(options?: { page?: number; per_page?: number; sort_by?: string; sort_order?: 'asc' | 'desc' }): Promise<unknown[]>;
  updateLead(id: string, payload: V1LeadPayload): Promise<unknown>;
  deleteLead(id: string): Promise<void>;
}

export function createV1Adapter(crm: ZohoCRM): V1Adapter {
  return {
    async createLead(payload: V1LeadPayload) {
      warnDeprecated({
        feature: 'createLead',
        message: 'v1 lead helpers are deprecated.',
        alternative: 'crm.leads.create',
        removalVersion: '3.0.0'
      });
      return crm.leads.create(mapLeadPayload(payload));
    },
    async getLead(id: string) {
      warnDeprecated({
        feature: 'getLead',
        message: 'v1 lead helpers are deprecated.',
        alternative: 'crm.leads.get',
        removalVersion: '3.0.0'
      });
      return crm.leads.get(id);
    },
    async listLeads(options) {
      warnDeprecated({
        feature: 'listLeads',
        message: 'v1 lead helpers are deprecated.',
        alternative: 'crm.leads.list',
        removalVersion: '3.0.0'
      });
      return crm.leads.list({
        page: options?.page,
        perPage: options?.per_page,
        sortBy: options?.sort_by,
        sortOrder: options?.sort_order
      });
    },
    async updateLead(id: string, payload: V1LeadPayload) {
      warnDeprecated({
        feature: 'updateLead',
        message: 'v1 lead helpers are deprecated.',
        alternative: 'crm.leads.update',
        removalVersion: '3.0.0'
      });
      return crm.leads.update(id, mapLeadPayload(payload));
    },
    async deleteLead(id: string) {
      warnDeprecated({
        feature: 'deleteLead',
        message: 'v1 lead helpers are deprecated.',
        alternative: 'crm.leads.delete',
        removalVersion: '3.0.0'
      });
      await crm.leads.delete(id);
    }
  };
}

function mapLeadPayload(payload: V1LeadPayload): Record<string, unknown> {
  const mapped: Record<string, unknown> = { ...payload };
  if ('first_name' in mapped) {
    mapped.firstName = mapped.first_name;
    delete mapped.first_name;
  }
  if ('last_name' in mapped) {
    mapped.lastName = mapped.last_name;
    delete mapped.last_name;
  }
  if ('lead_status' in mapped) {
    mapped.leadStatus = mapped.lead_status;
    delete mapped.lead_status;
  }
  return mapped;
}
