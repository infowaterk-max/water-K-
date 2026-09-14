import {describe,expect,it} from 'vitest';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontBuilderPresetLibrary} from '@/lib/builder/storefront-preset-application';
import {createStorefrontPresetBundle,materializeStorefrontSectionPreset} from '@/lib/builder/storefront-presets';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {getStorefrontTemplatePackage,STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {PLAYROOM_V18_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v18';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,PLAYROOM_V19_CANONICAL_TEMPLATE_VERSION} from '@/lib/builder/templates/playroom-v19-canonical';

const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const page=(type:string)=>PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===type)!;
const sectionIds=(type:string)=>page(type).sections.map(item=>item.id);

const expectedSections:Record<string,readonly string[]>={
  catalog:['playroom-catalog-hero','playroom-catalog-platform-presets','playroom-catalog-products','playroom-catalog-discovery-presets'],
  product:['playroom-product-main','playroom-product-confidence','playroom-product-facts','playroom-product-story-preset','playroom-product-recommendations'],
  search:['playroom-search-hero','playroom-search-body','playroom-search-shortcuts'],
  cart:['playroom-cart-intro','playroom-cart-body','playroom-cart-recommendation-preset','playroom-cart-trust-preset'],
  checkout:['playroom-checkout-intro','playroom-checkout-progress-preset','playroom-checkout-body'],
  account:['playroom-account-hero','playroom-account-navigation-presets'],
  content:['playroom-content-feature-preset','playroom-content-body-preset'],
  'blog-index':['playroom-blog-index-feature-preset','playroom-blog-index-body','playroom-blog-index-topic-presets'],
  'blog-article':['playroom-blog-article-hero','playroom-blog-article-body-preset'],
  faq:['playroom-faq-hero','playroom-faq-questions-preset','playroom-faq-help-cta-preset'],
  contact:['playroom-contact-hero','playroom-contact-options-preset'],
  legal:['playroom-legal-intro','playroom-legal-reading-preset'],
  'not-found':['playroom-not-found-hero-preset'],
};

describe('Playroom v19 full page family + section presets',()=>{
  it('publishes one coherent v19 package across all 14 canonical page types',()=>{
    expect(PLAYROOM_V19_CANONICAL_TEMPLATE_VERSION).toBe(19);
    expect(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.manifest.templateVersion).toBe(19);
    expect(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.map(item=>item.pageType))).toEqual(new Set(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.manifest.pageTypes));
    expect(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.every(item=>item.templateVersion===19)).toBe(true);
    expect(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.every(item=>item.metadata?.pageFamilyVisualLanguage==='accepted-playroom-v18-home')).toBe(true);
    expect(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.every(item=>item.metadata?.canonicalUpgradeFromTemplateVersion===18)).toBe(true);
  });

  it('does not redesign the already accepted home while carrying it into the v19 package',()=>{
    const v18Home=PLAYROOM_V18_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='home')!;
    const v19Home=page('home');
    expect(v19Home.sections.map(item=>item.id)).toEqual(v18Home.sections.map(item=>item.id));
    expect(v19Home.metadata?.homeAcceptedFromVersion).toBe(18);
  });

  it('gives every formerly generic/non-home page a real page-purpose composition',()=>{
    for(const[type,ids]of Object.entries(expectedSections)){
      const actual=new Set(sectionIds(type));
      for(const id of ids)expect(actual.has(id),`${type}:${id}`).toBe(true);
    }
    expect(page('checkout').metadata?.checkoutPresentation).toBe('accordion-dropdown');
    expect(page('checkout').metadata?.checkoutFlow).toEqual(['cart','shipping','payment','summary']);
    expect(page('product').metadata?.pdpGrid).toBe('desktop-tablet-7-5-mobile-12-12');
  });

  it('keeps the commerce truth-bound nodes instead of replacing them with static visual mockups',()=>{
    const requiredBindings=[
      ['catalog','playroomCatalogGrid','catalog.existingCommerceProducts'],
      ['product','playroom-product-gallery','product.gallery'],
      ['product','playroom-product-info','pricing.displayPrice'],
      ['product','playroom-product-compatibility','compatibility.productEvidence'],
      ['search','playroomSearchResults','catalog.existingCommerceProducts'],
      ['cart','playroom-cart-summary','cart.lines'],
      ['checkout','playroom-checkout-summary','cart.total'],
    ] as const;
    for(const[type,id,path]of requiredBindings){
      const target=walk(page(type).sections).find(item=>item.id===id);
      expect(target,`${type}:${id}`).toBeTruthy();
      expect(Object.values(target?.bindings??{}).some(binding=>binding.path===path),`${id}:${path}`).toBe(true);
    }
    expect(JSON.stringify(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE)).not.toMatch(/fixedPrice|stockCount|payment_secret|merchantId|callbackUrl|paymentStatus/i);
  });

  it('materializes section presets from the finished page family instead of a separate hardcoded preset authority',()=>{
    const bundle=createStorefrontPresetBundle(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE);
    expect(bundle.templateVersion).toBe(19);
    expect(bundle.pagePresets).toHaveLength(14);

    for(const sourcePage of PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages){
      const raw=bundle.sectionPresets.filter(item=>item.pageKey===sourcePage.pageKey);
      expect(raw).toHaveLength(sourcePage.sections.length);
      for(const preset of raw){
        const materialized=materializeStorefrontSectionPreset(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,preset);
        expect(materialized.id).toBe(preset.nodeId);
      }

      const builderLibrary=createStorefrontBuilderPresetLibrary(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,sourcePage);
      const expectedInsertable=sourcePage.sections.filter(item=>item.componentKey==='layout.section').length;
      expect(builderLibrary.sectionPresets.length,sourcePage.pageKey).toBe(expectedInsertable);
      expect(builderLibrary.sectionPresets.every(item=>item.fragment.componentKey==='layout.section')).toBe(true);
    }
  });

  it('keeps every v19 page valid through the shared Visual Builder registry with unique node ids',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    for(const sourcePage of PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages){
      const ids=walk(sourcePage.sections).map(item=>item.id);
      expect(new Set(ids).size,sourcePage.pageKey).toBe(ids.length);
      const validation=validateStorefrontPageDocument(sourcePage,registry);
      expect(validation.violations.filter(item=>item.severity==='error'),sourcePage.pageKey).toEqual([]);
    }
  });

  it('keeps v19 exactly resolvable as historical authority while v20 is the single merchant-facing Playroom',()=>{
    const catalog=STOREFRONT_TEMPLATE_CATALOG.filter(item=>item.templateKey==='gaming.playroom');
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.templateVersion).toBe(20);
    expect(getStorefrontTemplatePackage('gaming.playroom')?.manifest.templateVersion).toBe(20);
    expect(getStorefrontTemplatePackage('gaming.playroom',18)?.manifest.templateVersion).toBe(18);
    expect(getStorefrontTemplatePackage('gaming.playroom',19)?.manifest.templateVersion).toBe(19);
    expect(getStorefrontTemplatePackage('gaming.playroom',19)?.pages).toEqual(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages);
  });
});
