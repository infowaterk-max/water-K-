import 'server-only';
import {createHash}from'node:crypto';
import {createAdminClient}from'@/lib/supabase/admin';
import {createClient}from'@/lib/supabase/server';
import {getCurrentWebshopInstance}from'@/lib/instances/access';
import {correlationId,logEvent}from'@/lib/observability/logger';
import type{CustomerIncidentInput,MerchantIncidentInput,ManualIncidentTriageInput}from'./contracts';
import{triageIncident,type IncidentTriageDecision}from'./triage';
import{resolveSelfHealingPolicy,type SelfHealingMode}from'./self-healing';

export class IncidentServiceError extends Error{
  constructor(public code:string,public status:number,public publicMessage:string){super(code)}
}
type CustomerRpcResult={incidentId?:string;incidentNumber?:string;supportTicketId?:string;supportTicketNumber?:string;duplicate?:boolean};
type PlatformIncidentResult={id?:string;incidentNumber?:string;instanceId?:string;supportTicketId?:string|null};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const envName=()=>process.env.VERCEL_ENV?.trim()||process.env.NODE_ENV?.trim()||'unknown';
const appVersion=()=>process.env.VERCEL_GIT_COMMIT_SHA?.trim().slice(0,64)||process.env.npm_package_version?.trim()||'unknown';
const keyHash=(value:string)=>createHash('sha256').update(value).digest('hex').slice(0,32);
const nullable=(value?:string)=>value?.trim()||null;

async function enforceRateLimit(key:string,max:number,seconds:number){
  if(process.env.SECURITY_RATE_LIMIT_ENABLED!=='true')return;
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('consume_security_rate_limit',{p_rate_key:key,p_window_seconds:seconds,p_max_count:max});
  if(error)throw new IncidentServiceError('INCIDENT_RATE_LIMIT_UNAVAILABLE',503,'A hibabejelentési korlát most nem ellenőrizhető.');
  if(data!==true)throw new IncidentServiceError('INCIDENT_RATE_LIMITED',429,'Túl sok hibabejelentés érkezett. Kérjük, próbáld később.');
}

function contextPayload(context:CustomerIncidentInput['context']|MerchantIncidentInput['context']){
  return{
    pageKey:context.pageKey??null,
    templateKey:context.templateKey??null,
    templateVersion:context.templateVersion??null,
    viewport:context.viewport??null,
  };
}
function evidencePayload(context:CustomerIncidentInput['context']|MerchantIncidentInput['context']){
  return{
    actionKey:context.actionKey??null,
    errorCode:context.errorCode??null,
    requestId:context.requestId??null,
  };
}
function atlasHint(decision:IncidentTriageDecision,context:CustomerIncidentInput['context']|MerchantIncidentInput['context']){
  return{
    contract:'shoporation.incident-atlas-hint.v1',
    pendingCodebaseAtlasEnrichment:true,
    authorityHint:decision.authorityHint,
    routePath:context.routePath??null,
    surfaceKey:context.surfaceKey??null,
    componentKey:context.componentKey??null,
  };
}
async function applySystemTriage(admin:ReturnType<typeof createAdminClient>,incidentId:string,decision:IncidentTriageDecision,context:CustomerIncidentInput['context']|MerchantIncidentInput['context']){
  const{error}=await admin.rpc('triage_platform_incident_v2',{
    p_incident_id:incidentId,
    p_ownership:decision.ownership,
    p_reason_code:decision.reasonCode,
    p_status:decision.status,
    p_severity:decision.severity,
    p_known_failure_id:decision.knownFailureId,
    p_triage_confidence:decision.confidence,
    p_atlas_context:atlasHint(decision,context),
    p_actor_kind:'system',
    p_actor_user_id:null,
  });
  return!error;
}

