import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontStoryComponentRegistry} from '@/lib/builder/storefront-story';
import {
  evaluateStorefrontTemplateCapabilityGate,
  planStorefrontTemplateInstallation,
} from '@/lib/builder/storefront-template-installation';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {
  HERITAGE_ATELIER_CONTENT_PAGE,
  HERITAGE_ATELIER_DESIGN_TOKENS,
  HERITAGE_ATELIER_ENGINE_CONTRACT,
  HERITAGE_ATELIER_HOME_PAGE,
  HERITAGE_ATELIER_HOME_SECTION_ORDER,
  HERITAGE_ATELIER_PRODUCT_PAGE,
  HERITAGE_ATELIER_TEMPLATE_PACKAGE,
  HERITAGE_ATELIER_VISUAL_DNA,
} from '@/lib/builder/templates/heritage-atelier';
import {HERITAGE_ATELIER_WAVE47_ACCEPTANCE} from '@/lib/builder/templates/heritage-atelier-wave47-acceptance';
import {MODERN_LUXE_VISUAL_DNA} from '@/lib/builder/templates/modern-luxe';
import {STATEMENT_LAB_VISUAL_DNA} from '@/lib/builder/templates/statement-lab';
import {
  STORY_ENGINE_VERSION,
  STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  validateStoryDocument,
  type StoryDocument,
} from '@/lib/content/story-engine';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>walk(nodes).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 47 Heritage Atelier current-baseline reacceptance',()=>{
  it('re-accepts historical Wave 28 Heritage Atelier directly after Modern Luxe',()=>{
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE).toMatchObject({
      wave:47,
      historicalWave:28,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'jewelry.heritage-atelier',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.historicalSequence).toEqual({
      previous:'jewelry.modern-luxe',
      current:'jewelry.heritage-atelier',
      relationship:'original-wave28-stacked-directly-on-modern-luxe-wave27',
    });
    expect(HERITAGE_ATELIER_TEMPLATE_PACKAGE.manifest.templateKey).toBe('jewelry.heritage-atelier');
    expect(HERITAGE_ATELIER_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(HERITAGE_ATELIER_TEMPLATE_PACKAGE.manifest.demoContent.namespace).toBe('jewelry-heritage-atelier');
  });

  it('locks the heritage craftsmanship provenance editorial visual identity and category distinctness',()=>{
    expect(HERITAGE_ATELIER_VISUAL_DNA.character).toBe('heritage-luxury-craftsmanship-provenance-editorial-commerce');
    expect(HERITAGE_ATELIER_VISUAL_DNA.character).not.toBe(MODERN_LUXE_VISUAL_DNA.character);
    expect(HERITAGE_ATELIER_VISUAL_DNA.character).not.toBe(STATEMENT_LAB_VISUAL_DNA.character);
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.visualContract.palette).toEqual(['warm-ivory-parchment','deep-charcoal','burgundy-antique-brass','muted-stone']);
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.visualContract.typography).toEqual(['heritage-editorial-serif','clean-sans']);
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.visualContract.imagery).toBe('macro-material-workshop-craft');
    expect(HERITAGE_ATELIER_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.distinctness).toEqual({
      notModernLuxe:'not-spacious-campaign-luxury-retail-first',
      notStatementLab:'not-contemporary-material-spec-object-lab-first',
      ownPosition:'heritage-craftsmanship-provenance-editorial-story-led-luxury',
    });
  });

  it('keeps the approved eleven-stage Home narrative and shared Story surfaces',()=>{
    expect(HERITAGE_ATELIER_HOME_SECTION_ORDER).toEqual(['Heritage Hero','Featured Collection Story','Craftsmanship Feature','Product Selection','Maker/Atelier Story','Material & Origin','Timeline/Heritage','Editorial Commerce Grid','Journal','Service/Care','Footer']);
    expect(HERITAGE_ATELIER_HOME_PAGE.metadata?.sectionOrder).toEqual(HERITAGE_ATELIER_HOME_SECTION_ORDER);
    const source=JSON.stringify([HERITAGE_ATELIER_HOME_PAGE,HERITAGE_ATELIER_CONTENT_PAGE]);
    for(const key of HERITAGE_ATELIER_WAVE47_ACCEPTANCE.builderContract.storySurfaces) expect(source).toContain(key);
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.builderContract.hierarchy).toBe('template-page-presets-section-presets-components');
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.builderContract.responsiveModes).toEqual(['desktop','tablet','mobile']);
  });

  it('keeps E10 shared and fails closed for unverified provenance',()=>{
    expect(STORY_ENGINE_VERSION).toBe('shoporation.editorial-story-engine.v1');
    expect(HERITAGE_ATELIER_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(HERITAGE_ATELIER_ENGINE_CONTRACT.useful).toEqual(['E7']);
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.storyContract.sharedEngineOnly).toBe(true);
    const invalid:StoryDocument={version:1,id:'origin-story',slug:'origin-story',storyType:'origin',status:'published',title:'Origin',author:{id:'editor',name:'Editor'},publishedAt:'2026-09-09T08:00:00Z',relations:[{id:'origin-one',type:'origin',entityId:'origin-one',verified:false}],blocks:[{id:'claim-one',type:'provenance',claims:[{label:'Eredet',value:'Műhely A',originRelationId:'origin-one'}]}]};
    const result=validateStoryDocument(invalid);
    expect(result.ok).toBe(false);
    expect(result.violations.map(item=>item.code)).toContain('STORY_PROVENANCE_UNVERIFIED');
  });

  it('rejects product or pricing authority smuggled into Story relations',()=>{
    const invalid={version:1,id:'maker-story',slug:'maker-story',storyType:'maker',status:'published',title:'Maker',author:{id:'editor',name:'Editor'},publishedAt:'2026-09-09T08:00:00Z',relations:[{id:'maker-one',type:'maker',entityId:'maker-one',price:'99 000 Ft'}],blocks:[{id:'intro',type:'prose',text:'Dokumentált történet.'}]} as unknown as StoryDocument;
    const result=validateStoryDocument(invalid);
    expect(result.ok).toBe(false);
    expect(result.violations.map(item=>item.code)).toContain('STORY_PRODUCT_AUTHORITY_DUPLICATED');
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.authorityContract).toMatchObject({
      pricing:'pricing-binding-only',
      inventory:'inventory-binding-only',
      variants:'variant-binding-only',
      structuredMaterialFacts:'E7-or-authoritative-product-binding-only-when-supplied',
      checkout:'shared-provider-neutral-E13',
      provenance:'shared-E10-verified-origin-only',
      noTemplateSpecificJewelryAuthority:true,
      noTemplateProvenanceAuthority:true,
      noTemplateStoryAuthority:true,
      noFakeProvenance:true,
      noFakeMaterialClaim:true,
      noFakeScarcity:true,
    });
  });

  it('keeps provenance empty by default and bound to authoritative Story data',()=>{
    const provenance=find(HERITAGE_ATELIER_HOME_PAGE.sections,'heritage-provenance');
    expect(provenance?.componentKey).toBe('story.provenance');
    expect(provenance?.config.claims).toEqual([]);
    expect(provenance?.bindings?.claims?.path).toBe('story.provenance.claims');
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.authorityContract.noFakeMakerClaim).toBe(true);
  });

  it('keeps all bindings inside current shared namespaces and commerce truth paths',()=>{
    const paths=HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('heritage.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('jewelry.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('price.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('stock.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('checkout.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('payment.'))).toBe(false);
  });

  it('requires stable unique node identity across all 14 Page Schema presets',()=>{
    for(const page of HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
    }
  });

  it('keeps all 14 Alap page presets valid and installation draft-only',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:HERITAGE_ATELIER_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(HERITAGE_ATELIER_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:HERITAGE_ATELIER_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='jewelry-heritage-atelier')).toBe(true);
  });

  it('preserves Story lifecycle boundaries through template switching',()=>{
    expect(STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY).toEqual({storyDocuments:false,products:false,collections:false,makers:false,orders:false,customers:false,storefrontPageDrafts:true});
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.installationContract).toMatchObject({
      draftOnly:true,
      demoNamespace:'jewelry-heritage-atelier',
      mutableAuthority:['storefrontPageDrafts'],
    });
  });

  it('retains the responsive PDP and provider-neutral E13 checkout without local authority',()=>{
    const gallery=find(HERITAGE_ATELIER_PRODUCT_PAGE.sections,'heritage-product-gallery');
    const buybox=find(HERITAGE_ATELIER_PRODUCT_PAGE.sections,'heritage-product-buybox');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const productSource=JSON.stringify(HERITAGE_ATELIER_PRODUCT_PAGE);
    expect(productSource).toContain('pricing.displayPrice');
    expect(productSource).toContain('inventory.stockLabel');
    expect(productSource).toContain('variant.optionOptions');
    expect(productSource).toContain('story.provenance');
    const checkout=HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
  });

  it('does not widen shared contracts or pull Visual Builder / 3D AR forward',()=>{
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.builderContract).toMatchObject({
      pagePresetCount:14,
      minimumPlan:'alap',
      runtimeAllowlistWidened:false,
      componentRegistryWidened:false,
      bindingNamespaceWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.capabilityBoundary.threeDAr).toBe('not-required-by-heritage-atelier-v1');
    expect(HERITAGE_ATELIER_WAVE47_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'template-local-story-engine','template-local-provenance-engine','template-local-jewelry-product-authority',
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
      'visual-builder-drag-drop-ui','live-canvas','inline-editing','sql-migration','vercel-production-deploy',
      'supabase-mutation','main-merge','wave48-implementation',
    ]));
  });
});
