export type EmailTemplate='order_confirmation'|'payment_confirmed'|'order_shipped'|'order_completed';

type EmailInput={to:string;template:EmailTemplate;orderNumber:string;customerName:string;totalGrossHuf:number;trackingNumber?:string|null;invoiceUrl?:string|null;siteUrl:string};

function escapeHtml(value:string){return value.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]??ch));}
function money(value:number){return new Intl.NumberFormat('hu-HU',{style:'currency',currency:'HUF',maximumFractionDigits:0}).format(value)}

function content(input:EmailInput){
  const name=escapeHtml(input.customerName); const order=escapeHtml(input.orderNumber); const details=`${input.siteUrl.replace(/\/$/,'')}/fiokom`;
  if(input.template==='payment_confirmed')return {subject:`Fizetés beérkezett – ${order}`,title:'A fizetésed beérkezett',body:`Kedves ${name}! A(z) ${order} rendelés fizetését rögzítettük. Fizetett összeg: ${money(input.totalGrossHuf)}.`};
  if(input.template==='order_shipped')return {subject:`Csomagod úton van – ${order}`,title:'Átadtuk a csomagot a futárnak',body:`Kedves ${name}! A(z) ${order} rendelésed úton van.${input.trackingNumber?` Csomagkövetési azonosító: ${escapeHtml(input.trackingNumber)}.`:''}`};
  if(input.template==='order_completed')return {subject:`Rendelés teljesítve – ${order}`,title:'Köszönjük a vásárlást',body:`Kedves ${name}! A(z) ${order} rendelést teljesítettük. Köszönjük, hogy a Water-K terméket választottad.`};
  return {subject:`Rendelés visszaigazolása – ${order}`,title:'Köszönjük a rendelésed',body:`Kedves ${name}! A(z) ${order} rendelést rögzítettük. Végösszeg: ${money(input.totalGrossHuf)}.`};
}

export async function sendTransactionalEmail(input:EmailInput){
  const provider=process.env.EMAIL_PROVIDER??'resend'; if(provider!=='resend')throw new Error(`Unsupported email provider: ${provider}`);
  const apiKey=process.env.RESEND_API_KEY; const from=process.env.EMAIL_FROM; if(!apiKey||!from)throw new Error('RESEND_API_KEY and EMAIL_FROM required');
  const c=content(input); const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17312b"><h1>${c.title}</h1><p>${c.body}</p>${input.invoiceUrl?`<p><a href="${escapeHtml(input.invoiceUrl)}">Számla megnyitása</a></p>`:''}<p><a href="${input.siteUrl.replace(/\/$/,'')}/fiokom">Rendeléseim megnyitása</a></p><p>Water-K</p></body></html>`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:[input.to],subject:c.subject,html})});
  const payload=await response.json() as {id?:string;message?:string}; if(!response.ok||!payload.id)throw new Error(payload.message||`Email provider error: ${response.status}`);
  return {provider:'resend',messageId:payload.id,detailsUrl:detailsSafe(input.siteUrl)};
}
function detailsSafe(siteUrl:string){return `${siteUrl.replace(/\/$/,'')}/fiokom`}
