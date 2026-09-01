import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { communicationTemplates } from '../src/lib/communication/templates';

const forbiddenCustomerSpecificPatterns = [
  /Water-K/i,
  /water-k-native/i,
  /info\.waterk/i,
  /WK-(?:040|750|25K)/i,
];

const runtimeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']);

// Security/quality detector scripts intentionally contain the forbidden literals
// they are responsible for finding. They are not customer-facing runtime code and
// are validated through their own CI guards instead of this source-literal scan.
const detectorScriptExceptions = new Set([
  'scripts/validate-customer-baseline.mjs',
  'scripts/review-customer-baseline-snapshot.mjs',
]);

function collectRuntimeFiles(root: string): string[] {
  const absolute = resolve(process.cwd(), root);
  if (statSync(absolute).isFile()) return [root];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${root}/${entry.name}`;
    if (entry.isDirectory()) return collectRuntimeFiles(relative);
    return runtimeExtensions.has(extname(entry.name)) ? [relative] : [];
  });
}

const tenantRuntimeFiles = [
  ...collectRuntimeFiles('src'),
  ...collectRuntimeFiles('scripts'),
  '.env.example',
  'README.md',
  'next.config.ts',
  'vercel.json',
].filter((file) => !detectorScriptExceptions.has(file));

describe('Shoperation customer-neutral runtime', () => {
  it.each(tenantRuntimeFiles)('%s does not leak customer-specific identity or SKU assumptions', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    for (const pattern of forbiddenCustomerSpecificPatterns) expect(source).not.toMatch(pattern);
  });

  it('keeps communication subjects brand-neutral before runtime branding', () => {
    for (const template of communicationTemplates) {
      expect(template.subject).not.toMatch(/Water-K/i);
      expect(template.subject.trim().length).toBeGreaterThan(0);
    }
  });

  it('documents an Alap fail-closed deployment default', () => {
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');
    expect(envExample).toContain('WEBSHOP_DEFAULT_PLAN=alap');
    expect(envExample).not.toContain('WEBSHOP_DEFAULT_PLAN=pro');
  });
});
