import { describe, expect, it, vi } from 'vitest';
import { ZohoCRM } from '../../src/zoho-crm';
import type { ZohoAuth } from '../../src/auth/zoho-auth';

const createAuthMock = () =>
  ({
    setLogger: vi.fn(),
    setMetrics: vi.fn(),
    setValidation: vi.fn(),
    setProfiler: vi.fn(),
    addTokenRefreshListener: vi.fn(),
    clearTokenCache: vi.fn(),
    invalidateToken: vi.fn(),
    close: vi.fn()
  }) as unknown as ZohoAuth;

const createLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
});

describe('ZohoCRM extensions', () => {
  it('registers and unregisters modules', () => {
    const auth = createAuthMock();
    const crm = new ZohoCRM({ auth, region: 'US' });

    crm.registerModule('projects', { list: () => [] });
    expect((crm as { projects?: unknown }).projects).toBeDefined();

    crm.unregisterExtension('projects');
    expect((crm as { projects?: unknown }).projects).toBeUndefined();
  });

  it('registers methods and prevents conflicts', () => {
    const auth = createAuthMock();
    const crm = new ZohoCRM({ auth, region: 'US' });

    crm.registerMethod('ping', () => 'pong');
    expect((crm as { ping: () => string }).ping()).toBe('pong');

    expect(() => crm.registerMethod('leads', () => 'nope')).toThrow();
  });

  it('prevents registering reserved modules', () => {
    const auth = createAuthMock();
    const crm = new ZohoCRM({ auth, region: 'US' });

    expect(() => crm.registerModule('auth', { nope: true })).toThrow();
  });

  it('clears cached tokens using auth helpers', () => {
    const auth = createAuthMock();
    const crm = new ZohoCRM({ auth, region: 'US' });

    crm.clearCachedState();
    expect(auth.clearTokenCache).toHaveBeenCalledTimes(1);
  });

  it('falls back to invalidateToken when clearTokenCache is missing', () => {
    const auth = createAuthMock();
    (auth as { clearTokenCache?: () => void }).clearTokenCache = undefined;
    const crm = new ZohoCRM({ auth, region: 'US' });

    crm.clearCachedState();
    expect(auth.invalidateToken).toHaveBeenCalledTimes(1);
  });
});

describe('ZohoCRM plugins', () => {
  it('installs plugins and lists them', async () => {
    const auth = createAuthMock();
    const logger = createLogger();
    const crm = new ZohoCRM({ auth, region: 'US', logger });

    const plugin = {
      name: 'test',
      version: '1.0.0',
      install: vi.fn((client: ZohoCRM) => {
        client.plugins.registerHooks('test', {
          beforeRequest: vi.fn()
        });
      })
    };
    await crm.use(plugin);

    expect(plugin.install).toHaveBeenCalledWith(crm);
    expect(crm.plugins.list().map((entry) => entry.name)).toContain('test');
    expect(crm.listPlugins().map((entry) => entry.name)).toContain('test');
  });

  it('warns and skips when plugin install fails', async () => {
    const auth = createAuthMock();
    const logger = createLogger();
    const crm = new ZohoCRM({ auth, region: 'US', logger });

    const plugin = {
      name: 'bad',
      version: '1.0.0',
      install: vi.fn().mockRejectedValue(new Error('boom'))
    };
    await crm.use(plugin);

    expect(logger.warn).toHaveBeenCalledWith('Plugin install failed.', {
      plugin: 'bad',
      error: 'boom'
    });
    expect(crm.listPlugins().map((entry) => entry.name)).not.toContain('bad');
  });

  it('uninstalls plugins when requested', async () => {
    const auth = createAuthMock();
    const logger = createLogger();
    const crm = new ZohoCRM({ auth, region: 'US', logger });

    const plugin = {
      name: 'cleanup',
      version: '1.0.0',
      install: vi.fn(),
      uninstall: vi.fn()
    };
    await crm.use(plugin);

    await crm.removePlugin('cleanup');
    expect(plugin.uninstall).toHaveBeenCalledWith(crm);
    expect(crm.listPlugins().map((entry) => entry.name)).not.toContain('cleanup');
  });
});
