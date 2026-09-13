import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-commerce';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {createStorefrontStoryVisualComponentRegistry,STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-story-visual';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  ALPINE_LODGE_DESIGN_TOKENS,
  ALPINE_LODGE_ENGINE_CONTRACT,
  ALPINE_LODGE_HOME_PAGE,
  ALPINE_LODGE_HOME_SECTION_ORDER,
  ALPINE_LODGE_MARKETING_LAYER_CONTRACT,
  ALPINE_LODGE_PRODUCT_PAGE,
  ALPINE_LODGE_TEMPLATE_MANIFEST,
  ALPINE_LODGE_TEMPLATE_PACKAGE,
  ALPINE_LODGE_VISUAL_DNA,
} from '@/lib/builder/templates/alpine-lodge';
import {ALPINE_LODGE_WAVE33_ACCEPTANCE} from '@/lib/builder/templates/alpine-lodge-wave33-acceptance';
import {ALPINE_LODGE_WAVE52_ACCEPTANCE} from '@/lib/builder/templates/alpine-lodge-wave52-acceptance';
import {ALPINE_LODGE_WAVE71_ACCEPTANCE} from '@/lib/builder/templates/alpine-lodge-wave71-acceptance';
import {BEAUTY_LAB_WAVE70_ACCEPTANCE} from '@/lib/builder/templates/beauty-lab-wave70-acceptance';
import {TRAIL_EXPEDITION_HOME_SECTION_ORDER,TRAIL_EXPEDITION_VISUAL_DNA} from '@/lib/builder/templates/trail-expedition';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const commerceDefinition=(key:string)=>STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS.find(item=>item.manifest.componentKey===key)!;

