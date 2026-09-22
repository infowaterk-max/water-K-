import{NextRequest,NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{hasCurrentPlanFeature}from'@/lib/plans/access';

export async function POST(req:NextRequest){
 const user=await getAdminRequestUser('store.manage');if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const store=await requireCurrentStoreContext('store.manage');
 if(!(await hasCurrentPlanFeature('executiveAnalytics')))return NextResponse.json({error:'Az Irányítóközpont a Pro csomag része.'},{status:403});
 let body:{taskId?:string;targetStatus?:string;outcome?:string};try{body=await req.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const taskId=String(body.taskId??''),targetStatus=String(body.targetStatus??''),outcome=String(body.outcome??'').trim();
 if(!taskId||!['in_progress','completed','cancelled'].includes(targetStatus))return NextResponse.json({error:'Érvénytelen művelet.'},{status:400});
 if(targetStatus==='completed'&&!outcome)return NextResponse.json({error:'A lezáráshoz rövid eredmény szükséges.'},{status:400});
 const a=createAdminClient();
 const{data,error}=await a.rpc('transition_control_task_v2',{p_instance_id:store.instanceId,p_task_id:taskId,p_target_status:targetStatus,p_event_key:crypto.randomUUID(),p_actor_id:user.id,p_outcome:outcome});
 if(error)return NextResponse.json({error:error.message||'A kontrollfeladat módosítása nem sikerült.'},{status:409});
 const task=(data??{})as{id?:string;instance_id?:string;status?:string};
 if(task.id!==taskId||task.instance_id!==store.instanceId||task.status!==targetStatus)return NextResponse.json({error:'A kontrollfeladat módosításának eredménye nem igazolható.'},{status:500});
 return NextResponse.json({ok:true,task});
}
