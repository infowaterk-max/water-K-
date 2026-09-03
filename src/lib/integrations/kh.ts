import 'server-only';
import { createHash,createPrivateKey,createPublicKey,createSign,createVerify } from 'node:crypto';
import type { PaymentCallbackResult,PaymentGateway } from './types';

type KhEnvironment='sandbox'|'live';
type KhResponse={
  payId?:string;
  dttm?:string;
  resultCode?:number;
  resultMessage?:string;
  paymentStatus?:number;
  authCode?:string;
  customerCode?:string;
  statusDetail?:string;
  actions?:unknown[];
  signature?:string;
};
type KhEchoResponse={dttm?:string;resultCode?:number;resultMessage?:string;signature?:string};

const SANDBOX_BASE='https://api.sandbox.khpos.hu/api/v1.0';
const LIVE_BASE='https://api.khpos.hu/api/v1.0';
const PAY_ID_RX=/^[A-Za-z0-9._-]{4,128}$/;
const ORDER_NO_RX=/^[1-9][0-9]{0,9}$/;

function normalizePem(value:string){return value.replace(/\\n/g,'\n').trim()}
function environment():KhEnvironment{
  const value=(process.env.KH_ENVIRONMENT??'').trim().toLowerCase();
  if(value!=='sandbox'&&value!=='live')throw new Error('KH_ENVIRONMENT must be sandbox or live');
  return value;
}
function config(){
  const merchantId=(process.env.KH_VPOS_ID??'').trim();
  const privatePem=(process.env.KH_PRIVATE_KEY??'').trim();
  const publicPem=(process.env.KH_GATEWAY_PUBLIC_KEY??'').trim();
  if(!merchantId||!privatePem||!publicPem)throw new Error('K&H vPOS credentials required');
  if(!/^[A-Za-z0-9._-]{2,64}$/.test(merchantId))throw new Error('K&H vPOS ID is invalid');
  const privateKey=createPrivateKey({key:normalizePem(privatePem),format:'pem',passphrase:process.env.KH_PRIVATE_KEY_PASSPHRASE||undefined});
  const publicKey=createPublicKey({key:normalizePem(publicPem),format:'pem'});
  const env=environment();
  return{merchantId,privateKey,publicKey,baseUrl:env==='live'?LIVE_BASE:SANDBOX_BASE,env};
}
function dttm(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${map.year}${map.month}${map.day}${map.hour}${map.minute}${map.second}`;
}
function join(values:unknown[]){
  return values.filter(v=>v!==undefined&&v!==null&&String(v)!=='').map(v=>String(v)).join('|');
}
function sign(text:string,key:ReturnType<typeof createPrivateKey>){
  const signer=createSign('RSA-SHA256');signer.update(text,'utf8');signer.end();return signer.sign(key,'base64');
}
function verify(text:string,signature:string|undefined,key:ReturnType<typeof createPublicKey>){
  if(!signature)return false;
  const verifier=createVerify('RSA-SHA256');verifier.update(text,'utf8');verifier.end();
  return verifier.verify(key,Buffer.from(signature,'base64'));
}
async function json<T>(response:Response):Promise<T>{
  const body=await response.text();
  let parsed:unknown;try{parsed=JSON.parse(body)}catch{throw new Error(`K&H invalid JSON response (${response.status})`)}
  if(!response.ok)throw new Error(`K&H HTTP ${response.status}`);
  return parsed as T;
}
function responseSignBase(value:KhResponse,includeCustomerCode:boolean){
  if(value.actions?.length)throw new Error('K&H response actions are not supported in the basic card flow');
  return join([
    value.payId,value.dttm,value.resultCode,value.resultMessage,value.paymentStatus,value.authCode,
    ...(includeCustomerCode?[value.customerCode]:[]),value.statusDetail
  ]);
}
function mapStatus(status:number|undefined):PaymentCallbackResult['status']{
  if(status===1||status===2||status===9)return'pending';
  if(status===3||status===5)return'cancelled';
  if(status===4||status===7||status===8)return'paid';
  if(status===6)return'failed';
  if(status===10)return'refunded';
  return'unknown';
}
function extractPayId(payload:unknown){
  if(payload&&typeof payload==='object'&&!Array.isArray(payload)){
    const p=payload as Record<string,unknown>;
    if(typeof p.payId==='string')return p.payId;
    if(typeof p.rawPayload==='string'){
      const raw=p.rawPayload.trim();
      if(raw.startsWith('{')){try{const j=JSON.parse(raw) as Record<string,unknown>;if(typeof j.payId==='string')return j.payId}catch{}}
      const q=new URLSearchParams(raw);if(q.get('payId'))return q.get('payId')!;
    }
    if(typeof p.url==='string'){try{const q=new URL(p.url).searchParams;if(q.get('payId'))return q.get('payId')!}catch{}}
  }
  throw new Error('K&H payId missing');
}

export class KhPaymentGateway implements PaymentGateway {
  async createPayment(input:Parameters<PaymentGateway['createPayment']>[0]):ReturnType<PaymentGateway['createPayment']>{
    const cfg=config(),orderNo=(input.providerOrderNo??'').trim();
    if(!ORDER_NO_RX.test(orderNo))throw new Error('K&H numeric provider orderNo required');
    if(input.total.currency!=='HUF'||!Number.isInteger(input.total.amount)||input.total.amount<=0)throw new Error('K&H HUF amount must be a positive integer');
    const totalAmount=input.total.amount*100;
    if(!Number.isSafeInteger(totalAmount))throw new Error('K&H HUF amount is out of range');
    const successUrl=new URL(input.returnUrl);
    const returnUrl=new URL('/api/payments/kh/return',successUrl.origin).toString();
    const merchantData=Buffer.from(input.orderId,'utf8').toString('base64').slice(0,255);
    const timestamp=dttm();
    const cart=[{name:'Webshop rendelés',quantity:1,amount:totalAmount}];
    const cartSign=join([cart[0].name,cart[0].quantity,cart[0].amount]);
    const signBase=join([cfg.merchantId,orderNo,timestamp,'payment','card',totalAmount,'HUF','true',returnUrl,'POST',cartSign,merchantData,'hu']);
    const body={
      merchantId:cfg.merchantId,orderNo,dttm:timestamp,payOperation:'payment',payMethod:'card',
      totalAmount,currency:'HUF',closePayment:true,returnUrl,returnMethod:'POST',
      cart,merchantData,language:'hu',signature:sign(signBase,cfg.privateKey)
    };
    const initResponse=await json<KhResponse>(await fetch(`${cfg.baseUrl}/payment/init`,{
      method:'POST',headers:{accept:'application/json','content-type':'application/json'},body:JSON.stringify(body),
      cache:'no-store',signal:AbortSignal.timeout(15000)
    }));
    if(!verify(responseSignBase(initResponse,true),initResponse.signature,cfg.publicKey))throw new Error('K&H INIT response signature invalid');
    if(initResponse.resultCode!==0||!initResponse.payId||!PAY_ID_RX.test(initResponse.payId))throw new Error(`K&H INIT rejected: ${initResponse.resultMessage??initResponse.resultCode??'unknown'}`);
    const processDttm=dttm(),processBase=join([cfg.merchantId,initResponse.payId,processDttm]),processSignature=sign(processBase,cfg.privateKey);
    const processUrl=`${cfg.baseUrl}/payment/process/${encodeURIComponent(cfg.merchantId)}/${encodeURIComponent(initResponse.payId)}/${processDttm}/${encodeURIComponent(processSignature)}`;
    const processResponse=await fetch(processUrl,{method:'GET',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
    const location=processResponse.headers.get('location');
    if(!location||processResponse.status<300||processResponse.status>=400)throw new Error(`K&H PROCESS did not return a redirect (${processResponse.status})`);
    const checkoutUrl=new URL(location,processUrl);
    if(checkoutUrl.protocol!=='https:')throw new Error('K&H PROCESS returned an insecure redirect');
    return{redirectUrl:checkoutUrl.toString(),providerReference:initResponse.payId};
  }

  async verifyCallback(payload:unknown):ReturnType<PaymentGateway['verifyCallback']>{
    const cfg=config(),payId=extractPayId(payload);
    if(!PAY_ID_RX.test(payId))throw new Error('K&H payId invalid');
    const timestamp=dttm(),requestBase=join([cfg.merchantId,payId,timestamp]),signature=sign(requestBase,cfg.privateKey);
    const url=`${cfg.baseUrl}/payment/status/${encodeURIComponent(cfg.merchantId)}/${encodeURIComponent(payId)}/${timestamp}/${encodeURIComponent(signature)}`;
    const statusResponse=await json<KhResponse>(await fetch(url,{method:'GET',headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)}));
    if(statusResponse.payId!==payId)throw new Error('K&H STATUS payId mismatch');
    if(!verify(responseSignBase(statusResponse,false),statusResponse.signature,cfg.publicKey))throw new Error('K&H STATUS response signature invalid');
    if(statusResponse.resultCode!==0)throw new Error(`K&H STATUS rejected: ${statusResponse.resultMessage??statusResponse.resultCode}`);
    const status=mapStatus(statusResponse.paymentStatus),eventId=createHash('sha256').update(`kh|${payId}|${statusResponse.dttm??''}|${statusResponse.paymentStatus??''}`).digest('hex');
    return{paid:status==='paid',providerReference:payId,eventId,status,eventType:`kh.payment.status.${statusResponse.paymentStatus??'unknown'}`};
  }

  async healthCheck(){
    try{
      const cfg=config(),timestamp=dttm(),signature=sign(join([cfg.merchantId,timestamp]),cfg.privateKey);
      const url=`${cfg.baseUrl}/echo/${encodeURIComponent(cfg.merchantId)}/${timestamp}/${encodeURIComponent(signature)}`;
      const response=await json<KhEchoResponse>(await fetch(url,{method:'GET',headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)}));
      const base=join([response.dttm,response.resultCode,response.resultMessage]);
      if(!verify(base,response.signature,cfg.publicKey))return{ok:false,message:'A K&H ECHO válasz aláírása érvénytelen.'};
      if(response.resultCode!==0)return{ok:false,message:`A K&H ECHO hibát jelzett: ${response.resultMessage??response.resultCode}`};
      return{ok:true,message:`K&H vPOS eAPI kapcsolat rendben (${cfg.env}).`};
    }catch(error){return{ok:false,message:error instanceof Error?error.message:'A K&H vPOS kapcsolat ellenőrzése sikertelen.'}}
  }
}
