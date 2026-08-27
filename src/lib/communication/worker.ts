import { createAdminClient } from '@/lib/supabase/admin';
import { getCommunicationProvider } from './provider';
import { getCommunicationTemplate } from './templates';

type ClaimedJob={id:string;recipient_email:string;purpose:'transactional'|'marketing';template_key:string;payload:Record<string,unknown>;claim_token:string;attempts:number};
export type WorkerSummary={recovered:number;claimed:number;sent:number;failed:number;blocked:number};

export async function runCommunicationWorker(limit=10):Promise<WorkerSummary>{
 const admin=createAdminClient(); const summary:WorkerSummary={recovered:0,claimed:0,sent:0,failed:0,blocked:0};
 const {data:recovered,error:recoveryError}=await admin.rpc('recover_stale_communication_jobs',{p_stale_minutes:15});if(recoveryError)throw recoveryError;summary.recovered=Number(recovered??0);
 const {data,error}=await admin.rpc('claim_communication_jobs',{p_limit:Math.max(1,Math.min(limit,50))}); if(error)throw error;
 const jobs=(data??[]) as ClaimedJob[]; summary.claimed=jobs.length; const provider=getCommunicationProvider();
 for(const job of jobs){
  try{
   const template=getCommunicationTemplate(job.template_key); if(!template||template.purpose!==job.purpose){await admin.rpc('fail_communication_job',{p_id:job.id,p_claim_token:job.claim_token,p_error:'INVALID_TEMPLATE_OR_PURPOSE',p_retry:false});summary.blocked++;continue;}
   if(job.purpose==='marketing'){const {data:allowed,error:consentError}=await admin.rpc('has_marketing_consent',{p_email:job.recipient_email,p_channel:'email'});if(consentError||allowed!==true){await admin.rpc('fail_communication_job',{p_id:job.id,p_claim_token:job.claim_token,p_error:'MARKETING_CONSENT_MISSING_AT_SEND_TIME',p_retry:false});summary.blocked++;continue;}}
   const result=await provider.send({to:job.recipient_email,subject:template.subject,templateKey:job.template_key,payload:job.payload??{}});const {data:completed,error:completeError}=await admin.rpc('complete_communication_job',{p_id:job.id,p_claim_token:job.claim_token,p_provider_message_id:result.providerMessageId});if(completeError||completed!==true)throw completeError??new Error('COMMUNICATION_CLAIM_LOST');summary.sent++;
  }catch(error){const message=error instanceof Error?error.message:'UNKNOWN_COMMUNICATION_ERROR';const retry=message!=='COMMUNICATION_PROVIDER_NOT_CONFIGURED'&&job.attempts<5;await admin.rpc('fail_communication_job',{p_id:job.id,p_claim_token:job.claim_token,p_error:message,p_retry:retry});summary.failed++;}
 }
 return summary;
}
