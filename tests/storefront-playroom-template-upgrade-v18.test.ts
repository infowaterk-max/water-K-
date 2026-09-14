import {describe,expect,it} from 'vitest';
import {getStorefrontTemplatePackage,STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {listStorefrontTemplateLibraryEntries} from '@/lib/builder/storefront-template-library';
import {PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2';
import {PLAYROOM_V18_TEMPLATE_PACKAGE,PLAYROOM_V18_TEMPLATE_VERSION} from '@/lib/builder/templates/playroom-v18';

// Historical regression guard: v2 and v18 remain exactly resolvable after later Playroom upgrades.
describe('Playroom historical v18 identity',()=>{
  it('preserves the accepted home-fidelity release as real v18',()=>{
    expect(PLAYROOM_V18_TEMPLATE_VERSION).toBe(18);
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.manifest.templateKey).toBe('gaming.playroom');
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.manifest.templateVersion).toBe(18);
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.pages.every(page=>page.templateVersion===18)).toBe(true);
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.pages.every(page=>page.metadata?.canonicalUpgradeFromTemplateVersion===2)).toBe(true);
  });

  it('keeps v2 and v18 resolvable without exposing either as a duplicate Template Library card',()=>{
    const catalogEntries=STOREFRONT_TEMPLATE_CATALOG.filter(item=>item.templateKey==='gaming.playroom');
    expect(catalogEntries).toHaveLength(1);
    expect(catalogEntries[0]?.templateVersion).toBeGreaterThan(18);

    const libraryEntries=listStorefrontTemplateLibraryEntries().filter(item=>item.templateKey==='gaming.playroom');
    expect(libraryEntries).toHaveLength(1);
    expect(libraryEntries[0]?.templateVersion).toBeGreaterThan(18);

    const historicalV2=getStorefrontTemplatePackage('gaming.playroom',2);
    expect(historicalV2?.manifest.templateVersion).toBe(2);
    expect(historicalV2?.pages.every(page=>page.templateVersion===2)).toBe(true);
    expect(historicalV2?.pages[0]?.templateKey).toBe(PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE.pages[0]?.templateKey);

    const historicalV18=getStorefrontTemplatePackage('gaming.playroom',18);
    expect(historicalV18?.manifest.templateVersion).toBe(18);
    expect(historicalV18?.pages.every(page=>page.templateVersion===18)).toBe(true);
  });
});
