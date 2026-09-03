import{createHmac,timingSafeEqual}from'node:crypto';
import{NextResponse}from'next/server';
import{createAdminClient}from'@/lib/supabase/admin';

type LegacyEvent={eventId?:string;type?:'hard_bounce'|'complaint'|'invalid';email?:string;note?:string};
type ResendEvent={type?:string;data?:{email_id?:string;to?:string[];bounce?:{message?:string;type?:string}}};
type SuppressionEvidence={processed?:boolean;instanceId?:string;suppressionId?:string;eventId?:string;duplicate?:boolean;reason?:string};

function safeEqual(a:string,b:string){if(a.length!==b.length)return false;try{return timingSafeEqual(Buffer.from(a),Buffer.from(b))}catch{return false}}
function verifySvix(raw:string,request:Request,secret:string){const id=request.headers.get('svix-id'),ts=request.headers.get('svix-timestamp'),sig=request.headers.get('svix-signature');if(!id||!ts||!sig||!secret.startsWith('whsec_'))return false;const n=Number(ts);if(!Number.isFinite(n)||Math.abs(Date.now()/1000-n)>300)return false;let key:Buffer;try{key=Buffer.from(secret.slice(6),'base64')}catch{return false}const expected=createHmac('sha256',key).update(`${id}.${ts}.${raw}`).digest('base64');return sig.split(' ').some(part=>part.startsWith('v1,')&&safeEqual(part.slice(3),expected))}
async function persist(providerMessageId:string,eventId:string,email:string,reason:'hard_bounce'|'complaint'|'invalid',note:string|null){const a=createAdminClient(),{data,error}=await a.rpc('record_provider_communication_suppression_v2',{p_provider_message_id:providerMessageId,p_provider_event_id:eventId,p_email:email,p_reason:reason,p_note:note});if(error)throw error;const evidence=(data??{})as SuppressionEvidence;if(evidence.processed===false&&evidence.reason==='unmapped_provider_message')return evidence;if(evidence.processed!==true||!evidence.instanceId||!evidence.suppressionId||!evidence.eventId)throw new Error('PROVIDER_SUPPRESSION_EVIDENCE_MISMATCH');return evidence}

export async function POST(request:Request){
 const secret=process.env.COMMUNICATION_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:'Webhook not configured'},{status:503});
 const raw=await request.text(),bearer=request.headers.get('authorization')===`Bearer ${secret}`,svix=verifySvix(raw,request,secret);
 if(!bearer&&!svix)return NextResponse.json({error:'Unauthorized'},{status:401});
 let body:unknown;try{body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid payload'},{status:400})}
 if(svix){
  const event=body as ResendEvent,eventId=request.headers.get('svix-id')??event.data?.email_id??crypto.randomUUID(),providerMessageId=event.data?.email_id??'',to=event.data?.to??[];
  let reason:'hard_bounce'|'complaint'|'invalid'|null=null;if(event.type==='email.bounced')reason='hard_bounce';else if(event.type==='email.complained')reason='complaint';else return NextResponse.json({ok:true,ignored:true});
  if(!providerMessageId)return NextResponse.json({ok:true,ignored:true,reason:'unmapped_provider_message'});
  if(to.length===0)return NextResponse.json({error:'Invalid provider event recipients'},{status:400});
  let processed=0,ignored=0;
  try{for(const email of to){const evidence=await persist(providerMessageId,eventId,email,reason,event.data?.bounce?.message??event.data?.bounce?.type??null);if(evidence.processed===true)processed++;else ignored++;}}
  catch{return NextResponse.json({error:'Event persistence failed'},{status:500})}
  return NextResponse.json({ok:true,processed,ignored});
 }
 const event=body as LegacyEvent;
 if(!event.eventId||!event.email||!event.type||!['hard_bounce','complaint','invalid'].includes(event.type))return NextResponse.json({error:'Invalid event'},{status:400});
 try{const evidence=await persist(event.eventId,event.eventId,event.email,event.type,event.note??null);if(evidence.processed!==true)return NextResponse.json({ok:true,ignored:true,reason:evidence.reason??'unmapped_provider_message'});}
 catch{return NextResponse.json({error:'Event persistence failed'},{status:500})}
 return NextResponse.json({ok:true});
}
