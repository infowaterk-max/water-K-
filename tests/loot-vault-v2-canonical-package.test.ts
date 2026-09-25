import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import {LOOT_VAULT_V2_TEMPLATE_PACKAGE,LOOT_VAULT_V2_TEMPLATE_VERSION} from '@/lib/builder/templates/gaming/loot-vault/v2';
import {LOOT_VAULT_V2_QUALITY_MANIFEST,STOREFRONT_TEMPLATE_QUALITY_CANDIDATES} from '@/lib/builder/storefront-template-quality-candidates';
import {evaluateStorefrontTemplateQualityGate} from '@/lib/builder/storefront-template-quality-gate';

describe('Loot Vault v2 canonical package authority',()=>{
  it('owns exactly the canonical 14-page gaming.loot-vault@2 package',()=>{
    expect(LOOT_VAULT_V2_TEMPLATE_VERSION).toBe(2);
    expect(LOOT_VAULT_V2_TEMPLATE_PACKAGE.manifest.templateKey).toBe('gaming.loot-vault');
    expect(LOOT_VAULT_V2_TEMPLATE_PACKAGE.manifest.templateVersion).toBe(2);
    expect(LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.map(page=>page.pageType))).toEqual(new Set(STOREFRONT_PAGE_TYPES));
    expect(LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.every(page=>page.templateKey==='gaming.loot-vault'&&page.templateVersion===2)).toBe(true);
  });

  it('is registered only as a QA candidate with the full 14x3 quality contract',()=>{
    expect(LOOT_VAULT_V2_QUALITY_MANIFEST.status).toBe('candidate');
    expect(LOOT_VAULT_V2_QUALITY_MANIFEST.golden.required).toBe(false);
    expect(LOOT_VAULT_V2_QUALITY_MANIFEST.pageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect(LOOT_VAULT_V2_QUALITY_MANIFEST.viewports).toHaveLength(3);
    expect(STOREFRONT_TEMPLATE_QUALITY_CANDIDATES).toContainEqual(expect.objectContaining({
      template:LOOT_VAULT_V2_TEMPLATE_PACKAGE,
      manifest:LOOT_VAULT_V2_QUALITY_MANIFEST,
    }));
    expect(evaluateStorefrontTemplateQualityGate({
      template:LOOT_VAULT_V2_TEMPLATE_PACKAGE,
      manifest:LOOT_VAULT_V2_QUALITY_MANIFEST,
    })).toEqual({ok:true,issues:[]});
  });

  it('keeps the public package index independent from legacy Loot Vault sources',()=>{
    const source=readFileSync('src/lib/builder/templates/gaming/loot-vault/v2/index.ts','utf8');
    expect(source).toContain("canonical-package.json");
    expect(source).not.toContain("templates/loot-vault'");
    expect(source).not.toContain('loot-vault-v2-pages');
    expect(source).not.toContain('wave39');
  });
});
