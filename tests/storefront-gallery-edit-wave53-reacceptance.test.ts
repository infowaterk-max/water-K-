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
import {ALPINE_LODGE_VISUAL_DNA} from '@/lib/builder/templates/alpine-lodge';
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
import {GALLERY_EDIT_WAVE53_ACCEPTANCE} from '@/lib/builder/templates/gallery-edit-wave53-acceptance';
import {TABLE_GIFT_VISUAL_DNA} from '@/lib/builder/templates/table-gift';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>walk(nodes).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 53 Gallery Edit current-baseline reacceptance',()=>{
  it('reconstructs historical Wave 34 / PR #194 as the direct canonical successor of current Wave 52',()=>{
    expect(GALLERY_EDIT_WAVE53_ACCEPTANCE).toMatchObject({
      wave:53,historicalCounterpartWave:34,historicalPullRequest:194,originalTemplateWave:15,originalTemplatePullRequest:138,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'home.gallery-edit',templateVersion:1,inheritedImplementation:true,
    });
    expect(GALLERY_EDIT_WAVE53_ACCEPTANCE.sequence).toEqual({
      previous:'wave52-outdoor.alpine-lodge',current:'home.gallery-edit',historicalNext:'wave35-food.table-gift',
      relationship:'historical-wave34-successor-replayed-on-current-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
    expect(GALLERY_EDIT_TEMPLATE_PACKAGE.manifest.templateKey).toBe('home.gallery-edit');
    expect(GALLERY_EDIT_TEMPLATE_MANIFEST.demoContent.namespace).toBe('home-gallery-edit');
  });

  it('keeps Gallery Edit structurally and visually distinct from Alpine Lodge and Table & Gift',()=>{
    expect(GALLERY_EDIT_VISUAL_DNA.character).toBe('contemporary-interior-design-gallery-concept-commerce');
    expect(GALLERY_EDIT_VISUAL_DNA.category).toBe('home-living-design');
    expect(GALLERY_EDIT_VISUAL_DNA.journey).toBe('edit-to-room-or-object-type-to-material-to-object-to-story');
    expect(GALLERY_EDIT_VISUAL_DNA.character).not.toBe(ALPINE_LODGE_VISUAL_DNA.character);
    expect(GALLERY_EDIT_VISUAL_DNA.character).not.toBe(TABLE_GIFT_VISUAL_DNA.character);
    expect(GALLERY_EDIT_WAVE53_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','section-order','rhythm','palette','typography','imagery','negative-space','merchandising-journey']));
    expect(GALLERY_EDIT_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['busy-marketplace','rustic-farmhouse','luxury-gold-overload','streetwear-language','fake-designer-provenance','fake-material-claims','baked-marketing-copy']));
  });

  it('keeps the approved ten-step Home journey and six independently editable shared hero layers',()=>{
    expect(GALLERY_EDIT_HOME_PAGE.metadata?.sectionOrder).toEqual(GALLERY_EDIT_HOME_SECTION_ORDER);
    expect(GALLERY_EDIT_HOME_SECTION_ORDER).toEqual(['Gallery Hero','Curated Rooms','New Objects','Designer Story','Material Edit','Gallery Grid','Featured Edit','Reviews','Journal','Footer']);
    expect(STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-content-or-guidance-authority');
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','eyebrow','heading','copy','primary-cta']);
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-story-no-template-local-engine');
    expect(find(GALLERY_EDIT_HOME_PAGE.sections,'gallery-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    for(const id of ['gallery-hero-image-layer','gallery-hero-overlay-layer','gallery-hero-eyebrow-layer','gallery-hero-heading-layer','gallery-hero-copy-layer','gallery-hero-primary-cta-layer'])expect(find(GALLERY_EDIT_HOME_PAGE.sections,id)?.componentKey).toBe('visual.layer');
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.imageRule).toContain('never-baked-into-image-assets');
  });

  it('uses only current shared binding namespaces and introduces no Gallery-local truth authority',()=>{
    const paths=GALLERY_EDIT_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    for(const forbidden of ['gallery.','home.','price.','stock.','checkout.','payment.'])expect(paths.some(path=>path.startsWith(forbidden))).toBe(false);
    expect(GALLERY_EDIT_WAVE53_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false});
  });

  it('keeps Gallery stories editable while facts and design tokens remain authoritative/shared',()=>{
    for(const [id,root,nodes] of [
      ['gallery-designer-story','content.designerStory',GALLERY_EDIT_HOME_PAGE.sections],
      ['gallery-product-story','content.productStory',GALLERY_EDIT_PRODUCT_PAGE.sections],
    ] as const){
      const target=find(nodes,id)!;
      expect(target.componentKey).toBe('story.feature');
      const bindings=JSON.stringify(target.bindings??{});
      for(const slot of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(bindings).toContain(`${root}.${slot}`);
    }
    expect(GALLERY_EDIT_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(GALLERY_EDIT_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(GALLERY_EDIT_WAVE53_ACCEPTANCE.commerceAuthority.structuredFacts).toBe('E7-or-authoritative-product-binding-only-when-supplied');
    expect(GALLERY_EDIT_WAVE53_ACCEPTANCE.commerceAuthority).toMatchObject({noFakeDesignerProvenance:true,noFakeMaterialClaim:true,noFakeDimensions:true});
  });

  it('keeps stable unique node identity and all 14 Alap-compatible responsive Page Schema presets',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:GALLERY_EDIT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(GALLERY_EDIT_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(GALLERY_EDIT_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(GALLERY_EDIT_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of GALLERY_EDIT_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('preserves shared E1/E2/E7/E10/E13 authority, fail-closed reviews and current journal bindings',()=>{
    expect(GALLERY_EDIT_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(GALLERY_EDIT_WAVE53_ACCEPTANCE.commerceAuthority).toMatchObject({
      productEligibility:'E2-shared-discovery-only',pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',reviews:'review-binding-only',
      structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',editorial:'E10-shared-story-presentation-only',checkout:'shared-provider-neutral-E13',
      noFakeDesignerProvenance:true,noFakeMaterialClaim:true,noFakeDimensions:true,
    });
    const review=find(GALLERY_EDIT_HOME_PAGE.sections,'gallery-review-summary')!;
    expect(review.bindings).toEqual({rating:{path:'reviews.rating',fallback:null},count:{path:'reviews.count',fallback:null},label:{path:'reviews.label',fallback:'Vásárlói tapasztalatok'}});
    expect(JSON.stringify(find(GALLERY_EDIT_HOME_PAGE.sections,'gallery-story-index')?.bindings??{})).toContain('content.journal.items');
  });

  it('keeps the PDP responsive 7/5 → 12/12 layout over authoritative shared bindings',()=>{
    expect(find(GALLERY_EDIT_PRODUCT_PAGE.sections,'gallery-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(find(GALLERY_EDIT_PRODUCT_PAGE.sections,'gallery-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(GALLERY_EDIT_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.products'])expect(source).toContain(path);
  });

  it('keeps installation draft-only, demo content claim-neutral and commerce/customer/B2B authority immutable',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:GALLERY_EDIT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='home-gallery-edit')).toBe(true);
    for(const fixture of GALLERY_EDIT_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/authentic designer|certified marble|solid oak certified|handmade in italy|made in denmark|limited stock|only [0-9]+ left/i);
  });

  it('keeps checkout provider-neutral and release/data mutations outside Wave 53 scope',()=>{
    const checkout=GALLERY_EDIT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(GALLERY_EDIT_WAVE53_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','visual-builder-drag-drop-ui',
      'sql-migration','vercel-production-deploy','supabase-mutation','tenant-status-change','tenant-plan-change','main-merge','wave54-implementation',
    ]));
  });
});
