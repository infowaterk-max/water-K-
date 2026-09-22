import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontStoryVisualComponentRegistry,STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-story-visual';
import {
  ALPINE_LODGE_DESIGN_TOKENS,
  ALPINE_LODGE_HOME_PAGE,
  ALPINE_LODGE_HOME_SECTION_ORDER,
  ALPINE_LODGE_MARKETING_LAYER_CONTRACT,
  ALPINE_LODGE_PRODUCT_PAGE,
  ALPINE_LODGE_TEMPLATE_MANIFEST,
  ALPINE_LODGE_TEMPLATE_PACKAGE,
  ALPINE_LODGE_VISUAL_DNA,
} from '@/lib/builder/templates/alpine-lodge';
import {ALPINE_LODGE_WAVE33_ACCEPTANCE} from '@/lib/builder/templates/alpine-lodge-wave33-acceptance';
import {TRAIL_EXPEDITION_HOME_SECTION_ORDER,TRAIL_EXPEDITION_VISUAL_DNA} from '@/lib/builder/templates/trail-expedition';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const homeNodes=walk(ALPINE_LODGE_HOME_PAGE.sections);
const home=(id:string)=>homeNodes.find(node=>node.id===id);
const productNodes=walk(ALPINE_LODGE_PRODUCT_PAGE.sections);
const product=(id:string)=>productNodes.find(node=>node.id===id);

