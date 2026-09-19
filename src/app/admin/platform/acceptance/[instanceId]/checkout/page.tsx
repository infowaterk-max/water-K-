import {redirect} from 'next/navigation';
import {requirePlatformOperator} from '@/lib/auth/platform-operator';
import {createAdminClient} from '@/lib/supabase/admin';
import {getPilotAcceptanceInstanceId} from '@/lib/storefront/pilot-access';
import {CheckoutAcceptanceSeeder} from './checkout-acceptance-seeder';

export const dynamic='force-dynamic';

type Props={params:Promise<{instanceId:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CheckoutAcceptancePage({params}:Props){
  if(process.env.VERCEL_ENV!=='preview')redirect('/admin/platform');
  await requirePlatformOperator();
  const{instanceId}=await params;
  if(!UUID.test(instanceId))redirect('/admin/platform');
  const acceptedInstanceId=await getPilotAcceptanceInstanceId();
  if(acceptedInstanceId!==instanceId)redirect(`/admin/platform/acceptance/${instanceId}?reason=session`);

  const admin=createAdminClient();
  const{error:symbolSchemaError}=await admin
    .from('storefront_reusable_symbols')
    .select('id')
    .eq('instance_id',instanceId)
    .limit(1);
  if(symbolSchemaError)return <main className="adminMain">
    <span className="eyebrow">Phase 4 · Checkout acceptance</span>
    <h1 className="sectionTitle">Az acceptance adatbázis nincs a szükséges sémán.</h1>
    <p className="lead">A checkout-template runtime a reusable symbol sémára támaszkodik. A tesztet addig nem indítjuk el, amíg a staging migráció nincs alkalmazva.</p>
    <div className="errorNotice" role="alert"><strong>STOREFRONT_SYMBOL_SCHEMA_REQUIRED</strong><br/>{symbolSchemaError.message}</div>
  </main>;
  const{data:products,error:productError}=await admin
    .from('products')
    .select('id,name,slug')
    .eq('instance_id',instanceId)
    .eq('active',true)
    .in('slug',['acceptance-physical-product','acceptance-digital-product']);
  if(productError||!products||products.length!==2)redirect(`/admin/platform/acceptance/${instanceId}?reason=session`);

  const productIds=products.map(product=>product.id);
  const{data:variants,error:variantError}=await admin
    .from('product_variants')
    .select('id,product_id,gross_price_huf,active')
    .eq('instance_id',instanceId)
    .eq('active',true)
    .in('product_id',productIds);
  if(variantError||!variants)redirect(`/admin/platform/acceptance/${instanceId}?reason=session`);

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
    .filter((item):item is NonNullable<typeof item>=>Boolean(item));

  if(items.length!==2)redirect(`/admin/platform/acceptance/${instanceId}?reason=session`);

  return <main className="adminMain">
    <span className="eyebrow">Phase 4 · Checkout acceptance</span>
    <h1 className="sectionTitle">Valódi pénztár runtime teszt</h1>
    <p className="lead">Ez a preview-only segédoldal ugyanazon a domainen tölti be a mixed acceptance kosarat, amelyet a valódi /penztar runtime olvas.</p>
    <CheckoutAcceptanceSeeder items={items}/>
  </main>;
}
