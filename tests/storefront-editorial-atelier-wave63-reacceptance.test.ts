import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {createStorefrontEditorialComponentRegistry} from '@/lib/builder/storefront-editorial';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  EDITORIAL_ATELIER_DESIGN_TOKENS,
  EDITORIAL_ATELIER_ENGINE_CONTRACT,
  EDITORIAL_ATELIER_HOME_PAGE,
  EDITORIAL_ATELIER_HOME_SECTION_ORDER,
  EDITORIAL_ATELIER_PRODUCT_PAGE,
  EDITORIAL_ATELIER_PRO_CONTRACT,
  EDITORIAL_ATELIER_TEMPLATE_PACKAGE,
  EDITORIAL_ATELIER_VISUAL_DNA,
} from '@/lib/builder/templates/editorial-atelier';
import {EDITORIAL_ATELIER_WAVE44_ACCEPTANCE} from '@/lib/builder/templates/editorial-atelier-wave44-acceptance';
import {EDITORIAL_ATELIER_WAVE63_ACCEPTANCE} from '@/lib/builder/templates/editorial-atelier-wave63-acceptance';
import {MONARCHE_VISUAL_DNA} from '@/lib/builder/templates/monarche';
import {MONARCHE_WAVE62_ACCEPTANCE} from '@/lib/builder/templates/monarche-wave62-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 63 Editorial Atelier current-baseline reacceptance',()=>{
  it('reconstructs Editorial Atelier as the direct canonical successor to current Wave 62 Monarche',()=>{
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE).toMatchObject({
      wave:63,historicalCounterpartWave:44,historicalOriginalWave:25,historicalPullRequest:225,originalTemplatePullRequest:148,
      predecessorAcceptance:MONARCHE_WAVE62_ACCEPTANCE.mode,historicalAcceptance:EDITORIAL_ATELIER_WAVE44_ACCEPTANCE.mode,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'fashion.editorial-atelier',templateVersion:1,inheritedImplementation:true,
    });
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.sequence).toEqual({
      previous:'fashion.monarche',current:'fashion.editorial-atelier',
      historicalPrevious:'wave43-fashion.monarche',historicalCurrent:'wave44-fashion.editorial-atelier',
      originalPrevious:'pr147-fashion.monarche',originalCurrent:'pr148-fashion.editorial-atelier',
      relationship:'historical-wave44-successor-replayed-on-current-wave62-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
  });

  it('records byte-identical inheritance from the accepted hardened Wave 44 implementation with no current drift',()=>{
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.provenance).toEqual({
      currentParentWave:62,
      currentParentHead:'0097c89d731835ed5b230e12b3187df2aa29f280',
      historicalAcceptedImplementationHead:'c46c0c3318980a09978f75c37d45a404500737a6',
      historicalAcceptedTemplateBlob:'1847c6f8d935a877371209bf3d63e0d4412a27a6',
      currentInheritedTemplateBlob:'1847c6f8d935a877371209bf3d63e0d4412a27a6',
      byteIdenticalToHistoricalAcceptedTemplate:true,
      historicalAcceptancePassedOnWave62Baseline:true,
      templateModifiedByWave63:false,
    });
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.historicalHardening).toEqual({
      historicalDriftFound:true,
      correctedDuplicateNodeIdFrom:'atelier-catalog-header',
      correctedDuplicateNodeIdTo:'atelier-catalog-collection-header',
      currentBlobContainsAcceptedWave44Fix:true,
      noCurrentContractDrift:true,
      noAutomaticReplayOfHistoricalPatch:true,
    });
  });

  it('preserves the asymmetric campaign-led identity instead of collapsing into Monarche',()=>{
    expect(EDITORIAL_ATELIER_VISUAL_DNA).toMatchObject({
      character:'fashion-magazine-meets-premium-commerce',
      category:'fashion-apparel',
      position:'editorial-asymmetric-campaign-led-luxury',
      spacing:'large-editorial-negative-space',
      composition:'asymmetric-editorial-story-before-grid',
    });
    expect(EDITORIAL_ATELIER_VISUAL_DNA.character).not.toBe(MONARCHE_VISUAL_DNA.character);
    expect(EDITORIAL_ATELIER_VISUAL_DNA.position).not.toBe(MONARCHE_VISUAL_DNA.position);
    expect(EDITORIAL_ATELIER_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining([
      'monarche-balanced-retail-grid-clone','street-drop-culture-clone','symmetric-hero-cards-grid-default',
      'fabricated-price-stock-rating-material-or-fit-claim',
    ]));
    expect(EDITORIAL_ATELIER_DESIGN_TOKENS['--shoporation-color-background']).toBe('#f6f1ea');
    expect(EDITORIAL_ATELIER_DESIGN_TOKENS['--shoporation-color-text']).toBe('#151412');
    expect(EDITORIAL_ATELIER_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('preserves the exact Home narrative, asymmetry and separately editable Builder layers',()=>{
    expect(EDITORIAL_ATELIER_HOME_SECTION_ORDER).toEqual([
      'Magazine Cover Hero','Issue Statement','Campaign Story I','Campaign Story II','The Edit',
      'Shop the Story','Featured Silhouettes','Journal','Newsletter','Footer',
    ]);
    expect(EDITORIAL_ATELIER_HOME_PAGE.metadata?.sectionOrder).toEqual(EDITORIAL_ATELIER_HOME_SECTION_ORDER);
    expect(EDITORIAL_ATELIER_HOME_PAGE.metadata?.visualPreset).toBe('asymmetric-fashion-magazine-home');
    expect(EDITORIAL_ATELIER_HOME_PAGE.metadata?.builderLayers).toMatchObject({
      cover:['image','eyebrow','title','copy','primaryLabel','primaryHref','secondaryLabel','secondaryHref'],
      campaignOne:['image','eyebrow','title','copy','ctaLabel','ctaHref'],
      campaignTwo:['image','eyebrow','title','copy','ctaLabel','ctaHref'],
      shopStory:['image','eyebrow','title','copy','ctaLabel','ctaHref'],
      responsive:['desktop','tablet','mobile'],
    });
    expect(nodeById(EDITORIAL_ATELIER_HOME_PAGE,'atelier-campaign-one')?.config.imagePosition).toBe('right');
    expect(nodeById(EDITORIAL_ATELIER_HOME_PAGE,'atelier-campaign-two')?.config.imagePosition).toBe('left');
    expect(nodeById(EDITORIAL_ATELIER_HOME_PAGE,'atelierTheEdit')?.config.columns).toBe(3);
    expect(nodeById(EDITORIAL_ATELIER_HOME_PAGE,'atelierFeaturedSilhouettes')?.config.columns).toBe(2);
  });

  it('maps Editorial Atelier onto shared E1/E2/E10/E13 plus optional E7 authority only',()=>{
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.engineContract.historicalRequiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.engineContract.currentRequiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.engineContract.currentOptional).toEqual(['E7']);
    expect(EDITORIAL_ATELIER_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-price-stock-rating-material-fit-sizing-product-attribute-or-order-authority/);
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.sharedAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-product-eligibility-authority',
      editorial:'E10-only-for-campaign-journal-lookbook-story-authority',
      structuredFacts:'E7-optional-source-supplied-structured-product-facts',
      checkout:'shared-provider-neutral-E13',
      interactiveScene:'shared-interactive-scene-or-composer-engine-only',
    });
  });

  it('keeps Shop the Look as a shared Pro engine boundary with an Alap fallback',()=>{
    expect(EDITORIAL_ATELIER_PRO_CONTRACT).toMatchObject({
      feature:'shop-the-look-interactive-scene',
      plan:'pro',
      alapFallback:'editorial-split-story-plus-authoritative-product-recommendation',
    });
    expect(EDITORIAL_ATELIER_PRO_CONTRACT.implementationBoundary).toMatch(/shared-interactive-scene-or-composer-engine/);
    expect(EDITORIAL_ATELIER_PRO_CONTRACT.authorityBoundary).toMatch(/never-own-price-stock-variant-or-order-state/);
    const componentKeys=walk(EDITORIAL_ATELIER_HOME_PAGE.sections).map(node=>node.componentKey);
    expect(componentKeys.some(key=>/hotspot|interactive-scene/i.test(key))).toBe(false);
  });

  it('keeps every binding inside current shared namespaces with no template-local truth namespace',()=>{
    const paths=EDITORIAL_ATELIER_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    for(const prefix of ['atelier.','fashion.','price.','stock.','checkout.','payment.']) expect(paths.some(path=>path.startsWith(prefix))).toBe(false);
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with page-local unique node IDs',()=>{
    const registry=createStorefrontEditorialComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:EDITORIAL_ATELIER_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(EDITORIAL_ATELIER_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(EDITORIAL_ATELIER_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(EDITORIAL_ATELIER_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of EDITORIAL_ATELIER_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the protected 7/12 + 5/12 PDP and shared pricing, inventory and variant bindings',()=>{
    const gallery=nodeById(EDITORIAL_ATELIER_PRODUCT_PAGE,'atelier-product-gallery');
    const buybox=nodeById(EDITORIAL_ATELIER_PRODUCT_PAGE,'atelier-product-buybox');
    const info=nodeById(EDITORIAL_ATELIER_PRODUCT_PAGE,'atelier-product-info');
    const size=nodeById(EDITORIAL_ATELIER_PRODUCT_PAGE,'atelier-product-size');
    const cta=nodeById(EDITORIAL_ATELIER_PRODUCT_PAGE,'atelier-product-cta');
    expect(EDITORIAL_ATELIER_PRODUCT_PAGE.metadata?.pdpGrid).toEqual({desktop:'7/12+5/12',tablet:'7/12+5/12',mobile:'12/12+12/12'});
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(info?.bindings).toMatchObject({price:{path:'pricing.displayPrice'},stockLabel:{path:'inventory.stockLabel'}});
    expect(size?.bindings?.options?.path).toBe('variant.sizeOptions');
    expect(cta?.bindings?.href?.path).toBe('commerce.purchaseHref');
  });

  it('keeps installation draft-only and demo fixtures free from product/commerce authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:EDITORIAL_ATELIER_TEMPLATE_PACKAGE,componentRegistry:createStorefrontEditorialComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='fashion-editorial-atelier')).toBe(true);
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'fashion-editorial-atelier'});
    expect(JSON.stringify(EDITORIAL_ATELIER_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/priceLabel|displayPrice|compareAtPrice|stockLabel|stockCount|rating|reviewCount|materialClaim|fitClaim|guaranteed/i);
  });

  it('keeps provider-neutral E13 checkout and excludes shared authority, baseline, production, main and Wave 64 changes',()=>{
    const checkout=EDITORIAL_ATELIER_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(checkout.metadata?.checkoutUxContract).toBe('guided-accordion-owned-by-shared-e13-checkout-runtime-not-template-local');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',responsiveGrid:'shared-desktop-tablet-mobile-grid',
      pagePresetCount:14,minimumPlan:'alap',protectedHomeSequence:true,protectedPdpGrid:'desktop-tablet-7-5-mobile-12-12',
      runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,
    });
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.safety).toMatchObject({
      fabricatedPrice:false,fabricatedStock:false,fabricatedRating:false,fabricatedMaterialClaim:false,fabricatedFitClaim:false,
      fabricatedSizingFact:false,templateProductEligibilityAuthority:false,templateCheckoutAuthority:false,
      templatePaymentAuthority:false,templateSpecificHotspotEngine:false,
    });
    expect(EDITORIAL_ATELIER_WAVE63_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
      'payment-provider-change','kh-vpos-change','sql-migration','customer-baseline-change','vercel-production-deploy','supabase-mutation',
      'fresh-install-project-state-change','tenant-status-change','tenant-plan-change','main-merge','wave64-implementation',
    ]));
  });
});
