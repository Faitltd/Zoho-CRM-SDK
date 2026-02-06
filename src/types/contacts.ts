import type { ZohoRecord } from './shared';

// Maps ergonomic camelCase properties to Zoho API field names.
export const CONTACT_FIELD_MAP = {
  id: 'id',
  firstName: 'First_Name',
  lastName: 'Last_Name',
  email: 'Email',
  phone: 'Phone',
  mobile: 'Mobile',
  accountName: 'Account_Name',
  createdAt: 'Created_Time',
  modifiedAt: 'Modified_Time'
} as const;

export interface Contact extends ZohoRecord {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  accountName?: string;
  createdAt?: string;
  modifiedAt?: string;
  [key: string]: unknown;
}

export interface CreateContact {
  lastName: string;
  firstName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  accountName?: string;
  [key: string]: unknown;
}

export interface UpdateContact {
  lastName?: string;
  firstName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  accountName?: string;
  [key: string]: unknown;
}