export async function createCustomerIncident(input:CustomerIncidentInput,requestedCorrelationId?:string|null){
  const instance=await getCurrentWebshopInstance();
  if(!instance||!['pilot','active'].includes(instance.status))throw new IncidentServiceError('INCIDENT_INSTANCE_UNAVAILABLE',409,'Ehhez a webshophoz most nem küldhető hibabejelentés.');
  const session=await createClient(),{data:{user}}=await session.auth.getUser();
  const admin=createAdminClient(),corr=correlationId(requestedCorrelationId);
  await enforceRateLimit(`incident:customer:${instance.id}:${user?.id??keyHash(input.email.toLowerCase())}`,8,3600);
  const decision=triageIncident({source:'customer',category:input.category,impact:'single',errorCode:input.context.errorCode});
  const{data,error}=await admin.rpc('create_customer_incident_report_v1',{
    p_instance_id:instance.id,
    p_user_id:user?.id??null,
    p_email:input.email.toLowerCase(),
    p_name:input.name||null,
    p_order_number:input.orderNumber||null,
    p_title:input.title,
    p_description:input.description,
    p_incident_category:input.category,
    p_severity:decision.severity,
    p_correlation_id:corr,
    p_route_path:nullable(input.context.routePath),
    p_surface_key:nullable(input.context.surfaceKey),
    p_component_key:nullable(input.context.componentKey),
    p_app_version:appVersion(),
    p_environment:envName(),
    p_context:contextPayload(input.context),
    p_evidence:evidencePayload(input.context),
  });
  if(error)throw new IncidentServiceError('INCIDENT_CUSTOMER_CREATE_FAILED',500,'A hibabejelentés rögzítése nem sikerült.');
  const result=(data??{})as CustomerRpcResult;
  if(!result.incidentId||!UUID.test(result.incidentId)||!result.incidentNumber||!result.supportTicketId||!UUID.test(result.supportTicketId)||!result.supportTicketNumber){
    throw new IncidentServiceError('INCIDENT_CUSTOMER_EVIDENCE_INVALID',500,'A hibabejelentés rögzítésének eredménye nem igazolható.');
  }
  let triagePending=false;
  if(result.duplicate!==true){
    triagePending=!(await applySystemTriage(admin,result.incidentId,decision,input.context));
    if(triagePending)logEvent('warning','incident.triage.deferred',{incidentNumber:result.incidentNumber,correlationId:corr,source:'customer'});
  }
  logEvent('info','incident.customer.created',{incidentNumber:result.incidentNumber,supportTicketNumber:result.supportTicketNumber,correlationId:corr,duplicate:result.duplicate===true,triagePending});
  return{...result,correlationId:corr,triagePending};
}

export async function createMerchantIncident(input:MerchantIncidentInput,context:{instanceId:string;actorId:string;reporterRole:'merchant_owner'|'merchant_admin'|'merchant_staff';correlationId?:string|null}){
  const admin=createAdminClient(),corr=correlationId(context.correlationId);
  await enforceRateLimit(`incident:merchant:${context.instanceId}:${context.actorId}`,30,3600);
  const decision=triageIncident({source:'merchant',category:input.category,impact:input.impact,errorCode:input.context.errorCode});
  const{data,error}=await admin.rpc('create_platform_incident_v1',{
    p_instance_id:context.instanceId,
    p_support_ticket_id:null,
    p_source:'merchant',
    p_reporter_user_id:context.actorId,
    p_reporter_role:context.reporterRole,
    p_title:input.title,
    p_description:input.description,
    p_category:input.category,
    p_severity:decision.severity,
    p_correlation_id:corr,
    p_route_path:nullable(input.context.routePath),
    p_surface_key:nullable(input.context.surfaceKey),
    p_component_key:nullable(input.context.componentKey),
    p_app_version:appVersion(),
    p_environment:envName(),
    p_context:contextPayload(input.context),
    p_evidence:evidencePayload(input.context),
  });
  if(error)throw new IncidentServiceError('INCIDENT_MERCHANT_CREATE_FAILED',500,'A hibabejelentés rögzítése nem sikerült.');
  const result=(data??{})as PlatformIncidentResult;
  if(!result.id||!UUID.test(result.id)||!result.incidentNumber||result.instanceId!==context.instanceId)throw new IncidentServiceError('INCIDENT_MERCHANT_EVIDENCE_INVALID',500,'A hibabejelentés rögzítésének eredménye nem igazolható.');
  const triagePending=!(await applySystemTriage(admin,result.id,decision,input.context));
  if(triagePending)logEvent('warning','incident.triage.deferred',{incidentNumber:result.incidentNumber,correlationId:corr,source:'merchant'});
  logEvent('info','incident.merchant.created',{incidentNumber:result.incidentNumber,correlationId:corr,ownership:decision.ownership,triagePending});
  return{incidentId:result.id,incidentNumber:result.incidentNumber,correlationId:corr,triagePending,triage:decision};
}

export async function listPlatformIncidentQueue(filters:{limit:number;ownership?:string|null;severity?:string|null}){
  const admin=createAdminClient();
  let query=admin.from('platform_incident_queue').select('id,incident_number,instance_id,support_ticket_id,source,reporter_user_id,reporter_role,title,category,severity,status,ownership,ownership_reason_code,triage_confidence,known_failure_id,correlation_id,route_path,surface_key,component_key,app_version,environment,created_at,updated_at,triaged_at,resolved_at').limit(filters.limit);
  if(filters.ownership)query=query.eq('ownership',filters.ownership);
  if(filters.severity)query=query.eq('severity',filters.severity);
  const{data,error}=await query;
  if(error)throw new IncidentServiceError('INCIDENT_QUEUE_READ_FAILED',500,'Az incidenslista nem olvasható.');
  return data??[];
}

