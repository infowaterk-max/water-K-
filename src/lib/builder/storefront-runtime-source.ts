import 'server-only';
import type {StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import {getCurrentStorefrontPageState,getPublishedStorefrontPage,resolveStorefrontPreviewToken} from '@/lib/builder/storefront-persistence';
import {listStorefrontReusableSymbolsForInstance} from '@/lib/builder/storefront-reusable-symbol-persistence';
import {materializeStorefrontReusableSymbols} from '@/lib/builder/storefront-linked-symbols';
import {requireStorefrontAccess} from '@/lib/storefront/access';
import {getCurrentWebshopInstance} from '@/lib/instances/access';
import {getStorefrontInteractiveSceneCatalogForInstance} from '@/lib/builder/storefront-interactive-scene-server';
import {getStorefrontExistingCommerceBundleForInstance} from '@/lib/builder/storefront-existing-commerce-server';
import {getStorefrontRecipeCommerceBundleForInstance} from '@/lib/builder/storefront-recipe-commerce-server';
import {getStorefrontReleaseCommerceBundleForInstance} from '@/lib/builder/storefront-release-commerce-server';
import {getStorefrontGrowthMarketingBundleForInstance} from '@/lib/builder/storefront-growth-marketing-server';
import {getStorefrontRuntimeCapabilityForInstance} from '@/lib/builder/storefront-runtime-capability-server';
import {resolveStorefrontPreviewInstanceId} from '@/lib/builder/storefront-preview-context';
import {getPilotAcceptanceInstanceId} from '@/lib/storefront/pilot-access';
import {augmentStorefrontDigitalCommercePreviewContext} from '@/lib/builder/storefront-digital-commerce-preview';
import {composeStorefrontDigitalCommerceCapabilities} from '@/lib/builder/storefront-digital-commerce-composition';
import {normalizeStorefrontTemplateRuntimeComposition} from '@/lib/builder/storefront-template-runtime-normalization';
import {getStorefrontDigitalCommerceRuntimeModel,type StorefrontDigitalCommerceRuntimeRequest} from '@/lib/builder/storefront-digital-commerce-server';
const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export type StorefrontResolvedRuntimePage={source:'published'|'preview';instanceId:string;page:StorefrontPageDocument;bindingContext:Record<string,unknown>;capability:StorefrontRuntimeCapabilityContext;};
function failClosedSpecialCommerce(page:StorefrontPageDocument,capability:StorefrontRuntimeCapabilityContext):StorefrontPageDocument{const enabledFeatures=new Set(capability.features);const allowed=(componentKey:string)=>{if(componentKey==='commerce.interactive-scene')return enabledFeatures.has('interactiveSceneCommerce');if(componentKey==='commerce.recipe')return enabledFeatures.has('recipeCommerce');if(componentKey==='commerce.release')return enabledFeatures.has('releaseCommerce');return true;};const prune=(nodes:StorefrontPageDocument['sections']):StorefrontPageDocument['sections']=>nodes.filter(node=>allowed(node.componentKey)).map(node=>({...node,...(node.children?{children:prune(node.children)}:{})}));return{...page,sections:prune(page.sections)};}
async function resolveRuntimeCommerceContext(instanceId:string,knownPlan?:StorefrontRuntimeCapabilityContext['plan']){const capability=await getStorefrontRuntimeCapabilityForInstance(instanceId,knownPlan);if(!capability)return null;const enabled=new Set(capability.features),scenePromise=getStorefrontInteractiveSceneCatalogForInstance(instanceId);const[sceneCatalog,existingCommerce,recipeBundle,releaseBundle]=await Promise.all([scenePromise,getStorefrontExistingCommerceBundleForInstance(instanceId,scenePromise),enabled.has('recipeCommerce')?getStorefrontRecipeCommerceBundleForInstance(instanceId):Promise.resolve({recipes:[],options:[],catalog:[]} as const),enabled.has('releaseCommerce')?getStorefrontReleaseCommerceBundleForInstance(instanceId):Promise.resolve({definitions:[],releases:[],options:[],dropProducts:[],releaseStatus:'Nincs aktív release státusz.'} as const)]);return{capability,bindingContext:{context:{instanceId},catalog:{interactiveSceneProducts:enabled.has('interactiveSceneCommerce')?sceneCatalog.products:[],existingCommerceProducts:existingCommerce.catalog,existingCommerceAttributes:existingCommerce.attributes,recipeDefinitions:recipeBundle.recipes,recipeProducts:recipeBundle.catalog,drop:releaseBundle.dropProducts},commerce:{existingEngines:{finders:existingCommerce.finders,composers:existingCommerce.composers,configurators:existingCommerce.configurators},releases:releaseBundle.releases},inventory:{releaseStatus:releaseBundle.releaseStatus}} as Record<string,unknown>};}
function mergeDigitalCommerceContext(bindingContext:Record<string,unknown>,digitalCommerce:Record<string,unknown>|null){if(!digitalCommerce)return bindingContext;const commerce=bindingContext.commerce&&typeof bindingContext.commerce==='object'&&!Array.isArray(bindingContext.commerce)?bindingContext.commerce as Record<string,unknown>:{};return{...bindingContext,commerce:{...commerce,digitalCommerce}};}
function mergeGrowthContext(bindingContext:Record<string,unknown>,promotions:Readonly<Record<string,unknown>>){const current=bindingContext.offer&&typeof bindingContext.offer==='object'&&!Array.isArray(bindingContext.offer)?bindingContext.offer as Record<string,unknown>:{};return{...bindingContext,offer:{...current,promotions}};}
async function resolveGrowthContext(instanceId:string,page:StorefrontPageDocument,capability:StorefrontRuntimeCapabilityContext){if(!new Set(capability.features).has('coupons'))return{promotions:Object.freeze({})};return getStorefrontGrowthMarketingBundleForInstance(instanceId,page);}
export async function resolveCurrentStorefrontPublishedRuntimePage(pageKey:string,digitalCommerceRequest?:StorefrontDigitalCommerceRuntimeRequest):Promise<StorefrontResolvedRuntimePage|null>{if(!PAGE_KEY_PATTERN.test(pageKey))return null;const instance=await requireStorefrontAccess();if(!instance)return null;const[page,symbols,runtime]=await Promise.all([getPublishedStorefrontPage(instance.id,pageKey),listStorefrontReusableSymbolsForInstance(instance.id),resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan)]);if(!page||!runtime)return null;const materialized=materializeStorefrontReusableSymbols(page,symbols);if(digitalCommerceRequest&&digitalCommerceRequest.pageType!==materialized.pageType)return null;const[growth,digitalCommerce]=await Promise.all([resolveGrowthContext(instance.id,materialized,runtime.capability),digitalCommerceRequest?getStorefrontDigitalCommerceRuntimeModel(instance.id,digitalCommerceRequest):Promise.resolve(null)]);const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor},navigation:{primary:[]}};return{source:'published',instanceId:instance.id,page:failClosedSpecialCommerce(materialized,runtime.capability),bindingContext:mergeDigitalCommerceContext(baseContext,digitalCommerce),capability:runtime.capability};}
export async function resolveCurrentStorefrontAccountRuntimePage(customerId:string|null):Promise<StorefrontResolvedRuntimePage|null>{
 // Account authentication is a public storefront entrypoint. It must resolve the
 // active template without granting access to catalog/checkout routes that remain
 // protected by requireStorefrontAccess().
 const instance=await getCurrentWebshopInstance();if(!instance)return null;
 const request:StorefrontDigitalCommerceRuntimeRequest|null=customerId?{pageType:'account',customerId}:null;
 const acceptanceInstanceId=process.env.VERCEL_ENV==='preview'?await getPilotAcceptanceInstanceId():null;
 if(acceptanceInstanceId===instance.id){
  try{
   const[state,symbols,runtime]=await Promise.all([
    getCurrentStorefrontPageState('account'),
    listStorefrontReusableSymbolsForInstance(instance.id),
    resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan),
   ]);
   const draft=state?.draft?.document;
   if(draft&&runtime){
    const materialized=materializeStorefrontReusableSymbols(draft,symbols);
    const composed=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(materialized));
    if(composed.pageType!=='account')return null;
    const[growth,digitalCommerce]=await Promise.all([
      resolveGrowthContext(instance.id,composed,runtime.capability),
      request?getStorefrontDigitalCommerceRuntimeModel(instance.id,request):Promise.resolve(null),
    ]);
    const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor},navigation:{primary:[]}};
    return{source:'preview',instanceId:instance.id,page:failClosedSpecialCommerce(composed,runtime.capability),bindingContext:mergeDigitalCommerceContext(baseContext,digitalCommerce),capability:runtime.capability};
   }
  }catch{}
 }
 const[page,symbols,runtime]=await Promise.all([getPublishedStorefrontPage(instance.id,'account'),listStorefrontReusableSymbolsForInstance(instance.id),resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan)]);
 if(!page||!runtime)return null;
 const materialized=materializeStorefrontReusableSymbols(page,symbols);
 if(materialized.pageType!=='account')return null;
 const[growth,digitalCommerce]=await Promise.all([resolveGrowthContext(instance.id,materialized,runtime.capability),request?getStorefrontDigitalCommerceRuntimeModel(instance.id,request):Promise.resolve(null)]);
 const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor},navigation:{primary:[]}};
 return{source:'published',instanceId:instance.id,page:failClosedSpecialCommerce(materialized,runtime.capability),bindingContext:mergeDigitalCommerceContext(baseContext,digitalCommerce),capability:runtime.capability};
}

