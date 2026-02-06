const { build } = require('esbuild');
const { gzipSync } = require('node:zlib');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join, relative } = require('node:path');

const entryPoints = {
  index: 'src/index.ts',
  core: 'src/entry/core.ts',
  'modules/leads': 'src/entry/leads.ts',
  'modules/contacts': 'src/entry/contacts.ts',
  'modules/deals': 'src/entry/deals.ts',
  'modules/webhooks': 'src/entry/webhooks.ts',
  'modules/bulk': 'src/entry/bulk.ts'
};

const outdir = join(process.cwd(), '.size-dist');
const outputPath = getArg('--output') || join(process.cwd(), 'benchmarks', 'bundle-results.json');

const budgets = {
  coreGzipKb: 15,
  moduleGzipKb: 5,
  totalGzipKb: 50
};

async function run() {
  const result = await build({
    entryPoints,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    minify: true,
    sourcemap: false,
    treeShaking: true,
    write: false,
    outdir,
    metafile: true
  });

  const outputs = {};
  const outputFiles = {};
  const moduleBreakdowns = {};
  const dependencySizes = {};

  for (const file of result.outputFiles) {
    const rel = relative(process.cwd(), file.path).replace(/\\/g, '/');
    const bytes = file.contents.length;
    const gzip = gzipSync(file.contents).length;

    outputs[rel] = {
      bytes,
      gzipBytes: gzip
    };
    outputFiles[rel] = file.contents.toString('utf8');
  }

  for (const [output, meta] of Object.entries(result.metafile.outputs)) {
    const rel = relative(process.cwd(), output).replace(/\\/g, '/');
    if (!rel.startsWith('.size-dist/')) {
      continue;
    }

    moduleBreakdowns[rel] = moduleBreakdowns[rel] || {};
    for (const [input, info] of Object.entries(meta.inputs)) {
      const group = classifyInput(input);
      moduleBreakdowns[rel][group] = (moduleBreakdowns[rel][group] || 0) + info.bytes;

      if (group.startsWith('dep:')) {
        dependencySizes[group] = (dependencySizes[group] || 0) + info.bytes;
      }
    }
  }

  const metrics = buildMetrics(outputs, budgets);

  const payload = {
    generatedAt: new Date().toISOString(),
    outputs,
    metrics,
    budgets,
    moduleBreakdowns,
    dependencySizes
  };

  mkdirSync(join(process.cwd(), 'benchmarks'), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  writeFileSync(join(process.cwd(), 'benchmarks', 'bundle-summary.md'), renderSummary(payload));

  console.log(renderSummary(payload));
}

function classifyInput(input) {
  const normalized = input.replace(/\\/g, '/');
  if (normalized.includes('node_modules/')) {
    const parts = normalized.split('node_modules/')[1].split('/');
    const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
    return `dep:${name}`;
  }
  if (normalized.startsWith('src/auth/')) return 'auth';
  if (normalized.startsWith('src/http/')) return 'http';
  if (normalized.startsWith('src/modules/')) {
    if (normalized.includes('leads')) return 'module:leads';
    if (normalized.includes('contacts')) return 'module:contacts';
    if (normalized.includes('deals')) return 'module:deals';
    if (normalized.includes('webhooks')) return 'module:webhooks';
    if (normalized.includes('bulk')) return 'module:bulk';
    return 'module:shared';
  }
  if (normalized.startsWith('src/validation/')) return 'validation';
  if (normalized.startsWith('src/')) return 'core';
  return 'other';
}

function buildMetrics(outputs, limits) {
  const get = (suffix) =>
    Object.entries(outputs).find(([path]) => path.endsWith(suffix))?.[1] ?? {
      bytes: 0,
      gzipBytes: 0
    };

  const core = get('.size-dist/core.js');
  const total = get('.size-dist/index.js');
  const leads = get('.size-dist/modules/leads.js');
  const contacts = get('.size-dist/modules/contacts.js');
  const deals = get('.size-dist/modules/deals.js');
  const webhooks = get('.size-dist/modules/webhooks.js');
  const bulk = get('.size-dist/modules/bulk.js');

  const kb = (bytes) => bytes / 1024;

  return {
    coreGzipKb: kb(core.gzipBytes),
    totalGzipKb: kb(total.gzipBytes),
    leadsGzipKb: kb(leads.gzipBytes),
    contactsGzipKb: kb(contacts.gzipBytes),
    dealsGzipKb: kb(deals.gzipBytes),
    webhooksGzipKb: kb(webhooks.gzipBytes),
    bulkGzipKb: kb(bulk.gzipBytes),
    budgetChecks: {
      core: kb(core.gzipBytes) <= limits.coreGzipKb,
      total: kb(total.gzipBytes) <= limits.totalGzipKb,
      leads: kb(leads.gzipBytes) <= limits.moduleGzipKb,
      contacts: kb(contacts.gzipBytes) <= limits.moduleGzipKb,
      deals: kb(deals.gzipBytes) <= limits.moduleGzipKb,
      webhooks: kb(webhooks.gzipBytes) <= limits.moduleGzipKb,
      bulk: kb(bulk.gzipBytes) <= limits.moduleGzipKb
    }
  };
}

function renderSummary(payload) {
  const lines = [];
  const metrics = payload.metrics;

  lines.push('## Bundle Size Summary');
  lines.push('');
  lines.push('| Entry | Gzip Size (KB) | Budget (KB) | Within Budget |');
  lines.push('| --- | ---: | ---: | :---: |');
  lines.push(`| Core | ${metrics.coreGzipKb.toFixed(2)} | ${payload.budgets.coreGzipKb} | ${metrics.budgetChecks.core ? 'Yes' : 'No'} |`);
  lines.push(`| Total | ${metrics.totalGzipKb.toFixed(2)} | ${payload.budgets.totalGzipKb} | ${metrics.budgetChecks.total ? 'Yes' : 'No'} |`);
  lines.push(`| Leads | ${metrics.leadsGzipKb.toFixed(2)} | ${payload.budgets.moduleGzipKb} | ${metrics.budgetChecks.leads ? 'Yes' : 'No'} |`);
  lines.push(`| Contacts | ${metrics.contactsGzipKb.toFixed(2)} | ${payload.budgets.moduleGzipKb} | ${metrics.budgetChecks.contacts ? 'Yes' : 'No'} |`);
  lines.push(`| Deals | ${metrics.dealsGzipKb.toFixed(2)} | ${payload.budgets.moduleGzipKb} | ${metrics.budgetChecks.deals ? 'Yes' : 'No'} |`);
  lines.push(`| Webhooks | ${metrics.webhooksGzipKb.toFixed(2)} | ${payload.budgets.moduleGzipKb} | ${metrics.budgetChecks.webhooks ? 'Yes' : 'No'} |`);
  lines.push(`| Bulk | ${metrics.bulkGzipKb.toFixed(2)} | ${payload.budgets.moduleGzipKb} | ${metrics.budgetChecks.bulk ? 'Yes' : 'No'} |`);
  lines.push('');
  lines.push('Dependency breakdown (minified bytes):');

  const deps = Object.entries(payload.dependencySizes).sort((a, b) => b[1] - a[1]);
  for (const [dep, bytes] of deps) {
    lines.push(`- ${dep.replace('dep:', '')}: ${(bytes / 1024).toFixed(2)} KB`);
  }

  return lines.join('\n');
}

function getArg(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) {
    return undefined;
  }
  return arg.split('=')[1];
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
