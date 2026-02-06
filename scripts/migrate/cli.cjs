const { spawnSync } = require('node:child_process');
const path = require('node:path');

const args = process.argv.slice(2);
const target = args[0];
const dir = args[1] || '.';

if (!target || !['v1-to-v2'].includes(target)) {
  console.error('Usage: node scripts/migrate/cli.cjs v1-to-v2 <path>');
  process.exit(1);
}

const jscodeshift = path.resolve(__dirname, '../../node_modules/.bin/jscodeshift');
const transform = path.resolve(__dirname, `./transforms/${target}.js`);

const result = spawnSync(jscodeshift, ['-t', transform, dir], {
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
