import{NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{hasStoreCapability}from'@/lib/auth/store-capabilities';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';

async function access(){
  const actor=await getAdminRequestUser();
  if(!actor)return null;
  if(!(await hasCurrentPlanFeature('teamChat')))return null;
  let scope;try{scope=await requireCurrentStoreContext()}catch{return null}
  const allowed=await hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat',{resourceOwnerUserId:actor.id,resourceAssignedUserId:actor.id});
  if(!allowed)return null;
  return{actor,scope,db:createAdminClient()};
}

export async function POST(){
  const context=await access();
  if(!context)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const now=new Date().toISOString();
  const{error}=await context.db.from('office_user_presence').upsert({instance_id:context.scope.instanceId,user_id:context.actor.id,last_seen_at:now},{onConflict:'instance_id,user_id'});
  if(error)return NextResponse.json({error:'A jelenléti állapot nem frissíthető.'},{status:503,headers:{'Cache-Control':'no-store'}});
  return NextResponse.json({ok:true,lastSeenAt:now},{headers:{'Cache-Control':'no-store'}});
}

export async function GET(){
  const context=await access();
  if(!context)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const cutoff=new Date(Date.now()-15*60*1000).toISOString();
  const{data,error}=await context.db.from('office_user_presence').select('user_id,last_seen_at').eq('instance_id',context.scope.instanceId).gte('last_seen_at',cutoff).limit(250);
  if(error)return NextResponse.json({error:'A jelenléti állapot nem olvasható.'},{status:503,headers:{'Cache-Control':'no-store'}});
  return NextResponse.json({presence:(data??[]).map(row=>({userId:String(row.user_id),lastSeenAt:String(row.last_seen_at)}))},{headers:{'Cache-Control':'no-store'}});
}
