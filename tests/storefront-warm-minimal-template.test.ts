import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {
  WARM_MINIMAL_ENGINE_CONTRACT,
  WARM_MINIMAL_HOME_PAGE,
  WARM_MINIMAL_HOME_SECTION_ORDER,
  WARM_MINIMAL_MARKETING_LAYER_CONTRACT,
  WARM_MINIMAL_PRODUCT_PAGE,
  WARM_MINIMAL_ROOM_LABELS,
  WARM_MINIMAL_TEMPLATE_KEY,
  WARM_MINIMAL_TEMPLATE_PACKAGE,
  WARM_MINIMAL_TEMPLATE_VERSION,
  WARM_MINIMAL_VISUAL_DNA,
} from '@/lib/builder/templates/warm-minimal';
import {STOREFRONT_TEMPLATE_PORTFOLIO_STATUS,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {createStorefrontStoryVisualComponentRegistry} from '@/lib/builder/storefront-story-visual';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const componentRegistry=()=>createStorefrontStoryVisualComponentRegistry();
function walk(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]{return nodes.flatMap(node=>[node,...walk(node.children??[])]);}
const findNode=(page:{sections:StorefrontComponentNode[]},id:string)=>walk(page.sections).find(node=>node.id===id);

describe('Storefront portfolio package 25 — Warm Minimal',()=>{
  it('locks the accepted Warm Minimal identity without reusing an existing package',()=>{
    expect(WARM_MINIMAL_TEMPLATE_KEY).toBe('home.warm-minimal');
    expect(WARM_MINIMAL_TEMPLATE_VERSION).toBe(1);
    expect(WARM_MINIMAL_VISUAL_DNA.character).toBe('warm-minimal-natural-material-room-led-home-commerce');
    expect(WARM_MINIMAL_VISUAL_DNA.category).toBe('home-living-design');
    expect(WARM_MINIMAL_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['cool-grey-dominance','high-gloss-luxury','cluttered-marketplace','rustic-farmhouse','boho-decor']));
    expect(WARM_MINIMAL_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
  });

  it('is a real catalog increment: 25 implemented / 17 remaining',()=>{
    expect(getStorefrontTemplatePackage('home.warm-minimal',1)).toBeDefined();
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.implemented).toBe(25);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.remaining).toBe(17);
  });

  it('ships all 14 Alap-compatible presets through shared runtime authority',()=>{
    const registry=componentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:WARM_MINIMAL_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(x=>x.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(WARM_MINIMAL_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(WARM_MINIMAL_TEMPLATE_PACKAGE.pages.map(x=>x.pageType)).size).toBe(14);
    for(const page of WARM_MINIMAL_TEMPLATE_PACKAGE.pages){const result=validateStorefrontPageDocument(page,registry,capability);expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);}
  });

  it('preserves the accepted room-led Home sequence and labels',()=>{
    expect(WARM_MINIMAL_HOME_PAGE.metadata?.sectionOrder).toEqual(WARM_MINIMAL_HOME_SECTION_ORDER);
    expect(WARM_MINIMAL_HOME_SECTION_ORDER).toEqual(['Warm Minimal Hero','Shop by Room','Material Palette','Shop the Room','Room Story','Quiet Essentials','Soft Layers','Editorial Journal / Home Notes','Newsletter / Footer CTA']);
    expect(WARM_MINIMAL_ROOM_LABELS).toEqual(['Living room','Bedroom','Kitchen','Bath','Entry']);
  });

  it('keeps hero marketing layers independently editable instead of baking copy into imagery',()=>{
    const nodes=walk(WARM_MINIMAL_HOME_PAGE.sections);
    for(const id of ['warm-minimal-hero-image','warm-minimal-hero-eyebrow','warm-minimal-hero-heading','warm-minimal-hero-copy','warm-minimal-hero-primary','warm-minimal-hero-secondary'])expect(nodes.some(node=>node.id===id)).toBe(true);
    expect(WARM_MINIMAL_MARKETING_LAYER_CONTRACT.businessCopyInImage).toBe(false);
    expect(WARM_MINIMAL_MARKETING_LAYER_CONTRACT.productTruthInImage).toBe(false);
    expect(findNode(WARM_MINIMAL_HOME_PAGE,'warm-minimal-hero-heading')?.bindings?.text?.path).toBe('content.warmMinimalHero.title');
    expect(findNode(WARM_MINIMAL_HOME_PAGE,'warm-minimal-hero-primary')?.bindings?.label?.path).toBe('content.warmMinimalHero.primaryLabel');
    expect(findNode(WARM_MINIMAL_HOME_PAGE,'warm-minimal-hero-secondary')?.bindings?.label?.path).toBe('content.warmMinimalHero.secondaryLabel');
  });

  it('binds room, material, editorial and commerce surfaces to shared data paths',()=>{
    expect(findNode(WARM_MINIMAL_HOME_PAGE,'warm-minimal-room-navigation')?.bindings?.items?.path).toBe('collection.rooms');
    expect(findNode(WARM_MINIMAL_HOME_PAGE,'warm-minimal-material-palette-items')?.bindings?.items?.path).toBe('content.materialPalette.items');
    expect(findNode(WARM_MINIMAL_HOME_PAGE,'warmMinimalQuietEssentials')?.bindings?.products?.path).toBe('catalog.quietEssentials');
    expect(findNode(WARM_MINIMAL_HOME_PAGE,'warm-minimal-soft-layers-row')?.bindings?.products?.path).toBe('recommendations.softLayers');
    expect(findNode(WARM_MINIMAL_HOME_PAGE,'warm-minimal-journal-index')?.bindings?.items?.path).toBe('content.homeNotes.items');
    expect(findNode(WARM_MINIMAL_HOME_PAGE,'warm-minimal-newsletter')?.bindings?.title?.path).toBe('content.newsletter.title');
  });

  it('locks the accepted PDP node geometry and source-authoritative material/dimension data',()=>{
    const gallery=findNode(WARM_MINIMAL_PRODUCT_PAGE,'warm-minimal-product-gallery');
    const buybox=findNode(WARM_MINIMAL_PRODUCT_PAGE,'warm-minimal-product-buybox');
    expect(gallery?.responsive).toMatchObject({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toMatchObject({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(findNode(WARM_MINIMAL_PRODUCT_PAGE,'warm-minimal-product-gallery')?.bindings?.images?.path).toBe('product.gallery');
    expect(findNode(WARM_MINIMAL_PRODUCT_PAGE,'warm-minimal-product-info')?.bindings?.price?.path).toBe('pricing.displayPrice');
    expect(findNode(WARM_MINIMAL_PRODUCT_PAGE,'warm-minimal-product-info')?.bindings?.stockLabel?.path).toBe('inventory.stockLabel');
    expect(findNode(WARM_MINIMAL_PRODUCT_PAGE,'warm-minimal-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(findNode(WARM_MINIMAL_PRODUCT_PAGE,'warm-minimal-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(findNode(WARM_MINIMAL_PRODUCT_PAGE,'warm-minimal-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
    expect(findNode(WARM_MINIMAL_PRODUCT_PAGE,'warm-minimal-product-related-row')?.bindings?.products?.path).toBe('recommendations.products');
  });

  it('keeps demo and image assets non-authoritative',()=>{
    const demo=JSON.stringify(WARM_MINIMAL_TEMPLATE_PACKAGE.demoFixtures??[]);
    expect(demo).not.toMatch(/price|stock|rating|reviewCount|certified|guaranteed|sustainable|handmade in|made in/i);
    expect(JSON.stringify(WARM_MINIMAL_HOME_PAGE)).not.toMatch(/fixed price|only [0-9]+ left|guaranteed delivery/i);
  });

  it('keeps installation draft-only and checkout provider-neutral',()=>{
    const plan=planStorefrontTemplateInstallation({template:WARM_MINIMAL_TEMPLATE_PACKAGE,componentRegistry:componentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(x=>x.namespace==='home-warm-minimal')).toBe(true);
    const checkout=WARM_MINIMAL_TEMPLATE_PACKAGE.pages.find(x=>x.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
