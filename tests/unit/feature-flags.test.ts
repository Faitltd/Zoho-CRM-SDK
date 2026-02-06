import { describe, expect, it } from 'vitest';
import { applyValidationFeatureFlags, getFeatureFlag, isFeatureEnabled } from '../../src/feature-flags';

describe('feature flag helpers', () => {
  it('detects experimental feature enablement', () => {
    expect(isFeatureEnabled({ newFlow: true }, 'newFlow')).toBe(true);
    expect(isFeatureEnabled({ newFlow: false }, 'newFlow')).toBe(false);
    expect(isFeatureEnabled(undefined, 'newFlow')).toBe(false);
  });

  it('returns feature flag values with fallback', () => {
    expect(getFeatureFlag({ normalizeFieldNames: true }, 'normalizeFieldNames', false)).toBe(true);
    expect(getFeatureFlag({ normalizeFieldNames: false }, 'normalizeFieldNames', true)).toBe(false);
    expect(getFeatureFlag(undefined, 'normalizeFieldNames', true)).toBe(true);
  });

  it('downgrades validation when strictTypeValidation is disabled', () => {
    const result = applyValidationFeatureFlags({ enabled: true, mode: 'strict' }, { strictTypeValidation: false });
    expect(result).toEqual({ enabled: true, mode: 'permissive' });
  });

  it('returns validation unchanged when strictTypeValidation is enabled', () => {
    const validation = { enabled: true, mode: 'strict' as const };
    const result = applyValidationFeatureFlags(validation, { strictTypeValidation: true });
    expect(result).toBe(validation);
  });
});
