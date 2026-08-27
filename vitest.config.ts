import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: ['default', 'json'],
    outputFile: { json: 'artifacts/test-results.json' },
  },
});
