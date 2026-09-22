import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontVisualLayerComponentRegistry} from '@/lib/builder/storefront-visual-layers';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {HERITAGE_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/heritage-atelier';
import {MODERN_LUXE_VISUAL_DNA} from '@/lib/builder/templates/modern-luxe';
import {
  STATEMENT_LAB_DESIGN_TOKENS,
  STATEMENT_LAB_ENGINE_CONTRACT,
  STATEMENT_LAB_HOME_PAGE,
  STATEMENT_LAB_HOME_SECTION_ORDER,
  STATEMENT_LAB_PRODUCT_PAGE,
  STATEMENT_LAB_TEMPLATE_PACKAGE,
  STATEMENT_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/statement-lab';
import {STATEMENT_LAB_WAVE29_ACCEPTANCE} from '@/lib/builder/templates/statement-lab-wave29-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>walk(nodes).find(node=>node.id===id);

describe('Scale-out Wave 29 Statement Lab current-baseline reacceptance',()=>{
  it('reuses the inherited Statement Lab implementation instead of duplicating it',()=>{
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.mode).toBe('current-baseline-reacceptance');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.inheritedImplementation).toBe(true);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.templateKey).toBe('jewelry.statement-lab');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.templateVersion).toBe(1);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.nonScope).toContain('second-statement-lab-template');
  });

  it('locks the contemporary gallery/material-lab identity and single-accent discipline',()=>{
    expect(STATEMENT_LAB_VISUAL_DNA.character).toBe('contemporary-design-jewelry-gallery-material-lab');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.visualContract.palette).toEqual(['off-white','silver-grey','graphite','one-merchant-accent']);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.visualContract.accentOptions).toEqual(['oxidized-red','acid-yellow','cobalt']);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.visualContract.accentRule).toMatch(/single-accent-only/);
    expect(STATEMENT_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(STATEMENT_LAB_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['heritage-luxury','champagne-gold-luxe','multiple-competing-accents','fake-material-claims']));
  });

  it('is structurally distinct from Modern Luxe and Heritage Atelier',()=>{
    expect(STATEMENT_LAB_VISUAL_DNA.character).not.toBe(MODERN_LUXE_VISUAL_DNA.character);
    expect(STATEMENT_LAB_VISUAL_DNA.character).not.toBe(HERITAGE_ATELIER_VISUAL_DNA.character);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.distinctness).toEqual({
      notModernLuxe:'not-champagne-gold-spacious-campaign-luxury-retail',
      notHeritageAtelier:'not-provenance-craftsmanship-story-led-heritage-luxury',
      ownRhythm:'object-index-material-study-statement-grid-object-detail',
    });
  });

  it('keeps the exact Home order and independently editable asymmetric opening layers',()=>{
    expect(STATEMENT_LAB_HOME_SECTION_ORDER).toEqual(['Asymmetric Opening','Floating Product Index','Material Study','Statement Grid','Object Detail','Footer']);
    expect(STATEMENT_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(STATEMENT_LAB_HOME_SECTION_ORDER);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.builderContract.openingLayers).toEqual(['object-image','object-index','display-title','supporting-copy']);
    const source=JSON.stringify(STATEMENT_LAB_HOME_PAGE);
    for(const id of ['statement-lab-opening-image-layer','statement-lab-opening-index-layer','statement-lab-opening-title-layer','statement-lab-opening-copy-layer']) expect(source).toContain(id);
    expect(source).toContain('visual.layered-canvas');
    expect(source).toContain('visual.layer');
  });

  it('keeps material and manufacturing truth fail-closed under E7/product authority',()=>{
    expect(STATEMENT_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E13']);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.pricing).toBe('pricing-binding-only');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.inventory).toBe('inventory-binding-only');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.variants).toBe('variant-binding-only');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.materialFacts).toBe('E7-or-authoritative-product-binding-only-when-supplied');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.manufacturingFacts).toBe('E7-or-authoritative-product-binding-only-when-supplied');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.formCompare).toBe('E7-read-model-only');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.noTemplateSpecificMaterialAuthority).toBe(true);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.noTemplateSpecificCompareEngine).toBe(true);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.noFakeMaterialClaim).toBe(true);
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.noFakeManufacturingClaim).toBe(true);
  });

  it('keeps E7 surfaces empty by default instead of inventing object facts',()=>{
    expect(find(STATEMENT_LAB_HOME_PAGE.sections,'statement-lab-material-specs')?.config.items).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-key-specs')?.config.items).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-spec-groups')?.config.groups).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-compare-table')?.config.products).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-compare-table')?.config.groups).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-documents-list')?.config.documents).toEqual([]);
  });

  it('retains the 7/12 + 5/12 PDP and shared compare/spec/document surfaces',()=>{
    const gallery=find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-product-gallery');
    const buybox=find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-buybox');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(STATEMENT_LAB_PRODUCT_PAGE);
    expect(source).toContain('commerce.key-specs');
    expect(source).toContain('commerce.specification-groups');
    expect(source).toContain('commerce.compare-button');
    expect(source).toContain('commerce.compare-table');
    expect(source).toContain('commerce.technical-documents');
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-product-info')?.bindings).toMatchObject({price:{path:'pricing.displayPrice',fallback:''},stockLabel:{path:'inventory.stockLabel',fallback:''}});
  });

  it('still validates all 14 Alap pages and draft-only namespaced installation',()=>{
    const registry=createStorefrontVisualLayerComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:STATEMENT_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(STATEMENT_LAB_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(STATEMENT_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of STATEMENT_LAB_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:STATEMENT_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='jewelry-statement-lab')).toBe(true);
  });

  it('does not make 3D/AR a v1 dependency and keeps checkout provider-neutral',()=>{
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.capabilityBoundary.threeDAr).toBe('not-required-by-statement-lab-v1');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.capabilityBoundary.packaging).toBe('deferred-shared-pro-or-addon-capability');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.nonScope).toContain('template-local-3d-ar-engine');
    const checkout=STATEMENT_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(STATEMENT_LAB_WAVE29_ACCEPTANCE.authorityContract.checkout).toBe('shared-provider-neutral-E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
