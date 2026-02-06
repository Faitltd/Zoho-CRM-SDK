export type ExperimentalFeatures = Record<string, boolean>;

export function isFeatureEnabled(flags: ExperimentalFeatures | undefined, name: string): boolean {
  return Boolean(flags && flags[name]);
}
