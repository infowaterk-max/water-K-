import {describe,expect,it} from 'vitest';
import {getStorefrontTemplatePackage,STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {listStorefrontTemplateLibraryEntries} from '@/lib/builder/storefront-template-library';
import {PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2';
import {PLAYROOM_V18_TEMPLATE_PACKAGE,PLAYROOM_V18_TEMPLATE_VERSION} from '@/lib/builder/templates/playroom-v18';

describe('Playroom canonical upgrade v2 -> v18',()=>{
  it('publishes the accepted fidelity implementation as a real v18 template identity',()=>{
    expect(PLAYROOM_V18_TEMPLATE_VERSION).toBe(18);
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.manifest.templateKey).toBe('gaming.playroom');
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.manifest.templateVersion).toBe(18);
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.pages.every(page=>page.templateVersion===18)).toBe(true);
    expect(PLAYROOM_V18_TEMPLATE_PACKAGE.pages.every(page=>page.metadata?.canonicalUpgradeFromTemplateVersion===2)).toBe(true);
  });

  it('exposes only v18 in Template Library while retaining historical v2 for exact-version Builder resolution',()=>{
    const catalogEntries=STOREFRONT_TEMPLATE_CATALOG.filter(item=>item.templateKey==='gaming.playroom');
    expect(catalogEntries).toHaveLength(1);
    expect(catalogEntries[0]?.templateVersion).toBe(18);

    const libraryEntries=listStorefrontTemplateLibraryEntries().filter(item=>item.templateKey==='gaming.playroom');
    expect(libraryEntries).toHaveLength(1);
    expect(libraryEntries[0]?.templateVersion).toBe(18);

    const historicalV2=getStorefrontTemplatePackage('gaming.playroom',2);
    expect(historicalV2?.manifest.templateVersion).toBe(2);
    expect(historicalV2?.pages.every(page=>page.templateVersion===2)).toBe(true);
    expect(historicalV2?.pages[0]?.templateKey).toBe(PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE.pages[0]?.templateKey);
  });

  it('resolves v18 as latest so an installed v2 storefront is detected as upgradeable by the existing version comparison',()=>{
    const latest=getStorefrontTemplatePackage('gaming.playroom');
    expect(latest?.manifest.templateVersion).toBe(18);
    expect(getStorefrontTemplatePackage('gaming.playroom',18)?.manifest.templateVersion).toBe(18);
    expect((latest?.manifest.templateVersion??0)>2).toBe(true);
  });
});