export async function applyManualIncidentTriage(incidentId:string,input:ManualIncidentTriageInput,actorId:string){
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('triage_platform_incident_v2',{
    p_incident_id:incidentId,
    p_ownership:input.ownership,
    p_reason_code:input.reasonCode,
    p_status:input.status,
    p_severity:input.severity,
    p_known_failure_id:input.knownFailureId??null,
    p_triage_confidence:input.confidence,
    p_atlas_context:{contract:'shoporation.manual-triage-atlas.v1',pendingCodebaseAtlasEnrichment:true},
    p_actor_kind:'platform',
    p_actor_user_id:actorId,
  });
  if(error)throw new IncidentServiceError('INCIDENT_TRIAGE_UPDATE_FAILED',500,'Az incidens besorolása nem menthető.');
  return data;
}

export async function registerSelfHealingPlan(input:{incidentId:string;runbookKey:string;requestedMode:SelfHealingMode;routePath?:string|null;createdByKind:'platform'|'system'|'ai';createdByUserId?:string|null;evidence?:Record<string,unknown>}){
  const policy=resolveSelfHealingPolicy({runbookKey:input.runbookKey,requestedMode:input.requestedMode,actorKind:input.createdByKind,routePath:input.routePath});
  const admin=createAdminClient();
  let repairRequestId:string|null=null;
  if(policy.mode!=='observe'){
    const{data,error}=await admin.rpc('create_incident_repair_request_v1',{
      p_incident_id:input.incidentId,
      p_repair_kind:policy.repairKind,
      p_target_authority:policy.targetAuthority,
      p_risk:policy.risk,
      p_auto_apply:policy.autoApply,
      p_proposal:{runbookKey:policy.key,mode:policy.mode,routePath:input.routePath??null},
      p_created_by_kind:input.createdByKind,
      p_created_by_user_id:input.createdByUserId??null,
    });
    if(error)throw new IncidentServiceError('INCIDENT_REPAIR_PROPOSAL_FAILED',500,'A javítási javaslat nem rögzíthető.');
    const row=(data??{})as{id?:string};
    if(!row.id||!UUID.test(row.id))throw new IncidentServiceError('INCIDENT_REPAIR_EVIDENCE_INVALID',500,'A javítási javaslat eredménye nem igazolható.');
    repairRequestId=row.id;
  }
  const{data,error}=await admin.rpc('create_self_healing_run_v1',{
    p_incident_id:input.incidentId,
    p_repair_request_id:repairRequestId,
    p_runbook_key:policy.key,
    p_mode:policy.mode,
    p_risk:policy.risk,
    p_auto_allowed:policy.autoAllowed,
    p_input_evidence:input.evidence??{},
  });
  if(error)throw new IncidentServiceError('INCIDENT_HEALING_RUN_FAILED',500,'Az öngyógyító folyamat nem indítható.');
  return{repairRequestId,run:data,policy};
}


export async function createPlatformRepairProposal(incidentId:string,runbookKey:string,actorId:string){
  const admin=createAdminClient();
  const{data,error}=await admin.from('platform_incidents').select('id,status,route_path').eq('id',incidentId).maybeSingle();
  if(error)throw new IncidentServiceError('INCIDENT_REPAIR_CONTEXT_FAILED',500,'Az incidens javítási környezete nem olvasható.');
  if(!data)throw new IncidentServiceError('INCIDENT_NOT_FOUND',404,'Az incidens nem található.');
  if(['resolved','closed','rejected'].includes(String(data.status)))throw new IncidentServiceError('INCIDENT_REPAIR_STATE_FORBIDDEN',409,'Lezárt vagy megoldott incidenshez nem indítható új javítási javaslat.');
  return registerSelfHealingPlan({
    incidentId,
    runbookKey,
    requestedMode:'propose',
    routePath:typeof data.route_path==='string'?data.route_path:null,
    createdByKind:'platform',
    createdByUserId:actorId,
    evidence:{source:'platform-incident-center',requestedMode:'propose',statusBefore:data.status},
  });
}


export async function registerDeterministicSystemHealingPlan(input:{incidentId:string;runbookKey:string;routePath?:string|null;evidence?:Record<string,unknown>}){
  return registerSelfHealingPlan({
    incidentId:input.incidentId,
    runbookKey:input.runbookKey,
    requestedMode:'auto',
    routePath:input.routePath,
    createdByKind:'system',
    evidence:{
      ...(input.evidence??{}),
      source:'deterministic-system-runbook',
      executionSemantics:'eligibility-not-completion',
      completionEvidenceRequired:true,
    },
  });
}
