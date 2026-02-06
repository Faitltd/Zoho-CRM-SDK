import type { FeatureFlags } from '../feature-flags';

export interface CompatibilityReport {
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

export function buildCompatibilityReport(options: {
  legacyConfigUsed?: boolean;
  useLegacyFieldNames?: boolean;
  featureFlags?: FeatureFlags;
}): CompatibilityReport {
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (Number.isFinite(nodeMajor) && nodeMajor < 18) {
    warnings.push('Node.js 18+ is required. Please upgrade your runtime.');
  }

  if (options.legacyConfigUsed) {
    warnings.push('Using deprecated v1 config format. See migration guide.');
    recommendations.push('Switch to the v2 ZohoAuth configuration format.');
  }

  if (options.useLegacyFieldNames) {
    recommendations.push('Consider enabling camelCase field names for consistency.');
  }

  if (options.featureFlags?.strictTypeValidation === false) {
    warnings.push('Strict validation is disabled. Enable for best type safety.');
  }

  return { warnings, errors, recommendations };
}
