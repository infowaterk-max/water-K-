import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontVisualLayerComponentRegistry} from '@/lib/builder/storefront-visual-layers';
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
import {STATEMENT_LAB_WAVE48_ACCEPTANCE} from '@/lib/builder/templates/statement-lab-wave48-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>walk(nodes).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 48 Statement Lab current-baseline reacceptance',()=>{
  it('re-accepts historical Wave 29 / PR #152 directly after Heritage Atelier',()=>{
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE).toMatchObject({
      wave:48,
      historicalWave:29,
      historicalPullRequest:152,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'jewelry.statement-lab',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.historicalSequence).toEqual({
      previous:'jewelry.heritage-atelier',
      current:'jewelry.statement-lab',
      relationship:'original-wave29-stacked-directly-on-heritage-atelier-wave28',
    });
    expect(STATEMENT_LAB_TEMPLATE_PACKAGE.manifest.templateKey).toBe('jewelry.statement-lab');
    expect(STATEMENT_LAB_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(STATEMENT_LAB_TEMPLATE_PACKAGE.manifest.demoContent.namespace).toBe('jewelry-statement-lab');
  });

  it('locks the contemporary gallery/material-lab identity and family distinctness',()=>{
    expect(STATEMENT_LAB_VISUAL_DNA.character).toBe('contemporary-design-jewelry-gallery-material-lab');
    expect(STATEMENT_LAB_VISUAL_DNA.character).not.toBe(MODERN_LUXE_VISUAL_DNA.character);
    expect(STATEMENT_LAB_VISUAL_DNA.character).not.toBe(HERITAGE_ATELIER_VISUAL_DNA.character);
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.visualContract.palette).toEqual(['off-white','silver-grey','graphite','one-merchant-accent']);
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.visualContract.accentOptions).toEqual(['oxidized-red','acid-yellow','cobalt']);
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.visualContract.accentRule).toMatch(/single-accent-only/);
    expect(STATEMENT_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.distinctness).toEqual({
      notModernLuxe:'not-champagne-gold-spacious-campaign-luxury-retail',
      notHeritageAtelier:'not-provenance-craftsmanship-story-led-heritage-luxury',
      ownPosition:'contemporary-object-gallery-material-spec-lab',
    });
  });

  it('keeps the exact Home order and independently editable asymmetric opening layers',()=>{
    expect(STATEMENT_LAB_HOME_SECTION_ORDER).toEqual(['Asymmetric Opening','Floating Product Index','Material Study','Statement Grid','Object Detail','Footer']);
    expect(STATEMENT_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(STATEMENT_LAB_HOME_SECTION_ORDER);
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.builderContract.openingLayers).toEqual(['object-image','object-index','display-title','supporting-copy']);
    const source=JSON.stringify(STATEMENT_LAB_HOME_PAGE);
    for(const id of ['statement-lab-opening-image-layer','statement-lab-opening-index-layer','statement-lab-opening-title-layer','statement-lab-opening-copy-layer']) expect(source).toContain(id);
    expect(source).toContain('visual.layered-canvas');
    expect(source).toContain('visual.layer');
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.builderContract.hierarchy).toBe('template-page-presets-section-presets-components');
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.builderContract.responsiveModes).toEqual(['desktop','tablet','mobile']);
  });

  it('keeps E7/material/manufacturing truth fail-closed and shared',()=>{
    expect(STATEMENT_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E13']);
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.authorityContract).toMatchObject({
      pricing:'pricing-binding-only',
      inventory:'inventory-binding-only',
      variants:'variant-binding-only',
      materialFacts:'E7-or-authoritative-product-binding-only-when-supplied',
      manufacturingFacts:'E7-or-authoritative-product-binding-only-when-supplied',
      formCompare:'E7-read-model-only',
      documents:'authoritative-product-document-binding-only',
      checkout:'shared-provider-neutral-E13',
      noTemplateSpecificProductAuthority:true,
      noTemplateSpecificMaterialAuthority:true,
      noTemplateSpecificCompareEngine:true,
      noFakeMaterialClaim:true,
      noFakeManufacturingClaim:true,
      noFakeScarcity:true,
      noFakeRating:true,
      noFakeProvenance:true,
    });
  });

  it('keeps E7/spec surfaces empty by default instead of inventing object facts',()=>{
    expect(find(STATEMENT_LAB_HOME_PAGE.sections,'statement-lab-material-specs')?.config.items).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-key-specs')?.config.items).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-spec-groups')?.config.groups).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-compare-table')?.config.products).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-compare-table')?.config.groups).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-documents-list')?.config.documents).toEqual([]);
  });

  it('keeps all bindings inside current shared namespaces and commerce truth boundaries',()=>{
    const paths=STATEMENT_LAB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('statementLab.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('material.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('price.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('stock.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('checkout.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('payment.'))).toBe(false);
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
    expect(find(STATEMENT_LAB_PRODUCT_PAGE.sections,'statement-lab-product-info')?.bindings).toMatchObject({
      price:{path:'pricing.displayPrice',fallback:''},
      stockLabel:{path:'inventory.stockLabel',fallback:''},
    });
  });

  it('requires stable unique node identity across the complete preset set',()=>{
    for(const page of STATEMENT_LAB_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
    }
  });

  it('keeps all 14 Alap-compatible Page Schema presets valid and installation draft-only',()=>{
    const registry=createStorefrontVisualLayerComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:STATEMENT_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(STATEMENT_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(STATEMENT_LAB_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of STATEMENT_LAB_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:STATEMENT_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='jewelry-statement-lab')).toBe(true);
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'jewelry-statement-lab',mutableAuthority:['storefrontPageDrafts']});
  });

  it('keeps provider-neutral E13 checkout and does not pull Visual Builder or 3D/AR forward',()=>{
    const checkout=STATEMENT_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.capabilityBoundary.threeDAr).toBe('not-required-by-statement-lab-v1');
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.builderContract).toMatchObject({
      pagePresetCount:14,
      minimumPlan:'alap',
      runtimeAllowlistWidened:false,
      componentRegistryWidened:false,
      bindingNamespaceWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(STATEMENT_LAB_WAVE48_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'template-local-material-engine','template-local-compare-engine','template-local-product-authority',
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
      'visual-builder-drag-drop-ui','live-canvas','inline-editing','sql-migration','vercel-production-deploy',
      'supabase-mutation','main-merge','wave49-implementation',
    ]));
  });
});
