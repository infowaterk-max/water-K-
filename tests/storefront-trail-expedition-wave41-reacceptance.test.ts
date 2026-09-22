import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {createStorefrontStoryComponentRegistry} from '@/lib/builder/storefront-story';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  TRAIL_EXPEDITION_DESIGN_TOKENS,
  TRAIL_EXPEDITION_ENGINE_CONTRACT,
  TRAIL_EXPEDITION_HOME_PAGE,
  TRAIL_EXPEDITION_HOME_SECTION_ORDER,
  TRAIL_EXPEDITION_PRODUCT_PAGE,
  TRAIL_EXPEDITION_SELECTOR_CONTRACT,
  TRAIL_EXPEDITION_TEMPLATE_MANIFEST,
  TRAIL_EXPEDITION_TEMPLATE_PACKAGE,
  TRAIL_EXPEDITION_VISUAL_DNA,
} from '@/lib/builder/templates/trail-expedition';
import {TRAIL_EXPEDITION_WAVE41_ACCEPTANCE} from '@/lib/builder/templates/trail-expedition-wave41-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const product=(id:string)=>nodeById(TRAIL_EXPEDITION_PRODUCT_PAGE,id);

describe('Scale-out Wave 41 Trail & Expedition current-baseline reacceptance',()=>{
  it('re-accepts original Wave 22 Trail & Expedition between Sport Hub and Performance Lab with canonical identity',()=>{
    expect(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE).toMatchObject({
      wave:41,
      historicalWave:22,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'sport.trail-expedition',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.historicalSequence).toEqual({
      previous:'sport.sport-hub',
      current:'sport.trail-expedition',
      next:'sport.performance-lab',
      relationship:'original-wave22-directly-on-sport-hub-and-wave23-directly-on-trail-expedition',
    });
    expect(TRAIL_EXPEDITION_TEMPLATE_MANIFEST.templateKey).toBe('sport.trail-expedition');
    expect(TRAIL_EXPEDITION_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(TRAIL_EXPEDITION_TEMPLATE_MANIFEST.demoContent.namespace).toBe('sport-trail-expedition');
  });

  it('locks the second Sport & Outdoor direction as cinematic route-first trail, trekking and camping commerce',()=>{
    expect(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.portfolio).toMatchObject({
      category:'sport-outdoor',
      categoryPositionWithinSportOutdoor:2,
      position:'route-adventure-first-trail-trekking-and-camping-commerce',
    });
    expect(TRAIL_EXPEDITION_VISUAL_DNA).toMatchObject({
      character:'dark-cinematic-route-first-outdoor-editorial',
      category:'sport-outdoor',
      position:'trail-trekking-camping-adventure-commerce',
    });
    expect(TRAIL_EXPEDITION_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining([
      'sport-hub-mainstream-clone',
      'performance-lab-data-clone',
      'generic-hero-cards-grid-clone',
      'fake-route-safety',
      'fake-weather',
      'fake-difficulty',
    ]));
    expect(TRAIL_EXPEDITION_DESIGN_TOKENS['--shoporation-color-background']).toBe('#111714');
    expect(TRAIL_EXPEDITION_DESIGN_TOKENS['--shoporation-color-primary']).toBe('#315C43');
    expect(TRAIL_EXPEDITION_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('locks Hová indulsz, six approved adventure routes and Diamond/Slant responsive interaction metadata',()=>{
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.question).toBe('Hová indulsz?');
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.routes).toEqual([
      'Egynapos túra',
      'Hétvégi trekking',
      'Kemping',
      'Trail run',
      'Téli kaland',
      'Családi kiruccanás',
    ]);
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT).toMatchObject({
      geometry:'diamond-slant',
      defaultState:'muted-desaturated',
      activeState:'color-detail-cta',
      desktopInteraction:'hover-focus',
      mobileInteraction:'tap-carousel',
    });
    expect(TRAIL_EXPEDITION_HOME_PAGE.metadata?.shoppingEntryQuestion).toBe('Hová indulsz?');
    expect(TRAIL_EXPEDITION_HOME_PAGE.metadata?.adventureEntries).toEqual(TRAIL_EXPEDITION_SELECTOR_CONTRACT.routes);
  });

  it('preserves the exact route-first Home composition and remains structurally distinct from Sport Hub',()=>{
    expect(TRAIL_EXPEDITION_HOME_PAGE.metadata?.sectionOrder).toEqual(TRAIL_EXPEDITION_HOME_SECTION_ORDER);
    expect(TRAIL_EXPEDITION_HOME_SECTION_ORDER).toEqual([
      'Trail & Expedition Hero',
      'Adventure Selector',
      'Gear Checklist',
      'Adventure Kits',
      'Route / Map Feature',
      'Trail Essentials',
      'Field Notes',
      'Outdoor Guides',
      'Footer',
    ]);
  });

  it('maps Trail presentation onto shared E1/E2/E7/E10/E13 authority without inventing a Trail-specific truth engine',()=>{
    expect(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.engineContract.historicalRequiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.engineContract.currentRequiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.sharedAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',
      structuredOutdoorFacts:'E7-only-when-authoritative-product-data-supplies-them',
      routeSelector:'shared-collection-navigation-presentation-only',
      routeMap:'editorial-context-only-not-live-navigation-weather-safety-or-difficulty-authority',
      checkout:'shared-provider-neutral-E13',
    });
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.guidedFinder).toMatch(/not-stateful-guided-finder-authority/);
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-route-safety-weather-difficulty-fitness-suitability-performance-price-stock-or-order-authority/);
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.checklistRule).toMatch(/does-not-assert-completeness-safety-or-product-compatibility/);
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.mapRule).toMatch(/not-live-navigation-weather-or-safety-authority/);
  });

  it('keeps every binding inside current shared namespaces and creates no Trail-specific truth namespace',()=>{
    const paths=TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('trail.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('routeSafety.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('weather.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('difficulty.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('fitness.'))).toBe(false);
  });

  it('preserves stable node identity, 14 Alap presets and current shared runtime validation',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:TRAIL_EXPEDITION_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(TRAIL_EXPEDITION_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps PDP 7/12 + 5/12 responsive composition and product truth on shared bindings',()=>{
    expect(product('trail-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('trail-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(product('trail-product-info')?.bindings).toMatchObject({
      title:{path:'product.name'},
      price:{path:'pricing.displayPrice'},
      compareAtPrice:{path:'pricing.compareAtPrice'},
      stockLabel:{path:'inventory.stockLabel'},
    });
    expect(product('trail-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(product('trail-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(product('trail-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
  });

  it('keeps installation draft-only and demo fixtures free from fabricated outdoor authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:TRAIL_EXPEDITION_TEMPLATE_PACKAGE,componentRegistry:createStorefrontStoryComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='sport-trail-expedition')).toBe(true);
    expect(JSON.stringify(TRAIL_EXPEDITION_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/safeRoute|safetyRating|weatherProofFor|guaranteedWeather|difficultyRating|fitnessSuitable|survivalGuarantee|performanceGuarantee|officialRoute|stockCount/i);
  });

  it('keeps checkout provider-neutral and Builder-ready without live route/weather or Visual Builder authority',()=>{
    const checkout=TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',
      stableIdentity:'stable-node-ids-and-stable-binding-paths',
      responsiveGrid:'shared-desktop-tablet-mobile-grid',
      pagePresetCount:14,
      minimumPlan:'alap',
      runtimeAllowlistWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.safety).toMatchObject({
      fabricatedRouteSafety:false,
      fabricatedWeatherSuitability:false,
      fabricatedDifficulty:false,
      fabricatedFitnessSuitability:false,
      templateLocalGuidedFinderEngine:false,
      liveNavigationEngine:false,
      liveWeatherEngine:false,
      templatePriceAuthority:false,
      templateStockAuthority:false,
      templateProductEligibilityAuthority:false,
      templateCheckoutAuthority:false,
      templatePaymentAuthority:false,
    });
    expect(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['template-local-stateful-guided-finder','live-route-navigation-or-gps','live-weather-or-safety-authority','visual-builder-drag-drop-ui','live-canvas','inline-editing','payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge']));
  });
});