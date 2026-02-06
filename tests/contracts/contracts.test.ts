import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContractFixture } from './contract-fixture';
import { runContractFixture } from './contract-runner';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixtures(): ContractFixture[] {
  return readdirSync(fixturesDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const raw = readFileSync(join(fixturesDir, file), 'utf8');
      return JSON.parse(raw) as ContractFixture;
    });
}

describe('Contract fixtures', () => {
  const fixtures = loadFixtures();

  for (const fixture of fixtures) {
    it(fixture.name, async () => {
      const { request, result } = await runContractFixture(fixture);

      expect(request).toEqual(fixture.request);

      if (fixture.expected.result === null) {
        expect(result).toBeUndefined();
      } else if ('result' in fixture.expected) {
        expect(result).toEqual(fixture.expected.result);
      }
    });
  }
});
