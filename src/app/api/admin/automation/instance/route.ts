import{NextRequest,NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{hasCurrentPlanFeature}from'@/lib/plans/access';

export async function POST(req:NextRequest){
 const user=await getAdminRequestUser('store.manage');if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const store=await requireCurrentStoreContext('store.manage');
 if(!(await hasCurrentPlanFeature('automation')))return NextResponse.json({error:'Az automatizálás a Pro csomag része.'},{status:403});
 let body:{instanceId?:string;action?:string};try{body=await req.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const id=String(body.instanceId??''),action=String(body.action??'');
 if(!id||!['activate','pause','resume','cancel','step'].includes(action))return NextResponse.json({error:'Érvénytelen művelet.'},{status:400});
 const a=createAdminClient(),key=`${store.instanceId}:${user.id}:${id}:${action}:${Date.now()}`;
 let data:unknown=null,errorMessage:string|null=null;
 if(action==='activate'){
  const result=await a.rpc('activate_automation_runbook_v2',{p_store_instance_id:store.instanceId,p_runbook_instance_id:id,p_actor_id:user.id,p_event_key:key});
  data=result.data;errorMessage=result.error?.message??null;
 }else if(action==='step'){
  const result=await a.rpc('execute_automation_step_v2',{p_store_instance_id:store.instanceId,p_runbook_instance_id:id,p_actor_id:user.id,p_execution_key:key});
  data=result.data;errorMessage=result.error?.message??null;
 }else{
  const target=action==='pause'?'paused':action==='resume'?'active':'cancelled';
  const result=await a.rpc('transition_automation_instance_v2',{p_store_instance_id:store.instanceId,p_runbook_instance_id:id,p_actor_id:user.id,p_target:target,p_event_key:key,p_reason:'Admin művelet'});
  data=result.data;errorMessage=result.error?.message??null;
 }
 if(errorMessage)return NextResponse.json({error:errorMessage},{status:400});

 if(action==='step'){
  const step=(data??{})as{id?:string;instance_id?:string;store_instance_id?:string;status?:string};
  if(!step.id||step.instance_id!==id||step.store_instance_id!==store.instanceId)return NextResponse.json({error:'Az automatizálási lépés eredménye nem igazolható.'},{status:500});
  if(step.status==='failed')return NextResponse.json({error:'Az automatizálási lépés végrehajtása sikertelen. A hiba rögzítésre került, ezért a műveletet nem tekintjük sikeresnek.',stepId:step.id},{status:409});
  if(!['waiting','succeeded'].includes(String(step.status??'')))return NextResponse.json({error:'Az automatizálási lépés visszatérési állapota nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,data:step});
 }

 const expectedStatus=action==='activate'?'active':action==='pause'?'paused':action==='resume'?'active':'cancelled';
 const instance=(data??{})as{id?:string;instance_id?:string;status?:string};
 if(instance.id!==id||instance.instance_id!==store.instanceId||instance.status!==expectedStatus)return NextResponse.json({error:'Az automatizálási folyamat állapotváltozásának eredménye nem igazolható.'},{status:500});
 return NextResponse.json({ok:true,data:instance});
}
