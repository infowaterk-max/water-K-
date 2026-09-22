import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const statuses=['requested','approved','rejected','received','refund_pending','refunded','closed']as const;
const schema=z.object({status:z.enum(statuses),refundAmount:z.union([z.number().int().min(0).max(10000000),z.null()]).optional(),refundReference:z.union([z.string().trim().max(200),z.null()]).optional(),adminNote:z.union([z.string().trim().max(2000),z.null()]).optional(),restock:z.boolean().optional().default(false)});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('orders.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('orders.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen ügyazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen ügyadat.'},{status:400});

  const a=createAdminClient();
  const{data:current,error:ce}=await a.from('return_cases').select('status,refund_amount_gross_huf,refund_reference,admin_note,updated_at').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(ce||!current)return NextResponse.json({error:'Az ügy nem található ebben a webshopban.'},{status:404});
  const restock=parsed.data.restock;
  if(restock&&!['received','refund_pending','refunded','closed'].includes(parsed.data.status))return NextResponse.json({error:'Készletre csak fizikailag visszaérkezett termék helyezhető.'},{status:409});
  const effectiveAmount=parsed.data.refundAmount!==undefined?parsed.data.refundAmount:current.refund_amount_gross_huf;
  const effectiveReference=parsed.data.refundReference!==undefined?parsed.data.refundReference:current.refund_reference;
  const effectiveNote=parsed.data.adminNote!==undefined?parsed.data.adminNote:current.admin_note;

  const{data,error}=await a.rpc('admin_transition_return_case_v2',{
    p_instance_id:scope.instanceId,p_case_id:id,p_actor:actor.id,p_expected_updated_at:current.updated_at,
    p_target_status:parsed.data.status,p_refund_amount:effectiveAmount,p_refund_reference:effectiveReference??'',p_admin_note:effectiveNote??'',p_restock:restock
  });
  if(error){
    if(error.message.includes('STALE_RETURN_CASE'))return NextResponse.json({error:'A visszáru ügyet időközben módosították. Frissítsd az oldalt.'},{status:409});
    if(error.message.includes('RETURN_CASE_NOT_FOUND'))return NextResponse.json({error:'Az ügy nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('ORDER_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    const message=error.message||'Az ügy módosítása nem sikerült.';
    return NextResponse.json({error:message},{status:/állapotváltás|visszatérítés|készletre|vissza lett állítva|meghaladná|nem található/i.test(message)?409:500});
  }
  const result=(data??{})as{transition?:unknown;notificationQueued?:boolean};
  if(!result.transition)return NextResponse.json({error:'A visszáru művelet eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,transition:result.transition,notificationQueued:result.notificationQueued===true});
}
