import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: ['default', 'json'],
    outputFile: { json: 'artifacts/test-results.json' },
  },
});
