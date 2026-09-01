import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob, type IntegrationJobKind } from '@/lib/integrations/outbox';
import { recordAdminAudit } from '@/lib/admin/audit';
import { getConfiguredInvoiceProviderCode } from '@/lib/integrations/invoicing';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

const statuses=['draft','pending','pending_payment','pending_transfer','paid','processing','shipped','completed','cancelled','refunded'] as const;
type Status=typeof statuses[number];
const bodySchema=z.object({status:z.enum(statuses),trackingNumber:z.string().trim().max(120).optional()});
const allowed:Record<Status,Status[]>={
  draft:['pending','pending_payment','pending_transfer','cancelled'],
  pending:['paid','processing','cancelled'],pending_payment:['paid','cancelled'],pending_transfer:['paid','cancelled'],
  paid:['processing','refunded','cancelled'],processing:['shipped','refunded','cancelled'],shipped:['completed','refunded'],completed:['refunded'],cancelled:[],refunded:[]
};

async function enqueueOnce(input:{instanceId:string;orderId:string;kind:IntegrationJobKind;provider:string;orderNumber:string;actorId:string;status:string;payload?:Record<string,unknown>}){
  const admin=createAdminClient();
  const{data:existing}=await admin.from('integration_jobs').select('id').eq('instance_id',input.instanceId).eq('order_id',input.orderId).eq('kind',input.kind).eq('provider',input.provider).in('status',['pending','processing','succeeded']).limit(1);
  if(existing?.length)return;
  await enqueueIntegrationJob({instanceId:input.instanceId,orderId:input.orderId,kind:input.kind,provider:input.provider,payload:{orderNumber:input.orderNumber,...input.payload}}).catch(async integrationError=>{
    await admin.from('order_events').insert({instance_id:input.instanceId,order_id:input.orderId,event_type:'integration_enqueue_failed',from_status:input.status,to_status:input.status,actor_user_id:input.actorId,metadata:{kind:input.kind,provider:input.provider,error:integrationError instanceof Error?integrationError.message:'unknown'}});
  });
}

