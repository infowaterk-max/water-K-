import{createHmac,timingSafeEqual}from'node:crypto';
import{NextResponse}from'next/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{getResendReceivedEmail,normalizeEmailAddress,parseInboundRecipient,receivedEmailBody,receivedThreadingHeaders}from'@/lib/communication/resend-inbound';

type LegacyEvent={eventId?:string;type?:'hard_bounce'|'complaint'|'invalid';email?:string;note?:string};
type ResendEvent={type?:string;data?:{email_id?:string;message_id?:string;from?:string;to?:string[];subject?:string;bounce?:{message?:string;type?:string}}};
type SuppressionEvidence={processed?:boolean;instanceId?:string;suppressionId?:string;eventId?:string;duplicate?:boolean;reason?:string};
type InboundEvidence={processed?:boolean;id?:string;threadId?:string;instanceId?:string;mailboxKey?:string;duplicate?:boolean;matchMethod?:string;reason?:string};
type MailboxRow={instance_id:string;mailbox_key:string;inbound_address:string};

function safeEqual(a:string,b:string){if(a.length!==b.length)return false;try{return timingSafeEqual(Buffer.from(a),Buffer.from(b))}catch{return false}}
function verifySvix(raw:string,request:Request,secret:string){const id=request.headers.get('svix-id'),ts=request.headers.get('svix-timestamp'),sig=request.headers.get('svix-signature');if(!id||!ts||!sig||!secret.startsWith('whsec_'))return false;const n=Number(ts);if(!Number.isFinite(n)||Math.abs(Date.now()/1000-n)>300)return false;let key:Buffer;try{key=Buffer.from(secret.slice(6),'base64')}catch{return false}const expected=createHmac('sha256',key).update(`${id}.${ts}.${raw}`).digest('base64');return sig.split(' ').some(part=>part.startsWith('v1,')&&safeEqual(part.slice(3),expected))}
async function persistSuppression(providerMessageId:string,eventId:string,email:string,reason:'hard_bounce'|'complaint'|'invalid',note:string|null){const a=createAdminClient(),{data,error}=await a.rpc('record_provider_communication_suppression_v2',{p_provider_message_id:providerMessageId,p_provider_event_id:eventId,p_email:email,p_reason:reason,p_note:note});if(error)throw error;const evidence=(data??{})as SuppressionEvidence;if(evidence.processed===false&&evidence.reason==='unmapped_provider_message')return evidence;if(evidence.processed!==true||!evidence.instanceId||!evidence.suppressionId||!evidence.eventId)throw new Error('PROVIDER_SUPPRESSION_EVIDENCE_MISMATCH');return evidence}

