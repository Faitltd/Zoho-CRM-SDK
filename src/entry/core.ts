export { ZohoAuth } from '../auth/zoho-auth';
export type { AccessToken, ZohoOAuthConfig, ZohoOAuthError, ZohoRegion, ZohoTokenResponse } from '../auth/types';
export { HttpClient } from '../http/http-client';
export {
  ZohoError,
  ApiError,
  AuthError,
  NotFoundError,
  RateLimitError,
  RequestError,
  ValidationError,
  InputValidationError,
  SchemaMismatchError,
  ResourceLimitError,
  ClientClosedError
} from '../http/errors';
export type { ApiResponse, RawResponse, HttpMethod, RequestConfig, RetryConfig, HttpClientOptions } from '../http/types';
export { RateLimiter } from '../rate-limiter';
export type { RateLimiterOptions } from '../rate-limiter';
export type { Logger, RedactionConfig } from '../logger';
export type { Metrics } from '../metrics';
export type { AuditConfig, AuditEvent, AuditLogger, AuditRedactionConfig } from '../audit';
export { createJsonAuditLogger } from '../audit';
export type { DeprecationConfig, DeprecationWarning } from '../deprecation';
export { configureDeprecations, warnDeprecated } from '../deprecation';
export type { ExperimentalFeatures, FeatureFlags } from '../feature-flags';
export type {
  ZohoCRMPlugin,
  ZohoCRMPluginHooks,
  BeforeRequestHook,
  AfterResponseHook,
  ErrorHook,
  TokenRefreshHook,
  PluginResponseOverride
} from '../plugins';
export { PluginManager } from '../plugins';
export type { ValidationOptions, ValidationMode } from '../validation';
export type { ProfilerOptions, ProfileSpan } from '../profiling';
export type { StabilityLevel, StabilityInfo } from '../stability';
export { STABILITY, getStability } from '../stability';
export type { Telemetry, TelemetryEvent } from '../telemetry';
export { normalizeTelemetry, noopTelemetry } from '../telemetry';
export type { LegacyZohoCRMConfig, NormalizedLegacyConfig } from '../compat/legacy-config';
export { normalizeLegacyConfig } from '../compat/legacy-config';
export type { CompatibilityReport } from '../compat/compatibility';
export { buildCompatibilityReport } from '../compat/compatibility';
export { createDeprecatedProxy } from '../compat/deprecated-proxy';
