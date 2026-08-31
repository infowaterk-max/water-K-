import 'server-only';
import { createHash } from 'node:crypto';
import type { PaymentCallbackResult,PaymentGateway } from './types';

type BarionCallbackPayload={rawPayload?:string;headers?:Record<string,string>;url?:string};
type BarionStartResponse={PaymentId?:string;GatewayUrl?:string;Status?:string;Errors?:Array<{ErrorCode?:string;Title?:string;Description?:string}>};
type BarionStateResponse={PaymentId?:string;PaymentRequestId?:string;Status?:string;Transactions?:Array<{TransactionId?:string;POSTransactionId?:string;Status?:string;TransactionType?:string;Type?:string}>;Errors?:Array<{ErrorCode?:string;Title?:string;Description?:string}>};

function requireEnv(name:string){const value=process.env[name];if(!value)throw new Error(`${name} required`);return value}
function baseUrl(){return process.env.BARION_ENV==='live'?'https://api.barion.com':'https://api.test.barion.com'}
function mapStatus(status:string):PaymentCallbackResult['status']{switch(status){case'Succeeded':return'paid';case'Canceled':case'Expired':return'cancelled';case'Failed':return'failed';case'Prepared':case'Started':case'InProgress':case'Waiting':case'Reserved':case'Authorized':case'PartiallySucceeded':return'pending';default:return'unknown'}}
function errorText(errors:BarionStartResponse['Errors']){return errors?.map(error=>error.ErrorCode||error.Title||error.Description).filter(Boolean).join(', ')||'Barion API request failed'}

export class BarionPaymentGateway implements PaymentGateway{
 async healthCheck(){
  const posKey=requireEnv('BARION_POS_KEY');const response=await fetch(`${baseUrl()}/v4/payment/00000000-0000-0000-0000-000000000000/paymentstate`,{headers:{'x-pos-key':posKey},cache:'no-store'});
  if(response.status===401||response.status===403)return{ok:false,message:'A Barion POSKey hitelesítése sikertelen.'};
  return{ok:true,message:`A Barion API elérhető, a POSKey elfogadásra került (${process.env.BARION_ENV==='live'?'éles':'sandbox'} környezet).`};
 }
 async createPayment(input:Parameters<PaymentGateway['createPayment']>[0]){
  const posKey=requireEnv('BARION_POS_KEY'),payee=requireEnv('BARION_PAYEE_EMAIL');if(!input.customerEmail)throw new Error('Barion customer email required');if(!input.callbackUrl)throw new Error('Barion callback URL required');
  const total=Math.round(input.total.amount);const payload={POSKey:posKey,PaymentType:'Immediate',PaymentRequestId:input.orderId,GuestCheckOut:true,FundingSources:['All'],Currency:'HUF',RedirectUrl:input.returnUrl,CallbackUrl:input.callbackUrl,Locale:'hu-HU',PayerHint:input.customerEmail,OrderNumber:input.orderId,Transactions:[{POSTransactionId:`${input.orderId}-1`,Payee:payee,Total:total,Comment:`Rendelés ${input.orderId}`,Items:[{Name:`Rendelés ${input.orderId}`,Description:'Webáruházi rendelés',Quantity:1,Unit:'db',UnitPrice:total,ItemTotal:total,SKU:input.orderId}]}]};
  const response=await fetch(`${baseUrl()}/v2/Payment/Start`,{method:'POST',headers:{'content-type':'application/json','x-pos-key':posKey},body:JSON.stringify(payload),cache:'no-store'});const data=await response.json() as BarionStartResponse;
  if(!response.ok||data.Errors?.length||!data.PaymentId||!data.GatewayUrl)throw new Error(errorText(data.Errors));return{redirectUrl:data.GatewayUrl,providerReference:data.PaymentId};
 }
 async verifyCallback(payload:unknown):Promise<PaymentCallbackResult>{
  const input=payload as BarionCallbackPayload;const callbackUrl=new URL(input.url??'http://invalid.local');let paymentId=callbackUrl.searchParams.get('paymentId')??callbackUrl.searchParams.get('PaymentId');
  if(!paymentId&&input.rawPayload){try{const parsed=JSON.parse(input.rawPayload) as {PaymentId?:string;paymentId?:string};paymentId=parsed.PaymentId??parsed.paymentId??null}catch{}}
  if(!paymentId)throw new Error('Barion callback PaymentId missing');const posKey=requireEnv('BARION_POS_KEY');const response=await fetch(`${baseUrl()}/v4/payment/${encodeURIComponent(paymentId)}/paymentstate`,{headers:{'x-pos-key':posKey},cache:'no-store'});const state=await response.json() as BarionStateResponse;if(!response.ok||state.Errors?.length||state.PaymentId!==paymentId)throw new Error('Barion payment state verification failed');
  const status=String(state.Status??'Unknown'),mapped=mapStatus(status),transactionFingerprint=createHash('sha256').update(JSON.stringify(state.Transactions??[])).digest('hex').slice(0,16);
  return{paid:mapped==='paid',providerReference:paymentId,eventId:`${paymentId}:${status}:${transactionFingerprint}`,status:mapped,eventType:`barion.${status.toLowerCase()}`,acknowledgement:{body:'',status:200}};
 }
}
