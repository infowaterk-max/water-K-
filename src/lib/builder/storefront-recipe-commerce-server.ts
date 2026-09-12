import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import type {ComposerCatalogItem} from '@/lib/commerce/multi-product-composer';
import type {RecipeDefinition,RecipeIngredient,RecipeStructuredClaim} from '@/lib/commerce/recipe-commerce';

export type StorefrontRecipeOption={recipeKey:string;title:string;baseServings:number;minServings:number;maxServings:number};
export type StorefrontRecipeCommerceBundle={
  recipes:readonly RecipeDefinition[];
  options:readonly StorefrontRecipeOption[];
  catalog:readonly ComposerCatalogItem[];
};

type RecipeRow={id:string;recipe_key:string;title:string;summary:string|null;base_servings:number;min_servings:number;max_servings:number};
type IngredientRow={id:string;recipe_id:string;ingredient_key:string;label:string;quantity_display:string;commerce_mode:'required'|'optional'|'informational';base_cart_quantity:number|null;scaling_policy:'fixed'|'proportional-ceil'|null;sort_order:number};
type MappingRow={recipe_id:string;ingredient_id:string;mapping_key:string;product_id:string;variant_id:string;label:string|null;sort_order:number};
type ClaimRow={recipe_id:string;claim_type:'allergen'|'dietary';claim_code:string;status:'contains'|'may-contain'|'free-from'|'meets'|'does-not-meet';source:'merchant-structured-data'|'certified-source';evidence_ref:string|null};
type ProductRow={id:string;slug:string;name:string;active:boolean;audience:string|null};
type VariantRow={id:string;product_id:string;label:string;gross_price_huf:number;stock_quantity:number;active:boolean};
type ChannelRow={product_id:string;visible:boolean;gross_price:number|null;discount_percent:number|null};

const applyDiscount=(value:number,discount:number|null)=>discount==null?value:Math.max(0,Math.round(value*(1-Math.min(100,Math.max(0,discount))/100)));
const priceDisplay=(value:number)=>`${new Intl.NumberFormat('hu-HU').format(value)} Ft`;

