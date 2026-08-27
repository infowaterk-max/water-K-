import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob, type IntegrationJobKind } from '@/lib/integrations/outbox';

const statuses=['draft','pending','paid','processing','shipped','completed','cancelled','refunded'] as const;
type Status=typeof statuses[number];
const bodySchema=z.object({status:z.enum(statuses),trackingNumber:z.string().trim().max(120).optional()});
const allowed:Record<Status,Status[]>={draft:['pending','cancelled'],pending:['paid','cancelled'],paid:['processing','refunded','cancelled'],processing:['shipped','refunded','cancelled'],shipped:['completed','refunded'],completed:['refunded'],cancelled:[],refunded:[]};

async function enqueueOnce(input:{orderId:string;kind:IntegrationJobKind;provider:string;orderNumber:string;actorId:string;status:string}){
  const admin=createAdminClient(); const {data:existing}=await admin.from('integration_jobs').select('id').eq('order_id',input.orderId).eq('kind',input.kind).eq('provider',input.provider).in('status',['pending','processing','succeeded']).limit(1); if(existing?.length)return;
  await enqueueIntegrationJob({orderId:input.orderId,kind:input.kind,provider:input.provider,payload:{orderNumber:input.orderNumber}}).catch(async integrationError=>{await admin.from('order_events').insert({order_id:input.orderId,event_type:'integration_enqueue_failed',from_status:input.status,to_status:input.status,actor_user_id:input.actorId,metadata:{kind:input.kind,provider:input.provider,error:integrationError instanceof Error?integrationError.message:'unknown'}});});
}
async function enqueueEmail(orderId:string,template:'payment_confirmed'|'order_shipped'|'order_completed',actorId:string,status:string){
  const admin=createAdminClient(); await enqueueIntegrationJob({orderId,kind:'email_send',provider:process.env.EMAIL_PROVIDER||'resend',payload:{template}}).catch(async e=>{await admin.from('order_events').insert({order_id:orderId,event_type:'integration_enqueue_failed',from_status:status,to_status:status,actor_user_id:actorId,metadata:{kind:'email_send',template,error:e instanceof Error?e.message:'unknown'}});});
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser(); if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const {id}=await params; if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen rendelésazonosító.'},{status:400});
  let raw:unknown; try{raw=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
  const parsed=bodySchema.safeParse(raw); if(!parsed.success)return NextResponse.json({error:'Érvénytelen rendelési állapot.'},{status:400});
  const admin=createAdminClient(); const {data:current,error:currentError}=await admin.from('orders').select('status,tracking_number,shipping_method,order_number').eq('id',id).maybeSingle(); if(currentError||!current)return NextResponse.json({error:'A rendelés nem található.'},{status:404});
  const currentStatus=current.status as Status; const nextStatus=parsed.data.status;
  if(currentStatus!==nextStatus&&!allowed[currentStatus]?.includes(nextStatus))return NextResponse.json({error:`Nem engedélyezett státuszváltás: ${currentStatus} → ${nextStatus}.`},{status:409});
  if(nextStatus==='shipped'&&current.shipping_method!=='pickup'&&!(parsed.data.trackingNumber??current.tracking_number))return NextResponse.json({error:'Feladott rendeléshez csomagkövetési azonosító szükséges.'},{status:400});
  const update:Record<string,unknown>={status:nextStatus,updated_at:new Date().toISOString()}; if(parsed.data.trackingNumber!==undefined)update.tracking_number=parsed.data.trackingNumber||null;
  const {error}=await admin.from('orders').update(update).eq('id',id); if(error)return NextResponse.json({error:'A rendelés frissítése nem sikerült.'},{status:500});
  await admin.from('order_events').insert({order_id:id,event_type:currentStatus===nextStatus?'order_updated':'status_changed',from_status:currentStatus,to_status:nextStatus,actor_user_id:actor.id,metadata:{tracking_number:parsed.data.trackingNumber??current.tracking_number}});
  if(nextStatus==='paid'&&currentStatus!=='paid'){await enqueueOnce({orderId:id,kind:'invoice_create',provider:process.env.INVOICE_PROVIDER||'invoicing',orderNumber:current.order_number,actorId:actor.id,status:nextStatus});await enqueueEmail(id,'payment_confirmed',actor.id,nextStatus);}
  if(nextStatus==='processing'&&currentStatus!=='processing'&&current.shipping_method&&current.shipping_method!=='pickup')await enqueueOnce({orderId:id,kind:'shipment_create',provider:current.shipping_method,orderNumber:current.order_number,actorId:actor.id,status:nextStatus});
  if(nextStatus==='shipped'&&currentStatus!=='shipped')await enqueueEmail(id,'order_shipped',actor.id,nextStatus);
  if(nextStatus==='completed'&&currentStatus!=='completed')await enqueueEmail(id,'order_completed',actor.id,nextStatus);
  return NextResponse.json({ok:true,status:nextStatus,allowedNext:allowed[nextStatus]});
}
