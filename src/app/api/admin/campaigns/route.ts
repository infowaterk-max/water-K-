import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const validSegments=['repeat_30_89','winback_90_plus'] as const;
type Segment=typeof validSegments[number];
const paidStatuses=['paid','processing','shipped','completed'];

export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();if(profile?.role!=='admin')return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let body:{name?:string;segment?:Segment;scheduledAt?:string};try{body=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
 if(!body.name?.trim()||!body.segment||!validSegments.includes(body.segment))return NextResponse.json({error:'Hiányzó kampányadat.'},{status:400});
 const scheduledAt=body.scheduledAt?new Date(body.scheduledAt):null;if(scheduledAt&&Number.isNaN(scheduledAt.getTime()))return NextResponse.json({error:'Érvénytelen időpont.'},{status:400});
 const admin=createAdminClient();const templateKey=body.segment==='repeat_30_89'?'repeat_30d':'winback_90d';
 const {data:campaign,error:campaignError}=await admin.from('marketing_campaigns').insert({name:body.name.trim(),segment:body.segment,template_key:templateKey,status:'review',scheduled_at:scheduledAt?.toISOString()??null,created_by:user.id}).select('id').single();if(campaignError||!campaign)return NextResponse.json({error:'A kampány nem hozható létre.'},{status:500});
 const [{data:ordersData},{data:consentData},{data:suppressionData}]=await Promise.all([
  admin.from('orders').select('customer_id,customer_email,billing_name,status,total_gross_huf,created_at').in('status',paidStatuses).order('created_at',{ascending:false}).limit(10000),
  admin.from('marketing_consents').select('email,status,occurred_at').eq('channel','email').order('occurred_at',{ascending:false}).limit(20000),
  admin.from('communication_suppressions').select('email,active').eq('active',true).limit(20000)
 ]);
 const latestConsent=new Map<string,string>();for(const c of consentData??[]){const key=c.email.trim().toLowerCase();if(!latestConsent.has(key))latestConsent.set(key,c.status);}
 const suppressed=new Set((suppressionData??[]).map(s=>s.email.trim().toLowerCase()));
 const stats=new Map<string,{userId:string|null;email:string;name:string;orders:number;revenue:number;last:string}>();for(const o of ordersData??[]){const email=o.customer_email.trim().toLowerCase();const key=o.customer_id??email;const current=stats.get(key)??{userId:o.customer_id,email,name:o.billing_name,orders:0,revenue:0,last:o.created_at};current.orders++;current.revenue+=Number(o.total_gross_huf||0);if(new Date(o.created_at)>new Date(current.last))current.last=o.created_at;stats.set(key,current);}
 const now=Date.now();const recipients=[] as Record<string,unknown>[];for(const [customerKey,s] of stats){const days=Math.floor((now-new Date(s.last).getTime())/86400000);const inSegment=body.segment==='repeat_30_89'?(s.orders>=2&&days>=30&&days<90):days>=90;if(!inSegment)continue;const consentOk=latestConsent.get(s.email)==='granted';const isSuppressed=suppressed.has(s.email);const eligible=consentOk&&!isSuppressed;recipients.push({campaign_id:campaign.id,customer_key:customerKey,user_id:s.userId,email:s.email,customer_name:s.name,orders_count:s.orders,revenue_gross_huf:s.revenue,last_order_at:s.last,consent_ok:consentOk,suppressed:isSuppressed,eligible,exclusion_reason:eligible?null:!consentOk?'no_marketing_consent':'suppressed'});}
 if(recipients.length){const {error}=await admin.from('marketing_campaign_recipients').insert(recipients);if(error)return NextResponse.json({error:'A célcsoport-pillanatkép nem menthető.'},{status:500});}
 return NextResponse.json({ok:true,id:campaign.id,total:recipients.length,eligible:recipients.filter(r=>r.eligible===true).length});
}
