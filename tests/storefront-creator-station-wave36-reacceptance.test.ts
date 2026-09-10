import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-commerce';
import {STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS,createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-editorial';
import {STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-guided-finder';
import {STOREFRONT_PRIMITIVE_DEFINITIONS} from '@/lib/builder/storefront-primitives';
import {STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-structured-product';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  CREATOR_STATION_ACCOUNT_PAGE,
  CREATOR_STATION_BUILDER_HARDENING_CONTRACT,
  CREATOR_STATION_CART_PAGE,
  CREATOR_STATION_CONTENT_PAGE,
  CREATOR_STATION_DESIGN_TOKENS,
  CREATOR_STATION_ENGINE_CONTRACT,
  CREATOR_STATION_HOME_PAGE,
  CREATOR_STATION_HOME_SECTION_ORDER,
  CREATOR_STATION_PRODUCT_PAGE,
  CREATOR_STATION_SEARCH_PAGE,
  CREATOR_STATION_TEMPLATE_MANIFEST,
  CREATOR_STATION_TEMPLATE_PACKAGE,
  CREATOR_STATION_VISUAL_DNA,
  CREATOR_STATION_WORKFLOWS,
} from '@/lib/builder/templates/creator-station';
import {CREATOR_STATION_WAVE36_ACCEPTANCE} from '@/lib/builder/templates/creator-station-wave36-acceptance';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const definitions=[
  ...STOREFRONT_PRIMITIVE_DEFINITIONS,
  ...STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS,
  ...STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS,
  ...STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS,
  ...STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS,
  ...STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS,
];
const bindingSlots=(componentKey:string)=>definitions.find(definition=>definition.manifest.componentKey===componentKey)?.bindingSlots??[];
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

const home=(id:string)=>nodeById(CREATOR_STATION_HOME_PAGE,id);
const product=(id:string)=>nodeById(CREATOR_STATION_PRODUCT_PAGE,id);
const content=(id:string)=>nodeById(CREATOR_STATION_CONTENT_PAGE,id);

const expectCompleteBindings=(target:StorefrontComponentNode|undefined,componentKey:string)=>{
  expect(target?.componentKey).toBe(componentKey);
  expect(Object.keys(target?.bindings??{}).sort()).toEqual([...bindingSlots(componentKey)].sort());
};

describe('Scale-out Wave 36 Creator Station current-baseline reacceptance',()=>{
  it('re-accepts the inherited canonical Creator Station v1 with the exact historical shared-engine contract',()=>{
    expect(CREATOR_STATION_WAVE36_ACCEPTANCE).toMatchObject({wave:36,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'tech.creator-station',templateVersion:1,inheritedImplementation:true});
    expect(CREATOR_STATION_TEMPLATE_MANIFEST.templateKey).toBe('tech.creator-station');
    expect(CREATOR_STATION_TEMPLATE_MANIFEST.demoContent.namespace).toBe('tech-creator-station');
    expect(CREATOR_STATION_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(CREATOR_STATION_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E5','E6','E7','E10','E13']);
    expect(CREATOR_STATION_WAVE36_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['second-creator-station-template','template-local-workflow-engine','runtime-binding-allowlist-widening']));
  });

  it('locks the accepted dark creator-workflow identity and exact nine-step Home journey without a white hero block',()=>{
    expect(CREATOR_STATION_VISUAL_DNA.character).toBe('dark-digital-creator-workflow-commerce');
    expect(CREATOR_STATION_VISUAL_DNA.category).toBe('electronics-tech');
    expect(CREATOR_STATION_VISUAL_DNA.palette).toMatchObject({background:'deep-graphite-charcoal',surface:'neutral-dark-panels',text:'cool-white',accentPrimary:'controlled-cyan',accentSecondary:'controlled-magenta-violet'});
    expect(CREATOR_STATION_WORKFLOWS).toEqual(['YouTube','Podcast','Stream','Fotó','Short Video','Home Studio']);
    expect(CREATOR_STATION_HOME_PAGE.metadata?.sectionOrder).toEqual(CREATOR_STATION_HOME_SECTION_ORDER);
    expect(CREATOR_STATION_HOME_SECTION_ORDER).toEqual(['Build Your Workflow','Visual Equipment Chain','Timeline','Setup Scenes','Compatibility Checker','System Requirements','Starter / Advanced / Studio','Creator Magazine','Footer']);
    expect(JSON.stringify(CREATOR_STATION_HOME_PAGE)).not.toMatch(/bright-white|white-background/i);
  });

  it('fully binds both E3 Finder surfaces and search explanation without moving product eligibility into the template',()=>{
    for(const target of [home('creator-workflow-finder'),content('creator-content-finder-block')])expectCompleteBindings(target,'guided.finder');
    expectCompleteBindings(nodeById(CREATOR_STATION_SEARCH_PAGE,'creator-search-guided-results'),'guided.results');
    const homeSource=JSON.stringify(home('creator-workflow-finder')?.bindings??{});
    for(const path of ['content.buildYourWorkflow.eyebrow','content.buildYourWorkflow.title','content.buildYourWorkflow.copy','finder.currentStep.title','finder.currentStep.copy','finder.currentQuestion.label','finder.currentQuestion.options','finder.progressLabel','content.buildYourWorkflow.actionLabel','finder.resultHref','finder.resultStatus'])expect(homeSource).toContain(path);
    expect(CREATOR_STATION_WAVE36_ACCEPTANCE.commerceAuthority.guidedFinder).toBe('E3-guidance-and-ranking-only');
    expect(CREATOR_STATION_WAVE36_ACCEPTANCE.commerceAuthority.discovery).toBe('E2-only-for-catalog-and-channel-eligibility');
  });

  it('fully binds E5 workflow/configurator surfaces and corrects inherited workflow.* paths without widening runtime namespaces',()=>{
    expectCompleteBindings(home('equipment-chain'),'configurator.slot-list');
    expectCompleteBindings(home('creator-timeline-flow'),'configurator.performance-targets');
    expectCompleteBindings(home('creator-tier-compare'),'commerce.compare-spotlight');
    expectCompleteBindings(content('creator-builder'),'configurator.builder');
    expectCompleteBindings(nodeById(CREATOR_STATION_CART_PAGE,'creator-cart-config-summary'),'configurator.summary');
    expectCompleteBindings(nodeById(CREATOR_STATION_ACCOUNT_PAGE,'creator-account-config-summary'),'configurator.summary');
    const packagePaths=CREATOR_STATION_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(packagePaths.some(path=>path.startsWith('workflow.'))).toBe(false);
    expect(packagePaths).toEqual(expect.arrayContaining(['configurator.timeline','configurator.systemRequirements','configurator.tiers.products','configurator.tiers.rows','configurator.tiers.compareHref']));
    expect(STOREFRONT_BINDING_NAMESPACES).not.toContain('workflow');
    expect(CREATOR_STATION_BUILDER_HARDENING_CONTRACT.workflowStateNamespace).toBe('configurator');
  });

  it('keeps E6 compatibility explainable and Unknown non-compatible across Home, PDP and workflow-builder surfaces',()=>{
    expectCompleteBindings(home('creator-compatibility-status'),'compatibility.status');
    expectCompleteBindings(product('creator-product-compatibility-evidence'),'compatibility.evidence');
    expectCompleteBindings(content('creator-content-compatibility-status'),'compatibility.status');
    expectCompleteBindings(content('creator-content-compatibility-evidence'),'compatibility.evidence');
    expect(CREATOR_STATION_ENGINE_CONTRACT.compatibilityPrinciples).toEqual({unknownIsCompatible:false,explainable:true,serverFinalValidation:true,noSilentReplacement:true});
    expect(CREATOR_STATION_WAVE36_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['fabricated-compatibility','fabricated-performance-guarantee']));
  });

  it('keeps E7 structured-product and compare surfaces complete while price, stock and variants stay on shared authoritative bindings',()=>{
    expectCompleteBindings(home('creator-system-requirements-block'),'commerce.key-specs');
    expectCompleteBindings(product('creator-product-key-specs'),'commerce.key-specs');
    expectCompleteBindings(product('creator-product-spec-groups'),'commerce.specification-groups');
    expectCompleteBindings(product('creator-product-compare'),'commerce.compare-button');
    expectCompleteBindings(nodeById(CREATOR_STATION_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!,'creator-catalog-facets'),'commerce.catalog-facets');
    const productSource=JSON.stringify(CREATOR_STATION_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.products'])expect(productSource).toContain(path);
    expect(CREATOR_STATION_WAVE36_ACCEPTANCE.commerceAuthority).toMatchObject({pricing:'shared-commerce-binding-only',inventory:'shared-commerce-binding-only',variants:'shared-commerce-binding-only'});
  });

  it('binds Creator Magazine through the allowed content namespace while preserving E10 as editorial read-model presentation only',()=>{
    expectCompleteBindings(home('creator-magazine-index'),'editorial.journal-preview');
    const magazine=JSON.stringify(home('creator-magazine-index')?.bindings??{});
    expect(magazine).toContain('content.creatorMagazine.title');
    expect(magazine).toContain('content.creatorMagazine.items');
    const packagePaths=CREATOR_STATION_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(packagePaths.some(path=>path.startsWith('story.'))).toBe(false);
    expect(STOREFRONT_BINDING_NAMESPACES).not.toContain('story');
    expect(CREATOR_STATION_WAVE36_ACCEPTANCE.commerceAuthority.editorial).toBe('E10-editorial-read-model-presentation-only');
  });

  it('keeps stable node identity, all 14 Alap presets, editable simple-page bindings, shared tokens and Desktop/Tablet/Mobile validation',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:CREATOR_STATION_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(CREATOR_STATION_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(CREATOR_STATION_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found']);
    for(const page of CREATOR_STATION_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
      if(['blog-index','blog-article','faq','contact','legal','not-found'].includes(page.pageType)){
        expect(nodes.find(node=>node.componentKey==='content.heading')?.bindings?.text?.path).toBe(`content.${page.pageType}.title`);
        expect(nodes.find(node=>node.componentKey==='content.text')?.bindings?.text?.path).toBe(`content.${page.pageType}.copy`);
      }
    }
    expect(CREATOR_STATION_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(CREATOR_STATION_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(CREATOR_STATION_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
  });

  it('preserves the PDP 7/5 to 12/12 responsive contract plus draft-only installation and claim-neutral demo fixtures',()=>{
    expect(product('creator-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('creator-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expectCompleteBindings(product('creator-product-info'),'commerce.product-info');
    expectCompleteBindings(product('creator-product-recommendations-block'),'commerce.recommendation-row');
    const plan=planStorefrontTemplateInstallation({template:CREATOR_STATION_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='tech-creator-station')).toBe(true);
    expect(JSON.stringify(CREATOR_STATION_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/compatible.?true|compatibilityStatus|guaranteed|fps|latency.?guarantee|fixedSetupPrice|fixed price|guaranteed stock/i);
  });

  it('keeps checkout provider-neutral E13 and Wave 36 free of SQL, production, payment, main-merge or Visual Builder side effects',()=>{
    const checkout=CREATOR_STATION_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(CREATOR_STATION_WAVE36_ACCEPTANCE.bindingCorrection).toMatchObject({runtimeAllowlistWidened:false,workflowState:'shared-configurator-namespace',editorialPresentation:'shared-content-namespace'});
    expect(CREATOR_STATION_WAVE36_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','visual-builder-drag-drop-ui']));
  });
});
