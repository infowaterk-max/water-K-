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
import {TRAIL_EXPEDITION_WAVE60_ACCEPTANCE} from '@/lib/builder/templates/trail-expedition-wave60-acceptance';
import {SPORT_HUB_VISUAL_DNA} from '@/lib/builder/templates/sport-hub';
import {SPORT_HUB_WAVE59_ACCEPTANCE} from '@/lib/builder/templates/sport-hub-wave59-acceptance';
import {PERFORMANCE_LAB_VISUAL_DNA} from '@/lib/builder/templates/performance-lab';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const product=(id:string)=>nodeById(TRAIL_EXPEDITION_PRODUCT_PAGE,id);

describe('Scale-out Wave 60 Trail & Expedition current-baseline reacceptance',()=>{
  it('reconstructs historical Wave 41 / PR #217 and original Wave 22 / PR #145 directly after Sport Hub',()=>{
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE).toMatchObject({
      wave:60,historicalCounterpartWave:41,historicalPullRequest:217,originalTemplateWave:22,originalTemplatePullRequest:145,
      predecessorAcceptance:SPORT_HUB_WAVE59_ACCEPTANCE.mode,historicalAcceptance:TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.mode,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'sport.trail-expedition',templateVersion:1,inheritedImplementation:true,
    });
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.sequence).toEqual({
      previous:'wave59-sport.sport-hub',current:'sport.trail-expedition',historicalPrevious:'wave40-sport.sport-hub',historicalCurrent:'wave41-sport.trail-expedition',
      originalPrevious:'wave21-sport.sport-hub',originalCurrent:'wave22-sport.trail-expedition',next:'sport.performance-lab',
      relationship:'historical-wave41-successor-replayed-on-current-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
    expect(TRAIL_EXPEDITION_TEMPLATE_MANIFEST.templateKey).toBe('sport.trail-expedition');
    expect(TRAIL_EXPEDITION_TEMPLATE_MANIFEST.templateVersion).toBe(1);
    expect(TRAIL_EXPEDITION_TEMPLATE_MANIFEST.demoContent.namespace).toBe('sport-trail-expedition');
  });

  it('keeps Trail & Expedition visually and structurally distinct with the locked route-first Home composition',()=>{
    expect(TRAIL_EXPEDITION_VISUAL_DNA).toMatchObject({character:'dark-cinematic-route-first-outdoor-editorial',category:'sport-outdoor',position:'trail-trekking-camping-adventure-commerce'});
    expect(TRAIL_EXPEDITION_VISUAL_DNA.character).not.toBe(SPORT_HUB_VISUAL_DNA.character);
    expect(TRAIL_EXPEDITION_VISUAL_DNA.character).not.toBe(PERFORMANCE_LAB_VISUAL_DNA.character);
    expect(TRAIL_EXPEDITION_HOME_PAGE.metadata?.sectionOrder).toEqual(TRAIL_EXPEDITION_HOME_SECTION_ORDER);
    expect(TRAIL_EXPEDITION_HOME_SECTION_ORDER).toEqual(['Trail & Expedition Hero','Adventure Selector','Gear Checklist','Adventure Kits','Route / Map Feature','Trail Essentials','Field Notes','Outdoor Guides','Footer']);
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT).toMatchObject({question:'Hová indulsz?',geometry:'diamond-slant',defaultState:'muted-desaturated',activeState:'color-detail-cta',desktopInteraction:'hover-focus',mobileInteraction:'tap-carousel'});
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.routes).toEqual(['Egynapos túra','Hétvégi trekking','Kemping','Trail run','Téli kaland','Családi kiruccanás']);
    expect(TRAIL_EXPEDITION_HOME_PAGE.metadata?.shoppingEntryQuestion).toBe('Hová indulsz?');
    expect(TRAIL_EXPEDITION_HOME_PAGE.metadata?.adventureEntries).toEqual(TRAIL_EXPEDITION_SELECTOR_CONTRACT.routes);
  });

  it('proves the inherited Wave 41 node and Content hardening remains present without replaying the historical patch',()=>{
    const catalog=TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    const content=TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='content')!;
    expect(nodeById(catalog,'trail-catalog-header')?.componentKey).toBe('system.header');
    expect(nodeById(catalog,'trail-catalog-collection-header')).toBeTruthy();
    expect(nodeById(content,'trail-content-guide-body')?.componentKey).toBe('story.body');
    expect(bindingPaths(content)).toEqual(expect.arrayContaining(['content.guideBody.blocks','content.guideBody.relations']));
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.historicalHardening).toMatchObject({
      catalogNodeIdentity:'collection-header-renamed-to-trail-catalog-collection-header-to-remove-system-header-collision',
      contentComponent:'content-story-index-replaced-with-content-allowed-story-body',
      contentBindings:'content-body-mapped-to-existing-content-guideBody-blocks-and-relations-paths',
      currentBlobExpectedToContainCorrections:true,noAutomaticReplayOfHistoricalPatch:true,
    });
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.builderContract.inheritedHistoricalCorrections).toEqual(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.builderContract.hardeningCorrections);
  });

  it('uses only current shared binding namespaces without allowlist, registry or namespace widening',()=>{
    const paths=TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    for(const namespace of ['trail.','routeSafety.','weather.','difficulty.','fitness.']) expect(paths.some(path=>path.startsWith(namespace))).toBe(false);
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false});
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.bindingContract).toMatchObject({currentSharedNamespacesOnly:true,runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false});
  });

  it('keeps E2/E7/E10/E13 outdoor presentation on shared authoritative engines',()=>{
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.commerceAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',structuredOutdoorFacts:'E7-only-when-authoritative-product-data-supplies-them',
      editorial:'E10-for-checklists-field-notes-guides-and-route-editorial-presentation',routeSelector:'shared-collection-navigation-presentation-only',
      routeMap:'editorial-context-only-not-live-navigation-weather-safety-or-difficulty-authority',checkout:'shared-provider-neutral-E13',
      noTemplateProductAuthority:true,noTemplatePricingAuthority:true,noTemplateInventoryAuthority:true,noTemplateVariantAuthority:true,
      noTemplateOutdoorSuitabilityAuthority:true,noTemplateRouteSafetyAuthority:true,noTemplateCheckoutAuthority:true,noTemplatePaymentAuthority:true,
    });
    expect(product('trail-product-info')?.bindings).toMatchObject({title:{path:'product.name'},price:{path:'pricing.displayPrice'},compareAtPrice:{path:'pricing.compareAtPrice'},stockLabel:{path:'inventory.stockLabel'}});
    expect(product('trail-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(product('trail-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(product('trail-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
  });

  it('keeps fabricated route safety, weather, difficulty, fitness, survival and performance authority outside the template',()=>{
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.safety).toEqual({
      fabricatedRouteSafety:false,fabricatedWeatherSuitability:false,fabricatedDifficulty:false,fabricatedFitnessSuitability:false,
      fabricatedSurvivalClaims:false,fabricatedPerformanceClaims:false,templateLocalGuidedFinderEngine:false,liveNavigationEngine:false,liveWeatherEngine:false,
    });
    expect(TRAIL_EXPEDITION_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['fake-route-safety','fake-weather','fake-difficulty','fake-survival-or-fitness-suitability']));
    expect(JSON.stringify(TRAIL_EXPEDITION_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/safeRoute|safetyRating|weatherProofFor|guaranteedWeather|difficultyRating|fitnessSuitable|survivalGuarantee|performanceGuarantee|officialRoute|stockCount/i);
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with stable unique node IDs',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:TRAIL_EXPEDITION_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(TRAIL_EXPEDITION_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(TRAIL_EXPEDITION_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps merchant-editable design tokens and the accepted responsive 7/5 product composition',()=>{
    expect(TRAIL_EXPEDITION_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(TRAIL_EXPEDITION_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(TRAIL_EXPEDITION_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.builderContract.marketingCopyOrCommerceTruthBakedIntoImages).toBe(false);
    expect(product('trail-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('trail-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
  });

  it('keeps installation draft-only and template switching unable to mutate commerce, customer, order or B2B authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:TRAIL_EXPEDITION_TEMPLATE_PACKAGE,componentRegistry:createStorefrontStoryComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='sport-trail-expedition')).toBe(true);
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'sport-trail-expedition'});
  });

  it('preserves provider-neutral E13 and inherited Wave 41 authority while excluding SQL, baseline, production, Supabase, main merge and Wave 61',()=>{
    const checkout=TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.commerceAuthority.checkout).toBe('shared-provider-neutral-E13');
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.historicalAcceptance).toBe(TRAIL_EXPEDITION_WAVE41_ACCEPTANCE.mode);
    expect(TRAIL_EXPEDITION_WAVE60_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','visual-builder-roadmap-expansion','ai-builder-roadmap-expansion',
      'payment-provider-change','sql-migration','customer-baseline-change','vercel-production-deploy','supabase-mutation','fresh-install-project-state-change','tenant-status-change','tenant-plan-change','main-merge','wave61-implementation',
    ]));
  });
});
