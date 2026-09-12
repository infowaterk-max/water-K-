import {describe,expect,it} from 'vitest';
import {
  GUIDED_FINDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  runGuidedFinder,
  validateGuidedFinderConfig,
  type FinderCandidate,
  type GuidedFinderConfig,
} from '@/lib/commerce/guided-finder';
import {createStorefrontGuidedVisualComponentRegistry,STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-guided-visual';
import {PLANS} from '@/lib/plans/catalog';
import {
  BEAUTY_LAB_DESIGN_TOKENS,
  BEAUTY_LAB_HOME_PAGE,
  BEAUTY_LAB_HOME_SECTION_ORDER,
  BEAUTY_LAB_MARKETING_LAYER_CONTRACT,
  BEAUTY_LAB_PRODUCT_PAGE,
  BEAUTY_LAB_TEMPLATE_MANIFEST,
  BEAUTY_LAB_TEMPLATE_PACKAGE,
  BEAUTY_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/beauty-lab';
import {BEAUTY_LAB_WAVE32_ACCEPTANCE} from '@/lib/builder/templates/beauty-lab-wave32-acceptance';
import {DERMA_STUDIO_HOME_SECTION_ORDER,DERMA_STUDIO_VISUAL_DNA} from '@/lib/builder/templates/derma-studio';
import {RITUAL_HOUSE_HOME_SECTION_ORDER,RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const homeNodes=walk(BEAUTY_LAB_HOME_PAGE.sections);
const home=(id:string)=>homeNodes.find(node=>node.id===id);
const productNodes=walk(BEAUTY_LAB_PRODUCT_PAGE.sections);
const product=(id:string)=>productNodes.find(node=>node.id===id);

const finderConfig:GuidedFinderConfig={
  version:1,
  tenantId:'beauty-wave32-demo',
  finderKey:'beauty-formula',
  label:'Formula Finder',
  safetyPolicy:'non-diagnostic',
  partialPolicy:'show-nearest',
  maxResults:4,
  steps:[{id:'formula',title:'Formula preferenciák',questions:[
    {id:'texture',label:'Milyen textúrát kedvelsz?',mode:'single',required:true,options:[
      {id:'gel',label:'Gél',rules:[{id:'texture-gel',attributeKey:'texture',operator:'eq',value:'gel',kind:'required',reason:'Gél textúrát választottál.'}]},
      {id:'cream',label:'Krém',rules:[{id:'texture-cream',attributeKey:'texture',operator:'eq',value:'cream',kind:'required',reason:'Krém textúrát választottál.'}]},
    ]},
    {id:'finish',label:'Milyen érzetet keresel?',mode:'multi',options:[
      {id:'light',label:'Könnyed',rules:[{id:'finish-light',attributeKey:'finish',operator:'includes',value:'light',kind:'preferred',weight:2,reason:'Könnyed érzetet részesítesz előnyben.'}]},
    ]},
  ]}],
};
const candidates:FinderCandidate[]=[
  {id:'gel',label:'Cloud Gel',href:'/termek/cloud-gel',eligible:true,attributes:{texture:'gel',finish:['light']}},
  {id:'cream',label:'Cloud Cream',href:'/termek/cloud-cream',eligible:true,attributes:{texture:'cream',finish:['rich']}},
  {id:'hidden',label:'Hidden Gel',href:'/termek/hidden',eligible:false,attributes:{texture:'gel',finish:['light']}},
];

describe('Scale-out Wave 32 Beauty Lab current-baseline reacceptance',()=>{
  it('re-accepts the inherited canonical Beauty Lab v1 without a duplicate template',()=>{
    expect(BEAUTY_LAB_WAVE32_ACCEPTANCE).toMatchObject({wave:32,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'beauty.beauty-lab',templateVersion:1,inheritedImplementation:true});
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.manifest.templateKey).toBe('beauty.beauty-lab');
    expect(BEAUTY_LAB_WAVE32_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['second-beauty-lab-template','template-local-hero-engine','template-local-guidance-engine','template-local-routine-engine']));
  });

  it('locks Beauty Lab, Derma Studio and Ritual House as structurally distinct journeys',()=>{
    expect(BEAUTY_LAB_VISUAL_DNA.journey).toBe('formula-to-ingredient-to-texture-to-guided-choice-to-product');
    expect(DERMA_STUDIO_VISUAL_DNA.journey).toBe('concern-to-routine-to-active-ingredient-to-product');
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).toBe('mood-to-ritual-to-format-to-scent-or-ingredient-to-product');
    expect(BEAUTY_LAB_HOME_SECTION_ORDER).not.toEqual(DERMA_STUDIO_HOME_SECTION_ORDER);
    expect(BEAUTY_LAB_HOME_SECTION_ORDER).not.toEqual(RITUAL_HOUSE_HOME_SECTION_ORDER);
    expect(BEAUTY_LAB_WAVE32_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','section-order','rhythm','typography','imagery','merchandising-journey']));
  });

  it('preserves the approved 11-step Home merchandising journey',()=>{
    expect(BEAUTY_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(BEAUTY_LAB_HOME_SECTION_ORDER);
    expect(BEAUTY_LAB_HOME_SECTION_ORDER).toEqual(['Formula Hero','Formula Finder','Shop by Concern','Ingredient Index Preview','New Formulas','Texture Lab','Routine Feature','Product Grid','Ingredient Story','Reviews','Footer']);
  });

  it('keeps shared hero authority and authoritative bindings without forcing legacy hidden visual aliases',()=>{
    expect(STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-pricing-inventory-or-guidance-authority');
    expect(BEAUTY_LAB_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','badge','title','copy','primary-cta']);
    expect(home('beauty-formula-hero')?.componentKey).toBe('visual.layered-canvas');
    const visibleLayerIds=['beauty-hero-image-layer','beauty-hero-overlay-layer','beauty-hero-decoration-layer','beauty-hero-badge-layer','beauty-hero-title-layer','beauty-hero-copy-layer','beauty-hero-primary-cta-layer'];
    for(const id of visibleLayerIds)expect(home(id)?.componentKey).toBe('visual.layer');
    expect(home('beauty-hero-secondary-cta-layer')).toBeUndefined();
    const source=JSON.stringify(BEAUTY_LAB_HOME_PAGE);
    for(const path of ['content.formulaHero.image','content.formulaHero.imageAlt','content.formulaHero.productImage','content.formulaHero.productImageAlt','content.formulaHero.badge','content.formulaHero.title','content.formulaHero.copy','content.formulaHero.primaryLabel','content.formulaHero.primaryHref'])expect(source).toContain(path);
    expect(source).not.toContain('wave32-binding');
    expect(BEAUTY_LAB_MARKETING_LAYER_CONTRACT.imageRule).toBe('marketing-copy-price-clinical-evidence-and-cta-never-baked-into-image-assets');
  });

  it('binds Routine Feature and Ingredient Story through shared editable split-feature slots without adding a routine engine',()=>{
    const routine=JSON.stringify(home('beauty-routine-feature')?.bindings??{});
    for(const path of ['content.routineFeature.eyebrow','content.routineFeature.title','content.routineFeature.copy','content.routineFeature.image','content.routineFeature.imageAlt','content.routineFeature.ctaLabel','content.routineFeature.ctaHref'])expect(routine).toContain(path);
    const story=JSON.stringify(home('beauty-ingredient-story')?.bindings??{});
    for(const path of ['content.ingredientStory.eyebrow','content.ingredientStory.title','content.ingredientStory.copy','content.ingredientStory.image','content.ingredientStory.imageAlt','content.ingredientStory.ctaLabel','content.ingredientStory.ctaHref'])expect(story).toContain(path);
    expect(BEAUTY_LAB_WAVE32_ACCEPTANCE.routineAuthority).toMatchObject({mode:'editorial-presentation-only-until-shared-routine-read-model',templateLocalEngine:false,commerceMutationAuthority:false});
  });

  it('keeps unique node identity, merchant-adjustable tokens, all 14 Alap presets and D/T/M compatibility',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:BEAUTY_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(BEAUTY_LAB_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(BEAUTY_LAB_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(BEAUTY_LAB_TEMPLATE_MANIFEST.demoContent.namespace).toBe('beauty-beauty-lab');
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found']);
    for(const page of BEAUTY_LAB_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    expect(BEAUTY_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(BEAUTY_LAB_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
  });

  it('uses real E3 semantics for exact/partial/zero results, evidence and ineligible exclusion',()=>{
    expect(validateGuidedFinderConfig(finderConfig)).toEqual([]);
    const exact=runGuidedFinder({config:finderConfig,selections:{texture:['gel'],finish:['light']},candidates})!;
    expect(exact.status).toBe('exact');
    expect(exact.results.map(item=>item.id)).toContain('gel');
    expect(exact.results.map(item=>item.id)).not.toContain('hidden');
    expect(exact.results.find(item=>item.id==='gel')?.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ruleId:'texture-gel',matched:true})]));
    const partial=runGuidedFinder({config:finderConfig,selections:{texture:['gel']},candidates:[candidates[1]]})!;
    expect(partial.status).toBe('partial');
    expect(partial.exactMatchCount).toBe(0);
    const zero=runGuidedFinder({config:{...finderConfig,partialPolicy:'zero'},selections:{texture:['gel']},candidates:[candidates[1]]})!;
    expect(zero).toMatchObject({status:'zero',results:[]});
  });

  it('rejects diagnostic Finder wording and keeps Finder/commerce authority outside template switching',()=>{
    const unsafe={...finderConfig,label:'Diagnózis és kezelés finder'};
    expect(validateGuidedFinderConfig(unsafe).some(item=>item.code==='FINDER_NON_DIAGNOSTIC_POLICY_VIOLATION')).toBe(true);
    expect(GUIDED_FINDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY).toMatchObject({storefrontPageDrafts:true,finderConfiguration:false,products:false,variants:false,pricing:false,inventory:false,customers:false,orders:false});
    expect(BEAUTY_LAB_WAVE32_ACCEPTANCE.finderAuthority).toMatchObject({tenantScoped:true,diagnosis:false,diseaseInference:false,treatmentAdvice:false,cureClaims:false,opaqueScore:false,productEligibilityAuthority:'E2-shared-discovery-only',structuredFacts:'E7-supplied-structured-product-data-only'});
  });

  it('preserves authoritative PDP bindings and 7/5 D/T plus 12/12 mobile grid',()=>{
    expect(product('beauty-product-detail')?.componentKey).toBe('commerce.product-detail');
    expect(product('beauty-product-detail')?.bindings?.productId).toEqual({path:'product.id'});
    expect(product('beauty-product-detail')?.bindings?.variantId).toEqual({path:'variant.id'});
    expect(product('beauty-product-detail')?.bindings?.price).toEqual({path:'pricing.current'});
    expect(product('beauty-product-detail')?.bindings?.availability).toEqual({path:'inventory.available'});
    expect(product('beauty-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('beauty-product-detail')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
  });

  it('keeps template installation content-only and explicit for an already-installed tenant',()=>{
    const plan=planStorefrontTemplateInstallation({template:BEAUTY_LAB_TEMPLATE_PACKAGE,componentRegistry:createStorefrontGuidedVisualComponentRegistry(),capability,currentTemplate:{templateKey:'beauty.beauty-lab',templateVersion:1}});
    expect(plan.mode).toBe('reapply');
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.preserve).toEqual(expect.arrayContaining(['products','variants','pricing','inventory','customers','orders','payment-configuration','fulfillment-configuration','tax-configuration','tenant-users','tenant-permissions']));
  });
});
