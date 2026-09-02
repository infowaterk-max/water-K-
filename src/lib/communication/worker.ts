import { createAdminClient } from '@/lib/supabase/admin';
import { getCommunicationProvider, isCommunicationProviderConfigured } from './provider';
import { getCommunicationTemplate } from './templates';
import { brandedSubject, getCommunicationIdentityForInstance } from './identity';

type ClaimedJob={id:string;instance_id:string;recipient_email:string;purpose:'transactional'|'marketing';template_key:string;payload:Record<string,unknown>;claim_token:string;attempts:number};
export type WorkerSummary={recovered:number;queuedStock:number;queuedRecovery:number;claimed:number;sent:number;failed:number;blocked:number;tenantFailures:number};
const empty=():WorkerSummary=>({recovered:0,queuedStock:0,queuedRecovery:0,claimed:0,sent:0,failed:0,blocked:0,tenantFailures:0});
function add(target:WorkerSummary,value:WorkerSummary){
  target.recovered+=value.recovered;target.queuedStock+=value.queuedStock;target.queuedRecovery+=value.queuedRecovery;
  target.claimed+=value.claimed;target.sent+=value.sent;target.failed+=value.failed;target.blocked+=value.blocked;target.tenantFailures+=value.tenantFailures;
}

async function runForInstance(instanceId:string,limit:number):Promise<WorkerSummary>{
  const admin=createAdminClient(),summary=empty();
  const{data:run}=await admin.from('communication_worker_runs').insert({instance_id:instanceId,source:'internal',status:'running'}).select('id').single();
  try{
    const{data:recovered,error:recoveryError}=await admin.rpc('recover_stale_communication_jobs_v2',{p_instance_id:instanceId,p_stale_minutes:15});
    if(recoveryError)throw recoveryError;summary.recovered=Number(recovered??0);
    const{data:queuedStock,error:stockQueueError}=await admin.rpc('queue_available_stock_notifications_v2',{p_instance_id:instanceId,p_limit:Math.max(1,Math.min(limit*5,200))});
    if(stockQueueError)throw stockQueueError;summary.queuedStock=Number(queuedStock??0);
    const{data:queuedRecovery,error:recoveryQueueError}=await admin.rpc('queue_abandoned_checkout_recoveries_v2',{p_instance_id:instanceId,p_limit:Math.max(1,Math.min(limit*5,200)),p_min_age_minutes:60});
    if(recoveryQueueError)throw recoveryQueueError;summary.queuedRecovery=Number(queuedRecovery??0);
    if(isCommunicationProviderConfigured()){
      const[{data,error},identity]=await Promise.all([
        admin.rpc('claim_communication_jobs_v2',{p_instance_id:instanceId,p_limit:Math.max(1,Math.min(limit,50))}),
        getCommunicationIdentityForInstance(instanceId),
      ]);
      if(error)throw error;
      const jobs=(data??[]) as ClaimedJob[];summary.claimed=jobs.length;const provider=getCommunicationProvider();
      for(const job of jobs){
        try{
          if(job.instance_id!==instanceId)throw new Error('COMMUNICATION_TENANT_MISMATCH');
          const template=getCommunicationTemplate(job.template_key);
          if(!template||template.purpose!==job.purpose){
            await admin.rpc('fail_communication_job_v2',{p_instance_id:instanceId,p_id:job.id,p_claim_token:job.claim_token,p_error:'INVALID_TEMPLATE_OR_PURPOSE',p_retry:false});
            summary.blocked++;continue;
          }
          const{data:suppressed,error:suppressionError}=await admin.rpc('is_communication_suppressed_v2',{p_instance_id:instanceId,p_email:job.recipient_email});
          if(suppressionError||suppressed===true){
            await admin.rpc('fail_communication_job_v2',{p_instance_id:instanceId,p_id:job.id,p_claim_token:job.claim_token,p_error:'RECIPIENT_SUPPRESSED_AT_SEND_TIME',p_retry:false});
            if(job.template_key==='stock_available')await admin.from('stock_notifications').update({status:'cancelled'}).eq('communication_job_id',job.id).eq('instance_id',instanceId);
            summary.blocked++;continue;
          }
          if(job.purpose==='marketing'){
            const{data:allowed,error:consentError}=await admin.rpc('has_marketing_consent_v2',{p_instance_id:instanceId,p_email:job.recipient_email,p_channel:'email'});
            if(consentError||allowed!==true){
              await admin.rpc('fail_communication_job_v2',{p_instance_id:instanceId,p_id:job.id,p_claim_token:job.claim_token,p_error:'MARKETING_CONSENT_MISSING_AT_SEND_TIME',p_retry:false});
              summary.blocked++;continue;
            }
          }
          const result=await provider.send({to:job.recipient_email,subject:brandedSubject(template.subject,identity.brandName),templateKey:job.template_key,purpose:job.purpose,payload:job.payload??{},identity});
          const{data:completed,error:completeError}=await admin.rpc('complete_communication_job_v2',{p_instance_id:instanceId,p_id:job.id,p_claim_token:job.claim_token,p_provider_message_id:result.providerMessageId});
          if(completeError||completed!==true)throw completeError??new Error('COMMUNICATION_CLAIM_LOST');
          if(job.template_key==='stock_available')await admin.from('stock_notifications').update({status:'sent',sent_at:new Date().toISOString()}).eq('communication_job_id',job.id).eq('instance_id',instanceId);
          summary.sent++;
        }catch(error){
          const message=error instanceof Error?error.message:'UNKNOWN_COMMUNICATION_ERROR',retry=job.attempts<5;
          await admin.rpc('fail_communication_job_v2',{p_instance_id:instanceId,p_id:job.id,p_claim_token:job.claim_token,p_error:message,p_retry:retry});
          summary.failed++;
        }
      }
    }
    if(run?.id)await admin.from('communication_worker_runs').update({status:'success',recovered:summary.recovered,claimed:summary.claimed,sent:summary.sent,failed:summary.failed,blocked:summary.blocked,finished_at:new Date().toISOString()}).eq('id',run.id).eq('instance_id',instanceId);
    return summary;
  }catch(error){
    if(run?.id)await admin.from('communication_worker_runs').update({status:'failed',recovered:summary.recovered,claimed:summary.claimed,sent:summary.sent,failed:summary.failed,blocked:summary.blocked,error_message:error instanceof Error?error.message:'UNKNOWN_WORKER_ERROR',finished_at:new Date().toISOString()}).eq('id',run.id).eq('instance_id',instanceId);
    throw error;
  }
}

export async function runCommunicationWorker(limit=10):Promise<WorkerSummary>{
  const admin=createAdminClient(),summary=empty();
  const{data:instances,error}=await admin.from('webshop_instances').select('id').in('status',['pilot','active']).order('created_at',{ascending:true});
  if(error)throw error;
  for(const instance of instances??[]){
    try{add(summary,await runForInstance(instance.id,limit));}
    catch(error){summary.tenantFailures++;console.error('communication tenant worker failed',{instanceId:instance.id,error});}
  }
  if((instances?.length??0)>0&&summary.tenantFailures===(instances?.length??0))throw new Error('COMMUNICATION_WORKER_ALL_TENANTS_FAILED');
  return summary;
}
