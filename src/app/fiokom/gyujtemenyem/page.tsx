import {redirect} from 'next/navigation';
import {AccountCollectionGrid} from '@/components/account/account-collection-grid';
import {createClient} from '@/lib/supabase/server';
import {getCurrentWebshopInstance} from '@/lib/instances/access';
import {getProducts} from '@/lib/catalog-server';

const OWNED_ORDER_STATUSES=['paid','processing','shipped','completed'] as const;

export default async function CollectionPage(){
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/fiokom?next=/fiokom/gyujtemenyem');
  const instance=await getCurrentWebshopInstance();
  if(!instance)redirect('/fiokom');

  const[catalog,{data:orders,error:ordersError}]=await Promise.all([
    getProducts(),
    supabase.from('orders').select('id').eq('instance_id',instance.id).eq('customer_id',user.id).in('status',[...OWNED_ORDER_STATUSES]).limit(1000),
  ]);
  const orderIds=(orders??[]).map(order=>order.id);
  const{data:orderItems,error:itemsError}=orderIds.length
    ?await supabase.from('order_items').select('variant_id').eq('instance_id',instance.id).in('order_id',orderIds)
    :{data:[] as Array<{variant_id:string|null}>,error:null};
  const ownedVariantIds=new Set((orderItems??[]).flatMap(item=>item.variant_id?[item.variant_id]:[]));
  const loadError=Boolean(ordersError||itemsError);

  return <main className="section accountPage"><div className="shell">
    <div className="sectionIntro"><div><span className="eyebrow">{instance.brand.name} fiók</span><h1 className="sectionTitle">Gyűjteményem</h1><p className="lead">A megszerzett és még hiányzó katalógustételek külön nézete. Ez nem a kívánságlista: a „Megvan” állapot a saját rendelési előzményeidből származik.</p></div></div>
    {loadError?<div className="errorNotice" role="alert"><strong>A vásárlási előzmények egy része most nem tölthető be.</strong><p>Hiányos adatok mellett nem jelölünk terméket tévesen megszerzettként.</p></div>:null}
    <AccountCollectionGrid items={catalog.map(product=>({id:product.id,name:product.name,href:`/termek/${product.slug}`,imageUrl:product.imageUrl??null,owned:!loadError&&ownedVariantIds.has(product.id)}))}/>
  </div></main>;
}
