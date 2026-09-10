import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {getCommunicationProvider,isCommunicationProviderConfigured} from '@/lib/communication/provider';
import {getCommunicationTemplate} from '@/lib/communication/templates';
import {brandedSubject,getPlatformCommunicationIdentity} from '@/lib/communication/identity';

type ClaimedEvent={
  id:string;instance_id:string;recipient_email:string;template_key:string;payload:Record<string,unknown>;
  claim_token:string;attempts:number;status:string;
};

export type BusinessPulseNotificationSummary={configured:boolean;claimed:number;sent:number;failed:number;blocked:number};

async function persistFailure(db:ReturnType<typeof createAdminClient>,event:ClaimedEvent,message:string,retry:boolean){
  const{data,error}=await db.rpc('service_fail_business_pulse_notification_v1',{
    p_id:event.id,p_claim_token:event.claim_token,p_error:message,p_retry:retry,
  });
  if(error||data!==true)throw error??new Error('BUSINESS_PULSE_NOTIFICATION_FAILURE_EVIDENCE_MISSING');
}

export async function runBusinessPulseNotificationWorker(limit=20):Promise<BusinessPulseNotificationSummary>{
  const summary:BusinessPulseNotificationSummary={configured:isCommunicationProviderConfigured(),claimed:0,sent:0,failed:0,blocked:0};
  if(!summary.configured)return summary;

  const db=createAdminClient();
  const{data,error}=await db.rpc('service_claim_business_pulse_notifications_v1',{p_limit:Math.max(1,Math.min(limit,50))});
  if(error)throw error;
  const events=(data??[]) as ClaimedEvent[];
  summary.claimed=events.length;
  const provider=getCommunicationProvider();

  for(const event of events){
    try{
      const template=getCommunicationTemplate(event.template_key);
      if(!template||template.purpose!=='transactional'){
        await persistFailure(db,event,'BUSINESS_PULSE_NOTIFICATION_TEMPLATE_INVALID',false);
        summary.blocked++;
        continue;
      }
      const identity=await getPlatformCommunicationIdentity(event.instance_id);
      const result=await provider.send({
        to:event.recipient_email,subject:brandedSubject(template.subject,identity.brandName),templateKey:event.template_key,purpose:'transactional',
        payload:event.payload??{},identity,replyTo:null,attachments:[],
      });
      const{data:completed,error:completeError}=await db.rpc('service_complete_business_pulse_notification_v1',{
        p_id:event.id,p_claim_token:event.claim_token,p_provider_message_id:result.providerMessageId,
      });
      if(completeError||completed!==true)throw completeError??new Error('BUSINESS_PULSE_NOTIFICATION_COMPLETE_EVIDENCE_MISSING');
      summary.sent++;
    }catch(error){
      const message=error instanceof Error?error.message:'UNKNOWN_BUSINESS_PULSE_NOTIFICATION_ERROR';
      await persistFailure(db,event,message,event.attempts<5);
      summary.failed++;
    }
  }
  return summary;
}
