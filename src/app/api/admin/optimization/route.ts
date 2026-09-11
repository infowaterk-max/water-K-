import { NextRequest,NextResponse } from 'next/server';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { hasCurrentPlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAudit } from '@/lib/admin/audit';
import {
  DEFAULT_COMMERCE_AUTONOMY_POLICY,BOUNDED_AUTONOMOUS_ACTIONS,compensateAutonomyRun,executeBoundedPrediction,
  loadAutomationControl,loadCommerceAutonomyPolicy,loadPredictiveCommerceSignals,saveCommerceAutonomyPolicy,
  type BoundedAutonomousActionKind,type CommerceAutonomyMode,type CommerceAutonomyPolicy,
} from '@/lib/optimization/predictive-commerce';

export const dynamic='force-dynamic';

async function readAccess(){
  const user=await getAdminRequestUser('analytics.read');if(!user)return null;
  const store=await requireCurrentStoreContext('analytics.read');
  if(!(await hasCurrentPlanFeature('executiveAnalytics'))||!(await hasCurrentPlanFeature('automation')))return null;
  return{user,store};
}
async function writeAccess(){
  const user=await getAdminRequestUser('store.manage');if(!user)return null;
  const store=await requireCurrentStoreContext('store.manage');
  if(!(await hasCurrentPlanFeature('executiveAnalytics'))||!(await hasCurrentPlanFeature('automation')))return null;
  return{user,store};
}
const finite=(value:unknown,min:number,max:number,fallback:number)=>{const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=min&&parsed<=max?parsed:fallback};
const validMode=(value:unknown):CommerceAutonomyMode=>value==='supervised'||value==='bounded'||value==='off'?value:'off';
const validActions=(value:unknown):BoundedAutonomousActionKind[]=>Array.isArray(value)?value.filter((item):item is BoundedAutonomousActionKind=>typeof item==='string'&&BOUNDED_AUTONOMOUS_ACTIONS.includes(item as BoundedAutonomousActionKind)):[];

export async function GET(){
  const context=await readAccess();if(!context)return NextResponse.json({error:'Nincs jogosultság vagy csomag-hozzáférés.'},{status:403});
  try{
    const admin=createAdminClient();
    const[signals,policy,control,runs]=await Promise.all([
      loadPredictiveCommerceSignals(context.store.instanceId),loadCommerceAutonomyPolicy(context.store.instanceId),loadAutomationControl(context.store.instanceId),
      admin.from('commerce_autonomy_runs').select('id,run_key,prediction_key,action_kind,risk_class,confidence,risk_score,status,proposal_id,workflow_run_key,runbook_instance_id,created_at,compensated_at').eq('instance_id',context.store.instanceId).order('created_at',{ascending:false}).limit(30),
    ]);
    if(runs.error&&runs.error.code!=='42P01')throw runs.error;
    return NextResponse.json({ok:true,version:'block19.v1',signals,policy,control,runs:runs.data??[]});
  }catch(error){console.error('block19 load failed',error);return NextResponse.json({error:'A prediktív optimalizációs bizonyíték most nem tölthető be.'},{status:503});}
}

