import type { Logger, RedactionConfig } from '../logger';
import type { Metrics } from '../metrics';
import type { ValidationOptions } from '../validation';
import type { ProfilerOptions } from '../profiling';

export type ZohoRegion = 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP';

export interface AccessToken {
  token: string;
  expiresAt: number; // epoch ms
  type: string;
}

export interface ZohoOAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  region: ZohoRegion;
  // Hook for persisting refreshed tokens to your own store.
  onTokenRefresh?: (token: AccessToken, raw: ZohoTokenResponse, cacheKey?: string) => void | Promise<void>;
  // Hook for hydrating a token from your own store when cache is empty or expired.
  onTokenRetrieve?: (cacheKey?: string) => AccessToken | null | undefined | Promise<AccessToken | null | undefined>;
  // Optional logger for auth flow.
  logger?: Logger;
  // Optional redaction rules for auth logs.
  logRedaction?: RedactionConfig;
  // Optional metrics sink for auth events.
  metrics?: Metrics;
  // Optional runtime validation settings for OAuth responses.
  validation?: ValidationOptions;
  // Optional profiler for auth timings.
  profiler?: ProfilerOptions;
  // Optional max size for in-memory token cache (defaults to 1).
  maxCachedTokens?: number;
  // Optional timeout for OAuth token refresh calls.
  requestTimeoutMs?: number;
}

export interface ZohoTokenResponse {
  access_token: string;
  expires_in: number; // seconds
  token_type?: string;
  api_domain?: string;
  refresh_token?: string;
}

export interface ZohoOAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}
