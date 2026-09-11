import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {createStorefrontStoryComponentRegistry} from '@/lib/builder/storefront-story';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  PERFORMANCE_LAB_DESIGN_TOKENS,
  PERFORMANCE_LAB_ENGINE_CONTRACT,
  PERFORMANCE_LAB_GOAL_CONTRACT,
  PERFORMANCE_LAB_HOME_PAGE,
  PERFORMANCE_LAB_HOME_SECTION_ORDER,
  PERFORMANCE_LAB_PRODUCT_PAGE,
  PERFORMANCE_LAB_TEMPLATE_MANIFEST,
  PERFORMANCE_LAB_TEMPLATE_PACKAGE,
  PERFORMANCE_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/performance-lab';
import {PERFORMANCE_LAB_WAVE42_ACCEPTANCE} from '@/lib/builder/templates/performance-lab-wave42-acceptance';
import {PERFORMANCE_LAB_WAVE61_ACCEPTANCE} from '@/lib/builder/templates/performance-lab-wave61-acceptance';
import {TRAIL_EXPEDITION_VISUAL_DNA} from '@/lib/builder/templates/trail-expedition';
import {TRAIL_EXPEDITION_WAVE60_ACCEPTANCE} from '@/lib/builder/templates/trail-expedition-wave60-acceptance';
import {SPORT_HUB_VISUAL_DNA} from '@/lib/builder/templates/sport-hub';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const product=(id:string)=>nodeById(PERFORMANCE_LAB_PRODUCT_PAGE,id);

