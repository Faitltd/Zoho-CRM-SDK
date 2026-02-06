export interface ZohoRecord {
  id: string;
  // Allow consumers to pass through custom or unmapped Zoho fields.
  [key: string]: unknown;
}

export interface PaginationInfo {
  page?: number;
  perPage?: number;
  moreRecords?: boolean;
  nextPageToken?: string;
}

export interface ZohoApiError {
  code: string;
  message: string;
  status: string;
  details?: Record<string, unknown>;
}
