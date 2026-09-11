import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {createStorefrontGuidedVisualComponentRegistry,STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-guided-visual';
import {
  evaluateStorefrontTemplateCapabilityGate,
  planStorefrontTemplateInstallation,
} from '@/lib/builder/storefront-template-installation';
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
import {DERMA_STUDIO_WAVE49_ACCEPTANCE} from '@/lib/builder/templates/derma-studio-wave49-acceptance';
import {RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>walk(nodes).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 49 Derma Studio current-baseline reacceptance',()=>{
  it('reconstructs the canonical post-checkpoint successor from repository history',()=>{
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE).toMatchObject({
      wave:49,
      historicalCounterpartWave:30,
      historicalPullRequest:175,
      originalTemplateWave:12,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'beauty.derma-studio',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.sequence).toEqual({
      previous:'release-checkpoint-through-wave48',
      current:'beauty.derma-studio',
      relationship:'historical-post-checkpoint-wave30-successor-replayed-on-current-production-baseline',
    });
    expect(DERMA_STUDIO_TEMPLATE_PACKAGE.manifest.templateKey).toBe('beauty.derma-studio');
    expect(DERMA_STUDIO_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(DERMA_STUDIO_TEMPLATE_PACKAGE.manifest.demoContent.namespace).toBe('beauty-derma-studio');
  });

  it('keeps the Beauty & Wellness directions structurally distinct',()=>{
    expect(DERMA_STUDIO_VISUAL_DNA.character).toBe('clinically-clean-concern-first-routine-first-skincare-commerce');
    expect(DERMA_STUDIO_VISUAL_DNA.character).not.toBe(BEAUTY_LAB_VISUAL_DNA.character);
    expect(DERMA_STUDIO_VISUAL_DNA.character).not.toBe(RITUAL_HOUSE_VISUAL_DNA.character);
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.portfolio).toMatchObject({
      beautyLabJourney:'formula-to-ingredient-to-texture-to-guided-choice-to-product',
      dermaStudioJourney:'concern-to-routine-to-active-ingredient-to-product',
      ritualHouseJourney:'mood-to-ritual-to-format-to-scent-or-ingredient-to-product',
    });
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.distinctness).toEqual({
      notBeautyLab:'not-formula-texture-concept-store-first',
      notRitualHouse:'not-dark-sensory-home-wellness-ritual-first',
      ownPosition:'concern-routine-active-ingredient-explainable-skincare-commerce',
    });
  });

  it('keeps the clinically clean visual language non-medical and merchant-adjustable',()=>{
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.visualContract.clinicalTone).toBe('clinically-clean-without-medical-clinic-ui');
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.visualContract.palette).toEqual(['warm-white','soft-mineral-grey','graphite','muted-blue-green','soft-clay']);
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(DERMA_STUDIO_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(DERMA_STUDIO_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['medical-clinic','diagnostic-ui','treatment-or-cure-claims','black-box-score','fake-clinical-evidence','before-after-medical-claims']));
  });

  it('keeps the Clinical Clarity Hero as independent shared Builder layers',()=>{
    expect(STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-or-guidance-authority');
    expect(DERMA_STUDIO_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-guided-finder-no-template-local-engine');
    expect(DERMA_STUDIO_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','badge','title','copy','primary-cta','secondary-cta']);
    const ids=['derma-hero-image-layer','derma-hero-overlay-layer','derma-hero-decoration-layer','derma-hero-badge-layer','derma-hero-title-layer','derma-hero-copy-layer','derma-hero-primary-cta-layer','derma-hero-secondary-cta-layer'];
    for(const id of ids)expect(find(DERMA_STUDIO_HOME_PAGE.sections,id)?.componentKey).toBe('visual.layer');
    expect(find(DERMA_STUDIO_HOME_PAGE.sections,'derma-clarity-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    const source=JSON.stringify(DERMA_STUDIO_HOME_PAGE);
    for(const path of ['content.clarityHero.image','content.clarityHero.imageAlt','content.clarityHero.decoration','content.clarityHero.badge','content.clarityHero.title','content.clarityHero.copy','content.clarityHero.primaryLabel','content.clarityHero.primaryHref','content.clarityHero.secondaryLabel','content.clarityHero.secondaryHref'])expect(source).toContain(path);
    expect(DERMA_STUDIO_MARKETING_LAYER_CONTRACT.imageRule).toBe('marketing-copy-price-clinical-evidence-and-cta-never-baked-into-image-assets');
  });

  it('keeps E3 guidance non-diagnostic and E7 facts source-bound',()=>{
    expect(DERMA_STUDIO_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E7','E13']);
    expect(DERMA_STUDIO_ENGINE_CONTRACT.authorityRule).toBe('routine-and-concern-guidance-is-non-diagnostic-and-read-model-only');
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.guidanceAuthority).toMatchObject({
      E3:'deterministic-explainable-concern-and-routine-navigation',
      E7:'supplied-structured-active-ingredient-routine-step-and-product-attribute-evidence',
      scoring:'no-black-box-score',
      diagnosis:false,
      medicalTriage:false,
      treatmentAdvice:false,
      healthRecord:false,
      diseaseInference:false,
      routineMutationAuthority:false,
      productEligibilityAuthority:'E2-shared-discovery-only',
    });
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.commerceAuthority).toMatchObject({
      pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',reviews:'review-binding-only',
      structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',checkout:'shared-provider-neutral-E13',
      noFakeIngredientConcentration:true,noFakeClinicalEvidence:true,noFakeEfficacyClaim:true,noTemplateSpecificMedicalAuthority:true,
    });
  });

  it('keeps current shared binding namespaces and product truth boundaries',()=>{
    const paths=DERMA_STUDIO_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('derma.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('diagnosis.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('medical.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('price.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('stock.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('checkout.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('payment.'))).toBe(false);
  });

  it('keeps the exact Home order and 7/12 + 5/12 PDP composition',()=>{
    expect(DERMA_STUDIO_HOME_SECTION_ORDER).toEqual(['Clinical Clarity Hero','Shop by Concern','Routine Finder','Active Ingredient Index','Routine Steps','Targeted Formulas','Ingredient Education','Reviews','Footer']);
    expect(DERMA_STUDIO_HOME_PAGE.metadata?.sectionOrder).toEqual(DERMA_STUDIO_HOME_SECTION_ORDER);
    const gallery=find(DERMA_STUDIO_PRODUCT_PAGE.sections,'derma-product-gallery');
    const buybox=find(DERMA_STUDIO_PRODUCT_PAGE.sections,'derma-product-info');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const product=JSON.stringify(DERMA_STUDIO_PRODUCT_PAGE);
    for(const path of ['pricing.displayPrice','inventory.stockLabel','product.keySpecs','product.specGroups','finder.productEvidence','commerce.purchaseHref'])expect(product).toContain(path);
  });

  it('requires stable unique node identity across every Page Schema preset',()=>{
    for(const page of DERMA_STUDIO_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
    }
  });

  it('keeps all 14 Alap-compatible presets valid and installation draft-only',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:DERMA_STUDIO_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(DERMA_STUDIO_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(DERMA_STUDIO_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of DERMA_STUDIO_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:DERMA_STUDIO_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='beauty-derma-studio')).toBe(true);
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'beauty-derma-studio',mutableAuthority:['storefrontPageDrafts']});
  });

  it('keeps demo content claim-neutral and checkout provider-neutral',()=>{
    for(const fixture of DERMA_STUDIO_TEMPLATE_PACKAGE.demoFixtures??[]){
      expect(JSON.stringify(fixture.payload)).not.toMatch(/gyógyít|kezel(?:és|i)|betegség|terápia|clinical proof|diagnosis|cure|treats/i);
    }
    const checkout=DERMA_STUDIO_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.builderContract).toMatchObject({
      pagePresetCount:14,minimumPlan:'alap',runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(DERMA_STUDIO_WAVE49_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'medical-or-diagnostic-engine','template-local-routine-engine','shared-runtime-allowlist-widening','shared-component-registry-widening',
      'shared-binding-namespace-widening','visual-builder-drag-drop-ui','live-canvas','inline-editing','sql-migration','vercel-production-deploy',
      'supabase-mutation','main-merge','wave50-implementation',
    ]));
  });
});
