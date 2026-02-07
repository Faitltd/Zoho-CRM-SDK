import { describe, expect, it, vi } from 'vitest';
import { PluginManager } from '../../src/plugins';

const createLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
});

describe('PluginManager', () => {
  it('returns the first response override from beforeRequest hooks', async () => {
    const logger = createLogger();
    const manager = new PluginManager(logger);

    manager.registerHooks('plugin-a', {
      beforeRequest: () => ({
        data: { ok: true },
        status: 200,
        headers: { 'x-mock': '1' }
      })
    });
    manager.registerHooks('plugin-b', {
      beforeRequest: () => ({
        data: { ok: false },
        status: 500,
        headers: {}
      })
    });

    const result = await manager.runBeforeRequest({
      method: 'GET',
      path: '/crm/v2/Leads',
      params: {},
      headers: {},
      region: 'US',
      attempt: 0
    });

    expect(result?.status).toBe(200);
  });

  it('swallows hook errors and logs warnings', async () => {
    const logger = createLogger();
    const manager = new PluginManager(logger);

    manager.registerHooks('plugin-a', {
      beforeRequest: () => {
        throw new Error('boom');
      }
    });

    await manager.runBeforeRequest({
      method: 'GET',
      path: '/crm/v2/Leads',
      params: {},
      headers: {},
      region: 'US',
      attempt: 0
    });

    expect(logger.warn).toHaveBeenCalled();
  });

  it('runs afterResponse and onError hooks', async () => {
    const logger = createLogger();
    const manager = new PluginManager(logger);
    const after = vi.fn();
    const onError = vi.fn();

    manager.registerHooks('plugin-a', {
      afterResponse: after,
      onError
    });

    await manager.runAfterResponse({
      method: 'GET',
      path: '/crm/v2/Leads',
      status: 200,
      headers: {},
      region: 'US',
      attempt: 0
    });

    await manager.runOnError({
      method: 'GET',
      path: '/crm/v2/Leads',
      error: new Error('oops'),
      status: 500,
      region: 'US',
      attempt: 0
    });

    expect(after).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('runs token refresh hooks', async () => {
    const logger = createLogger();
    const manager = new PluginManager(logger);
    const onTokenRefresh = vi.fn();

    manager.registerHooks('plugin-a', {
      onTokenRefresh
    });

    await manager.runOnTokenRefresh({
      token: { token: 't', type: 'Bearer', expiresAt: Date.now() + 1000 },
      raw: { access_token: 't', expires_in: 3600, token_type: 'Bearer' },
      region: 'US'
    });

    expect(onTokenRefresh).toHaveBeenCalledTimes(1);
  });

  it('removes hooks when a plugin is unregistered', async () => {
    const logger = createLogger();
    const manager = new PluginManager(logger);
    const before = vi.fn();

    manager.registerHooks('plugin-a', { beforeRequest: before });
    manager.unregisterPlugin('plugin-a');

    await manager.runBeforeRequest({
      method: 'GET',
      path: '/crm/v2/Leads',
      params: {},
      headers: {},
      region: 'US',
      attempt: 0
    });

    expect(before).not.toHaveBeenCalled();
  });
});