export async function PUT(req:NextRequest){
  const context=await writeAccess();if(!context)return NextResponse.json({error:'Nincs jogosultság vagy csomag-hozzáférés.'},{status:403});
  let body:Record<string,unknown>;try{body=await req.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const previous=await loadCommerceAutonomyPolicy(context.store.instanceId);
  const policy:CommerceAutonomyPolicy={
    mode:validMode(body.mode),killSwitch:body.killSwitch===false?false:true,
    minConfidence:finite(body.minConfidence,0,1,previous.minConfidence),maxRiskScore:finite(body.maxRiskScore,0,100,previous.maxRiskScore),
    maxImpactNetHuf:finite(body.maxImpactNetHuf,0,1_000_000_000,previous.maxImpactNetHuf),marginFloorPercent:finite(body.marginFloorPercent,0,100,previous.marginFloorPercent),
    inventoryFloorQuantity:finite(body.inventoryFloorQuantity,0,1_000_000,previous.inventoryFloorQuantity),maxDiscountPercent:finite(body.maxDiscountPercent,0,100,previous.maxDiscountPercent),
    maxBudgetNetHuf:finite(body.maxBudgetNetHuf,0,1_000_000_000,previous.maxBudgetNetHuf),staleAfterMinutes:finite(body.staleAfterMinutes,1,1440,previous.staleAfterMinutes),
    allowedActions:validActions(body.allowedActions),
  };
  if(policy.mode==='bounded'&&policy.killSwitch)return NextResponse.json({error:'Bounded mód csak feloldott tenant kill switch mellett menthető.'},{status:409});
  if(policy.mode==='bounded'&&policy.allowedActions.length===0)return NextResponse.json({error:'Bounded módhoz legalább egy explicit allowlistelt workflow szükséges.'},{status:409});
  try{
    const saved=await saveCommerceAutonomyPolicy(context.store.instanceId,context.user.id,policy);
    const audit=await recordAdminAudit({actorUserId:context.user.id,action:'commerce.autonomy_policy_updated',entityType:'commerce_autonomy_policy',entityId:context.store.instanceId,instanceId:context.store.instanceId,summary:`Block 19 autonomy policy: ${previous.mode} → ${policy.mode}`,beforeState:previous,afterState:policy,metadata:{version:'block19.v1'}});
    if(!audit)return NextResponse.json({error:'A policy mentése megtörtént, de az audit bizonyíték hiányzik; a műveletet vizsgáld felül.'},{status:500});
    return NextResponse.json({ok:true,policy:saved});
  }catch(error){console.error('block19 policy save failed',error);return NextResponse.json({error:'Az autonómia policy nem menthető.'},{status:500});}
}

export async function POST(req:NextRequest){
  const context=await writeAccess();if(!context)return NextResponse.json({error:'Nincs jogosultság vagy csomag-hozzáférés.'},{status:403});
  let body:{operation?:string;predictionKey?:string;runId?:string};try{body=await req.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  try{
    if(body.operation==='compensate'){
      if(!body.runId)return NextResponse.json({error:'Hiányzó futásazonosító.'},{status:400});
      const result=await compensateAutonomyRun(context.store.instanceId,context.user.id,body.runId);
      await recordAdminAudit({actorUserId:context.user.id,action:'commerce.autonomy_compensated',entityType:'commerce_autonomy_run',entityId:body.runId,instanceId:context.store.instanceId,summary:'Block 19 autonóm workflow emberi felülbírálással kompenzálva.',afterState:result,metadata:{version:'block19.v1'}});
      return NextResponse.json({ok:true,data:result});
    }
    if(body.operation!=='execute'||!body.predictionKey||body.predictionKey.length>180)return NextResponse.json({error:'Érvénytelen predikciós művelet.'},{status:400});
    const signal=(await loadPredictiveCommerceSignals(context.store.instanceId)).find(item=>item.key===body.predictionKey);
    if(!signal)return NextResponse.json({error:'A predikció már nem aktuális vagy nem található.'},{status:409});
    const result=await executeBoundedPrediction(context.store.instanceId,context.user.id,signal);
    await recordAdminAudit({actorUserId:context.user.id,action:'commerce.predictive_action_evaluated',entityType:'commerce_autonomy_run',entityId:String(result.id??''),instanceId:context.store.instanceId,summary:`Block 19 guardrail döntés: ${String(result.status??'unknown')}`,afterState:{predictionKey:signal.key,actionKind:signal.actionKind,status:result.status},metadata:{version:'block19.v1',authority:'predictive-commerce-guardrails'}});
    const status=result.status==='blocked'?409:result.status==='approval_required'||result.status==='awaiting_approval'||result.status==='retry'?202:200;
    return NextResponse.json({ok:result.status!=='blocked',data:result},{status});
  }catch(error){console.error('block19 execution failed',error);return NextResponse.json({error:error instanceof Error?error.message:'A guardolt végrehajtás nem sikerült.'},{status:500});}
}

export async function DELETE(){
  const context=await writeAccess();if(!context)return NextResponse.json({error:'Nincs jogosultság vagy csomag-hozzáférés.'},{status:403});
  try{
    const previous=await loadCommerceAutonomyPolicy(context.store.instanceId);
    const disabled={...DEFAULT_COMMERCE_AUTONOMY_POLICY};
    await saveCommerceAutonomyPolicy(context.store.instanceId,context.user.id,disabled);
    const admin=createAdminClient();
    await admin.rpc('set_store_automation_pause_v2',{p_instance_id:context.store.instanceId,p_actor_id:context.user.id,p_paused:true,p_reason:'Block 19 emergency kill switch',p_event_key:`block19-kill-${crypto.randomUUID()}`});
    await recordAdminAudit({actorUserId:context.user.id,action:'commerce.autonomy_kill_switch_engaged',entityType:'commerce_autonomy_policy',entityId:context.store.instanceId,instanceId:context.store.instanceId,summary:'Block 19 emergency kill switch bekapcsolva.',beforeState:previous,afterState:disabled,metadata:{version:'block19.v1'}});
    return NextResponse.json({ok:true,policy:disabled});
  }catch(error){console.error('block19 kill switch failed',error);return NextResponse.json({error:'A vészleállítás nem hajtható végre.'},{status:500});}
}
