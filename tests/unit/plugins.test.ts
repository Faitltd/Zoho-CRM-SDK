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
});
