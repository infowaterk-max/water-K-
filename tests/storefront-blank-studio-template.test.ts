import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {evaluateStorefrontTemplateCapabilityGate} from '@/lib/builder/storefront-template-installation';
import {evaluateStorefrontTemplateQualityGate} from '@/lib/builder/storefront-template-quality-gate';
import {BLANK_STUDIO_QUALITY_MANIFEST,resolveStorefrontTemplateQualityCandidate} from '@/lib/builder/storefront-template-quality-candidates';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {
  STOREFRONT_SYSTEM_TEMPLATE_CATALOG,
  STOREFRONT_TEMPLATE_CATALOG,
  STOREFRONT_TEMPLATE_PORTFOLIO_STATUS,
  getStorefrontTemplatePackage,
} from '@/lib/builder/storefront-template-catalog';
import {listStorefrontTemplateLibraryEntries} from '@/lib/builder/storefront-template-library';
import {getStorefrontTemplatePreviewTheme} from '@/lib/builder/storefront-template-preview-demo';
import {getStorefrontCookieConsentPreset} from '@/lib/builder/storefront-cookie-consent-presets';
import {
  BLANK_STUDIO_DESIGN_TOKENS,
  BLANK_STUDIO_HOME_PAGE,
  BLANK_STUDIO_TEMPLATE_KEY,
  BLANK_STUDIO_TEMPLATE_PACKAGE,
  BLANK_STUDIO_TEMPLATE_VERSION,
} from '@/lib/builder/templates/system/blank-studio';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const nodes=(root:readonly StorefrontComponentNode[])=>{
  const result:StorefrontComponentNode[]=[];
  const visit=(node:StorefrontComponentNode)=>{result.push(node);for(const child of node.children??[])visit(child);};
  for(const node of root)visit(node);
  return result;
};
const page=(type:string)=>BLANK_STUDIO_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===type)!;
const keys=(type:string)=>nodes(page(type).sections).map(node=>node.componentKey);

