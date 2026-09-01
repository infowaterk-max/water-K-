import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{recordAdminAudit}from'@/lib/admin/audit';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
const schema=z.object({message:z.string().trim().min(2).max(4000)});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('support.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('support.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen ügyazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Az üzenet 2–4000 karakter lehet.'},{status:400});
  const a=createAdminClient(),{data:ticket,error:te}=await a.from('support_tickets').select('*').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(te||!ticket)return NextResponse.json({error:'Az ügy nem található ebben a webshopban.'},{status:404});
  if(ticket.status==='closed')return NextResponse.json({error:'A lezárt ügyhöz nem küldhető új válasz.'},{status:409});
  const{data:message,error}=await a.from('support_ticket_messages').insert({instance_id:scope.instanceId,ticket_id:id,author_user_id:actor.id,author_role:'admin',message:parsed.data.message}).select('*').single();
  if(error||!message)return NextResponse.json({error:'A válasz rögzítése nem sikerült.'},{status:500});
  await a.from('support_tickets').update({status:'waiting_customer',updated_at:new Date().toISOString()}).eq('id',id).eq('instance_id',scope.instanceId);
  const{error:notifyError}=await a.rpc('enqueue_communication_v2',{p_instance_id:scope.instanceId,p_email:ticket.email,p_user_id:ticket.user_id??null,p_purpose:'transactional',p_template_key:'support_reply',p_payload:{name:ticket.name??null,ticketId:id,ticketNumber:ticket.ticket_number,replyPreview:parsed.data.message.slice(0,300)},p_idempotency_key:`support-reply:${scope.instanceId}:${message.id}`,p_scheduled_at:new Date().toISOString()});
  await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:'support.reply_added',entityType:'support_ticket',entityId:id,summary:`${ticket.ticket_number}: ügyfélszolgálati válasz`,beforeState:{status:ticket.status},afterState:{status:'waiting_customer'},metadata:{messageId:message.id,notificationQueued:!notifyError,notificationError:notifyError?.message??null}});
  return NextResponse.json({ok:true,notificationQueued:!notifyError});
}
