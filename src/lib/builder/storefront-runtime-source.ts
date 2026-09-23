import 'server-only';
import type {StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import type {StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import {getCurrentStorefrontPageState,getPreviewStorefrontDraftPage,getPublishedStorefrontPage,resolveStorefrontPreviewToken} from '@/lib/builder/storefront-persistence';
import {listStorefrontReusableSymbolsForInstance} from '@/lib/builder/storefront-reusable-symbol-persistence';
import {materializeStorefrontReusableSymbols} from '@/lib/builder/storefront-linked-symbols';
import {requireStorefrontAccess,requireStorefrontBrowseAccess} from '@/lib/storefront/access';
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
import {createStorefrontTemplatePreviewBindingContext} from '@/lib/builder/storefront-template-preview-demo';
import {PLANS} from '@/lib/plans/catalog';
const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export type StorefrontResolvedRuntimePage={source:'published'|'preview';instanceId:string;page:StorefrontPageDocument;bindingContext:Record<string,unknown>;capability:StorefrontRuntimeCapabilityContext;};
function failClosedSpecialCommerce(page:StorefrontPageDocument,capability:StorefrontRuntimeCapabilityContext):StorefrontPageDocument{const enabledFeatures=new Set(capability.features);const allowed=(componentKey:string)=>{if(componentKey==='commerce.interactive-scene')return enabledFeatures.has('interactiveSceneCommerce');if(componentKey==='commerce.recipe')return enabledFeatures.has('recipeCommerce');if(componentKey==='commerce.release')return enabledFeatures.has('releaseCommerce');return true;};const prune=(nodes:StorefrontPageDocument['sections']):StorefrontPageDocument['sections']=>nodes.filter(node=>allowed(node.componentKey)).map(node=>({...node,...(node.children?{children:prune(node.children)}:{})}));return{...page,sections:prune(page.sections)};}
function resolveStorefrontSocialLinks(value:unknown){
 const raw=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const defs=[['youtube','YouTube','YT'],['instagram','Instagram','IG'],['tiktok','TikTok','TT'],['facebook','Facebook','FB'],['x','X','X'],['twitch','Twitch','TW'],['linkedin','LinkedIn','IN'],['pinterest','Pinterest','PI']] as const;
 return defs.flatMap(([key,label,symbol])=>{const href=typeof raw[key]==='string'?String(raw[key]).trim():'';if(!/^https?:\/\//i.test(href))return[];return[{label,href,symbol,ariaLabel:label}]});
}
async function resolveRuntimeCommerceContext(instanceId:string,knownPlan?:StorefrontRuntimeCapabilityContext['plan']){const capability=await getStorefrontRuntimeCapabilityForInstance(instanceId,knownPlan);if(!capability)return null;const enabled=new Set(capability.features),scenePromise=getStorefrontInteractiveSceneCatalogForInstance(instanceId);const[sceneCatalog,existingCommerce,recipeBundle,releaseBundle]=await Promise.all([scenePromise,getStorefrontExistingCommerceBundleForInstance(instanceId,scenePromise),enabled.has('recipeCommerce')?getStorefrontRecipeCommerceBundleForInstance(instanceId):Promise.resolve({recipes:[],options:[],catalog:[]} as const),enabled.has('releaseCommerce')?getStorefrontReleaseCommerceBundleForInstance(instanceId):Promise.resolve({definitions:[],releases:[],options:[],dropProducts:[],releaseStatus:'Nincs aktív release státusz.'} as const)]);return{capability,bindingContext:{context:{instanceId},catalog:{interactiveSceneProducts:enabled.has('interactiveSceneCommerce')?sceneCatalog.products:[],existingCommerceProducts:existingCommerce.catalog,existingCommerceAttributes:existingCommerce.attributes,recipeDefinitions:recipeBundle.recipes,recipeProducts:recipeBundle.catalog,drop:releaseBundle.dropProducts},commerce:{existingEngines:{finders:existingCommerce.finders,composers:existingCommerce.composers,configurators:existingCommerce.configurators},releases:releaseBundle.releases},inventory:{releaseStatus:releaseBundle.releaseStatus}} as Record<string,unknown>};}
const authPublicSection=(section:StorefrontPageDocument['sections'][number])=>(section.config as Record<string,unknown>).authPublic===true;
function applyTemplateAuthComposition(page:StorefrontPageDocument):StorefrontPageDocument{
 if(page.pageType!=='account')return page;
 const template=getStorefrontTemplatePackage(page.templateKey,page.templateVersion);
 const preset=template?.pages.find(item=>item.pageType==='account');
 if(!preset||!page.sections.length)return page;
 const authSections=preset.sections.filter(authPublicSection);
 let sections=[...page.sections];
 if(authSections.length&&!sections.some(authPublicSection))sections=[sections[0]!,...structuredClone(authSections),...sections.slice(1)];
 const sourceFooter=preset.sections[preset.sections.length-1];
 if(sourceFooter&&/footer/i.test(sourceFooter.id)){
  const footerIndex=sections.findIndex(section=>/footer/i.test(section.id));
  if(footerIndex>=0)sections=sections.map((section,index)=>index===footerIndex?structuredClone(sourceFooter):section);
 }
 return{...page,metadata:{...(page.metadata??{}),authCompositionFallback:'template-source',systemSurfaceComposition:'template-source'},sections};
}
function mergeDigitalCommerceContext(bindingContext:Record<string,unknown>,digitalCommerce:Record<string,unknown>|null){if(!digitalCommerce)return bindingContext;const commerce=bindingContext.commerce&&typeof bindingContext.commerce==='object'&&!Array.isArray(bindingContext.commerce)?bindingContext.commerce as Record<string,unknown>:{};return{...bindingContext,commerce:{...commerce,digitalCommerce}};}
function mergeGrowthContext(bindingContext:Record<string,unknown>,promotions:Readonly<Record<string,unknown>>){const current=bindingContext.offer&&typeof bindingContext.offer==='object'&&!Array.isArray(bindingContext.offer)?bindingContext.offer as Record<string,unknown>:{};return{...bindingContext,offer:{...current,promotions}};}
async function resolveGrowthContext(instanceId:string,page:StorefrontPageDocument,capability:StorefrontRuntimeCapabilityContext){if(!new Set(capability.features).has('coupons'))return{promotions:Object.freeze({})};return getStorefrontGrowthMarketingBundleForInstance(instanceId,page);}
export async function resolveCurrentStorefrontPublishedRuntimePage(pageKey:string,digitalCommerceRequest?:StorefrontDigitalCommerceRuntimeRequest):Promise<StorefrontResolvedRuntimePage|null>{if(!PAGE_KEY_PATTERN.test(pageKey))return null;const instance=await requireStorefrontAccess();if(!instance)return null;const[page,symbols,runtime]=await Promise.all([getPublishedStorefrontPage(instance.id,pageKey),listStorefrontReusableSymbolsForInstance(instance.id),resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan)]);if(!page||!runtime)return null;const materialized=materializeStorefrontReusableSymbols(page,symbols);const composed=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(materialized));if(digitalCommerceRequest&&digitalCommerceRequest.pageType!==composed.pageType)return null;const[growth,digitalCommerce]=await Promise.all([resolveGrowthContext(instance.id,composed,runtime.capability),digitalCommerceRequest?getStorefrontDigitalCommerceRuntimeModel(instance.id,digitalCommerceRequest):Promise.resolve(null)]);const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor,socialLinks:resolveStorefrontSocialLinks(instance.storefront.socialLinks)},navigation:{primary:[]}};return{source:'published',instanceId:instance.id,page:failClosedSpecialCommerce(composed,runtime.capability),bindingContext:mergeDigitalCommerceContext(baseContext,digitalCommerce),capability:runtime.capability};}
export function resolveStorefrontTemplateAccountPreviewRuntimePage(templateKey:string,templateVersion?:number):StorefrontResolvedRuntimePage|null{
 const template=getStorefrontTemplatePackage(templateKey,templateVersion);
 if(!template)return null;
 const sourcePage=template.pages.find(page=>page.pageType==='account');
 if(!sourcePage)return null;
 const authored=applyTemplateAuthComposition(structuredClone(sourcePage));
 const composed=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(authored));
 if(composed.pageType!=='account')return null;
 const capability={plan:'pro' as const,features:[...PLANS.pro.features]};
 const bindingContext=createStorefrontTemplatePreviewBindingContext({template,page:composed});
 return{source:'preview',instanceId:`template-preview:${template.manifest.templateKey}`,page:failClosedSpecialCommerce(composed,capability),bindingContext,capability};
}

