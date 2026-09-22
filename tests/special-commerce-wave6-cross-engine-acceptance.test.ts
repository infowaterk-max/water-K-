import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_SCHEMA_VERSION} from '@/lib/builder/storefront-foundation';
import {createStorefrontVisualBuilderComponentRegistry,STOREFRONT_BUILDER_REGISTRY_VERSION} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry,STOREFRONT_BUILDER_RENDERER_REGISTRY_VERSION} from '@/components/builder/storefront-builder-renderer-registry';
import {isStorefrontManagedConfigKey,listStorefrontManagedConfigKeys,STOREFRONT_MANAGED_CONFIG_VERSION} from '@/lib/builder/storefront-managed-config';
import {setStorefrontExistingCommerceConfigKey} from '@/lib/builder/storefront-existing-commerce-operations';
import {isAllowedStorefrontBindingPath,resolveStorefrontResponsiveOverride,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {INTERACTIVE_SCENE_COMMERCE_AUTHORITY,resolveInteractiveScene,validateInteractiveSceneConfig,type InteractiveSceneHotspot} from '@/lib/commerce/interactive-scene';
import {RECIPE_COMMERCE_AUTHORITY,buildRecipeCommerceAddIntent,validateRecipeDefinition,type RecipeDefinition} from '@/lib/commerce/recipe-commerce';
import {RELEASE_COMMERCE_AUTHORITY,validateReleaseCommerceDefinition,type ReleaseCommerceDefinition} from '@/lib/commerce/release-commerce';
import {validateGuidedFinderConfig,type GuidedFinderConfig} from '@/lib/commerce/guided-finder';
import {buildComposerAddIntent,createComposerOrderSnapshot,MULTI_PRODUCT_COMPOSER_ENGINE_VERSION,type ComposerCatalogItem,type ComposerCartIntent,type MultiProductComposerConfig} from '@/lib/commerce/multi-product-composer';
import {buildConfiguratorAddIntent,PRODUCT_CONFIGURATOR_ENGINE_VERSION,type ConfiguratorCartIntent,type ConfiguratorCatalogPart,type ProductConfiguratorConfig} from '@/lib/commerce/product-configurator';
import {COMPATIBILITY_AUTHORITY_CONTRACT,evaluateCompatibility,type CompatibilityRule} from '@/lib/commerce/compatibility-engine';
import {buildCartCommerceGroups,type CartItem} from '@/lib/cart/types';
import {mergeCartItem} from '@/lib/commerce/cart-engine';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const acceptedRuntimeKeys=[
  'commerce.interactive-scene','commerce.recipe','commerce.release',
  'guided.finder','guided.results','guided.explanation',
  'composer.builder','configurator.builder','configurator.slot-list','compatibility.status','compatibility.evidence',
  'commerce.key-specs','commerce.specification-groups','commerce.compare-button','commerce.compare-tray','commerce.compare-table',
] as const;
const crossEngineKeys=['commerce.interactive-scene','commerce.recipe','commerce.release','guided.finder','composer.builder','configurator.builder'] as const;
const managedSelectors:Readonly<Record<string,readonly string[]>>={
  'commerce.interactive-scene':['sceneKey','sceneKind','hotspots','showSetSummary','setTitle','setCtaLabel','setCtaHref','hotspotStyle'],
  'commerce.recipe':['recipeKey','defaultServings'],
  'commerce.release':['releaseKey','showCountdown','showStockCount'],
  'guided.finder':['finderKey'],'guided.results':['finderKey'],'guided.explanation':['finderKey'],
  'composer.builder':['composerKey'],'configurator.builder':['configuratorKey'],'configurator.slot-list':['configuratorKey'],
  'compatibility.status':['configuratorKey'],'compatibility.evidence':['configuratorKey'],
};
const pageFor=(componentKey:string):StorefrontPageDocument=>({schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey:`wave6-${componentKey.replace(/\./g,'-')}`,pageType:'home',templateKey:'wave6-acceptance',templateVersion:1,sections:[{id:'accepted',componentKey,componentVersion:1,config:{}}]});
const catalogItem=(productId:string,variantId:string,label=variantId):ComposerCatalogItem=>({productId,variantId,label,href:`/termek/${productId}`,eligible:true,channelVisible:true,price:{amountMinor:1000,currency:'HUF',display:'1 000 Ft',source:'shared-pricing-authority'},stock:{available:true,statusLabel:'Készleten'}});
const compositionCartItems=(intent:ComposerCartIntent,prefix:string):CartItem[]=>intent.lines.map((line,index)=>({productId:line.productId,variantId:line.variantId,slug:line.productId,name:`${prefix} ${index+1}`,unitPrice:1000,quantity:line.quantity,lineId:`${intent.compositionId}:item-${index}`,commerceGroup:{type:'composition',id:intent.compositionId,engineVersion:intent.engineVersion,definitionKey:intent.composerKey,definitionVersion:intent.composerVersion,itemKey:`item-${index}`,slotId:line.slotId??null}}));
const configurationCartItems=(intent:ConfiguratorCartIntent):CartItem[]=>intent.lines.map((line,index)=>({productId:line.productId,variantId:line.variantId,slug:line.productId,name:`Configuration ${index+1}`,unitPrice:1000,quantity:1,lineId:`${intent.configurationId}:item-${index}`,commerceGroup:{type:'configuration',id:intent.configurationId,engineVersion:intent.engineVersion,definitionKey:intent.configuratorKey,definitionVersion:intent.configuratorVersion,itemKey:`item-${index}`,slotId:line.slotId}}));

describe('Special Commerce Wave 6 cross-engine acceptance',()=>{
  it('keeps every accepted launch component in the real Builder and renderer registries',()=>{
    const components=createStorefrontVisualBuilderComponentRegistry(),renderers=createStorefrontVisualBuilderRendererRegistry();
    expect(STOREFRONT_BUILDER_REGISTRY_VERSION).toBe('shoporation.storefront-builder-registry.special-commerce-v5');
    expect(STOREFRONT_BUILDER_RENDERER_REGISTRY_VERSION).toBe('shoporation.storefront-builder-renderers.special-commerce-v5');
    for(const key of acceptedRuntimeKeys){expect(components.get(key,1),`${key} component`).toBeDefined();expect(renderers.get(key,1),`${key} renderer`).toBeDefined();}
  });

  it('accepts Scene + Recipe + Release + Finder + Composer + Configurator in one real Page Schema document without config leakage',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const definitions=crossEngineKeys.map(key=>registry.get(key,1));expect(definitions.every(Boolean)).toBe(true);
    const pageTypes=definitions[0]?.manifest.pageTypes.filter(pageType=>definitions.every(definition=>definition?.manifest.pageTypes.includes(pageType)))??[];
    expect(pageTypes.length,'cross-engine common page type').toBeGreaterThan(0);
    const features=[...new Set(definitions.flatMap(definition=>definition?.manifest.capability.features??[]))];
    const page:StorefrontPageDocument={schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey:'wave6-cross-engine',pageType:pageTypes[0]??'home',templateKey:'wave6-acceptance',templateVersion:1,sections:crossEngineKeys.map((componentKey,index)=>({id:`engine-${index}`,componentKey,componentVersion:1,config:{title:`Engine ${index}`}}))};
    expect(validateStorefrontPageDocument(page,registry,{plan:'pro',features}).ok).toBe(true);
    const before=structuredClone(page),composer=setStorefrontExistingCommerceConfigKey(page,'engine-4','bundle-main');
    expect(composer.sections[4]?.config.composerKey).toBe('bundle-main');
    expect(composer.sections[0]?.config).toEqual(before.sections[0]?.config);
    expect(composer.sections[1]?.config).toEqual(before.sections[1]?.config);
    expect(composer.sections[2]?.config).toEqual(before.sections[2]?.config);
    expect(page).toEqual(before);
    const configurator=setStorefrontExistingCommerceConfigKey(composer,'engine-5','config-main');
    expect(configurator.sections[5]?.config.configuratorKey).toBe('config-main');
    expect(configurator.sections[4]?.config.composerKey).toBe('bundle-main');
  });

  it('fails closed on the actual entitlement matrix and keeps managed selectors out of merchant-generic config',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    expect(registry.get('commerce.interactive-scene',1)?.manifest.capability.features).toContain('interactiveSceneCommerce');
    expect(registry.get('commerce.recipe',1)?.manifest.capability.features).toContain('recipeCommerce');
    expect(registry.get('commerce.release',1)?.manifest.capability.features).toContain('releaseCommerce');
    expect(registry.get('commerce.release',1)?.manifest.capability.minPlan).toBe('alap');
    for(const key of acceptedRuntimeKeys){
      const definition=registry.get(key,1);expect(definition).toBeDefined();if(!definition)continue;
      const requirement=definition.manifest.capability,page=pageFor(key);page.pageType=definition.manifest.pageTypes[0];
      expect(validateStorefrontPageDocument(page,registry,{plan:requirement.minPlan,features:requirement.features}).ok,`${key} full capability`).toBe(true);
      if(requirement.features.length)expect(validateStorefrontPageDocument(page,registry,{plan:requirement.minPlan,features:[]}).violations.some(v=>v.code==='COMPONENT_CAPABILITY_REQUIRED'),`${key} missing feature`).toBe(true);
      if(requirement.minPlan==='pro')expect(validateStorefrontPageDocument(page,registry,{plan:'alap',features:requirement.features}).violations.some(v=>v.code==='COMPONENT_CAPABILITY_REQUIRED'),`${key} plan gate`).toBe(true);
    }
    expect(STOREFRONT_MANAGED_CONFIG_VERSION).toBe('shoporation.storefront-managed-config.v5');
    for(const[key,selectors]of Object.entries(managedSelectors)){const definition=registry.get(key,1);expect(definition).toBeDefined();if(!definition)continue;expect([...listStorefrontManagedConfigKeys(key)].sort()).toEqual([...selectors].sort());for(const selector of selectors){expect(isStorefrontManagedConfigKey(key,selector)).toBe(true);expect(definition.manifest.configurable).not.toContain(selector);}expect(definition.manifest.configurable).not.toContain('engineConfigs');expect(definition.manifest.configurable).not.toContain('catalog');}
  });

  it('uses one isolated D/T/M responsive contract and binding-security contract across engines',()=>{
    for(const componentKey of crossEngineKeys){const node:StorefrontComponentNode={id:`responsive-${componentKey}`,componentKey,componentVersion:1,config:{},responsive:{desktop:{gridSpan:10},tablet:{hidden:true},mobile:{gridSpan:6}}};expect(resolveStorefrontResponsiveOverride(node,'desktop')).toEqual({hidden:false,gridSpan:10});expect(resolveStorefrontResponsiveOverride(node,'tablet')).toEqual({hidden:true,gridSpan:12});expect(resolveStorefrontResponsiveOverride(node,'mobile')).toEqual({hidden:false,gridSpan:6});}
    expect(isAllowedStorefrontBindingPath('commerce.releases')).toBe(true);expect(isAllowedStorefrontBindingPath('catalog.existingCommerceProducts')).toBe(true);expect(isAllowedStorefrontBindingPath('commerce.__proto__.polluted')).toBe(false);expect(isAllowedStorefrontBindingPath('catalog.constructor.prototype')).toBe(false);
  });

  it('executes Composer, Recipe, Room/E4 and Configurator intents beside an ordinary cart line without losing group identity',()=>{
    const shared=[catalogItem('product-a','variant-a','A'),catalogItem('product-b','variant-b','B'),catalogItem('product-c','variant-c','C'),catalogItem('product-d','variant-d','D')];
    const composerConfig:MultiProductComposerConfig={version:1,tenantId:'tenant',composerKey:'bundle',label:'Bundle',mode:'pool',minItems:1,maxItems:4,duplicateLimit:4};
    const composer=buildComposerAddIntent('composition-main',{config:composerConfig,selections:[{productId:'product-a',variantId:'variant-a',quantity:1}],catalog:shared});
    const roomConfig:MultiProductComposerConfig={version:1,tenantId:'tenant',composerKey:'room-set',label:'Room',mode:'slots',minItems:1,maxItems:2,duplicateLimit:1,slots:[{id:'sofa',label:'Sofa',minItems:1,maxItems:1,eligibleProductIds:['product-c']}]};
    const room=buildComposerAddIntent('room-main',{config:roomConfig,selections:[{productId:'product-c',variantId:'variant-c',quantity:1,slotId:'sofa'}],catalog:shared.map(item=>item.productId==='product-c'?{...item,slotIds:['sofa']}:item)});
    const recipeDef:RecipeDefinition={version:1,tenantId:'tenant',recipeKey:'dinner',title:'Dinner',baseServings:2,minServings:1,maxServings:8,ingredients:[{ingredientId:'base',label:'Base',quantityDisplay:'1 db',commerceMode:'required',baseCartQuantity:1,scalingPolicy:'fixed',mappings:[{mappingId:'main',productId:'product-b',variantId:'variant-b'}]}],claims:[]};
    const recipe=buildRecipeCommerceAddIntent('recipe-main',{recipe:recipeDef,servings:2,catalog:shared});
    const configuratorConfig:ProductConfiguratorConfig={version:1,tenantId:'tenant',configuratorKey:'pc',label:'PC',slots:[{id:'base',label:'Base',required:true,eligibleProductIds:['product-a']},{id:'addon',label:'Addon',required:true,eligibleProductIds:['product-d']}]};
    const evidence={fit:{specKey:'fit',value:{type:'text' as const,value:'standard'},source:'compare-spec-engine.v1' as const}};
    const configuratorCatalog:ConfiguratorCatalogPart[]=[{...shared[0]!,slotIds:['base'],stock:{available:true,statusLabel:'Készleten'},compatibility:evidence},{...shared[3]!,slotIds:['addon'],stock:{available:true,statusLabel:'Készleten'},compatibility:evidence}];
    const compatibilityRules:CompatibilityRule[]=[{id:'fit-match',label:'Fit',kind:'required',operator:'eq',left:{slotId:'base',specKey:'fit'},right:{slotId:'addon',specKey:'fit'},compatibleReason:'Match',incompatibleReason:'Mismatch',unknownReason:'Unknown'}];
    const configurator=buildConfiguratorAddIntent('configuration-main',{config:configuratorConfig,selections:[{slotId:'base',productId:'product-a',variantId:'variant-a'},{slotId:'addon',productId:'product-d',variantId:'variant-d'}],catalog:configuratorCatalog,compatibilityRules});
    if(!composer||!room||!recipe||!configurator)throw new Error('WAVE6_ACCEPTANCE_INTENT_BUILD_FAILED');
    expect(composer.atomic&&room.atomic&&recipe.composerIntent.atomic&&configurator.atomic).toBe(true);expect(recipe.composerIntent.pricingAuthority).toBe('shared-pricing-authority');expect(configurator.pricingAuthority).toBe('shared-pricing-authority');
    const ordinary:CartItem={productId:'product-a',variantId:'variant-a',slug:'product-a',name:'Ordinary A',unitPrice:1000,quantity:1};
    const grouped=[...compositionCartItems(composer,'Composer'),...compositionCartItems(recipe.composerIntent,'Recipe'),...compositionCartItems(room,'Room'),...configurationCartItems(configurator)];
    let items:CartItem[]=[];for(const item of[ordinary,...grouped])items=mergeCartItem(items,item);
    expect(items.filter(item=>item.variantId==='variant-a')).toHaveLength(3);
    expect(items.some(item=>!item.commerceGroup)).toBe(true);
    const groups=buildCartCommerceGroups({items});expect(groups).toHaveLength(4);expect(groups.map(group=>`${group.type}:${group.id}`).sort()).toEqual(['composition:composition-main','composition:recipe-main','composition:room-main','configuration:configuration-main'].sort());
    expect(groups.flatMap(group=>group.items).every(item=>Boolean(item.variant_id)&&item.quantity>0)).toBe(true);
  });

  it('keeps compatibility unknown fail-closed and historical composition identity on real order line ids',()=>{
    expect(COMPATIBILITY_AUTHORITY_CONTRACT.unknownCountsAsCompatible).toBe(false);expect(evaluateCompatibility({rules:[],parts:[]})?.status).toBe('unknown');
    const snapshot=createComposerOrderSnapshot({compositionId:'composition-main',composerKey:'bundle',composerVersion:1,lines:[{lineId:'order-item-1',compositionId:'composition-main',productId:'product-a',variantId:'variant-a',label:'A',quantity:1,unitPriceMinor:1000,currency:'HUF'},{lineId:'order-item-2',compositionId:null,productId:'product-a',variantId:'variant-a',label:'Ordinary',quantity:1,unitPriceMinor:1000,currency:'HUF'}]});
    expect(snapshot?.refundableLineIds).toEqual(['order-item-1']);expect(snapshot?.lines[0]?.lineId).toBe('order-item-1');
    const migration=read('supabase/migrations/20260913062000_special_commerce_existing_engine_closure.sql');expect(migration).toContain('place_order_provider_v5_idempotent');expect(migration).toContain('COMMERCE_GROUP_ALLOCATION_EXCEEDS_CART');expect(migration).toContain('COMMERCE_GROUP_IDEMPOTENCY_MISMATCH');expect(migration).toContain('order_commerce_group_items');expect(migration).toContain('order_item_id');
  });

  it('keeps all Special Commerce presentation engines non-authoritative and reuses one shared Scene catalog projection for E3-E5',()=>{
    expect(Object.values(INTERACTIVE_SCENE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);expect(Object.values(RECIPE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);expect(Object.values(RELEASE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);
    const server=read('src/lib/builder/storefront-existing-commerce-server.ts'),runtimeSource=read('src/lib/builder/storefront-runtime-source.ts'),builderServer=read('src/lib/builder/storefront-builder-server.ts');
    expect(server).toContain('sharedSceneCatalog?:StorefrontInteractiveSceneCatalog|Promise<StorefrontInteractiveSceneCatalog>');expect(server).not.toContain('gross_price_huf');
    expect(runtimeSource).toContain('scenePromise=getStorefrontInteractiveSceneCatalogForInstance(instanceId)');expect(runtimeSource).toContain('getStorefrontExistingCommerceBundleForInstance(instanceId,scenePromise)');expect(builderServer).toContain('getStorefrontExistingCommerceBundleForInstance(instance.id,sceneCatalog)');
    expect(runtimeSource).toContain("interactiveSceneProducts:enabled.has('interactiveSceneCommerce')?sceneCatalog.products:[]");expect(builderServer).toContain("interactiveSceneProducts:enabled.has('interactiveSceneCommerce')?sceneCatalog.products:[]");
    expect(read('src/app/api/checkout/quote/route.ts')).not.toContain('commerceGroups');
  });

  it('enforces bounded payloads and rejects unsafe interactive links',()=>{
    const hotspot=(index:number):InteractiveSceneHotspot=>({id:`h${index}`,productId:`p${index}`,position:{desktop:{x:50,y:50}}});expect(validateInteractiveSceneConfig({sceneKey:'scene',kind:'generic',hotspots:Array.from({length:51},(_,i)=>hotspot(i))})).toContain('INTERACTIVE_SCENE_HOTSPOT_LIMIT_EXCEEDED');
    const scene=resolveInteractiveScene({config:{sceneKey:'scene',kind:'generic',hotspots:[hotspot(1)]},products:[{productId:'p1',label:'Unsafe',href:'javascript:alert(1)',eligible:true}],viewport:'desktop'});expect(scene.hotspots).toHaveLength(0);expect(scene.excludedProductIds).toEqual(['p1']);
    const recipe:RecipeDefinition={version:1,tenantId:'tenant',recipeKey:'recipe',title:'Recipe',baseServings:2,minServings:1,maxServings:10,ingredients:Array.from({length:101},(_,i)=>({ingredientId:`i${i}`,label:`Ingredient ${i}`,quantityDisplay:'1 db',commerceMode:'informational' as const})),claims:[]};expect(validateRecipeDefinition(recipe).some(v=>v.code==='RECIPE_INGREDIENTS_INVALID')).toBe(true);
    const release:ReleaseCommerceDefinition={version:1,tenantId:'tenant',releaseKey:'drop',title:'Drop',startsAt:'2026-09-13T12:00:00.000Z',active:true,items:Array.from({length:101},(_,i)=>({itemId:`i${i}`,productId:`p${i}`,variantId:`v${i}`}))};expect(validateReleaseCommerceDefinition(release).some(v=>v.code==='RELEASE_ITEMS_INVALID')).toBe(true);
    const finder:GuidedFinderConfig={version:1,tenantId:'tenant',finderKey:'finder',label:'Finder',safetyPolicy:'standard',partialPolicy:'zero',maxResults:25,steps:[]};expect(validateGuidedFinderConfig(finder).some(v=>v.code==='FINDER_MAX_RESULTS_INVALID')).toBe(true);
  });

  it('keeps accessibility semantics in the production renderers instead of color-only or mouse-only state',()=>{
    const scene=read('src/components/builder/storefront-interactive-scene.tsx'),existing=read('src/components/builder/storefront-existing-commerce-runtime.tsx');expect(scene).toContain('aria-label={`${hotspot.label}');expect(existing).toContain('<fieldset');expect(existing).toContain('aria-pressed={selected}');expect(existing).toContain('mennyiségének csökkentése');expect(existing).toContain('mennyiségének növelése');expect(existing).toContain('aria-live="polite"');expect(existing).toContain('<select');expect(existing).toContain('role="status"');expect(existing).not.toContain('outline:none');
  });

  it('keeps release time/stock server-authoritative and avoids client-clock commerce unlock',()=>{
    const release=read('src/lib/commerce/release-commerce.ts'),releaseServer=read('src/lib/builder/storefront-release-commerce-server.ts'),bindings=read('src/lib/builder/storefront-existing-commerce-bindings.ts');expect(release).toContain('clientClockCanUnlockCommerce:false');expect(release).toContain("state==='live'&&resolved.some(item=>item.stockQuantity>0)");expect(releaseServer).toContain('const now=new Date()');expect(releaseServer).toContain("stockSource:'shared-inventory-authority'");expect(bindings).toContain('commerce.existingEngines.finders');expect(bindings).toContain('catalog.existingCommerceProducts');expect(read('docs/SPECIAL_COMMERCE_WAVE3_RELEASE.md')).toContain('catalog.limited');
  });

  it('pins the accepted group engines to the shared v6 checkout wrapper over the existing v5 authority',()=>{
    expect(MULTI_PRODUCT_COMPOSER_ENGINE_VERSION).toBe('shoporation.multi-product-composer.v1');expect(PRODUCT_CONFIGURATOR_ENGINE_VERSION).toBe('shoporation.product-configurator.v1');const checkout=read('src/lib/orders/tenant-checkout.ts'),migration=read('supabase/migrations/20260913062000_special_commerce_existing_engine_closure.sql');expect(checkout).toContain('place_order_provider_v6_idempotent');expect(migration).toContain('place_order_provider_v5_idempotent');expect(migration).not.toContain('place_order_provider_v7');
  });
});
