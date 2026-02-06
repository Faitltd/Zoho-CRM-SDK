const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const baselinePath = getArg('--baseline') || join(process.cwd(), 'benchmarks', 'bundle-baseline.json');
const currentPath = getArg('--current') || join(process.cwd(), 'benchmarks', 'bundle-results.json');
const outputPath = getArg('--output') || join(process.cwd(), 'benchmarks', 'bundle-compare.md');
const regressionThreshold = Number(process.env.BUNDLE_REGRESSION_THRESHOLD ?? '0.1');

const baseline = readJson(baselinePath);
const current = readJson(currentPath);

const entries = ['coreGzipKb', 'totalGzipKb', 'leadsGzipKb', 'contactsGzipKb', 'dealsGzipKb', 'webhooksGzipKb', 'bulkGzipKb'];

const comparisons = entries.map((key) => compareMetric(key, baseline, current));
const failedRegression = comparisons.filter((entry) => entry.status === 'regression').length > 0;
const budgets = current.metrics?.budgetChecks;
const failedBudget = budgets ? Object.values(budgets).some((value) => value === false) : false;
const failed = failedRegression || failedBudget;

const summary = renderSummary(comparisons, regressionThreshold, budgets);
writeFileSync(outputPath, summary);
console.log(summary);

if (failed) {
  process.exit(1);
}

function compareMetric(key, base, curr) {
  const baselineValue = base.metrics?.[key];
  const currentValue = curr.metrics?.[key];
  if (typeof baselineValue !== 'number' || typeof currentValue !== 'number') {
    return { key, baselineValue, currentValue, deltaPct: null, status: 'missing' };
  }
  const deltaPct = baselineValue === 0 ? 0 : (currentValue - baselineValue) / baselineValue;
  const status = deltaPct > regressionThreshold ? 'regression' : deltaPct < -regressionThreshold ? 'improvement' : 'ok';
  return { key, baselineValue, currentValue, deltaPct, status };
}

function renderSummary(comparisons, threshold, budgets) {
  const lines = [];
  lines.push('## Bundle Size Comparison');
  lines.push('');
  lines.push(`Regression threshold: ${(threshold * 100).toFixed(0)}%`);
  lines.push('');
  lines.push('| Metric | Baseline (KB) | Current (KB) | Delta | Status | Budget |');
  lines.push('| --- | ---: | ---: | ---: | --- | --- |');

  for (const entry of comparisons) {
    const baseline = entry.baselineValue?.toFixed(2) ?? 'n/a';
    const current = entry.currentValue?.toFixed(2) ?? 'n/a';
    const delta = entry.deltaPct === null ? 'n/a' : `${(entry.deltaPct * 100).toFixed(1)}%`;
  const budgetKey = entry.key.replace('GzipKb', '');
  const budgetStatus = budgets && budgetKey in budgets ? (budgets[budgetKey] ? 'Yes' : 'No') : 'n/a';
    lines.push(`| ${entry.key} | ${baseline} | ${current} | ${delta} | ${entry.status} | ${budgetStatus} |`);
  }

  return lines.join('\n');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function getArg(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) {
    return undefined;
  }
  return arg.split('=')[1];
}
