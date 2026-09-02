import{NextResponse}from'next/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const actions=['submit_review','approve','queue','cancel']as const;
export async function POST(request:Request){
 const user=await getAdminRequestUser('marketing.manage');if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let store;try{store=await requireCurrentStoreContext('marketing.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
 if(!(await hasCurrentPlanFeature('advancedCampaigns')))return NextResponse.json({error:'A haladó kampányok a Pro csomag részei.'},{status:403});
 let body:{campaignId?:string;action?:typeof actions[number];note?:string};try{body=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 if(!body.campaignId||!body.action||!actions.includes(body.action))return NextResponse.json({error:'Hiányzó adat.'},{status:400});
 const admin=createAdminClient();
 const{data,error}=await admin.rpc('admin_manage_marketing_campaign_v2',{p_instance_id:store.instanceId,p_campaign_id:body.campaignId,p_actor:user.id,p_action:body.action,p_note:body.note??null});
 if(error)return NextResponse.json({error:'A kampányművelet ebben a webshopban vagy ebben az állapotban nem hajtható végre.'},{status:409});
 return NextResponse.json(data);
}
