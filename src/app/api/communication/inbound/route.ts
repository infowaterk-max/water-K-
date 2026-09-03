import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const schema=z.object({
  messageId:z.string().trim().min(3).max(500),
  from:z.string().trim().email().max(320),
  to:z.string().trim().email().max(320),
  subject:z.string().trim().min(1).max(300),
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

  const db=createAdminClient();
  const{data,error}=await db.rpc('record_inbound_office_email_v2',{
    p_external_message_id:parsed.data.messageId,
    p_sender_email:parsed.data.from.toLowerCase(),
    p_recipient_email:parsed.data.to.toLowerCase(),
    p_subject:parsed.data.subject,
    p_body:parsed.data.text,
  });
  if(error){
    if(error.message.includes('INBOUND_TENANT_AMBIGUOUS'))return NextResponse.json({error:'A címzett webshop nem egyértelmű.'},{status:422});
    if(error.message.includes('INBOUND_TENANT_NOT_FOUND'))return NextResponse.json({error:'A címzett webshop nem található.'},{status:422});
    return NextResponse.json({error:'A bejövő e-mail mentése nem sikerült. Egyetlen részleges beszélgetés sem maradt vissza.'},{status:500});
  }

  const result=(data??{})as{id?:string;threadId?:string;duplicate?:boolean;instanceId?:string};
  if(!result.id||!result.threadId||!result.instanceId){
    return NextResponse.json({error:'A bejövő e-mail mentésének eredménye nem igazolható.'},{status:500});
  }
  if(result.duplicate===true)return NextResponse.json({ok:true,duplicate:true,threadId:result.threadId});
  return NextResponse.json({ok:true,threadId:result.threadId},{status:201});
}