export async function resolveCurrentStorefrontCheckoutRuntimePage():Promise<StorefrontResolvedRuntimePage|null>{
 const instance=await requireStorefrontAccess();if(!instance)return null;
 const acceptanceInstanceId=process.env.VERCEL_ENV==='preview'?await getPilotAcceptanceInstanceId():null;
 if(acceptanceInstanceId===instance.id){
  try{
   const[state,symbols,runtime]=await Promise.all([
    getCurrentStorefrontPageState('checkout'),
    listStorefrontReusableSymbolsForInstance(instance.id),
    resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan),
   ]);
   const draft=state?.draft?.document;
   if(draft&&runtime){
    const materialized=materializeStorefrontReusableSymbols(draft,symbols);
    const composed=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(materialized));
    const growth=await resolveGrowthContext(instance.id,composed,runtime.capability);
    const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor},navigation:{primary:[]}};
    const previewContext=augmentStorefrontDigitalCommercePreviewContext({page:composed,context:baseContext,acceptanceMode:true});
    return{source:'preview',instanceId:instance.id,page:failClosedSpecialCommerce(composed,runtime.capability),bindingContext:previewContext,capability:runtime.capability};
   }
  }catch{}
 }
 return resolveCurrentStorefrontPublishedRuntimePage('checkout');
}
export async function resolveStorefrontPreviewRuntimePage(token:string):Promise<StorefrontResolvedRuntimePage|null>{if(typeof token!=='string'||token.length<32||token.length>256)return null;const[page,instanceId]=await Promise.all([resolveStorefrontPreviewToken(token),resolveStorefrontPreviewInstanceId(token)]);if(!page||!instanceId)return null;const runtime=await resolveRuntimeCommerceContext(instanceId);if(!runtime)return null;const composedPage=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(page));const growth=await resolveGrowthContext(instanceId,composedPage,runtime.capability);const previewContext=augmentStorefrontDigitalCommercePreviewContext({page:composedPage,context:mergeGrowthContext(runtime.bindingContext,growth.promotions)});return{source:'preview',instanceId,page:failClosedSpecialCommerce(composedPage,runtime.capability),bindingContext:previewContext,capability:runtime.capability};}
