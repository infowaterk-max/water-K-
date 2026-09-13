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
import {MONARCHE_WAVE62_ACCEPTANCE} from '@/lib/builder/templates/monarche-wave62-acceptance';
import {PERFORMANCE_LAB_WAVE61_ACCEPTANCE} from '@/lib/builder/templates/performance-lab-wave61-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 62 Monarche current-baseline reacceptance',()=>{
  it('reconstructs Monarche as the direct canonical successor to current Wave 61 Performance Lab',()=>{
    expect(MONARCHE_WAVE62_ACCEPTANCE).toMatchObject({
      wave:62,historicalCounterpartWave:43,historicalPullRequest:222,originalTemplatePullRequest:147,
      predecessorAcceptance:PERFORMANCE_LAB_WAVE61_ACCEPTANCE.mode,historicalAcceptance:MONARCHE_WAVE43_ACCEPTANCE.mode,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'fashion.monarche',templateVersion:1,inheritedImplementation:true,
    });
    expect(MONARCHE_WAVE62_ACCEPTANCE.sequence).toEqual({
      previous:'sport.performance-lab',current:'fashion.monarche',
      historicalPrevious:'wave42-sport.performance-lab',historicalCurrent:'wave43-fashion.monarche',
      originalPrevious:'pr146-sport.performance-lab',originalCurrent:'pr147-fashion.monarche',
      relationship:'historical-wave43-successor-replayed-on-current-wave61-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
  });

  it('records byte-identical inheritance from the accepted Wave 43 Monarche implementation',()=>{
    expect(MONARCHE_WAVE62_ACCEPTANCE.provenance).toEqual({
      currentParentWave:61,
      currentParentHead:'380b45b97ffebfdfc1968e418efd2ba2ac8a8b08',
      historicalAcceptedImplementationHead:'0d6383b238da704edec81789d1cc0cc6526b6e90',
      historicalAcceptedTemplateBlob:'8725b711ae20212318cebba2a2f7691f8feadaf0',
      currentInheritedTemplateBlob:'8725b711ae20212318cebba2a2f7691f8feadaf0',
      byteIdenticalToHistoricalAcceptedTemplate:true,
      templateModifiedByWave62:false,
    });
    expect(MONARCHE_WAVE62_ACCEPTANCE.historicalHardening).toMatchObject({acceptedWave43NoTemplateChange:true,noAutomaticReplayOfHistoricalPatch:true});
  });

  it('preserves the balanced modern premium Monarche identity and merchant-editable design tokens',()=>{
    expect(MONARCHE_VISUAL_DNA).toMatchObject({
      character:'modern-editorial-luxury-commerce',category:'fashion-apparel',position:'balanced-modern-premium-mainstream',
      spacing:'generous-whitespace',imagery:'editorial-fashion-photography',chrome:'quiet-minimal-commerce',
    });
    expect(MONARCHE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining([
      'editorial-atelier-asymmetry-clone','street-drop-culture-clone','discount-megastore-density','fabricated-price-stock-rating-or-product-claim',
    ]));
    expect(MONARCHE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(MONARCHE_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(MONARCHE_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
  });

  it('keeps the protected shared-header direction without a template-specific renderer',()=>{
    expect(MONARCHE_HEADER_CONTRACT.primaryNavigation.map(item=>item.label)).toEqual(['Újdonságok','Női','Férfi','Kollekciók','Journal']);
    expect(MONARCHE_HEADER_CONTRACT.utilityLabels).toEqual(['Keresés','Fiók','Kedvencek']);
    expect(MONARCHE_HEADER_CONTRACT.utilityBoundary).toBe('shared-header-extension-required-no-template-specific-child-hack');
    const header=MONARCHE_HOME_PAGE.sections[0];
    expect(header.componentKey).toBe('system.header');
    expect(header.children?.every(child=>child.componentKey==='system.navigation')).toBe(true);
  });

  it('preserves the exact protected Home sequence and separately editable responsive layers',()=>{
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

  it('keeps all bindings inside shared namespaces and shared E1/E2/E10/E13 plus optional E7 authority',()=>{
    expect(MONARCHE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(MONARCHE_ENGINE_CONTRACT.optional).toEqual(['E7']);
    expect(MONARCHE_WAVE62_ACCEPTANCE.sharedAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-product-eligibility-and-collections',
      editorial:'E10-only-for-journal-editorial-story-content',
      structuredFacts:'E7-optional-source-supplied-structured-product-facts',
      checkout:'shared-provider-neutral-E13',ratings:'shared-review-authority-only-no-template-default-score',
    });
    const paths=MONARCHE_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    for(const prefix of ['monarche.','fashion.','price.','stock.','checkout.','payment.']) expect(paths.some(path=>path.startsWith(prefix))).toBe(false);
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with page-local unique node IDs',()=>{
    const registry=createStorefrontEditorialComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:MONARCHE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(MONARCHE_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(MONARCHE_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(MONARCHE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of MONARCHE_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the protected 7/12 + 5/12 PDP and shared pricing/inventory bindings',()=>{
    const gallery=walk(MONARCHE_PRODUCT_PAGE.sections).find(node=>node.componentKey==='commerce.product-gallery');
    const buybox=nodeById(MONARCHE_PRODUCT_PAGE,'monarche-product-buybox');
    const info=walk(MONARCHE_PRODUCT_PAGE.sections).find(node=>node.componentKey==='commerce.product-info');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(info?.bindings).toMatchObject({
      title:{path:'product.name'},price:{path:'pricing.displayPrice'},compareAtPrice:{path:'pricing.compareAtPrice'},stockLabel:{path:'inventory.stockLabel'},
    });
  });

  it('keeps installation draft-only and demo fixtures free from product/commerce authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:MONARCHE_TEMPLATE_PACKAGE,componentRegistry:createStorefrontEditorialComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='fashion-monarche')).toBe(true);
    expect(MONARCHE_WAVE62_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'fashion-monarche'});
    expect(JSON.stringify(MONARCHE_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/priceLabel|displayPrice|compareAtPrice|stockLabel|stockCount|rating|reviewCount|materialClaim|durability|guaranteed/i);
  });

  it('keeps provider-neutral E13 checkout and no fabricated commerce or product authority',()=>{
    const checkout=MONARCHE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(MONARCHE_WAVE62_ACCEPTANCE.safety).toEqual({
      fabricatedPrice:false,fabricatedStock:false,fabricatedRating:false,fabricatedProductAttribute:false,
      fabricatedMaterialClaim:false,fabricatedDurabilityClaim:false,templateProductEligibilityAuthority:false,
      templateCheckoutAuthority:false,templatePaymentAuthority:false,templateSpecificHeaderRenderer:false,
    });
  });

  it('excludes shared authority widening, baseline/payment/production/main mutations and Wave 63',()=>{
    expect(MONARCHE_WAVE62_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',responsiveGrid:'shared-desktop-tablet-mobile-grid',
      pagePresetCount:14,minimumPlan:'alap',protectedHomeSequence:true,protectedPdpGrid:'desktop-tablet-7-5-mobile-12-12',
      runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,
    });
    expect(MONARCHE_WAVE62_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
      'payment-provider-change','kh-vpos-change','sql-migration','customer-baseline-change','vercel-production-deploy','supabase-mutation',
      'fresh-install-project-state-change','tenant-status-change','tenant-plan-change','main-merge','wave63-implementation',
    ]));
  });
});
