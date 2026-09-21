import 'server-only';
import type {StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import {getCurrentStorefrontPageState,getPreviewStorefrontDraftPage,getPublishedStorefrontPage,resolveStorefrontPreviewToken} from '@/lib/builder/storefront-persistence';
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
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {createAdminClient} from '@/lib/supabase/admin';
const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export type StorefrontResolvedRuntimePage={source:'published'|'preview';instanceId:string;page:StorefrontPageDocument;bindingContext:Record<string,unknown>;capability:StorefrontRuntimeCapabilityContext;};
function failClosedSpecialCommerce(page:StorefrontPageDocument,capability:StorefrontRuntimeCapabilityContext):StorefrontPageDocument{const enabledFeatures=new Set(capability.features);const allowed=(componentKey:string)=>{if(componentKey==='commerce.interactive-scene')return enabledFeatures.has('interactiveSceneCommerce');if(componentKey==='commerce.recipe')return enabledFeatures.has('recipeCommerce');if(componentKey==='commerce.release')return enabledFeatures.has('releaseCommerce');return true;};const prune=(nodes:StorefrontPageDocument['sections']):StorefrontPageDocument['sections']=>nodes.filter(node=>allowed(node.componentKey)).map(node=>({...node,...(node.children?{children:prune(node.children)}:{})}));return{...page,sections:prune(page.sections)};}
async function resolveStorefrontSocialLinks(instanceId:string){
 const{data}=await createAdminClient().from('email_brand_kits').select('social_links').eq('instance_id',instanceId).eq('is_default',true).maybeSingle();
 const raw=data?.social_links&&typeof data.social_links==='object'&&!Array.isArray(data.social_links)?data.social_links as Record<string,unknown>:{};
 const defs=[['youtube','YouTube','▶'],['instagram','Instagram','◎'],['tiktok','TikTok','♪'],['facebook','Facebook','f'],['linkedin','LinkedIn','in']] as const;
 return defs.flatMap(([key,label,symbol])=>{const href=typeof raw[key]==='string'?String(raw[key]).trim():'';if(!/^https?:\/\//i.test(href))return[];return[{label,href,symbol,ariaLabel:label}]});
}
async function resolveRuntimeCommerceContext(instanceId:string,knownPlan?:StorefrontRuntimeCapabilityContext['plan']){const capability=await getStorefrontRuntimeCapabilityForInstance(instanceId,knownPlan);if(!capability)return null;const enabled=new Set(capability.features),scenePromise=getStorefrontInteractiveSceneCatalogForInstance(instanceId);const[sceneCatalog,existingCommerce,recipeBundle,releaseBundle,socialLinks]=await Promise.all([scenePromise,getStorefrontExistingCommerceBundleForInstance(instanceId,scenePromise),enabled.has('recipeCommerce')?getStorefrontRecipeCommerceBundleForInstance(instanceId):Promise.resolve({recipes:[],options:[],catalog:[]} as const),enabled.has('releaseCommerce')?getStorefrontReleaseCommerceBundleForInstance(instanceId):Promise.resolve({definitions:[],releases:[],options:[],dropProducts:[],releaseStatus:'Nincs aktív release státusz.'} as const),resolveStorefrontSocialLinks(instanceId)]);return{capability,bindingContext:{context:{instanceId},brand:{socialLinks},catalog:{interactiveSceneProducts:enabled.has('interactiveSceneCommerce')?sceneCatalog.products:[],existingCommerceProducts:existingCommerce.catalog,existingCommerceAttributes:existingCommerce.attributes,recipeDefinitions:recipeBundle.recipes,recipeProducts:recipeBundle.catalog,drop:releaseBundle.dropProducts},commerce:{existingEngines:{finders:existingCommerce.finders,composers:existingCommerce.composers,configurators:existingCommerce.configurators},releases:releaseBundle.releases},inventory:{releaseStatus:releaseBundle.releaseStatus}} as Record<string,unknown>};}
const authPublicSection=(section:StorefrontPageDocument['sections'][number])=>(section.config as Record<string,unknown>).authPublic===true;
function applyTemplateAuthComposition(page:StorefrontPageDocument):StorefrontPageDocument{
 if(page.pageType!=='account'||page.sections.some(authPublicSection))return page;
 const template=getStorefrontTemplatePackage(page.templateKey,page.templateVersion);
 const preset=template?.pages.find(item=>item.pageType==='account');
 const authSections=preset?.sections.filter(authPublicSection)??[];
 if(!authSections.length||!page.sections.length)return page;
 return{...page,metadata:{...(page.metadata??{}),authCompositionFallback:'template-source'},sections:[page.sections[0]!,...structuredClone(authSections),...page.sections.slice(1)]};
}
function mergeDigitalCommerceContext(bindingContext:Record<string,unknown>,digitalCommerce:Record<string,unknown>|null){if(!digitalCommerce)return bindingContext;const commerce=bindingContext.commerce&&typeof bindingContext.commerce==='object'&&!Array.isArray(bindingContext.commerce)?bindingContext.commerce as Record<string,unknown>:{};return{...bindingContext,commerce:{...commerce,digitalCommerce}};}
function mergeGrowthContext(bindingContext:Record<string,unknown>,promotions:Readonly<Record<string,unknown>>){const current=bindingContext.offer&&typeof bindingContext.offer==='object'&&!Array.isArray(bindingContext.offer)?bindingContext.offer as Record<string,unknown>:{};return{...bindingContext,offer:{...current,promotions}};}
async function resolveGrowthContext(instanceId:string,page:StorefrontPageDocument,capability:StorefrontRuntimeCapabilityContext){if(!new Set(capability.features).has('coupons'))return{promotions:Object.freeze({})};return getStorefrontGrowthMarketingBundleForInstance(instanceId,page);}
export async function resolveCurrentStorefrontPublishedRuntimePage(pageKey:string,digitalCommerceRequest?:StorefrontDigitalCommerceRuntimeRequest):Promise<StorefrontResolvedRuntimePage|null>{if(!PAGE_KEY_PATTERN.test(pageKey))return null;const instance=await requireStorefrontAccess();if(!instance)return null;const[page,symbols,runtime]=await Promise.all([getPublishedStorefrontPage(instance.id,pageKey),listStorefrontReusableSymbolsForInstance(instance.id),resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan)]);if(!page||!runtime)return null;const materialized=materializeStorefrontReusableSymbols(page,symbols);if(digitalCommerceRequest&&digitalCommerceRequest.pageType!==materialized.pageType)return null;const[growth,digitalCommerce]=await Promise.all([resolveGrowthContext(instance.id,materialized,runtime.capability),digitalCommerceRequest?getStorefrontDigitalCommerceRuntimeModel(instance.id,digitalCommerceRequest):Promise.resolve(null)]);const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{...((runtime.bindingContext.brand&&typeof runtime.bindingContext.brand==='object'&&!Array.isArray(runtime.bindingContext.brand))?runtime.bindingContext.brand as Record<string,unknown>:{}),name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor},navigation:{primary:[]}};return{source:'published',instanceId:instance.id,page:failClosedSpecialCommerce(materialized,runtime.capability),bindingContext:mergeDigitalCommerceContext(baseContext,digitalCommerce),capability:runtime.capability};}
export async function resolveCurrentStorefrontAccountRuntimePage(customerId:string|null):Promise<StorefrontResolvedRuntimePage|null>{
 // Customer auth is public presentation. Preview may read the exact pilot account
 // draft without granting catalog/checkout/admin access, so visual acceptance does
 // not depend on an authenticated pilot session.
 const instance=await getCurrentWebshopInstance();if(!instance)return null;
 const request:StorefrontDigitalCommerceRuntimeRequest|null=customerId?{pageType:'account',customerId}:null;
 const previewDraft=!customerId&&process.env.VERCEL_ENV==='preview'
  ?await getPreviewStorefrontDraftPage(instance.id,'account')
  :null;
 const acceptanceInstanceId=process.env.VERCEL_ENV==='preview'?await getPilotAcceptanceInstanceId():null;
 if(previewDraft||acceptanceInstanceId===instance.id){
  try{
   const[state,symbols,runtime]=await Promise.all([
    previewDraft?Promise.resolve(null):getCurrentStorefrontPageState('account'),
    listStorefrontReusableSymbolsForInstance(instance.id),
    resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan),
   ]);
   const draft=previewDraft??state?.draft?.document;
   if(draft&&runtime){
    const materialized=materializeStorefrontReusableSymbols(draft,symbols);
    const authored=customerId?materialized:applyTemplateAuthComposition(materialized);
    const composed=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(authored));
    if(composed.pageType!=='account')return null;
    const[growth,digitalCommerce]=await Promise.all([
      resolveGrowthContext(instance.id,composed,runtime.capability),
      request?getStorefrontDigitalCommerceRuntimeModel(instance.id,request):Promise.resolve(null),
    ]);
    const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{...((runtime.bindingContext.brand&&typeof runtime.bindingContext.brand==='object'&&!Array.isArray(runtime.bindingContext.brand))?runtime.bindingContext.brand as Record<string,unknown>:{}),name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor},navigation:{primary:[]}};
    return{source:'preview',instanceId:instance.id,page:failClosedSpecialCommerce(composed,runtime.capability),bindingContext:mergeDigitalCommerceContext(baseContext,digitalCommerce),capability:runtime.capability};
   }
  }catch{}
 }
 const[page,symbols,runtime]=await Promise.all([getPublishedStorefrontPage(instance.id,'account'),listStorefrontReusableSymbolsForInstance(instance.id),resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan)]);
 if(!page||!runtime)return null;
 const materialized=materializeStorefrontReusableSymbols(page,symbols);
 const authored=customerId?materialized:applyTemplateAuthComposition(materialized);
 if(authored.pageType!=='account')return null;
 const[growth,digitalCommerce]=await Promise.all([resolveGrowthContext(instance.id,authored,runtime.capability),request?getStorefrontDigitalCommerceRuntimeModel(instance.id,request):Promise.resolve(null)]);
 const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{...((runtime.bindingContext.brand&&typeof runtime.bindingContext.brand==='object'&&!Array.isArray(runtime.bindingContext.brand))?runtime.bindingContext.brand as Record<string,unknown>:{}),name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor},navigation:{primary:[]}};
 return{source:'published',instanceId:instance.id,page:failClosedSpecialCommerce(authored,runtime.capability),bindingContext:mergeDigitalCommerceContext(baseContext,digitalCommerce),capability:runtime.capability};
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
    const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{...((runtime.bindingContext.brand&&typeof runtime.bindingContext.brand==='object'&&!Array.isArray(runtime.bindingContext.brand))?runtime.bindingContext.brand as Record<string,unknown>:{}),name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor},navigation:{primary:[]}};
    const previewContext=augmentStorefrontDigitalCommercePreviewContext({page:composed,context:baseContext,acceptanceMode:true});
    return{source:'preview',instanceId:instance.id,page:failClosedSpecialCommerce(composed,runtime.capability),bindingContext:previewContext,capability:runtime.capability};
   }
  }catch{}
 }
 return resolveCurrentStorefrontPublishedRuntimePage('checkout');
}
export async function resolveStorefrontPreviewRuntimePage(token:string):Promise<StorefrontResolvedRuntimePage|null>{if(typeof token!=='string'||token.length<32||token.length>256)return null;const[page,instanceId]=await Promise.all([resolveStorefrontPreviewToken(token),resolveStorefrontPreviewInstanceId(token)]);if(!page||!instanceId)return null;const runtime=await resolveRuntimeCommerceContext(instanceId);if(!runtime)return null;const composedPage=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(page));const growth=await resolveGrowthContext(instanceId,composedPage,runtime.capability);const previewContext=augmentStorefrontDigitalCommercePreviewContext({page:composedPage,context:mergeGrowthContext(runtime.bindingContext,growth.promotions)});return{source:'preview',instanceId,page:failClosedSpecialCommerce(composedPage,runtime.capability),bindingContext:previewContext,capability:runtime.capability};}
