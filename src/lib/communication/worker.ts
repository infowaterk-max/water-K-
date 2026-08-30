import { createAdminClient } from '@/lib/supabase/admin';
import { getCommunicationProvider, isCommunicationProviderConfigured } from './provider';
import { getCommunicationTemplate } from './templates';

type ClaimedJob={id:string;recipient_email:string;purpose:'transactional'|'marketing';template_key:string;payload:Record<string,unknown>;claim_token:string;attempts:number};
export type WorkerSummary={recovered:number;queuedStock:number;queuedRecovery:number;claimed:number;sent:number;failed:number;blocked:number};
export async function runCommunicationWorker(limit=10):Promise<WorkerSummary>{
  const admin=createAdminClient();
  const summary:WorkerSummary={recovered:0,queuedStock:0,queuedRecovery:0,claimed:0,sent:0,failed:0,blocked:0};
  const {data:recovered,error:recoveryError}=await admin.rpc('recover_stale_communication_jobs',{p_stale_minutes:15});
  if(recoveryError)throw recoveryError;
  summary.recovered=Number(recovered??0);
  const {data:queuedStock,error:stockQueueError}=await admin.rpc('queue_available_stock_notifications',{p_limit:Math.max(1,Math.min(limit*5,200))});
  if(stockQueueError)throw stockQueueError;
  summary.queuedStock=Number(queuedStock??0);
  const {data:queuedRecovery,error:recoveryQueueError}=await admin.rpc('queue_abandoned_checkout_recoveries',{p_limit:Math.max(1,Math.min(limit*5,200)),p_min_age_minutes:60});
  if(recoveryQueueError)throw recoveryQueueError;
  summary.queuedRecovery=Number(queuedRecovery??0);
  if(!isCommunicationProviderConfigured())return summary;
  const {data,error}=await admin.rpc('claim_communication_jobs',{p_limit:Math.max(1,Math.min(limit,50))});
  if(error)throw error;
  const jobs=(data??[]) as ClaimedJob[];
  summary.claimed=jobs.length;
  const provider=getCommunicationProvider();
  for(const job of jobs){
    try{
      const template=getCommunicationTemplate(job.template_key);
      if(!template||template.purpose!==job.purpose){await admin.rpc('fail_communication_job',{p_id:job.id,p_claim_token:job.claim_token,p_error:'INVALID_TEMPLATE_OR_PURPOSE',p_retry:false});summary.blocked++;continue;}
      const {data:suppressed,error:suppressionError}=await admin.rpc('is_communication_suppressed',{p_email:job.recipient_email});
      if(suppressionError||suppressed===true){await admin.rpc('fail_communication_job',{p_id:job.id,p_claim_token:job.claim_token,p_error:'RECIPIENT_SUPPRESSED_AT_SEND_TIME',p_retry:false});if(job.template_key==='stock_available')await admin.from('stock_notifications').update({status:'cancelled'}).eq('communication_job_id',job.id);summary.blocked++;continue;}
      if(job.purpose==='marketing'){
        const {data:allowed,error:consentError}=await admin.rpc('has_marketing_consent',{p_email:job.recipient_email,p_channel:'email'});
        if(consentError||allowed!==true){await admin.rpc('fail_communication_job',{p_id:job.id,p_claim_token:job.claim_token,p_error:'MARKETING_CONSENT_MISSING_AT_SEND_TIME',p_retry:false});summary.blocked++;continue;}
      }
      const result=await provider.send({to:job.recipient_email,subject:template.subject,templateKey:job.template_key,purpose:job.purpose,payload:job.payload??{}});
      const {data:completed,error:completeError}=await admin.rpc('complete_communication_job',{p_id:job.id,p_claim_token:job.claim_token,p_provider_message_id:result.providerMessageId});
      if(completeError||completed!==true)throw completeError??new Error('COMMUNICATION_CLAIM_LOST');
      if(job.template_key==='stock_available')await admin.from('stock_notifications').update({status:'sent',sent_at:new Date().toISOString()}).eq('communication_job_id',job.id);
      summary.sent++;
    }catch(error){
      const message=error instanceof Error?error.message:'UNKNOWN_COMMUNICATION_ERROR';
      const retry=job.attempts<5;
      await admin.rpc('fail_communication_job',{p_id:job.id,p_claim_token:job.claim_token,p_error:message,p_retry:retry});
      summary.failed++;
    }
  }
  return summary;
}
