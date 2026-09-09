import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontEditorialRendererRegistry} from '@/components/builder/storefront-editorial';
import {createStorefrontEditorialComponentRegistry} from '@/lib/builder/storefront-editorial';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {PLANS} from '@/lib/plans/catalog';
import {MONARCHE_VISUAL_DNA} from '@/lib/builder/templates/monarche';
import {EDITORIAL_ATELIER_DESIGN_TOKENS,EDITORIAL_ATELIER_ENGINE_CONTRACT,EDITORIAL_ATELIER_HOME_PAGE,EDITORIAL_ATELIER_HOME_SECTION_ORDER,EDITORIAL_ATELIER_PRODUCT_PAGE,EDITORIAL_ATELIER_PRO_CONTRACT,EDITORIAL_ATELIER_TEMPLATE_KEY,EDITORIAL_ATELIER_TEMPLATE_PACKAGE,EDITORIAL_ATELIER_TEMPLATE_VERSION,EDITORIAL_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/editorial-atelier';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(item=>[item,...walk(item.children??[])]);

describe('Scale-out Wave 25 Editorial Atelier / Atelier Nova',()=>{
  it('is the distinct editorial fashion direction rather than a Monarche reskin',()=>{
    expect(EDITORIAL_ATELIER_TEMPLATE_KEY).toBe('fashion.editorial-atelier');
    expect(EDITORIAL_ATELIER_TEMPLATE_VERSION).toBe(1);
    expect(EDITORIAL_ATELIER_VISUAL_DNA.character).toBe('fashion-magazine-meets-premium-commerce');
    expect(EDITORIAL_ATELIER_VISUAL_DNA.position).toBe('editorial-asymmetric-campaign-led-luxury');
    expect(EDITORIAL_ATELIER_VISUAL_DNA.character).not.toBe(MONARCHE_VISUAL_DNA.character);
    expect(EDITORIAL_ATELIER_VISUAL_DNA.position).not.toBe(MONARCHE_VISUAL_DNA.position);
    expect(EDITORIAL_ATELIER_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['monarche-balanced-retail-grid-clone','street-drop-culture-clone','symmetric-hero-cards-grid-default']));
    expect(EDITORIAL_ATELIER_DESIGN_TOKENS['--shoporation-color-background']).toBe('#f6f1ea');
    expect(EDITORIAL_ATELIER_DESIGN_TOKENS['--shoporation-color-text']).toBe('#151412');
  });

  it('uses shared engine authority and keeps Interactive Scene as a Pro shared-engine boundary',()=>{
    expect(EDITORIAL_ATELIER_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(EDITORIAL_ATELIER_ENGINE_CONTRACT.optional).toEqual(['E7']);
    expect(EDITORIAL_ATELIER_PRO_CONTRACT).toMatchObject({feature:'shop-the-look-interactive-scene',plan:'pro',alapFallback:'editorial-split-story-plus-authoritative-product-recommendation'});
    expect(EDITORIAL_ATELIER_PRO_CONTRACT.implementationBoundary).toMatch(/shared-interactive-scene-or-composer-engine/);
    expect(EDITORIAL_ATELIER_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-price-stock-rating-material-fit-sizing/);
    expect(JSON.stringify(EDITORIAL_ATELIER_HOME_PAGE)).not.toMatch(/componentKey":".*hotspot|componentKey":".*interactive-scene/i);
  });

  it('ships all 14 Alap-compatible Page Schema presets and validates fail-closed',()=>{
    const registry=createStorefrontEditorialComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:EDITORIAL_ATELIER_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(EDITORIAL_ATELIER_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(EDITORIAL_ATELIER_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of EDITORIAL_ATELIER_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('locks the magazine-first Home narrative and Builder-editable campaign layers',()=>{
    expect(EDITORIAL_ATELIER_HOME_SECTION_ORDER).toEqual(['Magazine Cover Hero','Issue Statement','Campaign Story I','Campaign Story II','The Edit','Shop the Story','Featured Silhouettes','Journal','Newsletter','Footer']);
    expect(EDITORIAL_ATELIER_HOME_PAGE.metadata?.sectionOrder).toEqual(EDITORIAL_ATELIER_HOME_SECTION_ORDER);
    expect(EDITORIAL_ATELIER_HOME_PAGE.metadata?.visualPreset).toBe('asymmetric-fashion-magazine-home');
    expect(EDITORIAL_ATELIER_HOME_PAGE.metadata?.builderLayers).toMatchObject({cover:['image','eyebrow','title','copy','primaryLabel','primaryHref','secondaryLabel','secondaryHref'],campaignOne:['image','eyebrow','title','copy','ctaLabel','ctaHref'],campaignTwo:['image','eyebrow','title','copy','ctaLabel','ctaHref'],shopStory:['image','eyebrow','title','copy','ctaLabel','ctaHref'],responsive:['desktop','tablet','mobile']});
    const nodes=walk(EDITORIAL_ATELIER_HOME_PAGE.sections);
    expect(nodes.find(item=>item.id==='atelier-campaign-one')?.config.imagePosition).toBe('right');
    expect(nodes.find(item=>item.id==='atelier-campaign-two')?.config.imagePosition).toBe('left');
    expect(nodes.find(item=>item.id==='atelierTheEdit')?.config.columns).toBe(3);
    expect(nodes.find(item=>item.id==='atelierFeaturedSilhouettes')?.config.columns).toBe(2);
  });

  it('renders the editorial Home with authoritative bound products and journal content',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={EDITORIAL_ATELIER_HOME_PAGE} viewport="desktop" bindingContext={{brand:{name:'Atelier Nova',homeHref:'/'},content:{atelierCover:{title:'Editorial motion.'},journal:{title:'Journal',items:[{title:'Issue Notes',href:'/blog/issue-notes',excerpt:'Campaign notes.'}]}},catalog:{theEdit:[{id:'coat',name:'Longline Coat',href:'/termek/coat'}],featuredSilhouettes:[]},recommendations:{shopStory:[{id:'dress',name:'Column Dress',href:'/termek/dress'}]}}} componentRegistry={createStorefrontEditorialComponentRegistry()} rendererRegistry={createStorefrontEditorialRendererRegistry()} capability={capability}/>);
    expect(html).toContain('Editorial motion.');
    expect(html).toContain('Longline Coat');
    expect(html).toContain('Column Dress');
    expect(html).toContain('Issue Notes');
    expect(html).toContain('Campaign / I');
    expect(html).toContain('Campaign / II');
  });

  it('keeps the fashion PDP clear, responsive and authority-bound',()=>{
    const nodes=walk(EDITORIAL_ATELIER_PRODUCT_PAGE.sections);
    expect(EDITORIAL_ATELIER_PRODUCT_PAGE.metadata?.pdpGrid).toEqual({desktop:'7/12+5/12',tablet:'7/12+5/12',mobile:'12/12+12/12'});
    expect(EDITORIAL_ATELIER_PRODUCT_PAGE.metadata?.commerceClarity).toEqual(['price','stock','size','purchase-cta']);
    expect(nodes.find(item=>item.id==='atelier-product-gallery')?.responsive).toMatchObject({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(nodes.find(item=>item.id==='atelier-product-buybox')?.responsive).toMatchObject({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(nodes.find(item=>item.id==='atelier-product-info')?.bindings).toMatchObject({price:{path:'pricing.displayPrice',fallback:''},stockLabel:{path:'inventory.stockLabel',fallback:''}});
    expect(nodes.find(item=>item.id==='atelier-product-size')?.bindings?.options?.path).toBe('variant.sizeOptions');
    expect(nodes.find(item=>item.id==='atelier-product-cta')?.bindings?.href?.path).toBe('commerce.purchaseHref');
  });

  it('does not fabricate demo commerce or product facts',()=>{
    const demo=JSON.stringify(EDITORIAL_ATELIER_TEMPLATE_PACKAGE.demoFixtures??[]);
    expect(demo).not.toMatch(/priceLabel|displayPrice|compareAtPrice|stockLabel|rating|reviewCount|materialClaim|fitClaim|guaranteed/i);
    const source=JSON.stringify(EDITORIAL_ATELIER_TEMPLATE_PACKAGE.pages);
    expect(source).not.toMatch(/rating":4\.|fallback":4\./);
  });

  it('keeps checkout provider-neutral while declaring the shared guided-accordion boundary',()=>{
    const checkout=EDITORIAL_ATELIER_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(checkout.metadata?.checkoutUxContract).toBe('guided-accordion-owned-by-shared-e13-checkout-runtime-not-template-local');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|merchantId|payment_secret/i);
  });

  it('keeps installation draft-only and namespaced',()=>{
    const plan=planStorefrontTemplateInstallation({template:EDITORIAL_ATELIER_TEMPLATE_PACKAGE,componentRegistry:createStorefrontEditorialComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='fashion-editorial-atelier')).toBe(true);
  });
});