import type { CommunicationIdentity } from '@/lib/communication/identity';
import { resolveActiveEmailTemplate } from '@/lib/email-builder/active-template';
import { loadOrderConfirmationEmailContext } from '@/lib/email-builder/order-context';
import { renderEmail } from '@/lib/email-builder/render/render-email';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGuestDigitalAccess } from '@/lib/commerce/digital-commerce';
import { listOrderProductDocuments } from '@/lib/commerce/product-documents';

export type EmailTemplate='order_confirmation'|'payment_confirmed'|'order_shipped'|'order_completed';
type BankTransferEmailDetails={accountHolder:string;bankName:string|null;bankAccount:string;note:string|null};
type EmailInput={to:string;template:EmailTemplate;orderNumber:string;customerName:string;totalGrossHuf:number;trackingNumber?:string|null;invoiceUrl?:string|null;siteUrl?:string;idempotencyKey?:string;identity:CommunicationIdentity;paymentMethod?:string|null;bankTransfer?:BankTransferEmailDetails|null};
type DeliveryInput={to:string;subject:string;html:string;text?:string;identity:CommunicationIdentity;idempotencyKey?:string};
type DigitalAccessDetails={url:string;guest:boolean};
type ProductDocumentAccessDetails={url:string;count:number;titles:string[]};

function escapeHtml(value:string){return value.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]??ch));}
function money(value:number){return new Intl.NumberFormat('hu-HU',{style:'currency',currency:'HUF',maximumFractionDigits:0}).format(value)}
function content(input:EmailInput,brandName:string){const name=escapeHtml(input.customerName),order=escapeHtml(input.orderNumber);if(input.template==='payment_confirmed')return{subject:`${brandName} · Fizetés beérkezett – ${order}`,title:'A fizetésed beérkezett',body:`Kedves ${name}! A(z) ${order} rendelés fizetését rögzítettük. Fizetett összeg: ${money(input.totalGrossHuf)}.`};if(input.template==='order_shipped')return{subject:`${brandName} · Csomagod úton van – ${order}`,title:'Átadtuk a csomagot a futárnak',body:`Kedves ${name}! A(z) ${order} rendelésed úton van.${input.trackingNumber?` Csomagkövetési azonosító: ${escapeHtml(input.trackingNumber)}.`:''}`};if(input.template==='order_completed')return{subject:`${brandName} · Rendelés teljesítve – ${order}`,title:'Köszönjük a vásárlást',body:`Kedves ${name}! A(z) ${order} rendelést teljesítettük. Köszönjük, hogy nálunk vásároltál.`};return{subject:`${brandName} · Rendelés visszaigazolása – ${order}`,title:'Köszönjük a rendelésed',body:`Kedves ${name}! A(z) ${order} rendelést rögzítettük. Végösszeg: ${money(input.totalGrossHuf)}.`}}
function namedFrom(rawFrom:string,fromName:string){const match=rawFrom.match(/<([^>]+)>/),address=(match?.[1]||rawFrom).trim(),safeName=fromName.replace(/[\r\n<>]+/g,' ').trim().slice(0,120)||'Shoperation';return `${safeName} <${address}>`;}
function bankTransferBlock(input:EmailInput){if(input.template!=='order_confirmation'||input.paymentMethod!=='bank_transfer'||!input.bankTransfer)return'';const b=input.bankTransfer;return `<div style="margin:20px 0;padding:16px;border:1px solid #d7ded9;border-radius:12px"><strong>Banki átutalás adatai</strong><p>Kedvezményezett: ${escapeHtml(b.accountHolder)}<br>${b.bankName?`Bank: ${escapeHtml(b.bankName)}<br>`:''}Bankszámlaszám / IBAN: <strong>${escapeHtml(b.bankAccount)}</strong><br>Közlemény: <strong>${escapeHtml(input.orderNumber)}</strong></p>${b.note?`<p>${escapeHtml(b.note)}</p>`:''}</div>`;}
function digitalAccessBlock(access:DigitalAccessDetails|null){if(!access)return'';return `<div style="margin:20px 0;padding:16px;border:1px solid #d7ded9;border-radius:12px"><strong>Digitális terméked elérhető</strong><p>A letöltés jogosultság-ellenőrzés után, rövid ideig érvényes fájllinken indul. ${access.guest?'Ez a vásárlói hozzáférési link 7 napig használható.':'A fájlokat a fiókod Letöltések részében éred el.'}</p><p><a href="${escapeHtml(access.url)}">Digitális letöltések megnyitása</a></p></div>`;}
function productDocumentBlock(access:ProductDocumentAccessDetails|null){if(!access)return'';const titles=access.titles.slice(0,5).map(title=>`<li>${escapeHtml(title)}</li>`).join('');return `<div style="margin:20px 0;padding:16px;border:1px solid #d7ded9;border-radius:12px"><strong>A megvásárolt termékhez dokumentum tartozik</strong><p>${access.count} dokumentum érhető el a rendelésedhez. A Shoperation-link ellenőrzi a rendelést, majd a fájlhoz rövid életű letöltési címet ad.</p>${titles?`<ul>${titles}</ul>`:''}<p><a href="${escapeHtml(access.url)}">Termékdokumentumok megnyitása</a></p></div>`;}

