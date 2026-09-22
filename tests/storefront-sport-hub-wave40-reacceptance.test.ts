import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {createStorefrontStoryComponentRegistry} from '@/lib/builder/storefront-story';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  SPORT_HUB_DESIGN_TOKENS,
  SPORT_HUB_ENGINE_CONTRACT,
  SPORT_HUB_HOME_PAGE,
  SPORT_HUB_HOME_SECTION_ORDER,
  SPORT_HUB_PRODUCT_PAGE,
  SPORT_HUB_TEMPLATE_MANIFEST,
  SPORT_HUB_TEMPLATE_PACKAGE,
  SPORT_HUB_VISUAL_DNA,
} from '@/lib/builder/templates/sport-hub';
import {SPORT_HUB_WAVE40_ACCEPTANCE} from '@/lib/builder/templates/sport-hub-wave40-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const product=(id:string)=>nodeById(SPORT_HUB_PRODUCT_PAGE,id);

describe('Scale-out Wave 40 Sport Hub current-baseline reacceptance',()=>{
  it('re-accepts original Wave 21 Sport Hub between Loot Vault and Trail & Expedition with canonical identity',()=>{
    expect(SPORT_HUB_WAVE40_ACCEPTANCE).toMatchObject({
      wave:40,
      historicalWave:21,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'sport.sport-hub',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.historicalSequence).toEqual({
      previous:'gaming.loot-vault',
      current:'sport.sport-hub',
      next:'sport.trail-expedition',
      relationship:'original-wave21-directly-on-loot-vault-and-wave22-directly-on-sport-hub',
    });
    expect(SPORT_HUB_TEMPLATE_MANIFEST.templateKey).toBe('sport.sport-hub');
    expect(SPORT_HUB_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(SPORT_HUB_TEMPLATE_MANIFEST.demoContent.namespace).toBe('sport-sport-hub');
  });

  it('locks Sport & Outdoor #8 broad multisport DNA and exact historical Home composition',()=>{
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.portfolio).toMatchObject({
      category:'sport-outdoor',
      categoryPosition:8,
      position:'broad-mainstream-multisport-commerce-hub',
    });
    expect(SPORT_HUB_VISUAL_DNA).toMatchObject({
      character:'clean-energetic-multisport-premium-retail',
      category:'sport-outdoor',
      position:'broad-multisport-commerce-hub',
    });
    expect(SPORT_HUB_HOME_PAGE.metadata?.sectionOrder).toEqual(SPORT_HUB_HOME_SECTION_ORDER);
    expect(SPORT_HUB_HOME_SECTION_ORDER).toEqual(['Sport Hub Hero','Shop by Sport','New Season','Footwear & Apparel','Equipment Essentials','Team & Club','Featured Sport','Community Stories','Guides & Advice','Footer']);
  });

  it('preserves activity-first shopping, six sport entries and Builder-native skill routing without inventing suitability',()=>{
    expect(SPORT_HUB_HOME_PAGE.metadata?.shoppingEntryQuestion).toBe('Milyen sportot űzöl?');
    expect(SPORT_HUB_HOME_PAGE.metadata?.sportEntries).toEqual(['futás','kerékpár','fitnesz','túra','úszás','labdajátékok']);
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.experience.skillLevels).toEqual(['Kezdő','Haladó','Profi']);
    expect(JSON.stringify(SPORT_HUB_HOME_PAGE)).toContain('Milyen szinten sportolsz?');
    expect(SPORT_HUB_HOME_PAGE.metadata?.skillLevelNavigation).toMatch(/builder-editable-navigation-only-product-claims-remain-authoritative/);
    expect(SPORT_HUB_ENGINE_CONTRACT.merchandising.skillLevel).toMatch(/E7-facets-only-when-supplied/);
  });

  it('maps multisport presentation onto the same shared E1/E2/E7/E10/E13 authority and keeps neighboring roles distinct',()=>{
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.engineContract.historicalRequiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.engineContract.currentRequiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(SPORT_HUB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.sharedAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',
      structuredSportFacts:'E7-only-when-authoritative-product-data-supplies-them',
      editorial:'E10-editorial-read-model-presentation-only',
      checkout:'shared-provider-neutral-E13',
    });
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.separation).toEqual({
      playroom:'no-gaming-discovery-role-duplication',
      lootVault:'no-collector-drop-preorder-role-duplication',
      trailExpedition:'no-route-expedition-first-role-duplication',
      performanceLab:'no-specialist-performance-data-lab-duplication',
    });
    expect(SPORT_HUB_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-performance-team-affiliation-event-results-price-stock-or-order-authority/);
  });

  it('keeps every binding inside current shared namespaces and creates no Sport Hub truth namespace',()=>{
    const paths=SPORT_HUB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('sportHub.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('sports.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('liveScore.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('performance.'))).toBe(false);
  });

  it('preserves stable node identity, 14 Alap presets and current shared runtime validation',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:SPORT_HUB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(SPORT_HUB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(SPORT_HUB_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of SPORT_HUB_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    expect(SPORT_HUB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(SPORT_HUB_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(SPORT_HUB_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
  });

  it('keeps PDP 7/12 + 5/12 responsive composition and product truth on shared bindings',()=>{
    expect(product('sport-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('sport-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(product('sport-product-info')?.bindings).toMatchObject({
      title:{path:'product.name'},
      price:{path:'pricing.displayPrice'},
      compareAtPrice:{path:'pricing.compareAtPrice'},
      stockLabel:{path:'inventory.stockLabel'},
    });
    expect(product('sport-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(product('sport-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(product('sport-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
  });

  it('keeps installation draft-only and demo fixtures free of fabricated sports authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:SPORT_HUB_TEMPLATE_PACKAGE,componentRegistry:createStorefrontStoryComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='sport-sport-hub')).toBe(true);
    expect(JSON.stringify(SPORT_HUB_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/performanceGuarantee|officialTeam|eventResult|worldRecord|certifiedAthlete|guaranteed|liveScore|stockCount/i);
  });

  it('keeps checkout provider-neutral E13 with no payment-provider authority',()=>{
    const checkout=SPORT_HUB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge']));
  });

  it('remains Builder-ready without a template-local sports, live-score or performance authority engine',()=>{
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',
      stableIdentity:'stable-node-ids-and-stable-binding-paths',
      responsiveGrid:'shared-desktop-tablet-mobile-grid',
      pagePresetCount:14,
      minimumPlan:'alap',
      runtimeAllowlistWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.safety).toMatchObject({
      templateLocalSportsEngine:false,
      liveScoreEngine:false,
      templatePriceAuthority:false,
      templateStockAuthority:false,
      templateProductEligibilityAuthority:false,
      templateCheckoutAuthority:false,
      templatePaymentAuthority:false,
    });
    expect(SPORT_HUB_WAVE40_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['template-local-sports-engine','template-local-live-score-engine','template-local-performance-authority','visual-builder-drag-drop-ui','live-canvas','inline-editing']));
  });
});
