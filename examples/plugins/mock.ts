import type { ZohoCRMPlugin, PluginResponseOverride } from '@yourcompany/zoho-crm';

type MockHandler = (path: string) => PluginResponseOverride | undefined;

export function createMockPlugin(handlers: Record<string, PluginResponseOverride> | MockHandler): ZohoCRMPlugin {
  return {
    name: '@yourcompany/zoho-crm-mock',
    version: '0.1.0',
    install(client) {
      client.plugins.registerHooks(this.name, {
        beforeRequest: (ctx) => {
          if (typeof handlers === 'function') {
            return handlers(ctx.path);
          }
          const key = `${ctx.method} ${ctx.path}`;
          return handlers[key];
        }
      });
    },
    uninstall(client) {
      client.plugins.removeHooks(this.name);
    }
  };
}
