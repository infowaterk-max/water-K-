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
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const definitions=[...STOREFRONT_PRIMITIVE_DEFINITIONS,...STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS,...STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS,...STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS,...STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS,...STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS];
const bindingSlots=(componentKey:string)=>definitions.find(definition=>definition.manifest.componentKey===componentKey)?.bindingSlots??[];
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const expectCompleteBindings=(target:StorefrontComponentNode|undefined,componentKey:string)=>{expect(target?.componentKey).toBe(componentKey);expect(Object.keys(target?.bindings??{}).sort()).toEqual([...bindingSlots(componentKey)].sort());};
const home=(id:string)=>nodeById(SPEC_LAB_HOME_PAGE,id);
const product=(id:string)=>nodeById(SPEC_LAB_PRODUCT_PAGE,id);
const content=(id:string)=>nodeById(SPEC_LAB_CONTENT_PAGE,id);

const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];

describe('Scale-out Wave 37 Spec Lab current-baseline reacceptance',()=>{
  it('re-accepts original Wave 18 Spec Lab directly after Creator Station with the canonical identity and shared engine contract',()=>{
    expect(SPEC_LAB_WAVE37_ACCEPTANCE).toMatchObject({wave:37,historicalWave:18,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'tech.spec-lab',templateVersion:1,legacyWorkingName:'Tech Command',inheritedImplementation:true});
    expect(SPEC_LAB_WAVE37_ACCEPTANCE.historicalSequence).toEqual({previous:'tech.creator-station',current:'tech.spec-lab',relationship:'original-wave18-directly-on-creator-station'});
    expect(SPEC_LAB_TEMPLATE_MANIFEST.templateKey).toBe('tech.spec-lab');
    expect(SPEC_LAB_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(SPEC_LAB_TEMPLATE_MANIFEST.demoContent.namespace).toBe('tech-spec-lab');
    expect(SPEC_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E5','E6','E7','E10','E13']);
    expect(SPEC_LAB_LEGACY_WORKING_NAME).toBe('Tech Command');
  });

  it('locks the specialist decision-lab identity, exact decision path and exact eleven-step Home composition',()=>{
    expect(SPEC_LAB_VISUAL_DNA.character).toBe('dark-navy-specialist-tech-decision-lab');
    expect(SPEC_LAB_VISUAL_DNA.category).toBe('electronics-tech');
    expect(SPEC_LAB_VISUAL_DNA.palette).toMatchObject({background:'deep-navy',surface:'technical-navy-panels',accentPrimary:'controlled-orange-ochre',compatible:'signal-green',caution:'amber'});
    expect(SPEC_LAB_DECISION_PATH).toEqual(['Mit keresel?','Mire használod?','Hasonlítsd össze','Tech Finder','Építsd fel a szetted']);
    expect(SPEC_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(SPEC_LAB_HOME_SECTION_ORDER);
    expect(SPEC_LAB_HOME_SECTION_ORDER).toEqual(['Mit keresel?','Mire használod?','Hasonlítsd össze','Tech Finder','Építsd fel a szetted','Compatibility Matrix','System Requirements','Accessory Matcher','Trade-in','Tech Magazine','Footer']);
    expect(JSON.stringify(SPEC_LAB_HOME_PAGE)).not.toMatch(/gamer-rgb|neon-rainbow|white-background/i);
  });

  it('fully binds E2/E3 discovery, comparison and Finder surfaces while keeping eligibility outside the template',()=>{
    expectCompleteBindings(home('spec-category-nav'),'commerce.collection-navigation');
    expectCompleteBindings(home('spec-use-case-nav'),'guided.attribute-navigation');
    expectCompleteBindings(home('spec-compare-spotlight'),'commerce.compare-spotlight');
    expectCompleteBindings(home('spec-tech-finder'),'guided.finder');
    expectCompleteBindings(nodeById(SPEC_LAB_SEARCH_PAGE,'spec-search-guided-results'),'guided.results');
    const finderSource=JSON.stringify(home('spec-tech-finder')?.bindings??{});
    for(const path of ['content.techFinder.eyebrow','content.techFinder.title','content.techFinder.copy','finder.currentStep.title','finder.currentStep.copy','finder.currentQuestion.label','finder.currentQuestion.options','finder.progressLabel','content.techFinder.actionLabel','finder.resultHref','finder.resultStatus'])expect(finderSource).toContain(path);
    expect(SPEC_LAB_WAVE37_ACCEPTANCE.sharedAuthority.discovery).toBe('E2-only-for-catalog-search-and-channel-eligibility');
    expect(SPEC_LAB_WAVE37_ACCEPTANCE.sharedAuthority.guidedFinder).toBe('E3-guidance-and-ranking-only');
  });

  it('fully binds E5 setup surfaces and E6 compatibility without widening the runtime binding allowlist',()=>{
    expectCompleteBindings(home('spec-builder-block'),'configurator.builder');
    expectCompleteBindings(home('spec-compatibility-status'),'compatibility.status');
    expectCompleteBindings(home('spec-compatibility-evidence'),'compatibility.evidence');
    expectCompleteBindings(nodeById(SPEC_LAB_CART_PAGE,'spec-cart-config-summary'),'configurator.summary');
    expectCompleteBindings(nodeById(SPEC_LAB_ACCOUNT_PAGE,'spec-account-config-summary'),'configurator.summary');
    expectCompleteBindings(content('spec-content-builder-block'),'configurator.builder');
    expectCompleteBindings(content('spec-content-compatibility-status'),'compatibility.status');
    expectCompleteBindings(content('spec-content-compatibility-evidence'),'compatibility.evidence');
    expect(SPEC_LAB_ENGINE_CONTRACT.compatibilityPrinciples).toEqual({unknownIsCompatible:false,explainable:true,serverFinalValidation:true,noSilentReplacement:true});
    expect(SPEC_LAB_BUILDER_HARDENING_CONTRACT.runtimeAllowlistWidened).toBe(false);
    expect(STOREFRONT_BINDING_NAMESPACES).not.toContain('system');
    expect(STOREFRONT_BINDING_NAMESPACES).not.toContain('story');
  });

  it('keeps E7 structured product truth, compare, price, stock and variants on shared authoritative bindings',()=>{
    expectCompleteBindings(home('spec-system-requirements'),'commerce.key-specs');
    expectCompleteBindings(product('spec-product-info'),'commerce.product-info');
    expectCompleteBindings(product('spec-product-key-specs'),'commerce.key-specs');
    expectCompleteBindings(product('spec-product-compare'),'commerce.compare-button');
    expectCompleteBindings(product('spec-product-spec-groups'),'commerce.specification-groups');
    expectCompleteBindings(product('spec-product-compatibility-status'),'compatibility.status');
    expectCompleteBindings(product('spec-product-compatibility-evidence'),'compatibility.evidence');
    expectCompleteBindings(nodeById(SPEC_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!,'spec-catalog-facets'),'commerce.catalog-facets');
    const source=JSON.stringify(SPEC_LAB_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.accessories'])expect(source).toContain(path);
    expect(SPEC_LAB_WAVE37_ACCEPTANCE.sharedAuthority).toMatchObject({structuredProduct:'E7-authoritative-specification-and-comparison-read-models-only',pricing:'shared-commerce-binding-only',inventory:'shared-commerce-binding-only',variants:'shared-commerce-binding-only'});
  });

  it('keeps Trade-in and 3D viewer as guarded integration hooks and E10 Magazine as content read-model presentation',()=>{
    expectCompleteBindings(home('spec-trade-title'),'content.heading');
    expectCompleteBindings(home('spec-trade-copy'),'content.text');
    expectCompleteBindings(home('spec-trade-cta'),'content.button');
    expectCompleteBindings(home('spec-magazine-block'),'editorial.journal-preview');
    expectCompleteBindings(product('spec-product-viewer'),'content.button');
    expect(product('spec-product-viewer')?.bindings?.href?.path).toBe('product.viewerHref');
    expect(home('spec-trade-cta')?.bindings?.href?.path).toBe('commerce.tradeInHref');
    expect(SPEC_LAB_ENGINE_CONTRACT.integrationHooks.tradeIn).toContain('no-valuation-authority');
    expect(SPEC_LAB_ENGINE_CONTRACT.integrationHooks.product3dViewer).toContain('no-template-owned-3d-engine');
    expect(SPEC_LAB_WAVE37_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['trade-in-valuation-authority','trade-in-persistence','template-owned-3d-engine']));
  });

  it('keeps every template binding inside the existing shared namespaces and preserves complete Builder-editable presentation slots',()=>{
    const paths=SPEC_LAB_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    for(const path of paths){const namespace=path.split('.')[0];expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);}
    expect(paths.some(path=>path.startsWith('system.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('story.'))).toBe(false);
    expect(paths).toEqual(expect.arrayContaining(['product.systemRequirements','content.techMagazineItems','commerce.compareProducts','finder.currentStep.title','configurator.slots','compatibility.status']));
  });

  it('preserves stable node identity, all 14 Alap page presets, shared tokens and Desktop/Tablet/Mobile validation',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:SPEC_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(SPEC_LAB_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(SPEC_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of SPEC_LAB_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);const ids=nodes.map(node=>node.id);expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
      if(['blog-index','blog-article','faq','contact','legal','not-found'].includes(page.pageType)){
        expect(nodes.find(node=>node.componentKey==='content.heading')?.bindings?.text?.path).toBe(`content.${page.pageType}.title`);
        expect(nodes.find(node=>node.componentKey==='content.text')?.bindings?.text?.path).toBe(`content.${page.pageType}.copy`);
      }
    }
    expect(SPEC_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(SPEC_LAB_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(SPEC_LAB_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
  });

  it('preserves PDP 7/5 to 12/12 responsiveness, draft-only installation and claim-neutral demo fixtures',()=>{
    expect(product('spec-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('spec-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const plan=planStorefrontTemplateInstallation({template:SPEC_LAB_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='tech-spec-lab')).toBe(true);
    expect(JSON.stringify(SPEC_LAB_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/compatible.?true|compatibilityStatus|guaranteed|fps|latency.?guarantee|tradeInValue|fixedSetupPrice|fixed price|guaranteed stock/i);
  });

  it('keeps checkout provider-neutral E13 and Wave 37 free of SQL, production, payment, main-merge or Visual Builder side effects',()=>{
    const checkout=SPEC_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(SPEC_LAB_WAVE37_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','visual-builder-drag-drop-ui']));
  });
});
