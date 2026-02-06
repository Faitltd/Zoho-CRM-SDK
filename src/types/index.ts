export type { ZohoRecord, PaginationInfo, ZohoApiError } from './shared';

export { LEAD_FIELD_MAP } from './leads';
export type { Lead, CreateLead, UpdateLead } from './leads';

export { CONTACT_FIELD_MAP } from './contacts';
export type { Contact, CreateContact, UpdateContact } from './contacts';

export { DEAL_FIELD_MAP } from './deals';
export type { Deal, CreateDeal, UpdateDeal } from './deals';

export { WEBHOOK_FIELD_MAP } from './webhooks';
export type { WebhookConfig, WebhookResponse } from './webhooks';

export type {
  BulkCallback,
  BulkReadJobConfig,
  BulkReadJobStatus,
  BulkWriteFieldMapping,
  BulkWriteJobConfig,
  BulkWriteJobStatus
} from './bulk';

export type {
  LegacyLead,
  LegacyContact,
  LegacyDeal,
  CompatibleLead,
  CompatibleContact,
  CompatibleDeal,
  FieldNames,
  PartialUpdate,
  ZohoRecordEnvelope,
  ZohoRecordUnion
} from './utils';
