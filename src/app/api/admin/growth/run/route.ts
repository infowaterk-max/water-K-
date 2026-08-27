import{NextResponse}from'next/server';
import{createClient}from'@/lib/supabase/server';
import{createAdminClient}from'@/lib/supabase/admin';

export async function POST(){
  const s=await createClient();
  const{data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const{data:p}=await s.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(p?.role!=='admin')return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const a=createAdminClient();
  const{data:planned,error:planError}=await a.rpc('plan_customer_retention_journeys');
  if(planError)return NextResponse.json({error:'Az ügyfélutak tervezése nem sikerült.'},{status:500});
  const{data:dispatched,error:dispatchError}=await a.rpc('dispatch_due_customer_journey_steps',{p_limit:50});
  if(dispatchError)return NextResponse.json({error:'Az esedékes ügyfélút-lépések sorba állítása nem sikerült.'},{status:500});
  return NextResponse.json({ok:true,planned,dispatched,refreshedAt:new Date().toISOString()});
}
