import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{recordAdminAudit}from'@/lib/admin/audit';
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
  const a=createAdminClient(),{data:po,error}=await a.from('purchase_orders').select('id,order_number,status').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(error||!po)return NextResponse.json({error:'A beszerzés nem található ebben a webshopban.'},{status:404});
  if(p.data.status==='partial_receipt'){
    const unique=new Set(p.data.items.map(x=>x.itemId));if(unique.size!==p.data.items.length)return NextResponse.json({error:'Ugyanaz a beszerzési tétel csak egyszer adható meg.'},{status:400});
    const{data:receipt,error:receiptError}=await a.rpc('receive_purchase_order_items_v2',{p_instance_id:scope.instanceId,p_purchase_order_id:id,p_actor:actor.id,p_items:p.data.items});
    if(receiptError)return NextResponse.json({error:receiptError.message||'A részleges készletbevételezés nem sikerült.'},{status:409});
    await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:'procurement.partial_receipt',entityType:'purchase_order',entityId:id,summary:`${po.order_number}: részleges bevételezés`,beforeState:{status:po.status},afterState:receipt});
    return NextResponse.json({ok:true,receipt});
  }
  if(p.data.status==='received'){
    const{data:receipt,error:receiptError}=await a.rpc('receive_purchase_order_v2',{p_instance_id:scope.instanceId,p_purchase_order_id:id,p_actor:actor.id});
    if(receiptError)return NextResponse.json({error:receiptError.message||'A készletbevételezés nem sikerült.'},{status:409});
    await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:'procurement.received',entityType:'purchase_order',entityId:id,summary:`${po.order_number} → received`,beforeState:{status:po.status},afterState:{status:'received',receipt}});
    return NextResponse.json({ok:true,status:'received',receipt});
  }
  const{data:transition,error:te}=await a.rpc('transition_purchase_order_v2',{p_instance_id:scope.instanceId,p_purchase_order_id:id,p_target_status:p.data.status,p_actor:actor.id});
  if(te)return NextResponse.json({error:te.message||'A beszerzés állapotváltása nem sikerült.'},{status:409});
  await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:`procurement.${p.data.status}`,entityType:'purchase_order',entityId:id,summary:`${po.order_number} → ${p.data.status}`,beforeState:{status:po.status},afterState:{status:p.data.status,transition}});
  return NextResponse.json({ok:true,status:p.data.status});
}
