export type ValidationMode = 'off' | 'strict' | 'permissive';

export interface ValidationIssue {
  path: string;
  expected: string;
  actual: string;
  message: string;
}

export interface UnknownFieldInfo {
  schema: string;
  path: string;
  fields: string[];
  sample?: Record<string, unknown>;
}

export interface ValidationOptions {
  enabled?: boolean;
  mode?: ValidationMode;
  warnUnknownFields?: boolean;
  exportUnknownFields?: (info: UnknownFieldInfo) => void;
  development?: boolean;
}

export interface NormalizedValidationOptions {
  enabled: boolean;
  mode: ValidationMode;
  warnUnknownFields: boolean;
  exportUnknownFields?: (info: UnknownFieldInfo) => void;
  development: boolean;
}

export function normalizeValidationOptions(
  options?: ValidationOptions | NormalizedValidationOptions
): NormalizedValidationOptions {
  if (!options) {
    return {
      enabled: false,
      mode: 'off',
      warnUnknownFields: false,
      development: false
    };
  }

  const enabled = options.enabled ?? options.mode !== 'off';
  const development = options.development ?? false;
  const mode = enabled ? (options.mode ?? (development ? 'permissive' : 'strict')) : 'off';
  const warnUnknownFields = options.warnUnknownFields ?? development;

  const normalized: NormalizedValidationOptions = {
    enabled,
    mode,
    warnUnknownFields,
    development
  };

  if (options.exportUnknownFields) {
    normalized.exportUnknownFields = options.exportUnknownFields;
  }

  return normalized;
}
