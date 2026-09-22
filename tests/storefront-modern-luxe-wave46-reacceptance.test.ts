import {describe,expect,it} from 'vitest';
import {createStorefrontVisualLayerComponentRegistry} from '@/lib/builder/storefront-visual-layers';
import {PLANS} from '@/lib/plans/catalog';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {
  evaluateStorefrontTemplateCapabilityGate,
  planStorefrontTemplateInstallation,
} from '@/lib/builder/storefront-template-installation';
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
import {STATEMENT_LAB_VISUAL_DNA} from '@/lib/builder/templates/statement-lab';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 46 Modern Luxe current-baseline reacceptance',()=>{
  it('re-accepts historical Wave 27 Modern Luxe directly after Street Drop',()=>{
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE).toMatchObject({
      wave:46,
      historicalWave:27,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'jewelry.modern-luxe',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.historicalSequence).toEqual({
      previous:'fashion.street-drop',
      current:'jewelry.modern-luxe',
      relationship:'original-wave27-stacked-directly-on-street-drop-wave26',
    });
    expect(MODERN_LUXE_TEMPLATE_PACKAGE.manifest.templateKey).toBe('jewelry.modern-luxe');
    expect(MODERN_LUXE_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(MODERN_LUXE_TEMPLATE_PACKAGE.manifest.demoContent.namespace).toBe('jewelry-modern-luxe');
  });

  it('preserves the distinct spacious modern luxury portfolio direction',()=>{
    expect(MODERN_LUXE_VISUAL_DNA.character).toBe('premium-modern-jewelry-accessories-spacious-editorial-luxe');
    expect(MODERN_LUXE_VISUAL_DNA.character).not.toBe(HERITAGE_ATELIER_VISUAL_DNA.character);
    expect(MODERN_LUXE_VISUAL_DNA.character).not.toBe(STATEMENT_LAB_VISUAL_DNA.character);
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.distinctness).toEqual({
      notHeritageAtelier:'not-craftsmanship-provenance-heritage-story-led',
      notStatementLab:'not-material-lab-spec-gallery-led',
      ownPosition:'premium-modern-spacious-editorial-luxury-retail',
    });
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.visualContract.categories).toEqual(['Ékszerek','Órák','Táskák','Napszemüvegek','Kiegészítők']);
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.visualContract.palette).toEqual(['ivory','champagne-gold','black']);
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(MODERN_LUXE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(MODERN_LUXE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['crowded-home','hero-carousel-next-prev','baked-in-marketing-copy','overloaded-gold']));
  });

  it('preserves the airy Home order, no carousel navigation and separately editable hero layers',()=>{
    expect(MODERN_LUXE_HOME_SECTION_ORDER).toEqual(['Layered Luxe Hero','Category Edit','Signature Selection','Ajándéknak választva','Brand Story','Footer']);
    expect(MODERN_LUXE_HOME_PAGE.metadata?.sectionOrder).toEqual(MODERN_LUXE_HOME_SECTION_ORDER);
    expect(MODERN_LUXE_HOME_PAGE.metadata?.heroNavigation).toBe('none');
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.builderContract.heroLayers).toEqual(['image','overlay','decoration','badge','title','subtitle','cta']);
    expect(MODERN_LUXE_SPACING_CONTRACT).toEqual({presets:['narrow','normal','airy','custom'],defaultPreset:'airy',controls:['section-gap','inner-padding','column-gap'],responsive:['desktop','tablet','mobile']});
    const source=JSON.stringify(MODERN_LUXE_HOME_PAGE);
    for(const id of ['modern-luxe-hero-image-layer','modern-luxe-hero-overlay-layer','modern-luxe-hero-decoration-layer','modern-luxe-hero-badge-layer','modern-luxe-hero-title-layer','modern-luxe-hero-subtitle-layer','modern-luxe-hero-cta-layer']) expect(source).toContain(id);
  });

  it('keeps product truth and checkout authority on shared engines only',()=>{
    expect(MODERN_LUXE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E13']);
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.authorityContract).toMatchObject({
      pricing:'pricing-binding-only',
      inventory:'inventory-binding-only',
      variants:'variant-binding-only',
      structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',
      recommendations:'shared-recommendation-surface-only',
      checkout:'shared-provider-neutral-E13',
      noTemplateSpecificJewelryAuthority:true,
      noFakeMaterialClaims:true,
      noFakeScarcity:true,
      noTemplatePricingAuthority:true,
      noTemplateInventoryAuthority:true,
      noTemplateCheckoutAuthority:true,
      noTemplatePaymentAuthority:true,
    });
    const checkout=MODERN_LUXE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
  });

  it('does not make 3D/AR a Modern Luxe v1 dependency',()=>{
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.capabilityBoundary).toEqual({
      threeDAr:'not-required-by-modern-luxe-v1',
      packaging:'deferred-shared-pro-or-addon-capability',
      rule:'future-3d-ar-must-compose-with-shared-capability-not-template-local-engine',
    });
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.nonScope).toContain('template-local-3d-ar-engine');
  });

  it('keeps every binding inside current shared namespaces',()=>{
    const paths=MODERN_LUXE_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('modernLuxe.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('jewelry.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('price.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('stock.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('checkout.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('payment.'))).toBe(false);
  });

  it('requires stable unique node identity across all 14 Page Schema presets',()=>{
    for(const page of MODERN_LUXE_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
    }
  });

  it('requires all 14 Alap presets to pass current shared registry validation',()=>{
    const registry=createStorefrontVisualLayerComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:MODERN_LUXE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(MODERN_LUXE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(MODERN_LUXE_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of MODERN_LUXE_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the accepted responsive PDP under shared product authority',()=>{
    const source=JSON.stringify(MODERN_LUXE_PRODUCT_PAGE);
    expect(source).toContain('pricing.displayPrice');
    expect(source).toContain('inventory.stockLabel');
    expect(source).toContain('variant.optionOptions');
    expect(source).toContain('commerce.purchaseHref');
    expect(source).toContain('recommendations.products');
    expect(source).not.toMatch(/hardcodedStockCount|fakeStock|templatePricing|templateInventory|payment_secret/i);
  });

  it('keeps installation draft-only and future Builder-compatible without widening contracts',()=>{
    const registry=createStorefrontVisualLayerComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:MODERN_LUXE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='jewelry-modern-luxe')).toBe(true);
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',
      pagePresetCount:14,
      minimumPlan:'alap',
      runtimeAllowlistWidened:false,
      componentRegistryWidened:false,
      bindingNamespaceWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(MODERN_LUXE_WAVE46_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'duplicate-modern-luxe-template','jewelry-product-authority-engine','template-local-3d-ar-engine',
      'template-local-inventory-engine','template-local-pricing-engine','fabricated-commerce-or-product-authority',
      'visual-builder-drag-drop-ui','live-canvas','inline-editing','payment-provider-change','sql-migration',
      'vercel-production-deploy','supabase-mutation','main-merge','wave47-implementation',
    ]));
  });
});
