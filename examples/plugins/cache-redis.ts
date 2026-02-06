import type { ZohoCRMPlugin } from '@yourcompany/zoho-crm';

type RedisLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode?: string, ttlSeconds?: number) => Promise<void>;
};

type CachePluginOptions = {
  ttlSeconds?: number;
  keyPrefix?: string;
};

export function createRedisCachePlugin(redis: RedisLike, options: CachePluginOptions = {}): ZohoCRMPlugin {
  const ttl = options.ttlSeconds ?? 60;
  const prefix = options.keyPrefix ?? 'zoho:cache';

  return {
    name: '@yourcompany/zoho-crm-cache',
    version: '0.1.0',
    install(client) {
      client.plugins.registerHooks(this.name, {
        beforeRequest: async (ctx) => {
          if (ctx.method !== 'GET') {
            return;
          }
          const key = buildCacheKey(prefix, ctx.path, ctx.params);
          const cached = await redis.get(key);
          if (!cached) {
            return;
          }
          return {
            data: JSON.parse(cached),
            status: 200,
            headers: { 'x-cache': 'hit' }
          };
        },
        afterResponse: async (ctx) => {
          if (ctx.method !== 'GET' || ctx.status >= 400) {
            return;
          }
          const key = buildCacheKey(prefix, ctx.path, ctx.params);
          const payload = JSON.stringify(ctx.data ?? {});
          await redis.set(key, payload, 'EX', ttl);
        }
      });
    },
    uninstall(client) {
      client.plugins.removeHooks(this.name);
    }
  };
}

function buildCacheKey(prefix: string, path: string, params: Record<string, unknown>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .sort()
    .join('&');
  return `${prefix}:${path}?${query}`;
}
