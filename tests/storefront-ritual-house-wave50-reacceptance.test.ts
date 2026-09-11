import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {createStorefrontStoryVisualComponentRegistry,STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-story-visual';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {BEAUTY_LAB_VISUAL_DNA} from '@/lib/builder/templates/beauty-lab';
import {DERMA_STUDIO_VISUAL_DNA} from '@/lib/builder/templates/derma-studio';
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

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>walk(nodes).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 50 Ritual House current-baseline reacceptance',()=>{
  it('reconstructs the canonical successor of Wave 49 from repository history',()=>{
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE).toMatchObject({wave:50,historicalCounterpartWave:31,historicalPullRequest:177,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'beauty.ritual-house',templateVersion:1,inheritedImplementation:true});
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE.sequence).toEqual({previous:'wave49-beauty.derma-studio',current:'beauty.ritual-house',relationship:'historical-wave31-successor-replayed-on-current-stacked-baseline'});
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.manifest.templateKey).toBe('beauty.ritual-house');
  });

  it('keeps Ritual House structurally distinct from the other Beauty directions',()=>{
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).toBe('mood-to-ritual-to-format-to-scent-or-ingredient-to-product');
    expect(RITUAL_HOUSE_VISUAL_DNA.character).not.toBe(BEAUTY_LAB_VISUAL_DNA.character);
    expect(RITUAL_HOUSE_VISUAL_DNA.character).not.toBe(DERMA_STUDIO_VISUAL_DNA.character);
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).not.toBe(BEAUTY_LAB_VISUAL_DNA.journey);
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).not.toBe(DERMA_STUDIO_VISUAL_DNA.journey);
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE.distinctness).toEqual({notBeautyLab:'not-formula-ingredient-texture-concept-store-first',notDermaStudio:'not-clinical-concern-routine-active-ingredient-skincare-first',ownPosition:'warm-dark-sensory-cocooning-mood-ritual-format-scent-led-wellness-commerce'});
  });

  it('keeps the warm dark visual language merchant-adjustable and non-clinical',()=>{
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE.visualContract.palette).toEqual(['smoked-umber','warm-taupe','soft-ivory','candle-amber','muted-sage']);
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(RITUAL_HOUSE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(RITUAL_HOUSE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['clinical-skincare','medical-aromatherapy','health-outcome-claims','black-box-wellness-score']));
  });

  it('keeps the atmosphere hero as independent shared Story + Visual layers',()=>{
    expect(STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-content-or-guidance-authority');
    expect(RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-story-no-template-local-engine');
    expect(RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','eyebrow','heading','copy','primary-cta','secondary-cta']);
    const ids=['ritual-hero-image-layer','ritual-hero-overlay-layer','ritual-hero-decoration-layer','ritual-hero-eyebrow-layer','ritual-hero-heading-layer','ritual-hero-copy-layer','ritual-hero-primary-cta-layer','ritual-hero-secondary-cta-layer'];
    for(const id of ids)expect(find(RITUAL_HOUSE_HOME_PAGE.sections,id)?.componentKey).toBe('visual.layer');
    expect(find(RITUAL_HOUSE_HOME_PAGE.sections,'ritual-atmosphere-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    const source=JSON.stringify(RITUAL_HOUSE_HOME_PAGE);
    for(const path of ['content.atmosphereHero.image','content.atmosphereHero.decoration','content.atmosphereHero.eyebrow','content.atmosphereHero.title','content.atmosphereHero.copy','content.atmosphereHero.primaryLabel','content.atmosphereHero.primaryHref','content.atmosphereHero.secondaryLabel','content.atmosphereHero.secondaryHref'])expect(source).toContain(path);
  });

  it('keeps editorial mood and ritual navigation outside medical and psychological authority',()=>{
    expect(RITUAL_HOUSE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE.guidanceAuthority).toMatchObject({mode:'editorial-merchandising-navigation-only',mood:'merchant-taxonomy-not-psychological-state-inference',ritual:'merchant-navigation-not-health-protocol',diagnosis:false,psychologicalAssessment:false,medicalAdvice:false,healthOutcomeScoring:false,sleepStressAnxietyOutcomeAuthority:false,productEligibilityAuthority:'E2-shared-discovery-only'});
  });

  it('keeps current shared binding namespaces and product truth boundaries',()=>{
    const paths=RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths)expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(path.split('.')[0] as never);
    expect(paths.some(path=>path.startsWith('ritual.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('medical.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('wellnessScore.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('price.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('stock.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('payment.'))).toBe(false);
  });

  it('keeps exact Home order and the 7/12 + 5/12 responsive PDP composition',()=>{
    expect(RITUAL_HOUSE_HOME_PAGE.metadata?.sectionOrder).toEqual(RITUAL_HOUSE_HOME_SECTION_ORDER);
    const gallery=find(RITUAL_HOUSE_PRODUCT_PAGE.sections,'ritual-product-gallery');
    const buybox=find(RITUAL_HOUSE_PRODUCT_PAGE.sections,'ritual-product-buybox');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const product=JSON.stringify(RITUAL_HOUSE_PRODUCT_PAGE);
    for(const path of ['pricing.displayPrice','inventory.stockLabel','product.keySpecs','product.specGroups','commerce.purchaseHref'])expect(product).toContain(path);
  });

  it('requires stable unique node identity across every Page Schema preset',()=>{
    for(const page of RITUAL_HOUSE_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
    }
  });

  it('keeps all 14 Alap-compatible presets valid and installation draft-only',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:RITUAL_HOUSE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of RITUAL_HOUSE_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:RITUAL_HOUSE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='beauty-ritual-house')).toBe(true);
  });

  it('keeps demo claims neutral, checkout provider-neutral and release mutations out of scope',()=>{
    for(const fixture of RITUAL_HOUSE_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/gyógyít|kezel(?:és|i)|betegség|terápia|diagnosis|cure|treats|sleep score|stress score|anxiety score/i);
    const checkout=RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE.commerceAuthority).toMatchObject({pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',reviews:'review-binding-only',checkout:'shared-provider-neutral-E13'});
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE.builderContract).toMatchObject({pagePresetCount:14,minimumPlan:'alap',runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,visualBuilder:'future-compatible-no-template-local-builder-engine'});
    expect(RITUAL_HOUSE_WAVE50_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','visual-builder-drag-drop-ui','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','wave51-implementation']));
  });
});