describe('Scale-out Wave 61 Performance Lab current-baseline reacceptance',()=>{
  it('reconstructs original PR #146 and historical Wave 42 / PR #220 directly after current Wave 60 Trail & Expedition',()=>{
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE).toMatchObject({
      wave:61,historicalCounterpartWave:42,historicalPullRequest:220,originalTemplatePullRequest:146,
      predecessorAcceptance:TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.mode,historicalAcceptance:PERFORMANCE_LAB_WAVE42_ACCEPTANCE.mode,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'sport.performance-lab',templateVersion:1,inheritedImplementation:true,
    });
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.sequence.next).toBe('sport.performance-lab');
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.sequence).toEqual({
      previous:'sport.trail-expedition',current:'sport.performance-lab',
      historicalPrevious:'wave41-sport.trail-expedition',historicalCurrent:'wave42-sport.performance-lab',
      originalPrevious:'pr145-sport.trail-expedition',originalCurrent:'pr146-sport.performance-lab',
      relationship:'historical-wave42-successor-replayed-on-current-wave60-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.provenance).toMatchObject({
      currentParentWave:60,currentParentHead:'1ac7550171d2d5f3f1905f210f65bb5e0ccc3f79',
      historicalAcceptedTemplateBlob:'b779f8310730a45e4d48806e7e0350d735830522',
      currentInheritedTemplateBlob:'b779f8310730a45e4d48806e7e0350d735830522',
      byteIdenticalToHistoricalAcceptedTemplate:true,templateModifiedByWave61:false,
    });
  });

  it('keeps Performance Lab visually and structurally distinct with the locked goal/spec/compare Home composition',()=>{
    expect(PERFORMANCE_LAB_VISUAL_DNA).toMatchObject({character:'dark-technical-performance-dashboard-lab',category:'sport-outdoor',position:'goal-spec-compare-performance-specialist'});
    expect(PERFORMANCE_LAB_VISUAL_DNA.character).not.toBe(TRAIL_EXPEDITION_VISUAL_DNA.character);
    expect(PERFORMANCE_LAB_VISUAL_DNA.character).not.toBe(SPORT_HUB_VISUAL_DNA.character);
    expect(PERFORMANCE_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(PERFORMANCE_LAB_HOME_SECTION_ORDER);
    expect(PERFORMANCE_LAB_HOME_SECTION_ORDER).toEqual(['Performance Lab Hero','Goal Console','Metric Snapshot','Gear Finder','Compare Spotlight','Lab Tested','Expert Review','Research Notes','Footer']);
    expect(PERFORMANCE_LAB_GOAL_CONTRACT).toMatchObject({question:'Mi a célod?',presentation:'dashboard-goal-console',selection:'merchant-configured-navigation'});
    expect(PERFORMANCE_LAB_GOAL_CONTRACT.goals).toEqual(['Gyorsaság','Állóképesség','Erő','Technika']);
    expect(PERFORMANCE_LAB_HOME_PAGE.metadata?.shoppingEntryQuestion).toBe('Mi a célod?');
  });

  it('proves the inherited Wave 42 metric, compare, PDP, node identity and Content hardening remains present',()=>{
    const catalog=PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    const content=PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='content')!;
    expect(nodeById(PERFORMANCE_LAB_HOME_PAGE,'performance-home-key-specs')?.bindings?.items?.path).toBe('commerce.metricSnapshot');
    expect(nodeById(PERFORMANCE_LAB_HOME_PAGE,'performance-compare-spotlight')?.bindings).toMatchObject({
      products:{path:'commerce.compareProducts'},rows:{path:'commerce.compareRows'},ctaHref:{path:'commerce.compareHref'},
    });
    expect(product('performance-product-compare')?.bindings).toMatchObject({
      label:{path:'content.productCompare.label'},href:{path:'commerce.compareHref'},count:{path:'commerce.compareCount'},
    });
    expect(product('performance-product-compare-table-node')?.bindings).toMatchObject({
      products:{path:'commerce.compareProducts'},groups:{path:'commerce.compareGroups'},
    });
    expect(nodeById(catalog,'performance-catalog-collection-header')?.componentKey).toBe('commerce.collection-header');
    expect(nodeById(content,'performance-content-research-body')?.componentKey).toBe('story.body');
    expect(bindingPaths(content)).toEqual(expect.arrayContaining(['content.researchBody.blocks','content.researchBody.relations']));
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.builderContract.inheritedHistoricalCorrections).toEqual(PERFORMANCE_LAB_WAVE42_ACCEPTANCE.builderContract.hardeningCorrections);
  });

  it('uses only current shared binding namespaces and carries no obsolete performance.* or compare.* authority',()=>{
    const paths=PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    for(const prefix of ['performance.','compare.']) expect(paths.some(path=>path.startsWith(prefix))).toBe(false);
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.bindingContract).toMatchObject({
      currentSharedNamespacesOnly:true,runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,
    });
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with stable page-local unique node IDs',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:PERFORMANCE_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(PERFORMANCE_LAB_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(PERFORMANCE_LAB_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps installation draft-only with namespaced demo lifecycle and no commerce/customer/order/B2B mutation authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:PERFORMANCE_LAB_TEMPLATE_PACKAGE,componentRegistry:createStorefrontStoryComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='sport-performance-lab')).toBe(true);
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'sport-performance-lab'});
  });

  it('keeps E2/E7/E10/E13 presentation on shared product, pricing, inventory, variant, review and checkout authority',()=>{
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.commerceAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',
      structuredFacts:'E7-only-for-source-supplied-specs-measurements-and-comparisons',
      editorial:'E10-for-expert-video-research-note-and-lab-editorial-context',
      checkout:'shared-provider-neutral-E13',
      noTemplateProductAuthority:true,noTemplatePricingAuthority:true,noTemplateInventoryAuthority:true,noTemplateVariantAuthority:true,
      noTemplateReviewAuthority:true,noTemplateSuitabilityAuthority:true,noTemplateCheckoutAuthority:true,noTemplatePaymentAuthority:true,
    });
    expect(product('performance-product-info')?.bindings).toMatchObject({
      title:{path:'product.name'},price:{path:'pricing.displayPrice'},compareAtPrice:{path:'pricing.compareAtPrice'},stockLabel:{path:'inventory.stockLabel'},
    });
    expect(product('performance-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(product('performance-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(product('performance-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
  });

  it('keeps provider-neutral E13 checkout with no K&H/vPOS/provider authority inside the template',()=>{
    const checkout=PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.commerceAuthority.checkout).toBe('shared-provider-neutral-E13');
  });

  it('does not fabricate lab results, gains, suitability, endorsements or rankings',()=>{
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.safety).toEqual({
      fabricatedLabResults:false,fabricatedPerformanceGains:false,fabricatedFitnessSuitability:false,
      fabricatedEndorsements:false,fabricatedRankings:false,templateLocalGuidedFinderEngine:false,templateLocalMeasurementAuthority:false,
    });
    expect(PERFORMANCE_LAB_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining([
      'fake-lab-results','fake-performance-gains','fake-athlete-endorsement','fake-fitness-suitability',
    ]));
    expect(JSON.stringify(PERFORMANCE_LAB_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/labResult|performanceGain|fitnessSuitable|endorsement|ranking|stockCount/i);
  });

  it('keeps merchant-editable tokens and excludes SQL, baseline, production, Supabase, payment, main merge and Wave 62 scope',()=>{
    expect(PERFORMANCE_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(PERFORMANCE_LAB_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(PERFORMANCE_LAB_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.builderContract).toMatchObject({
      merchantEditableDesignTokens:true,marketingCopyOrCommerceTruthBakedIntoImages:false,
      runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,
    });
    expect(PERFORMANCE_LAB_WAVE61_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
      'payment-provider-change','kh-vpos-change','sql-migration','customer-baseline-change','vercel-production-deploy','supabase-mutation',
      'fresh-install-project-state-change','tenant-status-change','tenant-plan-change','main-merge','wave62-implementation',
    ]));
  });
});