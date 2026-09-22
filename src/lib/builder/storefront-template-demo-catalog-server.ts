import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';

export type StorefrontTemplateDemoCatalogStatus={
  realProductCount:number;
  fixtureProductCount:number;
  adoptedProductCount:number;
  activeProductCount:number;
};

export async function getStorefrontTemplateDemoCatalogStatusForInstance(instanceId:string):Promise<StorefrontTemplateDemoCatalogStatus>{
  const admin=createAdminClient();
  const[productsResult,variantsResult]=await Promise.all([
    admin.from('products')
      .select('id,active,template_demo_state')
      .eq('instance_id',instanceId)
      .eq('active',true),
    admin.from('product_variants')
      .select('product_id,active')
      .eq('instance_id',instanceId)
      .eq('active',true),
  ]);
  if(productsResult.error)throw new Error(`STOREFRONT_DEMO_CATALOG_STATUS_PRODUCTS_FAILED:${productsResult.error.message}`);
  if(variantsResult.error)throw new Error(`STOREFRONT_DEMO_CATALOG_STATUS_VARIANTS_FAILED:${variantsResult.error.message}`);
  const activeProductIds=new Set((variantsResult.data??[]).map(row=>String(row.product_id)));
  let realProductCount=0,fixtureProductCount=0,adoptedProductCount=0,activeProductCount=0;
  for(const product of productsResult.data??[]){
    if(!activeProductIds.has(String(product.id)))continue;
    activeProductCount++;
    const state=product.template_demo_state;
    if(state==='fixture')fixtureProductCount++;
    else{
      realProductCount++;
      if(state==='adopted')adoptedProductCount++;
    }
  }
  return{realProductCount,fixtureProductCount,adoptedProductCount,activeProductCount};
}
