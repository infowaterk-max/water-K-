import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadMerchantDecisionSnapshot } from '@/lib/decisioning/merchant-intelligence';
import { dispatchEventDrivenWorkflow } from '@/lib/automation/event-driven-workflows';
import { sanitizeWorkflowEvidence } from '@/lib/automation/event-driven-workflows';
import {
  DEFAULT_COMMERCE_AUTONOMY_POLICY,buildPredictiveCommerceSignals,evaluateAutonomyGuardrails,
  type AutomationControlState,type BoundedAutonomousActionKind,type CommerceAutonomyPolicy,type PredictiveCommerceSignal,type PredictiveCommerceSnapshot,
} from './predictive-commerce-core';

export * from './predictive-commerce-core';
export const PREDICTIVE_COMMERCE_VERSION='block19.v1';

const n=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;
const mode=(value:unknown):CommerceAutonomyPolicy['mode']=>value==='supervised'||value==='bounded'?value:'off';
const allowed=(value:unknown):BoundedAutonomousActionKind[]=>Array.isArray(value)?value.filter((item):item is BoundedAutonomousActionKind=>item==='workflow.inventory-pressure'||item==='workflow.customer-value-risk'):[];

export async function loadPredictiveCommerceSignals(instanceId:string):Promise<PredictiveCommerceSignal[]>{
  const snapshot=await loadMerchantDecisionSnapshot(instanceId);
  const input:PredictiveCommerceSnapshot={
    observedAt:new Date().toISOString(),
    variants:snapshot.variants.map(v=>({id:v.id,sku:v.sku,label:v.label,netPriceHuf:v.net_price_huf,unitCostNetHuf:v.unit_cost_net_huf,stockQuantity:v.stock_quantity,active:v.active})),
    opportunities:snapshot.opportunities.map(o=>({id:o.id,priorityScore:o.priority_score,expectedValueNetHuf:o.expected_value_net_huf,probabilityPercent:o.probability_percent,status:o.status,channel:o.channel,kind:o.kind})),
    promotions:snapshot.promotionPreviews,
    growth:{atRiskCustomers:n(snapshot.growth?.at_risk_customers),winbackCustomers:n(snapshot.growth?.winback_customers),openCheckoutRecoveries:n(snapshot.growth?.open_checkout_recoveries)},
  };
  return buildPredictiveCommerceSignals(input);
}

export async function loadCommerceAutonomyPolicy(instanceId:string):Promise<CommerceAutonomyPolicy>{
  const admin=createAdminClient();
  const{data,error}=await admin.from('commerce_autonomy_policies').select('mode,kill_switch,min_confidence,max_risk_score,max_impact_net_huf,margin_floor_percent,inventory_floor_quantity,max_discount_percent,max_budget_net_huf,stale_after_minutes,allowed_actions').eq('instance_id',instanceId).maybeSingle();
  if(error){if(error.code==='42P01')return DEFAULT_COMMERCE_AUTONOMY_POLICY;throw error;}
  if(!data)return DEFAULT_COMMERCE_AUTONOMY_POLICY;
  return{mode:mode(data.mode),killSwitch:Boolean(data.kill_switch),minConfidence:n(data.min_confidence),maxRiskScore:n(data.max_risk_score),maxImpactNetHuf:n(data.max_impact_net_huf),marginFloorPercent:n(data.margin_floor_percent),inventoryFloorQuantity:n(data.inventory_floor_quantity),maxDiscountPercent:n(data.max_discount_percent),maxBudgetNetHuf:n(data.max_budget_net_huf),staleAfterMinutes:n(data.stale_after_minutes)||15,allowedActions:allowed(data.allowed_actions)};
}

export async function loadAutomationControl(instanceId:string):Promise<AutomationControlState>{
  const admin=createAdminClient();
  const{data,error}=await admin.from('automation_control').select('global_paused,circuit_open_until').eq('instance_id',instanceId).maybeSingle();
  if(error)throw error;
  return data?{exists:true,globalPaused:Boolean(data.global_paused),circuitOpenUntil:typeof data.circuit_open_until==='string'?data.circuit_open_until:null}:{exists:false,globalPaused:true,circuitOpenUntil:null};
}

export async function saveCommerceAutonomyPolicy(instanceId:string,actorId:string,policy:CommerceAutonomyPolicy){
  const admin=createAdminClient();
  const payload={instance_id:instanceId,mode:policy.mode,kill_switch:policy.killSwitch,min_confidence:policy.minConfidence,max_risk_score:policy.maxRiskScore,max_impact_net_huf:policy.maxImpactNetHuf,margin_floor_percent:policy.marginFloorPercent,inventory_floor_quantity:policy.inventoryFloorQuantity,max_discount_percent:policy.maxDiscountPercent,max_budget_net_huf:policy.maxBudgetNetHuf,stale_after_minutes:policy.staleAfterMinutes,allowed_actions:policy.allowedActions,updated_by:actorId,updated_at:new Date().toISOString()};
  const{data,error}=await admin.from('commerce_autonomy_policies').upsert(payload,{onConflict:'instance_id'}).select().single();
  if(error)throw error;return data;
}

