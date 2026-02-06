import { normalizeLogger, noopLogger, type Logger } from './logger';

export interface DeprecationConfig {
  enabled?: boolean;
  emitOnce?: boolean;
  suppressEnvVar?: string;
}

export interface DeprecationWarning {
  feature: string;
  message: string;
  alternative?: string;
  removalVersion?: string;
  reason?: string;
}

const DEFAULT_ENV_VAR = 'ZOHO_CRM_SDK_SUPPRESS_DEPRECATION_WARNINGS';

let currentConfig: Required<DeprecationConfig> = {
  enabled: true,
  emitOnce: true,
  suppressEnvVar: DEFAULT_ENV_VAR
};
let currentLogger: Required<Logger> = noopLogger;
const warned = new Set<string>();

export function configureDeprecations(config?: DeprecationConfig, logger?: Logger): void {
  currentConfig = {
    enabled: config?.enabled ?? true,
    emitOnce: config?.emitOnce ?? true,
    suppressEnvVar: config?.suppressEnvVar ?? DEFAULT_ENV_VAR
  };
  currentLogger = normalizeLogger(logger ?? currentLogger);
}

function isSuppressed(): boolean {
  if (!currentConfig.enabled) {
    return true;
  }

  const envValue = process.env[currentConfig.suppressEnvVar];
  if (!envValue) {
    return false;
  }

  const normalized = envValue.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function warnDeprecated(details: DeprecationWarning): void {
  if (isSuppressed()) {
    return;
  }

  const key = `${details.feature}:${details.removalVersion ?? ''}`;
  if (currentConfig.emitOnce && warned.has(key)) {
    return;
  }

  warned.add(key);

  const meta: Record<string, unknown> = {
    feature: details.feature,
    reason: details.reason,
    alternative: details.alternative,
    removalVersion: details.removalVersion
  };

  const message = [
    `Deprecated: ${details.feature}.`,
    details.message,
    details.alternative ? `Use ${details.alternative} instead.` : undefined,
    details.removalVersion ? `Removal target: ${details.removalVersion}.` : undefined
  ]
    .filter(Boolean)
    .join(' ');

  currentLogger.warn(message, meta);
}
