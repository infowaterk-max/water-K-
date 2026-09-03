import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob } from '@/lib/integrations/outbox';
import { getCommunicationIdentityForInstance } from '@/lib/communication/identity';

const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));
const money=(value:number)=>new Intl.NumberFormat('hu-HU',{style:'currency',currency:'HUF',maximumFractionDigits:0}).format(value);
function namedFrom(raw:string,name:string){return /<[^>]+>/.test(raw)?raw:`${name} <${raw}>`;}

type LogisticsConfig={recipient:string;label:string;shippingCode:string};

export async function getExternalLogisticsConfig(instanceId:string,shippingCode:string):Promise<LogisticsConfig|null>{
  const admin=createAdminClient();
  const{data,error}=await admin.from('webshop_instance_provider_connections')
    .select('provider_code,enabled,display_label,connection_status,configuration,commerce_provider_catalog!inner(adapter_key)')
    .eq('instance_id',instanceId)
    .eq('provider_code',shippingCode)
    .maybeSingle();
  if(error||!data||data.enabled!==true||data.connection_status!=='active')return null;
  const catalog=Array.isArray(data.commerce_provider_catalog)?data.commerce_provider_catalog[0]:data.commerce_provider_catalog;
  if(catalog?.adapter_key!=='external_logistics_email')return null;
  const configuration=(data.configuration&&typeof data.configuration==='object'&&!Array.isArray(data.configuration)?data.configuration:{}) as Record<string,unknown>;
  const recipient=String(configuration.logistics_email??'').trim().toLowerCase();
  if(!emailRx.test(recipient))return null;
  return{recipient,label:String(data.display_label||'Külső logisztikai partner'),shippingCode:data.provider_code};
}

export async function enqueueExternalLogisticsOrderEmail(instanceId:string,orderId:string,shippingCode:string){
  const config=await getExternalLogisticsConfig(instanceId,shippingCode);
  if(!config)return null;
  const admin=createAdminClient();
  const{data:existing}=await admin.from('integration_jobs').select('id,status')
    .eq('instance_id',instanceId).eq('order_id',orderId).eq('kind','logistics_email')
    .eq('provider','external_logistics_email').in('status',['pending','processing','succeeded']).limit(1);
  if(existing?.length)return existing[0];
  return enqueueIntegrationJob({
    instanceId,orderId,kind:'logistics_email',provider:'external_logistics_email',
    payload:{recipient:config.recipient,shippingCode:config.shippingCode,label:config.label},
  });
}

export async function sendExternalLogisticsOrderEmail(instanceId:string,orderId:string,recipient:string){
  const normalized=recipient.trim().toLowerCase();
  if(!emailRx.test(normalized))throw new Error('External logistics recipient is invalid');
  const admin=createAdminClient();
  const[{data:order,error:orderError},{data:items,error:itemError},identity]=await Promise.all([
    admin.from('orders').select('order_number,status,customer_email,customer_phone,billing_name,billing_company,billing_tax_number,shipping_name,shipping_postcode,shipping_city,shipping_address,shipping_method,parcel_point_id,payment_method,subtotal_gross_huf,shipping_gross_huf,discount_gross_huf,total_gross_huf,note,created_at').eq('id',orderId).eq('instance_id',instanceId).maybeSingle(),
    admin.from('order_items').select('product_name,variant_label,sku,quantity,unit_gross_huf,line_total_gross_huf').eq('order_id',orderId).eq('instance_id',instanceId).order('created_at',{ascending:true}),
    getCommunicationIdentityForInstance(instanceId),
  ]);
  if(orderError||!order)throw new Error('External logistics order not found');
  if(itemError||!items?.length)throw new Error('External logistics order items unavailable');
  if(order.shipping_method==='pickup')throw new Error('Pickup order must not be sent to external logistics');

  const apiKey=process.env.RESEND_API_KEY,rawFrom=(process.env.EMAIL_FROM||'').trim();
  if(!apiKey||!rawFrom)throw new Error('RESEND_API_KEY and EMAIL_FROM required');
  const shippingAddress=[order.shipping_postcode,order.shipping_city,order.shipping_address].filter(Boolean).join(' ');
  const customer=[order.shipping_name||order.billing_name,order.customer_phone,order.customer_email].filter(Boolean).join(' · ');
  const itemRows=items.map(item=>`<tr><td style="padding:6px 8px;border-bottom:1px solid #ddd">${esc(item.product_name)}${item.variant_label?` · ${esc(item.variant_label)}`:''}</td><td style="padding:6px 8px;border-bottom:1px solid #ddd">${esc(item.sku)}</td><td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right">${item.quantity}</td><td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right">${esc(money(Number(item.line_total_gross_huf)))}</td></tr>`).join('');
  const cod=order.payment_method==='cash_on_delivery'?money(Number(order.total_gross_huf)):null;
  const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#18221d"><div style="max-width:760px;margin:auto;padding:24px"><h2>${esc(identity.brandName)} · új logisztikai rendelés</h2><p><strong>Rendelésszám:</strong> ${esc(order.order_number)}<br><strong>Állapot:</strong> ${esc(order.status)}<br><strong>Szállítási mód:</strong> ${esc(order.shipping_method)}<br><strong>Fizetés:</strong> ${esc(order.payment_method)}${cod?`<br><strong>Beszedendő utánvét:</strong> ${esc(cod)}`:''}</p><h3>Címzett</h3><p>${esc(customer)}<br>${esc(shippingAddress)}${order.parcel_point_id?`<br><strong>Csomagpont:</strong> ${esc(order.parcel_point_id)}`:''}</p><h3>Tételek</h3><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:6px 8px">Termék</th><th style="text-align:left;padding:6px 8px">SKU</th><th style="text-align:right;padding:6px 8px">Db</th><th style="text-align:right;padding:6px 8px">Bruttó</th></tr></thead><tbody>${itemRows}</tbody></table><p><strong>Termékek:</strong> ${esc(money(Number(order.subtotal_gross_huf)))}<br><strong>Szállítás:</strong> ${esc(money(Number(order.shipping_gross_huf)))}<br><strong>Kedvezmény:</strong> ${esc(money(Number(order.discount_gross_huf||0)))}<br><strong>Végösszeg:</strong> ${esc(money(Number(order.total_gross_huf)))}</p>${order.note?`<h3>Vásárlói megjegyzés</h3><p>${esc(order.note).replace(/\r?\n/g,'<br>')}</p>`:''}<hr style="border:0;border-top:1px solid #ddd;margin:28px 0"><p style="font-size:12px;color:#68726c">Automatikus Shoperation logisztikai értesítés. A rendelést a webshop adminisztrációjában kell véglegesíteni.</p></div></body></html>`;
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json','Idempotency-Key':`logistics-${instanceId}-${orderId}`.slice(0,256)},
    body:JSON.stringify({from:namedFrom(rawFrom,identity.fromName),to:[normalized],subject:`${identity.brandName} · új rendelés · ${order.order_number}`,html,reply_to:identity.supportEmail||undefined}),
    cache:'no-store',
  });
  const payload=await response.json().catch(()=>({})) as{id?:string;message?:string};
  if(!response.ok||!payload.id)throw new Error(payload.message||`Logistics email provider error: ${response.status}`);
  await admin.from('order_events').insert({instance_id:instanceId,order_id:orderId,event_type:'logistics_order_email_sent',metadata:{provider:'external_logistics_email',recipient:normalized,message_id:payload.id,shipping_method:order.shipping_method}});
  return{provider:'resend',messageId:payload.id,recipient:normalized};
}