export async function getStorefrontRecipeCommerceBundleForInstance(instanceId:string):Promise<StorefrontRecipeCommerceBundle>{
  const admin=createAdminClient();
  const recipeResult=await admin.from('recipe_definitions').select('id,recipe_key,title,summary,base_servings,min_servings,max_servings').eq('instance_id',instanceId).eq('active',true).order('updated_at',{ascending:false}).limit(200);
  if(recipeResult.error)throw new Error(`RECIPE_COMMERCE_RECIPES_FAILED:${recipeResult.error.message}`);
  const recipes=(recipeResult.data??[]) as RecipeRow[];
  if(!recipes.length)return{recipes:[],options:[],catalog:[]};
  const recipeIds=recipes.map(recipe=>recipe.id);
  const[ingredientResult,claimResult]=await Promise.all([
    admin.from('recipe_ingredients').select('id,recipe_id,ingredient_key,label,quantity_display,commerce_mode,base_cart_quantity,scaling_policy,sort_order').eq('instance_id',instanceId).in('recipe_id',recipeIds).order('sort_order'),
    admin.from('recipe_food_claims').select('recipe_id,claim_type,claim_code,status,source,evidence_ref').eq('instance_id',instanceId).in('recipe_id',recipeIds).order('claim_type').order('claim_code'),
  ]);
  if(ingredientResult.error)throw new Error(`RECIPE_COMMERCE_INGREDIENTS_FAILED:${ingredientResult.error.message}`);
  if(claimResult.error)throw new Error(`RECIPE_COMMERCE_CLAIMS_FAILED:${claimResult.error.message}`);
  const ingredients=(ingredientResult.data??[]) as IngredientRow[];
  const ingredientIds=ingredients.map(item=>item.id);
  const mappingResult=ingredientIds.length?await admin.from('recipe_ingredient_mappings').select('recipe_id,ingredient_id,mapping_key,product_id,variant_id,label,sort_order').eq('instance_id',instanceId).in('ingredient_id',ingredientIds).order('sort_order'):{data:[],error:null};
  if(mappingResult.error)throw new Error(`RECIPE_COMMERCE_MAPPINGS_FAILED:${mappingResult.error.message}`);
  const mappings=(mappingResult.data??[]) as MappingRow[];
  const productIds=[...new Set(mappings.map(item=>item.product_id))];
  const[productResult,variantResult,channelResult]=productIds.length?await Promise.all([
    admin.from('products').select('id,slug,name,active,audience').eq('instance_id',instanceId).in('id',productIds),
    admin.from('product_variants').select('id,product_id,label,gross_price_huf,stock_quantity,active').eq('instance_id',instanceId).in('product_id',productIds),
    admin.from('product_channel_settings').select('product_id,visible,gross_price,discount_percent').eq('instance_id',instanceId).eq('channel_code','b2c').in('product_id',productIds),
  ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}];
  if(productResult.error)throw new Error(`RECIPE_COMMERCE_PRODUCTS_FAILED:${productResult.error.message}`);
  if(variantResult.error)throw new Error(`RECIPE_COMMERCE_VARIANTS_FAILED:${variantResult.error.message}`);
  if(channelResult.error)throw new Error(`RECIPE_COMMERCE_CHANNEL_FAILED:${channelResult.error.message}`);
  const products=new Map(((productResult.data??[]) as ProductRow[]).map(item=>[item.id,item]));
  const variants=(variantResult.data??[]) as VariantRow[];
  const variantsById=new Map(variants.map(item=>[item.id,item]));
  const activeVariantCount=new Map<string,number>();
  for(const variant of variants)if(variant.active)activeVariantCount.set(variant.product_id,(activeVariantCount.get(variant.product_id)??0)+1);
  const channelByProduct=new Map(((channelResult.data??[]) as ChannelRow[]).map(item=>[item.product_id,item]));
  const mappedVariantIds=new Set(mappings.map(item=>item.variant_id));
  const catalog:ComposerCatalogItem[]=[];
  for(const variantId of mappedVariantIds){
    const variant=variantsById.get(variantId);if(!variant)continue;
    const product=products.get(variant.product_id);if(!product)continue;
    const channel=channelByProduct.get(product.id);
    const channelVisible=channel?channel.visible:product.audience!=='professional';
    const explicitPrice=channel?.gross_price!=null&&(activeVariantCount.get(product.id)??0)===1;
    const baseGross=explicitPrice?Math.max(0,Number(channel?.gross_price)):Math.max(0,Number(variant.gross_price_huf));
    const gross=explicitPrice?baseGross:applyDiscount(baseGross,channel?.discount_percent==null?null:Number(channel.discount_percent));
    catalog.push({
      productId:product.id,
      variantId:variant.id,
      label:[product.name,variant.label].filter(Boolean).join(' · '),
      href:`/termek/${encodeURIComponent(product.slug)}`,
      eligible:product.active&&variant.active,
      channelVisible,
      price:{amountMinor:gross,currency:'HUF',display:priceDisplay(gross),source:'shared-pricing-authority'},
      stock:{available:variant.stock_quantity>0,statusLabel:variant.stock_quantity>0?'Készleten':'Jelenleg nem készleten'},
    });
  }
  const mappingByIngredient=new Map<string,MappingRow[]>();
  for(const mapping of mappings){const list=mappingByIngredient.get(mapping.ingredient_id)??[];list.push(mapping);mappingByIngredient.set(mapping.ingredient_id,list);}
  const ingredientsByRecipe=new Map<string,RecipeIngredient[]>();
  for(const ingredient of ingredients){
    const recipeIngredients=ingredientsByRecipe.get(ingredient.recipe_id)??[];
    recipeIngredients.push({
      ingredientId:ingredient.ingredient_key,
      label:ingredient.label,
      quantityDisplay:ingredient.quantity_display,
      commerceMode:ingredient.commerce_mode,
      ...(ingredient.commerce_mode==='informational'?{}:{baseCartQuantity:Number(ingredient.base_cart_quantity),scalingPolicy:ingredient.scaling_policy??'fixed',mappings:(mappingByIngredient.get(ingredient.id)??[]).map(mapping=>({mappingId:mapping.mapping_key,productId:mapping.product_id,variantId:mapping.variant_id,label:mapping.label??undefined}))}),
    });
    ingredientsByRecipe.set(ingredient.recipe_id,recipeIngredients);
  }
  const claimsByRecipe=new Map<string,RecipeStructuredClaim[]>();
  for(const claim of(claimResult.data??[]) as ClaimRow[]){
    const list=claimsByRecipe.get(claim.recipe_id)??[];
    list.push({claimType:claim.claim_type,claimCode:claim.claim_code,status:claim.status,source:claim.source,evidenceRef:claim.evidence_ref});
    claimsByRecipe.set(claim.recipe_id,list);
  }
  const definitions=recipes.map(recipe=>({
    version:1 as const,
    tenantId:instanceId,
    recipeKey:recipe.recipe_key,
    title:recipe.title,
    baseServings:recipe.base_servings,
    minServings:recipe.min_servings,
    maxServings:recipe.max_servings,
    ingredients:ingredientsByRecipe.get(recipe.id)??[],
    claims:claimsByRecipe.get(recipe.id)??[],
  }));
  return{
    recipes:Object.freeze(definitions),
    options:Object.freeze(definitions.map(recipe=>({recipeKey:recipe.recipeKey,title:recipe.title,baseServings:recipe.baseServings,minServings:recipe.minServings,maxServings:recipe.maxServings}))),
    catalog:Object.freeze(catalog),
  };
}

export async function getCurrentStorefrontRecipeCommerceBundle(){
  const scope=await requireCurrentStoreContext('store.read');
  return getStorefrontRecipeCommerceBundleForInstance(scope.instanceId);
}
