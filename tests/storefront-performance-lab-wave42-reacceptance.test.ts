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

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const product=(id:string)=>nodeById(PERFORMANCE_LAB_PRODUCT_PAGE,id);

describe('Scale-out Wave 42 Performance Lab current-baseline reacceptance',()=>{
  it('re-accepts original Wave 23 Performance Lab directly after Trail & Expedition with canonical identity',()=>{
    expect(PERFORMANCE_LAB_WAVE42_ACCEPTANCE).toMatchObject({
      wave:42,
      historicalWave:23,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'sport.performance-lab',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(PERFORMANCE_LAB_WAVE42_ACCEPTANCE.historicalSequence).toEqual({
      previous:'sport.trail-expedition',
      current:'sport.performance-lab',
      relationship:'original-wave23-stacked-directly-on-trail-expedition-wave22',
    });
    expect(PERFORMANCE_LAB_TEMPLATE_MANIFEST.templateKey).toBe('sport.performance-lab');
    expect(PERFORMANCE_LAB_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(PERFORMANCE_LAB_TEMPLATE_MANIFEST.demoContent.namespace).toBe('sport-performance-lab');
  });

  it('locks specialist goal/spec/compare performance commerce and keeps it structurally distinct from Trail and Sport Hub',()=>{
    expect(PERFORMANCE_LAB_WAVE42_ACCEPTANCE.portfolio).toMatchObject({
      category:'sport-outdoor',
      categoryPositionWithinSportOutdoor:3,
      position:'specialist-goal-spec-compare-performance-commerce',
    });
    expect(PERFORMANCE_LAB_VISUAL_DNA).toMatchObject({
      character:'dark-technical-performance-dashboard-lab',
      category:'sport-outdoor',
      position:'goal-spec-compare-performance-specialist',
    });
    expect(PERFORMANCE_LAB_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining([
      'trail-expedition-cinematic-clone',
      'sport-hub-mainstream-clone',
      'diamond-route-selector-clone',
      'generic-hero-card-grid-store',
      'fake-lab-results',
      'fake-performance-gains',
    ]));
    expect(PERFORMANCE_LAB_DESIGN_TOKENS['--shoporation-color-background']).toBe('#07111F');
    expect(PERFORMANCE_LAB_DESIGN_TOKENS['--shoporation-color-primary']).toBe('#2F80ED');
    expect(PERFORMANCE_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('locks Mi a célod, Goal Console defaults and suitability boundary',()=>{
    expect(PERFORMANCE_LAB_GOAL_CONTRACT.question).toBe('Mi a célod?');
    expect(PERFORMANCE_LAB_GOAL_CONTRACT.goals).toEqual(['Gyorsaság','Állóképesség','Erő','Technika']);
    expect(PERFORMANCE_LAB_GOAL_CONTRACT).toMatchObject({
      presentation:'dashboard-goal-console',
      selection:'merchant-configured-navigation',
      authority:'goal-routing-does-not-imply-product-suitability-without-supplied-data',
    });
    expect(PERFORMANCE_LAB_HOME_PAGE.metadata?.shoppingEntryQuestion).toBe('Mi a célod?');
  });

  it('preserves the exact dashboard-style Home composition',()=>{
    expect(PERFORMANCE_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(PERFORMANCE_LAB_HOME_SECTION_ORDER);
    expect(PERFORMANCE_LAB_HOME_SECTION_ORDER).toEqual([
      'Performance Lab Hero',
      'Goal Console',
      'Metric Snapshot',
      'Gear Finder',
      'Compare Spotlight',
      'Lab Tested',
      'Expert Review',
      'Research Notes',
      'Footer',
    ]);
  });

  it('maps Performance Lab presentation onto shared E1/E2/E7/E10/E13 authority without a template-local truth engine',()=>{
    expect(PERFORMANCE_LAB_WAVE42_ACCEPTANCE.engineContract.historicalRequiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(PERFORMANCE_LAB_WAVE42_ACCEPTANCE.engineContract.currentRequiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(PERFORMANCE_LAB_WAVE42_ACCEPTANCE.sharedAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-channel-product-eligibility-and-goal-routing-results',
      structuredFacts:'E7-only-for-source-supplied-specs-measurements-and-comparisons',
      goalConsole:'merchant-configured-navigation-not-product-suitability-authority',
      labTested:'presentation-only-never-infers-missing-values-deltas-rankings-or-gains',
      checkout:'shared-provider-neutral-E13',
    });
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.gearFinder).toMatch(/not-stateful-guided-finder-authority/);
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.metricRule).toMatch(/source-supplied-measurements/);
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.chartRule).toMatch(/never-infers-missing-axis-values/);
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-test-results-performance-gains/);
  });

  it('keeps every binding inside current shared namespaces and creates no Performance-Lab-specific truth namespace',()=>{
    const paths=PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('performanceLab.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('labResult.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('fitness.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('endorsement.'))).toBe(false);
  });

  it('requires stable node identity across every Page Schema preset',()=>{
    for(const page of PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
    }
  });

  it('requires 14 Alap presets to pass the current shared runtime and capability gate without widening it',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:PERFORMANCE_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(PERFORMANCE_LAB_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps PDP 6/12 + 6/12 responsive composition and commerce truth on shared bindings',()=>{
    expect(product('performance-product-gallery')?.responsive).toEqual({desktop:{gridSpan:6},tablet:{gridSpan:6},mobile:{gridSpan:12}});
    expect(product('performance-product-buybox')?.responsive).toEqual({desktop:{gridSpan:6},tablet:{gridSpan:6},mobile:{gridSpan:12}});
    expect(product('performance-product-info')?.bindings).toMatchObject({
      title:{path:'product.name'},
      price:{path:'pricing.displayPrice'},
      compareAtPrice:{path:'pricing.compareAtPrice'},
      stockLabel:{path:'inventory.stockLabel'},
    });
    expect(product('performance-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(product('performance-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(product('performance-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
    expect(product('performance-product-compare-table-node')?.bindings).toMatchObject({products:{path:'compare.products'},groups:{path:'compare.groups'}});
  });

  it('keeps installation draft-only and fixtures free from fabricated lab/performance authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:PERFORMANCE_LAB_TEMPLATE_PACKAGE,componentRegistry:createStorefrontStoryComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='sport-performance-lab')).toBe(true);
    expect(JSON.stringify(PERFORMANCE_LAB_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/labResult|performanceGain|fasterBy|enduranceGain|fitnessSuitable|athleteEndorsement|verifiedTestScore|ranking|guaranteedPerformance|stockCount/i);
  });

  it('keeps checkout provider-neutral and Builder-ready without Visual Builder or template-local authority',()=>{
    const checkout=PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(PERFORMANCE_LAB_WAVE42_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',
      stableIdentity:'stable-node-ids-and-stable-binding-paths',
      responsiveGrid:'shared-desktop-tablet-mobile-grid',
      pagePresetCount:14,
      minimumPlan:'alap',
      hardeningCorrections:[],
      runtimeAllowlistWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(PERFORMANCE_LAB_WAVE42_ACCEPTANCE.safety).toMatchObject({
      fabricatedLabResults:false,
      fabricatedPerformanceGains:false,
      fabricatedFitnessSuitability:false,
      fabricatedAthleteEndorsements:false,
      fabricatedRankings:false,
      templateLocalGuidedFinderEngine:false,
      templatePriceAuthority:false,
      templateStockAuthority:false,
      templateInventoryAuthority:false,
      templateProductEligibilityAuthority:false,
      templateCheckoutAuthority:false,
      templatePaymentAuthority:false,
    });
    expect(PERFORMANCE_LAB_WAVE42_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['template-local-stateful-guided-finder','fabricated-lab-or-performance-authority','visual-builder-drag-drop-ui','live-canvas','inline-editing','payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','wave43-implementation']));
  });
});
