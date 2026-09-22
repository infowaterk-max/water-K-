import{NextResponse}from'next/server';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req:Request){
 const user=await getPlatformRequestUser();if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const body=await req.json().catch(()=>({})),a=createAdminClient(),now=new Date().toISOString();

 if(body.action==='cycle'){
  const runKey=`admin:${user.id}:${now.slice(0,16)}`;
  const{data,error}=await a.rpc('process_recovery_governance_cycle',{p_run_key:runKey});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const{data:run,error:readError}=await a.from('recovery_runs').select('id,run_key,status,completed_at').eq('run_key',runKey).maybeSingle();
  if(readError||!run||!run.id||run.run_key!==runKey||run.status!=='completed'||!run.completed_at)return NextResponse.json({error:'A helyreállítási governance ciklus eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data,run});
 }

 if(body.action==='manual_evidence'){
  const{data,error}=await a.rpc('record_recovery_evidence',{p_service_key:String(body.serviceKey??''),p_evidence_kind:String(body.kind??'manual'),p_status:String(body.status??'pass'),p_trusted:false,p_source:'manual_attestation',p_observed_at:now,p_evidence:{note:String(body.note??''),actor_id:user.id},p_event_key:`manual:${String(body.serviceKey)}:${user.id}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  if(typeof data!=='string'||!uuid.test(data))return NextResponse.json({error:'A recovery evidence rögzítésének eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data});
 }

 if(body.action==='plan_drill'){
  const{data,error}=await a.rpc('plan_recovery_drill',{p_service_key:String(body.serviceKey??''),p_scenario:String(body.scenario??''),p_planned_at:String(body.plannedAt??now),p_actor_id:user.id,p_drill_key:`drill:${String(body.serviceKey)}:${String(body.plannedAt??now)}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  if(typeof data!=='string'||!uuid.test(data))return NextResponse.json({error:'A recovery drill tervezésének eredménye nem igazolható.'},{status:500});
  const{data:drill,error:readError}=await a.from('recovery_drills').select('id,status').eq('id',data).maybeSingle();
  if(readError||!drill||drill.status!=='planned')return NextResponse.json({error:'A recovery drill tervezett állapota nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data});
 }

 if(body.action==='start_drill'){
  const drillId=String(body.drillId??'');
  const{error}=await a.rpc('start_recovery_drill',{p_drill_id:drillId,p_actor_id:user.id,p_event_key:`drill-start:${drillId}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const{data:drill,error:readError}=await a.from('recovery_drills').select('id,status,started_at').eq('id',drillId).maybeSingle();
  if(readError||!drill||drill.id!==drillId||drill.status!=='running'||!drill.started_at)return NextResponse.json({error:'A recovery drill indításának eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:drill});
 }

 if(body.action==='complete_drill'){
  const drillId=String(body.drillId??'');
  const{data,error}=await a.rpc('complete_recovery_drill',{p_drill_id:drillId,p_actor_id:user.id,p_measured_rto:Number(body.rto),p_measured_rpo:Number(body.rpo),p_restore_validated:Boolean(body.restoreValidated),p_result:{note:String(body.note??'')},p_event_key:`drill-complete:${drillId}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  if(!['passed','failed'].includes(String(data??'')))return NextResponse.json({error:'A recovery drill lezárásának eredménye nem igazolható.'},{status:500});
  const{data:drill,error:readError}=await a.from('recovery_drills').select('id,status,completed_at').eq('id',drillId).maybeSingle();
  if(readError||!drill||drill.id!==drillId||drill.status!==data||!drill.completed_at)return NextResponse.json({error:'A recovery drill végállapotának visszaellenőrzése nem sikerült.'},{status:500});
  return NextResponse.json({ok:true,data});
 }

 if(body.action==='ack'){
  const findingId=String(body.findingId??'');
  const{error}=await a.rpc('acknowledge_recovery_finding',{p_finding_id:findingId,p_actor_id:user.id,p_event_key:`recovery-ack:${findingId}:${user.id}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const{data:finding,error:readError}=await a.from('recovery_findings').select('id,status').eq('id',findingId).maybeSingle();
  if(readError||!finding||finding.id!==findingId||finding.status!=='acknowledged')return NextResponse.json({error:'A recovery finding átvételének eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:finding});
 }

 if(body.action==='decision'){
  const{data,error}=await a.rpc('record_recovery_decision',{p_finding_id:body.findingId,p_actor_id:user.id,p_decision:String(body.decision),p_note:String(body.note??''),p_decision_key:`recovery-decision:${body.findingId}:${user.id}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  if(typeof data!=='string'||!uuid.test(data))return NextResponse.json({error:'A recovery döntés eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data});
 }

 return NextResponse.json({error:'Ismeretlen művelet.'},{status:400});
}
