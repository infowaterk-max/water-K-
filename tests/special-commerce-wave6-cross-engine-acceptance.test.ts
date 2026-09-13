import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_SCHEMA_VERSION} from '@/lib/builder/storefront-foundation';
import {createStorefrontVisualBuilderComponentRegistry,STOREFRONT_BUILDER_REGISTRY_VERSION} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry,STOREFRONT_BUILDER_RENDERER_REGISTRY_VERSION} from '@/components/builder/storefront-builder-renderer-registry';
import {isStorefrontManagedConfigKey,listStorefrontManagedConfigKeys,STOREFRONT_MANAGED_CONFIG_VERSION} from '@/lib/builder/storefront-managed-config';
import {isAllowedStorefrontBindingPath,resolveStorefrontResponsiveOverride,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {INTERACTIVE_SCENE_COMMERCE_AUTHORITY,resolveInteractiveScene,validateInteractiveSceneConfig,type InteractiveSceneHotspot} from '@/lib/commerce/interactive-scene';
import {RECIPE_COMMERCE_AUTHORITY,validateRecipeDefinition,type RecipeDefinition} from '@/lib/commerce/recipe-commerce';
import {RELEASE_COMMERCE_AUTHORITY,validateReleaseCommerceDefinition,type ReleaseCommerceDefinition} from '@/lib/commerce/release-commerce';
import {validateGuidedFinderConfig,type GuidedFinderConfig} from '@/lib/commerce/guided-finder';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const acceptedRuntimeKeys=[
  'commerce.interactive-scene','commerce.recipe','commerce.release',
  'guided.finder','guided.results','guided.explanation',
  'composer.builder','configurator.builder','configurator.slot-list','compatibility.status','compatibility.evidence',
  'commerce.key-specs','commerce.specification-groups','commerce.compare-button','commerce.compare-tray','commerce.compare-table',
] as const;
const managedSelectors:Readonly<Record<string,readonly string[]>>={
  'commerce.interactive-scene':['sceneKey','sceneKind','hotspots','showSetSummary','setTitle','setCtaLabel','setCtaHref','hotspotStyle'],
  'commerce.recipe':['recipeKey','defaultServings'],
  'commerce.release':['releaseKey','showCountdown','showStockCount'],
  'guided.finder':['finderKey'],'guided.results':['finderKey'],'guided.explanation':['finderKey'],
  'composer.builder':['composerKey'],'configurator.builder':['configuratorKey'],'configurator.slot-list':['configuratorKey'],
  'compatibility.status':['configuratorKey'],'compatibility.evidence':['configuratorKey'],
};
const pageFor=(componentKey:string):StorefrontPageDocument=>({schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey:`wave6-${componentKey.replace(/\./g,'-')}`,pageType:'home',templateKey:'wave6-acceptance',templateVersion:1,sections:[{id:'accepted',componentKey,componentVersion:1,config:{}}]});

describe('Special Commerce Wave 6 cross-engine acceptance',()=>{
  it('keeps every accepted launch component in the real Builder and renderer registries',()=>{
    const components=createStorefrontVisualBuilderComponentRegistry(),renderers=createStorefrontVisualBuilderRendererRegistry();
    expect(STOREFRONT_BUILDER_REGISTRY_VERSION).toBe('shoporation.storefront-builder-registry.special-commerce-v5');
    expect(STOREFRONT_BUILDER_RENDERER_REGISTRY_VERSION).toBe('shoporation.storefront-builder-renderers.special-commerce-v5');
    for(const key of acceptedRuntimeKeys){expect(components.get(key,1),`${key} component`).toBeDefined();expect(renderers.get(key,1),`${key} renderer`).toBeDefined();}
  });

  it('fails closed on runtime capabilities and accepts exactly the manifest-declared capability set',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    for(const key of acceptedRuntimeKeys){
      const definition=registry.get(key,1);expect(definition).toBeDefined();if(!definition)continue;
      const requirement=definition.manifest.capability;
      const page=pageFor(key);page.pageType=definition.manifest.pageTypes[0];
      expect(validateStorefrontPageDocument(page,registry,{plan:requirement.minPlan,features:requirement.features}).ok,`${key} full capability`).toBe(true);
      expect(validateStorefrontPageDocument(page,registry,{plan:requirement.minPlan,features:[]}).violations.some(v=>v.code==='COMPONENT_CAPABILITY_REQUIRED'),`${key} missing feature`).toBe(true);
      if(requirement.minPlan==='pro')expect(validateStorefrontPageDocument(page,registry,{plan:'alap',features:requirement.features}).violations.some(v=>v.code==='COMPONENT_CAPABILITY_REQUIRED'),`${key} plan gate`).toBe(true);
    }
  });

  it('keeps engine selectors runtime-managed and out of generic structured editing',()=>{
    expect(STOREFRONT_MANAGED_CONFIG_VERSION).toBe('shoporation.storefront-managed-config.v5');
    const registry=createStorefrontVisualBuilderComponentRegistry();
    for(const[key,selectors]of Object.entries(managedSelectors)){
      const definition=registry.get(key,1);expect(definition).toBeDefined();if(!definition)continue;
      expect(listStorefrontManagedConfigKeys(key).sort()).toEqual([...selectors].sort());
      for(const selector of selectors){expect(isStorefrontManagedConfigKey(key,selector)).toBe(true);expect(definition.manifest.configurable).not.toContain(selector);}
    }
  });

  it('uses one responsive inheritance and binding-security contract across engines',()=>{
    const node:StorefrontComponentNode={id:'responsive',componentKey:'commerce.release',componentVersion:1,config:{},responsive:{desktop:{gridSpan:10},tablet:{hidden:true},mobile:{gridSpan:6}}};
    expect(resolveStorefrontResponsiveOverride(node,'desktop')).toEqual({hidden:false,gridSpan:10});
    expect(resolveStorefrontResponsiveOverride(node,'tablet')).toEqual({hidden:true,gridSpan:10});
    expect(resolveStorefrontResponsiveOverride(node,'mobile')).toEqual({hidden:true,gridSpan:6});
    expect(isAllowedStorefrontBindingPath('commerce.releases')).toBe(true);
    expect(isAllowedStorefrontBindingPath('catalog.existingCommerceProducts')).toBe(true);
    expect(isAllowedStorefrontBindingPath('commerce.__proto__.polluted')).toBe(false);
    expect(isAllowedStorefrontBindingPath('catalog.constructor.prototype')).toBe(false);
  });

  it('keeps Special Commerce engines non-authoritative for pricing, stock and transaction ownership',()=>{
    expect(Object.values(INTERACTIVE_SCENE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);
    expect(Object.values(RECIPE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);
    expect(Object.values(RELEASE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);
    const runtime=read('src/components/builder/storefront-runtime-renderer.tsx');
    for(const key of ['guided.finder','guided.results','guided.explanation','composer.builder','configurator.builder','configurator.slot-list','compatibility.status','compatibility.evidence'])expect(runtime).toContain(`case'${key}'`);
    const server=read('src/lib/builder/storefront-existing-commerce-server.ts');
    expect(server).toContain('getStorefrontInteractiveSceneCatalogForInstance');
    expect(server).not.toContain('gross_price_huf');
    expect(read('src/app/api/checkout/quote/route.ts')).not.toContain('commerceGroups');
  });

  it('enforces bounded payloads and rejects unsafe interactive links',()=>{
    const hotspot=(index:number):InteractiveSceneHotspot=>({id:`h${index}`,productId:`p${index}`,position:{desktop:{x:50,y:50}}});
    expect(validateInteractiveSceneConfig({sceneKey:'scene',kind:'generic',hotspots:Array.from({length:51},(_,i)=>hotspot(i))})).toContain('INTERACTIVE_SCENE_HOTSPOT_LIMIT_EXCEEDED');
    const scene=resolveInteractiveScene({config:{sceneKey:'scene',kind:'generic',hotspots:[hotspot(1)]},products:[{productId:'p1',label:'Unsafe',href:'javascript:alert(1)',eligible:true}],viewport:'desktop'});
    expect(scene.hotspots).toHaveLength(0);expect(scene.excludedProductIds).toEqual(['p1']);

    const recipe:RecipeDefinition={version:1,tenantId:'tenant',recipeKey:'recipe',title:'Recipe',baseServings:2,minServings:1,maxServings:10,ingredients:Array.from({length:101},(_,i)=>({ingredientId:`i${i}`,label:`Ingredient ${i}`,quantityDisplay:'1 db',commerceMode:'informational' as const})),claims:[]};
    expect(validateRecipeDefinition(recipe).some(v=>v.code==='RECIPE_INGREDIENTS_INVALID')).toBe(true);
    const release:ReleaseCommerceDefinition={version:1,tenantId:'tenant',releaseKey:'drop',title:'Drop',startsAt:'2026-09-13T12:00:00.000Z',active:true,items:Array.from({length:101},(_,i)=>({itemId:`i${i}`,productId:`p${i}`,variantId:`v${i}`}))};
    expect(validateReleaseCommerceDefinition(release).some(v=>v.code==='RELEASE_ITEMS_INVALID')).toBe(true);
    const finder:GuidedFinderConfig={version:1,tenantId:'tenant',finderKey:'finder',label:'Finder',safetyPolicy:'standard',partialPolicy:'zero',maxResults:25,steps:[]};
    expect(validateGuidedFinderConfig(finder).some(v=>v.code==='FINDER_MAX_RESULTS_INVALID')).toBe(true);
  });

  it('keeps anti-fake release and compatibility fail-closed evidence in the shared runtime',()=>{
    const release=read('src/lib/commerce/release-commerce.ts'),compatibility=read('src/lib/commerce/compatibility-engine.ts'),bindings=read('src/lib/builder/storefront-existing-commerce-bindings.ts');
    expect(release).toContain('clientClockCanUnlockCommerce:false');
    expect(release).toContain("state==='live'&&resolved.some(item=>item.stockQuantity>0)");
    expect(compatibility).toContain("if(!input.rules.length)return{status:'unknown'");
    expect(bindings).toContain('commerce.existingEngines.finders');
    expect(bindings).toContain('catalog.existingCommerceProducts');
    expect(read('docs/SPECIAL_COMMERCE_WAVE3_RELEASE.md')).toContain('catalog.limited');
  });
});