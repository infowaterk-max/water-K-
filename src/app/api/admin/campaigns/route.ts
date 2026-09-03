import{NextResponse}from'next/server';
import{z}from'zod';
import{createAdminClient}from'@/lib/supabase/admin';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{recordAdminAudit}from'@/lib/admin/audit';

const segments=['repeat_30_89','winback_90_plus','at_risk_30_89','winback_90_179','lost_180_plus','high_value_at_risk']as const;
type Segment=typeof segments[number];
const paid=['paid','processing','shipped','completed'];
const template:Record<Segment,string>={repeat_30_89:'repeat_30d',winback_90_plus:'winback_90d',at_risk_30_89:'retention_risk_30d',winback_90_179:'winback_90d',lost_180_plus:'reactivation_180d',high_value_at_risk:'vip_retention'};
const external=z.object({mode:z.literal('external'),name:z.string().trim().min(2).max(160),channel:z.enum(['facebook','instagram','tiktok','youtube','google','other']),budgetHuf:z.number().int().min(0).max(1000000000),utmCampaign:z.string().trim().regex(/^[A-Za-z0-9._-]{2,160}$/),externalImpressions:z.number().int().min(0).max(2000000000).default(0),externalClicks:z.number().int().min(0).max(2000000000).default(0)});
const lifecycle=z.object({mode:z.literal('lifecycle'),name:z.string().trim().min(2).max(160),segment:z.enum(segments),scheduledAt:z.string().optional()});

