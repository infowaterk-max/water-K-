import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-commerce';
import {STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS,createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-editorial';
import {STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-guided-finder';
import {STOREFRONT_PRIMITIVE_DEFINITIONS} from '@/lib/builder/storefront-primitives';
import {STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-structured-product';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {TABLE_GIFT_VISUAL_DNA} from '@/lib/builder/templates/table-gift';
import {SPEC_LAB_VISUAL_DNA} from '@/lib/builder/templates/spec-lab';
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
import {CREATOR_STATION_WAVE55_ACCEPTANCE} from '@/lib/builder/templates/creator-station-wave55-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const home=(id:string)=>nodeById(CREATOR_STATION_HOME_PAGE,id);
const product=(id:string)=>nodeById(CREATOR_STATION_PRODUCT_PAGE,id);
const content=(id:string)=>nodeById(CREATOR_STATION_CONTENT_PAGE,id);
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
const expectCompleteBindings=(target:StorefrontComponentNode|undefined,componentKey:string)=>{
  expect(target?.componentKey).toBe(componentKey);
  expect(Object.keys(target?.bindings??{}).sort()).toEqual([...bindingSlots(componentKey)].sort());
};

describe('Scale-out Wave 55 Creator Station current-baseline reacceptance',()=>{
  it('reconstructs historical Wave 36 / PR #198 and original Wave 17 / PR #140 directly after Table & Gift',()=>{
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE).toMatchObject({
      wave:55,historicalCounterpartWave:36,historicalPullRequest:198,originalTemplateWave:17,originalTemplatePullRequest:140,
      historicalAcceptance:CREATOR_STATION_WAVE36_ACCEPTANCE.mode,mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'tech.creator-station',templateVersion:1,inheritedImplementation:true,
    });
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.sequence).toEqual({
      previous:'wave54-food.table-gift',current:'tech.creator-station',historicalNext:'wave37-tech.spec-lab',
      originalPrevious:'wave16-food.table-gift',originalCurrent:'wave17-tech.creator-station',originalNext:'wave18-tech.spec-lab',
      relationship:'historical-wave36-successor-replayed-on-current-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
    expect(CREATOR_STATION_TEMPLATE_MANIFEST.templateKey).toBe('tech.creator-station');
    expect(CREATOR_STATION_TEMPLATE_MANIFEST.demoContent.namespace).toBe('tech-creator-station');
  });

  it('keeps Creator Station visually and structurally distinct from Table & Gift and electronics sibling Spec Lab',()=>{
    expect(CREATOR_STATION_VISUAL_DNA.character).toBe('dark-digital-creator-workflow-commerce');
    expect(CREATOR_STATION_VISUAL_DNA.category).toBe('electronics-tech');
    expect(CREATOR_STATION_VISUAL_DNA.character).not.toBe(TABLE_GIFT_VISUAL_DNA.character);
    expect(CREATOR_STATION_VISUAL_DNA.character).not.toBe(SPEC_LAB_VISUAL_DNA.character);
    expect(CREATOR_STATION_VISUAL_DNA.palette).toMatchObject({background:'deep-graphite-charcoal',surface:'neutral-dark-panels',text:'cool-white',accentPrimary:'controlled-cyan',accentSecondary:'controlled-magenta-violet'});
    expect(CREATOR_STATION_WORKFLOWS).toEqual(['YouTube','Podcast','Stream','Fotó','Short Video','Home Studio']);
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','section-order','workflow-journey','palette','typography','visual-language','creator-imagery']));
  });

  it('preserves the exact accepted nine-step Home journey without a white hero/content block',()=>{
    expect(CREATOR_STATION_HOME_PAGE.metadata?.sectionOrder).toEqual(CREATOR_STATION_HOME_SECTION_ORDER);
    expect(CREATOR_STATION_HOME_SECTION_ORDER).toEqual(['Build Your Workflow','Visual Equipment Chain','Timeline','Setup Scenes','Compatibility Checker','System Requirements','Starter / Advanced / Studio','Creator Magazine','Footer']);
    expect(JSON.stringify(CREATOR_STATION_HOME_PAGE)).not.toMatch(/bright-white|white-background/i);
  });

  it('uses only current shared binding namespaces and preserves the historical workflow/story corrections without widening contracts',()=>{
    const paths=CREATOR_STATION_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('workflow.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('story.'))).toBe(false);
    expect(STOREFRONT_BINDING_NAMESPACES).not.toContain('workflow');
    expect(STOREFRONT_BINDING_NAMESPACES).not.toContain('story');
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false});
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.bindingContract).toMatchObject({workflowState:'shared-configurator-namespace',editorialPresentation:'shared-content-namespace',runtimeAllowlistWidened:false});
  });

  it('keeps complete shared E3 and E5 workflow/configurator surfaces without template-local guidance or setup authority',()=>{
    for(const target of [home('creator-workflow-finder'),content('creator-content-finder-block')])expectCompleteBindings(target,'guided.finder');
    expectCompleteBindings(nodeById(CREATOR_STATION_SEARCH_PAGE,'creator-search-guided-results'),'guided.results');
    expectCompleteBindings(home('equipment-chain'),'configurator.slot-list');
    expectCompleteBindings(home('creator-timeline-flow'),'configurator.performance-targets');
    expectCompleteBindings(home('creator-tier-compare'),'commerce.compare-spotlight');
    expectCompleteBindings(content('creator-builder'),'configurator.builder');
    expectCompleteBindings(nodeById(CREATOR_STATION_CART_PAGE,'creator-cart-config-summary'),'configurator.summary');
    expectCompleteBindings(nodeById(CREATOR_STATION_ACCOUNT_PAGE,'creator-account-config-summary'),'configurator.summary');
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.commerceAuthority).toMatchObject({guidedFinder:'E3-guidance-and-ranking-only',configurator:'E5-setup-intent-and-read-model-only',noTemplateGuidanceAuthority:true,noTemplateConfiguratorAuthority:true});
  });

  it('keeps E6/E7 explainable compatibility and structured product truth under shared authoritative engines',()=>{
    expectCompleteBindings(home('creator-compatibility-status'),'compatibility.status');
    expectCompleteBindings(product('creator-product-compatibility-evidence'),'compatibility.evidence');
    expectCompleteBindings(content('creator-content-compatibility-status'),'compatibility.status');
    expectCompleteBindings(content('creator-content-compatibility-evidence'),'compatibility.evidence');
    expectCompleteBindings(home('creator-system-requirements-block'),'commerce.key-specs');
    expectCompleteBindings(product('creator-product-key-specs'),'commerce.key-specs');
    expectCompleteBindings(product('creator-product-spec-groups'),'commerce.specification-groups');
    expectCompleteBindings(product('creator-product-compare'),'commerce.compare-button');
    expect(CREATOR_STATION_ENGINE_CONTRACT.compatibilityPrinciples).toEqual({unknownIsCompatible:false,explainable:true,serverFinalValidation:true,noSilentReplacement:true});
    const productSource=JSON.stringify(CREATOR_STATION_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','variant.optionOptions','product.keySpecs','product.specGroups','commerce.purchaseHref','recommendations.products'])expect(productSource).toContain(path);
  });

  it('keeps Creator Magazine on shared E10 presentation and merchant-editable design tokens instead of baked marketing imagery',()=>{
    expectCompleteBindings(home('creator-magazine-index'),'editorial.journal-preview');
    const magazine=JSON.stringify(home('creator-magazine-index')?.bindings??{});
    expect(magazine).toContain('content.creatorMagazine.title');
    expect(magazine).toContain('content.creatorMagazine.items');
    expect(CREATOR_STATION_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(CREATOR_STATION_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(CREATOR_STATION_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.builderContract.marketingCopyBakedIntoImages).toBe(false);
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.commerceAuthority.editorial).toBe('E10-editorial-read-model-presentation-only');
  });

  it('keeps stable unique node IDs and all 14 Alap-compatible Desktop/Tablet/Mobile Page Schema presets',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:CREATOR_STATION_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(CREATOR_STATION_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(CREATOR_STATION_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(CREATOR_STATION_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of CREATOR_STATION_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps installation draft-only and template switching unable to mutate commerce, customer, order or B2B authority',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:CREATOR_STATION_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='tech-creator-station')).toBe(true);
    expect(JSON.stringify(CREATOR_STATION_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/compatible.?true|compatibilityStatus|guaranteed|fps|latency.?guarantee|fixedSetupPrice|fixed price|guaranteed stock/i);
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'tech-creator-station'});
  });

  it('preserves provider-neutral E13 and inherited Wave 36 authority while excluding SQL, production, payment, main merge and Wave 56',()=>{
    expect(CREATOR_STATION_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E5','E6','E7','E10','E13']);
    expect(CREATOR_STATION_BUILDER_HARDENING_CONTRACT.hierarchy).toBe('template-page-presets-section-presets-components');
    const checkout=CREATOR_STATION_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.commerceAuthority).toMatchObject({pricing:'shared-commerce-binding-only',inventory:'shared-commerce-binding-only',variants:'shared-commerce-binding-only',checkout:'shared-provider-neutral-E13',noTemplateVariantAuthority:true,noTemplatePaymentAuthority:true});
    expect(CREATOR_STATION_WAVE55_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','visual-builder-roadmap-expansion',
      'payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','tenant-status-change','tenant-plan-change','main-merge','wave56-implementation',
    ]));
  });
});
