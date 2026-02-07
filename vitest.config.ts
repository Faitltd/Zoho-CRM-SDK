import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/entry/**',
        'src/experimental/**',
        'src/types/**',
        'src/**/index.ts',
        'src/stability.ts',
        'src/auth/types.ts',
        'src/http/types.ts'
      ]
    }
  }
});
