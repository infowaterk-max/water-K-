import{NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{hasCurrentPlanFeature}from'@/lib/plans/access';

export async function POST(){
 const user=await getAdminRequestUser('store.manage');if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const store=await requireCurrentStoreContext('store.manage');
 if(!(await hasCurrentPlanFeature('automation')))return NextResponse.json({error:'Az automatizálás a Pro csomag része.'},{status:403});
 const a=createAdminClient(),runKey=`${store.instanceId}:${user.id}:${crypto.randomUUID()}`;
 const{data,error}=await a.rpc('process_automation_cycle_v2',{p_instance_id:store.instanceId,p_run_key:runKey});
 if(error)return NextResponse.json({error:error.message},{status:400});
 const run=(data??{})as{id?:string;instance_id?:string;run_key?:string;completed_at?:string|null};
 if(!run.id||run.instance_id!==store.instanceId||run.run_key!==runKey||!run.completed_at)return NextResponse.json({error:'Az automatizálási ciklus eredménye nem igazolható.'},{status:500});
 return NextResponse.json({ok:true,data:run});
}
