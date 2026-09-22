import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontGuidedVisualRendererRegistry} from '@/components/builder/storefront-guided-visual';
import {createStorefrontGuidedVisualComponentRegistry,STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-guided-visual';
import {PLANS} from '@/lib/plans/catalog';
import {BEAUTY_LAB_VISUAL_DNA} from '@/lib/builder/templates/beauty-lab';
import {
  DERMA_STUDIO_DESIGN_TOKENS,
  DERMA_STUDIO_ENGINE_CONTRACT,
  DERMA_STUDIO_HOME_PAGE,
  DERMA_STUDIO_HOME_SECTION_ORDER,
  DERMA_STUDIO_MARKETING_LAYER_CONTRACT,
  DERMA_STUDIO_PRODUCT_PAGE,
  DERMA_STUDIO_TEMPLATE_PACKAGE,
  DERMA_STUDIO_VISUAL_DNA,
} from '@/lib/builder/templates/derma-studio';
import {DERMA_STUDIO_WAVE30_ACCEPTANCE} from '@/lib/builder/templates/derma-studio-wave30-acceptance';
import {RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(id:string)=>walk(DERMA_STUDIO_HOME_PAGE.sections).find(node=>node.id===id);

describe('Scale-out Wave 30 Derma Studio current-baseline reacceptance',()=>{
  it('reuses the inherited template and hardens it instead of creating a duplicate or medical engine',()=>{
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.mode).toBe('current-baseline-reacceptance-and-builder-hardening');
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.inheritedImplementation).toBe(true);
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.templateKey).toBe('beauty.derma-studio');
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.templateVersion).toBe(1);
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['second-derma-studio-template','medical-or-diagnostic-engine','template-local-routine-engine','health-record-system']));
  });

  it('locks the three Beauty & Wellness journeys as genuinely different',()=>{
    expect(DERMA_STUDIO_VISUAL_DNA.character).not.toBe(BEAUTY_LAB_VISUAL_DNA.character);
    expect(DERMA_STUDIO_VISUAL_DNA.character).not.toBe(RITUAL_HOUSE_VISUAL_DNA.character);
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.portfolio.beautyLabJourney).toBe('formula-to-ingredient-to-texture-to-guided-choice-to-product');
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.portfolio.dermaStudioJourney).toBe('concern-to-routine-to-active-ingredient-to-product');
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.portfolio.ritualHouseJourney).toBe('mood-to-ritual-to-format-to-scent-or-ingredient-to-product');
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.distinctness).toEqual({notBeautyLab:'not-formula-texture-concept-store-first',notRitualHouse:'not-dark-sensory-home-wellness-ritual-first',ownPosition:'concern-routine-active-ingredient-explainable-skincare-commerce'});
  });

  it('keeps the clinically clean visual language non-medical and merchant-adjustable',()=>{
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.visualContract.clinicalTone).toBe('clinically-clean-without-medical-clinic-ui');
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(DERMA_STUDIO_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(DERMA_STUDIO_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['medical-clinic','diagnostic-ui','treatment-or-cure-claims','black-box-score','fake-clinical-evidence','before-after-medical-claims']));
  });

  it('uses shared visual layers plus E3 composition without introducing a new authority engine',()=>{
    expect(STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-or-guidance-authority');
    expect(DERMA_STUDIO_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-guided-finder-no-template-local-engine');
    expect(DERMA_STUDIO_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E7','E13']);
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.guidanceAuthority.E3).toBe('deterministic-explainable-concern-and-routine-navigation');
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.guidanceAuthority.E7).toBe('supplied-structured-active-ingredient-routine-step-and-product-attribute-evidence');
  });

  it('materializes the Clinical Clarity Hero as eight independent Builder layers with bound business content',()=>{
    expect(DERMA_STUDIO_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','badge','title','copy','primary-cta','secondary-cta']);
    const ids=['derma-hero-image-layer','derma-hero-overlay-layer','derma-hero-decoration-layer','derma-hero-badge-layer','derma-hero-title-layer','derma-hero-copy-layer','derma-hero-primary-cta-layer','derma-hero-secondary-cta-layer'];
    for(const id of ids)expect(find(id)?.componentKey).toBe('visual.layer');
    expect(find('derma-clarity-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    const source=JSON.stringify(DERMA_STUDIO_HOME_PAGE);
    for(const path of ['content.clarityHero.image','content.clarityHero.imageAlt','content.clarityHero.decoration','content.clarityHero.badge','content.clarityHero.title','content.clarityHero.copy','content.clarityHero.primaryLabel','content.clarityHero.primaryHref','content.clarityHero.secondaryLabel','content.clarityHero.secondaryHref'])expect(source).toContain(path);
    expect(DERMA_STUDIO_MARKETING_LAYER_CONTRACT.imageRule).toBe('marketing-copy-price-clinical-evidence-and-cta-never-baked-into-image-assets');
  });

  it('keeps E3 guidance explicitly non-diagnostic and read-model only',()=>{
    expect(DERMA_STUDIO_ENGINE_CONTRACT.authorityRule).toBe('routine-and-concern-guidance-is-non-diagnostic-and-read-model-only');
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.guidanceAuthority).toMatchObject({scoring:'no-black-box-score',diagnosis:false,medicalTriage:false,treatmentAdvice:false,healthRecord:false,diseaseInference:false,routineMutationAuthority:false,productEligibilityAuthority:'E2-shared-discovery-only'});
  });

  it('keeps commerce and structured facts under existing authorities',()=>{
    expect(DERMA_STUDIO_WAVE30_ACCEPTANCE.commerceAuthority).toMatchObject({pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',reviews:'review-binding-only',structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',checkout:'shared-provider-neutral-E13',noFakeIngredientConcentration:true,noFakeClinicalEvidence:true,noFakeEfficacyClaim:true,noTemplateSpecificMedicalAuthority:true});
    const product=JSON.stringify(DERMA_STUDIO_PRODUCT_PAGE);
    for(const path of ['pricing.displayPrice','inventory.stockLabel','product.keySpecs','product.specGroups','finder.productEvidence','commerce.purchaseHref'])expect(product).toContain(path);
  });

  it('keeps exact Home order and all 14 Alap pages valid through the combined registry',()=>{
    expect(DERMA_STUDIO_HOME_PAGE.metadata?.sectionOrder).toEqual(DERMA_STUDIO_HOME_SECTION_ORDER);
    expect(DERMA_STUDIO_HOME_SECTION_ORDER).toEqual(['Clinical Clarity Hero','Shop by Concern','Routine Finder','Active Ingredient Index','Routine Steps','Targeted Formulas','Ingredient Education','Reviews','Footer']);
    const registry=createStorefrontGuidedVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:DERMA_STUDIO_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(DERMA_STUDIO_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(DERMA_STUDIO_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of DERMA_STUDIO_TEMPLATE_PACKAGE.pages){const result=validateStorefrontPageDocument(page,registry,capability);expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);}
  });

  it('renders the combined visual + guided Home runtime and preserves explainability',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={DERMA_STUDIO_HOME_PAGE} viewport="desktop" bindingContext={{brand:{name:'Derma Demo',homeHref:'/',copyright:'© Derma Demo'},navigation:{primary:[],footer:[]},content:{clarityHero:{badge:'DERMA DEMO',title:'Rutin, érthetően.',copy:'Strukturált navigáció, nem diagnózis.',primaryLabel:'Rutin Finder',primaryHref:'#routine-finder',secondaryLabel:'Bőrcélok',secondaryHref:'#concerns'},routineSteps:{},ingredientEducation:{},dermaTargetedFormulas:{}},finder:{currentStep:{title:'1. lépés',copy:'Kezdjük a fő céllal.'},currentQuestion:{label:'Mi a fő célod?',options:[]},progressLabel:'1 / 3',resultHref:'#routine-results'},collection:{concerns:[]},catalog:{activeIngredientIndex:[],targeted:[]},reviews:{rating:0,count:0,summary:'',href:'#reviews'}}} componentRegistry={createStorefrontGuidedVisualComponentRegistry()} rendererRegistry={createStorefrontGuidedVisualRendererRegistry()} capability={capability}/>);
    expect(html).toContain('data-storefront-visual="layered-canvas"');
    expect(html).toContain('data-storefront-guided="finder"');
    expect(html).toContain('data-storefront-guided="attribute-index"');
    expect(html).toContain('Rutin, érthetően.');
    expect(html).toContain('Strukturált navigáció, nem diagnózis.');
  });

  it('keeps demo fixtures claim-neutral, installation draft-only and checkout provider-neutral',()=>{
    for(const fixture of DERMA_STUDIO_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/gyógyít|kezel(?:és|i)|betegség|terápia|clinical proof|diagnosis|cure|treats/i);
    const registry=createStorefrontGuidedVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:DERMA_STUDIO_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='beauty-derma-studio')).toBe(true);
    const checkout=DERMA_STUDIO_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
