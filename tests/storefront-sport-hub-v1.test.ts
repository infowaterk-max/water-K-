import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {getStorefrontTemplatePreviewTheme} from '@/lib/builder/storefront-template-preview-demo';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  SPORT_HUB_V1_DESIGN_TOKENS,
  SPORT_HUB_V1_TEMPLATE_PACKAGE,
  SPORT_HUB_V1_TEMPLATE_VERSION,
} from '@/lib/builder/templates/sport/sport-hub/v1';

const PAGE_TYPES=['home','catalog','product','cart','checkout','account','search','content','blog-index','blog-article','faq','contact','legal','not-found'] as const;
const capability={plan:'alap' as const,features:PLANS.alap.features};

const walk=(nodes:readonly any[],out:any[]=[])=>{
  for(const node of nodes){
    out.push(node);
    walk(node.children??[],out);
  }
  return out;
};

describe('SPORT HUB canonical v1 candidate',()=>{
  it('keeps one canonical 14-page package in PO-approved order',()=>{
    expect(SPORT_HUB_V1_TEMPLATE_VERSION).toBe(1);
    expect(SPORT_HUB_V1_TEMPLATE_PACKAGE.manifest.templateKey).toBe('sport.sport-hub');
    expect(SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(PAGE_TYPES);
    expect(SPORT_HUB_V1_TEMPLATE_PACKAGE.pages).toHaveLength(14);
  });

  it('validates every page against the shared Builder registry on Alap',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    for(const page of SPORT_HUB_V1_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps shared content disclosure scoped to Product and FAQ only',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const disclosure=registry.get('commerce.content-tabs',1);
    expect(disclosure?.manifest.pageTypes).toEqual(['product','faq']);

    const product=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='product')!;
    const faq=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='faq')!;
    expect(validateStorefrontPageDocument(product,registry,capability).ok).toBe(true);
    expect(validateStorefrontPageDocument(faq,registry,capability).ok).toBe(true);
  });

  it('uses the same canonical SPORT HUB design tokens in candidate preview',()=>{
    expect(getStorefrontTemplatePreviewTheme('sport.sport-hub')).toEqual(SPORT_HUB_V1_DESIGN_TOKENS);
  });

  it('ships only repo-owned approved media and leaves no Pexels placeholder behind',()=>{
    const serialized=JSON.stringify(SPORT_HUB_V1_TEMPLATE_PACKAGE);
    expect(serialized).not.toMatch(/pexels\.com|images\.pexels/i);
    const imageNodes=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.flatMap(page=>
      walk(page.sections).filter(node=>node.componentKey==='content.image')
    );
    const owned=imageNodes
      .map(node=>node.config.src)
      .filter((src):src is string=>typeof src==='string'&&src.startsWith('/storefront-demo/sport-hub-v1/'));
    expect(new Set(owned).size).toBeGreaterThanOrEqual(23);
  });

  it('keeps Contact on exactly one shared topic-first support wizard',()=>{
    const contact=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='contact')!;
    const nodes=walk(contact.sections);
    expect(nodes.filter(node=>node.componentKey==='support.contact-form')).toHaveLength(1);
    expect(contact.metadata?.contactUxContract).toBe('topic-first-desktop-explanation-mobile-accordion-single-selector');
    expect(JSON.stringify(contact)).not.toMatch(/sport-contact-topic-/);
  });

  it('keeps checkout provider-neutral and owned by shared E13 guided accordion runtime',()=>{
    const checkout=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(checkout.metadata?.checkoutPresentation).toBe('accordion-dropdown');
    expect(checkout.metadata?.checkoutFlow).toEqual(['cart','shipping','payment','summary']);
    expect(checkout.metadata?.checkoutUxContract).toBe('guided-accordion-owned-by-shared-e13-checkout-runtime-not-template-local');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl/i);
  });

  it('retains separate showroom-ready shipping and payment information authorities',()=>{
    const content=(SPORT_HUB_V1_TEMPLATE_PACKAGE.demoFixtures??[]).filter(item=>item.entityType==='content');
    const shipping=content.find(item=>item.entityKey==='page-szallitas');
    const payment=content.find(item=>item.entityKey==='page-fizetes');
    expect(shipping?.payload).toMatchObject({slug:'szallitas',showroomReady:true});
    expect(payment?.payload).toMatchObject({slug:'fizetes',showroomReady:true});
    expect(JSON.stringify(SPORT_HUB_V1_TEMPLATE_PACKAGE)).not.toMatch(/szallitas-es-fizetes|szállítás és fizetés/i);
  });

  it('keeps one canonical PO-approved SPORT HUB header across all 14 pages',()=>{
    const signatures=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.map(page=>JSON.stringify(page.sections[0]));
    expect(new Set(signatures).size).toBe(1);
    expect(SPORT_HUB_V1_TEMPLATE_PACKAGE.pages).toHaveLength(14);
  });

  it('keeps the Account/login shell on the PO-approved one-row SPORT HUB header',()=>{
    const account=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
    const header=account.sections.find(section=>section.componentKey==='system.commerce-header')!;
    const config=header.config as Record<string,any>;
    expect(config.presentation).toBe('commerce-single-tier');
    expect(config.logoUrl).toBe('/storefront-demo/sport-hub-v1/ui/sport-hub-logo.svg');
    expect(config.logoAlt).toBe('SPORT HUB – TÖBB, MINT FELSZERELÉS');
    expect(config.brandLabel).toBe('');
    expect(config.tagline).toBe('');
    expect(config.style?.color).toBe('#ffffff');
    expect(config.styleSlots?.searchFrame?.maxWidth).toBe('22rem');
    expect(config.styleSlots?.utilityItem?.color).toBe('#ffffff');
    const nav=header.children?.find(child=>child.componentKey==='system.navigation');
    const navConfig=nav?.config as Record<string,any>|undefined;
    expect(navConfig?.items?.map((item:any)=>item.label)).toEqual(['Sportok','Felszerelés','Márkák','Inspiráció','Segítség']);
  });

  it('keeps the PO-approved Home composition and functional sport profile controls',()=>{
    const home=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home')!;
    expect(home.sections.map(section=>section.id)).toEqual([
      'sport-hub-shell-header','sport-home-hero','sport-home-sports','sport-home-kit','sport-profile','sport-home-products','sport-home-editorial','sport-home-trust','sport-hub-shell-footer',
    ]);
    const nodes=walk(home.sections);
    const heroGrid=nodes.find(node=>node.id==='sport-home-hero-grid');
    expect(heroGrid?.children?.map((node:any)=>node.responsive?.desktop?.gridSpan)).toEqual([3,2,2,2,3]);
    const profile=nodes.find(node=>node.id==='sport-profile-fields');
    expect(profile?.componentKey).toBe('guided.finder');
    expect(profile?.config?.presentation).toBe('compact-select-row');
    expect(profile?.config?.options).toHaveLength(5);
    const productGrid=nodes.find(node=>node.id==='sport-home-products-grid');
    expect(productGrid?.config?.products).toHaveLength(6);
    expect(productGrid?.config?.showCta).toBe(true);
  });

  it('keeps one canonical SPORT HUB footer across all 14 pages',()=>{
    const signatures=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.map(page=>JSON.stringify(page.sections.at(-1)));
    expect(new Set(signatures).size).toBe(1);
    const footer=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages[0].sections.at(-1)!;
    const nodes=walk([footer]);
    expect(nodes.find(node=>node.id==='sport-hub-footer-logo')?.config?.src).toBe('/storefront-demo/sport-hub-v1/ui/sport-hub-logo.svg');
    expect(nodes.filter(node=>node.id?.startsWith('sport-hub-footer-col-')&&node.componentKey==='layout.stack')).toHaveLength(4);
    expect(nodes.some(node=>node.id==='sport-hub-footer-social'&&node.componentKey==='system.social-links')).toBe(true);
  });

  it('keeps the retired legacy SPORT HUB source outside the canonical v1 entrypoint',()=>{
    const serialized=JSON.stringify(SPORT_HUB_V1_TEMPLATE_PACKAGE);
    expect(serialized).not.toContain('src/lib/builder/templates/sport-hub.ts');
  });
  it('keeps the proven mobile grid repair and uses the shared FAQ accordion',()=>{
    const allNodes=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.flatMap(page=>walk(page.sections));
    const largeGapGrids=allNodes.filter(node=>node.componentKey==='layout.grid'&&node.config.gap==='l');
    expect(largeGapGrids).toHaveLength(10);
    for(const grid of largeGapGrids)expect(grid.config.style?.mobile?.gap).toBe('1rem');
    const faq=allNodes.find(node=>node.id==='sport-faq-questions');
    expect(faq?.componentKey).toBe('commerce.content-tabs');
    expect(faq?.config?.behavior?.mode).toBe('accordion');
    expect(faq?.config?.behavior).toMatchObject({allowCollapse:true});
    expect(faq?.config?.tabs).toHaveLength(6);
  });

  it('does not render full-page Visual First reference sheets as storefront media',()=>{
    const serialized=JSON.stringify(SPORT_HUB_V1_TEMPLATE_PACKAGE);
    expect(serialized).not.toMatch(/\/storefront-demo\/sport-hub-v1\/media-2[0-4]\.webp/);
    expect(serialized).toContain('/storefront-demo/sport-hub-v1/products/salomon-sense-ride-5.webp');
    expect(serialized).toContain('/storefront-demo/sport-hub-v1/ui/asset-43-contact-support.webp');
  });

});
