import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {listStorefrontManagedConfigKeys} from '@/lib/builder/storefront-managed-config';
import {STOREFRONT_PAGE_SCHEMA_VERSION} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,
  STOREFRONT_TEMPLATE_LAUNCH_TARGET,
  STOREFRONT_TEMPLATE_PORTFOLIO_STATUS,
} from '@/lib/builder/storefront-template-catalog';
import {STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY} from '@/lib/builder/storefront-template-installation';
import {resolveStorefrontResponsiveOverride,validateStorefrontPageDocument,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES,
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS,
  STOREFRONT_TEMPLATE2_WAVE7_CAPABILITY_MATRIX,
  STOREFRONT_TEMPLATE2_WAVE7_INVENTORY,
  STOREFRONT_TEMPLATE2_WAVE7_PORTFOLIO,
  getStorefrontSpecialCommerceCapabilityRequirement,
} from '@/lib/builder/storefront-special-commerce-template2-adoption';
import {COMPATIBILITY_AUTHORITY_CONTRACT,evaluateCompatibility} from '@/lib/commerce/compatibility-engine';
import {INTERACTIVE_SCENE_COMMERCE_AUTHORITY} from '@/lib/commerce/interactive-scene';
import {RECIPE_COMMERCE_AUTHORITY} from '@/lib/commerce/recipe-commerce';
import {RELEASE_COMMERCE_AUTHORITY} from '@/lib/commerce/release-commerce';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const walk=(nodes:readonly {componentKey:string;children?:readonly any[]}[],out:string[]=[])=>{for(const node of nodes){out.push(node.componentKey);walk(node.children??[],out);}return out;};

function pageFor(componentKey:string,pageType:StorefrontPageDocument['pageType']):StorefrontPageDocument{
  return{schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey:`wave7-${componentKey.replace(/\./g,'-')}`,pageType,templateKey:'wave7.acceptance',templateVersion:1,sections:[{id:'wave7-section',componentKey,componentVersion:1,config:{}}]};
}