export async function POST(request:Request){
  const user=await getAdminRequestUser('marketing.manage');
  if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let store;
  try{store=await requireCurrentStoreContext('marketing.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  if(!(await hasCurrentPlanFeature('advancedCampaigns')))return NextResponse.json({error:'A kampányközpont a Pro csomag része.'},{status:403});

  let raw:unknown;
  try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const normalized=raw&&typeof raw==='object'&&!('mode'in raw)?{...(raw as Record<string,unknown>),mode:'lifecycle'}:raw;
  const parsed=z.discriminatedUnion('mode',[external,lifecycle]).safeParse(normalized);
  if(!parsed.success)return NextResponse.json({error:'Hiányzó vagy érvénytelen kampányadat.'},{status:400});
  const a=createAdminClient();

  if(parsed.data.mode==='external'){
    const p=parsed.data;
    const payload={instance_id:store.instanceId,name:p.name,segment:'external',template_key:'external_attribution',status:'approved',channel:p.channel,budget_huf:p.budgetHuf,utm_campaign:p.utmCampaign.toLowerCase(),external_impressions:p.externalImpressions,external_clicks:p.externalClicks,created_by:user.id,approved_by:user.id,approved_at:new Date().toISOString()};
    const{data,error}=await a.from('marketing_campaigns').insert(payload).select('id').single();
    if(error||!data)return NextResponse.json({error:error?.code==='23505'?'Ez az UTM kampánykód ebben a webshopban már használatban van.':'A kampány nem hozható létre.'},{status:error?.code==='23505'?409:500});
    await recordAdminAudit({actorUserId:user.id,organizationId:store.organizationId,instanceId:store.instanceId,action:'campaign.created',entityType:'marketing_campaign',entityId:data.id,summary:`${p.name} külső kampány létrehozva`,afterState:payload});
    return NextResponse.json({ok:true,id:data.id,total:0,eligible:0});
  }

  const p=parsed.data,scheduled=p.scheduledAt?new Date(p.scheduledAt):null;
  if(scheduled&&Number.isNaN(+scheduled))return NextResponse.json({error:'Érvénytelen időpont.'},{status:400});
  const segment=p.segment;

  const[
    {data:orders,error:ordersError},
    {data:consents,error:consentsError},
    {data:suppressions,error:suppressionsError},
  ]=await Promise.all([
    a.from('orders').select('customer_id,customer_email,billing_name,status,total_gross_huf,created_at').eq('instance_id',store.instanceId).in('status',paid).order('created_at',{ascending:false}).limit(20000),
    a.from('marketing_consents').select('email,status,occurred_at').eq('instance_id',store.instanceId).eq('channel','email').order('occurred_at',{ascending:false}).limit(30000),
    a.from('communication_suppressions').select('email,active').eq('instance_id',store.instanceId).eq('active',true).limit(30000),
  ]);
  if(ordersError||consentsError||suppressionsError)return NextResponse.json({error:'A célcsoport forrásadatai most nem tölthetők be. Kampány nem jött létre.'},{status:503});

  const consent=new Map<string,string>();
  for(const c of consents??[]){const key=c.email.trim().toLowerCase();if(!consent.has(key))consent.set(key,c.status)}
  const suppressed=new Set((suppressions??[]).map(x=>x.email.trim().toLowerCase()));
  const stats=new Map<string,{userId:string|null;email:string;name:string;orders:number;revenue:number;last:string}>();
  for(const o of orders??[]){
    const email=o.customer_email.trim().toLowerCase(),key=o.customer_id??email,current=stats.get(key)??{userId:o.customer_id,email,name:o.billing_name,orders:0,revenue:0,last:o.created_at};
    current.orders++;current.revenue+=Number(o.total_gross_huf||0);
    if(+new Date(o.created_at)>+new Date(current.last))current.last=o.created_at;
    stats.set(key,current);
  }

  const now=Date.now(),recipientSeeds:Record<string,unknown>[]=[];
  for(const[key,x]of stats){
    const days=Math.floor((now-+new Date(x.last))/86400000);
    let match=false;
    switch(segment){
      case'repeat_30_89':match=x.orders>=2&&days>=30&&days<90;break;
      case'winback_90_plus':match=days>=90;break;
      case'at_risk_30_89':match=days>=30&&days<90;break;
      case'winback_90_179':match=days>=90&&days<180;break;
      case'lost_180_plus':match=days>=180;break;
      case'high_value_at_risk':match=x.revenue>=100000&&days>=30;break;
    }
    if(!match)continue;
    const consentOk=consent.get(x.email)==='granted',isSuppressed=suppressed.has(x.email),eligible=consentOk&&!isSuppressed;
    recipientSeeds.push({customer_key:key,user_id:x.userId,email:x.email,customer_name:x.name,orders_count:x.orders,revenue_gross_huf:x.revenue,last_order_at:x.last,consent_ok:consentOk,suppressed:isSuppressed,eligible,exclusion_reason:eligible?null:!consentOk?'NO_MARKETING_CONSENT':'SUPPRESSED'});
  }

  const campaignPayload={instance_id:store.instanceId,name:p.name,segment,template_key:template[segment],status:'review',scheduled_at:scheduled?.toISOString()??null,channel:'email',created_by:user.id};
  const{data:campaign,error}=await a.from('marketing_campaigns').insert(campaignPayload).select('id').single();
  if(error||!campaign)return NextResponse.json({error:'A kampány nem hozható létre.'},{status:500});

  const recipients=recipientSeeds.map(seed=>({instance_id:store.instanceId,campaign_id:campaign.id,...seed}));
  if(recipients.length){
    const{error:recipientError}=await a.from('marketing_campaign_recipients').insert(recipients);
    if(recipientError){
      await a.from('marketing_campaigns').delete().eq('id',campaign.id).eq('instance_id',store.instanceId);
      return NextResponse.json({error:'A célcsoport-pillanatkép nem menthető, ezért a kampány létrehozását visszavontuk.'},{status:500});
    }
  }

  await recordAdminAudit({actorUserId:user.id,organizationId:store.organizationId,instanceId:store.instanceId,action:'campaign.created',entityType:'marketing_campaign',entityId:campaign.id,summary:`${p.name} kampány létrehozva`,afterState:{...campaignPayload,recipient_count:recipients.length,eligible_count:recipients.filter(r=>r.eligible===true).length}});
  return NextResponse.json({ok:true,id:campaign.id,total:recipients.length,eligible:recipients.filter(r=>r.eligible===true).length});
}
