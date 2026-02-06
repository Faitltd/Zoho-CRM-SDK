import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZohoAuth } from '../src/auth/zoho-auth';
import { ZohoCRM } from '../src/zoho-crm';
import type { ContractFixture } from '../tests/contracts/contract-fixture';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = join(__dirname, '..', 'tests', 'contracts', 'fixtures');
const allowMutations = process.env.ZOHO_CONTRACT_ALLOW_MUTATIONS === 'true';

const requiredEnv = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing ${key}`);
    process.exit(1);
  }
}

const region = (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP' | undefined) ?? 'US';
const auth = new ZohoAuth({
  clientId: process.env.ZOHO_CLIENT_ID ?? '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
  region
});
const crm = new ZohoCRM({ auth, region });

const files = readdirSync(fixturesDir).filter((file) => file.endsWith('.json'));

async function main() {
  let failures = 0;

  for (const file of files) {
    const raw = readFileSync(join(fixturesDir, file), 'utf8');
    const fixture = JSON.parse(raw) as ContractFixture;

    if (!fixture.live?.enabled) {
      continue;
    }

    if (fixture.live.requiresMutation && !allowMutations) {
      console.log(`skipping ${fixture.name} (mutations disabled)`);
      continue;
    }

    const resolvedFixture = resolveFixtureEnv(fixture);

    try {
      const actual = await executeLive(resolvedFixture);
      const matches = compareSubset(resolvedFixture.response, actual);
      if (!matches) {
        failures += 1;
        console.error(`fixture mismatch: ${fixture.name}`);
      } else {
        console.log(`ok: ${fixture.name}`);
      }
    } catch (error) {
      failures += 1;
      console.error(`failed: ${fixture.name}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    process.exit(1);
  }
}

function resolveFixtureEnv(fixture: ContractFixture): ContractFixture {
  if (!fixture.live?.env) {
    return fixture;
  }

  const envMap = fixture.live.env;
  const input = { ...fixture.input } as Record<string, unknown>;
  const request = { ...fixture.request } as ContractFixture['request'];

  for (const [key, envName] of Object.entries(envMap)) {
    const value = process.env[envName];
    if (!value) {
      throw new Error(`Missing env var ${envName} for fixture ${fixture.name}`);
    }
    const placeholder = input[key];
    input[key] = value;

    if (typeof placeholder === 'string') {
      if (request.path?.includes(placeholder)) {
        request.path = request.path.replace(placeholder, value);
      }
      if (request.params) {
        request.params = replacePlaceholders(request.params, placeholder, value);
      }
      if (request.body) {
        request.body = replacePlaceholders(request.body, placeholder, value);
      }
    }
  }

  return { ...fixture, input, request };
}

async function executeLive(fixture: ContractFixture) {
  const { request } = fixture;
  const response = await crm.http.request({
    method: request.method,
    path: request.path,
    params: request.params,
    body: request.body
  });

  return response.data;
}

function compareSubset(expected: unknown, actual: unknown): boolean {
  if (expected === undefined) {
    return true;
  }
  if (expected === null || typeof expected !== 'object') {
    return expected === actual;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return false;
    }
    if (expected.length > actual.length) {
      return false;
    }
    return expected.every((value, index) => compareSubset(value, actual[index]));
  }
  if (!actual || typeof actual !== 'object') {
    return false;
  }

  for (const [key, value] of Object.entries(expected as Record<string, unknown>)) {
    if (!(key in (actual as Record<string, unknown>))) {
      return false;
    }
    if (!compareSubset(value, (actual as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

function replacePlaceholders<T>(value: T, placeholder: string, replacement: string): T {
  if (typeof value === 'string') {
    return (value === placeholder ? replacement : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => replacePlaceholders(entry, placeholder, replacement)) as T;
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = replacePlaceholders(entry, placeholder, replacement);
  }
  return output as T;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
