import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentGatewayAdapter,hasPaymentGatewayAdapter } from '@/lib/integrations/adapters';
import { applyVerifiedPaymentEvent,type PaymentState } from '@/lib/integrations/payment-events';
import { recordWebhookEvent } from '@/lib/integrations/outbox';
import type { PaymentCallbackResult } from '@/lib/integrations/types';

export async function POST(request:Request,{params}:{params:Promise<{provider:string}>}){
  const {provider}=await params;
  const rawPayload=await request.text(),requestUrl=request.url;
  const admin=createAdminClient();
  const {data:catalog,error:catalogError}=await admin.from('commerce_provider_catalog')
    .select('code,adapter_key')
    .eq('code',provider)
    .eq('provider_type','payment')
    .eq('is_available',true)
    .maybeSingle();
  if(catalogError)return NextResponse.json({error:'A fizetési adapter most nem ellenőrizhető.'},{status:503});
  if(!catalog||!hasPaymentGatewayAdapter(catalog.adapter_key))return NextResponse.json({error:'A fizetési adapter nem érhető el.'},{status:404});

  let verified:PaymentCallbackResult;
  try{
    verified=await getPaymentGatewayAdapter(catalog.adapter_key).verifyCallback({
      rawPayload,
      headers:Object.fromEntries(request.headers.entries()),
      url:requestUrl,
    }) as PaymentCallbackResult;
  }catch{
    const hash=createHash('sha256').update(`${requestUrl}\n${rawPayload}`).digest('hex');
    await recordWebhookEvent({
      provider,
      externalEventId:`rejected-${hash}`,
      signatureValid:false,
      payloadHash:hash,
      status:'rejected',
      errorMessage:'A fizetési webhook hitelesítése sikertelen.',
    }).catch(()=>undefined);
    return NextResponse.json({error:'A fizetési webhook hitelesítése sikertelen.'},{status:401});
  }

  const eventId=verified.eventId??createHash('sha256').update(`${requestUrl}\n${rawPayload}`).digest('hex');
  const status=verified.status??(verified.paid?'paid':'unknown');

  let result:{ok:boolean;duplicate:boolean;orderId:string|null;status?:string};
  try{
    result=await applyVerifiedPaymentEvent({
      providerCode:provider,
      eventId,
      providerReference:verified.providerReference,
      eventType:verified.eventType??'payment_callback',
      status:status as PaymentState,
      signatureValid:true,
      rawPayload:rawPayload||requestUrl,
    });
  }catch(error){
    console.error('verified payment webhook persistence failed',{provider,eventId,error});
    const hash=createHash('sha256').update(`${requestUrl}\n${rawPayload}`).digest('hex');
    await recordWebhookEvent({
      provider,
      externalEventId:`failed-${eventId}`,
      signatureValid:true,
      payloadHash:hash,
      status:'failed',
      errorMessage:error instanceof Error?error.message:'Verified payment callback persistence failed.',
    }).catch(()=>undefined);
    return NextResponse.json({error:'A hitelesített fizetési esemény feldolgozása átmenetileg nem sikerült.'},{status:503});
  }

  if(verified.acknowledgement){
    return new NextResponse(verified.acknowledgement.body,{
      status:verified.acknowledgement.status??200,
      headers:verified.acknowledgement.headers,
    });
  }
  return NextResponse.json({ok:result.ok,duplicate:result.duplicate});
}
