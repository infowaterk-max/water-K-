import {describe,expect,it} from 'vitest';
import {runGuidedFinder,validateGuidedFinderConfig,type FinderCandidate,type GuidedFinderConfig} from '@/lib/commerce/guided-finder';
import {MULTI_PRODUCT_COMPOSER_ENGINE_VERSION} from '@/lib/commerce/multi-product-composer';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-guided-finder';
import {createStorefrontGuidedVisualComponentRegistry,STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-guided-visual';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  BEAUTY_LAB_DESIGN_TOKENS,
  BEAUTY_LAB_HOME_PAGE,
  BEAUTY_LAB_HOME_SECTION_ORDER,
  BEAUTY_LAB_MARKETING_LAYER_CONTRACT,
  BEAUTY_LAB_PRODUCT_PAGE,
  BEAUTY_LAB_TEMPLATE_PACKAGE,
  BEAUTY_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/beauty-lab';
import {BEAUTY_LAB_WAVE32_ACCEPTANCE} from '@/lib/builder/templates/beauty-lab-wave32-acceptance';
import {BEAUTY_LAB_WAVE51_ACCEPTANCE} from '@/lib/builder/templates/beauty-lab-wave51-acceptance';
import {BEAUTY_LAB_WAVE70_ACCEPTANCE} from '@/lib/builder/templates/beauty-lab-wave70-acceptance';
import {DERMA_STUDIO_VISUAL_DNA} from '@/lib/builder/templates/derma-studio';
import {RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';
import {RITUAL_HOUSE_WAVE69_ACCEPTANCE} from '@/lib/builder/templates/ritual-house-wave69-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const definition=(key:string)=>STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS.find(item=>item.manifest.componentKey===key)!;

const finderConfig:GuidedFinderConfig={
  version:1,tenantId:'beauty-wave70-demo',finderKey:'formula',label:'Formula Finder',safetyPolicy:'non-diagnostic',partialPolicy:'show-nearest',maxResults:4,
  steps:[{id:'formula',title:'Formula',questions:[{id:'texture',label:'Milyen textúrát kedvelsz?',mode:'single',required:true,options:[
    {id:'gel',label:'Gél',rules:[{id:'texture-gel',attributeKey:'texture',operator:'eq',value:'gel',kind:'required',reason:'Gél textúrát választottál.'}]},
  ]}]}],
};
const finderCandidates:FinderCandidate[]=[
  {id:'matching',label:'Matching Gel',href:'/termek/matching',eligible:true,attributes:{texture:'gel'}},
  {id:'unknown',label:'Unknown Texture',href:'/termek/unknown',eligible:true,attributes:{}},
  {id:'ineligible',label:'Hidden Gel',href:'/termek/hidden',eligible:false,attributes:{texture:'gel'}},
];

describe('Scale-out Wave 70 Beauty Lab current-baseline reacceptance',()=>{
  it('resolves Beauty Lab as the canonical successor to Wave 69 despite the original Alpine implementation order',()=>{
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE).toMatchObject({wave:70,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'beauty.beauty-lab',templateVersion:1,inheritedImplementation:true});
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.predecessorAcceptance).toBe(RITUAL_HOUSE_WAVE69_ACCEPTANCE.mode);
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.sequence).toMatchObject({
      originalImplementationOrder:{ritual:'wave13-pr136',successor:'wave14-pr137-outdoor.alpine-lodge'},
      historicalReacceptanceOrder:{ritual:'wave31-pr177',successor:'wave32-pr184-beauty.beauty-lab'},
      hardenedReplayOrder:{ritual:'wave50-pr246',successor:'wave51-pr249-beauty.beauty-lab'},
      currentReplayOrder:{ritual:'wave69-pr281',successor:'wave70-beauty.beauty-lab'},
      authoritativeOrder:'reacceptance-and-current-baseline-replay',originalScaleOutOrderIsNotAuthoritativeForCurrentReplay:true,
      releaseCheckpointBetweenHistoricalRitualAndBeauty:false,releaseCheckpointBetweenHardenedRitualAndBeauty:false,
    });
  });

  it('locks original Golden #5, Wave 32, Wave 51 and current inherited provenance without current blob drift',()=>{
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.provenance).toEqual({
      currentParentWave:69,currentParentHead:'9f2900c0159bca8161c0020c1b88f32870c34806',originalGoldenNumber:5,originalImplementationWave:5,originalPullRequest:126,
      originalInitialImplementationHead:'c6e94d6b62b48283b7dac296ed1004b00b5d8dd0',originalCorrectedGreenHead:'9efe4d1b94b2b9856082a8475578351cdbc6f989',originalFinalHead:'ef5c5c25b758dc95ee376c9fd9511aaf38b3f2ae',originalTemplateBlob:'10d54d27568f045c4536722b3c3ad3f3ff8c5806',
      historicalReacceptanceWave:32,historicalReacceptancePullRequest:184,historicalImplementationHead:'3a7019f596416e586c08616b71c874c764f04ec2',historicalFinalAcceptedHead:'41110a298a53ee2d60e3df388f554992e0d5af4b',historicalAcceptedTemplateBlob:'5e183f8582a257844b730f71e7aa03c7952d3840',
      hardenedCounterpartWave:51,hardenedCounterpartPullRequest:249,hardenedFinalAcceptedHead:'4a2a81a414e311d283c2e99fa5356046df02643e',hardenedAcceptedTemplateBlob:'5e183f8582a257844b730f71e7aa03c7952d3840',currentInheritedTemplateBlob:'5e183f8582a257844b730f71e7aa03c7952d3840',
      originalBlobDiffersFromHistoricalAccepted:true,wave32EqualsWave51:true,wave51EqualsCurrentParent:true,byteIdenticalToWave51AcceptedTemplate:true,templateModifiedByWave70:false,
    });
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.historicalAcceptance).toBe(BEAUTY_LAB_WAVE51_ACCEPTANCE.mode);
    expect(BEAUTY_LAB_WAVE32_ACCEPTANCE.mode).toBe('current-baseline-reacceptance-and-builder-hardening');
  });

  it('preserves the complete historical Wave 32 hardening in the current shared Hero, split features and review contract',()=>{
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.historicalHardening).toMatchObject({
      heroMovedFromLegacyEditorialHeroToSharedLayeredCanvas:true,fabricatedZeroReviewEvidenceRemoved:true,routineAndIngredientStoryUseSharedEditableBindings:true,
      currentBlobContainsHistoricalAcceptedSource:true,noCurrentContractDrift:true,noAutomaticReplayOfHistoricalPatch:true,
      sharedAllowlistWidenedByWave70:false,componentRegistryWidenedByWave70:false,bindingNamespaceWidenedByWave70:false,
    });
    expect(BEAUTY_LAB_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','badge','title','copy','primary-cta','secondary-cta']);
    expect(find(BEAUTY_LAB_HOME_PAGE,'beauty-formula-hero')?.componentKey).toBe('visual.layered-canvas');
    for(const id of ['beauty-hero-image-layer','beauty-hero-overlay-layer','beauty-hero-decoration-layer','beauty-hero-badge-layer','beauty-hero-title-layer','beauty-hero-copy-layer','beauty-hero-primary-cta-layer','beauty-hero-secondary-cta-layer'])expect(find(BEAUTY_LAB_HOME_PAGE,id)?.componentKey).toBe('visual.layer');
    expect(STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-or-guidance-authority');
    for(const [id,root] of [['beauty-routine-feature','content.routineFeature.'],['beauty-ingredient-story','content.ingredientStory.']] as const){
      const source=JSON.stringify(find(BEAUTY_LAB_HOME_PAGE,id)?.bindings??{});
      for(const suffix of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(source).toContain(`${root}${suffix}`);
    }
  });

  it('treats current E4 as Multi-Product Composer and keeps Beauty Lab routine content editorial-only',()=>{
    expect(MULTI_PRODUCT_COMPOSER_ENGINE_VERSION).toBe('shoporation.multi-product-composer.v1');
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.currentEngineAuthority).toMatchObject({
      currentE4:'multi-product-composer',currentE4EngineVersion:'shoporation.multi-product-composer.v1',historicalE4RoutineLabelIsLegacyOnly:true,
      routineEngineNamedE4Today:false,newRoutineEngineIntroduced:false,routineFeature:'editorial-presentation-only-until-a-proven-shared-routine-read-model-exists',
    });
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['template-local-routine-engine','routine-engine-e4-redefinition','e4-authority-widening']));
  });

  it('keeps E3 deterministic, explainable and fail-closed for unknown or ineligible candidate evidence',()=>{
    expect(validateGuidedFinderConfig(finderConfig)).toEqual([]);
    const result=runGuidedFinder({config:finderConfig,selections:{texture:['gel']},candidates:finderCandidates})!;
    expect(result.status).toBe('exact');
    expect(result.results.map(item=>item.id)).toContain('matching');
    expect(result.results.map(item=>item.id)).not.toContain('unknown');
    expect(result.results.map(item=>item.id)).not.toContain('ineligible');
    expect(result.results.find(item=>item.id==='matching')?.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ruleId:'texture-gel',matched:true})]));
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.finderAuthority).toMatchObject({deterministic:true,attributeBased:true,explainable:true,nonDiagnostic:true,unknownEvidenceIsPositiveMatch:false,productEligibilityAuthority:'E2-shared-discovery-only'});
  });

  it('locks current Guided component page-type compatibility instead of widening Page Schema allowlists',()=>{
    expect(definition('guided.finder').manifest.pageTypes).toEqual(['home','catalog','search','content']);
    expect(definition('guided.results').manifest.pageTypes).toEqual(['home','catalog','search','content']);
    expect(definition('guided.explanation').manifest.pageTypes).toEqual(['product','content']);
    expect(definition('guided.attribute-index').manifest.pageTypes).toEqual(['home','catalog','content']);
    expect(definition('guided.attribute-navigation').manifest.pageTypes).toEqual(['home','catalog']);
    expect(find(BEAUTY_LAB_HOME_PAGE,'formula-finder')?.componentKey).toBe('guided.finder');
    expect(find(BEAUTY_LAB_HOME_PAGE,'beauty-ingredient-index-block')?.componentKey).toBe('guided.attribute-index');
    expect(find(BEAUTY_LAB_HOME_PAGE,'beauty-texture-navigation')?.componentKey).toBe('guided.attribute-navigation');
    expect(find(BEAUTY_LAB_PRODUCT_PAGE,'beauty-finder-explanation')?.componentKey).toBe('guided.explanation');
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.nonScope).toContain('page-schema-allowlist-widening');
  });

  it('keeps Beauty Lab visual identity, exact Home journey and marketing assets free of baked-in authority',()=>{
    expect(BEAUTY_LAB_VISUAL_DNA.journey).toBe('formula-to-ingredient-to-texture-to-guided-choice-to-product');
    expect(BEAUTY_LAB_VISUAL_DNA.character).not.toBe(DERMA_STUDIO_VISUAL_DNA.character);
    expect(BEAUTY_LAB_VISUAL_DNA.character).not.toBe(RITUAL_HOUSE_VISUAL_DNA.character);
    expect(BEAUTY_LAB_HOME_SECTION_ORDER).toEqual(['Formula Hero','Formula Finder','Shop by Concern','Ingredient Index Preview','New Formulas','Texture Lab','Routine Feature','Product Grid','Ingredient Story','Reviews','Footer']);
    expect(BEAUTY_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(BEAUTY_LAB_HOME_SECTION_ORDER);
    expect(BEAUTY_LAB_MARKETING_LAYER_CONTRACT.imageRule).toBe('marketing-copy-price-clinical-evidence-and-cta-never-baked-into-image-assets');
    expect(BEAUTY_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('keeps review evidence null-safe and all product/ingredient truth inside existing shared binding namespaces',()=>{
    const review=find(BEAUTY_LAB_HOME_PAGE,'beauty-review-summary');
    expect(review?.componentKey).toBe('commerce.review-summary');
    expect(Object.keys(review?.config??{}).sort()).toEqual(['count','label','rating']);
    expect(Object.keys(review?.bindings??{}).sort()).toEqual(['count','label','rating']);
    expect(review?.config.rating).toBeNull();
    expect(review?.config.count).toBeNull();
    expect(review?.bindings?.rating).toEqual({path:'reviews.rating',fallback:null});
    expect(review?.bindings?.count).toEqual({path:'reviews.count',fallback:null});
    const paths=BEAUTY_LAB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    for(const path of paths)expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(path.split('.')[0] as never);
    for(const prefix of ['beauty.','medical.','diagnosis.','ingredientTruth.','clinical.','price.','stock.','payment.'])expect(paths.some(path=>path.startsWith(prefix))).toBe(false);
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.truthAuthority).toMatchObject({missingAuthoritativeData:'empty-or-null-fail-closed',templateLocalIngredientRegistry:false,templateLocalConcentrationAuthority:false,templateLocalEfficacyAuthority:false,templateLocalClinicalEvidence:false,templateLocalProductTruthPersistence:false});
  });

  it('validates all 14 Alap-compatible Desktop/Tablet/Mobile presets with page-local unique node IDs',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:BEAUTY_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of BEAUTY_LAB_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('proves the actual PDP 7/12 gallery plus 5/12 buybox wrapper rather than metadata-only claims',()=>{
    const gallery=find(BEAUTY_LAB_PRODUCT_PAGE,'beauty-product-gallery');
    const buybox=find(BEAUTY_LAB_PRODUCT_PAGE,'beauty-product-buybox');
    expect(gallery?.componentKey).toBe('commerce.product-gallery');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.componentKey).toBe('layout.stack');
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(bindingPaths(BEAUTY_LAB_PRODUCT_PAGE)).toEqual(expect.arrayContaining(['product.gallery','product.name','pricing.displayPrice','inventory.stockLabel','product.keySpecs','product.specGroups','finder.productEvidence','commerce.purchaseHref']));
  });

  it('keeps installation draft-only, demo fixtures non-authoritative, checkout provider-neutral and release mutations out of scope',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:BEAUTY_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='beauty-beauty-lab')).toBe(true);
    for(const fixture of BEAUTY_LAB_TEMPLATE_PACKAGE.demoFixtures??[]){
      expect(JSON.stringify(fixture.payload)).not.toMatch(/gyógyít|kezel(?:és|i)|betegség|terápia|clinical proof|diagnosis|cure|treats|efficacy|concentration/i);
      for(const forbidden of ['price','stock','inventory','rating','reviewCount','efficacy','concentration','clinicalEvidence'])expect(Object.prototype.hasOwnProperty.call(fixture.payload,forbidden)).toBe(false);
    }
    const checkout=BEAUTY_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'beauty-beauty-lab',inheritedDemoFixturesAreNonAuthoritative:true});
    expect(BEAUTY_LAB_WAVE70_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['canonical-beauty-lab-template-churn','shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','sql-migration','customer-baseline-change','supabase-mutation','production-deploy','parallel-main-import','main-merge','wave71-implementation']));
  });
});
