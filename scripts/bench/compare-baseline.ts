import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type BenchOutput = {
  generatedAt: string;
  metrics: Record<string, number>;
};

type Comparison = {
  name: string;
  baseline?: number;
  current?: number;
  deltaPct?: number;
  status: 'ok' | 'regression' | 'improvement' | 'missing';
};

const args = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.split('=');
  if (key && value) {
    args.set(key.replace(/^--/, ''), value);
  }
}

const baselinePath = args.get('baseline') ?? join(process.cwd(), 'benchmarks', 'baseline.json');
const currentPath = args.get('current') ?? join(process.cwd(), 'benchmarks', 'results.json');
const outputPath = args.get('output') ?? join(process.cwd(), 'benchmarks', 'compare-summary.md');
const threshold = Number(process.env.BENCHMARK_REGRESSION_THRESHOLD ?? '0.2');

const baseline = readJson<BenchOutput>(baselinePath);
const current = readJson<BenchOutput>(currentPath);

const metricDirections: Record<string, 'lower' | 'higher'> = {
  bulk10kRecordsPerSec: 'higher'
};

const comparisons: Comparison[] = [];
let failures = 0;

for (const [name, currentValue] of Object.entries(current.metrics)) {
  const baselineValue = baseline.metrics?.[name];
  if (baselineValue === undefined) {
    comparisons.push({ name, current: currentValue, status: 'missing' });
    continue;
  }

  const direction = metricDirections[name] ?? 'lower';
  const deltaPct = baselineValue === 0 ? undefined : (currentValue - baselineValue) / baselineValue;

  let status: Comparison['status'] = 'ok';
  if (deltaPct !== undefined) {
    if (direction === 'lower' && deltaPct > threshold) {
      status = 'regression';
      failures += 1;
    }
    if (direction === 'higher' && deltaPct < -threshold) {
      status = 'regression';
      failures += 1;
    }
    if (direction === 'lower' && deltaPct < -threshold) {
      status = 'improvement';
    }
    if (direction === 'higher' && deltaPct > threshold) {
      status = 'improvement';
    }
  }

  comparisons.push({ name, baseline: baselineValue, current: currentValue, deltaPct, status });
}

const summary = buildMarkdown(comparisons, threshold);
writeFileSync(outputPath, summary);
console.log(summary);

if (failures > 0) {
  process.exit(1);
}

function readJson<T>(path: string): T {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as T;
}

function buildMarkdown(comparisons: Comparison[], thresholdValue: number): string {
  const lines: string[] = [];
  lines.push('## Benchmark Comparison');
  lines.push('');
  lines.push(`Regression threshold: ${(thresholdValue * 100).toFixed(0)}%`);
  lines.push('');
  lines.push('| Metric | Baseline | Current | Delta | Status |');
  lines.push('| --- | ---: | ---: | ---: | --- |');

  for (const entry of comparisons) {
    const baseline = entry.baseline?.toFixed(2) ?? 'n/a';
    const current = entry.current?.toFixed(2) ?? 'n/a';
    const delta = entry.deltaPct === undefined ? 'n/a' : `${(entry.deltaPct * 100).toFixed(1)}%`;
    lines.push(`| ${entry.name} | ${baseline} | ${current} | ${delta} | ${entry.status} |`);
  }

  lines.push('');
  lines.push('Notes: lower is better unless explicitly noted (e.g. throughput).');

  return lines.join('\n');
}
