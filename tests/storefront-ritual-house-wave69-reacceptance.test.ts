import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontStoryVisualComponentRegistry,STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-story-visual';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {BEAUTY_LAB_VISUAL_DNA} from '@/lib/builder/templates/beauty-lab';
import {DERMA_STUDIO_VISUAL_DNA} from '@/lib/builder/templates/derma-studio';
import {DERMA_STUDIO_WAVE68_ACCEPTANCE} from '@/lib/builder/templates/derma-studio-wave68-acceptance';
import {
  RITUAL_HOUSE_DESIGN_TOKENS,
  RITUAL_HOUSE_ENGINE_CONTRACT,
  RITUAL_HOUSE_HOME_PAGE,
  RITUAL_HOUSE_HOME_SECTION_ORDER,
  RITUAL_HOUSE_MARKETING_LAYER_CONTRACT,
  RITUAL_HOUSE_PRODUCT_PAGE,
  RITUAL_HOUSE_TEMPLATE_PACKAGE,
  RITUAL_HOUSE_VISUAL_DNA,
} from '@/lib/builder/templates/ritual-house';
import {RITUAL_HOUSE_WAVE50_ACCEPTANCE} from '@/lib/builder/templates/ritual-house-wave50-acceptance';
import {RITUAL_HOUSE_WAVE69_ACCEPTANCE} from '@/lib/builder/templates/ritual-house-wave69-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 69 Ritual House current-baseline reacceptance',()=>{
  it('reconstructs Ritual House as the direct canonical successor to Wave 68 Derma Studio',()=>{
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE).toMatchObject({
      wave:69,historicalCounterpartWave:50,historicalReacceptanceWave:31,historicalOriginalWave:13,
      historicalPullRequest:246,historicalReacceptancePullRequest:177,originalTemplatePullRequest:136,
      predecessorAcceptance:DERMA_STUDIO_WAVE68_ACCEPTANCE.mode,historicalAcceptance:RITUAL_HOUSE_WAVE50_ACCEPTANCE.mode,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'beauty.ritual-house',templateVersion:1,inheritedImplementation:true,
    });
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.sequence).toMatchObject({
      originalPrevious:'wave12-beauty.derma-studio',originalCurrent:'wave13-beauty.ritual-house',
      reacceptancePrevious:'wave30-beauty.derma-studio',reacceptanceCurrent:'wave31-beauty.ritual-house',
      hardenedPrevious:'wave49-beauty.derma-studio',hardenedCurrent:'wave50-beauty.ritual-house',
      currentPrevious:'wave68-beauty.derma-studio',currentCurrent:'wave69-beauty.ritual-house',releaseCheckpointBetweenPreviousAndCurrent:false,
    });
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.manifest.templateKey).toBe('beauty.ritual-house');
  });

  it('records exact provenance and byte-identical inheritance from accepted Wave 50',()=>{
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.provenance).toEqual({
      currentParentWave:68,currentParentHead:'ba504e526e4cfd40873b0e2f9c04634667143de9',
      originalImplementationHead:'115e0c9039bae729708becbd5957f562cd5ff945',originalFinalHead:'fdb608a02b0988ae837eced42c0d2fccdd6d073f',
      originalTemplateBlob:'e3f1526c695e15f142a457d7dfdf3a82fbf22326',originalFinalTemplateBlob:'e3f1526c695e15f142a457d7dfdf3a82fbf22326',
      historicalReacceptanceFinalHead:'76195ce657fa28e12bc07c1a683919865128f67d',historicalReacceptanceTemplateBlob:'6c666e635686d66d00df591725b1beff53ae133e',
      historicalAcceptedFinalHead:'b1a32de10c23fb76fb30c66272ae1d1135f7d7cc',historicalAcceptedTemplateBlob:'6c666e635686d66d00df591725b1beff53ae133e',
      currentInheritedTemplateBlob:'6c666e635686d66d00df591725b1beff53ae133e',byteIdenticalToHistoricalAcceptedTemplate:true,templateModifiedByWave69:false,
    });
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.historicalHardening).toMatchObject({
      originalBlobDiffersFromWave31:true,wave31BlobPersistsThroughWave50:true,currentBlobContainsAcceptedWave50Source:true,
      noCurrentContractDrift:true,noAutomaticReplayOfHistoricalPatch:true,reviewSummaryContract:['rating','count','label'],reviewRatingCountFailClosedToNull:true,
      actualPdpGallery:'desktop-tablet-7-mobile-12',actualPdpBuybox:'desktop-tablet-5-mobile-12',
      sharedAllowlistWidenedByWave69:false,componentRegistryWidenedByWave69:false,bindingNamespaceWidenedByWave69:false,
    });
  });

  it('preserves Ritual House visual DNA and separates it from Beauty Lab and Derma Studio',()=>{
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).toBe('mood-to-ritual-to-format-to-scent-or-ingredient-to-product');
    expect(RITUAL_HOUSE_VISUAL_DNA.character).not.toBe(BEAUTY_LAB_VISUAL_DNA.character);
    expect(RITUAL_HOUSE_VISUAL_DNA.character).not.toBe(DERMA_STUDIO_VISUAL_DNA.character);
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).not.toBe(BEAUTY_LAB_VISUAL_DNA.journey);
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).not.toBe(DERMA_STUDIO_VISUAL_DNA.journey);
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.visualContract.palette).toEqual(['smoked-umber','warm-taupe','soft-ivory','candle-amber','muted-sage']);
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.visualContract.typography).toEqual(['soft-editorial-serif','clean-warm-sans']);
    expect(RITUAL_HOUSE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(RITUAL_HOUSE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['clinical-skincare','medical-aromatherapy','health-outcome-claims','pure-home-decor-store','black-box-wellness-score']));
  });

  it('keeps the exact Home structure and independently editable shared hero and E10 story layers',()=>{
    expect(RITUAL_HOUSE_HOME_SECTION_ORDER).toEqual(['Atmosphere Hero','Ritual by Mood','Bath & Body','Home Fragrance','Evening Ritual Story','Featured Ritual Sets','Scent & Ingredient Notes','Reviews','Journal','Footer']);
    expect(RITUAL_HOUSE_HOME_PAGE.metadata?.sectionOrder).toEqual(RITUAL_HOUSE_HOME_SECTION_ORDER);
    expect(STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-content-or-guidance-authority');
    expect(RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','eyebrow','heading','copy','primary-cta','secondary-cta']);
    for(const id of ['ritual-hero-image-layer','ritual-hero-overlay-layer','ritual-hero-decoration-layer','ritual-hero-eyebrow-layer','ritual-hero-heading-layer','ritual-hero-copy-layer','ritual-hero-primary-cta-layer','ritual-hero-secondary-cta-layer']) expect(find(RITUAL_HOUSE_HOME_PAGE,id)?.componentKey).toBe('visual.layer');
    expect(find(RITUAL_HOUSE_HOME_PAGE,'ritual-atmosphere-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    expect(find(RITUAL_HOUSE_HOME_PAGE,'ritual-evening-story')?.componentKey).toBe('story.feature');
    expect(find(RITUAL_HOUSE_HOME_PAGE,'ritual-story-index')?.componentKey).toBe('story.index');
    expect(RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.imageRule).toBe('marketing-copy-price-rating-stock-product-facts-wellness-claims-and-cta-never-baked-into-image-assets');
  });

  it('keeps mood and ritual editorial-only while E7 structured facts fail closed',()=>{
    expect(RITUAL_HOUSE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.guidanceAuthority).toMatchObject({
      mode:'editorial-merchandising-navigation-only',mood:'merchant-taxonomy-not-psychological-state-inference',ritual:'merchant-navigation-not-health-protocol',
      diagnosis:false,psychologicalAssessment:false,medicalAdvice:false,treatmentPlan:false,healthOutcomeScoring:false,sleepStressAnxietyOutcomeAuthority:false,aromatherapyEfficacyAuthority:false,
    });
    expect(find(RITUAL_HOUSE_HOME_PAGE,'ritual-by-mood-nav')?.config.items).toEqual([]);
    expect(find(RITUAL_HOUSE_HOME_PAGE,'ritual-scent-specs')?.config.items).toEqual([]);
    expect(find(RITUAL_HOUSE_PRODUCT_PAGE,'ritual-product-key-specs')?.config.items).toEqual([]);
    expect(find(RITUAL_HOUSE_PRODUCT_PAGE,'ritual-product-spec-groups')?.config.groups).toEqual([]);
    expect(find(RITUAL_HOUSE_PRODUCT_PAGE,'ritual-product-recommendations-block')?.config.products).toEqual([]);
  });

  it('retains the current review-summary registry/config/binding contract with null-safe evidence',()=>{
    const reviews=find(RITUAL_HOUSE_HOME_PAGE,'ritual-review-summary');
    expect(reviews?.componentKey).toBe('commerce.review-summary');
    expect(Object.keys(reviews?.config??{}).sort()).toEqual(['count','label','rating']);
    expect(Object.keys(reviews?.bindings??{}).sort()).toEqual(['count','label','rating']);
    expect(reviews?.config.rating).toBeNull();
    expect(reviews?.config.count).toBeNull();
    expect(reviews?.bindings?.rating).toEqual({path:'reviews.rating',fallback:null});
    expect(reviews?.bindings?.count).toEqual({path:'reviews.count',fallback:null});
    expect(reviews?.bindings?.label).toEqual({path:'reviews.label',fallback:'Vásárlói tapasztalatok'});
  });

  it('keeps every binding inside current shared namespaces and shared E1/E2/E7/E10/E13 authority',()=>{
    const paths=RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths) expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(path.split('.')[0] as never);
    for(const prefix of ['ritual.','medical.','psychological.','wellnessScore.','price.','stock.','payment.']) expect(paths.some(path=>path.startsWith(prefix))).toBe(false);
    expect(paths).toEqual(expect.arrayContaining(['content.eveningRitual.title','content.journal.items','catalog.scentAndIngredientNotes','product.keySpecs','product.specGroups']));
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.sharedAuthority).toMatchObject({runtime:'E1-shared-page-schema-runtime',discovery:'E2-shared-product-discovery',structuredFacts:'E7-or-authoritative-shared-product-binding-only',editorialStory:'E10-shared-editorial-story-only',checkout:'shared-provider-neutral-E13'});
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with unique page-local node IDs',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:RITUAL_HOUSE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of RITUAL_HOUSE_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('retains the actual 7/12 gallery plus 5/12 responsive buybox wrapper',()=>{
    const gallery=find(RITUAL_HOUSE_PRODUCT_PAGE,'ritual-product-gallery');
    const buybox=find(RITUAL_HOUSE_PRODUCT_PAGE,'ritual-product-buybox');
    expect(gallery?.componentKey).toBe('commerce.product-gallery');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.componentKey).toBe('layout.stack');
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(bindingPaths(RITUAL_HOUSE_PRODUCT_PAGE)).toEqual(expect.arrayContaining(['pricing.displayPrice','inventory.stockLabel','product.keySpecs','product.specGroups','commerce.purchaseHref']));
  });

  it('keeps draft-only installation and demo fixtures outside sellable, wellness and medical authority',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:RITUAL_HOUSE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='beauty-ritual-house')).toBe(true);
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'beauty-ritual-house',inheritedDemoFixturesAreNonAuthoritative:true});
    for(const fixture of RITUAL_HOUSE_TEMPLATE_PACKAGE.demoFixtures??[]){
      expect(JSON.stringify(fixture.payload)).not.toMatch(/gyógyít|kezel(?:és|i)|betegség|terápia|diagnosis|cure|treats|sleep score|stress score|anxiety score|aromatherapy efficacy/i);
      for(const forbidden of ['price','stock','inventory','rating','reviewCount','efficacy','treatment','cure','wellnessScore']) expect(Object.prototype.hasOwnProperty.call(fixture.payload,forbidden)).toBe(false);
    }
  });

  it('keeps provider-neutral E13 checkout and excludes shared-authority, schema, production, main and Wave 70 changes',()=>{
    const checkout=RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',stableIdentity:'stable-page-local-unique-node-ids-and-stable-binding-paths',
      responsiveModes:['desktop','tablet','mobile'],pagePresetCount:14,minimumPlan:'alap',protectedHomeSequence:true,protectedPdpGrid:'desktop-tablet-7-5-mobile-12-12',
      runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(RITUAL_HOUSE_WAVE69_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'artificial-canonical-template-diff','template-local-recommendation-engine','template-local-mood-inference-engine','template-local-wellness-scoring-engine',
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','sql-migration','customer-baseline-change',
      'vercel-production-deploy','supabase-mutation','storefront-14-14-reconciliation','parallel-main-import','visual-builder-ux-scope','email-builder-scope','template-library-ux-scope','roadmap-scope','main-merge','wave70-implementation',
    ]));
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.mode).toBe('current-baseline-reacceptance-and-builder-hardening');
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE.mode).toBe('current-baseline-reacceptance-and-builder-hardening');
  });
});
