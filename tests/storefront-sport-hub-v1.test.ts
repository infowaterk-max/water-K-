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

  it('keeps the retired legacy SPORT HUB source outside the canonical v1 entrypoint',()=>{
    const serialized=JSON.stringify(SPORT_HUB_V1_TEMPLATE_PACKAGE);
    expect(serialized).not.toContain('src/lib/builder/templates/sport-hub.ts');
  });
  it('keeps large 12-column grids bounded on mobile and excludes full-page reference screenshots from content media',()=>{
    const largeGapGrids=SPORT_HUB_V1_TEMPLATE_PACKAGE.pages.flatMap(page=>walk(page.sections).filter(node=>node.componentKey==='layout.grid'&&node.config.gap==='l'));
    expect(largeGapGrids).toHaveLength(10);
    for(const grid of largeGapGrids)expect(grid.config.style?.mobile?.gap).toBe('1rem');
    const serialized=JSON.stringify(SPORT_HUB_V1_TEMPLATE_PACKAGE);
    expect(serialized).not.toMatch(/\/media-(10|11|12|13|14)\.webp/);
  });

});
