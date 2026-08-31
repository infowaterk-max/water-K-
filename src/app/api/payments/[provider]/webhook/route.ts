import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentGatewayAdapter,hasPaymentGatewayAdapter } from '@/lib/integrations/adapters';
import { applyVerifiedPaymentEvent,type PaymentState } from '@/lib/integrations/payment-events';
import type { PaymentCallbackResult } from '@/lib/integrations/types';

export async function POST(request:Request,{params}:{params:Promise<{provider:string}>}){
 const {provider}=await params;const rawPayload=await request.text();if(!rawPayload)return NextResponse.json({error:'Üres fizetési webhook.'},{status:400});
 const admin=createAdminClient();const {data:catalog}=await admin.from('commerce_provider_catalog').select('code,adapter_key').eq('code',provider).eq('provider_type','payment').eq('is_available',true).maybeSingle();
 if(!catalog||!hasPaymentGatewayAdapter(catalog.adapter_key))return NextResponse.json({error:'A fizetési adapter nem érhető el.'},{status:404});
 try{const adapter=getPaymentGatewayAdapter(catalog.adapter_key);const verified=await adapter.verifyCallback({rawPayload,headers:Object.fromEntries(request.headers.entries())}) as PaymentCallbackResult;
 const eventId=verified.eventId??createHash('sha256').update(rawPayload).digest('hex');const status=verified.status??(verified.paid?'paid':'unknown');const result=await applyVerifiedPaymentEvent({providerCode:provider,eventId,providerReference:verified.providerReference,eventType:verified.eventType??'payment_callback',status:status as PaymentState,signatureValid:true,rawPayload});
 if(verified.acknowledgement)return new NextResponse(verified.acknowledgement.body,{status:verified.acknowledgement.status??200,headers:verified.acknowledgement.headers});
 return NextResponse.json({ok:true,duplicate:result.duplicate});
 }catch(error){const hash=createHash('sha256').update(rawPayload).digest('hex');await admin.from('payment_events').insert({provider_code:provider,provider_event_id:`rejected-${hash}`,event_type:'rejected_callback',payment_status:'unknown',signature_valid:false,payload_hash:hash}).catch(()=>undefined);return NextResponse.json({error:'A fizetési webhook hitelesítése sikertelen.'},{status:401})}
}
