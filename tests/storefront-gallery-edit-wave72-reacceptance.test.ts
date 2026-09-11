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
import {ALPINE_LODGE_VISUAL_DNA} from '@/lib/builder/templates/alpine-lodge';
import {ALPINE_LODGE_WAVE71_ACCEPTANCE} from '@/lib/builder/templates/alpine-lodge-wave71-acceptance';
import {
  GALLERY_EDIT_DESIGN_TOKENS,
  GALLERY_EDIT_ENGINE_CONTRACT,
  GALLERY_EDIT_HOME_PAGE,
  GALLERY_EDIT_HOME_SECTION_ORDER,
  GALLERY_EDIT_MARKETING_LAYER_CONTRACT,
  GALLERY_EDIT_PRODUCT_PAGE,
  GALLERY_EDIT_TEMPLATE_MANIFEST,
  GALLERY_EDIT_TEMPLATE_PACKAGE,
  GALLERY_EDIT_VISUAL_DNA,
} from '@/lib/builder/templates/gallery-edit';
import {GALLERY_EDIT_WAVE34_ACCEPTANCE} from '@/lib/builder/templates/gallery-edit-wave34-acceptance';
import {GALLERY_EDIT_WAVE53_ACCEPTANCE} from '@/lib/builder/templates/gallery-edit-wave53-acceptance';
import {GALLERY_EDIT_WAVE72_ACCEPTANCE} from '@/lib/builder/templates/gallery-edit-wave72-acceptance';
import {TABLE_GIFT_VISUAL_DNA} from '@/lib/builder/templates/table-gift';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const requiredFocusPages=['home','catalog','search','product','content','blog-index','blog-article','checkout'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const commerceDefinition=(key:string)=>STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS.find(item=>item.manifest.componentKey===key)!;

describe('Scale-out Wave 72 Gallery Edit current-baseline reacceptance',()=>{
  it('proves Gallery Edit is the direct canonical successor to Wave 71 across original, historical and hardened replay chains',()=>{
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE).toMatchObject({wave:72,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'home.gallery-edit',templateVersion:1,inheritedImplementation:true});
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.predecessorAcceptance).toBe(ALPINE_LODGE_WAVE71_ACCEPTANCE.mode);
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.historicalAcceptance).toBe(GALLERY_EDIT_WAVE34_ACCEPTANCE.mode);
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.hardenedAcceptance).toBe(GALLERY_EDIT_WAVE53_ACCEPTANCE.mode);
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.sequence.originalScaleOut).toEqual({alpine:'wave14-pr137-outdoor.alpine-lodge',successor:'wave15-pr138-home.gallery-edit',baseBranch:'feature/storefront-alpine-lodge-wave14',baseHead:'51b7696497d7d64da300198c822ef9b9b3ca6eb9'});
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.sequence.historicalReacceptance).toEqual({alpine:'wave33-pr189-outdoor.alpine-lodge',successor:'wave34-pr194-home.gallery-edit',baseBranch:'feature/storefront-alpine-lodge-wave33',baseHead:'599dbb930e49fb2caa80be4c44edcec4425d78a1'});
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.sequence.hardenedReplay).toEqual({alpine:'wave52-pr251-outdoor.alpine-lodge',successor:'wave53-pr254-home.gallery-edit',baseBranch:'feature/storefront-alpine-lodge-wave52',baseHead:'88a5431f39d74675f3eaf5b68006d5ad7f22c2a5'});
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.sequence.currentReplay).toEqual({ritual:'wave69-pr281-home.ritual-house',beauty:'wave70-pr282-beauty.beauty-lab',alpine:'wave71-pr283-outdoor.alpine-lodge',successor:'wave72-home.gallery-edit'});
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.sequence.releaseCheckpointBetweenHistoricalAlpineAndGallery).toBe(false);
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.sequence.releaseCheckpointBetweenHardenedAlpineAndGallery).toBe(false);
  });

  it('locks original, Wave 34, Wave 53 and Wave 71-parent provenance and proves no current canonical drift',()=>{
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.provenance).toEqual({
      currentParentWave:71,currentParentHead:'417819a8588c23d91df008b435d0c9680f6e30b0',
      originalImplementationWave:15,originalPullRequest:138,originalImplementationHead:'a25f0b4082768622121631ef29463cfb4d00e9c3',originalFinalDocumentationHead:'96f74bac17443f0c733f089da8decad3d13ecd11',originalTemplateBlob:'8f52686e45b7b00e29d192f2c6065f5120d26729',
      historicalReacceptanceWave:34,historicalReacceptancePullRequest:194,historicalImplementationHead:'cffcbc83bc9ff40168121327eba4a0d2a61f437a',historicalFinalAcceptedHead:'ad2709286200692d3f39c51e77c019c0fec0c948',historicalAcceptedTemplateBlob:'fe8c36d966340a7011fd88f8ea24950f1e2dac44',
      hardenedCounterpartWave:53,hardenedCounterpartPullRequest:254,hardenedFinalAcceptedHead:'9d0b065e2758dd9e746b496bfa57b1e1733b007d',hardenedAcceptedTemplateBlob:'fe8c36d966340a7011fd88f8ea24950f1e2dac44',currentInheritedTemplateBlob:'fe8c36d966340a7011fd88f8ea24950f1e2dac44',
      originalBlobDiffersFromHistoricalAccepted:true,wave34EqualsWave53:true,wave53EqualsCurrentParent:true,byteIdenticalToWave53AcceptedTemplate:true,templateModifiedByWave72:false,
    });
  });

  it('preserves the exact historical Wave 34 hardening rather than replaying its old patch',()=>{
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.historicalHardening).toMatchObject({
      heroMovedFromLegacyStoryHeroToSharedLayeredCanvas:true,storyFeatureFullSlotsBound:true,fabricatedZeroReviewEvidenceRemoved:true,journalBindingMovedToContentNamespace:true,catalogDuplicateNodeIdentityRemoved:true,simpleContentBindingsStabilized:true,
      currentBlobContainsHistoricalAcceptedSource:true,noCurrentContractDrift:true,noAutomaticReplayOfHistoricalPatch:true,
      sharedAllowlistWidenedByWave72:false,componentRegistryWidenedByWave72:false,bindingNamespaceWidenedByWave72:false,pageSchemaAllowlistWidenedByWave72:false,
    });
    expect(find(GALLERY_EDIT_HOME_PAGE,'gallery-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    for(const id of ['gallery-hero-image-layer','gallery-hero-overlay-layer','gallery-hero-eyebrow-layer','gallery-hero-heading-layer','gallery-hero-copy-layer','gallery-hero-primary-cta-layer'])expect(find(GALLERY_EDIT_HOME_PAGE,id)?.componentKey).toBe('visual.layer');
    expect(JSON.stringify(find(GALLERY_EDIT_HOME_PAGE,'gallery-story-index')?.bindings??{})).toContain('content.journal.items');
    const catalog=GALLERY_EDIT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    expect(find(catalog,'gallery-catalog-collection-header')?.componentKey).toBe('commerce.collection-header');
  });

  it('keeps the protected Gallery Edit visual identity, merchandising journey and exact Home sequence',()=>{
    expect(GALLERY_EDIT_VISUAL_DNA.character).toBe('contemporary-interior-design-gallery-concept-commerce');
    expect(GALLERY_EDIT_VISUAL_DNA.category).toBe('home-living-design');
    expect(GALLERY_EDIT_VISUAL_DNA.journey).toBe('edit-to-room-or-object-type-to-material-to-object-to-story');
    expect(GALLERY_EDIT_VISUAL_DNA.character).not.toBe(ALPINE_LODGE_VISUAL_DNA.character);
    expect(GALLERY_EDIT_VISUAL_DNA.character).not.toBe(TABLE_GIFT_VISUAL_DNA.character);
    expect(GALLERY_EDIT_HOME_SECTION_ORDER).toEqual(['Gallery Hero','Curated Rooms','New Objects','Designer Story','Material Edit','Gallery Grid','Featured Edit','Reviews','Journal','Footer']);
    expect(GALLERY_EDIT_HOME_PAGE.metadata?.sectionOrder).toEqual(GALLERY_EDIT_HOME_SECTION_ORDER);
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','eyebrow','heading','copy','primary-cta']);
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-story-no-template-local-engine');
    expect(STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-content-or-guidance-authority');
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.imageRule).toContain('never-baked-into-image-assets');
    expect(GALLERY_EDIT_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('locks the current shared review-summary contract and keeps missing review evidence fail-closed',()=>{
    const definition=commerceDefinition('commerce.review-summary');
    expect(definition.manifest.pageTypes).toEqual(['home','product']);
    expect(definition.manifest.configurable).toEqual(['rating','count','label']);
    expect(definition.bindingSlots).toEqual(['rating','count','label']);
    const review=find(GALLERY_EDIT_HOME_PAGE,'gallery-review-summary')!;
    expect(review.componentKey).toBe('commerce.review-summary');
    expect(Object.keys(review.config??{}).sort()).toEqual(['count','label','rating']);
    expect(Object.keys(review.bindings??{}).sort()).toEqual(['count','label','rating']);
    expect(review.config.rating).toBeNull();
    expect(review.config.count).toBeNull();
    expect(review.bindings?.rating).toEqual({path:'reviews.rating',fallback:null});
    expect(review.bindings?.count).toEqual({path:'reviews.count',fallback:null});
  });

  it('keeps E7 product truth and E10 editorial storytelling separate and fail-closed',()=>{
    expect(GALLERY_EDIT_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.truthAuthority).toMatchObject({
      material:'E7-or-authoritative-shared-product-binding-only',dimensions:'E7-or-authoritative-shared-product-binding-only',finish:'E7-or-authoritative-shared-product-binding-only',care:'E7-or-authoritative-shared-product-binding-only',
      designerProvenance:'authoritative-shared-product-or-merchant-source-only',missingAuthoritativeData:'empty-or-null-fail-closed',templateLocalMaterialAuthority:false,templateLocalDimensionAuthority:false,templateLocalDesignerProvenanceAuthority:false,templateLocalProductTruthPersistence:false,
    });
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.editorialBoundary).toMatchObject({engine:'E10-shared-editorial-story-presentation',merchantAuthoredEditorialAllowed:true,productTruthAuthority:false,designerProvenanceAuthority:false,materialTruthAuthority:false,dimensionAuthority:false,availabilityAuthority:false,certificationAuthority:false});
    for(const [id,root,page] of [
      ['gallery-designer-story','content.designerStory',GALLERY_EDIT_HOME_PAGE],
      ['gallery-product-story','content.productStory',GALLERY_EDIT_PRODUCT_PAGE],
    ] as const){
      const node=find(page,id)!;
      expect(node.componentKey).toBe('story.feature');
      const source=JSON.stringify(node.bindings??{});
      for(const slot of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(source).toContain(`${root}.${slot}`);
    }
    expect(find(GALLERY_EDIT_PRODUCT_PAGE,'gallery-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(find(GALLERY_EDIT_PRODUCT_PAGE,'gallery-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
  });

  it('validates all 14 Alap presets and explicitly retains the required current-runtime focus pages',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:GALLERY_EDIT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(GALLERY_EDIT_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(GALLERY_EDIT_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(GALLERY_EDIT_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(GALLERY_EDIT_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    for(const pageType of requiredFocusPages)expect(GALLERY_EDIT_TEMPLATE_PACKAGE.pages.some(page=>page.pageType===pageType),`missing focus page ${pageType}`).toBe(true);
    for(const page of GALLERY_EDIT_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      for(const path of bindingPaths(page))expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${page.pageType}:${path}`).toContain(path.split('.')[0] as never);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('proves the actual responsive PDP 7/12 gallery plus 5/12 buybox wrapper over shared authoritative bindings',()=>{
    const gallery=find(GALLERY_EDIT_PRODUCT_PAGE,'gallery-product-gallery');
    const buybox=find(GALLERY_EDIT_PRODUCT_PAGE,'gallery-product-buybox');
    expect(gallery?.componentKey).toBe('commerce.product-gallery');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.componentKey).toBe('layout.stack');
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(GALLERY_EDIT_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.products'])expect(source).toContain(path);
    for(const prefix of ['gallery.','home.','price.','stock.','checkout.','payment.'])expect(bindingPaths(GALLERY_EDIT_PRODUCT_PAGE).some(path=>path.startsWith(prefix))).toBe(false);
  });

  it('keeps marketing assets presentation-only and authoritative data outside image fixtures',()=>{
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.imageRule).toBe('marketing-copy-price-rating-stock-product-facts-provenance-material-claims-and-cta-never-baked-into-image-assets');
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.commerceAuthority).toMatchObject({pricing:'pricing-binding-only',inventory:'inventory-binding-only',reviews:'review-binding-only',recommendations:'shared-recommendation-binding-only',noFakeDesignerProvenance:true,noFakeMaterialClaim:true,noFakeDimensions:true});
    for(const fixture of GALLERY_EDIT_TEMPLATE_PACKAGE.demoFixtures??[]){
      const payload=JSON.stringify(fixture.payload);
      expect(payload).not.toMatch(/authentic designer|certified marble|solid oak certified|handmade in italy|made in denmark|limited stock|only [0-9]+ left|rating[:=][0-9]|[€$£][0-9]/i);
    }
  });

  it('keeps installation draft-only, Alap-compatible and unable to mutate commerce/customer/B2B authority',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:GALLERY_EDIT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='home-gallery-edit')).toBe(true);
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'home-gallery-edit',inheritedDemoFixturesAreNonAuthoritative:true});
  });

  it('keeps shared E1/E2/E7/E10/E13 authority and provider-neutral E13 checkout without Gallery-local engines',()=>{
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.commerceAuthority).toMatchObject({runtime:'E1-shared-page-schema-runtime',productEligibility:'E2-shared-discovery-only',structuredFacts:'E7-or-authoritative-shared-product-binding-only',editorial:'E10-shared-story-presentation-only',checkout:'E13-shared-provider-neutral-checkout',noTemplateProductAuthority:true,noTemplateRecommendationEngine:true,noTemplatePricingAuthority:true,noTemplateInventoryAuthority:true,noTemplateCheckoutAuthority:true,noTemplatePaymentAuthority:true});
    const checkout=GALLERY_EDIT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(GALLERY_EDIT_WAVE72_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','page-schema-allowlist-widening',
      'sql-migration','customer-baseline-change','supabase-mutation','tenant-status-change','tenant-plan-change','storefront-reconciliation','kh-vpos-change','production-deploy','parallel-main-import','main-merge','wave73-implementation',
    ]));
  });
});
