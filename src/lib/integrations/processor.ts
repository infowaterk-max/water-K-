import { createAdminClient } from '@/lib/supabase/admin';
import { KhPaymentGateway } from '@/lib/integrations/kh';
import { FoxpostShipping,GlsShipping,MplShipping } from '@/lib/integrations/shipping';
import { getInvoiceProvider } from '@/lib/integrations/invoicing';
import type { ShippingProvider } from '@/lib/integrations/types';

const skuWeight:Record<string,number>={'WK-040':40,'WK-750':750,'WK-25K':25000};
function shippingProvider(id:string):ShippingProvider{if(id==='foxpost')return new FoxpostShipping();if(id==='gls')return new GlsShipping();if(id==='mpl')return new MplShipping();throw new Error(`Unsupported shipping provider: ${id}`)}
function isBlockedError(error:unknown){const text=error instanceof Error?error.message:String(error);return /credentials|required|contract|configured|unsupported/i.test(text)}

export async function processIntegrationJob(jobId:string){
 const admin=createAdminClient(); const {data:job,error:jobError}=await admin.from('integration_jobs').select('*').eq('id',jobId).maybeSingle();
 if(jobError||!job)throw new Error('Integration job not found'); if(job.status==='succeeded')return job;
 await admin.from('integration_jobs').update({status:'processing',attempt_count:job.attempt_count+1,updated_at:new Date().toISOString(),last_error:null}).eq('id',jobId);
 try{
  if(job.kind==='payment_create'){
   if(job.provider!=='kh'||!job.order_id)throw new Error('Unsupported payment provider or missing order');
   const {data:order,error}=await admin.from('orders').select('order_number,total_gross_huf').eq('id',job.order_id).maybeSingle(); if(error||!order)throw new Error('Payment order not found');
   const siteUrl=process.env.NEXT_PUBLIC_SITE_URL; if(!siteUrl)throw new Error('NEXT_PUBLIC_SITE_URL required');
   const result=await new KhPaymentGateway().createPayment({orderId:order.order_number,total:{amount:order.total_gross_huf,currency:'HUF'},returnUrl:`${siteUrl.replace(/\/$/,'')}/rendeles-sikeres?order=${encodeURIComponent(order.order_number)}`});
   await admin.from('orders').update({external_payment_id:result.providerReference,updated_at:new Date().toISOString()}).eq('id',job.order_id); await admin.from('integration_jobs').update({status:'succeeded',result,updated_at:new Date().toISOString()}).eq('id',jobId); return result;
  }
  if(job.kind==='shipment_create'){
   if(!job.order_id)throw new Error('Missing order');
   const {data:order,error}=await admin.from('orders').select('order_number,customer_email,customer_phone,billing_name,shipping_postcode,shipping_city,shipping_address').eq('id',job.order_id).maybeSingle(); if(error||!order)throw new Error('Shipment order not found');
   const {data:items,error:itemError}=await admin.from('order_items').select('sku,quantity').eq('order_id',job.order_id); if(itemError)throw new Error('Shipment items unavailable');
   const weightGrams=(items??[]).reduce((sum,item)=>sum+(skuWeight[item.sku]??0)*item.quantity,0); if(weightGrams<=0)throw new Error('Shipment weight unavailable');
   const result=await shippingProvider(job.provider).createShipment({orderId:order.order_number,customer:{email:order.customer_email,phone:order.customer_phone??undefined,name:order.billing_name},address:{country:'HU',postalCode:order.shipping_postcode??'',city:order.shipping_city??'',line1:order.shipping_address??''},weightGrams});
   await admin.from('orders').update({tracking_number:result.trackingNumber,updated_at:new Date().toISOString()}).eq('id',job.order_id); await admin.from('integration_jobs').update({status:'succeeded',result,updated_at:new Date().toISOString()}).eq('id',jobId); await admin.from('order_events').insert({order_id:job.order_id,event_type:'shipment_created',metadata:{provider:job.provider,tracking_number:result.trackingNumber}}); return result;
  }
  if(job.kind==='invoice_create'){
   if(!job.order_id)throw new Error('Missing order');
   const {data:order,error}=await admin.from('orders').select('order_number,customer_email,customer_phone,billing_name,billing_company,billing_tax_number,billing_postcode,billing_city,billing_address,shipping_gross_huf,total_gross_huf').eq('id',job.order_id).maybeSingle(); if(error||!order)throw new Error('Invoice order not found');
   const {data:items,error:itemError}=await admin.from('order_items').select('product_name,sku,quantity,unit_gross_huf,line_total_gross_huf').eq('order_id',job.order_id); if(itemError)throw new Error('Invoice items unavailable');
   const result=await getInvoiceProvider().createInvoice({orderId:order.order_number,customer:{email:order.customer_email,phone:order.customer_phone??undefined,name:order.billing_name,companyName:order.billing_company??undefined,taxNumber:order.billing_tax_number??undefined},billingAddress:{country:'HU',postalCode:order.billing_postcode,city:order.billing_city,line1:order.billing_address},items:(items??[]).map(i=>({name:i.product_name,sku:i.sku,quantity:i.quantity,unitGrossHuf:i.unit_gross_huf,lineGrossHuf:i.line_total_gross_huf})),shippingGrossHuf:order.shipping_gross_huf,totalGrossHuf:order.total_gross_huf});
   await admin.from('orders').update({invoice_number:result.invoiceNumber,invoice_url:result.documentUrl??null,invoiced_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',job.order_id); await admin.from('integration_jobs').update({status:'succeeded',result,updated_at:new Date().toISOString()}).eq('id',jobId); await admin.from('order_events').insert({order_id:job.order_id,event_type:'invoice_created',metadata:{provider:job.provider,invoice_number:result.invoiceNumber}}); return result;
  }
  throw new Error(`Unsupported integration job kind: ${job.kind}`);
 }catch(error){const message=error instanceof Error?error.message:'Unknown integration error';const status=isBlockedError(error)?'blocked':'failed';await admin.from('integration_jobs').update({status,last_error:message,next_attempt_at:status==='failed'?new Date(Date.now()+15*60*1000).toISOString():null,updated_at:new Date().toISOString()}).eq('id',jobId);throw error}
}
