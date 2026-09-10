import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processIntegrationJob } from '@/lib/integrations/processor';
import { runCommunicationWorker } from '@/lib/communication/worker';
import { cleanupExpiredOfficePrivateAttachments } from '@/lib/office/private-attachment-cleanup';
import { runOfficeTeamChatRetention } from '@/lib/office/team-chat-retention';
import {runBusinessPulseNotificationWorker} from '@/lib/business-pulse/notifications';
import {retryDueEventDrivenWorkflows} from '@/lib/automation/event-driven-workflows';

export const dynamic='force-dynamic';
export const maxDuration=60;

type InstanceRow={id:string};
type JobRow={id:string;status:string;next_attempt_at:string|null;updated_at:string};
type JourneyResult={instanceId:string;ok:boolean;planned?:unknown;dispatched?:unknown;error?:string};
type JourneyPlan={instanceId?:unknown;journeysSeen?:unknown;stepsCreated?:unknown;journeysCancelled?:unknown;stepsCancelled?:unknown;jobsCancelled?:unknown};
type LoyaltyRun={instance_id?:unknown;run_key?:unknown;accrued_points_entries?:unknown;reversed_points_entries?:unknown;refreshed_profiles?:unknown;completed_at?:unknown;metadata?:unknown};
type LoyaltyResult={instanceId:string;runKey:string;ok:boolean;accrued?:number;reversed?:number;refreshedProfiles?:number;completedAt?:string;error?:string};
type TeamChatRetentionRun={instanceId:string;ok:boolean;checkedAt?:string;threadsArchived?:number;messagesDeleted?:number;auditDeleted?:number;error?:string};
type BusinessPulseLifecycle={runKey?:unknown;planned?:unknown;evaluated?:unknown;paused?:unknown;failed?:unknown;failures?:unknown;checkedAt?:unknown};
type WorkflowRetryResult={instanceId:string;ok:boolean;retried?:number;deadLetters?:number;error?:string};

function authorized(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret)&&request.headers.get('authorization')===`Bearer ${secret}`;}
function due(job:JobRow,now:number){if(job.status==='pending')return true;if(job.status==='failed')return Boolean(job.next_attempt_at)&&new Date(job.next_attempt_at as string).getTime()<=now;if(job.status==='processing')return new Date(job.updated_at).getTime()<=now-15*60*1000;return false;}
function nonNegativeInteger(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=0;}
function journeyPlanEvidence(data:unknown,instanceId:string){if(!data||typeof data!=='object'||Array.isArray(data))return null;const row=data as JourneyPlan;if(row.instanceId!==instanceId||!nonNegativeInteger(row.journeysSeen)||!nonNegativeInteger(row.stepsCreated)||!nonNegativeInteger(row.journeysCancelled)||!nonNegativeInteger(row.stepsCancelled)||!nonNegativeInteger(row.jobsCancelled))return null;return row;}
function loyaltyEvidence(data:unknown,instanceId:string,runKey:string){const raw=Array.isArray(data)?data[0]:data;if(!raw||typeof raw!=='object')return null;const row=raw as LoyaltyRun,metadata=row.metadata;if(row.instance_id!==instanceId||row.run_key!==runKey||typeof row.completed_at!=='string'||row.completed_at.length===0||!nonNegativeInteger(row.accrued_points_entries)||!nonNegativeInteger(row.reversed_points_entries)||!nonNegativeInteger(row.refreshed_profiles)||!metadata||typeof metadata!=='object'||Array.isArray(metadata)||(metadata as Record<string,unknown>).authority!=='instance_id')return null;return{accrued:row.accrued_points_entries,reversed:row.reversed_points_entries,refreshedProfiles:row.refreshed_profiles,completedAt:row.completed_at};}
function businessPulseEvidence(data:unknown,runKey:string){if(!data||typeof data!=='object'||Array.isArray(data))return null;const row=data as BusinessPulseLifecycle;if(row.runKey!==runKey||!nonNegativeInteger(row.planned)||!nonNegativeInteger(row.evaluated)||!nonNegativeInteger(row.paused)||!nonNegativeInteger(row.failed)||!Array.isArray(row.failures)||typeof row.checkedAt!=='string'||row.checkedAt.length===0)return null;return{runKey,planned:row.planned,evaluated:row.evaluated,paused:row.paused,failed:row.failed,failures:row.failures,checkedAt:row.checkedAt};}