export async function resolveCurrentStorefrontAccountRuntimePage(customerId:string|null):Promise<StorefrontResolvedRuntimePage|null>{
 // Customer auth is public presentation. Preview may read the exact pilot account
 // draft without granting catalog/checkout/admin access, so visual acceptance does
 // not depend on an authenticated pilot session.
 const instance=await getCurrentWebshopInstance();if(!instance)return null;
 const request:StorefrontDigitalCommerceRuntimeRequest|null=customerId?{pageType:'account',customerId}:null;
 const previewDraft=process.env.VERCEL_ENV==='preview'
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
    const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor,socialLinks:resolveStorefrontSocialLinks(instance.storefront.socialLinks)},navigation:{primary:[]}};
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
 const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor,socialLinks:resolveStorefrontSocialLinks(instance.storefront.socialLinks)},navigation:{primary:[]}};
 return{source:'published',instanceId:instance.id,page:failClosedSpecialCommerce(authored,runtime.capability),bindingContext:mergeDigitalCommerceContext(baseContext,digitalCommerce),capability:runtime.capability};
}

async function resolveCurrentStorefrontPublicStaticRuntimePage(pageKey:StorefrontBuilderPageType):Promise<StorefrontResolvedRuntimePage|null>{
 const instance=process.env.VERCEL_ENV==='preview'?await getCurrentWebshopInstance():await requireStorefrontAccess();if(!instance)return null;
 const previewDraft=process.env.VERCEL_ENV==='preview'?await getPreviewStorefrontDraftPage(instance.id,pageKey):null;
 const[page,symbols,runtime]=await Promise.all([
  previewDraft?Promise.resolve(previewDraft):getPublishedStorefrontPage(instance.id,pageKey),
  listStorefrontReusableSymbolsForInstance(instance.id),
  resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan),
 ]);
 if(!page||!runtime||page.pageType!==pageKey)return null;
 const materialized=materializeStorefrontReusableSymbols(page,symbols);
 const composed=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(materialized));
 if(composed.pageType!==pageKey)return null;
 const growth=await resolveGrowthContext(instance.id,composed,runtime.capability);
 const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor,socialLinks:resolveStorefrontSocialLinks(instance.storefront.socialLinks)},navigation:{primary:[]}};
 return{source:previewDraft?'preview':'published',instanceId:instance.id,page:failClosedSpecialCommerce(composed,runtime.capability),bindingContext:baseContext,capability:runtime.capability};
}

