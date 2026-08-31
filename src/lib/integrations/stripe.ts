import 'server-only';
import { createHmac,timingSafeEqual } from 'node:crypto';
import type { PaymentCallbackResult,PaymentGateway } from './types';

type StripeWebhookPayload={rawPayload?:string;headers?:Record<string,string>};
type StripeEvent={id:string;type:string;data:{object:Record<string,unknown>}};

function requireEnv(name:string){const value=process.env[name];if(!value)throw new Error(`${name} required`);return value}
function formBody(input:Record<string,string>){const body=new URLSearchParams();for(const [key,value] of Object.entries(input))body.set(key,value);return body}
function safeEqualHex(a:string,b:string){try{const aa=Buffer.from(a,'hex'),bb=Buffer.from(b,'hex');return aa.length===bb.length&&timingSafeEqual(aa,bb)}catch{return false}}
function verifyStripeSignature(rawPayload:string,header:string,secret:string){const parts=header.split(',').map(part=>part.trim());const timestamp=parts.find(part=>part.startsWith('t='))?.slice(2);const signatures=parts.filter(part=>part.startsWith('v1=')).map(part=>part.slice(3));if(!timestamp||!signatures.length)throw new Error('Stripe signature header invalid');const time=Number(timestamp);if(!Number.isFinite(time)||Math.abs(Date.now()/1000-time)>300)throw new Error('Stripe webhook timestamp outside tolerance');const expected=createHmac('sha256',secret).update(`${timestamp}.${rawPayload}`,'utf8').digest('hex');if(!signatures.some(signature=>safeEqualHex(signature,expected)))throw new Error('Stripe webhook signature invalid')}

export class StripePaymentGateway implements PaymentGateway{
 async healthCheck(){const secret=requireEnv('STRIPE_SECRET_KEY');const response=await fetch('https://api.stripe.com/v1/account',{headers:{authorization:`Bearer ${secret}`},cache:'no-store'});if(!response.ok)return{ok:false,message:`Stripe API kapcsolat sikertelen (${response.status}).`};const account=await response.json() as {id?:string;charges_enabled?:boolean};return{ok:Boolean(account.id),message:account.id?`Stripe kapcsolat rendben (${account.charges_enabled?'fizetés engedélyezve':'fiók elérhető, fizetés még nincs teljesen engedélyezve'}).`:'Stripe fiókazonosító nem érkezett.'}}
 async createPayment(input:Parameters<PaymentGateway['createPayment']>[0]){
  const secret=requireEnv('STRIPE_SECRET_KEY');const successUrl=input.returnUrl;const cancelUrl=input.cancelUrl??input.returnUrl;
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/x-www-form-urlencoded',...(input.idempotencyKey?{'idempotency-key':input.idempotencyKey}:{})},body:formBody({'mode':'payment','success_url':successUrl,'cancel_url':cancelUrl,'client_reference_id':input.orderId,'metadata[order_id]':input.orderId,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':'huf','line_items[0][price_data][unit_amount]':String(Math.round(input.total.amount)),'line_items[0][price_data][product_data][name]':`Rendelés ${input.orderId}`})});
  const data=await response.json() as {id?:string;url?:string;error?:{message?:string}};if(!response.ok||!data.id||!data.url)throw new Error(data.error?.message??'Stripe Checkout Session creation failed');return{redirectUrl:data.url,providerReference:data.id};
 }
 async verifyCallback(payload:unknown):Promise<PaymentCallbackResult>{
  const input=payload as StripeWebhookPayload;const raw=input?.rawPayload;const signature=input?.headers?.['stripe-signature'];if(!raw||!signature)throw new Error('Stripe raw payload or signature missing');verifyStripeSignature(raw,signature,requireEnv('STRIPE_WEBHOOK_SECRET'));const event=JSON.parse(raw) as StripeEvent;const object=event.data?.object??{};const providerReference=String(object.id??'');if(!event.id||!providerReference)throw new Error('Stripe event identity missing');
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded')return{paid:true,providerReference,eventId:event.id,status:'paid',eventType:event.type};
  if(event.type==='checkout.session.async_payment_failed')return{paid:false,providerReference,eventId:event.id,status:'failed',eventType:event.type};
  if(event.type==='checkout.session.expired')return{paid:false,providerReference,eventId:event.id,status:'cancelled',eventType:event.type};
  return{paid:false,providerReference,eventId:event.id,status:'unknown',eventType:event.type};
 }
}
