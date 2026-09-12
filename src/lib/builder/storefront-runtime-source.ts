import 'server-only';
import type {StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import {getPublishedStorefrontPage,resolveStorefrontPreviewToken} from '@/lib/builder/storefront-persistence';
import {listStorefrontReusableSymbolsForInstance} from '@/lib/builder/storefront-reusable-symbol-persistence';
import {materializeStorefrontReusableSymbols} from '@/lib/builder/storefront-linked-symbols';
import {requireStorefrontAccess} from '@/lib/storefront/access';
import {getStorefrontInteractiveSceneCatalogForInstance} from '@/lib/builder/storefront-interactive-scene-server';
import {getStorefrontRecipeCommerceBundleForInstance} from '@/lib/builder/storefront-recipe-commerce-server';
import {getStorefrontRuntimeCapabilityForInstance} from '@/lib/builder/storefront-runtime-capability-server';
import {resolveStorefrontPreviewInstanceId} from '@/lib/builder/storefront-preview-context';

const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type StorefrontResolvedRuntimePage={
  source:'published'|'preview';
  instanceId:string;
  page:StorefrontPageDocument;
  bindingContext:Record<string,unknown>;
  capability:StorefrontRuntimeCapabilityContext;
};

function failClosedSpecialCommerce(page:StorefrontPageDocument,capability:StorefrontRuntimeCapabilityContext):StorefrontPageDocument{
  const enabledFeatures=new Set(capability.features);
  const allowed=(componentKey:string)=>{
    if(componentKey==='commerce.interactive-scene')return enabledFeatures.has('interactiveSceneCommerce');
    if(componentKey==='commerce.recipe')return enabledFeatures.has('recipeCommerce');
    return true;
  };
  const prune=(nodes:StorefrontPageDocument['sections']):StorefrontPageDocument['sections']=>nodes
    .filter(node=>allowed(node.componentKey))
    .map(node=>({...node,...(node.children?{children:prune(node.children)}:{})}));
  return{...page,sections:prune(page.sections)};
}

async function resolveRuntimeCommerceContext(instanceId:string,knownPlan?:StorefrontRuntimeCapabilityContext['plan']){
  const capability=await getStorefrontRuntimeCapabilityForInstance(instanceId,knownPlan);
  if(!capability)return null;
  const enabledFeatures=new Set(capability.features);
  const[sceneCatalog,recipeBundle]=await Promise.all([
    getStorefrontInteractiveSceneCatalogForInstance(instanceId),
    enabledFeatures.has('recipeCommerce')
      ?getStorefrontRecipeCommerceBundleForInstance(instanceId)
      :Promise.resolve({recipes:[],options:[],catalog:[]} as const),
  ]);
  return{
    capability,
    bindingContext:{
      catalog:{
        interactiveSceneProducts:sceneCatalog.products,
        recipeDefinitions:recipeBundle.recipes,
        recipeProducts:recipeBundle.catalog,
      },
    } as Record<string,unknown>,
  };
}

/**
 * Resolve the published Page Schema for the current storefront host/context.
 * Linked reusable symbols and global header/footer are materialized immediately
 * before the existing renderer. The published page document remains immutable.
 */
export async function resolveCurrentStorefrontPublishedRuntimePage(
  pageKey:string,
):Promise<StorefrontResolvedRuntimePage|null>{
  if(!PAGE_KEY_PATTERN.test(pageKey))return null;
  const instance=await requireStorefrontAccess();
  if(!instance)return null;
  const[page,symbols,runtime]=await Promise.all([
    getPublishedStorefrontPage(instance.id,pageKey),
    listStorefrontReusableSymbolsForInstance(instance.id),
    resolveRuntimeCommerceContext(instance.id,instance.subscriptionPlan),
  ]);
  if(!page||!runtime)return null;
  const materialized=materializeStorefrontReusableSymbols(page,symbols);
  return{
    source:'published',instanceId:instance.id,
    page:failClosedSpecialCommerce(materialized,runtime.capability),
    bindingContext:{
      ...runtime.bindingContext,
      brand:{
        name:instance.brand.name,
        tagline:instance.brand.tagline,
        logoUrl:instance.brand.logoUrl,
        primaryColor:instance.brand.primaryColor,
      },
      navigation:{primary:[]},
    },
    capability:runtime.capability,
  };
}

/**
 * Preview tokens stay immutable bearer snapshots. Linked instances are already
 * rebased into the saved draft before token creation. Commerce truth is intentionally
 * read at render time so prices, stock and product eligibility remain authoritative.
 */
export async function resolveStorefrontPreviewRuntimePage(
  token:string,
):Promise<StorefrontResolvedRuntimePage|null>{
  if(typeof token!=='string'||token.length<32||token.length>256)return null;
  const[page,instanceId]=await Promise.all([
    resolveStorefrontPreviewToken(token),
    resolveStorefrontPreviewInstanceId(token),
  ]);
  if(!page||!instanceId)return null;
  const runtime=await resolveRuntimeCommerceContext(instanceId);
  if(!runtime)return null;
  return{
    source:'preview',instanceId,
    page:failClosedSpecialCommerce(page,runtime.capability),
    bindingContext:runtime.bindingContext,
    capability:runtime.capability,
  };
}
