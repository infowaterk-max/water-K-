import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-commerce';
import {STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS,createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-editorial';
import {STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-guided-finder';
import {STOREFRONT_PRIMITIVE_DEFINITIONS} from '@/lib/builder/storefront-primitives';
import {STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-structured-product';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {CREATOR_STATION_WAVE74_ACCEPTANCE} from '@/lib/builder/templates/creator-station-wave74-acceptance';
import {CREATOR_STATION_VISUAL_DNA} from '@/lib/builder/templates/creator-station';
import {
  SPEC_LAB_ACCOUNT_PAGE,
  SPEC_LAB_BUILDER_HARDENING_CONTRACT,
  SPEC_LAB_CART_PAGE,
  SPEC_LAB_CONTENT_PAGE,
  SPEC_LAB_DECISION_PATH,
  SPEC_LAB_DESIGN_TOKENS,
  SPEC_LAB_ENGINE_CONTRACT,
  SPEC_LAB_HOME_PAGE,
  SPEC_LAB_HOME_SECTION_ORDER,
  SPEC_LAB_LEGACY_WORKING_NAME,
  SPEC_LAB_PRODUCT_PAGE,
  SPEC_LAB_SEARCH_PAGE,
  SPEC_LAB_TEMPLATE_MANIFEST,
  SPEC_LAB_TEMPLATE_PACKAGE,
  SPEC_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/spec-lab';
import {SPEC_LAB_WAVE37_ACCEPTANCE} from '@/lib/builder/templates/spec-lab-wave37-acceptance';
import {SPEC_LAB_WAVE56_ACCEPTANCE} from '@/lib/builder/templates/spec-lab-wave56-acceptance';
import {SPEC_LAB_WAVE75_ACCEPTANCE} from '@/lib/builder/templates/spec-lab-wave75-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const focusedPages=['home','catalog','search','product','content','blog-index','blog-article','checkout'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const home=(id:string)=>nodeById(SPEC_LAB_HOME_PAGE,id);
const product=(id:string)=>nodeById(SPEC_LAB_PRODUCT_PAGE,id);
const content=(id:string)=>nodeById(SPEC_LAB_CONTENT_PAGE,id);
const definitions=[...STOREFRONT_PRIMITIVE_DEFINITIONS,...STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS,...STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS,...STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS,...STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS,...STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS];
const bindingSlots=(componentKey:string)=>definitions.find(definition=>definition.manifest.componentKey===componentKey)?.bindingSlots??[];
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const expectCompleteBindings=(target:StorefrontComponentNode|undefined,componentKey:string)=>{
  expect(target?.componentKey).toBe(componentKey);
  expect(Object.keys(target?.bindings??{}).sort()).toEqual([...bindingSlots(componentKey)].sort());
};

describe('Scale-out Wave 75 Spec Lab current-baseline reacceptance',()=>{
  it('reconstructs Spec Lab as the repository-proven direct successor of exact Wave 74 Creator Station',()=>{
    expect(CREATOR_STATION_WAVE74_ACCEPTANCE.wave).toBe(74);
    expect(SPEC_LAB_WAVE75_ACCEPTANCE).toMatchObject({
      wave:75,predecessorWave:74,currentBaselineCounterpartWave:56,currentBaselineCounterpartPullRequest:258,
      historicalCounterpartWave:37,historicalPullRequest:208,originalTemplateWave:18,originalTemplatePullRequest:141,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'tech.spec-lab',templateVersion:1,legacyWorkingName:'Tech Command',inheritedImplementation:true,
    });
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.sequence).toMatchObject({previous:'wave74-tech.creator-station',current:'tech.spec-lab',historicalPrevious:'wave36-tech.creator-station',historicalCurrent:'wave37-tech.spec-lab',currentBaselinePrevious:'wave55-tech.creator-station',currentBaselineCurrent:'wave56-tech.spec-lab',originalPrevious:'wave17-tech.creator-station',originalCurrent:'wave18-tech.spec-lab',releaseCheckpointBeforeCurrent:false});
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.provenance).toMatchObject({historicalBlob:'172a065cba30db10dac993695be1ba1831bf986d',currentBaselineBlob:'172a065cba30db10dac993695be1ba1831bf986d',wave74ParentBlob:'172a065cba30db10dac993695be1ba1831bf986d',currentDrift:false});
    expect(SPEC_LAB_TEMPLATE_MANIFEST.templateKey).toBe('tech.spec-lab');
    expect(SPEC_LAB_TEMPLATE_MANIFEST.demoContent.namespace).toBe('tech-spec-lab');
    expect(SPEC_LAB_LEGACY_WORKING_NAME).toBe('Tech Command');
  });

  it('keeps Spec Lab visually and structurally distinct from Creator Station with the locked decision path',()=>{
    expect(SPEC_LAB_VISUAL_DNA.character).toBe('dark-navy-specialist-tech-decision-lab');
    expect(SPEC_LAB_VISUAL_DNA.category).toBe('electronics-tech');
    expect(SPEC_LAB_VISUAL_DNA.character).not.toBe(CREATOR_STATION_VISUAL_DNA.character);
    expect(SPEC_LAB_DECISION_PATH).toEqual(['Mit keresel?','Mire használod?','Hasonlítsd össze','Tech Finder','Építsd fel a szetted']);
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','section-order','decision-path','spec-grid','comparison-rail','system-map']));
  });

  it('preserves the exact accepted eleven-step Home composition without gamer RGB or white-content drift',()=>{
    expect(SPEC_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(SPEC_LAB_HOME_SECTION_ORDER);
    expect(SPEC_LAB_HOME_SECTION_ORDER).toEqual(['Mit keresel?','Mire használod?','Hasonlítsd össze','Tech Finder','Építsd fel a szetted','Compatibility Matrix','System Requirements','Accessory Matcher','Trade-in','Tech Magazine','Footer']);
    expect(JSON.stringify(SPEC_LAB_HOME_PAGE)).not.toMatch(/gamer-rgb|neon-rainbow|white-background/i);
  });

  it('uses only current shared binding namespaces and preserves historical system/story corrections without widening contracts',()=>{
    const paths=SPEC_LAB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths)expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(path.split('.')[0] as never);
    expect(paths.some(path=>path.startsWith('system.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('story.'))).toBe(false);
    expect(STOREFRONT_BINDING_NAMESPACES).not.toContain('system');
    expect(STOREFRONT_BINDING_NAMESPACES).not.toContain('story');
    expect(paths).toEqual(expect.arrayContaining(['product.systemRequirements','content.techMagazineItems','commerce.compareProducts','finder.currentStep.title','configurator.slots','compatibility.status']));
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,pageSchemaAllowlistWidened:false});
  });

  it('keeps E2/E3/E5 discovery, Finder and setup surfaces complete without template-local authority',()=>{
    expectCompleteBindings(home('spec-category-nav'),'commerce.collection-navigation');
    expectCompleteBindings(home('spec-use-case-nav'),'guided.attribute-navigation');
    expectCompleteBindings(home('spec-compare-spotlight'),'commerce.compare-spotlight');
    expectCompleteBindings(home('spec-tech-finder'),'guided.finder');
    expectCompleteBindings(nodeById(SPEC_LAB_SEARCH_PAGE,'spec-search-guided-results'),'guided.results');
    expectCompleteBindings(home('spec-builder-block'),'configurator.builder');
    expectCompleteBindings(nodeById(SPEC_LAB_CART_PAGE,'spec-cart-config-summary'),'configurator.summary');
    expectCompleteBindings(nodeById(SPEC_LAB_ACCOUNT_PAGE,'spec-account-config-summary'),'configurator.summary');
    expectCompleteBindings(content('spec-content-builder-block'),'configurator.builder');
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.commerceAuthority).toMatchObject({guidedFinder:'E3-guidance-and-ranking-only',configurator:'E5-setup-intent-and-read-model-only',noTemplateGuidanceAuthority:true,noTemplateConfiguratorAuthority:true});
  });

  it('keeps E6/E7 compatibility, specifications and commerce truth under shared authoritative engines',()=>{
    expectCompleteBindings(home('spec-compatibility-status'),'compatibility.status');
    expectCompleteBindings(content('spec-content-compatibility-status'),'compatibility.status');
    expectCompleteBindings(content('spec-content-compatibility-evidence'),'compatibility.evidence');
    expectCompleteBindings(home('spec-system-requirements'),'commerce.key-specs');
    expectCompleteBindings(product('spec-product-info'),'commerce.product-info');
    expectCompleteBindings(product('spec-product-key-specs'),'commerce.key-specs');
    expectCompleteBindings(product('spec-product-compare'),'commerce.compare-button');
    expectCompleteBindings(product('spec-product-spec-groups'),'commerce.specification-groups');
    expectCompleteBindings(product('spec-product-compatibility-evidence'),'compatibility.evidence');
    expect(SPEC_LAB_ENGINE_CONTRACT.compatibilityPrinciples).toEqual({unknownIsCompatible:false,explainable:true,serverFinalValidation:true,noSilentReplacement:true});
    const source=JSON.stringify(SPEC_LAB_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.accessories'])expect(source).toContain(path);
  });

  it('keeps Trade-in and Product 3D as guarded hooks and Tech Magazine as shared E10 presentation',()=>{
    expectCompleteBindings(home('spec-trade-title'),'content.heading');
    expectCompleteBindings(home('spec-trade-copy'),'content.text');
    expectCompleteBindings(home('spec-trade-cta'),'content.button');
    expectCompleteBindings(home('spec-magazine-block'),'editorial.journal-preview');
    expectCompleteBindings(product('spec-product-viewer'),'content.button');
    expect(product('spec-product-viewer')?.bindings?.href?.path).toBe('product.viewerHref');
    expect(home('spec-trade-cta')?.bindings?.href?.path).toBe('commerce.tradeInHref');
    expect(SPEC_LAB_ENGINE_CONTRACT.integrationHooks.tradeIn).toContain('no-valuation-authority');
    expect(SPEC_LAB_ENGINE_CONTRACT.integrationHooks.product3dViewer).toContain('no-template-owned-3d-engine');
    expect(SPEC_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.commerceAuthority).toMatchObject({noTemplateTradeInAuthority:true,noTemplate3dAuthority:true});
  });

  it('validates all 14 Alap-compatible Desktop/Tablet/Mobile presets and focused page roles with unique IDs',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:SPEC_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(SPEC_LAB_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(SPEC_LAB_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(SPEC_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const pageType of focusedPages)expect(SPEC_LAB_TEMPLATE_PACKAGE.pages.some(page=>page.pageType===pageType),pageType).toBe(true);
    for(const page of SPEC_LAB_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections); const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('asserts actual PDP geometry and shared product bindings rather than metadata-only responsiveness',()=>{
    expect(product('spec-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('spec-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.builderContract.productGeometry).toEqual({gallery:{desktop:7,tablet:7,mobile:12},buybox:{desktop:5,tablet:5,mobile:12}});
  });

  it('keeps installation draft-only with claim-neutral demo fixtures and no commerce/customer/order/B2B mutation authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:SPEC_LAB_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='tech-spec-lab')).toBe(true);
    expect(JSON.stringify(SPEC_LAB_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/compatible.?true|compatibilityStatus|guaranteed|fps|latency.?guarantee|tradeInValue|fixedSetupPrice|fixed price|guaranteed stock/i);
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'tech-spec-lab',demoFixturesNonAuthoritative:true});
  });

  it('preserves provider-neutral E13, inherited Wave 37/56 authority and explicit Wave 75 release boundaries',()=>{
    expect(SPEC_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E5','E6','E7','E10','E13']);
    const checkout=SPEC_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.historicalAcceptance).toBe(SPEC_LAB_WAVE37_ACCEPTANCE.mode);
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.currentBaselineAcceptance).toBe(SPEC_LAB_WAVE56_ACCEPTANCE.mode);
    expect(SPEC_LAB_BUILDER_HARDENING_CONTRACT.hierarchy).toBe('template-page-presets-section-presets-components');
    expect(SPEC_LAB_WAVE75_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','page-schema-allowlist-widening','payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','storefront-revision-reconciliation','main-rebase','main-merge','wave76-implementation']));
  });
});
