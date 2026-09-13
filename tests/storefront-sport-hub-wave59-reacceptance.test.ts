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
import {SPORT_HUB_WAVE59_ACCEPTANCE} from '@/lib/builder/templates/sport-hub-wave59-acceptance';
import {LOOT_VAULT_VISUAL_DNA} from '@/lib/builder/templates/loot-vault';
import {TRAIL_EXPEDITION_VISUAL_DNA} from '@/lib/builder/templates/trail-expedition';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const product=(id:string)=>nodeById(SPORT_HUB_PRODUCT_PAGE,id);

describe('Scale-out Wave 59 Sport Hub current-baseline reacceptance',()=>{
  it('reconstructs historical Wave 40 / PR #215 and original Wave 21 / PR #144 directly after Loot Vault',()=>{
    expect(SPORT_HUB_WAVE59_ACCEPTANCE).toMatchObject({
      wave:59,historicalCounterpartWave:40,historicalPullRequest:215,originalTemplateWave:21,originalTemplatePullRequest:144,
      historicalAcceptance:SPORT_HUB_WAVE40_ACCEPTANCE.mode,mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'sport.sport-hub',templateVersion:1,inheritedImplementation:true,
    });
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.sequence).toEqual({
      previous:'wave58-gaming.loot-vault',current:'sport.sport-hub',historicalPrevious:'wave39-gaming.loot-vault',historicalCurrent:'wave40-sport.sport-hub',
      originalPrevious:'wave20-gaming.loot-vault',originalCurrent:'wave21-sport.sport-hub',next:'sport.trail-expedition',
      relationship:'historical-wave40-successor-replayed-on-current-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
    expect(SPORT_HUB_TEMPLATE_MANIFEST.templateKey).toBe('sport.sport-hub');
    expect(SPORT_HUB_TEMPLATE_MANIFEST.templateVersion).toBe(1);
    expect(SPORT_HUB_TEMPLATE_MANIFEST.demoContent.namespace).toBe('sport-sport-hub');
  });

  it('keeps Sport Hub visually and structurally distinct with the locked activity-first Home composition',()=>{
    expect(SPORT_HUB_VISUAL_DNA).toMatchObject({character:'clean-energetic-multisport-premium-retail',category:'sport-outdoor',position:'broad-multisport-commerce-hub'});
    expect(SPORT_HUB_VISUAL_DNA.character).not.toBe(LOOT_VAULT_VISUAL_DNA.character);
    expect(SPORT_HUB_VISUAL_DNA.character).not.toBe(TRAIL_EXPEDITION_VISUAL_DNA.character);
    expect(SPORT_HUB_HOME_PAGE.metadata?.sectionOrder).toEqual(SPORT_HUB_HOME_SECTION_ORDER);
    expect(SPORT_HUB_HOME_SECTION_ORDER).toEqual(['Sport Hub Hero','Shop by Sport','New Season','Footwear & Apparel','Equipment Essentials','Team & Club','Featured Sport','Community Stories','Guides & Advice','Footer']);
    expect(SPORT_HUB_HOME_PAGE.metadata?.shoppingEntryQuestion).toBe('Milyen sportot űzöl?');
    expect(SPORT_HUB_HOME_PAGE.metadata?.sportEntries).toEqual(['futás','kerékpár','fitnesz','túra','úszás','labdajátékok']);
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.experience.skillLevels).toEqual(['Kezdő','Haladó','Profi']);
  });

  it('proves the inherited Wave 40 node, Content component and binding hardening remains present without replaying it',()=>{
    const catalog=SPORT_HUB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    const content=SPORT_HUB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='content')!;
    expect(nodeById(catalog,'sport-catalog-header')?.componentKey).toBe('system.header');
    expect(nodeById(catalog,'sport-catalog-collection-header')).toBeTruthy();
    expect(nodeById(content,'sport-content-guide-body')?.componentKey).toBe('story.body');
    expect(bindingPaths(content)).toEqual(expect.arrayContaining(['content.guideBody.blocks','content.guideBody.relations']));
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.historicalHardening).toMatchObject({
      catalogNodeIdentity:'collection-header-renamed-to-sport-catalog-collection-header-to-remove-system-header-collision',
      contentComponent:'content-story-index-replaced-with-content-allowed-story-body',
      contentBindings:'provisional-story-current-bindings-mapped-to-existing-content-guideBody-paths',
      currentBlobExpectedToContainCorrections:true,
      noAutomaticReplayOfHistoricalPatch:true,
    });
  });

  it('uses only current shared binding namespaces without allowlist, registry or namespace widening',()=>{
    const paths=SPORT_HUB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    for(const namespace of ['sportHub.','sports.','liveScore.','performance.']) expect(paths.some(path=>path.startsWith(namespace))).toBe(false);
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false});
  });

  it('keeps E2/E7/E10/E13 multisport presentation on shared authoritative engines',()=>{
    expect(SPORT_HUB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.commerceAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',structuredSportFacts:'E7-only-when-authoritative-product-data-supplies-them',
      editorial:'E10-editorial-read-model-presentation-only',activity:'E2-authoritative-collection-navigation',checkout:'shared-provider-neutral-E13',
      noTemplateProductAuthority:true,noTemplatePricingAuthority:true,noTemplateInventoryAuthority:true,noTemplateVariantAuthority:true,
      noTemplateSportSuitabilityAuthority:true,noTemplatePerformanceAuthority:true,noTemplateCheckoutAuthority:true,noTemplatePaymentAuthority:true,
    });
    expect(product('sport-product-info')?.bindings).toMatchObject({title:{path:'product.name'},price:{path:'pricing.displayPrice'},compareAtPrice:{path:'pricing.compareAtPrice'},stockLabel:{path:'inventory.stockLabel'}});
    expect(product('sport-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(product('sport-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(product('sport-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
  });

  it('keeps fabricated performance, team, event and suitability claims outside template authority',()=>{
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.safety).toEqual({
      fabricatedPerformanceClaims:false,fabricatedTeamAffiliation:false,fabricatedEventResults:false,fabricatedSportSuitability:false,
      templateLocalSportsEngine:false,liveScoreEngine:false,
    });
    expect(SPORT_HUB_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['fake-performance-claims','fake-team-affiliation','fake-event-results']));
    expect(JSON.stringify(SPORT_HUB_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/performanceGuarantee|officialTeam|eventResult|worldRecord|certifiedAthlete|guaranteed|liveScore|stockCount/i);
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with stable unique node IDs',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:SPORT_HUB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(SPORT_HUB_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(SPORT_HUB_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(SPORT_HUB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of SPORT_HUB_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps merchant-editable design tokens and the accepted responsive 7/5 product composition',()=>{
    expect(SPORT_HUB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(SPORT_HUB_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(SPORT_HUB_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.builderContract.marketingCopyOrCommerceTruthBakedIntoImages).toBe(false);
    expect(product('sport-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('sport-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
  });

  it('keeps installation draft-only and template switching unable to mutate commerce, customer, order or B2B authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:SPORT_HUB_TEMPLATE_PACKAGE,componentRegistry:createStorefrontStoryComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='sport-sport-hub')).toBe(true);
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'sport-sport-hub'});
  });

  it('preserves provider-neutral E13 and inherited Wave 40 authority while excluding SQL, production, Supabase, main merge and Wave 60',()=>{
    const checkout=SPORT_HUB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.commerceAuthority.checkout).toBe('shared-provider-neutral-E13');
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.historicalAcceptance).toBe(SPORT_HUB_WAVE40_ACCEPTANCE.mode);
    expect(SPORT_HUB_WAVE59_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','visual-builder-roadmap-expansion','ai-builder-roadmap-expansion',
      'payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','fresh-install-project-state-change','tenant-status-change','tenant-plan-change','main-merge','wave60-implementation',
    ]));
  });
});
