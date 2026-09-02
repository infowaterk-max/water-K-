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
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen e-mail esemény.'},{status:400});
  const db=createAdminClient(),email=parsed.data.from.toLowerCase(),recipient=parsed.data.to.toLowerCase();
  const{data:instances,error:instanceError}=await db.from('webshop_instances').select('id,support_email').ilike('support_email',recipient).in('status',['pilot','active']).limit(2);
  if(instanceError)return NextResponse.json({error:'A címzett webshop nem oldható fel.'},{status:500});
  if(!instances||instances.length!==1)return NextResponse.json({error:'A címzett webshop nem egyértelmű.'},{status:422});
  const instanceId=instances[0].id;

  const{data:existingMessage}=await db.from('office_messages').select('id').eq('instance_id',instanceId).eq('external_message_id',parsed.data.messageId).maybeSingle();
  if(existingMessage)return NextResponse.json({ok:true,duplicate:true});

  let{data:thread}=await db.from('office_threads').select('id,order_id').eq('instance_id',instanceId).eq('customer_email',email).eq('status','open').order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(!thread){
    const{data:order}=await db.from('orders').select('id,order_number').eq('instance_id',instanceId).eq('customer_email',email).order('created_at',{ascending:false}).limit(1).maybeSingle();
    const created=await db.from('office_threads').insert({instance_id:instanceId,subject:parsed.data.subject,customer_email:email,order_id:order?.id??null}).select('id,order_id').single();
    thread=created.data??null;
  }
  if(!thread)return NextResponse.json({error:'A beszélgetés nem hozható létre.'},{status:500});

  const{error}=await db.from('office_messages').insert({
    instance_id:instanceId,thread_id:thread.id,kind:'email_in',body:parsed.data.text,external_message_id:parsed.data.messageId,
    sender_email:email,recipient_email:recipient,subject:parsed.data.subject,
  });
  if(error?.code==='23505')return NextResponse.json({ok:true,duplicate:true});
  if(error)return NextResponse.json({error:'A bejövő e-mail mentése nem sikerült.'},{status:500});
  await db.from('office_threads').update({updated_at:new Date().toISOString()}).eq('id',thread.id).eq('instance_id',instanceId);
  return NextResponse.json({ok:true,threadId:thread.id},{status:201});
}
