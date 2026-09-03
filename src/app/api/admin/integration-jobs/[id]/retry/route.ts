import { NextResponse } from 'next/server';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob, type IntegrationJobKind } from '@/lib/integrations/outbox';
import { recordAdminAudit } from '@/lib/admin/audit';
import { getConfiguredInvoiceProviderCode,getInvoiceProvider } from '@/lib/integrations/invoicing';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
const retryableKinds=new Set<IntegrationJobKind>(['shipment_create','email_send','invoice_create','logistics_email']);
function needsReconciliation(message:unknown){return /reconciliation required/i.test(String(message??''))}

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('orders.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('orders.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params,admin=createAdminClient();
  const{data:job,error}=await admin.from('integration_jobs').select('id,instance_id,order_id,kind,provider,status,payload,attempt_count,last_error').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(error||!job)return NextResponse.json({error:'Az integrációs feladat nem található ebben a webshopban.'},{status:404});
  if(!['failed','blocked'].includes(job.status))return NextResponse.json({error:'Csak sikertelen vagy blokkolt feladat indítható újra.'},{status:409});
  if(job.kind==='payment_create')return NextResponse.json({error:'A fizetésindítás nem indítható újra innen. A vásárló a saját rendelésénél biztonságos új fizetési próbálkozást indíthat.'},{status:409});
  if(!retryableKinds.has(job.kind as IntegrationJobKind))return NextResponse.json({error:'Ez a feladattípus jelenleg nem indítható újra automatikusan.'},{status:409});
  if(!job.order_id)return NextResponse.json({error:'Rendelés nélküli integrációs feladat innen nem indítható újra.'},{status:409});
  if(job.kind==='shipment_create'){
    const{data:order,error:orderError}=await admin.from('orders').select('order_number,tracking_number').eq('id',job.order_id).eq('instance_id',scope.instanceId).maybeSingle();
    if(orderError||!order)return NextResponse.json({error:'A rendelés nem található ebben a webshopban.'},{status:404});
    if(order.tracking_number)return NextResponse.json({ok:true,alreadyResolved:true,trackingNumber:order.tracking_number});
    if(needsReconciliation(job.last_error))return NextResponse.json({error:'A futárszolgáltatónál a csomag létrejötte bizonytalan. Újrapróbálás előtt ellenőrizd a szolgáltatói felületen, hogy létezik-e már csomag ehhez a rendeléshez.'},{status:409});
  }
  if(job.kind==='invoice_create'){
    const configured=getConfiguredInvoiceProviderCode();
    if(!configured||configured!==job.provider)return NextResponse.json({error:'A számlázó szolgáltató jelenleg nincs aktiválva vagy nem egyezik az eredeti feladattal.'},{status:409});
    const{data:order,error:orderError}=await admin.from('orders').select('order_number,invoice_number').eq('id',job.order_id).eq('instance_id',scope.instanceId).maybeSingle();
    if(orderError||!order)return NextResponse.json({error:'A rendelés nem található ebben a webshopban.'},{status:404});
    if(order.invoice_number)return NextResponse.json({ok:true,alreadyResolved:true,invoiceNumber:order.invoice_number});
    if(needsReconciliation(job.last_error)){
      try{
        const{data:catalog,error:catalogError}=await admin.from('commerce_provider_catalog').select('adapter_key').eq('code',job.provider).eq('provider_type','invoice').eq('is_available',true).maybeSingle();
        if(catalogError||!catalog?.adapter_key)return NextResponse.json({error:'A számlázó adapter jelenleg nem egyeztethető biztonságosan.'},{status:409});
        const provider=getInvoiceProvider(String(catalog.adapter_key));
        if(!provider.findInvoiceByExternalId)return NextResponse.json({error:'A számlázó nem támogat biztonságos külső azonosítós egyeztetést.'},{status:409});
        const existing=await provider.findInvoiceByExternalId(order.order_number);
        if(existing){
          const now=new Date().toISOString();
          const{data:saved,error:saveError}=await admin.from('orders').update({invoice_number:existing.invoiceNumber,invoice_url:existing.documentUrl??null,invoiced_at:now,updated_at:now}).eq('id',job.order_id).eq('instance_id',scope.instanceId).is('invoice_number',null).select('id').maybeSingle();
          if(saveError)return NextResponse.json({error:'A megtalált számla visszaírása nem sikerült; új számlát nem készítünk.'},{status:500});
          if(saved){
            await admin.from('order_events').insert({instance_id:scope.instanceId,order_id:job.order_id,event_type:'invoice_reconciled',actor_user_id:actor.id,metadata:{provider:job.provider,adapter_key:catalog.adapter_key,invoice_number:existing.invoiceNumber,provider_reference:existing.providerReference??null,source_job_id:job.id}});
            await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:'invoice.reconciled',entityType:'order',entityId:job.order_id,summary:`${order.order_number}: meglévő számla visszaírva`,beforeState:{invoiceNumber:null},afterState:{invoiceNumber:existing.invoiceNumber},metadata:{provider:job.provider,sourceJobId:job.id}});
          }
          return NextResponse.json({ok:true,reconciled:true,invoiceNumber:existing.invoiceNumber});
        }
      }catch(error){console.error('invoice reconciliation failed',{jobId:job.id,orderId:job.order_id,provider:job.provider,error});return NextResponse.json({error:'A számlaegyeztetés nem adott biztonságos eredményt, ezért új számlát nem indítunk.'},{status:409})}
    }
  }
  const{data:active}=await admin.from('integration_jobs').select('id,status').eq('instance_id',scope.instanceId).eq('order_id',job.order_id).eq('kind',job.kind).eq('provider',job.provider).in('status',['pending','processing']).limit(1).maybeSingle();
  if(active)return NextResponse.json({ok:true,jobId:active.id,status:active.status,alreadyActive:true});
  try{
    const next=await enqueueIntegrationJob({instanceId:scope.instanceId,orderId:job.order_id,kind:job.kind as IntegrationJobKind,provider:job.provider,payload:{...((job.payload as Record<string,unknown>|null)??{}),retryOfJobId:job.id,retriedBy:actor.id}});
    await admin.from('order_events').insert({instance_id:scope.instanceId,order_id:job.order_id,event_type:'integration_retried',actor_user_id:actor.id,metadata:{previous_job_id:job.id,new_job_id:next.id,kind:job.kind,provider:job.provider,previous_error:job.last_error}});
    await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:'integration_job.retried',entityType:'integration_job',entityId:job.id,summary:`${job.kind} újraindítva`,beforeState:{status:job.status,attemptCount:job.attempt_count,lastError:job.last_error},afterState:{newJobId:next.id,status:next.status},metadata:{orderId:job.order_id,provider:job.provider}});
    return NextResponse.json({ok:true,jobId:next.id,status:next.status});
  }catch(error){console.error('integration retry enqueue failed',{jobId:job.id,orderId:job.order_id,kind:job.kind,provider:job.provider,error});return NextResponse.json({error:'Az újraindítás nem sikerült.'},{status:500})}
}
