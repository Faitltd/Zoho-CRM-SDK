Benchmark Suite

This folder contains lightweight performance benchmarks for the SDK. The goal is to detect regressions and keep overhead predictable.

Run locally:

```bash
npx tsx benchmarks/run.ts
```

This writes `benchmarks/results.json` and prints a summary.

Update baseline after intentional improvements:

```bash
npx tsx scripts/bench/update-baseline.ts --current benchmarks/results.json
```

Compare current results to baseline (fails on >20% regression):

```bash
npx tsx scripts/bench/compare-baseline.ts --current benchmarks/results.json --baseline benchmarks/baseline.json
```

Notes
- Benchmarks use a local mock server for stable results.
- Baselines should be refreshed on your main branch when performance changes are intended.
