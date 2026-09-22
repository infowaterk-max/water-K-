import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const schema=z.union([z.object({status:z.enum(['approved','ordered','received','cancelled'])}),z.object({status:z.literal('partial_receipt'),items:z.array(z.object({itemId:z.string().uuid(),quantity:z.number().int().positive().max(100000)})).min(1).max(100)})]);

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('procurement.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('procurement.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  if(!(await hasCurrentPlanFeature('procurement')))return NextResponse.json({error:'A beszerzés a Pro csomag része.'},{status:403});
  const{id}=await params;if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen beszerzési azonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const p=schema.safeParse(raw);if(!p.success)return NextResponse.json({error:'Érvénytelen beszerzési művelet.'},{status:400});
  if(p.data.status==='partial_receipt'){
    const unique=new Set(p.data.items.map(x=>x.itemId));
    if(unique.size!==p.data.items.length)return NextResponse.json({error:'Ugyanaz a beszerzési tétel csak egyszer adható meg.'},{status:400});
  }

  const a=createAdminClient();
  const{data,error}=await a.rpc('admin_manage_purchase_order_v3',{
    p_instance_id:scope.instanceId,p_purchase_order_id:id,p_actor:actor.id,p_action:p.data.status,
    p_payload:p.data.status==='partial_receipt'?{items:p.data.items}:{}
  });
  if(error){
    if(error.message.includes('PROCUREMENT_NOT_FOUND'))return NextResponse.json({error:'A beszerzés nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('PROCUREMENT_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:error.message||'A beszerzési művelet nem sikerült.'},{status:409});
  }
  if(!data)return NextResponse.json({error:'A beszerzési művelet eredménye nem igazolható.'},{status:500});
  if(p.data.status==='partial_receipt')return NextResponse.json({ok:true,receipt:data});
  if(p.data.status==='received')return NextResponse.json({ok:true,status:'received',receipt:data});
  return NextResponse.json({ok:true,status:p.data.status});
}
