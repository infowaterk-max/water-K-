import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const nullable=(max:number)=>z.union([z.string().trim().max(max),z.null()]).optional();
const schema=z.object({
  trackingNumber:nullable(120),
  invoiceNumber:nullable(120),
  invoiceUrl:z.union([z.string().trim().url().max(1000),z.literal(''),z.null()]).optional(),
  paymentReference:nullable(200)
}).refine(v=>Object.keys(v).length>0,'Nincs módosítás.');

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('orders.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;
  try{scope=await requireCurrentStoreContext('orders.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen rendelésazonosító.'},{status:400});
  let raw:unknown;
  try{raw=await request.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen teljesítési adat.'},{status:400});

  const a=createAdminClient();
  const{data:current,error:readError}=await a.from('orders').select('updated_at').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(readError||!current)return NextResponse.json({error:'A rendelés nem található ebben a webshopban.'},{status:404});

  const{data,error}=await a.rpc('admin_update_manual_fulfillment_v2',{
    p_instance_id:scope.instanceId,
    p_order_id:id,
    p_actor:actor.id,
    p_expected_updated_at:current.updated_at,
    p_patch:parsed.data
  });
  if(error){
    if(error.message.includes('STALE_MANUAL_FULFILLMENT'))return NextResponse.json({error:'A rendelést időközben módosították. Frissítsd az oldalt.'},{status:409});
    if(error.message.includes('ORDER_NOT_FOUND'))return NextResponse.json({error:'A rendelés nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('ORDER_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A kézi teljesítési adatok mentése nem sikerült. Egyetlen változás sem került alkalmazásra.'},{status:500});
  }
  if(!(data as {id?:string}|null)?.id)return NextResponse.json({error:'A kézi teljesítés mentése nem igazolható.'},{status:500});
  return NextResponse.json({ok:true});
}