describe('Scale-out Wave 33 Alpine Lodge current-baseline reacceptance',()=>{
  it('re-accepts the inherited canonical Alpine Lodge v1 without a duplicate template',()=>{
    expect(ALPINE_LODGE_WAVE33_ACCEPTANCE).toMatchObject({wave:33,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'outdoor.alpine-lodge',templateVersion:1,inheritedImplementation:true});
    expect(ALPINE_LODGE_TEMPLATE_PACKAGE.manifest.templateKey).toBe('outdoor.alpine-lodge');
    expect(ALPINE_LODGE_TEMPLATE_MANIFEST.demoContent.namespace).toBe('outdoor-alpine-lodge');
    expect(ALPINE_LODGE_WAVE33_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['second-alpine-lodge-template','template-local-hero-engine','template-local-product-discovery-engine']));
  });

  it('locks the approved premium boutique-lodge identity apart from cinematic Trail & Expedition',()=>{
    expect(ALPINE_LODGE_VISUAL_DNA.character).toBe('warm-natural-luxury-alpine-editorial-outdoor-commerce');
    expect(ALPINE_LODGE_VISUAL_DNA.journey).toBe('collection-to-layer-or-use-context-to-material-to-product-to-story');
    expect(ALPINE_LODGE_VISUAL_DNA.category).toBe('outdoor-lifestyle');
    expect(ALPINE_LODGE_VISUAL_DNA.character).not.toBe(TRAIL_EXPEDITION_VISUAL_DNA.character);
    expect(ALPINE_LODGE_HOME_SECTION_ORDER).not.toEqual(TRAIL_EXPEDITION_HOME_SECTION_ORDER);
    expect(ALPINE_LODGE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['red-dominant','terracotta-dominant','christmas-alpine-cliche','sterile-white-luxury','rustic-theme-park','unverified-performance-claims','unverified-origin-or-sustainability-claims']));
    expect(ALPINE_LODGE_WAVE33_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','rhythm','typography','imagery','materials','merchandising-journey']));
  });

  it('preserves the approved ten-step Alpine Home merchandising journey',()=>{
    expect(ALPINE_LODGE_HOME_PAGE.metadata?.sectionOrder).toEqual(ALPINE_LODGE_HOME_SECTION_ORDER);
    expect(ALPINE_LODGE_HOME_SECTION_ORDER).toEqual(['Alpine Hero','Shop by Collection','Seasonal Layers','Material Story','Featured Collection','Lodge Essentials','Crafted Details','Reviews','Field Journal','Footer']);
  });

  it('hardens Alpine Hero as eight independent shared visual layers with stable ids and bindings',()=>{
    expect(STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-content-or-guidance-authority');
    expect(ALPINE_LODGE_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-story-no-template-local-engine');
    expect(ALPINE_LODGE_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','eyebrow','heading','copy','primary-cta','secondary-cta']);
    expect(home('alpine-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    for(const id of ['alpine-hero-image-layer','alpine-hero-overlay-layer','alpine-hero-decoration-layer','alpine-hero-eyebrow-layer','alpine-hero-heading-layer','alpine-hero-copy-layer','alpine-hero-primary-cta-layer','alpine-hero-secondary-cta-layer'])expect(home(id)?.componentKey).toBe('visual.layer');
    const source=JSON.stringify(ALPINE_LODGE_HOME_PAGE);
    for(const path of ['content.alpineHero.image','content.alpineHero.imageAlt','content.alpineHero.decoration','content.alpineHero.eyebrow','content.alpineHero.title','content.alpineHero.copy','content.alpineHero.primaryLabel','content.alpineHero.primaryHref','content.alpineHero.secondaryLabel','content.alpineHero.secondaryHref'])expect(source).toContain(path);
    expect(ALPINE_LODGE_MARKETING_LAYER_CONTRACT.imageRule).toContain('never-baked-into-image-assets');
  });

  it('keeps major lodge storytelling editable through shared story slots without product-fact authority',()=>{
    for(const [id,root] of [['alpine-material-story','content.materialStory'],['alpine-product-story','content.productStory']] as const){
      const node=(id==='alpine-material-story'?homeNodes:productNodes).find(item=>item.id===id)!;
      expect(node.componentKey).toBe('story.feature');
      const bindings=JSON.stringify(node.bindings??{});
      for(const slot of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(bindings).toContain(`${root}.${slot}`);
    }
    expect(ALPINE_LODGE_WAVE33_ACCEPTANCE.commerceAuthority.structuredFacts).toBe('E7-or-authoritative-product-binding-only-when-supplied');
  });

  it('keeps unique node identity, merchant-adjustable tokens, all 14 Alap presets and D/T/M compatibility',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:ALPINE_LODGE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(ALPINE_LODGE_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(ALPINE_LODGE_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(ALPINE_LODGE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found']);
    for(const page of ALPINE_LODGE_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    expect(ALPINE_LODGE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(ALPINE_LODGE_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
  });

  it('keeps review truth external and journal bindings on the current allowlisted content read path',()=>{
    const review=home('alpine-review-summary')!;
    expect(review.config).toMatchObject({rating:null,count:null,label:'Vásárlói tapasztalatok'});
    expect(review.bindings).toEqual({rating:{path:'reviews.rating',fallback:null},count:{path:'reviews.count',fallback:null},label:{path:'reviews.label',fallback:'Vásárlói tapasztalatok'}});
    expect(JSON.stringify(review)).not.toContain('reviews.summary');
    expect(JSON.stringify(review)).not.toContain('reviews.href');
    expect(JSON.stringify(home('alpine-story-index')?.bindings??{})).toContain('content.journal.items');
    const blog=ALPINE_LODGE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='blog-index')!;
    expect(JSON.stringify(blog)).toContain('content.journal.items');
  });

  it('preserves authoritative PDP bindings and 7/5 desktop-tablet plus 12/12 mobile grid',()=>{
    expect(product('alpine-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('alpine-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(ALPINE_LODGE_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.products'])expect(source).toContain(path);
    expect(ALPINE_LODGE_WAVE33_ACCEPTANCE.commerceAuthority).toMatchObject({pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',reviews:'review-binding-only',checkout:'shared-provider-neutral-E13',noFakePerformanceClaim:true,noFakeOriginClaim:true,noFakeSustainabilityClaim:true});
  });

  it('keeps installation draft-only, demo content claim-neutral and E13 checkout provider-neutral',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:ALPINE_LODGE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='outdoor-alpine-lodge')).toBe(true);
    for(const fixture of ALPINE_LODGE_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/waterproof|windproof|gore-tex|carbon neutral|organic certified|made in switzerland|handmade in switzerland|weatherproof/i);
    const checkout=ALPINE_LODGE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });

  it('keeps release-side effects outside Wave 33 scope',()=>{
    expect(ALPINE_LODGE_WAVE33_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','visual-builder-drag-drop-ui']));
  });
});
