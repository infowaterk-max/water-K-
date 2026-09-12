import {describe,expect,it} from 'vitest';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {
  materializeStorefrontFidelityPage,
  readStorefrontFidelityMetadata,
  resolveStorefrontStyleSlot,
} from '@/lib/builder/storefront-fidelity-engine';
import {createStorefrontGuidedVisualComponentRegistry} from '@/lib/builder/storefront-guided-visual';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import {PLANS} from '@/lib/plans/catalog';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  BEAUTY_LAB_REFERENCE_V28_HOME_PAGE,
  BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE,
  BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_REFERENCE_V28_PACKAGE,
} from '@/lib/builder/templates/beauty-lab-reference-v28';
import {BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_CANONICAL_V2_PACKAGE} from '@/lib/builder/templates/beauty-lab-canonical-v2';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const flatten=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...flatten(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>flatten(nodes).find(node=>node.id===id);

describe('Beauty Lab reference v2.8 canonical shared fidelity integration',()=>{
  it('keeps the recovered Home composition in one flattened v2.8 source',()=>{
    expect(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.metadata).toMatchObject({
      referencePass:'beauty-lab-reference-v2.8',
      canonicalComposition:'flattened-v2.8-from-v2.4',
      responsiveReferenceComposition:true,
      referenceDensity:'compact-desktop-v1',
      mobileFeaturedPresentation:'single-column-bestseller-teaser',
    });

    const mobile=materializeStorefrontFidelityPage(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE,'mobile');
    const desktop=materializeStorefrontFidelityPage(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE,'desktop');
    expect(mobile.sections.slice(0,5).map(section=>section.id)).toEqual([
      'beauty-home-site-header','beauty-formula-hero','beauty-usp-row','beauty-new-formulas','beauty-formula-finder',
    ]);
    expect(desktop.sections.slice(0,5).map(section=>section.id)).toEqual([
      'beauty-home-site-header','beauty-formula-hero','beauty-usp-row','beauty-formula-finder','beauty-ingredient-index',
    ]);

    const metadata=readStorefrontFidelityMetadata(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE);
    expect(metadata?.designGuard).toMatchObject({presetId:'beauty-lab-reference-v2.5-home',baselineVersion:5});
  });

  it('preserves the recovered hero, texture and bestseller contracts without intermediate wrappers',()=>{
    const title=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'beauty-hero-title');
    expect(title?.bindings?.text?.fallback).toBe('YOUR SKIN.\nYOUR FORMULA.');
    expect(resolveStorefrontVisualStyle(title?.config.style,'desktop')).toMatchObject({maxWidth:'15.5ch',lineHeight:.86});

    const hero=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'beauty-formula-hero');
    expect(resolveStorefrontVisualStyle(hero?.config.style,'mobile')).toMatchObject({height:'24.5rem',minHeight:'24.5rem'});

    const texture=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'beauty-texture-navigation');
    const items=texture?.bindings?.items?.fallback as Array<{label:string}>;
    expect(items.map(item=>item.label)).toEqual(['GÉL','KRÉM','MILK','OLAJ']);

    const featured=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'newFormulas');
    const products=featured?.bindings?.products?.fallback as Array<{badge?:string}>;
    expect(products[0]?.badge).toBe('BESTSELLER');
  });

  it('preserves compact shared Home style-slot fidelity from the recovery passes',()=>{
    const finder=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'formula-finder');
    expect(finder?.config.actionLabel).toBe('Tovább');
    expect(finder?.config.copy).toBe('');
    expect(resolveStorefrontStyleSlot(finder?.config.styleSlots,'option','desktop')).toMatchObject({minHeight:'3.55rem',padding:'.42rem'});
    expect(resolveStorefrontStyleSlot(finder?.config.styleSlots,'aside','desktop')).toMatchObject({minHeight:'10.8rem'});

    const ingredient=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'beauty-ingredient-index-block');
    const texture=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'beauty-texture-navigation');
    const featured=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'newFormulas');
    expect(resolveStorefrontStyleSlot(ingredient?.config.styleSlots,'media','desktop').aspectRatio).toBe('1.48 / 1');
    expect(resolveStorefrontStyleSlot(texture?.config.styleSlots,'media','desktop').aspectRatio).toBe('2.5 / 1');
    expect(resolveStorefrontStyleSlot(featured?.config.styleSlots,'media','desktop').aspectRatio).toBe('1 / 1.08');
    expect(resolveStorefrontStyleSlot(featured?.config.styleSlots,'title','mobile').display).toBe('none');
  });

  it('replaces Home and PDP generic trust workarounds with the shared trust-strip primitive',()=>{
    const homeTrust=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'beauty-usp-grid')!;
    expect(homeTrust.componentKey).toBe('content.trust-strip');
    expect(homeTrust.componentVersion).toBe(1);
    expect(homeTrust.config).toMatchObject({columns:3,mobileColumns:3,presentation:'beauty-lab-home'});
    expect(homeTrust.children).toBeUndefined();
    expect(homeTrust.bindings?.items).toMatchObject({path:'content.homeTrust.items'});
    expect(homeTrust.config.items).toEqual(expect.arrayContaining([expect.objectContaining({label:'Bőrbarát formulák'}),expect.objectContaining({label:'Valódi eredmények'})]));

    const productTrust=find(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.sections,'beauty-product-trust')!;
    expect(productTrust.componentKey).toBe('content.trust-strip');
    expect(productTrust.componentVersion).toBe(1);
    expect(productTrust.config).toMatchObject({columns:3,mobileColumns:2,presentation:'compact-pdp'});
    expect(productTrust.children).toBeUndefined();
    expect(productTrust.bindings?.items).toMatchObject({path:'content.productTrust.items'});
    expect(productTrust.config.items).toEqual(expect.arrayContaining([expect.objectContaining({label:'Raktáron'}),expect.objectContaining({label:'30 napos visszaküldés'})]));
  });

  it('defers only below-fold Home sections through the shared layout.section performance capability',()=>{
    const sections=BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections;
    const trustIndex=sections.findIndex(section=>section.id==='beauty-usp-row');
    expect(trustIndex).toBeGreaterThan(0);
    expect(find(sections,'beauty-formula-hero')?.config.deferOffscreen).not.toBe(true);
    expect(sections[trustIndex].config.deferOffscreen).not.toBe(true);
    const deferred=sections.slice(trustIndex+1).filter(section=>section.componentKey==='layout.section');
    expect(deferred.length).toBeGreaterThan(0);
    for(const section of deferred)expect(section.config).toMatchObject({deferOffscreen:true,intrinsicSize:'auto 720px'});
    expect(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.metadata).toMatchObject({offscreenSectionDeferral:'shared-layout-section-v1'});
  });

  it('keeps the recovered PDP flow and buybox ordering while using shared commerce primitives',()=>{
    expect(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.sections.slice(0,5).map(section=>section.id)).toEqual([
      'beauty-product-site-header','beauty-product-main','beauty-product-tabs','beauty-product-specifications','beauty-product-related',
    ]);
    expect(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.sections.some(section=>section.id==='beauty-product-trust-bar')).toBe(false);

    const metadata=readStorefrontFidelityMetadata(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE);
    const buyboxOrder=['beauty-product-info','beauty-product-rating','beauty-product-key-specs','beauty-product-variants','beauty-product-purchase','beauty-product-trust'];
    expect(metadata?.nodeOrder?.['beauty-product-buybox']?.desktop).toEqual(buyboxOrder);
    expect(metadata?.nodeOrder?.['beauty-product-buybox']?.mobile).toEqual(buyboxOrder);
    expect(metadata?.designGuard).toMatchObject({presetId:'beauty-lab-reference-v2.6-product',baselineVersion:6});

    const purchase=find(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.sections,'beauty-product-purchase')!;
    expect(purchase.componentKey).toBe('commerce.purchase-controls');
    expect(purchase.bindings).toMatchObject({
      productId:{path:'product.id',fallback:''},
      availableQuantity:{path:'inventory.availableQuantity',fallback:0},
      minimumQuantity:{path:'inventory.minimumQuantity',fallback:1},
      orderMultiple:{path:'inventory.orderMultiple',fallback:1},
    });

    const related=find(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.sections,'beauty-product-recommendations')!;
    expect(related.config.columns).toBe(3);
    expect(related.bindings?.products?.fallback as unknown[]).toHaveLength(3);
    expect(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.metadata).toMatchObject({
      pdpFlow:'main-tabs-ingredients-related-results',
      purchaseControls:'shared-functional-quantity-cart-wishlist-v1',
      canonicalComposition:'flattened-v2.8-from-v2.4',
    });
  });

  it('wires before/after to merchant evidence while failing closed by default',()=>{
    const evidence=find(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.sections,'beauty-product-before-after')!;
    expect(evidence.componentKey).toBe('editorial.before-after');
    expect(evidence.componentVersion).toBe(1);
    expect(evidence.config).toMatchObject({beforeImage:'',afterImage:'',evidenceStatus:'unverified',presentation:'merchant-evidence'});
    expect(evidence.bindings).toMatchObject({
      beforeImage:{path:'content.beforeAfter.beforeImage',fallback:''},
      afterImage:{path:'content.beforeAfter.afterImage',fallback:''},
      evidenceStatus:{path:'content.beforeAfter.evidenceStatus',fallback:'unverified'},
    });
    expect(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.metadata).toMatchObject({
      beforeAfterPrimitive:'editorial.before-after@1',
      beforeAfterStatus:'wired-fail-closed-awaiting-authoritative-merchant-evidence',
    });
    expect(JSON.stringify(evidence.config)).not.toMatch(/clinical|diagnos|cure|efficacy|gyógyít|kezelés/i);
  });

  it('keeps every reference v2.8 page valid in the shared guided visual runtime for Alap',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    for(const page of BEAUTY_LAB_REFERENCE_V28_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the Visual Builder renderer registry symmetric with every Beauty Lab page node',()=>{
    const renderers=createStorefrontVisualBuilderRendererRegistry();
    for(const page of BEAUTY_LAB_CANONICAL_V2_PACKAGE.pages){
      for(const node of flatten(page.sections)){
        expect(renderers.get(node.componentKey,node.componentVersion),`${page.pageType}:${node.id}:${node.componentKey}@${node.componentVersion}`).toBeDefined();
      }
    }
    expect(renderers.get('commerce.purchase-controls',1)).toBeDefined();
  });

  it('promotes flattened v2.8 as the canonical v2 source without creating a new template identity',()=>{
    expect(BEAUTY_LAB_CANONICAL_V2_PACKAGE.manifest.templateKey).toBe(BEAUTY_LAB_REFERENCE_V28_PACKAGE.manifest.templateKey);
    expect(BEAUTY_LAB_CANONICAL_V2_PACKAGE.manifest.templateVersion).toBe(2);
    expect(BEAUTY_LAB_CANONICAL_V2_PACKAGE.pages.every(page=>page.templateVersion===2)).toBe(true);
    expect(BEAUTY_LAB_CANONICAL_V2_PACKAGE.pages.every(page=>page.metadata?.canonicalTemplateSource==='beauty-lab-reference-v28')).toBe(true);
    expect(BEAUTY_LAB_CANONICAL_V2_PACKAGE.pages.every(page=>page.metadata?.canonicalComposition==='flattened-v2.8-from-v2.4')).toBe(true);
  });
});