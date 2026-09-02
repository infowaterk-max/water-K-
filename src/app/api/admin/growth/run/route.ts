import{NextResponse}from'next/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

export async function POST(){
  const user=await getAdminRequestUser('marketing.manage');if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('marketing.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const a=createAdminClient();
  const{data:planned,error:planError}=await a.rpc('plan_customer_retention_journeys_v2',{p_instance_id:scope.instanceId});
  if(planError)return NextResponse.json({error:'Az ügyfélutak tervezése nem sikerült.'},{status:500});
  const{data:dispatched,error:dispatchError}=await a.rpc('dispatch_due_customer_journey_steps_v2',{p_instance_id:scope.instanceId,p_limit:50});
  if(dispatchError)return NextResponse.json({error:'Az esedékes ügyfélút-lépések sorba állítása nem sikerült.'},{status:500});
  return NextResponse.json({ok:true,planned,dispatched,refreshedAt:new Date().toISOString()});
}