describe('Special Commerce Wave 7 Template 2.0 adoption',()=>{
  it('derives a machine-verifiable inventory from the real source-controlled catalog and never fabricates the 42 target',()=>{
    expect(STOREFRONT_TEMPLATE_LAUNCH_TARGET).toBe(42);
    expect(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES).toHaveLength(24);
    expect(STOREFRONT_TEMPLATE2_WAVE7_INVENTORY).toHaveLength(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.length);
    expect(STOREFRONT_TEMPLATE2_WAVE7_PORTFOLIO.actualTemplateCount).toBe(24);
    expect(STOREFRONT_TEMPLATE2_WAVE7_PORTFOLIO.remainingTemplateGap).toBe(18);
    expect(STOREFRONT_TEMPLATE2_WAVE7_PORTFOLIO.full42ClosurePossible).toBe(false);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.fabricatedEntriesAllowed).toBe(false);
    expect(new Set(STOREFRONT_TEMPLATE2_WAVE7_INVENTORY.map(item=>`${item.templateKey}@${item.templateVersion}`)).size).toBe(24);
  });

  it('keeps every actual template on one Page Schema and one shared Builder/runtime contract',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    for(const template of STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES){
      expect(template.manifest.pageSchemaVersion,template.manifest.templateKey).toBe(STOREFRONT_PAGE_SCHEMA_VERSION);
      expect(template.pages).toHaveLength(template.manifest.pageTypes.length);
      for(const page of template.pages){
        expect(page.schemaVersion).toBe(STOREFRONT_PAGE_SCHEMA_VERSION);
        expect(page.templateKey).toBe(template.manifest.templateKey);
        expect(page.templateVersion).toBe(template.manifest.templateVersion);
        for(const key of walk(page.sections))expect(registry.get(key,1),`${template.manifest.templateKey}:${key}`).toBeDefined();
      }
    }
  });

  it('maps exactly the actual portfolio and references only production Builder/renderer component keys',()=>{
    const components=createStorefrontVisualBuilderComponentRegistry();
    const renderers=createStorefrontVisualBuilderRendererRegistry();
    const catalogKeys=[...STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.map(template=>template.manifest.templateKey)].sort();
    const matrixKeys=[...STOREFRONT_TEMPLATE2_WAVE7_CAPABILITY_MATRIX.map(row=>row.templateKey)].sort();
    expect(matrixKeys).toEqual(catalogKeys);
    for(const row of STOREFRONT_TEMPLATE2_WAVE7_CAPABILITY_MATRIX){
      for(const capability of STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES){
        const status=row.capabilities[capability];
        expect(['required','supported','optional','not applicable']).toContain(status);
        if(status==='not applicable')continue;
        for(const componentKey of STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS[capability]){
          const definition=components.get(componentKey,1);
          expect(definition,`${row.templateKey}:${capability}:${componentKey}:builder`).toBeDefined();
          expect(renderers.get(componentKey,1),`${row.templateKey}:${capability}:${componentKey}:renderer`).toBeDefined();
          expect(definition?.manifest.pageTypes.some(pageType=>row.pageTypes.includes(pageType)),`${row.templateKey}:${componentKey}:page-type`).toBe(true);
        }
      }
    }
  });

  it('inherits Alap/Pro entitlement truth from real component manifests and fails closed when a required feature or plan is absent',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    for(const capability of STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES){
      const requirement=getStorefrontSpecialCommerceCapabilityRequirement(capability);
      for(const componentKey of requirement.componentKeys){
        const definition=registry.get(componentKey,1);expect(definition).toBeDefined();if(!definition)continue;
        const pageType=definition.manifest.pageTypes[0]!;
        const full=validateStorefrontPageDocument(pageFor(componentKey,pageType),registry,{plan:definition.manifest.capability.minPlan,features:definition.manifest.capability.features});
        expect(full.ok,`${componentKey}:full`).toBe(true);
        if(definition.manifest.capability.features.length){
          const missing=validateStorefrontPageDocument(pageFor(componentKey,pageType),registry,{plan:definition.manifest.capability.minPlan,features:[]});
          expect(missing.violations.some(item=>item.code==='COMPONENT_CAPABILITY_REQUIRED'),`${componentKey}:missing-feature`).toBe(true);
        }
        if(definition.manifest.capability.minPlan==='pro'){
          const base=validateStorefrontPageDocument(pageFor(componentKey,pageType),registry,{plan:'alap',features:definition.manifest.capability.features});
          expect(base.violations.some(item=>item.code==='COMPONENT_CAPABILITY_REQUIRED'),`${componentKey}:base-plan`).toBe(true);
        }
      }
    }
  });

  it('keeps Special Commerce selectors merchant-managed, avoids a raw JSON authoring contract, and preserves managed-config isolation',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const selectorComponents=['commerce.interactive-scene','commerce.recipe','commerce.release','guided.finder','composer.builder','configurator.builder','compatibility.status'];
    for(const componentKey of selectorComponents){
      const definition=registry.get(componentKey,1);expect(definition).toBeDefined();if(!definition)continue;
      expect(definition.manifest.configurable).not.toContain('engineConfigs');
      expect(definition.manifest.configurable).not.toContain('catalog');
      for(const key of listStorefrontManagedConfigKeys(componentKey))expect(definition.manifest.configurable).not.toContain(key);
    }
  });

  it('keeps template switching data-only, stable-section, draft-isolated and outside commerce authority',()=>{
    expect(STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,content:false});
    for(const template of STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES){
      for(const page of template.pages){
        const ids:string[]=[];const collect=(nodes:readonly any[])=>{for(const node of nodes){ids.push(node.id);collect(node.children??[]);}};collect(page.sections);
        expect(new Set(ids).size,`${template.manifest.templateKey}:${page.pageKey}:stable-ids`).toBe(ids.length);
      }
    }
    expect(read('src/lib/builder/storefront-template-installation.ts')).not.toContain('price =');
    expect(read('src/lib/builder/storefront-template-installation.ts')).not.toContain('stock =');
  });

  it('uses isolated D/T/M responsive overrides and explicit compatibility evidence fail-closed contract',()=>{
    const node={id:'responsive',componentKey:'commerce.interactive-scene',componentVersion:1,config:{},responsive:{desktop:{gridSpan:10 as const},tablet:{hidden:true},mobile:{gridSpan:6 as const}}};
    expect(resolveStorefrontResponsiveOverride(node,'desktop')).toEqual({hidden:false,gridSpan:10});
    expect(resolveStorefrontResponsiveOverride(node,'tablet')).toEqual({hidden:true,gridSpan:12});
    expect(resolveStorefrontResponsiveOverride(node,'mobile')).toEqual({hidden:false,gridSpan:6});
    expect(COMPATIBILITY_AUTHORITY_CONTRACT.unknownCountsAsCompatible).toBe(false);
    expect(evaluateCompatibility({rules:[],parts:[]})?.status).toBe('unknown');
  });

  it('preserves shared catalog, cart/checkout, Product Media and non-authority boundaries without template-local engines',()=>{
    expect(Object.values(INTERACTIVE_SCENE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);
    expect(Object.values(RECIPE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);
    expect(Object.values(RELEASE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);
    const runtimeSource=read('src/lib/builder/storefront-runtime-source.ts');
    const builderServer=read('src/lib/builder/storefront-builder-server.ts');
    const existingServer=read('src/lib/builder/storefront-existing-commerce-server.ts');
    const checkout=read('src/lib/orders/tenant-checkout.ts');
    expect(runtimeSource).toContain('scenePromise=getStorefrontInteractiveSceneCatalogForInstance(instanceId)');
    expect(runtimeSource).toContain('getStorefrontExistingCommerceBundleForInstance(instanceId,scenePromise)');
    expect(builderServer).toContain('getStorefrontExistingCommerceBundleForInstance(instance.id,sceneCatalog)');
    expect(existingServer).toContain('sharedSceneCatalog?:StorefrontInteractiveSceneCatalog|Promise<StorefrontInteractiveSceneCatalog>');
    expect(checkout).toContain('place_order_provider_v6_idempotent');
    expect(checkout).not.toContain('templateKey');
    const allTemplateKeys=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.map(template=>template.manifest.templateKey);
    for(const key of allTemplateKeys){expect(runtimeSource).not.toContain(`'${key}'`);expect(existingServer).not.toContain(`'${key}'`);expect(checkout).not.toContain(`'${key}'`);}
    const usedMediaKeys=new Set(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.flatMap(template=>template.pages.flatMap(page=>walk(page.sections))).filter(key=>key.includes('image')||key.includes('media')||key.includes('gallery')));
    for(const key of usedMediaKeys)expect(createStorefrontVisualBuilderComponentRegistry().get(key,1),`shared-media:${key}`).toBeDefined();
  });

  it('retains security, bounded-input, safe-link and accessibility ownership in the shared Wave 6 production engines',()=>{
    const wave6=read('tests/special-commerce-wave6-cross-engine-acceptance.test.ts');
    expect(wave6).toContain("isAllowedStorefrontBindingPath('commerce.__proto__.polluted')");
    expect(wave6).toContain('validateInteractiveSceneConfig');
    expect(wave6).toContain('clientClockCanUnlockCommerce:false');
    expect(wave6).toContain('place_order_provider_v6_idempotent');
    const renderers=[
      read('src/components/builder/storefront-interactive-scene.tsx'),
      read('src/components/builder/storefront-recipe-commerce.tsx'),
      read('src/components/builder/storefront-release-commerce.tsx'),
      read('src/components/builder/storefront-existing-commerce-runtime.tsx'),
    ].join('\n');
    expect(renderers).toMatch(/aria-|role=|<button|<select|<input/);
  });
});
