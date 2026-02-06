import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const args = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.split('=');
  if (key && value) {
    args.set(key.replace(/^--/, ''), value);
  }
}

const currentPath = args.get('current') ?? join(process.cwd(), 'benchmarks', 'results.json');
const baselinePath = args.get('baseline') ?? join(process.cwd(), 'benchmarks', 'baseline.json');

copyFileSync(currentPath, baselinePath);
console.log(`Updated baseline: ${baselinePath}`);
