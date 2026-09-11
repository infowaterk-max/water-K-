import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {createStorefrontGuidedVisualComponentRegistry,STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-guided-visual';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  BEAUTY_LAB_DESIGN_TOKENS,
  BEAUTY_LAB_ENGINE_CONTRACT,
  BEAUTY_LAB_HOME_PAGE,
  BEAUTY_LAB_HOME_SECTION_ORDER,
  BEAUTY_LAB_MARKETING_LAYER_CONTRACT,
  BEAUTY_LAB_PRODUCT_PAGE,
  BEAUTY_LAB_TEMPLATE_PACKAGE,
  BEAUTY_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/beauty-lab';
import {BEAUTY_LAB_WAVE51_ACCEPTANCE} from '@/lib/builder/templates/beauty-lab-wave51-acceptance';
import {DERMA_STUDIO_VISUAL_DNA} from '@/lib/builder/templates/derma-studio';
import {RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>walk(nodes).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 51 Beauty Lab current-baseline reacceptance',()=>{
  it('reconstructs the canonical successor of Wave 50 from repository history',()=>{
    expect(BEAUTY_LAB_WAVE51_ACCEPTANCE).toMatchObject({
      wave:51,historicalCounterpartWave:32,historicalPullRequest:184,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'beauty.beauty-lab',templateVersion:1,inheritedImplementation:true,
    });
    expect(BEAUTY_LAB_WAVE51_ACCEPTANCE.sequence).toEqual({
      previous:'wave50-beauty.ritual-house',current:'beauty.beauty-lab',relationship:'historical-wave32-successor-replayed-on-current-stacked-baseline',
    });
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.manifest.templateKey).toBe('beauty.beauty-lab');
  });

  it('keeps Beauty Lab structurally distinct from Derma Studio and Ritual House',()=>{
    expect(BEAUTY_LAB_VISUAL_DNA.journey).toBe('formula-to-ingredient-to-texture-to-guided-choice-to-product');
    expect(BEAUTY_LAB_VISUAL_DNA.character).not.toBe(DERMA_STUDIO_VISUAL_DNA.character);
    expect(BEAUTY_LAB_VISUAL_DNA.character).not.toBe(RITUAL_HOUSE_VISUAL_DNA.character);
    expect(BEAUTY_LAB_VISUAL_DNA.journey).not.toBe(DERMA_STUDIO_VISUAL_DNA.journey);
    expect(BEAUTY_LAB_VISUAL_DNA.journey).not.toBe(RITUAL_HOUSE_VISUAL_DNA.journey);
    expect(BEAUTY_LAB_WAVE51_ACCEPTANCE.distinctness).toEqual({
      notDermaStudio:'not-concern-routine-active-ingredient-clinical-first',
      notRitualHouse:'not-mood-ritual-format-scent-cocooning-first',
      ownPosition:'formula-ingredient-texture-guided-choice-concept-store-commerce',
    });
  });

  it('keeps the Formula Hero as eight independent shared Guided + Visual layers',()=>{
    expect(STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-or-guidance-authority');
    expect(BEAUTY_LAB_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','badge','title','copy','primary-cta','secondary-cta']);
    expect(BEAUTY_LAB_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-guided-finder-no-template-local-engine');
    const ids=['beauty-hero-image-layer','beauty-hero-overlay-layer','beauty-hero-decoration-layer','beauty-hero-badge-layer','beauty-hero-title-layer','beauty-hero-copy-layer','beauty-hero-primary-cta-layer','beauty-hero-secondary-cta-layer'];
    for(const id of ids)expect(find(BEAUTY_LAB_HOME_PAGE.sections,id)?.componentKey).toBe('visual.layer');
    expect(find(BEAUTY_LAB_HOME_PAGE.sections,'beauty-formula-hero')?.componentKey).toBe('visual.layered-canvas');
    const source=JSON.stringify(BEAUTY_LAB_HOME_PAGE);
    for(const path of ['content.formulaHero.image','content.formulaHero.imageAlt','content.formulaHero.decoration','content.formulaHero.badge','content.formulaHero.title','content.formulaHero.copy','content.formulaHero.primaryLabel','content.formulaHero.primaryHref','content.formulaHero.secondaryLabel','content.formulaHero.secondaryHref'])expect(source).toContain(path);
  });

  it('keeps E3 formula guidance non-diagnostic and E7 facts source-bound',()=>{
    expect(BEAUTY_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E7','E13']);
    expect(BEAUTY_LAB_WAVE51_ACCEPTANCE.guidanceAuthority).toMatchObject({
      E3:'deterministic-attribute-based-explainable-guidance',
      E7:'supplied-structured-ingredient-and-product-attribute-evidence-only',
      diagnosis:false,diseaseInference:false,treatmentAdvice:false,cureClaims:false,opaqueScore:false,
      productEligibilityAuthority:'E2-shared-discovery-only',
    });
    expect(BEAUTY_LAB_WAVE51_ACCEPTANCE.commerceAuthority).toMatchObject({
      pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',reviews:'review-binding-only',
      checkout:'shared-provider-neutral-E13',noFakeReviewEvidence:true,noFakeIngredientConcentration:true,noFakeClinicalEvidence:true,noFakeEfficacyClaim:true,
    });
  });

  it('keeps current shared binding namespaces and no template-local truth namespace',()=>{
    const paths=BEAUTY_LAB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('beauty.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('diagnosis.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('medical.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('price.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('stock.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('checkout.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('payment.'))).toBe(false);
  });

  it('keeps review evidence fail-closed and merchant-adjustable visual tokens',()=>{
    const review=find(BEAUTY_LAB_HOME_PAGE.sections,'beauty-review-summary');
    expect(review?.bindings?.rating?.fallback).toBeNull();
    expect(review?.bindings?.count?.fallback).toBeNull();
    expect(review?.bindings?.label?.path).toBe('reviews.label');
    expect(BEAUTY_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(BEAUTY_LAB_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(BEAUTY_LAB_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['medical-clinic','diagnostic-ui','black-box-score','fake-clinical-claims']));
  });

  it('keeps exact Home order and responsive 7/5 PDP composition',()=>{
    expect(BEAUTY_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(BEAUTY_LAB_HOME_SECTION_ORDER);
    expect(BEAUTY_LAB_HOME_SECTION_ORDER).toEqual(['Formula Hero','Formula Finder','Shop by Concern','Ingredient Index Preview','New Formulas','Texture Lab','Routine Feature','Product Grid','Ingredient Story','Reviews','Footer']);
    expect(find(BEAUTY_LAB_PRODUCT_PAGE.sections,'beauty-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(find(BEAUTY_LAB_PRODUCT_PAGE.sections,'beauty-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(BEAUTY_LAB_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','product.keySpecs','product.specGroups','finder.productEvidence','commerce.purchaseHref','recommendations.products'])expect(source).toContain(path);
  });

  it('requires stable unique node identity across all 14 Page Schema presets',()=>{
    for(const page of BEAUTY_LAB_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
    }
  });

  it('keeps all 14 Alap-compatible presets valid and installation draft-only',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:BEAUTY_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of BEAUTY_LAB_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:BEAUTY_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='beauty-beauty-lab')).toBe(true);
  });

  it('keeps demo content claim-neutral, checkout provider-neutral and release mutations out of scope',()=>{
    for(const fixture of BEAUTY_LAB_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/gyógyít|kezel(?:és|i)|betegség|terápia|clinical proof|diagnosis|cure|treats|efficacy/i);
    const checkout=BEAUTY_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(BEAUTY_LAB_WAVE51_ACCEPTANCE.builderContract).toMatchObject({pagePresetCount:14,minimumPlan:'alap',runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false});
    expect(BEAUTY_LAB_WAVE51_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','visual-builder-drag-drop-ui','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','wave52-implementation']));
  });
});
