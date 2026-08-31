import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { communicationTemplates } from '../src/lib/communication/templates';

const tenantFacingRuntimeFiles = [
  'src/lib/communication/identity.ts',
  'src/lib/communication/preview.ts',
  'src/lib/communication/templates.ts',
  'src/app/layout.tsx',
  'src/app/sitemap.ts',
  'src/app/kapcsolat/page.tsx',
  'src/app/gyik/page.tsx',
  'src/app/aszf/page.tsx',
  'src/app/adatvedelem/page.tsx',
  'src/app/szallitas-es-fizetes/page.tsx',
  'src/app/webaruhaz/page.tsx',
  'src/app/termek/[slug]/page.tsx',
  'src/app/kosar/page.tsx',
  'src/app/penztar/page.tsx',
  'src/app/rendeles-sikeres/page.tsx',
  'src/components/cart/cart-view.tsx',
  'src/components/checkout/checkout-form.tsx',
  'src/lib/catalog-server.ts',
];

const forbiddenReferenceShopPatterns = [
  /Water-K/i,
  /water-k-native/i,
  /info\.waterk/i,
  /WK-(?:040|750|25K)/i,
];

describe('white-label tenant runtime', () => {
  it.each(tenantFacingRuntimeFiles)('%s does not leak reference-shop identity or SKU assumptions', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    for (const pattern of forbiddenReferenceShopPatterns) expect(source).not.toMatch(pattern);
  });

  it('keeps communication subjects brand-neutral before runtime branding', () => {
    for (const template of communicationTemplates) {
      expect(template.subject).not.toMatch(/Water-K/i);
      expect(template.subject.trim().length).toBeGreaterThan(0);
    }
  });
});
