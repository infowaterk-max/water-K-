import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontVisualLayerComponentRegistry} from '@/lib/builder/storefront-visual-layers';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {HERITAGE_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/heritage-atelier';
import {HERITAGE_ATELIER_WAVE66_ACCEPTANCE} from '@/lib/builder/templates/heritage-atelier-wave66-acceptance';
import {MODERN_LUXE_VISUAL_DNA} from '@/lib/builder/templates/modern-luxe';
import {
  STATEMENT_LAB_CATALOG_PAGE,
  STATEMENT_LAB_DESIGN_TOKENS,
  STATEMENT_LAB_ENGINE_CONTRACT,
  STATEMENT_LAB_HOME_PAGE,
  STATEMENT_LAB_HOME_SECTION_ORDER,
  STATEMENT_LAB_PRODUCT_PAGE,
  STATEMENT_LAB_TEMPLATE_PACKAGE,
  STATEMENT_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/statement-lab';
import {STATEMENT_LAB_WAVE48_ACCEPTANCE} from '@/lib/builder/templates/statement-lab-wave48-acceptance';
import {STATEMENT_LAB_WAVE67_ACCEPTANCE} from '@/lib/builder/templates/statement-lab-wave67-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 67 Statement Lab current-baseline reacceptance',()=>{
  it('reconstructs Statement Lab as the direct canonical successor to Wave 66 Heritage Atelier',()=>{
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE).toMatchObject({wave:67,historicalCounterpartWave:48,historicalReacceptanceWave:29,historicalOriginalWave:11,historicalPullRequest:233,historicalReacceptancePullRequest:152,originalTemplatePullRequest:133,predecessorAcceptance:HERITAGE_ATELIER_WAVE66_ACCEPTANCE.mode,historicalAcceptance:STATEMENT_LAB_WAVE48_ACCEPTANCE.mode,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'jewelry.statement-lab',templateVersion:1,inheritedImplementation:true});
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.sequence).toMatchObject({previous:'jewelry.heritage-atelier',current:'jewelry.statement-lab',reacceptancePrevious:'wave28-jewelry.heritage-atelier',reacceptanceCurrent:'wave29-jewelry.statement-lab',hardenedPrevious:'wave47-jewelry.heritage-atelier',hardenedCurrent:'wave48-jewelry.statement-lab',currentPrevious:'wave66-jewelry.heritage-atelier',currentCurrent:'wave67-jewelry.statement-lab',releaseCheckpointBeforeCurrent:false});
  });

  it('records original provenance and byte-identical inheritance from accepted hardened Wave 48',()=>{
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.provenance).toEqual({currentParentWave:66,currentParentHead:'1dd8ed4d026d7723688327adbb9cec596fa8b96f',originalImplementationHead:'19392d57c72f220fc7d471a8928029d3ccbd1511',originalFinalHead:'5e5e8415b4c90e5e72d4355fb51ff3ae12d14ccc',originalTemplateBlob:'40bfbdb2a1eacbfb2a5d0c55699b996ec667e97e',historicalReacceptanceFinalHead:'405283339c6a9a0dadb518d5722b4caf3fc2f4e5',historicalReacceptanceTemplateBlob:'40bfbdb2a1eacbfb2a5d0c55699b996ec667e97e',historicalFailClosedAcceptanceHead:'0d47b07a90ab9abcef88a4285c9cce77ed08be1b',historicalHardenedImplementationHead:'30548d731abe99b3e1bb48ab894bc6d23a5e4a99',historicalAcceptedFinalHead:'fb63722ceb012a8f7a5b8ae103f6d92cc11b4f4d',historicalAcceptedTemplateBlob:'75dc32af04d8b7cb42c5205f63b276260b7d33e0',currentInheritedTemplateBlob:'75dc32af04d8b7cb42c5205f63b276260b7d33e0',byteIdenticalToHistoricalAcceptedTemplate:true,templateModifiedByWave67:false});
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.historicalHardening).toMatchObject({historicalDriftFound:true,violation:'catalog-page-duplicate-node-id',duplicateNodeId:'statement-lab-catalog-header',correctedCollectionNodeId:'statement-lab-catalog-collection-header',currentBlobContainsAcceptedWave48Fix:true,noCurrentContractDrift:true,noAutomaticReplayOfHistoricalPatch:true});
  });

  it('retains the accepted node-id repair under the current Page Schema validator',()=>{
    const ids=walk(STATEMENT_LAB_CATALOG_PAGE.sections).map(node=>node.id);
    expect(ids.filter(id=>id==='statement-lab-catalog-header')).toHaveLength(1);
    expect(ids).toContain('statement-lab-catalog-collection-header');
    expect(new Set(ids).size).toBe(ids.length);
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.historicalHardening.sharedAllowlistWidened).toBe(false);
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.historicalHardening.componentRegistryWidened).toBe(false);
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.historicalHardening.bindingNamespaceWidened).toBe(false);
  });

  it('preserves Statement Lab visual DNA instead of becoming Heritage Atelier or Modern Luxe reskinning',()=>{
    expect(STATEMENT_LAB_VISUAL_DNA.character).toBe('contemporary-design-jewelry-gallery-material-lab');
    expect(STATEMENT_LAB_VISUAL_DNA.character).not.toBe(HERITAGE_ATELIER_VISUAL_DNA.character);
    expect(STATEMENT_LAB_VISUAL_DNA.character).not.toBe(MODERN_LUXE_VISUAL_DNA.character);
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.visualContract.palette).toEqual(['off-white','silver-grey','graphite','one-merchant-accent']);
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.visualContract.typography).toEqual(['grotesk-display','clean-sans','optional-monospace-spec-accent']);
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.visualContract.rhythm).toBe('object-index-material-study-statement-grid-object-detail');
    expect(STATEMENT_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('keeps the exact Home order and independently editable asymmetric opening layers',()=>{
    expect(STATEMENT_LAB_HOME_SECTION_ORDER).toEqual(['Asymmetric Opening','Floating Product Index','Material Study','Statement Grid','Object Detail','Footer']);
    expect(STATEMENT_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(STATEMENT_LAB_HOME_SECTION_ORDER);
    const source=JSON.stringify(STATEMENT_LAB_HOME_PAGE);
    for(const id of ['statement-lab-opening-image-layer','statement-lab-opening-index-layer','statement-lab-opening-title-layer','statement-lab-opening-copy-layer']) expect(source).toContain(id);
    expect(source).toContain('visual.layered-canvas');
    expect(source).toContain('visual.layer');
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.builderContract.marketingLayerRule).toBe('image-text-copy-cta-bindings-remain-independently-builder-editable');
  });

  it('keeps structured material/spec/manufacturing surfaces fail-closed under shared E7 authority',()=>{
    expect(STATEMENT_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E13']);
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.sharedAuthority).toMatchObject({runtime:'E1-shared-page-schema-runtime',discovery:'E2-shared-product-discovery',compareSpec:'E7-shared-compare-spec-engine',materialFacts:'E7-or-authoritative-product-binding-only-when-supplied',manufacturingFacts:'E7-or-authoritative-product-binding-only-when-supplied',checkout:'shared-provider-neutral-E13'});
    expect(find(STATEMENT_LAB_HOME_PAGE,'statement-lab-material-specs')?.config.items).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE,'statement-lab-key-specs')?.config.items).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE,'statement-lab-spec-groups')?.config.groups).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE,'statement-lab-compare-table')?.config.products).toEqual([]);
    expect(find(STATEMENT_LAB_PRODUCT_PAGE,'statement-lab-documents-list')?.config.documents).toEqual([]);
  });

  it('keeps all bindings inside existing shared namespaces and commerce truth boundaries',()=>{
    const paths=STATEMENT_LAB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths) expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(path.split('.')[0] as never);
    for(const prefix of ['statementLab.','material.','spec.','price.','stock.','checkout.','payment.']) expect(paths.some(path=>path.startsWith(prefix))).toBe(false);
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with page-local unique node IDs',()=>{
    const registry=createStorefrontVisualLayerComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:STATEMENT_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(STATEMENT_LAB_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(STATEMENT_LAB_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(STATEMENT_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of STATEMENT_LAB_TEMPLATE_PACKAGE.pages){const ids=walk(page.sections).map(node=>node.id);expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);const result=validateStorefrontPageDocument(page,registry,capability);expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);}
  });

  it('retains the 7/12 + 5/12 PDP under shared product, price, inventory, variant and E7 authority',()=>{
    const gallery=find(STATEMENT_LAB_PRODUCT_PAGE,'statement-lab-product-gallery');
    const buybox=find(STATEMENT_LAB_PRODUCT_PAGE,'statement-lab-buybox');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(bindingPaths(STATEMENT_LAB_PRODUCT_PAGE)).toEqual(expect.arrayContaining(['pricing.displayPrice','inventory.stockLabel']));
    const source=JSON.stringify(STATEMENT_LAB_PRODUCT_PAGE);
    for(const component of ['commerce.key-specs','commerce.specification-groups','commerce.compare-button','commerce.compare-table','commerce.technical-documents']) expect(source).toContain(component);
  });

  it('keeps draft-only installation and demo fixtures outside sellable authority',()=>{
    const registry=createStorefrontVisualLayerComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:STATEMENT_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='jewelry-statement-lab')).toBe(true);
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.installationContract.inheritedDemoFixturesAreNonAuthoritative).toBe(true);
    for(const fixture of STATEMENT_LAB_TEMPLATE_PACKAGE.demoFixtures??[]){expect(fixture.payload).toMatchObject({demo:true});for(const forbidden of ['price','stock','inventory','rating','reviewCount','materialClaim','manufacturingClaim','provenanceClaim']) expect(Object.prototype.hasOwnProperty.call(fixture.payload,forbidden)).toBe(false);}
  });

  it('keeps provider-neutral E13 checkout and excludes schema, shared-authority, production, main and Wave 68 changes',()=>{
    const checkout=STATEMENT_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.builderContract).toMatchObject({hierarchy:'template-page-presets-section-presets-components',stableIdentity:'stable-page-local-unique-node-ids-and-stable-binding-paths',responsiveModes:['desktop','tablet','mobile'],pagePresetCount:14,minimumPlan:'alap',protectedHomeSequence:true,protectedPdpGrid:'desktop-tablet-7-5-mobile-12-12',runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,visualBuilder:'future-compatible-no-template-local-builder-engine'});
    expect(STATEMENT_LAB_WAVE67_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['artificial-canonical-template-diff','template-local-layout-engine','template-local-builder-engine','parallel-page-schema-authority','template-local-material-engine','template-local-compare-engine','shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','sql-migration','customer-baseline-change','vercel-production-deploy','supabase-mutation','fresh-install-project-state-change','main-merge','wave68-implementation']));
  });
});
