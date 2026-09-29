import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';

export type CheckoutAcceptanceCartItem={
  productId:string;
  variantId:string;
  slug:string;
  name:string;
  unitPrice:number;
  quantity:number;
  minimumQuantity:number;
  orderMultiple:number;
};

export type CheckoutAcceptanceFixtureResult=
  |{ok:true;items:CheckoutAcceptanceCartItem[]}
  |{ok:false;code:string;message:string};

const fail=(code:string,message:string):CheckoutAcceptanceFixtureResult=>({ok:false,code,message});

export async function prepareCheckoutAcceptanceFixture(instanceId:string):Promise<CheckoutAcceptanceFixtureResult>{
  if(process.env.VERCEL_ENV!=='preview')return fail('CHECKOUT_ACCEPTANCE_PREVIEW_ONLY','A checkout acceptance fixture csak Preview környezetben használható.');
  const admin=createAdminClient();

  const{error:couponFixtureError}=await admin.from('coupons').upsert({
    instance_id:instanceId,
    code:'ACCEPT10',
    description:'Preview-only Phase 4 acceptance coupon · 10%',
    discount_type:'percent',
    discount_value:10,
    min_subtotal_huf:0,
    max_discount_huf:null,
    usage_limit:null,
    starts_at:null,
    ends_at:null,
    active:true,
  },{onConflict:'instance_id,code'});
  if(couponFixtureError)return fail('ACCEPTANCE_COUPON_FIXTURE_REQUIRED',couponFixtureError.message);

  const{error:symbolSchemaError}=await admin
    .from('storefront_reusable_symbols')
    .select('id')
    .eq('instance_id',instanceId)
    .limit(1);
  if(symbolSchemaError)return fail('STOREFRONT_SYMBOL_SCHEMA_REQUIRED',symbolSchemaError.message);

  const{data:products,error:productError}=await admin
    .from('products')
    .select('id,name,slug')
    .eq('instance_id',instanceId)
    .eq('active',true)
    .in('slug',['acceptance-physical-product','acceptance-digital-product']);
  if(productError||!products||products.length!==2)return fail('ACCEPTANCE_PRODUCTS_REQUIRED',productError?.message??'A két acceptance termék nem érhető el.');

  const productIds=products.map(product=>product.id);
  const{data:variants,error:variantError}=await admin
    .from('product_variants')
    .select('id,product_id,gross_price_huf,active')
    .eq('instance_id',instanceId)
    .eq('active',true)
    .in('product_id',productIds);
  if(variantError||!variants)return fail('ACCEPTANCE_VARIANTS_REQUIRED',variantError?.message??'Az acceptance termékváltozatok nem érhetők el.');

  const variantByProduct=new Map(variants.map(variant=>[variant.product_id,variant]));
  const items=products
    .sort((a,b)=>a.slug.localeCompare(b.slug))
    .map(product=>{
      const variant=variantByProduct.get(product.id);
      if(!variant)return null;
      return{
        productId:product.id,
        variantId:variant.id,
        slug:product.slug,
        name:product.name,
        unitPrice:Number(variant.gross_price_huf??0),
        quantity:1,
        minimumQuantity:1,
        orderMultiple:1,
      };
    })
    .filter((item):item is CheckoutAcceptanceCartItem=>Boolean(item));

  if(items.length!==2)return fail('ACCEPTANCE_VARIANTS_REQUIRED','Mindkét acceptance termékhez aktív változat szükséges.');
  return{ok:true,items};
}
