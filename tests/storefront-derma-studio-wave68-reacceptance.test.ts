import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontGuidedVisualComponentRegistry} from '@/lib/builder/storefront-guided-visual';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {BEAUTY_LAB_VISUAL_DNA} from '@/lib/builder/templates/beauty-lab';
import {
  DERMA_STUDIO_CATALOG_PAGE,
  DERMA_STUDIO_CONTENT_PAGE,
  DERMA_STUDIO_DESIGN_TOKENS,
  DERMA_STUDIO_ENGINE_CONTRACT,
  DERMA_STUDIO_HOME_PAGE,
  DERMA_STUDIO_HOME_SECTION_ORDER,
  DERMA_STUDIO_MARKETING_LAYER_CONTRACT,
  DERMA_STUDIO_PRODUCT_PAGE,
  DERMA_STUDIO_SEARCH_PAGE,
  DERMA_STUDIO_TEMPLATE_PACKAGE,
  DERMA_STUDIO_VISUAL_DNA,
} from '@/lib/builder/templates/derma-studio';
import {DERMA_STUDIO_WAVE49_ACCEPTANCE} from '@/lib/builder/templates/derma-studio-wave49-acceptance';
import {DERMA_STUDIO_WAVE68_ACCEPTANCE} from '@/lib/builder/templates/derma-studio-wave68-acceptance';
import {RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';
import {STATEMENT_LAB_VISUAL_DNA} from '@/lib/builder/templates/statement-lab';
import {STATEMENT_LAB_WAVE67_ACCEPTANCE} from '@/lib/builder/templates/statement-lab-wave67-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const componentKeys=(page:StorefrontPageDocument)=>walk(page.sections).map(node=>node.componentKey);

describe('Scale-out Wave 68 Derma Studio current-baseline reacceptance',()=>{
  it('reconstructs Derma Studio as the direct canonical successor to Wave 67 Statement Lab',()=>{
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE).toMatchObject({
      wave:68,historicalCounterpartWave:49,historicalReacceptanceWave:30,historicalOriginalWave:12,
      historicalPullRequest:243,historicalReacceptancePullRequest:175,originalTemplatePullRequest:135,
      predecessorAcceptance:STATEMENT_LAB_WAVE67_ACCEPTANCE.mode,historicalAcceptance:DERMA_STUDIO_WAVE49_ACCEPTANCE.mode,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'beauty.derma-studio',templateVersion:1,inheritedImplementation:true,
    });
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.sequence).toMatchObject({
      originalPrevious:'wave11-jewelry.statement-lab',originalCurrent:'wave12-beauty.derma-studio',
      reacceptancePrevious:'wave29-jewelry.statement-lab',reacceptanceCurrent:'wave30-beauty.derma-studio',
      hardenedPrevious:'wave48-jewelry.statement-lab',hardenedCurrent:'wave49-beauty.derma-studio',
      currentPrevious:'wave67-jewelry.statement-lab',currentCurrent:'wave68-beauty.derma-studio',releaseCheckpointBetweenPreviousAndCurrent:false,
    });
  });

  it('records exact provenance and byte-identical inheritance from accepted hardened Wave 49',()=>{
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.provenance).toEqual({
      currentParentWave:67,currentParentHead:'f9d6f2573f578fc9ec9df11b6f93d1ec2257f8d8',
      originalImplementationHead:'631bc8bc9798388346e9a080abd38663ecf8739f',originalFinalHead:'52bb44be85c47ed364de69ee8a9e958df52cb830',
      originalTemplateBlob:'febdb2e750d415d06159cb9135e3e6f5cd1f7597',originalFinalTemplateBlob:'febdb2e750d415d06159cb9135e3e6f5cd1f7597',
      historicalReacceptanceFinalHead:'29751e3671ad9082dd3be914ab02070ff4e2bf11',historicalReacceptanceTemplateBlob:'41ad1e161e566872e0381591f1dbae35d8939f5a',
      historicalFailClosedAcceptanceHead:'460f492f86599b715aded338bb22fa44f20b0325',historicalFailClosedTemplateBlob:'41ad1e161e566872e0381591f1dbae35d8939f5a',
      historicalHardenedImplementationHead:'e0ca1465069b06bcab011f5bb358d3f9733c3684',historicalAcceptedFinalHead:'e0ca1465069b06bcab011f5bb358d3f9733c3684',
      historicalAcceptedTemplateBlob:'135a337655ffe6caa8d902b522f51d341d6abda2',currentInheritedTemplateBlob:'135a337655ffe6caa8d902b522f51d341d6abda2',
      byteIdenticalToHistoricalAcceptedTemplate:true,templateModifiedByWave68:false,
    });
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.historicalHardening).toMatchObject({
      driftGroups:['duplicate-node-ids','guided-navigation-page-type-contract','review-summary-binding-config-contract','responsive-pdp-buybox-wrapper-evidence'],
      currentBlobContainsAcceptedWave49Fixes:true,noCurrentContractDrift:true,noAutomaticReplayOfHistoricalPatch:true,
      sharedAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,
    });
  });

  it('preserves Derma Studio visual DNA and non-medical educational merchandising separation',()=>{
    expect(DERMA_STUDIO_VISUAL_DNA.character).toBe('clinically-clean-concern-first-routine-first-skincare-commerce');
    expect(DERMA_STUDIO_VISUAL_DNA.character).not.toBe(STATEMENT_LAB_VISUAL_DNA.character);
    expect(DERMA_STUDIO_VISUAL_DNA.character).not.toBe(BEAUTY_LAB_VISUAL_DNA.character);
    expect(DERMA_STUDIO_VISUAL_DNA.character).not.toBe(RITUAL_HOUSE_VISUAL_DNA.character);
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.portfolio.dermaStudioJourney).toBe('concern-to-routine-to-active-ingredient-to-product');
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.visualContract.palette).toEqual(['warm-white','soft-mineral-grey','graphite','muted-blue-green','soft-clay']);
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.visualContract.typography).toEqual(['clean-editorial-sans','precise-sans']);
    expect(DERMA_STUDIO_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['medical-clinic','diagnostic-ui','treatment-or-cure-claims','black-box-score','fake-clinical-evidence','before-after-medical-claims']));
    expect(DERMA_STUDIO_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('keeps the exact Home structure and independently editable shared hero layers',()=>{
    expect(DERMA_STUDIO_HOME_SECTION_ORDER).toEqual(['Clinical Clarity Hero','Shop by Concern','Routine Finder','Active Ingredient Index','Routine Steps','Targeted Formulas','Ingredient Education','Reviews','Footer']);
    expect(DERMA_STUDIO_HOME_PAGE.metadata?.sectionOrder).toEqual(DERMA_STUDIO_HOME_SECTION_ORDER);
    expect(DERMA_STUDIO_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','badge','title','copy','primary-cta','secondary-cta']);
    for(const id of ['derma-hero-image-layer','derma-hero-overlay-layer','derma-hero-decoration-layer','derma-hero-badge-layer','derma-hero-title-layer','derma-hero-copy-layer','derma-hero-primary-cta-layer','derma-hero-secondary-cta-layer']) expect(find(DERMA_STUDIO_HOME_PAGE,id)?.componentKey).toBe('visual.layer');
    expect(find(DERMA_STUDIO_HOME_PAGE,'derma-clarity-layered-hero')?.componentKey).toBe('visual.layered-canvas');
    expect(DERMA_STUDIO_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-guided-finder-no-template-local-engine');
  });

  it('keeps E3 explainable non-diagnostic and E7 structured facts fail-closed',()=>{
    expect(DERMA_STUDIO_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E7','E13']);
    expect(DERMA_STUDIO_ENGINE_CONTRACT.authorityRule).toBe('routine-and-concern-guidance-is-non-diagnostic-and-read-model-only');
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.guidanceAuthority).toMatchObject({
      E3:'deterministic-explainable-non-diagnostic-concern-and-routine-merchandising-navigation',scoring:'no-black-box-score',diagnosis:false,
      diseaseClassification:false,treatmentAdvice:false,curePromise:false,medicalRecommendation:false,clinicalDecision:false,healthRecordAuthority:false,healthStateInference:false,routinePersistenceAuthority:false,
    });
    expect(find(DERMA_STUDIO_HOME_PAGE,'derma-active-index-block')?.config.items).toEqual([]);
    expect(find(DERMA_STUDIO_PRODUCT_PAGE,'derma-product-snapshot')?.config.items).toEqual([]);
    expect(find(DERMA_STUDIO_PRODUCT_PAGE,'derma-product-spec-groups')?.config.groups).toEqual([]);
    expect(find(DERMA_STUDIO_PRODUCT_PAGE,'derma-finder-explanation')?.config.evidence).toEqual([]);
    expect(find(DERMA_STUDIO_PRODUCT_PAGE,'derma-product-recommendations-block')?.config.products).toEqual([]);
  });

  it('retains the current review-summary contract with authoritative null-safe evidence',()=>{
    const reviews=find(DERMA_STUDIO_HOME_PAGE,'derma-review-summary');
    expect(reviews?.componentKey).toBe('commerce.review-summary');
    expect(Object.keys(reviews?.config??{}).sort()).toEqual(['count','label','rating']);
    expect(Object.keys(reviews?.bindings??{}).sort()).toEqual(['count','label','rating']);
    expect(reviews?.config.rating).toBeNull();
    expect(reviews?.config.count).toBeNull();
    expect(reviews?.bindings?.rating).toEqual({path:'reviews.rating',fallback:null});
    expect(reviews?.bindings?.count).toEqual({path:'reviews.count',fallback:null});
    expect(reviews?.bindings?.label).toEqual({path:'reviews.label',fallback:'Vásárlói tapasztalatok'});
  });

  it('keeps Guided components inside current Page Schema support and all bindings inside shared namespaces',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    for(const page of [DERMA_STUDIO_CATALOG_PAGE,DERMA_STUDIO_SEARCH_PAGE,DERMA_STUDIO_CONTENT_PAGE,DERMA_STUDIO_PRODUCT_PAGE]){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    expect(componentKeys(DERMA_STUDIO_CATALOG_PAGE)).toContain('guided.attribute-navigation');
    expect(componentKeys(DERMA_STUDIO_PRODUCT_PAGE)).toContain('guided.explanation');
    expect(componentKeys(DERMA_STUDIO_SEARCH_PAGE).some(key=>key.startsWith('guided.'))).toBe(false);
    expect(componentKeys(DERMA_STUDIO_CONTENT_PAGE).some(key=>key.startsWith('guided.'))).toBe(false);
    const paths=DERMA_STUDIO_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    for(const path of paths) expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(path.split('.')[0] as never);
    for(const prefix of ['derma.','diagnosis.','medical.','price.','stock.','checkout.','payment.']) expect(paths.some(path=>path.startsWith(prefix))).toBe(false);
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with unique node IDs',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:DERMA_STUDIO_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(DERMA_STUDIO_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(DERMA_STUDIO_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(DERMA_STUDIO_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of DERMA_STUDIO_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('retains the actual 7/12 gallery plus 5/12 responsive buybox wrapper',()=>{
    const gallery=find(DERMA_STUDIO_PRODUCT_PAGE,'derma-product-gallery');
    const buybox=find(DERMA_STUDIO_PRODUCT_PAGE,'derma-product-buybox');
    expect(gallery?.componentKey).toBe('commerce.product-gallery');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.componentKey).toBe('layout.stack');
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(bindingPaths(DERMA_STUDIO_PRODUCT_PAGE)).toEqual(expect.arrayContaining(['pricing.displayPrice','inventory.stockLabel','product.keySpecs','product.specGroups','finder.productEvidence','commerce.purchaseHref']));
  });

  it('keeps draft-only install and demo fixtures outside sellable/medical authority',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:DERMA_STUDIO_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='beauty-derma-studio')).toBe(true);
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'beauty-derma-studio',inheritedDemoFixturesAreNonAuthoritative:true});
    for(const fixture of DERMA_STUDIO_TEMPLATE_PACKAGE.demoFixtures??[]){
      expect(fixture.payload).toMatchObject({demo:true});
      expect(JSON.stringify(fixture.payload)).not.toMatch(/gyógyít|kezel(?:és|i)|betegség|terápia|clinical proof|diagnosis|cure|treats|concentration|efficacy/i);
      for(const forbidden of ['price','stock','inventory','rating','reviewCount','concentration','clinicalEvidence','efficacy','treatment','cure']) expect(Object.prototype.hasOwnProperty.call(fixture.payload,forbidden)).toBe(false);
    }
  });

  it('keeps provider-neutral E13 checkout and excludes shared-authority, schema, production, main and Wave 69 changes',()=>{
    const checkout=DERMA_STUDIO_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',stableIdentity:'stable-page-local-unique-node-ids-and-stable-binding-paths',
      responsiveModes:['desktop','tablet','mobile'],pagePresetCount:14,minimumPlan:'alap',protectedHomeSequence:true,protectedPdpGrid:'desktop-tablet-7-5-mobile-12-12',
      runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(DERMA_STUDIO_WAVE68_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'artificial-canonical-template-diff','medical-or-diagnostic-engine','template-local-recommendation-engine','template-local-routine-engine',
      'template-local-builder-engine','parallel-page-schema-authority','shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
      'sql-migration','customer-baseline-change','vercel-production-deploy','supabase-mutation','fresh-install-project-state-change','main-merge','wave69-implementation',
    ]));
  });
});
