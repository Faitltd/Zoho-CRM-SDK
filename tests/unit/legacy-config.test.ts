import { describe, expect, it, vi } from 'vitest';
import { ZohoAuth } from '../../src/auth/zoho-auth';
import { normalizeLegacyConfig } from '../../src/compat/legacy-config';
import type { ZohoCRMConfig } from '../../src/zoho-crm';

describe('normalizeLegacyConfig', () => {
  it('passes through when auth is provided', () => {
    const auth = {} as unknown as ZohoAuth;
    const config = { auth, region: 'US' } as ZohoCRMConfig;

    const result = normalizeLegacyConfig(config);

    expect(result.legacyDetected).toBe(false);
    expect(result.config).toBe(config);
  });

  it('builds ZohoAuth from legacy fields and emits warnings', () => {
    const logger = { warn: vi.fn() };
    const result = normalizeLegacyConfig(
      {
        client_id: 'id',
        client_secret: 'secret',
        refresh_token: 'refresh',
        region: 'EU'
      },
      logger
    );

    expect(result.legacyDetected).toBe(true);
    expect(result.config.region).toBe('EU');
    expect(result.config.auth).toBeInstanceOf(ZohoAuth);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('accepts api_key as refreshToken with a warning', () => {
    const logger = { warn: vi.fn() };
    const result = normalizeLegacyConfig(
      {
        client_id: 'id',
        client_secret: 'secret',
        api_key: 'legacy-refresh',
        region: 'US'
      },
      logger
    );

    expect(result.legacyDetected).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining(['Using deprecated api_key for authentication. Use refreshToken instead.'])
    );
  });
});