async function handleReceived(event:ResendEvent){
 const emailId=event.data?.email_id?.trim()??'',eventRecipients=event.data?.to??[];
 if(!emailId||eventRecipients.length===0)return NextResponse.json({ok:true,ignored:true,reason:'invalid_received_metadata'});
 const candidates=eventRecipients.map(parseInboundRecipient).filter((value):value is NonNullable<ReturnType<typeof parseInboundRecipient>>=>Boolean(value));
 const baseAddresses=[...new Set(candidates.map(item=>item.baseAddress))];
 if(baseAddresses.length===0)return NextResponse.json({ok:true,ignored:true,reason:'invalid_received_recipient'});

 const db=createAdminClient();
 const{data:mailboxData,error:mailboxError}=await db.from('office_mailboxes').select('instance_id,mailbox_key,inbound_address').eq('is_active',true).in('inbound_address',baseAddresses);
 if(mailboxError)return NextResponse.json({error:'Inbound routing unavailable'},{status:500});
 const mailboxes=(mailboxData??[])as MailboxRow[];
 if(mailboxes.length!==1){console.warn('Resend inbound ignored: mailbox routing count',mailboxes.length);return NextResponse.json({ok:true,ignored:true,reason:mailboxes.length===0?'unrouted_recipient':'ambiguous_recipient'});}
 const mailbox=mailboxes[0],recipient=candidates.find(item=>item.baseAddress===mailbox.inbound_address);
 if(!recipient)return NextResponse.json({ok:true,ignored:true,reason:'unrouted_recipient'});

 let received;
 try{received=await getResendReceivedEmail(emailId)}catch(error){console.error('Resend received email retrieval failed',error);return NextResponse.json({error:'Inbound retrieval failed'},{status:500})}
 const sender=normalizeEmailAddress(received.from)||normalizeEmailAddress(event.data?.from??'');
 if(!sender){console.warn('Resend inbound ignored: invalid sender');return NextResponse.json({ok:true,ignored:true,reason:'invalid_sender'});}
 const body=receivedEmailBody(received),threading=receivedThreadingHeaders(received),subject=(received.subject??event.data?.subject??'').trim().slice(0,300);
 const rfcMessageId=(received.message_id??event.data?.message_id??'').trim().slice(0,998)||null;
 const{data,error}=await db.rpc('record_inbound_office_email_v3',{
  p_provider_email_id:emailId,p_rfc_message_id:rfcMessageId,p_sender_email:sender,p_recipient_email:recipient.address,
  p_mailbox_address:recipient.baseAddress,p_reply_token:recipient.replyToken,p_subject:subject,p_body:body,
  p_in_reply_to:threading.inReplyTo,p_references:threading.references,p_attachment_count:received.attachments.length,
 });
 if(error){console.error('Resend inbound persistence failed',error.message);return NextResponse.json({error:'Inbound persistence failed'},{status:500})}
 const evidence=(data??{})as InboundEvidence;
 if(evidence.processed===false)return NextResponse.json({ok:true,ignored:true,reason:evidence.reason??'not_processed'});
 if(evidence.processed!==true||!evidence.id||!evidence.threadId||!evidence.instanceId||!evidence.mailboxKey)return NextResponse.json({error:'Inbound evidence mismatch'},{status:500});
 return NextResponse.json({ok:true,received:true,duplicate:evidence.duplicate===true,threadId:evidence.threadId,matchMethod:evidence.matchMethod});
}

export async function POST(request:Request){
 const resendSecret=(process.env.RESEND_WEBHOOK_SECRET||process.env.COMMUNICATION_WEBHOOK_SECRET||'').trim();
 const legacySecret=(process.env.COMMUNICATION_WEBHOOK_SECRET||'').trim();
 if(!resendSecret&&!legacySecret)return NextResponse.json({error:'Webhook not configured'},{status:503});
 const raw=await request.text(),bearer=Boolean(legacySecret)&&request.headers.get('authorization')===`Bearer ${legacySecret}`,svix=verifySvix(raw,request,resendSecret);
 if(!bearer&&!svix)return NextResponse.json({error:'Unauthorized'},{status:401});
 let body:unknown;try{body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid payload'},{status:400})}
 if(svix){
  const event=body as ResendEvent;
  if(event.type==='email.received')return handleReceived(event);
  const eventId=request.headers.get('svix-id')??event.data?.email_id??crypto.randomUUID(),providerMessageId=event.data?.email_id??'',to=event.data?.to??[];
  let reason:'hard_bounce'|'complaint'|'invalid'|null=null;if(event.type==='email.bounced')reason='hard_bounce';else if(event.type==='email.complained')reason='complaint';else return NextResponse.json({ok:true,ignored:true});
  if(!providerMessageId)return NextResponse.json({ok:true,ignored:true,reason:'unmapped_provider_message'});
  if(to.length===0)return NextResponse.json({error:'Invalid provider event recipients'},{status:400});
  let processed=0,ignored=0;
  try{for(const email of to){const evidence=await persistSuppression(providerMessageId,eventId,email,reason,event.data?.bounce?.message??event.data?.bounce?.type??null);if(evidence.processed===true)processed++;else ignored++;}}
  catch{return NextResponse.json({error:'Event persistence failed'},{status:500})}
  return NextResponse.json({ok:true,processed,ignored});
 }
 const event=body as LegacyEvent;
 if(!event.eventId||!event.email||!event.type||!['hard_bounce','complaint','invalid'].includes(event.type))return NextResponse.json({error:'Invalid event'},{status:400});
 try{const evidence=await persistSuppression(event.eventId,event.eventId,event.email,event.type,event.note??null);if(evidence.processed!==true)return NextResponse.json({ok:true,ignored:true,reason:evidence.reason??'unmapped_provider_message'});}
 catch{return NextResponse.json({error:'Event persistence failed'},{status:500})}
 return NextResponse.json({ok:true});
}