describe('Scale-out Wave 71 Alpine Lodge current-baseline reacceptance',()=>{
  it('proves Alpine Lodge is the direct canonical successor to Wave 70 in both authoritative replay chains',()=>{
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE).toMatchObject({wave:71,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'outdoor.alpine-lodge',templateVersion:1,inheritedImplementation:true});
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.predecessorAcceptance).toBe(BEAUTY_LAB_WAVE70_ACCEPTANCE.mode);
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.sequence).toEqual({
      originalScaleOut:{ritual:'wave13-pr136',successor:'wave14-pr137-outdoor.alpine-lodge'},
      historicalReacceptance:{ritual:'wave31-pr177',beauty:'wave32-pr184',successor:'wave33-pr189-outdoor.alpine-lodge'},
      hardenedReplay:{ritual:'wave50-pr246',beauty:'wave51-pr249',successor:'wave52-pr251-outdoor.alpine-lodge'},
      currentReplay:{ritual:'wave69-pr281',beauty:'wave70-pr282',successor:'wave71-outdoor.alpine-lodge'},
      authoritativeOrder:'historical-reacceptance-and-current-baseline-replay',
      releaseCheckpointBetweenHistoricalBeautyAndAlpine:false,releaseCheckpointBetweenHardenedBeautyAndAlpine:false,
      relationship:'ritual-to-beauty-to-alpine-reacceptance-order-replayed-on-current-stacked-baseline',
    });
  });

  it('locks original, Wave 33, Wave 52 and Wave 70-parent provenance and proves no current canonical drift',()=>{
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.provenance).toEqual({
      currentParentWave:70,currentParentHead:'e8011747b2ad51bc313e215a938e64f93b998c11',
      originalImplementationWave:14,originalPullRequest:137,originalImplementationHead:'4abadcdbc8c46a771d4487a09a84a7609efb64f0',originalFinalDocumentationHead:'51b7696497d7d64da300198c822ef9b9b3ca6eb9',originalTemplateBlob:'f440c7a2eb8800e11e210f6ad3e024d5a1d3840f',
      historicalReacceptanceWave:33,historicalReacceptancePullRequest:189,historicalImplementationHead:'cf8974aedf47298e6da4b9a2693f840296398513',historicalFinalAcceptedHead:'599dbb930e49fb2caa80be4c44edcec4425d78a1',historicalAcceptedTemplateBlob:'68ad957eff67e9c3b0303736a493706f30032601',
      hardenedCounterpartWave:52,hardenedCounterpartPullRequest:251,hardenedFinalAcceptedHead:'88a5431f39d74675f3eaf5b68006d5ad7f22c2a5',hardenedAcceptedTemplateBlob:'68ad957eff67e9c3b0303736a493706f30032601',currentInheritedTemplateBlob:'68ad957eff67e9c3b0303736a493706f30032601',
      originalBlobDiffersFromHistoricalAccepted:true,wave33EqualsWave52:true,wave52EqualsCurrentParent:true,byteIdenticalToWave52AcceptedTemplate:true,templateModifiedByWave71:false,
    });
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.historicalAcceptance).toBe(ALPINE_LODGE_WAVE33_ACCEPTANCE.mode);
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.hardenedAcceptance).toBe(ALPINE_LODGE_WAVE52_ACCEPTANCE.mode);
  });

  it('preserves the exact historical Wave 33 hardening rather than replaying its old patch',()=>{
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.historicalHardening).toMatchObject({
      heroMovedFromLegacyStoryHeroToSharedLayeredCanvas:true,fabricatedZeroReviewEvidenceRemoved:true,journalBindingMovedToContentNamespace:true,catalogDuplicateNodeIdentityRemoved:true,
      currentBlobContainsHistoricalAcceptedSource:true,noCurrentContractDrift:true,noAutomaticReplayOfHistoricalPatch:true,
      sharedAllowlistWidenedByWave71:false,componentRegistryWidenedByWave71:false,bindingNamespaceWidenedByWave71:false,pageSchemaAllowlistWidenedByWave71:false,
    });
    expect(find(ALPINE_LODGE_HOME_PAGE,'alpine-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    for(const id of ['alpine-hero-image-layer','alpine-hero-overlay-layer','alpine-hero-decoration-layer','alpine-hero-eyebrow-layer','alpine-hero-heading-layer','alpine-hero-copy-layer','alpine-hero-primary-cta-layer','alpine-hero-secondary-cta-layer'])expect(find(ALPINE_LODGE_HOME_PAGE,id)?.componentKey).toBe('visual.layer');
    expect(JSON.stringify(find(ALPINE_LODGE_HOME_PAGE,'alpine-story-index')?.bindings??{})).toContain('content.journal.items');
    const catalog=ALPINE_LODGE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    expect(find(catalog,'alpine-catalog-collection-header')?.componentKey).toBe('commerce.collection-header');
  });

  it('keeps the protected Alpine visual identity, merchandising journey and exact Home sequence',()=>{
    expect(ALPINE_LODGE_VISUAL_DNA.character).toBe('warm-natural-luxury-alpine-editorial-outdoor-commerce');
    expect(ALPINE_LODGE_VISUAL_DNA.journey).toBe('collection-to-layer-or-use-context-to-material-to-product-to-story');
    expect(ALPINE_LODGE_VISUAL_DNA.character).not.toBe(TRAIL_EXPEDITION_VISUAL_DNA.character);
    expect(ALPINE_LODGE_HOME_SECTION_ORDER).not.toEqual(TRAIL_EXPEDITION_HOME_SECTION_ORDER);
    expect(ALPINE_LODGE_HOME_SECTION_ORDER).toEqual(['Alpine Hero','Shop by Collection','Seasonal Layers','Material Story','Featured Collection','Lodge Essentials','Crafted Details','Reviews','Field Journal','Footer']);
    expect(ALPINE_LODGE_HOME_PAGE.metadata?.sectionOrder).toEqual(ALPINE_LODGE_HOME_SECTION_ORDER);
    expect(ALPINE_LODGE_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','eyebrow','heading','copy','primary-cta','secondary-cta']);
    expect(ALPINE_LODGE_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-story-no-template-local-engine');
    expect(STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-content-or-guidance-authority');
    expect(ALPINE_LODGE_MARKETING_LAYER_CONTRACT.imageRule).toContain('never-baked-into-image-assets');
    expect(ALPINE_LODGE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('locks the current shared review-summary contract and keeps missing review evidence fail-closed',()=>{
    const definition=commerceDefinition('commerce.review-summary');
    expect(definition.manifest.pageTypes).toEqual(['home','product']);
    expect(definition.manifest.configurable).toEqual(['rating','count','label']);
    expect(definition.bindingSlots).toEqual(['rating','count','label']);
    const review=find(ALPINE_LODGE_HOME_PAGE,'alpine-review-summary')!;
    expect(review.componentKey).toBe('commerce.review-summary');
    expect(Object.keys(review.config??{}).sort()).toEqual(['count','label','rating']);
    expect(Object.keys(review.bindings??{}).sort()).toEqual(['count','label','rating']);
    expect(review.config.rating).toBeNull();
    expect(review.config.count).toBeNull();
    expect(review.bindings?.rating).toEqual({path:'reviews.rating',fallback:null});
    expect(review.bindings?.count).toEqual({path:'reviews.count',fallback:null});
  });

  it('keeps E7 product truth and E10 editorial storytelling separate and fail-closed',()=>{
    expect(ALPINE_LODGE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.truthAuthority).toMatchObject({
      material:'E7-or-authoritative-shared-product-binding-only',fit:'E7-or-authoritative-shared-product-binding-only',care:'E7-or-authoritative-shared-product-binding-only',technicalFacts:'E7-or-authoritative-shared-product-binding-only',
      missingAuthoritativeData:'empty-or-null-fail-closed',templateLocalMaterialRegistry:false,templateLocalPerformanceAuthority:false,templateLocalProvenanceAuthority:false,templateLocalCertificationAuthority:false,templateLocalSustainabilityAuthority:false,templateLocalProductTruthPersistence:false,
    });
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.editorialBoundary).toMatchObject({engine:'E10-shared-editorial-story-presentation',merchantAuthoredEditorialAllowed:true,productTruthAuthority:false,technicalSpecificationAuthority:false,waterproofWindproofEvidenceAuthority:false,provenanceAuthority:false,sustainabilityCertificationAuthority:false});
    for(const [id,root,page] of [
      ['alpine-material-story','content.materialStory',ALPINE_LODGE_HOME_PAGE],
      ['alpine-product-story','content.productStory',ALPINE_LODGE_PRODUCT_PAGE],
    ] as const){
      const node=find(page,id)!;
      expect(node.componentKey).toBe('story.feature');
      const source=JSON.stringify(node.bindings??{});
      for(const slot of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(source).toContain(`${root}.${slot}`);
    }
    expect(find(ALPINE_LODGE_PRODUCT_PAGE,'alpine-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(find(ALPINE_LODGE_PRODUCT_PAGE,'alpine-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
  });

  it('validates all 14 Alap presets with current shared registry, page-local unique IDs and existing binding namespaces',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:ALPINE_LODGE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(ALPINE_LODGE_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(ALPINE_LODGE_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(ALPINE_LODGE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(ALPINE_LODGE_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    for(const page of ALPINE_LODGE_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      for(const path of bindingPaths(page))expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${page.pageType}:${path}`).toContain(path.split('.')[0] as never);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('proves the actual responsive PDP 7/12 gallery plus 5/12 buybox wrapper over shared authoritative bindings',()=>{
    const gallery=find(ALPINE_LODGE_PRODUCT_PAGE,'alpine-product-gallery');
    const buybox=find(ALPINE_LODGE_PRODUCT_PAGE,'alpine-product-buybox');
    expect(gallery?.componentKey).toBe('commerce.product-gallery');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.componentKey).toBe('layout.stack');
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(ALPINE_LODGE_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.products'])expect(source).toContain(path);
    for(const prefix of ['alpine.','outdoor.','price.','stock.','checkout.','payment.'])expect(bindingPaths(ALPINE_LODGE_PRODUCT_PAGE).some(path=>path.startsWith(prefix))).toBe(false);
  });

  it('keeps installation draft-only, Alap-compatible and unable to mutate commerce/customer/B2B authority',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:ALPINE_LODGE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='outdoor-alpine-lodge')).toBe(true);
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'outdoor-alpine-lodge',inheritedDemoFixturesAreNonAuthoritative:true});
    for(const fixture of ALPINE_LODGE_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/waterproof|windproof|gore-tex|weatherproof|carbon neutral|organic certified|made in switzerland|handmade in switzerland|sustainable certified/i);
  });

  it('keeps shared E1/E2/E7/E10/E13 authority and provider-neutral E13 checkout without Alpine-local engines',()=>{
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.commerceAuthority).toMatchObject({runtime:'E1-shared-page-schema-runtime',productEligibility:'E2-shared-discovery-only',structuredFacts:'E7-or-authoritative-shared-product-binding-only',editorial:'E10-shared-story-presentation-only',checkout:'E13-shared-provider-neutral-checkout',noTemplateProductAuthority:true,noTemplateRecommendationEngine:true,noTemplatePricingAuthority:true,noTemplateInventoryAuthority:true,noTemplateCheckoutAuthority:true,noTemplatePaymentAuthority:true});
    const checkout=ALPINE_LODGE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['template-local-builder-engine','template-local-layout-engine','template-local-product-engine','template-local-recommendation-engine','template-local-material-registry','shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','page-schema-allowlist-widening']));
  });

  it('keeps Wave 71 as evidence-only no-churn scope over unchanged customer, payment and release authorities',()=>{
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.provenance.templateModifiedByWave71).toBe(false);
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.historicalHardening.noCurrentContractDrift).toBe(true);
    expect(ALPINE_LODGE_WAVE71_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'canonical-alpine-lodge-template-churn','sql-migration','customer-baseline-change','supabase-mutation','fresh-install-project-state-change','tenant-status-change','tenant-plan-change','storefront-14-14-reconciliation','kh-vpos-change','production-deploy','parallel-main-import','visual-builder-ux-scope','email-builder-scope','template-library-ux-scope','roadmap-scope','main-merge','wave72-implementation',
    ]));
  });
});
