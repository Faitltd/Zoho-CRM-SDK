export interface FeatureFlags {
  // Gradual behavior changes.
  strictTypeValidation?: boolean;
  normalizeFieldNames?: boolean;
  useLegacyMethods?: boolean;
  advancedFilters?: boolean;
  [key: string]: boolean | undefined;
}

export type ExperimentalFeatures = Record<string, boolean>;

export function isFeatureEnabled(flags: ExperimentalFeatures | undefined, name: string): boolean {
  return Boolean(flags && flags[name]);
}

export function getFeatureFlag(flags: FeatureFlags | undefined, name: keyof FeatureFlags, fallback = false): boolean {
  const value = flags?.[name];
  return typeof value === 'boolean' ? value : fallback;
}

export function applyValidationFeatureFlags(
  validation: { enabled?: boolean; mode?: 'off' | 'strict' | 'permissive'; development?: boolean } | undefined,
  flags?: FeatureFlags
): { enabled?: boolean; mode?: 'off' | 'strict' | 'permissive'; development?: boolean } | undefined {
  if (!flags) {
    return validation;
  }

  if (flags.strictTypeValidation === false) {
    return {
      ...validation,
      enabled: validation?.enabled ?? true,
      mode: 'permissive'
    };
  }

  return validation;
}
