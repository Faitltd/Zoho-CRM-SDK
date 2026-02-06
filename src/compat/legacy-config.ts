import { ZohoAuth } from '../auth/zoho-auth';
import type { ZohoOAuthConfig, ZohoRegion } from '../auth/types';
import type { Logger } from '../logger';

export type LegacyZohoCRMConfig = {
  // Legacy auth format (snake_case)
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  // Alternate legacy format (camelCase)
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  // Very old alias (treated as refresh token)
  api_key?: string;
  region?: ZohoRegion;
  useLegacyFieldNames?: boolean;
};

export type NormalizedLegacyConfig<T> = {
  config: T;
  legacyDetected: boolean;
  warnings: string[];
};

export function normalizeLegacyConfig<T extends { auth?: ZohoAuth; region: ZohoRegion }>(
  config: T | (Omit<T, 'auth' | 'region'> & LegacyZohoCRMConfig),
  logger?: Logger
): NormalizedLegacyConfig<T> {
  if ('auth' in config && config.auth instanceof ZohoAuth) {
    return { config: config as T, legacyDetected: false, warnings: [] };
  }

  const warnings: string[] = [];
  const region = (config as LegacyZohoCRMConfig).region ?? 'US';
  const clientId = (config as LegacyZohoCRMConfig).clientId ?? (config as LegacyZohoCRMConfig).client_id;
  const clientSecret =
    (config as LegacyZohoCRMConfig).clientSecret ?? (config as LegacyZohoCRMConfig).client_secret;
  let refreshToken =
    (config as LegacyZohoCRMConfig).refreshToken ?? (config as LegacyZohoCRMConfig).refresh_token;

  if (!refreshToken && (config as LegacyZohoCRMConfig).api_key) {
    refreshToken = (config as LegacyZohoCRMConfig).api_key;
    warnings.push('Using deprecated api_key for authentication. Use refreshToken instead.');
  }

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Legacy config detected but required OAuth fields are missing.');
  }

  const authConfig: ZohoOAuthConfig = {
    clientId,
    clientSecret,
    refreshToken,
    region
  };

  const auth = new ZohoAuth(authConfig);
  const normalized = {
    ...(config as object),
    region,
    auth
  } as T;

  warnings.push('Using deprecated v1 config format. See migration guide.');

  if (logger?.warn) {
    warnings.forEach((warning) => logger.warn?.(warning));
  }

  return { config: normalized, legacyDetected: true, warnings };
}
