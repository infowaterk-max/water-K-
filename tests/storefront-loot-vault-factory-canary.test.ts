import {describe,expect,it} from 'vitest';
import {buildStorefrontTemplateFromFactory,evaluateStorefrontFactoryReadiness} from '@/lib/builder/storefront-template-factory';
import {LOOT_VAULT_FACTORY_DEFINITION} from '@/lib/builder/templates/loot-vault-factory-definition';

describe('Loot Vault Template Factory canary',()=>{
  it('freezes the accepted reference before media generation begins',()=>{
    expect(LOOT_VAULT_FACTORY_DEFINITION.reference).toMatchObject({
      referenceKey:'gaming.loot-vault.accepted-reference-2026-09-06',
      minimumRepresentativeMedia:14,
      forbidPlaceholderSvg:true,
    });
    expect(LOOT_VAULT_FACTORY_DEFINITION.dna.character).toBe('warm-cinematic-fandom-collector-storefront');
    expect(LOOT_VAULT_FACTORY_DEFINITION.reference.mediaRequirements).toEqual(expect.arrayContaining([
      expect.objectContaining({role:'hero',minCount:1,aspectRatio:'16:9'}),
      expect.objectContaining({role:'category',minCount:6,aspectRatio:'4:5'}),
      expect.objectContaining({role:'product',minCount:4,aspectRatio:'4:5'}),
      expect.objectContaining({role:'editorial',minCount:2,aspectRatio:'3:2'}),
    ]));
  });

  it('generates the full 14-page working foundation from the shared factory',()=>{
    const template=buildStorefrontTemplateFromFactory(LOOT_VAULT_FACTORY_DEFINITION);
    expect(template.pages).toHaveLength(14);
    expect(template.pages.find(page=>page.pageType==='catalog')?.metadata?.factoryRole).toBe('shared-catalog');
    expect(template.pages.find(page=>page.pageType==='product')?.metadata?.factoryRole).toBe('shared-pdp');
    expect(template.pages.find(page=>page.pageType==='cart')?.metadata?.factoryRole).toBe('shared-cart');
    expect(template.pages.find(page=>page.pageType==='checkout')?.metadata?.factoryRole).toBe('shared-checkout');
  });

  it('fails closed for Product Owner review until the representative media pack exists',()=>{
    const readiness=evaluateStorefrontFactoryReadiness(LOOT_VAULT_FACTORY_DEFINITION);
    expect(readiness.productOwnerReady).toBe(false);
    expect(readiness.representativeMediaComplete).toBe(false);
    expect(readiness.reasons).toContain('representative-media-count');
    expect(readiness.reasons).toEqual(expect.arrayContaining([
      'missing-media-role:hero',
      'missing-media-role:category',
      'missing-media-role:product',
      'missing-media-role:editorial',
    ]));
  });
});
