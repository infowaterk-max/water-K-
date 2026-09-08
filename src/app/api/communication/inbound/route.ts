import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseInboundRecipient } from '@/lib/communication/resend-inbound';
import { createAdminClient } from '@/lib/supabase/admin';

const schema=z.object({
  messageId:z.string().trim().min(3).max(500),
  from:z.string().trim().email().max(320),
  to:z.string().trim().email().max(320),
  subject:z.string().trim().max(300),
  text:z.string().trim().min(1).max(50000),
});

function authorized(request:Request){
  const expected=process.env.COMMUNICATION_WEBHOOK_SECRET??'',received=request.headers.get('x-communication-webhook-secret')??'';
  if(!expected||expected.length!==received.length)return false;
  return timingSafeEqual(Buffer.from(expected),Buffer.from(received));
}

export async function POST(request:Request){
  if(!authorized(request))return NextResponse.json({error:'Nincs jogosultság.'},{status:401});
  let raw:unknown;
  try{raw=await request.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen e-mail esemény.'},{status:400});
  const recipient=parseInboundRecipient(parsed.data.to);
  if(!recipient)return NextResponse.json({error:'Érvénytelen címzett.'},{status:400});

  const db=createAdminClient();
  const{data,error}=await db.rpc('record_inbound_office_email_v3',{
    p_provider_email_id:parsed.data.messageId,
    p_rfc_message_id:null,
    p_sender_email:parsed.data.from.toLowerCase(),
    p_recipient_email:recipient.address,
    p_mailbox_address:recipient.baseAddress,
    p_reply_token:recipient.replyToken,
    p_subject:parsed.data.subject,
    p_body:parsed.data.text,
    p_in_reply_to:null,
    p_references:[],
    p_attachment_count:0,
  });
  if(error){
    if(error.message.includes('INBOUND_MAILBOX_NOT_FOUND'))return NextResponse.json({error:'A címzett irodai postafiók nem aktív vagy nem található.'},{status:422});
    return NextResponse.json({error:'A bejövő e-mail mentése nem sikerült. Egyetlen részleges beszélgetés sem maradt vissza.'},{status:500});
  }

  const result=(data??{})as{processed?:boolean;id?:string;threadId?:string;duplicate?:boolean;instanceId?:string;reason?:string;matchMethod?:string};
  if(result.processed===false)return NextResponse.json({ok:true,ignored:true,reason:result.reason??'not_processed'});
  if(result.processed!==true||!result.id||!result.threadId||!result.instanceId){
    return NextResponse.json({error:'A bejövő e-mail mentésének eredménye nem igazolható.'},{status:500});
  }
  if(result.duplicate===true)return NextResponse.json({ok:true,duplicate:true,threadId:result.threadId});
  return NextResponse.json({ok:true,threadId:result.threadId,matchMethod:result.matchMethod},{status:201});
}
