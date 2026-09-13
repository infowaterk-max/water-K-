import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'tests/storefront-commerce-fidelity-slots.test.tsx',
      'tests/storefront-fidelity-primitive-renderers.test.tsx',
      'tests/storefront-guided-fidelity-slots.test.tsx',
      'tests/storefront-shared-content-fidelity.test.tsx',
    ],
    reporters: ['default', 'json'],
    outputFile: { json: 'artifacts/test-results.json' },
  },
});