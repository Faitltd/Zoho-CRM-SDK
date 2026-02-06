import type { ZohoCRMPlugin } from '@yourcompany/zoho-crm';

type AnalyticsEvent = {
  name: string;
  properties: Record<string, unknown>;
};

type AnalyticsTracker = (event: AnalyticsEvent) => void;

export function createAnalyticsPlugin(track: AnalyticsTracker = defaultTracker): ZohoCRMPlugin {
  return {
    name: '@yourcompany/zoho-crm-analytics',
    version: '0.1.0',
    install(client) {
      client.plugins.registerHooks(this.name, {
        afterResponse: (ctx) => {
          track({
            name: 'zoho.request.success',
            properties: {
              method: ctx.method,
              path: ctx.path,
              status: ctx.status,
              durationMs: ctx.durationMs
            }
          });
        },
        onError: (ctx) => {
          track({
            name: 'zoho.request.error',
            properties: {
              method: ctx.method,
              path: ctx.path,
              status: ctx.status,
              error: ctx.error instanceof Error ? ctx.error.name : 'UnknownError'
            }
          });
        }
      });
    },
    uninstall(client) {
      client.plugins.removeHooks(this.name);
    }
  };
}

function defaultTracker(event: AnalyticsEvent) {
  console.log('[analytics]', JSON.stringify(event));
}