async function enqueueEmail(instanceId:string,orderId:string,template:'payment_confirmed'|'order_shipped'|'order_completed',actorId:string,status:string){
  const admin=createAdminClient(),provider=process.env.EMAIL_PROVIDER||'resend';
  const{data:existing}=await admin.from('integration_jobs').select('id,payload').eq('instance_id',instanceId).eq('order_id',orderId).eq('kind','email_send').eq('provider',provider).in('status',['pending','processing','succeeded']).limit(20);
  if((existing??[]).some(j=>(j.payload as {template?:string}|null)?.template===template))return;
  await enqueueIntegrationJob({instanceId,orderId,kind:'email_send',provider,payload:{template}}).catch(async e=>{
    await admin.from('order_events').insert({instance_id:instanceId,order_id:orderId,event_type:'integration_enqueue_failed',from_status:status,to_status:status,actor_user_id:actorId,metadata:{kind:'email_send',template,error:e instanceof Error?e.message:'unknown'}});
  });
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('orders.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('orders.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen rendelésazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=bodySchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen rendelési állapot.'},{status:400});
  const admin=createAdminClient();
  const{data:current,error:currentError}=await admin.from('orders').select('status,tracking_number,shipping_method,order_number,payment_method,instance_id').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(currentError||!current)return NextResponse.json({error:'A rendelés nem található ebben a webshopban.'},{status:404});
  const currentStatus=current.status as Status,nextStatus=parsed.data.status;
  if(currentStatus!==nextStatus&&!allowed[currentStatus]?.includes(nextStatus))return NextResponse.json({error:`Nem engedélyezett státuszváltás: ${currentStatus} → ${nextStatus}.`},{status:409});
  if(nextStatus==='processing'&&currentStatus==='pending_payment')return NextResponse.json({error:'Online fizetésre váró rendelés nem kezdhető feldolgozni a hitelesített fizetés előtt.'},{status:409});
  if(nextStatus==='processing'&&currentStatus==='pending_transfer')return NextResponse.json({error:'Átutalásos rendelésnél előbb jelöld fizetettnek a rendelést.'},{status:409});
  if(nextStatus==='shipped'&&current.shipping_method!=='pickup'&&!(parsed.data.trackingNumber??current.tracking_number))return NextResponse.json({error:'Feladott rendeléshez csomagkövetési azonosító szükséges.'},{status:400});
  const update:Record<string,unknown>={status:nextStatus,updated_at:new Date().toISOString()};
  if(parsed.data.trackingNumber!==undefined)update.tracking_number=parsed.data.trackingNumber||null;
  if(nextStatus==='paid'&&currentStatus!=='paid')update.paid_at=new Date().toISOString();
  const{data:updated,error}=await admin.from('orders').update(update).eq('id',id).eq('instance_id',scope.instanceId).eq('status',currentStatus).select('id,status,tracking_number').maybeSingle();
  if(error)return NextResponse.json({error:'A rendelés frissítése nem sikerült.'},{status:500});
  if(!updated)return NextResponse.json({error:'A rendelést időközben valaki más módosította. Frissítsd az oldalt, majd ellenőrizd az aktuális állapotot.'},{status:409});
  await admin.from('order_events').insert({instance_id:scope.instanceId,order_id:id,event_type:currentStatus===nextStatus?'order_updated':'status_changed',from_status:currentStatus,to_status:nextStatus,actor_user_id:actor.id,metadata:{tracking_number:parsed.data.trackingNumber??current.tracking_number,payment_method:current.payment_method}});
  await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:currentStatus===nextStatus?'order.updated':'order.status_changed',entityType:'order',entityId:id,summary:`${current.order_number}: ${currentStatus} → ${nextStatus}`,beforeState:{status:currentStatus,trackingNumber:current.tracking_number},afterState:{status:nextStatus,trackingNumber:updated.tracking_number},metadata:{orderNumber:current.order_number}});
  if(nextStatus==='paid'&&currentStatus!=='paid'){
    await enqueueEmail(scope.instanceId,id,'payment_confirmed',actor.id,nextStatus);
    const invoiceProvider=getConfiguredInvoiceProviderCode();
    if(invoiceProvider)await enqueueOnce({instanceId:scope.instanceId,orderId:id,kind:'invoice_create',provider:invoiceProvider,orderNumber:current.order_number,actorId:actor.id,status:nextStatus,payload:{source:'admin_paid'}});
    else await admin.from('order_events').insert({instance_id:scope.instanceId,order_id:id,event_type:'invoice_manual_required',from_status:nextStatus,to_status:nextStatus,actor_user_id:actor.id,metadata:{reason:'Automatikus számlázó adapter nincs aktiválva vagy ellenőrizve.'}});
  }
  if(nextStatus==='processing'&&currentStatus!=='processing'){
    if(current.shipping_method&&current.shipping_method!=='pickup')await enqueueOnce({instanceId:scope.instanceId,orderId:id,kind:'shipment_create',provider:current.shipping_method,orderNumber:current.order_number,actorId:actor.id,status:nextStatus,payload:{shippingKind:'auto'}});
    if(current.payment_method==='cash_on_delivery'){
      const invoiceProvider=getConfiguredInvoiceProviderCode();
      if(invoiceProvider)await enqueueOnce({instanceId:scope.instanceId,orderId:id,kind:'invoice_create',provider:invoiceProvider,orderNumber:current.order_number,actorId:actor.id,status:nextStatus,payload:{source:'cod_processing',paid:false}});
      else await admin.from('order_events').insert({instance_id:scope.instanceId,order_id:id,event_type:'invoice_manual_required',from_status:nextStatus,to_status:nextStatus,actor_user_id:actor.id,metadata:{reason:'Utánvétes rendeléshez a számlázó adapter nincs aktiválva vagy ellenőrizve.'}});
    }
  }
  if(nextStatus==='shipped'&&currentStatus!=='shipped')await enqueueEmail(scope.instanceId,id,'order_shipped',actor.id,nextStatus);
  if(nextStatus==='completed'&&currentStatus!=='completed')await enqueueEmail(scope.instanceId,id,'order_completed',actor.id,nextStatus);
  return NextResponse.json({ok:true,status:nextStatus,allowedNext:allowed[nextStatus]});
}
