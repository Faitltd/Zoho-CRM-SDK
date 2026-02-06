import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContractFixture } from '../tests/contracts/contract-fixture';
import { runContractFixture } from '../tests/contracts/contract-runner';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = join(__dirname, '..', 'tests', 'contracts', 'fixtures');
const shouldWrite = process.argv.includes('--write');

async function main() {
  const files = readdirSync(fixturesDir).filter((file) => file.endsWith('.json'));

  for (const file of files) {
    const path = join(fixturesDir, file);
    const raw = readFileSync(path, 'utf8');
    const fixture = JSON.parse(raw) as ContractFixture;

    const { request, result } = await runContractFixture(fixture);

    const shouldUpdateResult =
      'result' in fixture.expected && fixture.expected.result !== null && fixture.expected.result !== undefined;

    const updated: ContractFixture = {
      ...fixture,
      request,
      expected: shouldUpdateResult ? { result } : fixture.expected
    };

    if (shouldWrite) {
      writeFileSync(path, JSON.stringify(updated, null, 2));
      process.stdout.write(`updated ${file}\n`);
    } else {
      process.stdout.write(`checked ${file}\n`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
