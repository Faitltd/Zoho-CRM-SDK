Chaos tests simulate adverse conditions and validate resilience.

## Unit Chaos Tests
Run with:

```bash
npx vitest run tests/chaos
```

## Chaos Proxy (optional integration)
Start the proxy:

```bash
node scripts/chaos-proxy.ts
```

Configure env:
- CHAOS_BASE_URL=http://localhost:5001
- ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN

Then run:

```bash
npx vitest run tests/chaos/chaos-proxy.integration.test.ts
```

Configure proxy behavior with env vars:
- CHAOS_TARGET (default: https://www.zohoapis.com)
- CHAOS_FAILURE_RATE (default: 0.1)
- CHAOS_TIMEOUT_RATE (default: 0.05)
- CHAOS_CORRUPT_RATE (default: 0.05)
- CHAOS_MIN_DELAY_MS (default: 0)
- CHAOS_MAX_DELAY_MS (default: 300)

## Memory Leak Check (optional)
Run with:

```bash
NODE_OPTIONS=--expose-gc npx vitest run tests/chaos/memory-leak.test.ts
```
