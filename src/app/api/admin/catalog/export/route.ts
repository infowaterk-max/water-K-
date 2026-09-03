import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const cell=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;

export async function GET(){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return new Response('Nincs jogosultság.',{status:403});
  let scope;
  try{scope=await requireCurrentStoreContext('catalog.manage')}
  catch{return new Response('Nincs jogosultság ehhez a webshophoz.',{status:403})}

  const admin=createAdminClient();
  const{data,error}=await admin.from('product_variants')
    .select('id,sku,label,stock_quantity,net_price_huf,gross_price_huf,active,products!inner(name,instance_id)')
    .eq('instance_id',scope.instanceId)
    .eq('products.instance_id',scope.instanceId)
    .order('sku');

  if(error)return new Response('Export hiba.',{status:500});
  const lines=[
    ['id','sku','name','label','stock','net_price','gross_price','active'].join(','),
    ...(data??[]).map((r:any)=>[r.id,r.sku,r.products?.name??'',r.label,r.stock_quantity,r.net_price_huf,r.gross_price_huf,r.active].map(cell).join(','))
  ];
  return new Response('\uFEFF'+lines.join('\n'),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="termekek.csv"','cache-control':'no-store'}});
}
