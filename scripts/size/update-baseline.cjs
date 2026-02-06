const { copyFileSync } = require('node:fs');
const { join } = require('node:path');

const currentPath = getArg('--current') || join(process.cwd(), 'benchmarks', 'bundle-results.json');
const baselinePath = getArg('--baseline') || join(process.cwd(), 'benchmarks', 'bundle-baseline.json');

copyFileSync(currentPath, baselinePath);
console.log(`Updated bundle baseline: ${baselinePath}`);

function getArg(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) {
    return undefined;
  }
  return arg.split('=')[1];
}
