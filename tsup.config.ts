import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/entry/core.ts',
    'modules/leads': 'src/entry/leads.ts',
    'modules/contacts': 'src/entry/contacts.ts',
    'modules/deals': 'src/entry/deals.ts',
    'modules/webhooks': 'src/entry/webhooks.ts',
    'modules/bulk': 'src/entry/bulk.ts',
    'experimental/index': 'src/experimental/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
  splitting: false
});
