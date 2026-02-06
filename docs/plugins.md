# Plugins

The SDK supports an extension system for third-party enhancements. Plugins can:
- Hook into request/response lifecycles.
- Observe token refresh events.
- Add new modules or methods to the client.

## Plugin Interface

```ts
import type { ZohoCRM, ZohoCRMPlugin } from '@yourcompany/zoho-crm';

export const MyPlugin: ZohoCRMPlugin = {
  name: '@acme/zoho-crm-my-plugin',
  version: '1.0.0',
  install(client: ZohoCRM) {
    // Register hooks
    client.plugins.registerHooks(this.name, {
      beforeRequest: (ctx) => {
        ctx.headers['x-trace-id'] = 'trace-123';
      },
      afterResponse: (ctx) => {
        // Observe response
      },
      onError: (ctx) => {
        // Observe errors
      },
      onTokenRefresh: (ctx) => {
        // Observe token refresh
      }
    });

    // Add a module or method
    client.registerMethod('myHelper', () => 'ok');
  },
  uninstall(client) {
    client.plugins.removeHooks(this.name);
    client.unregisterExtension('myHelper');
  }
};
```

## Installing Plugins

```ts
import { ZohoCRM } from '@yourcompany/zoho-crm';
import { AnalyticsPlugin } from '@yourcompany/zoho-crm-analytics';

const crm = new ZohoCRM({ auth, region: 'US', plugins: [AnalyticsPlugin] });

// Or at runtime:
await crm.use(AnalyticsPlugin);
```

If a plugin has async setup, prefer `await crm.use(...)` so hooks are ready before the first request.

To uninstall:

```ts
await crm.removePlugin('@yourcompany/zoho-crm-analytics');
```

## Lifecycle Hooks
- `beforeRequest`: mutate headers/params/body or short‑circuit with a response override.
- `afterResponse`: observe successful responses.
- `onError`: observe failures.
- `onTokenRefresh`: observe OAuth refresh events.

`beforeRequest` receives mutable `headers`, `params`, and `body` fields. Assigning to `ctx.body` updates the outgoing
payload.

Hooks run in registration order. If a hook throws, the SDK logs a warning and continues.
If multiple plugins return a response override in `beforeRequest`, the first one wins.

## Safety Guarantees
- Plugins cannot disable HTTPS enforcement.
- Authorization headers are injected after `beforeRequest` hooks to prevent tampering.
- `method` and `path` are treated as read-only; core request routing remains unchanged.
- Hook errors are isolated and never crash the core client.
- Extensions cannot override reserved core properties (auth, http, modules).

## Official Plugins (Examples)
- `@yourcompany/zoho-crm-analytics` – adds analytics tracking hooks.
- `@yourcompany/zoho-crm-cache` – adds Redis-backed caching (example).
- `@yourcompany/zoho-crm-retry-advanced` – adds advanced retry helpers.
- `@yourcompany/zoho-crm-mock` – provides mock responses for tests.

## Plugin Registry (Known)

Official:
- `@yourcompany/zoho-crm-analytics`
- `@yourcompany/zoho-crm-cache`
- `@yourcompany/zoho-crm-retry-advanced`
- `@yourcompany/zoho-crm-mock`

Community (examples):
- `zoho-crm-sentry`
- `zoho-crm-open-telemetry`
- `zoho-crm-cache-cloudflare`

## Best Practices
- Keep hooks fast and avoid blocking I/O in `beforeRequest`.
- Never log tokens, secrets, or PII in hooks.
- Use `contextProvider` (audit logging) or AsyncLocalStorage for per-request context.
- Prefer adding new methods/modules instead of mutating existing ones.

## Publishing
1. Package the plugin as a separate npm module.
2. Export a `ZohoCRMPlugin` instance.
3. Document supported SDK versions and Node versions.
4. Use semantic versioning.

## Plugin Showcase

Gallery (sample):
- Analytics: `@yourcompany/zoho-crm-analytics` (⭐ 4.7/5)
- Cache: `@yourcompany/zoho-crm-cache` (⭐ 4.5/5)
- Mocking: `@yourcompany/zoho-crm-mock` (⭐ 4.3/5)

Install:

```bash
npm install @yourcompany/zoho-crm-analytics
```

Usage:

```ts
import { ZohoCRM } from '@yourcompany/zoho-crm';
import { AnalyticsPlugin } from '@yourcompany/zoho-crm-analytics';

const crm = new ZohoCRM({ auth, region: 'US', plugins: [AnalyticsPlugin] });
```
