import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontStoryComponentRegistry} from '@/lib/builder/storefront-story';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
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
import {HERITAGE_ATELIER_WAVE28_ACCEPTANCE} from '@/lib/builder/templates/heritage-atelier-wave28-acceptance';
import {MODERN_LUXE_VISUAL_DNA} from '@/lib/builder/templates/modern-luxe';
import {STATEMENT_LAB_VISUAL_DNA} from '@/lib/builder/templates/statement-lab';
import {STORY_ENGINE_VERSION,STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY,validateStoryDocument,type StoryDocument} from '@/lib/content/story-engine';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>walk(nodes).find(node=>node.id===id);

describe('Scale-out Wave 28 Heritage Atelier current-baseline reacceptance',()=>{
  it('reuses the inherited Golden #3 implementation instead of duplicating it',()=>{
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.mode).toBe('current-baseline-reacceptance');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.inheritedImplementation).toBe(true);
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.templateKey).toBe('jewelry.heritage-atelier');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.templateVersion).toBe(1);
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.nonScope).toContain('second-heritage-atelier-template');
  });

  it('locks the heritage craftsmanship provenance editorial visual identity',()=>{
    expect(HERITAGE_ATELIER_VISUAL_DNA.character).toBe('heritage-luxury-craftsmanship-provenance-editorial-commerce');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.visualContract.palette).toEqual(['warm-ivory-parchment','deep-charcoal','burgundy-antique-brass','muted-stone']);
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.visualContract.typography).toEqual(['heritage-editorial-serif','clean-sans']);
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.visualContract.imagery).toBe('macro-material-workshop-craft');
    expect(HERITAGE_ATELIER_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('is structurally distinct from Modern Luxe and Statement Lab',()=>{
    expect(HERITAGE_ATELIER_VISUAL_DNA.character).not.toBe(MODERN_LUXE_VISUAL_DNA.character);
    expect(HERITAGE_ATELIER_VISUAL_DNA.character).not.toBe(STATEMENT_LAB_VISUAL_DNA.character);
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.distinctness).toEqual({
      notModernLuxe:'not-spacious-campaign-luxury-retail-first',
      notStatementLab:'not-contemporary-material-spec-object-lab-first',
      ownRhythm:'story-provenance-craft-commerce-journal-care',
    });
  });

  it('keeps E10 as the story authority and refuses unverified provenance',()=>{
    expect(STORY_ENGINE_VERSION).toBe('shoporation.editorial-story-engine.v1');
    expect(HERITAGE_ATELIER_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(HERITAGE_ATELIER_ENGINE_CONTRACT.useful).toEqual(['E7']);
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.storyContract.provenance).toBe('claim-renders-only-from-explicit-verified-origin-relation');
    const invalid:StoryDocument={version:1,id:'origin-story',slug:'origin-story',storyType:'origin',status:'published',title:'Origin',author:{id:'editor',name:'Editor'},publishedAt:'2026-09-09T08:00:00Z',relations:[{id:'origin-one',type:'origin',entityId:'origin-one',verified:false}],blocks:[{id:'claim-one',type:'provenance',claims:[{label:'Eredet',value:'Műhely A',originRelationId:'origin-one'}]}]};
    const result=validateStoryDocument(invalid);
    expect(result.ok).toBe(false);
    expect(result.violations.map(item=>item.code)).toContain('STORY_PROVENANCE_UNVERIFIED');
  });

  it('rejects product/pricing authority smuggled into Story relations',()=>{
    const invalid={version:1,id:'maker-story',slug:'maker-story',storyType:'maker',status:'published',title:'Maker',author:{id:'editor',name:'Editor'},publishedAt:'2026-09-09T08:00:00Z',relations:[{id:'maker-one',type:'maker',entityId:'maker-one',price:'99 000 Ft'}],blocks:[{id:'intro',type:'prose',text:'Dokumentált történet.'}]} as unknown as StoryDocument;
    const result=validateStoryDocument(invalid);
    expect(result.ok).toBe(false);
    expect(result.violations.map(item=>item.code)).toContain('STORY_PRODUCT_AUTHORITY_DUPLICATED');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.commerceAuthority.pricing).toBe('pricing-binding-only');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.commerceAuthority.inventory).toBe('inventory-binding-only');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.commerceAuthority.structuredMaterialFacts).toBe('E7-or-authoritative-product-binding-only-when-supplied');
  });

  it('keeps provenance empty by default and bound to verified Story data instead of template claims',()=>{
    const provenance=find(HERITAGE_ATELIER_HOME_PAGE.sections,'heritage-provenance');
    expect(provenance?.componentKey).toBe('story.provenance');
    expect(provenance?.config.claims).toEqual([]);
    expect(provenance?.bindings?.claims?.path).toBe('story.provenance.claims');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.commerceAuthority.noFakeProvenance).toBe(true);
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.commerceAuthority.noFakeMakerClaim).toBe(true);
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.commerceAuthority.noFakeMaterialClaim).toBe(true);
  });

  it('locks the approved eleven-stage Home narrative and shared Story surfaces',()=>{
    expect(HERITAGE_ATELIER_HOME_SECTION_ORDER).toEqual(['Heritage Hero','Featured Collection Story','Craftsmanship Feature','Product Selection','Maker/Atelier Story','Material & Origin','Timeline/Heritage','Editorial Commerce Grid','Journal','Service/Care','Footer']);
    expect(HERITAGE_ATELIER_HOME_PAGE.metadata?.sectionOrder).toEqual(HERITAGE_ATELIER_HOME_SECTION_ORDER);
    const source=JSON.stringify([HERITAGE_ATELIER_HOME_PAGE,HERITAGE_ATELIER_CONTENT_PAGE]);
    for(const key of HERITAGE_ATELIER_WAVE28_ACCEPTANCE.builderContract.storySurfaces) expect(source).toContain(key);
  });

  it('retains the accepted PDP 7/12 + 5/12 desktop/tablet and 12/12 mobile structure',()=>{
    const gallery=find(HERITAGE_ATELIER_PRODUCT_PAGE.sections,'heritage-product-gallery');
    const buybox=find(HERITAGE_ATELIER_PRODUCT_PAGE.sections,'heritage-product-buybox');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(JSON.stringify(HERITAGE_ATELIER_PRODUCT_PAGE)).toContain('commerce.key-specs');
    expect(JSON.stringify(HERITAGE_ATELIER_PRODUCT_PAGE)).toContain('story.provenance');
  });

  it('keeps all 14 Alap pages valid and installation draft-only while Story authority survives template switching',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:HERITAGE_ATELIER_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:HERITAGE_ATELIER_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='jewelry-heritage-atelier')).toBe(true);
    expect(STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY).toEqual({storyDocuments:false,products:false,collections:false,makers:false,orders:false,customers:false,storefrontPageDrafts:true});
  });

  it('does not make 3D/AR a Heritage Atelier v1 dependency and keeps checkout provider-neutral',()=>{
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.capabilityBoundary.threeDAr).toBe('not-required-by-heritage-atelier-v1');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.capabilityBoundary.packaging).toBe('deferred-shared-pro-or-addon-capability');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.nonScope).toContain('template-local-3d-ar-engine');
    const checkout=HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(HERITAGE_ATELIER_WAVE28_ACCEPTANCE.commerceAuthority.checkout).toBe('shared-provider-neutral-E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
