import type { ZohoRecord } from './shared';

// Maps ergonomic camelCase properties to Zoho API field names.
export const LEAD_FIELD_MAP = {
  id: 'id',
  firstName: 'First_Name',
  lastName: 'Last_Name',
  company: 'Company',
  email: 'Email',
  phone: 'Phone',
  mobile: 'Mobile',
  leadStatus: 'Lead_Status',
  city: 'City',
  state: 'State',
  country: 'Country',
  createdAt: 'Created_Time',
  modifiedAt: 'Modified_Time'
} as const;

export interface Lead extends ZohoRecord {
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  leadStatus?: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt?: string;
  modifiedAt?: string;
  [key: string]: unknown;
}

export interface CreateLead {
  lastName: string;
  company: string;
  firstName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  leadStatus?: string;
  city?: string;
  state?: string;
  country?: string;
  [key: string]: unknown;
}

export interface UpdateLead {
  lastName?: string;
  company?: string;
  firstName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  leadStatus?: string;
  city?: string;
  state?: string;
  country?: string;
  [key: string]: unknown;
}
