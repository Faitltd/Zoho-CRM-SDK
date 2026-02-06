// Bulk Read types (ergonomic camelCase names with Zoho API mapping in comments).
export interface BulkCallback {
  // url -> url
  url: string;
  // method -> method (Zoho expects lowercase string like "post")
  method?: 'post' | 'get';
}

export interface BulkReadJobConfig {
  // module -> query.module.api_name
  module: string;
  // criteria -> query.criteria
  criteria?: Record<string, unknown>;
  // fields -> query.fields
  fields?: string[];
  // page -> query.page
  page?: number;
  // perPage -> query.per_page
  perPage?: number;
  // callback -> callback
  callback?: BulkCallback;
  // fileType -> query.file_type
  fileType?: 'csv' | 'ics';
  [key: string]: unknown;
}

export interface BulkReadJobResultInfo {
  // downloadUrl -> result.download_url
  downloadUrl?: string;
  // page -> result.page
  page?: number;
  // moreRecords -> result.more_records
  moreRecords?: boolean;
  // fileType -> result.file_type
  fileType?: string;
  [key: string]: unknown;
}

export interface BulkReadJobStatus {
  // id -> id
  id?: string;
  // state -> state (e.g., IN PROGRESS, COMPLETED, FAILED)
  state?: string;
  // status -> status (some responses use status)
  status?: string;
  // query -> query
  query?: Record<string, unknown>;
  // result -> result
  result?: BulkReadJobResultInfo;
  // createdTime -> created_time
  createdTime?: string;
  // modifiedTime -> modified_time
  modifiedTime?: string;
  [key: string]: unknown;
}

// Bulk Write types.
export interface BulkWriteFieldMapping {
  // apiName -> api_name
  apiName: string;
  // index -> index (CSV column index)
  index?: number;
  // defaultValue -> default_value
  defaultValue?: string | number | boolean;
}

export interface BulkWriteJobConfig {
  // operation -> operation (insert/update/upsert/delete)
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  // module -> resource[0].module
  module: string;
  // fileId -> resource[0].file_id
  fileId: string;
  // callback -> callback
  callback?: BulkCallback;
  // fieldMappings -> resource[0].field_mappings
  fieldMappings?: BulkWriteFieldMapping[];
  // findBy -> resource[0].find_by (for upserts)
  findBy?: string;
  // ignoreEmpty -> resource[0].ignore_empty
  ignoreEmpty?: boolean;
  // characterEncoding -> character_encoding
  characterEncoding?: string;
  [key: string]: unknown;
}

export interface BulkWriteJobResultInfo {
  // downloadUrl -> result.download_url
  downloadUrl?: string;
  [key: string]: unknown;
}

export interface BulkWriteJobStatus {
  // id -> id
  id?: string;
  // status -> status (ADDED, IN PROGRESS, COMPLETED, FAILED)
  status?: string;
  // operation -> operation
  operation?: string;
  // result -> result
  result?: BulkWriteJobResultInfo;
  // createdTime -> created_time
  createdTime?: string;
  // resource -> resource
  resource?: Record<string, unknown>;
  [key: string]: unknown;
}
