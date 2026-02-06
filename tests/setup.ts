import { afterAll, beforeAll } from 'vitest';

beforeAll(() => {
  console.log('[vitest] starting test run');
});

afterAll(() => {
  console.log('[vitest] finished test run');
});
