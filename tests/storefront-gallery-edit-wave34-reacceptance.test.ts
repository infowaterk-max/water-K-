import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontStoryVisualComponentRegistry,STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-story-visual';
import {ALPINE_LODGE_VISUAL_DNA} from '@/lib/builder/templates/alpine-lodge';
import {
  GALLERY_EDIT_DESIGN_TOKENS,
  GALLERY_EDIT_HOME_PAGE,
  GALLERY_EDIT_HOME_SECTION_ORDER,
  GALLERY_EDIT_MARKETING_LAYER_CONTRACT,
  GALLERY_EDIT_PRODUCT_PAGE,
  GALLERY_EDIT_TEMPLATE_MANIFEST,
  GALLERY_EDIT_TEMPLATE_PACKAGE,
  GALLERY_EDIT_VISUAL_DNA,
} from '@/lib/builder/templates/gallery-edit';
import {GALLERY_EDIT_WAVE34_ACCEPTANCE} from '@/lib/builder/templates/gallery-edit-wave34-acceptance';
import {TABLE_GIFT_VISUAL_DNA} from '@/lib/builder/templates/table-gift';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const homeNodes=walk(GALLERY_EDIT_HOME_PAGE.sections);
const home=(id:string)=>homeNodes.find(node=>node.id===id);
const productNodes=walk(GALLERY_EDIT_PRODUCT_PAGE.sections);
const product=(id:string)=>productNodes.find(node=>node.id===id);