async function runWorker(request:Request){
  if(!authorized(request))return NextResponse.json({error:'Nincs jogosultság.'},{status:401});
  const admin=createAdminClient(),checkedAt=new Date().toISOString();
  const{data:instanceData,error:instanceError}=await admin.from('webshop_instances').select('id').in('status',['pilot','active']).order('created_at',{ascending:true});
  if(instanceError)return NextResponse.json({error:'Az aktív webshopok nem tölthetők be.'},{status:500});
  const instances=(instanceData??[]) as InstanceRow[];

  let inventorySnapshot:{ok:boolean;captured?:number;error?:string};
  try{const{data,error}=await admin.rpc('capture_inventory_snapshot');if(error)throw error;inventorySnapshot={ok:true,captured:Number(data??0)}}catch(error){inventorySnapshot={ok:false,error:error instanceof Error?error.message:'A napi készletpillanatkép nem készült el.'}}

  const loyaltyRunKey=`daily:${checkedAt.slice(0,10)}`,loyalty:LoyaltyResult[]=[];
  for(const instance of instances){try{const{data,error}=await admin.rpc('process_loyalty_lifecycle_v2',{p_instance_id:instance.id,p_run_key:loyaltyRunKey});if(error)throw error;const evidence=loyaltyEvidence(data,instance.id,loyaltyRunKey);if(!evidence)throw new Error('LOYALTY_LIFECYCLE_EVIDENCE_MISSING');loyalty.push({instanceId:instance.id,runKey:loyaltyRunKey,ok:true,...evidence})}catch(error){loyalty.push({instanceId:instance.id,runKey:loyaltyRunKey,ok:false,error:error instanceof Error?error.message:'A tenant hűségprogram-feldolgozás nem sikerült.'})}}

  const journeys:JourneyResult[]=[];
  for(const instance of instances){try{const{data:planned,error:planError}=await admin.rpc('plan_customer_retention_journeys_v2',{p_instance_id:instance.id});if(planError)throw planError;const planEvidence=journeyPlanEvidence(planned,instance.id);if(!planEvidence)throw new Error('RETENTION_JOURNEY_PLAN_EVIDENCE_MISSING');const{data:dispatched,error:dispatchError}=await admin.rpc('dispatch_due_customer_journey_steps_v2',{p_instance_id:instance.id,p_limit:50});if(dispatchError)throw dispatchError;journeys.push({instanceId:instance.id,ok:true,planned:planEvidence,dispatched})}catch(error){journeys.push({instanceId:instance.id,ok:false,error:error instanceof Error?error.message:'A tenant ügyfélút-feldolgozás nem sikerült.'})}}

  const workflowRetries:WorkflowRetryResult[]=[];
  for(const instance of instances){try{const retried=await retryDueEventDrivenWorkflows(instance.id,20);const deadLetters=retried.filter(result=>result.status==='dead_letter').length;workflowRetries.push({instanceId:instance.id,ok:deadLetters===0,retried:retried.length,deadLetters})}catch(error){workflowRetries.push({instanceId:instance.id,ok:false,error:error instanceof Error?error.message:'EVENT_DRIVEN_WORKFLOW_RETRY_FAILED'})}}

  const integrationResults:Array<{id:string;instanceId:string;ok:boolean;error?:string}>=[];let remaining=10;const now=Date.now();
  for(const instance of instances){if(remaining<=0)break;const{data:jobData,error:jobError}=await admin.from('integration_jobs').select('id,status,next_attempt_at,updated_at').eq('instance_id',instance.id).in('status',['pending','failed','processing']).order('created_at',{ascending:true}).limit(Math.min(50,remaining*5));if(jobError){integrationResults.push({id:'tenant-scan',instanceId:instance.id,ok:false,error:jobError.message});continue}const jobs=((jobData??[]) as JobRow[]).filter(job=>due(job,now)).slice(0,remaining);for(const job of jobs){const{data:claimed,error:claimError}=await admin.rpc('claim_integration_job_v2',{p_instance_id:instance.id,p_id:job.id});if(claimError){integrationResults.push({id:job.id,instanceId:instance.id,ok:false,error:claimError.message});remaining--;continue}const claim=claimed?.[0];if(!claim?.processing_token)continue;try{await processIntegrationJob(instance.id,job.id,claim.processing_token);integrationResults.push({id:job.id,instanceId:instance.id,ok:true})}catch(error){integrationResults.push({id:job.id,instanceId:instance.id,ok:false,error:error instanceof Error?error.message:'Ismeretlen hiba'})}remaining--;if(remaining<=0)break}}

  let communication:{ok:boolean;recovered?:number;queuedStock?:number;queuedRecovery?:number;claimed?:number;sent?:number;failed?:number;blocked?:number;tenantFailures?:number;error?:string};
  try{const summary=await runCommunicationWorker(20);communication={ok:summary.tenantFailures===0,...summary}}catch(error){communication={ok:false,error:error instanceof Error?error.message:'UNKNOWN_WORKER_ERROR'}}

  let officeAttachmentCleanup:{ok:boolean;checked?:number;revoked?:number;failed?:number;failures?:unknown;error?:string};
  try{const summary=await cleanupExpiredOfficePrivateAttachments(25);officeAttachmentCleanup={ok:summary.failed===0,...summary}}catch(error){officeAttachmentCleanup={ok:false,error:error instanceof Error?error.message:'OFFICE_ATTACHMENT_CLEANUP_FAILED'}}

  const teamChatRetention:TeamChatRetentionRun[]=[];
  for(const instance of instances){try{const result=await runOfficeTeamChatRetention(instance.id);teamChatRetention.push({...result,ok:true})}catch(error){teamChatRetention.push({instanceId:instance.id,ok:false,error:error instanceof Error?error.message:'OFFICE_TEAM_CHAT_RETENTION_FAILED'})}}

  const businessPulseRunKey=`daily:${checkedAt.slice(0,10)}`;
  let businessPulse:{ok:boolean;runKey:string;planned?:number;evaluated?:number;paused?:number;failed?:number;failures?:unknown[];checkedAt?:string;error?:string};
  try{const{data,error}=await admin.rpc('service_process_business_pulse_lifecycle_v1',{p_run_key:businessPulseRunKey});if(error)throw error;const evidence=businessPulseEvidence(data,businessPulseRunKey);if(!evidence)throw new Error('BUSINESS_PULSE_LIFECYCLE_EVIDENCE_MISSING');businessPulse={ok:evidence.failed===0,...evidence}}catch(error){businessPulse={ok:false,runKey:businessPulseRunKey,error:error instanceof Error?error.message:'BUSINESS_PULSE_LIFECYCLE_FAILED'}}

  let businessPulseNotifications:{ok:boolean;configured?:boolean;claimed?:number;sent?:number;failed?:number;blocked?:number;error?:string};
  try{const summary=await runBusinessPulseNotificationWorker(20);businessPulseNotifications={ok:summary.failed===0&&summary.blocked===0,...summary}}catch(error){businessPulseNotifications={ok:false,error:error instanceof Error?error.message:'BUSINESS_PULSE_NOTIFICATION_WORKER_FAILED'}}

  const loyaltyOk=loyalty.every(result=>result.ok),journeyOk=journeys.every(result=>result.ok),workflowRetryOk=workflowRetries.every(result=>result.ok),teamChatRetentionOk=teamChatRetention.every(result=>result.ok);
  const ok=inventorySnapshot.ok&&loyaltyOk&&journeyOk&&integrationResults.every(result=>result.ok)&&communication.ok&&officeAttachmentCleanup.ok&&teamChatRetentionOk&&businessPulse.ok&&businessPulseNotifications.ok&&workflowRetryOk;
  return NextResponse.json({ok,inventorySnapshot,loyalty:{tenants:loyalty.length,runKey:loyaltyRunKey,results:loyalty},journeys:{tenants:journeys.length,results:journeys},eventDrivenWorkflows:{tenants:workflowRetries.length,results:workflowRetries},integrations:{processed:integrationResults.length,results:integrationResults},communication,officeAttachmentCleanup,teamChatRetention:{tenants:teamChatRetention.length,results:teamChatRetention},businessPulse,businessPulseNotifications,checkedAt},{status:ok?200:503});
}

export async function GET(request:Request){return runWorker(request)}
export async function POST(request:Request){return runWorker(request)}
