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
import {ALPINE_LODGE_WAVE52_ACCEPTANCE} from '@/lib/builder/templates/alpine-lodge-wave52-acceptance';
import {TRAIL_EXPEDITION_HOME_SECTION_ORDER,TRAIL_EXPEDITION_VISUAL_DNA} from '@/lib/builder/templates/trail-expedition';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>walk(nodes).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 52 Alpine Lodge current-baseline reacceptance',()=>{
  it('reconstructs the repository-proven canonical successor of Wave 51',()=>{
    expect(ALPINE_LODGE_WAVE52_ACCEPTANCE).toMatchObject({
      wave:52,historicalCounterpartWave:33,historicalPullRequest:189,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'outdoor.alpine-lodge',templateVersion:1,inheritedImplementation:true,
    });
    expect(ALPINE_LODGE_WAVE52_ACCEPTANCE.sequence).toEqual({
      previous:'wave51-beauty.beauty-lab',current:'outdoor.alpine-lodge',
      relationship:'historical-wave33-successor-replayed-on-current-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
    expect(ALPINE_LODGE_TEMPLATE_PACKAGE.manifest.templateKey).toBe('outdoor.alpine-lodge');
    expect(ALPINE_LODGE_TEMPLATE_MANIFEST.demoContent.namespace).toBe('outdoor-alpine-lodge');
  });

  it('keeps Alpine Lodge structurally and visually distinct from Trail & Expedition',()=>{
    expect(ALPINE_LODGE_VISUAL_DNA.character).toBe('warm-natural-luxury-alpine-editorial-outdoor-commerce');
    expect(ALPINE_LODGE_VISUAL_DNA.journey).toBe('collection-to-layer-or-use-context-to-material-to-product-to-story');
    expect(ALPINE_LODGE_VISUAL_DNA.category).toBe('outdoor-lifestyle');
    expect(ALPINE_LODGE_VISUAL_DNA.character).not.toBe(TRAIL_EXPEDITION_VISUAL_DNA.character);
    expect(ALPINE_LODGE_HOME_SECTION_ORDER).not.toEqual(TRAIL_EXPEDITION_HOME_SECTION_ORDER);
    expect(ALPINE_LODGE_WAVE52_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','section-order','rhythm','palette','typography','imagery','materials','merchandising-journey']));
    expect(ALPINE_LODGE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['red-dominant','terracotta-dominant','christmas-alpine-cliche','sterile-white-luxury','rustic-theme-park','unverified-performance-claims','unverified-origin-or-sustainability-claims']));
  });

  it('keeps the approved ten-step Home journey and eight independently editable shared hero layers',()=>{
    expect(ALPINE_LODGE_HOME_PAGE.metadata?.sectionOrder).toEqual(ALPINE_LODGE_HOME_SECTION_ORDER);
    expect(ALPINE_LODGE_HOME_SECTION_ORDER).toEqual(['Alpine Hero','Shop by Collection','Seasonal Layers','Material Story','Featured Collection','Lodge Essentials','Crafted Details','Reviews','Field Journal','Footer']);
    expect(STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-content-or-guidance-authority');
    expect(ALPINE_LODGE_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','eyebrow','heading','copy','primary-cta','secondary-cta']);
    expect(ALPINE_LODGE_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-story-no-template-local-engine');
    expect(find(ALPINE_LODGE_HOME_PAGE.sections,'alpine-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    for(const id of ['alpine-hero-image-layer','alpine-hero-overlay-layer','alpine-hero-decoration-layer','alpine-hero-eyebrow-layer','alpine-hero-heading-layer','alpine-hero-copy-layer','alpine-hero-primary-cta-layer','alpine-hero-secondary-cta-layer'])expect(find(ALPINE_LODGE_HOME_PAGE.sections,id)?.componentKey).toBe('visual.layer');
    expect(ALPINE_LODGE_MARKETING_LAYER_CONTRACT.imageRule).toContain('never-baked-into-image-assets');
  });

  it('uses only current shared binding namespaces and introduces no template-local truth authority',()=>{
    const paths=ALPINE_LODGE_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    for(const forbidden of ['alpine.','outdoor.','price.','stock.','checkout.','payment.'])expect(paths.some(path=>path.startsWith(forbidden))).toBe(false);
    expect(ALPINE_LODGE_WAVE52_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false});
  });

  it('keeps lodge storytelling editable while product facts and design tokens remain authoritative/shared',()=>{
    for(const [id,root,nodes] of [
      ['alpine-material-story','content.materialStory',ALPINE_LODGE_HOME_PAGE.sections],
      ['alpine-product-story','content.productStory',ALPINE_LODGE_PRODUCT_PAGE.sections],
    ] as const){
      const node=find(nodes,id)!;
      expect(node.componentKey).toBe('story.feature');
      const bindings=JSON.stringify(node.bindings??{});
      for(const slot of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(bindings).toContain(`${root}.${slot}`);
    }
    expect(ALPINE_LODGE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(ALPINE_LODGE_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(ALPINE_LODGE_WAVE52_ACCEPTANCE.commerceAuthority.structuredFacts).toBe('E7-or-authoritative-product-binding-only-when-supplied');
  });

  it('keeps stable unique node identity and all 14 Alap-compatible responsive Page Schema presets',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:ALPINE_LODGE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(ALPINE_LODGE_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(ALPINE_LODGE_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(ALPINE_LODGE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of ALPINE_LODGE_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('preserves shared commerce authority, fail-closed review evidence and current journal bindings',()=>{
    expect(ALPINE_LODGE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(ALPINE_LODGE_WAVE52_ACCEPTANCE.commerceAuthority).toMatchObject({
      productEligibility:'E2-shared-discovery-only',pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',reviews:'review-binding-only',
      structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',editorial:'E10-shared-story-presentation-only',checkout:'shared-provider-neutral-E13',
      noFakePerformanceClaim:true,noFakeOriginClaim:true,noFakeSustainabilityClaim:true,
    });
    const review=find(ALPINE_LODGE_HOME_PAGE.sections,'alpine-review-summary')!;
    expect(review.bindings).toEqual({rating:{path:'reviews.rating',fallback:null},count:{path:'reviews.count',fallback:null},label:{path:'reviews.label',fallback:'Vásárlói tapasztalatok'}});
    expect(JSON.stringify(find(ALPINE_LODGE_HOME_PAGE.sections,'alpine-story-index')?.bindings??{})).toContain('content.journal.items');
  });

  it('keeps the PDP responsive 7/5 → 12/12 layout over authoritative shared bindings',()=>{
    expect(find(ALPINE_LODGE_PRODUCT_PAGE.sections,'alpine-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(find(ALPINE_LODGE_PRODUCT_PAGE.sections,'alpine-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(ALPINE_LODGE_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.products'])expect(source).toContain(path);
  });

  it('keeps template installation draft-only and unable to mutate commerce/customer/B2B authority',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:ALPINE_LODGE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='outdoor-alpine-lodge')).toBe(true);
    for(const fixture of ALPINE_LODGE_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/waterproof|windproof|gore-tex|carbon neutral|organic certified|made in switzerland|handmade in switzerland|weatherproof/i);
  });

  it('keeps checkout provider-neutral and release/data mutations outside Wave 52 scope',()=>{
    const checkout=ALPINE_LODGE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(ALPINE_LODGE_WAVE52_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','visual-builder-drag-drop-ui',
      'sql-migration','vercel-production-deploy','supabase-mutation','tenant-status-change','tenant-plan-change','main-merge','wave53-implementation',
    ]));
  });
});
