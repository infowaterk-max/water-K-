import{NextResponse}from'next/server';
import{z}from'zod';
import{createAdminClient}from'@/lib/supabase/admin';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const actions=['submit_review','approve','queue','cancel']as const;
const schema=z.object({
  campaignId:z.string().uuid(),
  action:z.enum(actions),
  note:z.string().trim().max(1000).nullable().optional()
});
const targetStatus:Record<typeof actions[number],string>={
  submit_review:'review',
  approve:'approved',
  queue:'queued',
  cancel:'cancelled'
};

export async function POST(request:Request){
  const user=await getAdminRequestUser('marketing.manage');
  if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let store;
  try{store=await requireCurrentStoreContext('marketing.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  if(!(await hasCurrentPlanFeature('advancedCampaigns')))return NextResponse.json({error:'A haladó kampányok a Pro csomag része.'},{status:403});

  let raw:unknown;
  try{raw=await request.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Hiányzó vagy érvénytelen kampányművelet.'},{status:400});

  const body=parsed.data;
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_manage_marketing_campaign_v3',{
    p_instance_id:store.instanceId,
    p_campaign_id:body.campaignId,
    p_actor:user.id,
    p_action:body.action,
    p_note:body.note??null
  });
  if(error){
    if(error.message.includes('MARKETING_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    if(error.message.includes('CAMPAIGN_NOT_FOUND'))return NextResponse.json({error:'A kampány nem található ebben a webshopban.'},{status:404});
    return NextResponse.json({error:'A kampányművelet ebben a webshopban vagy ebben az állapotban nem hajtható végre. Egyetlen részleges queue vagy audit sem került alkalmazásra.'},{status:409});
  }

  const evidence=(data??{})as{
    ok?:boolean;
    campaignId?:string;
    status?:string;
    action?:string;
    queued?:number;
    excluded?:number;
    eventId?:string;
    auditId?:string;
  };
  if(
    evidence.ok!==true||
    evidence.campaignId!==body.campaignId||
    evidence.action!==body.action||
    evidence.status!==targetStatus[body.action]||
    !evidence.eventId||
    !evidence.auditId
  ){
    return NextResponse.json({error:'A kampányművelet eredménye nem igazolható.'},{status:500});
  }

  return NextResponse.json(evidence);
}
