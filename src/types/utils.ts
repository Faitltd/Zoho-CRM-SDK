import type { Lead } from './leads';
import type { Contact } from './contacts';
import type { Deal } from './deals';

/** Legacy snake_case Lead shape (v1 compatibility). */
export interface LegacyLead {
  id: string;
  first_name?: string;
  last_name?: string;
  lead_status?: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  [key: string]: unknown;
}

/** Legacy snake_case Contact shape (v1 compatibility). */
export interface LegacyContact {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  [key: string]: unknown;
}

/** Legacy snake_case Deal shape (v1 compatibility). */
export interface LegacyDeal {
  id: string;
  deal_name?: string;
  stage?: string;
  amount?: number;
  closing_date?: string;
  [key: string]: unknown;
}

export type CompatibleLead<UseLegacy extends boolean = false> = UseLegacy extends true ? LegacyLead : Lead;
export type CompatibleContact<UseLegacy extends boolean = false> = UseLegacy extends true ? LegacyContact : Contact;
export type CompatibleDeal<UseLegacy extends boolean = false> = UseLegacy extends true ? LegacyDeal : Deal;

export type FieldNames<T> = keyof T;
export type PartialUpdate<T> = Partial<T>;

export type ZohoRecordEnvelope<TModule extends string, TData> = {
  module: TModule;
  data: TData;
};

export type ZohoRecordUnion =
  | ZohoRecordEnvelope<'Leads', Lead>
  | ZohoRecordEnvelope<'Contacts', Contact>
  | ZohoRecordEnvelope<'Deals', Deal>;
