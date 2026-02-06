import type { ApiResponse, HttpMethod } from './http/types';
import type { ZohoRegion } from './auth/types';
import type { AccessToken, ZohoTokenResponse } from './auth/types';
import type { Logger } from './logger';
import type { ZohoCRM } from './zoho-crm';

export interface PluginResponseOverride<T = unknown> extends ApiResponse<T> {}

export interface BeforeRequestContext {
  method: HttpMethod;
  path: string;
  params: Record<string, string | number | boolean | undefined>;
  headers: Record<string, string>;
  body?: unknown;
  timeout?: number;
  region: ZohoRegion;
  attempt: number;
  context?: Record<string, unknown>;
}

export interface AfterResponseContext<T = unknown> {
  method: HttpMethod;
  path: string;
  status: number;
  headers: Record<string, string>;
  data?: T;
  durationMs?: number;
  region: ZohoRegion;
  attempt: number;
  context?: Record<string, unknown>;
}

export interface ErrorContext {
  method: HttpMethod;
  path: string;
  error: unknown;
  status?: number;
  durationMs?: number;
  region: ZohoRegion;
  attempt: number;
  context?: Record<string, unknown>;
}

export interface TokenRefreshContext {
  token: AccessToken;
  raw: ZohoTokenResponse;
  cacheKey?: string;
  region: ZohoRegion;
}

export type BeforeRequestHook = (
  ctx: BeforeRequestContext
) => PluginResponseOverride | undefined | Promise<PluginResponseOverride | undefined>;
export type AfterResponseHook = (ctx: AfterResponseContext) => void | Promise<void>;
export type ErrorHook = (ctx: ErrorContext) => void | Promise<void>;
export type TokenRefreshHook = (ctx: TokenRefreshContext) => void | Promise<void>;

export interface ZohoCRMPluginHooks {
  beforeRequest?: BeforeRequestHook;
  afterResponse?: AfterResponseHook;
  onError?: ErrorHook;
  onTokenRefresh?: TokenRefreshHook;
}

export interface ZohoCRMPlugin {
  name: string;
  version: string;
  install(client: ZohoCRM): void | Promise<void>;
  uninstall?(client: ZohoCRM): void | Promise<void>;
}

type HookEntry<T> = {
  plugin: string;
  hook: T;
};

export class PluginManager {
  private readonly logger: Required<Logger>;
  private readonly plugins = new Map<string, ZohoCRMPlugin>();
  private readonly beforeRequest: HookEntry<BeforeRequestHook>[] = [];
  private readonly afterResponse: HookEntry<AfterResponseHook>[] = [];
  private readonly onError: HookEntry<ErrorHook>[] = [];
  private readonly onTokenRefresh: HookEntry<TokenRefreshHook>[] = [];

  constructor(logger: Required<Logger>) {
    this.logger = logger;
  }

  list(): ZohoCRMPlugin[] {
    return Array.from(this.plugins.values());
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  registerPlugin(plugin: ZohoCRMPlugin): void {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn('Plugin already registered.', { plugin: plugin.name });
      return;
    }
    this.plugins.set(plugin.name, plugin);
  }

  unregisterPlugin(name: string): void {
    this.plugins.delete(name);
    this.removeHooks(name);
  }

  registerHooks(pluginName: string, hooks: ZohoCRMPluginHooks): void {
    if (hooks.beforeRequest) {
      this.beforeRequest.push({ plugin: pluginName, hook: hooks.beforeRequest });
    }
    if (hooks.afterResponse) {
      this.afterResponse.push({ plugin: pluginName, hook: hooks.afterResponse });
    }
    if (hooks.onError) {
      this.onError.push({ plugin: pluginName, hook: hooks.onError });
    }
    if (hooks.onTokenRefresh) {
      this.onTokenRefresh.push({ plugin: pluginName, hook: hooks.onTokenRefresh });
    }
  }

  removeHooks(pluginName: string): void {
    const filter = <T>(hooks: HookEntry<T>[]) => hooks.filter((entry) => entry.plugin !== pluginName);
    this.beforeRequest.splice(0, this.beforeRequest.length, ...filter(this.beforeRequest));
    this.afterResponse.splice(0, this.afterResponse.length, ...filter(this.afterResponse));
    this.onError.splice(0, this.onError.length, ...filter(this.onError));
    this.onTokenRefresh.splice(0, this.onTokenRefresh.length, ...filter(this.onTokenRefresh));
  }

  async runBeforeRequest(ctx: BeforeRequestContext): Promise<PluginResponseOverride | undefined> {
    for (const entry of this.beforeRequest) {
      try {
        const result = await entry.hook(ctx);
        if (result) {
          return normalizeOverride(result);
        }
      } catch (error) {
        this.logger.warn('Plugin beforeRequest hook failed.', {
          plugin: entry.plugin,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    return undefined;
  }

  async runAfterResponse(ctx: AfterResponseContext): Promise<void> {
    for (const entry of this.afterResponse) {
      try {
        await entry.hook(ctx);
      } catch (error) {
        this.logger.warn('Plugin afterResponse hook failed.', {
          plugin: entry.plugin,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async runOnError(ctx: ErrorContext): Promise<void> {
    for (const entry of this.onError) {
      try {
        await entry.hook(ctx);
      } catch (error) {
        this.logger.warn('Plugin onError hook failed.', {
          plugin: entry.plugin,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async runOnTokenRefresh(ctx: TokenRefreshContext): Promise<void> {
    for (const entry of this.onTokenRefresh) {
      try {
        await entry.hook(ctx);
      } catch (error) {
        this.logger.warn('Plugin onTokenRefresh hook failed.', {
          plugin: entry.plugin,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}

function normalizeOverride<T>(override: PluginResponseOverride<T>): PluginResponseOverride<T> {
  return {
    data: override.data,
    status: override.status ?? 200,
    headers: override.headers ?? {}
  };
}