describe('VX Blank Studio system template',()=>{
  it('keeps Blank Studio outside the curated 42-template portfolio while remaining resolvable',()=>{
    expect(BLANK_STUDIO_TEMPLATE_KEY).toBe('system.blank-studio');
    expect(BLANK_STUDIO_TEMPLATE_VERSION).toBe(1);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.launchTarget).toBe(42);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.implemented).toBe(STOREFRONT_TEMPLATE_CATALOG.length);
    expect(STOREFRONT_TEMPLATE_CATALOG.some(item=>item.templateKey===BLANK_STUDIO_TEMPLATE_KEY)).toBe(false);
    expect(STOREFRONT_SYSTEM_TEMPLATE_CATALOG.some(item=>item.templateKey===BLANK_STUDIO_TEMPLATE_KEY)).toBe(true);
    expect(getStorefrontTemplatePackage(BLANK_STUDIO_TEMPLATE_KEY)?.manifest.templateKey).toBe(BLANK_STUDIO_TEMPLATE_KEY);
  });

  it('owns explicit Template Factory quality authority instead of bypassing the matrix',()=>{
    const registration=resolveStorefrontTemplateQualityCandidate(BLANK_STUDIO_TEMPLATE_KEY,BLANK_STUDIO_TEMPLATE_VERSION);
    expect(registration?.manifest).toBe(BLANK_STUDIO_QUALITY_MANIFEST);
    expect(BLANK_STUDIO_QUALITY_MANIFEST.pageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect(BLANK_STUDIO_QUALITY_MANIFEST.viewports).toEqual(['desktop','tablet','mobile']);
    expect(BLANK_STUDIO_QUALITY_MANIFEST.sourcePrefixes).toContain('src/lib/builder/templates/system/blank-studio.ts');
    const result=evaluateStorefrontTemplateQualityGate({template:BLANK_STUDIO_TEMPLATE_PACKAGE,manifest:BLANK_STUDIO_QUALITY_MANIFEST});
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('ships exactly the canonical 14-page matrix with no duplicate page types',()=>{
    expect(BLANK_STUDIO_TEMPLATE_PACKAGE.pages).toHaveLength(STOREFRONT_PAGE_TYPES.length);
    expect(BLANK_STUDIO_TEMPLATE_PACKAGE.manifest.pageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect(new Set(BLANK_STUDIO_TEMPLATE_PACKAGE.pages.map(item=>item.pageType)).size).toBe(STOREFRONT_PAGE_TYPES.length);
    expect(new Set(BLANK_STUDIO_TEMPLATE_PACKAGE.pages.map(item=>item.pageType))).toEqual(new Set(STOREFRONT_PAGE_TYPES));
  });

  it('keeps Home intentionally minimal and optional engines out of the template',()=>{
    expect(BLANK_STUDIO_HOME_PAGE.sections.map(section=>section.componentKey)).toEqual(['system.header','layout.section','layout.section']);
    expect(nodes(BLANK_STUDIO_HOME_PAGE.sections).map(node=>node.componentKey)).toContain('editorial.footer');
    expect(keys('home')).toContain('content.heading');
    expect(keys('home')).toContain('content.text');
    const serialized=JSON.stringify(BLANK_STUDIO_TEMPLATE_PACKAGE);
    expect(serialized).not.toContain('commerce.interactive-scene');
    expect(serialized).not.toContain('guided.finder');
    expect(serialized).not.toContain('configurator.');
  });

  it('materializes a browser-proof neutral shell for touch and responsive safety',()=>{
    const headerNode=BLANK_STUDIO_HOME_PAGE.sections[0];
    const navNode=headerNode.children?.[0];
    expect(headerNode.config.brandStyle).toMatchObject({minHeight:'2rem'});
    expect(navNode?.config.styleSlots).toMatchObject({item:{minHeight:'2rem'}});
    expect(BLANK_STUDIO_HOME_PAGE.sections.at(-1)?.componentKey).toBe('layout.section');
    expect(BLANK_STUDIO_HOME_PAGE.sections.at(-1)?.children?.[0]?.componentKey).toBe('editorial.footer');
    const productLayout=nodes(page('product').sections).find(node=>node.id==='blank-product-grid');
    expect(productLayout?.config.gap).toBe('xs');
  });

  it('keeps commerce-critical pages operational instead of placeholder-only',()=>{
    expect(keys('catalog')).toEqual(expect.arrayContaining(['commerce.collection-header','commerce.product-grid']));
    expect(keys('product')).toEqual(expect.arrayContaining(['commerce.product-gallery','commerce.product-info','commerce.variant-swatches','content.button']));
    expect(keys('search')).toContain('commerce.product-grid');
    expect(keys('cart')).toContain('commerce.cart-summary');
    expect(keys('checkout')).toContain('commerce.checkout-summary');
  });

  it('uses the normal capability/page validator for every Blank Studio page',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:BLANK_STUDIO_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    for(const document of BLANK_STUDIO_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(document,registry,capability);
      expect(result.ok,document.pageType+': '+JSON.stringify(result.violations)).toBe(true);
    }
  });

  it('has no implicit demo catalog and has explicit neutral theme and cookie authorities',()=>{
    expect(BLANK_STUDIO_TEMPLATE_PACKAGE.demoFixtures).toEqual([]);
    expect(getStorefrontTemplatePreviewTheme(BLANK_STUDIO_TEMPLATE_KEY)).toMatchObject(BLANK_STUDIO_DESIGN_TOKENS);
    const cookie=getStorefrontCookieConsentPreset(BLANK_STUDIO_TEMPLATE_KEY);
    expect(cookie?.presetId).toBe('blank-studio-cookie');
    expect(cookie?.fallback.accent).toBe('#b88716');
  });

  it('appears in the merchant library as a system starting point',()=>{
    const entry=listStorefrontTemplateLibraryEntries().find(item=>item.templateKey===BLANK_STUDIO_TEMPLATE_KEY);
    expect(entry).toBeTruthy();
    expect(entry?.category).toBe('system');
    expect(entry?.categoryLabel).toContain('Üres');
    expect(entry?.description).toMatch(/semleges/i);
    expect(entry?.highlights).toContain('Teljes 14 oldalas működő webshop-alap');
    expect(entry?.demoProductCount).toBe(0);
  });
});
