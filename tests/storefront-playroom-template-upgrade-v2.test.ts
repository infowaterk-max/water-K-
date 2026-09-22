import {describe,expect,it} from 'vitest';
import {getStorefrontTemplatePackage,STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {PLAYROOM_TEMPLATE_PACKAGE,PLAYROOM_TEMPLATE_VERSION} from '@/lib/builder/templates/playroom';
import {PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE,PLAYROOM_REFERENCE_V2_TEMPLATE_VERSION} from '@/lib/builder/templates/playroom-reference-v2';

describe('Playroom historical reference fidelity v2',()=>{
  it('preserves the historical v1 source package and the accepted v2 upgrade package',()=>{
    expect(PLAYROOM_TEMPLATE_VERSION).toBe(1);
    expect(PLAYROOM_TEMPLATE_PACKAGE.manifest.templateVersion).toBe(1);
    expect(PLAYROOM_REFERENCE_V2_TEMPLATE_VERSION).toBe(2);
    expect(PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE.manifest.templateKey).toBe('gaming.playroom');
    expect(PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE.manifest.templateVersion).toBe(2);
    expect(PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE.pages.every(page=>page.templateVersion===2)).toBe(true);
  });

  it('keeps v2 exactly resolvable while allowing a newer catalog version to become latest',()=>{
    const entry=STOREFRONT_TEMPLATE_CATALOG.find(item=>item.templateKey==='gaming.playroom');
    expect(entry?.templateVersion).toBeGreaterThan(2);
    const latest=getStorefrontTemplatePackage('gaming.playroom');
    expect(latest?.manifest.templateVersion).toBeGreaterThan(2);
    expect(getStorefrontTemplatePackage('gaming.playroom',2)?.pages[0]?.metadata?.referenceFidelityRelease).toBe('playroom-v2');
  });

  it('keeps the accepted reference authority on every historical v2 page without creating new commerce authority',()=>{
    for(const page of PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE.pages){
      expect(page.metadata?.visualAuthority).toBe('Neon Gamer Webáruház Kezdőlap');
      expect(page.metadata?.canonicalUpgradeFromTemplateVersion).toBe(1);
    }
    const source=JSON.stringify(PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE);
    expect(source).not.toMatch(/releaseDate|reviewScore|platformSupport|fixedPrice|stockCount|payment_secret|merchantId/i);
  });
});
