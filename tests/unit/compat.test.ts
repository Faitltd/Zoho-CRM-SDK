import { describe, expect, it, vi } from 'vitest';
import { buildCompatibilityReport } from '../../src/compat/compatibility';
import { createDeprecatedProxy } from '../../src/compat/deprecated-proxy';

vi.mock('../../src/deprecation', () => ({
  warnDeprecated: vi.fn()
}));

import { warnDeprecated } from '../../src/deprecation';

describe('compatibility report', () => {
  it('emits warnings and recommendations for legacy config and flags', () => {
    const report = buildCompatibilityReport({
      legacyConfigUsed: true,
      useLegacyFieldNames: true,
      featureFlags: { strictTypeValidation: false }
    });

    expect(report.warnings).toEqual(
      expect.arrayContaining([
        'Using deprecated v1 config format. See migration guide.',
        'Strict validation is disabled. Enable for best type safety.'
      ])
    );
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        'Switch to the v2 ZohoAuth configuration format.',
        'Consider enabling camelCase field names for consistency.'
      ])
    );
  });
});

describe('deprecated proxy', () => {
  it('routes deprecated properties and warns', () => {
    const target = {
      create: vi.fn((value: string) => `created:${value}`),
      value: 42
    };

    const proxy = createDeprecatedProxy(target, {
      createLead: {
        target: 'create',
        message: 'createLead() is deprecated.',
        alternative: 'create()',
        removalVersion: '3.0.0'
      }
    });

    const result = (proxy as { createLead: (value: string) => string }).createLead('lead');

    expect(result).toBe('created:lead');
    expect(target.create).toHaveBeenCalledWith('lead');
    expect(warnDeprecated).toHaveBeenCalledTimes(1);
    expect((proxy as { value: number }).value).toBe(42);
  });
});
