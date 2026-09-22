import{NextResponse}from'next/server';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{hasCurrentPlanFeature}from'@/lib/plans/access';

export async function POST(req:Request){
 const user=await getPlatformRequestUser();if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 if(!(await hasCurrentPlanFeature('executiveAnalytics')))return NextResponse.json({error:'A folyamatos biztosítéki központ a Pro csomag része.'},{status:403});
 const body=await req.json().catch(()=>({}));
 const findingId=String(body.findingId??''),action=String(body.action??''),reason=String(body.reason??'');
 if(!findingId||!['acknowledged','resolved','accepted_risk'].includes(action))return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});
 const expiry=action==='accepted_risk'?new Date(Date.now()+7*86400000).toISOString():null,a=createAdminClient();
 const{data,error}=await a.rpc('transition_assurance_finding',{p_finding_id:findingId,p_actor_id:user.id,p_target:action,p_reason:reason||null,p_risk_expires_at:expiry,p_event_key:`admin:${action}:${findingId}:${crypto.randomUUID()}`});
 if(error)return NextResponse.json({error:error.message},{status:400});
 const finding=(data??{})as{id?:string;status?:string};
 if(finding.id!==findingId||finding.status!==action)return NextResponse.json({error:'A biztosítéki megállapítás módosításának eredménye nem igazolható.'},{status:500});
 return NextResponse.json({ok:true,data:finding});
}
