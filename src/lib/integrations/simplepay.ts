import 'server-only';
import { createHmac,randomBytes,timingSafeEqual } from 'node:crypto';
import type { PaymentCallbackResult,PaymentGateway } from './types';

type SimplePayWebhookPayload={rawPayload?:string;headers?:Record<string,string>};
type SimplePayIpn={merchant?:string;orderRef?:string;transactionId?:number|string;status?:string;refundStatus?:string;paymentDate?:string;finishDate?:string;method?:string;[key:string]:unknown};
type SimplePayStartResponse={merchant?:string;orderRef?:string;transactionId?:number|string;paymentUrl?:string;errorCodes?:Array<number|string>};

function requireEnv(name:string){const value=process.env[name];if(!value)throw new Error(`${name} required`);return value}
function endpoint(){return process.env.SIMPLEPAY_ENV==='live'?'https://secure.simplepay.hu/payment/v2':'https://sandbox.simplepay.hu/payment/v2'}
function signature(message:string,secret:string){return createHmac('sha384',secret).update(message,'utf8').digest('base64')}
function safeEqual(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb)}
function isoTimeout(minutes=30){return new Date(Date.now()+minutes*60_000).toISOString()}

export class SimplePayPaymentGateway implements PaymentGateway{
 async healthCheck(){
  requireEnv('SIMPLEPAY_MERCHANT');requireEnv('SIMPLEPAY_SECRET_KEY');
  const verified=process.env.SIMPLEPAY_CONNECTION_VERIFIED==='true';
  return{ok:verified,message:verified?'SimplePay konfiguráció és kereskedői tesztelés jóváhagyva.':'A kulcsok jelen vannak, de a SimplePay sandbox/éles kereskedői teszt jóváhagyását SIMPLEPAY_CONNECTION_VERIFIED=true jelzővel kell rögzíteni.'};
 }
 async createPayment(input:Parameters<PaymentGateway['createPayment']>[0]){
  const merchant=requireEnv('SIMPLEPAY_MERCHANT'),secret=requireEnv('SIMPLEPAY_SECRET_KEY');if(!input.customerEmail)throw new Error('SimplePay customer email required');
  const payload={salt:randomBytes(16).toString('hex'),merchant,orderRef:input.orderId,currency:'HUF',customerEmail:input.customerEmail,language:'HU',sdkVersion:'Shoperation_SimplePay_API_V2',methods:['CARD'],total:String(Math.round(input.total.amount)),timeout:isoTimeout(),url:input.returnUrl};
  const body=JSON.stringify(payload),response=await fetch(`${endpoint()}/start`,{method:'POST',headers:{'content-type':'application/json',Signature:signature(body,secret)},body,cache:'no-store'}),raw=await response.text();
  const responseSignature=response.headers.get('signature')??response.headers.get('Signature');if(!responseSignature||!safeEqual(responseSignature,signature(raw,secret)))throw new Error('SimplePay response signature invalid');
  let data:SimplePayStartResponse;try{data=JSON.parse(raw) as SimplePayStartResponse}catch{throw new Error('SimplePay response is not valid JSON')}
  if(!response.ok||data.errorCodes?.length||!data.transactionId||!data.paymentUrl)throw new Error(`SimplePay start failed${data.errorCodes?.length?`: ${data.errorCodes.join(',')}`:''}`);
  return{redirectUrl:data.paymentUrl,providerReference:String(data.transactionId)};
 }
 async verifyCallback(payload:unknown):Promise<PaymentCallbackResult>{
  const input=payload as SimplePayWebhookPayload,raw=input?.rawPayload,header=input?.headers?.signature;if(!raw||!header)throw new Error('SimplePay raw payload or Signature header missing');const secret=requireEnv('SIMPLEPAY_SECRET_KEY');if(!safeEqual(header,signature(raw,secret)))throw new Error('SimplePay IPN signature invalid');
  const event=JSON.parse(raw) as SimplePayIpn;if(String(event.merchant??'')!==requireEnv('SIMPLEPAY_MERCHANT'))throw new Error('SimplePay merchant mismatch');const providerReference=String(event.transactionId??'');if(!providerReference||!event.orderRef)throw new Error('SimplePay IPN identity missing');
  const status=String(event.status??'').toUpperCase();let mapped:PaymentCallbackResult['status']='unknown';if(status==='FINISHED')mapped='paid';else if(status==='CANCELLED'||status==='TIMEOUT')mapped='cancelled';else if(status==='NOTAUTHORIZED')mapped='failed';else if(status==='AUTHORIZED')mapped='pending';if(String(event.refundStatus??'').toUpperCase()==='FULL')mapped='refunded';
  const acknowledgementBody=JSON.stringify({...event,receiveDate:new Date().toISOString()}),acknowledgementSignature=signature(acknowledgementBody,secret);
  return{paid:mapped==='paid',providerReference,eventId:`${providerReference}:${status}:${event.finishDate??event.paymentDate??''}`,status:mapped,eventType:`simplepay.${status.toLowerCase()||'unknown'}`,acknowledgement:{body:acknowledgementBody,headers:{'content-type':'application/json',Signature:acknowledgementSignature},status:200}};
 }
}