describe('Scale-out Wave 34 Gallery Edit current-baseline reacceptance',()=>{
  it('re-accepts the inherited canonical Gallery Edit v1 without creating a duplicate template',()=>{
    expect(GALLERY_EDIT_WAVE34_ACCEPTANCE).toMatchObject({wave:34,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'home.gallery-edit',templateVersion:1,inheritedImplementation:true});
    expect(GALLERY_EDIT_TEMPLATE_PACKAGE.manifest.templateKey).toBe('home.gallery-edit');
    expect(GALLERY_EDIT_TEMPLATE_MANIFEST.demoContent.namespace).toBe('home-gallery-edit');
    expect(GALLERY_EDIT_WAVE34_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['second-gallery-edit-template','template-local-hero-engine','template-local-product-discovery-engine']));
  });

  it('locks the approved airy contemporary gallery identity apart from adjacent Alpine Lodge and Table & Gift directions',()=>{
    expect(GALLERY_EDIT_VISUAL_DNA.character).toBe('contemporary-interior-design-gallery-concept-commerce');
    expect(GALLERY_EDIT_VISUAL_DNA.category).toBe('home-living-design');
    expect(GALLERY_EDIT_VISUAL_DNA.journey).toBe('edit-to-room-or-object-type-to-material-to-object-to-story');
    expect(GALLERY_EDIT_VISUAL_DNA.character).not.toBe(ALPINE_LODGE_VISUAL_DNA.character);
    expect(GALLERY_EDIT_VISUAL_DNA.character).not.toBe(TABLE_GIFT_VISUAL_DNA.character);
    expect(GALLERY_EDIT_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['busy-marketplace','rustic-farmhouse','luxury-gold-overload','streetwear-language','fake-designer-provenance','fake-material-claims','baked-marketing-copy']));
    expect(GALLERY_EDIT_WAVE34_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','rhythm','typography','imagery','negative-space','merchandising-journey']));
  });

  it('preserves the accepted ten-step Gallery Edit Home merchandising journey',()=>{
    expect(GALLERY_EDIT_HOME_PAGE.metadata?.sectionOrder).toEqual(GALLERY_EDIT_HOME_SECTION_ORDER);
    expect(GALLERY_EDIT_HOME_SECTION_ORDER).toEqual(['Gallery Hero','Curated Rooms','New Objects','Designer Story','Material Edit','Gallery Grid','Featured Edit','Reviews','Journal','Footer']);
  });

  it('hardens Gallery Hero as independent shared visual layers with stable ids and content bindings',()=>{
    expect(STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-content-or-guidance-authority');
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-story-no-template-local-engine');
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','eyebrow','heading','copy','primary-cta']);
    expect(home('gallery-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    for(const id of ['gallery-hero-image-layer','gallery-hero-overlay-layer','gallery-hero-eyebrow-layer','gallery-hero-heading-layer','gallery-hero-copy-layer','gallery-hero-primary-cta-layer'])expect(home(id)?.componentKey).toBe('visual.layer');
    const source=JSON.stringify(GALLERY_EDIT_HOME_PAGE);
    for(const path of ['content.galleryHero.image','content.galleryHero.imageAlt','content.galleryHero.eyebrow','content.galleryHero.title','content.galleryHero.copy','content.galleryHero.primaryLabel','content.galleryHero.primaryHref'])expect(source).toContain(path);
    expect(GALLERY_EDIT_MARKETING_LAYER_CONTRACT.imageRule).toContain('never-baked-into-image-assets');
  });

  it('keeps major gallery stories fully editable through shared story slots without provenance or material authority',()=>{
    for(const [id,root,nodes] of [
      ['gallery-designer-story','content.designerStory',homeNodes],
      ['gallery-product-story','content.productStory',productNodes],
    ] as const){
      const target=nodes.find(item=>item.id===id)!;
      expect(target.componentKey).toBe('story.feature');
      const bindings=JSON.stringify(target.bindings??{});
      for(const slot of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(bindings).toContain(`${root}.${slot}`);
    }
    expect(GALLERY_EDIT_WAVE34_ACCEPTANCE.commerceAuthority.structuredFacts).toBe('E7-or-authoritative-product-binding-only-when-supplied');
    expect(GALLERY_EDIT_WAVE34_ACCEPTANCE.commerceAuthority).toMatchObject({noFakeDesignerProvenance:true,noFakeMaterialClaim:true,noFakeDimensions:true});
  });

  it('keeps unique node identity, merchant-adjustable tokens, all 14 Alap presets and Desktop/Tablet/Mobile compatibility',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:GALLERY_EDIT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(GALLERY_EDIT_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(GALLERY_EDIT_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(GALLERY_EDIT_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found']);
    for(const page of GALLERY_EDIT_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    expect(GALLERY_EDIT_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(GALLERY_EDIT_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
  });

  it('keeps review truth external and journal bindings on the current allowlisted content read path',()=>{
    const review=home('gallery-review-summary')!;
    expect(review.config).toMatchObject({rating:null,count:null,label:'Vásárlói tapasztalatok'});
    expect(review.bindings).toEqual({rating:{path:'reviews.rating',fallback:null},count:{path:'reviews.count',fallback:null},label:{path:'reviews.label',fallback:'Vásárlói tapasztalatok'}});
    expect(JSON.stringify(review)).not.toContain('reviews.summary');
    expect(JSON.stringify(review)).not.toContain('reviews.href');
    expect(JSON.stringify(home('gallery-story-index')?.bindings??{})).toContain('content.journal.items');
    const blog=GALLERY_EDIT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='blog-index')!;
    expect(JSON.stringify(blog)).toContain('content.journal.items');
  });

  it('preserves authoritative PDP bindings and the 7/5 desktop-tablet plus 12/12 mobile grid',()=>{
    expect(product('gallery-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('gallery-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(GALLERY_EDIT_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.products'])expect(source).toContain(path);
    expect(GALLERY_EDIT_WAVE34_ACCEPTANCE.commerceAuthority).toMatchObject({pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',reviews:'review-binding-only',checkout:'shared-provider-neutral-E13'});
  });

  it('keeps installation draft-only, demo content claim-neutral and E13 checkout provider-neutral',()=>{
    const registry=createStorefrontStoryVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:GALLERY_EDIT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='home-gallery-edit')).toBe(true);
    for(const fixture of GALLERY_EDIT_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/authentic designer|certified marble|solid oak certified|handmade in italy|made in denmark|limited stock|only [0-9]+ left/i);
    const checkout=GALLERY_EDIT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
  });

  it('keeps release-side effects outside Wave 34 scope',()=>{
    expect(GALLERY_EDIT_WAVE34_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','visual-builder-drag-drop-ui']));
  });
});