export async function resolveCurrentStorefrontRouteRuntimePage(pageKey:StorefrontBuilderPageType):Promise<StorefrontResolvedRuntimePage|null>{
 return resolveCurrentStorefrontPublicStaticRuntimePage(pageKey);
}

const BLOG_DEMO_SLUG_PATTERN=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type PreviewDemoArticle={title:string;summary:string;image:string;imageAlt:string};
function findPreviewDemoArticle(nodes:readonly StorefrontPageDocument['sections'][number][],expectedHref:string):PreviewDemoArticle|null{
 for(const node of nodes){
  for(const binding of Object.values(node.bindings??{})){
   if(!binding||typeof binding!=='object')continue;
   const fallback=(binding as{fallback?:unknown}).fallback;
   if(!Array.isArray(fallback))continue;
   for(const raw of fallback){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
    const row=raw as Record<string,unknown>;
    if(row.href!==expectedHref)continue;
    const title=typeof row.title==='string'?row.title.trim():'';
    if(!title)continue;
    return{
     title,
     summary:typeof row.excerpt==='string'?row.excerpt.trim():'',
     image:typeof row.image==='string'?row.image.trim():'',
     imageAlt:typeof row.imageAlt==='string'?row.imageAlt.trim():title,
    };
   }
  }
  const nested=findPreviewDemoArticle(node.children??[],expectedHref);
  if(nested)return nested;
 }
 return null;
}
function previewDemoArticleFromIndex(page:StorefrontPageDocument,slug:string):PreviewDemoArticle|null{
 return findPreviewDemoArticle(page.sections,`/blog/${slug}`);
}

