import { beforeEach, describe, expect, it, vi } from 'vitest';

const warn = vi.fn();

vi.mock('../../src/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/logger')>();
  return {
    ...actual,
    normalizeLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() })
  };
});

import { configureDeprecations, warnDeprecated } from '../../src/deprecation';

describe('deprecation warnings', () => {
  beforeEach(() => {
    warn.mockReset();
    process.env.ZOHO_CRM_SDK_SUPPRESS_DEPRECATION_WARNINGS = undefined;
  });

  it('logs a warning with metadata', () => {
    configureDeprecations({ enabled: true, emitOnce: false });
    warnDeprecated({
      feature: 'oldMethod',
      message: 'Use newMethod',
      alternative: 'newMethod',
      removalVersion: '2.0.0'
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Deprecated: oldMethod.'),
      expect.objectContaining({
        feature: 'oldMethod',
        alternative: 'newMethod',
        removalVersion: '2.0.0'
      })
    );
  });

  it('suppresses warnings via env var', () => {
    process.env.ZOHO_CRM_SDK_SUPPRESS_DEPRECATION_WARNINGS = 'true';
    configureDeprecations({ enabled: true, emitOnce: false });
    warnDeprecated({ feature: 'oldMethod', message: 'Use newMethod' });

    expect(warn).not.toHaveBeenCalled();
  });

  it('emits once when configured', () => {
    configureDeprecations({ enabled: true, emitOnce: true });
    warnDeprecated({ feature: 'once', message: 'deprecated' });
    warnDeprecated({ feature: 'once', message: 'deprecated' });

    expect(warn).toHaveBeenCalledTimes(1);
  });
});
