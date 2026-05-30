import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: ['src/index.ts'],
      // Thresholds reintroduced in Phase 1 once real domain code exists.
      // Target: lines 80, functions 80, branches 75.
    },
  },
});
