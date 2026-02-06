# Performance Characteristics

This SDK prioritizes predictable overhead and stable throughput. The benchmark suite in `benchmarks/` measures common paths and guards against regressions.

## Expected Latency
- **Warm request overhead**: target `<10ms` over raw HTTP for a cached token path.
- **Token refresh**: target `<200ms` in typical conditions (network dependent).
- **Bulk pagination**: target `<30s` for 100k records in mock benchmarks; real-world times depend on Zoho bulk export speed.

## Memory Usage
- Streaming bulk helpers avoid holding all records in memory.
- Memory usage scales with record size when you materialize arrays. Prefer streaming iteration for large exports.

## High-Throughput Recommendations
- Use `rateLimit` to smooth bursts and prevent 429s.
- Enable retry backoff for transient 5xx responses.
- Disable runtime validation in hot paths when performance matters most.
- Prefer bulk read/write for large datasets and scheduled syncs.
- Configure `http.timeoutMs` and `rateLimit.maxQueueWaitMs` to cap waiting time.
- Use `rateLimit.maxQueue` to avoid unbounded memory growth under load.

## CRUD vs Bulk
- **CRUD**: ideal for interactive workflows and small batches (tens to hundreds).
- **Bulk**: ideal for large exports/imports (thousands+), nightly syncs, or analytics pipelines.

## Profiling
The SDK exposes a lightweight profiler to sample request timings and log slow requests. Configure it via `ZohoCRMConfig.profiler`.

## Cleanup
Call `crm.close()` on shutdown to release pooled HTTP connections and cancel pending work.

## Connection Pooling
The SDK uses Undici connection pooling by default. You can tune pool settings via `ZohoCRMConfig.http.connection`:
- `connections` (default: 10)
- `pipelining` (default: 1)
- `keepAliveTimeout` (default: 60000)
- `keepAliveMaxTimeout` (default: 120000)
- `headersTimeout` / `bodyTimeout` (default: 30000)
