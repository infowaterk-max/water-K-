import{NextResponse}from'next/server';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';

type Candidate={id?:string;candidate_key?:string;source_sha?:string;status?:string;ci_status?:string;evaluated_at?:string|null;gate_hash?:string|null};
type GovernanceRun={id?:string;run_key?:string;status?:string;completed_at?:string|null};

function validGovernanceRun(data:unknown,runKey:string){
 const run=(data??{})as GovernanceRun;
 return Boolean(run.id)&&run.run_key===runKey&&run.status==='completed'&&Boolean(run.completed_at);
}

export async function POST(req:Request){
 const user=await getPlatformRequestUser();if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const body=await req.json().catch(()=>({})),a=createAdminClient(),now=new Date().toISOString();

 if(body.action==='create'){
  const sourceSha=String(body.sourceSha??''),key=`release:${String(body.versionLabel)}:${sourceSha.slice(0,12)}`;
  const{data,error}=await a.rpc('create_release_candidate',{p_candidate_key:key,p_version_label:String(body.versionLabel??''),p_source_ref:String(body.sourceRef??''),p_source_sha:sourceSha,p_risk_class:String(body.riskClass??'standard'),p_change_summary:String(body.changeSummary??''),p_rollback_plan:String(body.rollbackPlan??''),p_created_by:user.id,p_event_key:`create:${key}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const candidate=(data??{})as Candidate;
  if(!candidate.id||candidate.candidate_key!==key||candidate.source_sha!==sourceSha)return NextResponse.json({error:'A kiadási jelölt létrehozásának eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:candidate});
 }

 if(body.action==='ci_success'){
  const candidateId=String(body.candidateId??'');
  const{data,error}=await a.rpc('update_release_ci_evidence',{p_candidate_id:candidateId,p_actor_id:user.id,p_ci_status:'success',p_observed_at:now,p_evidence:{source:'manual_attestation',verification:'untrusted',recorded_at:now},p_event_key:`ci:${candidateId}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const candidate=(data??{})as Candidate;
  if(candidate.id!==candidateId||candidate.ci_status!=='success'||candidate.status!=='draft')return NextResponse.json({error:'A CI evidence frissítésének eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:candidate});
 }

 if(body.action==='evaluate'){
  const candidateId=String(body.candidateId??''),runKey=`pre-eval:${now.slice(0,16)}`;
  const preEval=await a.rpc('process_release_governance_cycle',{p_run_key:runKey});
  if(preEval.error)return NextResponse.json({error:'A kiadás értékelése előtti governance egyeztetés nem sikerült. Az értékelést nem indítjuk el.'},{status:500});
  if(!validGovernanceRun(preEval.data,runKey))return NextResponse.json({error:'A kiadás értékelése előtti governance evidence nem igazolható. Az értékelést nem indítjuk el.'},{status:500});
  const{data,error}=await a.rpc('evaluate_release_candidate',{p_candidate_id:candidateId,p_actor_id:user.id,p_event_key:`evaluate:${candidateId}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const candidate=(data??{})as Candidate;
  if(candidate.id!==candidateId||!['ready','evaluated'].includes(String(candidate.status??''))||!candidate.evaluated_at||!candidate.gate_hash)return NextResponse.json({error:'A kiadási értékelés eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:candidate,governance:preEval.data});
 }

 if(body.action==='approve'||body.action==='reject'){
  const candidateId=String(body.candidateId??''),decision=body.action==='approve'?'approved':'rejected';
  const{data,error}=await a.rpc('decide_release_candidate',{p_candidate_id:candidateId,p_actor_id:user.id,p_decision:decision,p_note:'Admin Kiadási központ döntés',p_event_key:`decision:${body.action}:${candidateId}:${user.id}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const candidate=(data??{})as Candidate;
  const validStatus=body.action==='approve'?['ready','approved'].includes(String(candidate.status??'')):candidate.status==='rejected';
  if(candidate.id!==candidateId||!validStatus)return NextResponse.json({error:'A kiadási döntés eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:candidate});
 }

 if(body.action==='cancel'){
  const candidateId=String(body.candidateId??'');
  const{data,error}=await a.rpc('cancel_release_candidate',{p_candidate_id:candidateId,p_actor_id:user.id,p_reason:'Admin Kiadási központ megszakítás',p_event_key:`cancel:${candidateId}:${user.id}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const candidate=(data??{})as Candidate;
  if(candidate.id!==candidateId||candidate.status!=='cancelled')return NextResponse.json({error:'A kiadási jelölt megszakításának eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:candidate});
 }

 if(body.action==='reconcile'){
  const runKey=`admin:${user.id}:${now.slice(0,16)}`;
  const{data,error}=await a.rpc('process_release_governance_cycle',{p_run_key:runKey});
  if(error)return NextResponse.json({error:error.message},{status:400});
  if(!validGovernanceRun(data,runKey))return NextResponse.json({error:'A release governance ciklus eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data});
 }

 return NextResponse.json({error:'Ismeretlen művelet.'},{status:400});
}
