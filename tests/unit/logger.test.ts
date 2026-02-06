import { describe, expect, it, vi } from 'vitest';
import { normalizeLogger } from '../../src/logger';

describe('logger redaction', () => {
  it('redacts common secret fields from metadata', () => {
    const logger = { debug: vi.fn() };
    const normalized = normalizeLogger(logger);

    normalized.debug('test', {
      token: 'secret-token',
      nested: { client_secret: 'super-secret' },
      safe: 'ok'
    });

    const meta = logger.debug.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(meta.token).toBe('[redacted]');
    expect((meta.nested as Record<string, unknown>).client_secret).toBe('[redacted]');
    expect(meta.safe).toBe('ok');
  });
});
