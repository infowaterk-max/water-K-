import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {createStorefrontEditorialComponentRegistry} from '@/lib/builder/storefront-editorial';
import {
  evaluateStorefrontTemplateCapabilityGate,
  planStorefrontTemplateInstallation,
} from '@/lib/builder/storefront-template-installation';
import {EDITORIAL_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/editorial-atelier';
import {MONARCHE_VISUAL_DNA} from '@/lib/builder/templates/monarche';
import {
  STREET_DROP_DESIGN_TOKENS,
  STREET_DROP_ENGINE_CONTRACT,
  STREET_DROP_HOME_PAGE,
  STREET_DROP_HOME_SECTION_ORDER,
  STREET_DROP_PRODUCT_PAGE,
  STREET_DROP_TEMPLATE_PACKAGE,
  STREET_DROP_VISUAL_DNA,
} from '@/lib/builder/templates/street-drop';
import {STREET_DROP_WAVE45_ACCEPTANCE} from '@/lib/builder/templates/street-drop-wave45-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 45 Street Drop current-baseline reacceptance',()=>{
  it('re-accepts original Wave 26 Street Drop directly after Editorial Atelier',()=>{
    expect(STREET_DROP_WAVE45_ACCEPTANCE).toMatchObject({
      wave:45,
      historicalWave:26,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'fashion.street-drop',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(STREET_DROP_WAVE45_ACCEPTANCE.historicalSequence).toEqual({
      previous:'fashion.editorial-atelier',
      current:'fashion.street-drop',
      relationship:'original-wave26-stacked-directly-on-editorial-atelier-wave25',
    });
    expect(STREET_DROP_TEMPLATE_PACKAGE.manifest.templateKey).toBe('fashion.street-drop');
    expect(STREET_DROP_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(STREET_DROP_TEMPLATE_PACKAGE.manifest.demoContent.namespace).toBe('fashion-street-drop');
  });

  it('preserves the aggressive but readable third fashion direction',()=>{
    expect(STREET_DROP_VISUAL_DNA.character).toBe('aggressive-urban-drop-commerce');
    expect(STREET_DROP_VISUAL_DNA.character).not.toBe(MONARCHE_VISUAL_DNA.character);
    expect(STREET_DROP_VISUAL_DNA.character).not.toBe(EDITORIAL_ATELIER_VISUAL_DNA.character);
    expect(STREET_DROP_WAVE45_ACCEPTANCE.portfolio.position).toBe('aggressive-readable-streetwear-sneaker-drop-culture');
    expect(STREET_DROP_WAVE45_ACCEPTANCE.visualContract).toMatchObject({
      foundation:'black-off-white-with-merchant-replaceable-neon-accent',
      displayTypography:'characterful-readable-display-headlines-only',
      interfaceTypography:'clean-sans-ui',
      rhythm:'high-energy-home-ordered-commerce-pages-restrained-checkout',
    });
    expect(STREET_DROP_WAVE45_ACCEPTANCE.visualContract.audience).toEqual(['streetwear','sneaker','street-workout','skate','roller','bmx']);
    expect(STREET_DROP_WAVE45_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(STREET_DROP_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['luxury-editorial-clone','fake-stock-scarcity','unreadable-graffiti-font','gamer-rgb']));
    expect(STREET_DROP_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('preserves the exact high-energy Home narrative and separately editable Builder layers',()=>{
    expect(STREET_DROP_HOME_SECTION_ORDER).toEqual([
      'Drop Hero','Release Bar','Shop the Drop','Categories','Limited Stock',
      'Street Story','New Arrivals','Community Journal','Drop Alert','Footer',
    ]);
    expect(STREET_DROP_HOME_PAGE.metadata?.sectionOrder).toEqual(STREET_DROP_HOME_SECTION_ORDER);
    expect(STREET_DROP_HOME_PAGE.metadata?.marketingLayerRule).toBe('separate-editable-layers');
    expect(STREET_DROP_WAVE45_ACCEPTANCE.experience.heroLayers).toEqual(['badge','headline','copy','primary-cta','secondary-cta','image']);
    expect(STREET_DROP_WAVE45_ACCEPTANCE.experience.dropAlertLayers).toEqual(['eyebrow','headline','copy','cta']);
    for(const id of ['street-drop-hero-badge','street-drop-hero-title','street-drop-hero-copy','street-drop-hero-primary','street-drop-hero-secondary','street-drop-hero-image','street-drop-alert-eyebrow','street-drop-alert-title','street-drop-alert-copy','street-drop-alert-cta']){
      expect(nodeById(STREET_DROP_HOME_PAGE,id),`Missing protected Builder layer ${id}`).toBeDefined();
    }
  });

  it('maps only onto shared E1/E2/E13 plus current optional shared engines',()=>{
    expect(STREET_DROP_WAVE45_ACCEPTANCE.engineContract.historicalRequiredForFullExperience).toEqual(['E1','E2','E13']);
    expect(STREET_DROP_WAVE45_ACCEPTANCE.engineContract.currentRequiredForFullExperience).toEqual(['E1','E2','E13']);
    expect(STREET_DROP_WAVE45_ACCEPTANCE.engineContract.currentOptional).toEqual(['E7','E3','Recommendations']);
    expect(STREET_DROP_ENGINE_CONTRACT.stockScarcityAuthority).toBe('inventory-binding-only');
    expect(STREET_DROP_WAVE45_ACCEPTANCE.sharedAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-product-eligibility-authority',
      scarcity:'inventory-binding-only',
      releaseStatus:'authoritative-binding-only',
      checkout:'shared-provider-neutral-E13',
      futureReleaseEngine:'shared-release-or-drop-engine-only-never-template-local',
    });
  });

  it('keeps scarcity, release status and urgency fail-closed without template-local truth',()=>{
    const release=nodeById(STREET_DROP_HOME_PAGE,'street-drop-release-copy');
    expect(release?.bindings?.text?.path).toBe('inventory.releaseStatus');
    expect(release?.bindings?.text?.fallback).toBe('Nincs aktív release státusz.');
    const limited=nodeById(STREET_DROP_HOME_PAGE,'limitedStock');
    expect(limited?.bindings?.products?.path).toBe('catalog.limited');
    expect(STREET_DROP_WAVE45_ACCEPTANCE.safety).toMatchObject({
      fabricatedPrice:false,
      fabricatedStock:false,
      fabricatedStockCount:false,
      fabricatedCountdown:false,
      fabricatedReleaseStatus:false,
      templateProductEligibilityAuthority:false,
      templateInventoryAuthority:false,
      templateDropScheduler:false,
      templateCheckoutAuthority:false,
      templatePaymentAuthority:false,
    });
    const source=JSON.stringify(STREET_DROP_TEMPLATE_PACKAGE);
    expect(source).not.toMatch(/countdownSeconds|fakeCountdown|hardcodedStockCount|templateDropScheduler|payment_secret|merchantId|callbackUrl/i);
  });

  it('keeps every binding inside current shared namespaces with no Street Drop truth namespace',()=>{
    const paths=STREET_DROP_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('streetDrop.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('fashion.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('price.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('stock.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('checkout.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('payment.'))).toBe(false);
  });

  it('requires stable unique node identity across all Page Schema presets',()=>{
    for(const page of STREET_DROP_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
    }
  });

  it('requires all 14 Alap presets to pass current shared registry and fail-closed validation',()=>{
    const registry=createStorefrontEditorialComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:STREET_DROP_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(STREET_DROP_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(STREET_DROP_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of STREET_DROP_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the accepted 7/12 + 5/12 PDP under shared commerce authority',()=>{
    const gallery=nodeById(STREET_DROP_PRODUCT_PAGE,'street-drop-product-gallery');
    const buybox=nodeById(STREET_DROP_PRODUCT_PAGE,'street-drop-product-buybox');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const paths=bindingPaths(STREET_DROP_PRODUCT_PAGE);
    expect(paths).toEqual(expect.arrayContaining(['pricing.displayPrice','inventory.stockLabel','variant.sizeOptions','commerce.purchaseHref']));
  });

  it('keeps draft-only namespaced installation and demo fixtures free from authority data',()=>{
    const registry=createStorefrontEditorialComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:STREET_DROP_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='fashion-street-drop')).toBe(true);
    expect(JSON.stringify(STREET_DROP_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/priceLabel|displayPrice|compareAtPrice|stockLabel|stockCount|rating|reviewCount|guaranteed/i);
  });

  it('keeps checkout provider-neutral and future Builder-compatible without widening shared contracts',()=>{
    const checkout=STREET_DROP_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(checkout.metadata?.checkoutPresentation).toBe('accordion-dropdown');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(STREET_DROP_WAVE45_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',
      stableIdentity:'stable-node-ids-and-stable-binding-paths',
      responsiveGrid:'shared-desktop-tablet-mobile-grid',
      pagePresetCount:14,
      minimumPlan:'alap',
      protectedHomeSequence:true,
      protectedPdpGrid:'desktop-tablet-7-5-mobile-12-12',
      runtimeAllowlistWidened:false,
      componentRegistryWidened:false,
      bindingNamespaceWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(STREET_DROP_WAVE45_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'duplicate-street-drop-template','template-specific-drop-scheduler','template-specific-release-engine',
      'template-specific-scarcity-engine','template-specific-inventory-engine','fabricated-commerce-or-product-authority',
      'visual-builder-drag-drop-ui','live-canvas','inline-editing','payment-provider-change','sql-migration',
      'vercel-production-deploy','supabase-mutation','main-merge','wave46-implementation',
    ]));
  });
});
