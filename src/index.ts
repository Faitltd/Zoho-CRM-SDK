export { ZohoCRM } from './zoho-crm';
export type { ZohoCRMConfig } from './zoho-crm';

export { ZohoAuth } from './auth/zoho-auth';
export { AuthError } from './auth/auth-error';
export type { AccessToken, ZohoOAuthConfig, ZohoOAuthError, ZohoRegion, ZohoTokenResponse } from './auth/types';

export { HttpClient } from './http/http-client';
export {
  ZohoError,
  ApiError,
  NotFoundError,
  RateLimitError,
  RequestError,
  ValidationError,
  InputValidationError,
  SchemaMismatchError,
  ResourceLimitError,
  ClientClosedError
} from './http/errors';
export type { Logger, RedactionConfig } from './logger';
export type { Metrics } from './metrics';
export type { AuditConfig, AuditEvent, AuditLogger, AuditRedactionConfig } from './audit';
export { createJsonAuditLogger } from './audit';
export type { DeprecationConfig, DeprecationWarning } from './deprecation';
export { configureDeprecations, warnDeprecated } from './deprecation';
export type { ExperimentalFeatures } from './feature-flags';
export type {
  ZohoCRMPlugin,
  ZohoCRMPluginHooks,
  BeforeRequestHook,
  AfterResponseHook,
  ErrorHook,
  TokenRefreshHook,
  PluginResponseOverride
} from './plugins';
export { PluginManager } from './plugins';
export type {
  ApiResponse,
  RawResponse,
  HttpMethod,
  RequestConfig,
  RetryConfig,
  ConnectionPoolOptions,
  HttpClientOptions
} from './http/types';
export { RateLimiter } from './rate-limiter';
export type { RateLimiterOptions } from './rate-limiter';
export type { ValidationOptions, ValidationMode, ValidationIssue, UnknownFieldInfo, Schema } from './validation';
export {
  validateSchema,
  OAuthTokenResponseSchema,
  LeadSchema,
  ContactSchema,
  DealSchema,
  WebhookPayloadSchema
} from './validation';
export type { ProfilerOptions, ProfileSpan } from './profiling';
export type { StabilityLevel, StabilityInfo } from './stability';
export { STABILITY, getStability } from './stability';
export type { Telemetry, TelemetryEvent } from './telemetry';
export { normalizeTelemetry, noopTelemetry } from './telemetry';

export { BaseModule } from './modules/base';
export type { ListOptions, GetOptions } from './modules/base';
export { LeadsModule } from './modules/leads';
export { ContactsModule } from './modules/contacts';
export { DealsModule } from './modules/deals';
export { WebhooksModule } from './modules/webhooks';
export { generateWebhookSecret, signWebhookPayload, verifyWebhookSignature } from './webhooks/signature';
export { BulkModule, iterateBulkRead } from './modules/bulk';
export type { BulkReadIteratorOptions } from './modules/bulk';
export type { Lead, CreateLead, UpdateLead } from './types/leads';
export type { Contact, CreateContact, UpdateContact } from './types/contacts';
export type { Deal, CreateDeal, UpdateDeal } from './types/deals';
export type { WebhookConfig, WebhookResponse } from './types/webhooks';
export type {
  BulkCallback,
  BulkReadJobConfig,
  BulkReadJobStatus,
  BulkWriteFieldMapping,
  BulkWriteJobConfig,
  BulkWriteJobStatus
} from './types/bulk';
export type { ZohoRecord, PaginationInfo, ZohoApiError } from './types/shared';
export { LEAD_FIELD_MAP, CONTACT_FIELD_MAP, DEAL_FIELD_MAP, WEBHOOK_FIELD_MAP } from './types';
