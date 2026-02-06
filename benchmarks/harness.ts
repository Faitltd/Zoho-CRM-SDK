import { performance } from 'node:perf_hooks';

export interface BenchResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  meta?: Record<string, unknown>;
}

export interface BenchOptions {
  iterations?: number;
  warmup?: number;
  meta?: Record<string, unknown>;
}

export async function bench(
  name: string,
  fn: () => Promise<void> | void,
  options: BenchOptions = {}
): Promise<BenchResult> {
  const iterations = options.iterations ?? 1;
  const warmup = options.warmup ?? 0;
  const samples: number[] = [];

  for (let i = 0; i < warmup; i += 1) {
    await fn();
  }

  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    samples.push(duration);
  }

  return summarize(name, samples, options.meta);
}

export function summarize(name: string, samples: number[], meta?: Record<string, unknown>): BenchResult {
  const sorted = [...samples].sort((a, b) => a - b);
  const totalMs = samples.reduce((sum, value) => sum + value, 0);
  const avgMs = totalMs / samples.length;
  const minMs = sorted[0] ?? 0;
  const maxMs = sorted[sorted.length - 1] ?? 0;
  const p50Ms = percentile(sorted, 50);
  const p95Ms = percentile(sorted, 95);

  return {
    name,
    iterations: samples.length,
    totalMs,
    avgMs,
    minMs,
    maxMs,
    p50Ms,
    p95Ms,
    meta
  };
}

export function percentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

export function formatMs(value: number): string {
  return `${value.toFixed(2)}ms`;
}