export async function ensureHighRiskProposal(instanceId:string,actorId:string,signal:PredictiveCommerceSignal){
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('create_block19_action_proposal_v1',{p_instance_id:instanceId,p_actor_id:actorId,p_prediction_key:signal.key,p_requested_action_kind:signal.actionKind,p_risk_score:signal.riskScore,p_rationale:signal.recommendation,p_source_snapshot:sanitizeWorkflowEvidence({authority:signal.authority,confidence:signal.confidence,expectedImpactNetHuf:signal.expectedImpactNetHuf,observedAt:signal.observedAt}),p_proposed_payload:sanitizeWorkflowEvidence({requestedActionKind:signal.actionKind,...signal.guardMetrics})});
  if(error)throw error;return String(data);
}

export async function executeBoundedPrediction(instanceId:string,actorId:string,signal:PredictiveCommerceSignal){
  const admin=createAdminClient();
  const[policy,control]=await Promise.all([loadCommerceAutonomyPolicy(instanceId),loadAutomationControl(instanceId)]);
  const guard=evaluateAutonomyGuardrails(signal,policy,control);
  const runKey=`block19:${signal.key}:${signal.observedAt.slice(0,13)}`;
  const snapshot={version:PREDICTIVE_COMMERCE_VERSION,signalKey:signal.key,actionKind:signal.actionKind,confidence:signal.confidence,riskScore:signal.riskScore,riskClass:signal.riskClass,expectedImpactNetHuf:signal.expectedImpactNetHuf,observedAt:signal.observedAt,authority:signal.authority};
  const{data:existing,error:existingError}=await admin.from('commerce_autonomy_runs').select('*').eq('instance_id',instanceId).eq('run_key',runKey).maybeSingle();
  if(existingError)throw existingError;if(existing)return existing;

  if(guard.decision==='approval_required'){
    const proposalId=await ensureHighRiskProposal(instanceId,actorId,signal);
    const{data,error}=await admin.from('commerce_autonomy_runs').insert({instance_id:instanceId,run_key:runKey,prediction_key:signal.key,action_kind:signal.actionKind,risk_class:signal.riskClass,confidence:signal.confidence,risk_score:signal.riskScore,expected_impact_net_huf:signal.expectedImpactNetHuf,status:'approval_required',proposal_id:proposalId,policy_snapshot:policy,evidence_snapshot:snapshot,result:{guard}}).select().single();
    if(error)throw error;return data;
  }
  if(guard.decision!=='autonomous_allowed'||!signal.autonomousEvent){
    const status=guard.decision==='supervised'?'supervised':'blocked';
    const{data,error}=await admin.from('commerce_autonomy_runs').insert({instance_id:instanceId,run_key:runKey,prediction_key:signal.key,action_kind:signal.actionKind,risk_class:signal.riskClass,confidence:signal.confidence,risk_score:signal.riskScore,expected_impact_net_huf:signal.expectedImpactNetHuf,status,policy_snapshot:policy,evidence_snapshot:snapshot,result:{guard}}).select().single();
    if(error)throw error;return data;
  }

  const workflow=await dispatchEventDrivenWorkflow({instanceId,type:signal.autonomousEvent,sourceId:`block19:${signal.key}`,title:signal.title,description:signal.summary,evidence:sanitizeWorkflowEvidence({authority:signal.authority,confidence:signal.confidence,riskScore:signal.riskScore,expectedImpactNetHuf:signal.expectedImpactNetHuf})});
  const status=workflow.status==='completed'||workflow.status==='idempotent'?'completed':workflow.status;
  const{data,error}=await admin.from('commerce_autonomy_runs').insert({instance_id:instanceId,run_key:runKey,prediction_key:signal.key,action_kind:signal.actionKind,risk_class:signal.riskClass,confidence:signal.confidence,risk_score:signal.riskScore,expected_impact_net_huf:signal.expectedImpactNetHuf,status,workflow_run_key:workflow.runKey,runbook_instance_id:workflow.runbookInstanceId??null,policy_snapshot:policy,evidence_snapshot:snapshot,result:{guard,workflow}}).select().single();
  if(error)throw error;return data;
}

export async function compensateAutonomyRun(instanceId:string,actorId:string,runId:string){
  const admin=createAdminClient();
  const{data:run,error}=await admin.from('commerce_autonomy_runs').select('id,status,runbook_instance_id').eq('id',runId).eq('instance_id',instanceId).maybeSingle();
  if(error||!run)throw error??new Error('AUTONOMY_RUN_NOT_FOUND');
  if(!run.runbook_instance_id)throw new Error('AUTONOMY_RUN_NOT_COMPENSATABLE');
  const{data:runbook,error:runbookError}=await admin.from('automation_runbook_instances').select('status').eq('id',run.runbook_instance_id).eq('instance_id',instanceId).maybeSingle();
  if(runbookError||!runbook)throw runbookError??new Error('AUTONOMY_RUNBOOK_NOT_FOUND');
  if(!['planned','active','paused'].includes(String(runbook.status)))throw new Error('AUTONOMY_RUN_NOT_COMPENSATABLE_TERMINAL');
  const eventKey=`block19:compensate:${run.id}`;
  const{data:transition,error:transitionError}=await admin.rpc('transition_automation_instance_v2',{p_store_instance_id:instanceId,p_runbook_instance_id:run.runbook_instance_id,p_actor_id:actorId,p_target:'cancelled',p_event_key:eventKey,p_reason:'Block 19 human override / compensation'});
  if(transitionError)throw transitionError;
  const{data:updated,error:updateError}=await admin.from('commerce_autonomy_runs').update({status:'compensated',compensated_at:new Date().toISOString(),compensated_by:actorId,result:{compensation:transition}}).eq('id',run.id).eq('instance_id',instanceId).select().single();
  if(updateError)throw updateError;return updated;
}
