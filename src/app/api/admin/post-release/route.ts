import{NextResponse}from'next/server';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';

const sessionStatuses=new Set(['observing','degraded','rollback_recommended','stable','closed','cancelled']);

export async function POST(req:Request){
 const user=await getPlatformRequestUser();if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const body=await req.json().catch(()=>({})),a=createAdminClient(),now=new Date().toISOString();

 if(body.action==='start'){
  const candidateId=String(body.candidateId??'');
  const{data,error}=await a.rpc('start_post_release_session',{p_release_candidate_id:candidateId,p_actor_id:user.id,p_event_key:`post-start:${candidateId}:${user.id}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const session=(data??{})as{id?:string;release_candidate_id?:string;status?:string};
  if(!session.id||session.release_candidate_id!==candidateId||!sessionStatuses.has(String(session.status??'')))return NextResponse.json({error:'Az utóellenőrzési munkamenet indításának eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:session});
 }

 if(body.action==='cycle'){
  const runKey=`admin:${user.id}:${now.slice(0,16)}`;
  const{data,error}=await a.rpc('process_post_release_cycle',{p_run_key:runKey});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const result=(data??{})as{processed?:number;run_key?:string};
  if(result.run_key!==runKey||!Number.isInteger(result.processed)||Number(result.processed)<0)return NextResponse.json({error:'Az utóellenőrzési ciklus eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:result});
 }

 if(body.action==='reconcile'){
  const sessionId=String(body.sessionId??''),runKey=`manual:${user.id}:${now}`;
  const{data,error}=await a.rpc('reconcile_post_release_session',{p_session_id:sessionId,p_run_key:runKey});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const result=(data??{})as{status?:string};
  if(!sessionStatuses.has(String(result.status??'')))return NextResponse.json({error:'Az utóellenőrzési egyeztetés eredménye nem igazolható.'},{status:500});
  const{data:session,error:readError}=await a.from('post_release_sessions').select('id,status').eq('id',sessionId).maybeSingle();
  if(readError||!session||session.id!==sessionId||session.status!==result.status)return NextResponse.json({error:'Az utóellenőrzési állapot visszaellenőrzése nem sikerült.'},{status:500});
  return NextResponse.json({ok:true,data:result});
 }

 if(body.action==='close'||body.action==='cancel'){
  const sessionId=String(body.sessionId??''),decision=body.action;
  const{data,error}=await a.rpc('decide_post_release_session',{p_session_id:sessionId,p_actor_id:user.id,p_decision:decision,p_note:'Admin utóellenőrzési döntés',p_event_key:`post:${decision}:${sessionId}:${user.id}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const session=(data??{})as{id?:string;status?:string};
  const expected=decision==='close'?'closed':'cancelled';
  if(session.id!==sessionId||session.status!==expected)return NextResponse.json({error:'Az utóellenőrzési döntés eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:session});
 }

 if(body.action==='rollback_decision'){
  const sessionId=String(body.sessionId??''),decision=String(body.decision??'');
  const{data,error}=await a.rpc('decide_post_release_rollback',{p_session_id:sessionId,p_actor_id:user.id,p_decision:decision,p_note:String(body.note??''),p_event_key:`rollback:${sessionId}:${user.id}:${now}`});
  if(error)return NextResponse.json({error:error.message},{status:400});
  const result=(data??{})as{id?:string;session_id?:string;decision?:string};
  if(!result.id||result.session_id!==sessionId||result.decision!==decision)return NextResponse.json({error:'A rollback döntés eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:result});
 }

 return NextResponse.json({error:'Ismeretlen művelet.'},{status:400});
}
