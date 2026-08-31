import { NextResponse } from 'next/server';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob, type IntegrationJobKind } from '@/lib/integrations/outbox';
import { recordAdminAudit } from '@/lib/admin/audit';

const retryableKinds=new Set<IntegrationJobKind>(['shipment_create','email_send','payment_create']);

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await getAdminRequestUser();if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const{id}=await params;const admin=createAdminClient();
 const{data:job,error}=await admin.from('integration_jobs').select('id,order_id,kind,provider,status,payload,attempt_count,last_error').eq('id',id).maybeSingle();
 if(error||!job)return NextResponse.json({error:'Az integrációs feladat nem található.'},{status:404});
 if(!['failed','blocked'].includes(job.status))return NextResponse.json({error:'Csak sikertelen vagy blokkolt feladat indítható újra.'},{status:409});
 if(!retryableKinds.has(job.kind as IntegrationJobKind))return NextResponse.json({error:'Ez a feladattípus jelenleg nem indítható újra automatikusan. Használd a kézi tartalékfolyamatot.'},{status:409});
 if(!job.order_id)return NextResponse.json({error:'Rendelés nélküli integrációs feladat innen nem indítható újra.'},{status:409});
 const{data:active}=await admin.from('integration_jobs').select('id,status').eq('order_id',job.order_id).eq('kind',job.kind).eq('provider',job.provider).in('status',['pending','processing']).limit(1).maybeSingle();
 if(active)return NextResponse.json({ok:true,jobId:active.id,status:active.status,alreadyActive:true});
 try{
  const next=await enqueueIntegrationJob({orderId:job.order_id,kind:job.kind as IntegrationJobKind,provider:job.provider,payload:{...((job.payload as Record<string,unknown>|null)??{}),retryOfJobId:job.id,retriedBy:actor.id}});
  await admin.from('order_events').insert({order_id:job.order_id,event_type:'integration_retried',actor_user_id:actor.id,metadata:{previous_job_id:job.id,new_job_id:next.id,kind:job.kind,provider:job.provider,previous_error:job.last_error}});
  await recordAdminAudit({actorUserId:actor.id,action:'integration_job.retried',entityType:'integration_job',entityId:job.id,summary:`${job.kind} újraindítva`,beforeState:{status:job.status,attemptCount:job.attempt_count,lastError:job.last_error},afterState:{newJobId:next.id,status:next.status},metadata:{orderId:job.order_id,provider:job.provider}});
  return NextResponse.json({ok:true,jobId:next.id,status:next.status});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Az újraindítás nem sikerült.'},{status:500})}
}
