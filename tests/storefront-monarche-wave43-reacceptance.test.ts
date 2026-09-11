import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {createStorefrontEditorialComponentRegistry} from '@/lib/builder/storefront-editorial';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  MONARCHE_DESIGN_TOKENS,
  MONARCHE_ENGINE_CONTRACT,
  MONARCHE_HEADER_CONTRACT,
  MONARCHE_HOME_PAGE,
  MONARCHE_HOME_SECTION_ORDER,
  MONARCHE_PRODUCT_PAGE,
  MONARCHE_TEMPLATE_PACKAGE,
  MONARCHE_VISUAL_DNA,
} from '@/lib/builder/templates/monarche';
import {MONARCHE_WAVE43_ACCEPTANCE} from '@/lib/builder/templates/monarche-wave43-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 43 Monarche current-baseline reacceptance',()=>{
  it('re-accepts original Wave 24 Golden #1 Monarche directly after Performance Lab',()=>{
    expect(MONARCHE_WAVE43_ACCEPTANCE).toMatchObject({
      wave:43,
      historicalWave:24,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'fashion.monarche',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(MONARCHE_WAVE43_ACCEPTANCE.historicalSequence).toEqual({
      previous:'sport.performance-lab',
      current:'fashion.monarche',
      relationship:'original-wave24-stacked-directly-on-performance-lab-wave23',
    });
    expect(MONARCHE_TEMPLATE_PACKAGE.manifest.templateKey).toBe('fashion.monarche');
    expect(MONARCHE_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(MONARCHE_TEMPLATE_PACKAGE.manifest.demoContent.namespace).toBe('fashion-monarche');
  });

  it('preserves the accepted balanced modern premium Monarche identity instead of reskinning adjacent fashion directions',()=>{
    expect(MONARCHE_VISUAL_DNA).toMatchObject({
      character:'modern-editorial-luxury-commerce',
      category:'fashion-apparel',
      position:'balanced-modern-premium-mainstream',
      spacing:'generous-whitespace',
      imagery:'editorial-fashion-photography',
      chrome:'quiet-minimal-commerce',
    });
    expect(MONARCHE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining([
      'editorial-atelier-asymmetry-clone',
      'street-drop-culture-clone',
      'discount-megastore-density',
      'fabricated-price-stock-rating-or-product-claim',
    ]));
    expect(MONARCHE_DESIGN_TOKENS['--shoporation-color-background']).toBe('#f5f1eb');
    expect(MONARCHE_DESIGN_TOKENS['--shoporation-color-text']).toBe('#171717');
    expect(MONARCHE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('keeps the protected header direction without a template-specific child renderer hack',()=>{
    expect(MONARCHE_HEADER_CONTRACT.primaryNavigation.map(item=>item.label)).toEqual(['Újdonságok','Női','Férfi','Kollekciók','Journal']);
    expect(MONARCHE_HEADER_CONTRACT.utilityLabels).toEqual(['Keresés','Fiók','Kedvencek']);
    expect(MONARCHE_HEADER_CONTRACT.utilityBoundary).toBe('shared-header-extension-required-no-template-specific-child-hack');
    const header=MONARCHE_HOME_PAGE.sections[0];
    expect(header.componentKey).toBe('system.header');
    expect(header.children?.every(child=>child.componentKey==='system.navigation')).toBe(true);
  });

  it('preserves the exact protected Home sequence and separately editable hero/split layers',()=>{
    expect(MONARCHE_HOME_PAGE.metadata?.sectionOrder).toEqual(MONARCHE_HOME_SECTION_ORDER);
    expect(MONARCHE_HOME_SECTION_ORDER).toEqual([
      'Editorial Hero','Collection Navigation','New Arrivals','Editorial Split Feature','Product Story Grid',
      'Featured Collection','Social Proof/Reviews','Journal Preview','Newsletter','Footer',
    ]);
    expect(MONARCHE_HOME_PAGE.metadata?.builderLayers).toMatchObject({
      hero:['image','eyebrow','title','copy','primaryLabel','primaryHref','secondaryLabel','secondaryHref'],
      split:['image','eyebrow','title','copy','ctaLabel','ctaHref'],
      responsive:['desktop','tablet','mobile'],
    });
  });

  it('maps Monarche onto shared E1/E2/E10/E13 plus optional E7 authority only',()=>{
    expect(MONARCHE_WAVE43_ACCEPTANCE.engineContract.historicalRequiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(MONARCHE_WAVE43_ACCEPTANCE.engineContract.currentRequiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(MONARCHE_WAVE43_ACCEPTANCE.engineContract.currentOptional).toEqual(['E7']);
    expect(MONARCHE_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-price-stock-rating-product-attribute-material-durability-or-order-authority/);
    expect(MONARCHE_WAVE43_ACCEPTANCE.sharedAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-product-eligibility-and-collections',
      editorial:'E10-only-for-journal-editorial-story-content',
      structuredFacts:'E7-optional-source-supplied-structured-product-facts',
      checkout:'shared-provider-neutral-E13',
      ratings:'shared-review-authority-only-no-template-default-score',
    });
  });

  it('keeps every Monarche binding inside the current shared namespaces with no template-local truth namespace',()=>{
    const paths=MONARCHE_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('monarche.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('fashion.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('price.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('stock.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('checkout.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('payment.'))).toBe(false);
  });

  it('requires stable unique node identity across every Page Schema preset',()=>{
    for(const page of MONARCHE_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
    }
  });

  it('requires all 14 Alap presets to pass the current shared registry and fail-closed runtime validation',()=>{
    const registry=createStorefrontEditorialComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:MONARCHE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(MONARCHE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(MONARCHE_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of MONARCHE_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the accepted 7/12 + 5/12 PDP responsive composition and shared commerce bindings',()=>{
    const gallery=walk(MONARCHE_PRODUCT_PAGE.sections).find(node=>node.componentKey==='commerce.product-gallery');
    const buybox=nodeById(MONARCHE_PRODUCT_PAGE,'monarche-product-buybox');
    const info=walk(MONARCHE_PRODUCT_PAGE.sections).find(node=>node.componentKey==='commerce.product-info');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(info?.bindings).toMatchObject({
      title:{path:'product.name'},
      price:{path:'pricing.displayPrice'},
      compareAtPrice:{path:'pricing.compareAtPrice'},
      stockLabel:{path:'inventory.stockLabel'},
    });
  });

  it('keeps draft-only namespaced installation and demo fixtures free from commerce/product authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:MONARCHE_TEMPLATE_PACKAGE,componentRegistry:createStorefrontEditorialComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='fashion-monarche')).toBe(true);
    expect(JSON.stringify(MONARCHE_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/priceLabel|displayPrice|compareAtPrice|stockLabel|stockCount|rating|reviewCount|materialClaim|durability|guaranteed/i);
  });

  it('keeps checkout provider-neutral and future Builder-compatible without widening shared contracts',()=>{
    const checkout=MONARCHE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(MONARCHE_WAVE43_ACCEPTANCE.builderContract).toMatchObject({
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
    expect(MONARCHE_WAVE43_ACCEPTANCE.safety).toMatchObject({
      fabricatedPrice:false,
      fabricatedStock:false,
      fabricatedRating:false,
      fabricatedProductAttribute:false,
      fabricatedMaterialClaim:false,
      fabricatedDurabilityClaim:false,
      templateProductEligibilityAuthority:false,
      templateCheckoutAuthority:false,
      templatePaymentAuthority:false,
      templateSpecificHeaderRenderer:false,
    });
    expect(MONARCHE_WAVE43_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'duplicate-monarche-template','fashion-specific-commerce-engine','template-specific-header-child-hack',
      'fabricated-commerce-or-product-authority','visual-builder-drag-drop-ui','live-canvas','inline-editing',
      'payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','wave44-implementation',
    ]));
  });
});