async function resolveDigitalAccess(input:EmailInput):Promise<DigitalAccessDetails|null>{
  if(input.template!=='payment_confirmed')return null;
  const admin=createAdminClient(),siteUrl=(input.siteUrl||input.identity.siteUrl).replace(/\/$/,'');
  const{data:order,error}=await admin.from('orders').select('id,customer_id,confirmation_token,status').eq('instance_id',input.identity.instanceId).eq('order_number',input.orderNumber).maybeSingle();
  if(error||!order||!['paid','processing','shipped','completed'].includes(String(order.status)))return null;
  const{count,error:entitlementError}=await admin.from('digital_entitlements').select('id',{count:'exact',head:true}).eq('instance_id',input.identity.instanceId).eq('order_id',order.id).eq('status','active');
  if(entitlementError||!count)return null;
  if(order.customer_id)return{url:`${siteUrl}/fiokom/letoltesek`,guest:false};
  if(!order.confirmation_token)return null;
  const access=await createGuestDigitalAccess({instanceId:input.identity.instanceId,orderId:order.id,tokenSeed:String(order.confirmation_token)});
  return{url:`${siteUrl}/digitalis-hozzaferes?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(access.token)}`,guest:true};
}

async function resolveProductDocumentAccess(input:EmailInput):Promise<ProductDocumentAccessDetails|null>{
  if(input.template!=='payment_confirmed')return null;
  const admin=createAdminClient(),siteUrl=(input.siteUrl||input.identity.siteUrl).replace(/\/$/,'');
  const{data:order,error}=await admin.from('orders').select('id,confirmation_token,status').eq('instance_id',input.identity.instanceId).eq('order_number',input.orderNumber).maybeSingle();
  if(error||!order?.confirmation_token||!['paid','processing','shipped','completed'].includes(String(order.status)))return null;
  const documents=await listOrderProductDocuments(input.identity.instanceId,order.id,String(order.confirmation_token)).catch(()=>[]);
  if(!documents.length)return null;
  return{url:`${siteUrl}/rendeles-sikeres?token=${encodeURIComponent(String(order.confirmation_token))}#termekdokumentumok`,count:documents.length,titles:documents.map(item=>item.title)};
}

async function deliverResend(input:DeliveryInput){
  const provider=process.env.EMAIL_PROVIDER??'resend';
  if(provider!=='resend')throw new Error(`Unsupported email provider: ${provider}`);
  const apiKey=process.env.RESEND_API_KEY,rawFrom=process.env.EMAIL_FROM;
  if(!apiKey||!rawFrom)throw new Error('RESEND_API_KEY and EMAIL_FROM required');
  const headers:Record<string,string>={authorization:`Bearer ${apiKey}`,'content-type':'application/json'};
  if(input.idempotencyKey)headers['Idempotency-Key']=input.idempotencyKey.slice(0,256);
  let response:Response;
  try{
    response=await fetch('https://api.resend.com/emails',{method:'POST',headers,body:JSON.stringify({from:namedFrom(rawFrom,input.identity.fromName),to:[input.to],subject:input.subject,html:input.html,text:input.text||undefined,reply_to:input.identity.supportEmail||undefined}),cache:'no-store'});
  }catch(error){throw new Error(`Email provider outcome unknown: ${error instanceof Error?error.message:'network error'}`)}
  const payload=await response.json().catch(()=>({})) as{id?:string;message?:string};
  if(!response.ok||!payload.id)throw new Error(payload.message||`Email provider error: ${response.status}`);
  return{provider:'resend' as const,messageId:payload.id};
}

async function tryBuilderOrderConfirmation(input:EmailInput){
  if(input.template!=='order_confirmation')return null;
  const active=await resolveActiveEmailTemplate(input.identity.instanceId,'essential.order_confirmation');
  if(!active)return null;
  const context=await loadOrderConfirmationEmailContext({instanceId:input.identity.instanceId,orderNumber:input.orderNumber,identity:input.identity,brandLogoUrl:active.brandKit?.logoUrl??null,bankTransfer:input.bankTransfer??null});
  const rendered=renderEmail(active.document,context);
  const sent=await deliverResend({to:input.to,subject:rendered.subject,html:rendered.html,text:rendered.text,identity:input.identity,idempotencyKey:input.idempotencyKey});
  return{...sent,detailsUrl:`${input.identity.siteUrl.replace(/\/$/,'')}/fiokom`,renderer:'email_builder' as const,templateVersionId:active.versionId,templateVersionNumber:active.versionNumber};
}

export async function sendTransactionalEmail(input:EmailInput){
  const builder=await tryBuilderOrderConfirmation(input);
  if(builder)return builder;
  const identity=input.identity,siteUrl=(input.siteUrl||identity.siteUrl).replace(/\/$/,''),c=content(input,identity.brandName),[digitalAccess,productDocumentAccess]=await Promise.all([resolveDigitalAccess(input),resolveProductDocumentAccess(input)]),html=`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17312b"><div style="max-width:620px;margin:auto;padding:24px"><h2>${escapeHtml(identity.brandName)}</h2><h1>${c.title}</h1><p>${c.body}</p>${bankTransferBlock(input)}${digitalAccessBlock(digitalAccess)}${productDocumentBlock(productDocumentAccess)}${input.invoiceUrl?`<p><a href="${escapeHtml(input.invoiceUrl)}">Számla megnyitása</a></p>`:''}<p><a href="${siteUrl}/fiokom">Rendeléseim megnyitása</a></p><hr style="border:0;border-top:1px solid #ddd;margin:28px 0"><p style="font-size:12px;color:#68726c">${escapeHtml(identity.brandName)} · tranzakciós értesítés</p></div></body></html>`;
  const sent=await deliverResend({to:input.to,subject:c.subject,html,identity,idempotencyKey:input.idempotencyKey});
  return{...sent,detailsUrl:productDocumentAccess?.url??digitalAccess?.url??`${siteUrl}/fiokom`,renderer:'legacy' as const};
}
