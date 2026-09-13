import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {createStorefrontVisualLayerComponentRegistry} from '@/lib/builder/storefront-visual-layers';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {HERITAGE_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/heritage-atelier';
import {
  MODERN_LUXE_DESIGN_TOKENS,
  MODERN_LUXE_ENGINE_CONTRACT,
  MODERN_LUXE_HOME_PAGE,
  MODERN_LUXE_HOME_SECTION_ORDER,
  MODERN_LUXE_PRODUCT_PAGE,
  MODERN_LUXE_SPACING_CONTRACT,
  MODERN_LUXE_TEMPLATE_PACKAGE,
  MODERN_LUXE_VISUAL_DNA,
} from '@/lib/builder/templates/modern-luxe';
import {MODERN_LUXE_WAVE46_ACCEPTANCE} from '@/lib/builder/templates/modern-luxe-wave46-acceptance';
import {MODERN_LUXE_WAVE65_ACCEPTANCE} from '@/lib/builder/templates/modern-luxe-wave65-acceptance';
import {STATEMENT_LAB_VISUAL_DNA} from '@/lib/builder/templates/statement-lab';
import {STREET_DROP_WAVE64_ACCEPTANCE} from '@/lib/builder/templates/street-drop-wave64-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 65 Modern Luxe current-baseline reacceptance',()=>{
  it('reconstructs Modern Luxe as the direct canonical successor to current Wave 64 Street Drop',()=>{
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE).toMatchObject({
      wave:65,historicalCounterpartWave:46,historicalReacceptanceWave:27,historicalOriginalWave:10,
      historicalPullRequest:228,historicalReacceptancePullRequest:150,originalTemplatePullRequest:132,
      predecessorAcceptance:STREET_DROP_WAVE64_ACCEPTANCE.mode,historicalAcceptance:MODERN_LUXE_WAVE46_ACCEPTANCE.mode,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'jewelry.modern-luxe',templateVersion:1,inheritedImplementation:true,
    });
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.sequence).toEqual({
      previous:'fashion.street-drop',current:'jewelry.modern-luxe',
      originalPrevious:'wave9-fashion.street-drop',originalCurrent:'wave10-jewelry.modern-luxe',
      reacceptancePrevious:'wave26-fashion.street-drop',reacceptanceCurrent:'wave27-jewelry.modern-luxe',
      hardenedPrevious:'wave45-fashion.street-drop',hardenedCurrent:'wave46-jewelry.modern-luxe',
      relationship:'historical-modern-luxe-successor-replayed-on-current-wave64-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
  });

  it('records original provenance and byte-identical inheritance from accepted hardened Wave 46',()=>{
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.provenance).toEqual({
      currentParentWave:64,
      currentParentHead:'2b76773ec5faedf9c20324668cd5e95fae55530a',
      originalImplementationHead:'c2148252457a76dc677d2d15b87904d5a3ebba64',
      originalFinalHead:'7d5908d5aae4467b5b3194137461ab7755d07599',
      originalTemplateBlob:'72009e20e917f8a921afe0771e68b40bbfcec215',
      historicalReacceptanceFinalHead:'bd754ef1193daaee34b5f3b7fc87c650c53a0c20',
      historicalReacceptanceTemplateBlob:'72009e20e917f8a921afe0771e68b40bbfcec215',
      historicalHardenedImplementationHead:'30e0f0b6920e4fdde5470a7a2248a2f4df7d10f1',
      historicalAcceptedFinalHead:'d4acaa2a8d15445e042e0a2ea12ba4099daf61f0',
      historicalAcceptedTemplateBlob:'c87a3026522e9785202fd1f8155efbb61844129e',
      currentInheritedTemplateBlob:'c87a3026522e9785202fd1f8155efbb61844129e',
      byteIdenticalToHistoricalAcceptedTemplate:true,
      templateModifiedByWave65:false,
    });
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.historicalHardening).toEqual({
      historicalDriftFound:true,
      violationCode:'NODE_ID_DUPLICATE',
      generatedPageHeaderId:'modern-luxe-catalog-header',
      duplicateCollectionHeaderIdBefore:'modern-luxe-catalog-header',
      correctedCollectionHeaderId:'modern-luxe-catalog-collection-header',
      currentBlobContainsAcceptedWave46Fix:true,
      noCurrentContractDrift:true,
      noAutomaticReplayOfHistoricalPatch:true,
    });
    const catalog=MODERN_LUXE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    expect(nodeById(catalog,'modern-luxe-catalog-header')).toBeDefined();
    expect(nodeById(catalog,'modern-luxe-catalog-collection-header')).toBeDefined();
  });

  it('preserves the distinct spacious modern luxury portfolio direction',()=>{
    expect(MODERN_LUXE_VISUAL_DNA.character).toBe('premium-modern-jewelry-accessories-spacious-editorial-luxe');
    expect(MODERN_LUXE_VISUAL_DNA.character).not.toBe(HERITAGE_ATELIER_VISUAL_DNA.character);
    expect(MODERN_LUXE_VISUAL_DNA.character).not.toBe(STATEMENT_LAB_VISUAL_DNA.character);
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.portfolio.direction).toBe('modern-spacious-editorial-luxury-retail');
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.visualContract.categories).toEqual(['Ékszerek','Órák','Táskák','Napszemüvegek','Kiegészítők']);
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.visualContract.palette).toEqual(['ivory','champagne-gold','black']);
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(MODERN_LUXE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(MODERN_LUXE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['streetwear','skate','graffiti','neon','crowded-home','hero-carousel-next-prev','baked-in-marketing-copy','overloaded-gold']));
  });

  it('preserves exact Home narrative and separately editable marketing layers',()=>{
    expect(MODERN_LUXE_HOME_SECTION_ORDER).toEqual(['Layered Luxe Hero','Category Edit','Signature Selection','Ajándéknak választva','Brand Story','Footer']);
    expect(MODERN_LUXE_HOME_PAGE.metadata?.sectionOrder).toEqual(MODERN_LUXE_HOME_SECTION_ORDER);
    expect(MODERN_LUXE_HOME_PAGE.metadata?.heroNavigation).toBe('none');
    expect(MODERN_LUXE_HOME_PAGE.metadata?.layerContract).toBe('hero-image-title-subtitle-cta-badge-overlay-decoration-separate-editable-layers');
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.experience.heroLayers).toEqual(['image','overlay','decoration','badge','title','subtitle','cta']);
    expect(MODERN_LUXE_SPACING_CONTRACT).toEqual({presets:['narrow','normal','airy','custom'],defaultPreset:'airy',controls:['section-gap','inner-padding','column-gap'],responsive:['desktop','tablet','mobile']});
    for(const id of ['modern-luxe-hero-image-layer','modern-luxe-hero-overlay-layer','modern-luxe-hero-decoration-layer','modern-luxe-hero-badge-layer','modern-luxe-hero-title-layer','modern-luxe-hero-subtitle-layer','modern-luxe-hero-cta-layer']) expect(nodeById(MODERN_LUXE_HOME_PAGE,id),`Missing protected Builder layer ${id}`).toBeDefined();
  });

  it('maps only onto shared E1/E2/E13 plus current optional shared capabilities',()=>{
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.engineContract.historicalRequiredForFullExperience).toEqual(['E1','E2','E13']);
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.engineContract.currentRequiredForFullExperience).toEqual(['E1','E2','E13']);
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.engineContract.currentOptional).toEqual(['E7','Recommendations']);
    expect(MODERN_LUXE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E13']);
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.sharedAuthority).toMatchObject({
      pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',
      structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',recommendations:'shared-recommendation-surface-only',
      checkout:'shared-provider-neutral-E13',threeDAr:'future-shared-pro-or-addon-capability-only',
    });
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.safety).toEqual({
      fabricatedPrice:false,fabricatedStock:false,fabricatedRating:false,fabricatedMaterialFacts:false,fabricatedScarcity:false,
      templateJewelryAuthority:false,templatePricingAuthority:false,templateInventoryAuthority:false,templateCheckoutAuthority:false,
      templatePaymentAuthority:false,templateThreeDArAuthority:false,
    });
  });

  it('keeps every binding inside current shared namespaces with no Modern Luxe truth namespace',()=>{
    const paths=MODERN_LUXE_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    for(const prefix of ['modernLuxe.','jewelry.','price.','stock.','checkout.','payment.']) expect(paths.some(path=>path.startsWith(prefix))).toBe(false);
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with page-local unique node IDs',()=>{
    const registry=createStorefrontVisualLayerComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:MODERN_LUXE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(MODERN_LUXE_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(MODERN_LUXE_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(MODERN_LUXE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of MODERN_LUXE_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections); const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the accepted 7/12 + 5/12 PDP under shared commerce authority',()=>{
    const gallery=nodeById(MODERN_LUXE_PRODUCT_PAGE,'modern-luxe-product-gallery');
    const buybox=nodeById(MODERN_LUXE_PRODUCT_PAGE,'modern-luxe-product-buybox');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(bindingPaths(MODERN_LUXE_PRODUCT_PAGE)).toEqual(expect.arrayContaining(['product.gallery','pricing.displayPrice','inventory.stockLabel','variant.optionOptions','commerce.purchaseHref','recommendations.products']));
  });

  it('keeps draft-only namespaced installation and demo fixtures free from commerce authority data',()=>{
    const plan=planStorefrontTemplateInstallation({template:MODERN_LUXE_TEMPLATE_PACKAGE,componentRegistry:createStorefrontVisualLayerComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='jewelry-modern-luxe')).toBe(true);
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.installationContract).toEqual({
      draftOnly:true,demoNamespace:'jewelry-modern-luxe',mutableAuthority:['storefrontPageDrafts'],
      immutableAuthority:['products','variants','pricing','inventory','customers','orders','b2b'],
    });
    expect(JSON.stringify(MODERN_LUXE_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/displayPrice|compareAtPrice|stockLabel|stockCount|rating|reviewCount|materialClaim|guaranteed/i);
  });

  it('keeps provider-neutral E13 checkout and excludes shared-authority, baseline, production, main and Wave 66 changes',()=>{
    const checkout=MODERN_LUXE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',stableIdentity:'stable-page-local-unique-node-ids-and-stable-binding-paths',
      responsiveGrid:'shared-desktop-tablet-mobile-grid',pagePresetCount:14,minimumPlan:'alap',protectedHomeSequence:true,
      protectedPdpGrid:'desktop-tablet-7-5-mobile-12-12',runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(MODERN_LUXE_WAVE65_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'artificial-canonical-template-diff','template-local-layout-engine','template-local-builder-engine','parallel-page-schema-authority',
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
      'payment-provider-change','kh-vpos-change','sql-migration','customer-baseline-change','vercel-production-deploy','supabase-mutation',
      'fresh-install-project-state-change','tenant-status-change','tenant-plan-change','parallel-main-import','main-merge','wave66-implementation',
    ]));
  });
});
