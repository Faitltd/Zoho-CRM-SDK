import type { ZohoRecord } from './shared';

// Maps ergonomic camelCase properties to Zoho API field names.
export const DEAL_FIELD_MAP = {
  id: 'id',
  dealName: 'Deal_Name',
  stage: 'Stage',
  amount: 'Amount',
  closingDate: 'Closing_Date',
  accountName: 'Account_Name',
  contactName: 'Contact_Name',
  owner: 'Owner',
  createdAt: 'Created_Time',
  modifiedAt: 'Modified_Time'
} as const;

export interface Deal extends ZohoRecord {
  dealName?: string;
  stage?: string;
  amount?: number;
  closingDate?: string;
  accountName?: string;
  contactName?: string;
  owner?: string;
  createdAt?: string;
  modifiedAt?: string;
  [key: string]: unknown;
}

export interface CreateDeal {
  dealName: string;
  stage?: string;
  amount?: number;
  closingDate?: string;
  accountName?: string;
  contactName?: string;
  owner?: string;
  [key: string]: unknown;
}

export interface UpdateDeal {
  dealName?: string;
  stage?: string;
  amount?: number;
  closingDate?: string;
  accountName?: string;
  contactName?: string;
  owner?: string;
  [key: string]: unknown;
}
