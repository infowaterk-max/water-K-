import{NextResponse}from'next/server';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{hasCurrentPlanFeature}from'@/lib/plans/access';

export async function POST(){
 const user=await getPlatformRequestUser();if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 if(!(await hasCurrentPlanFeature('executiveAnalytics')))return NextResponse.json({error:'A folyamatos biztosítéki központ a Pro csomag része.'},{status:403});
 const a=createAdminClient(),runKey=`assurance:${user.id}:${new Date().toISOString().slice(0,16)}`;
 const{data,error}=await a.rpc('process_assurance_readiness_cycle',{p_run_key:runKey});
 if(error)return NextResponse.json({error:error.message},{status:400});
 const run=(data??{})as{id?:string;run_key?:string;status?:string;completed_at?:string|null};
 if(!run.id||run.run_key!==runKey||run.status!=='completed'||!run.completed_at)return NextResponse.json({error:'A biztosítéki ciklus eredménye nem igazolható.'},{status:500});
 return NextResponse.json({ok:true,data:run});
}