export async function resolveStorefrontPreviewDemoBlogArticleRuntime(slug:string):Promise<StorefrontResolvedRuntimePage|null>{
 if(process.env.VERCEL_ENV!=='preview'||!BLOG_DEMO_SLUG_PATTERN.test(slug))return null;
 const instance=await getCurrentWebshopInstance();if(!instance)return null;
 const index=await getPreviewStorefrontDraftPage(instance.id,'blog-index');if(!index)return null;
 const demo=previewDemoArticleFromIndex(index,slug);if(!demo)return null;
 const runtime=await resolveCurrentStorefrontPublicStaticRuntimePage('blog-article');
 if(!runtime||runtime.source!=='preview')return null;
 const currentContent=runtime.bindingContext.content&&typeof runtime.bindingContext.content==='object'&&!Array.isArray(runtime.bindingContext.content)
  ?runtime.bindingContext.content as Record<string,unknown>
  :{};
 return{
  ...runtime,
  bindingContext:{
   ...runtime.bindingContext,
   content:{
    ...currentContent,
    article:{
     title:demo.title,
     summary:demo.summary,
     image:demo.image,
     imageAlt:demo.imageAlt,
     body:demo.summary,
    },
   },
  },
 };
}

export async function resolveCurrentStorefrontHomeRuntimePage():Promise<StorefrontResolvedRuntimePage|null>{
 return resolveCurrentStorefrontPublicStaticRuntimePage('home');
}

export async function resolveCurrentStorefrontContentRuntimePage():Promise<StorefrontResolvedRuntimePage|null>{
 return resolveCurrentStorefrontPublicStaticRuntimePage('content');
}

export async function resolveCurrentStorefrontContactRuntimePage():Promise<StorefrontResolvedRuntimePage|null>{
 return resolveCurrentStorefrontPublicStaticRuntimePage('contact');
}

async function resolveCurrentStorefrontTaskRuntimePage(pageKey:'cart'|'checkout'):Promise<StorefrontResolvedRuntimePage|null>{
 const instance=await requireStorefrontBrowseAccess();if(!instance)return null;
 const previewDraft=process.env.VERCEL_ENV==='preview'?await getPreviewStorefrontDraftPage(instance.id,pageKey):null;
 const[page,symbols,runtime]=await Promise.all([
  previewDraft?Promise.resolve(previewDraft):getPublishedStorefrontPage(instance.id,pageKey),
  listStorefrontReusableSymbolsForInstance(instance.id),
  resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan),
 ]);
 if(!page||!runtime||page.pageType!==pageKey)return null;
 const materialized=materializeStorefrontReusableSymbols(page,symbols);
 const composed=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(materialized));
 const growth=await resolveGrowthContext(instance.id,composed,runtime.capability);
 const baseContext={...mergeGrowthContext(runtime.bindingContext,growth.promotions),brand:{name:instance.brand.name,tagline:instance.brand.tagline,logoUrl:instance.brand.logoUrl,primaryColor:instance.brand.primaryColor,socialLinks:resolveStorefrontSocialLinks(instance.storefront.socialLinks)},navigation:{primary:[]}};
 const bindingContext=previewDraft
  ?augmentStorefrontDigitalCommercePreviewContext({page:composed,context:baseContext,acceptanceMode:true})
  :baseContext;
 return{source:previewDraft?'preview':'published',instanceId:instance.id,page:failClosedSpecialCommerce(composed,runtime.capability),bindingContext,capability:runtime.capability};
}

export async function resolveCurrentStorefrontCartRuntimePage():Promise<StorefrontResolvedRuntimePage|null>{
 return resolveCurrentStorefrontTaskRuntimePage('cart');
}

export async function resolveCurrentStorefrontCheckoutRuntimePage():Promise<StorefrontResolvedRuntimePage|null>{
 return resolveCurrentStorefrontTaskRuntimePage('checkout');
}

export async function resolveCurrentStorefrontPostPurchaseRuntimePage():Promise<StorefrontResolvedRuntimePage|null>{
 return resolveCurrentStorefrontTaskRuntimePage('checkout');
}
export async function resolveStorefrontPreviewRuntimePage(token:string):Promise<StorefrontResolvedRuntimePage|null>{if(typeof token!=='string'||token.length<32||token.length>256)return null;const[page,instanceId]=await Promise.all([resolveStorefrontPreviewToken(token),resolveStorefrontPreviewInstanceId(token)]);if(!page||!instanceId)return null;const runtime=await resolveRuntimeCommerceContext(instanceId);if(!runtime)return null;const composedPage=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(page));const growth=await resolveGrowthContext(instanceId,composedPage,runtime.capability);const previewContext=augmentStorefrontDigitalCommercePreviewContext({page:composedPage,context:mergeGrowthContext(runtime.bindingContext,growth.promotions)});return{source:'preview',instanceId,page:failClosedSpecialCommerce(composedPage,runtime.capability),bindingContext:previewContext,capability:runtime.capability};}
