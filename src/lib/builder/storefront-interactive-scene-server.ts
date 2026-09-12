import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import type {InteractiveSceneProductProjection} from '@/lib/commerce/interactive-scene';
import type {StorefrontInteractiveSceneProductOption} from '@/lib/builder/storefront-interactive-scene';

export type StorefrontInteractiveSceneCatalog={
  products:readonly InteractiveSceneProductProjection[];
  options:readonly StorefrontInteractiveSceneProductOption[];
};

const formatHuf=(value:number)=>`${new Intl.NumberFormat('hu-HU').format(value)} Ft`;

/** Tenant-scoped read model for Builder selection/preview. It owns no commerce state. */
export async function getCurrentStorefrontInteractiveSceneCatalog():Promise<StorefrontInteractiveSceneCatalog>{
  const scope=await requireCurrentStoreContext('store.read');
  const admin=createAdminClient();
  const[productResult,variantResult]=await Promise.all([
    admin.from('products').select('id,slug,name,active').eq('instance_id',scope.instanceId).eq('active',true).order('name').limit(500),
    admin.from('product_variants').select('product_id,gross_price_huf,stock_quantity,active').eq('instance_id',scope.instanceId).eq('active',true),
  ]);
  if(productResult.error)throw new Error(`INTERACTIVE_SCENE_PRODUCTS_FAILED:${productResult.error.message}`);
  if(variantResult.error)throw new Error(`INTERACTIVE_SCENE_VARIANTS_FAILED:${variantResult.error.message}`);
  const variantsByProduct=new Map<string,{gross_price_huf:number;stock_quantity:number}[]>();
  for(const row of variantResult.data??[]){
    const list=variantsByProduct.get(row.product_id)??[];
    list.push({gross_price_huf:Number(row.gross_price_huf??0),stock_quantity:Number(row.stock_quantity??0)});
    variantsByProduct.set(row.product_id,list);
  }
  const products=(productResult.data??[]).map(product=>{
    const variants=variantsByProduct.get(product.id)??[];
    const prices=variants.map(variant=>variant.gross_price_huf).filter(value=>Number.isFinite(value)&&value>=0);
    const minPrice=prices.length?Math.min(...prices):null;
    const maxPrice=prices.length?Math.max(...prices):null;
    const stock=variants.reduce((sum,variant)=>sum+Math.max(0,variant.stock_quantity),0);
    return{
      productId:product.id,
      label:product.name,
      href:`#product-${product.id}`,
      eligible:Boolean(product.active&&variants.length),
      priceDisplay:minPrice===null?null:minPrice===maxPrice?formatHuf(minPrice):`${formatHuf(minPrice)}-tól`,
      stockLabel:variants.length?(stock>0?'Készleten':'Jelenleg nem készleten'):null,
      imageUrl:null,
    } satisfies InteractiveSceneProductProjection;
  });
  return{
    products:Object.freeze(products),
    options:Object.freeze(products.filter(product=>product.eligible).map(product=>({productId:product.productId,label:product.label}))),
  };
}
