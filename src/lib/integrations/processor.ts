import { createAdminClient } from '@/lib/supabase/admin';
import { KhPaymentGateway } from '@/lib/integrations/kh';
import { FoxpostShipping,GlsShipping,MplShipping } from '@/lib/integrations/shipping';
import { getInvoiceProvider } from '@/lib/integrations/invoicing';
import { sendTransactionalEmail,type EmailTemplate } from '@/lib/integrations/email';
import { getCommunicationIdentity } from '@/lib/communication/identity';
import type { ShippingProvider } from '@/lib/integrations/types';

const MAX_ATTEMPTS=5;
function shippingProvider(id:string):ShippingProvider{if(id==='foxpost')return new FoxpostShipping();if(id==='gls')return new GlsShipping();if(id==='mpl')return new MplShipping();throw new Error(`Unsupported shipping provider: ${id}`)}
function isBlockedError(error:unknown){const text=error instanceof Error?error.message:String(error);return /credentials|required|contract|configured|unsupported|provider required/i.test(text)}
function retryAt(attempt:number){const minutes=Math.min(15*Math.pow(2,Math.max(0,attempt-1)),240);return new Date(Date.now()+minutes*60*1000).toISOString()}
const emailTemplates:EmailTemplate[]=['order_confirmation','payment_confirmed','order_shipped','order_completed'];

export async function processIntegrationJob(jobId:string,claimToken:string){
 const admin=createAdminClient();
 const {data:job,error:jobError}=await admin.from('integration_jobs').select('*').eq('id',jobId).eq('status','processing').eq('processing_token',claimToken).maybeSingle();
 if(jobError||!job)throw new Error('Integration job is not claimed by this worker');
 const attempt=(job.attempt_count??0)+1;
 const {data:started,error:startError}=await admin.from('integration_jobs').update({attempt_count:attempt,updated_at:new Date().toISOString(),last_error:null,next_attempt_at:null}).eq('id',jobId).eq('status','processing').eq('processing_token',claimToken).select('id').maybeSingle();
 if(startError||!started)throw new Error('Integration job claim lost before processing');
 const complete=async(result:unknown)=>{const {data}=await admin.from('integration_jobs').update({status:'succeeded',result,processing_token:null,next_attempt_at:null,updated_at:new Date().toISOString()}).eq('id',jobId).eq('processing_token',claimToken).select('id').maybeSingle();if(!data)throw new Error('Integration job claim lost before completion');return result;};
 try{
  if(job.kind==='payment_create'){
   if(job.provider!=='kh'||!job.order_id)throw new Error('Unsupported payment provider or missing order');
   const {data:order,error}=await admin.from('orders').select('order_number,total_gross_huf,confirmation_token').eq('id',job.order_id).maybeSingle(); if(error||!order)throw new Error('Payment order not found');
   if(!order.confirmation_token)throw new Error('Payment confirmation token missing');
   const identity=await getCommunicationIdentity();
   const returnUrl=`${identity.siteUrl}/rendeles-sikeres?token=${encodeURIComponent(order.confirmation_token)}`;
   const result=await new KhPaymentGateway().createPayment({orderId:order.order_number,total:{amount:order.total_gross_huf,currency:'HUF'},returnUrl});
   await admin.from('orders').update({external_payment_id:result.providerReference,updated_at:new Date().toISOString()}).eq('id',job.order_id); return await complete(result);
  }
  if(job.kind==='shipment_create'){
   if(!job.order_id)throw new Error('Missing order');
   const {data:order,error}=await admin.from('orders').select('order_number,customer_email,customer_phone,billing_name,shipping_postcode,shipping_city,shipping_address').eq('id',job.order_id).maybeSingle(); if(error||!order)throw new Error('Shipment order not found');
   const {data:items,error:itemError}=await admin.from('order_items').select('variant_id,sku,quantity').eq('order_id',job.order_id); if(itemError)throw new Error('Shipment items unavailable');
   const variantIds=[...new Set((items??[]).map(item=>item.variant_id).filter((id):id is string=>Boolean(id)))];
   const {data:variants,error:variantError}=variantIds.length?await admin.from('product_variants').select('id,weight_grams').in('id',variantIds):{data:[],error:null};
   if(variantError)throw new Error('Shipment variant weights unavailable');
   const weightByVariant=new Map((variants??[]).map(row=>[row.id,row.weight_grams==null?null:Number(row.weight_grams)]));
   let weightGrams=0;
   for(const item of items??[]){const unit=item.variant_id?weightByVariant.get(item.variant_id):null;if(!unit||unit<=0)throw new Error(`Shipment weight missing for SKU ${item.sku}`);weightGrams+=unit*item.quantity;}
   if(weightGrams<=0)throw new Error('Shipment weight unavailable');
   const result=await shippingProvider(job.provider).createShipment({orderId:order.order_number,customer:{email:order.customer_email,phone:order.customer_phone??undefined,name:order.billing_name},address:{country:'HU',postalCode:order.shipping_postcode??'',city:order.shipping_city??'',line1:order.shipping_address??''},weightGrams});
   await admin.from('orders').update({tracking_number:result.trackingNumber,updated_at:new Date().toISOString()}).eq('id',job.order_id); await admin.from('order_events').insert({order_id:job.order_id,event_type:'shipment_created',metadata:{provider:job.provider,tracking_number:result.trackingNumber,weight_grams:weightGrams}}); return await complete(result);
  }
  if(job.kind==='invoice_create'){
   if(!job.order_id)throw new Error('Missing order');
   const {data:order,error}=await admin.from('orders').select('order_number,customer_email,customer_phone,billing_name,billing_company,billing_tax_number,billing_postcode,billing_city,billing_address,shipping_gross_huf,total_gross_huf').eq('id',job.order_id).maybeSingle(); if(error||!order)throw new Error('Invoice order not found');
   const {data:items,error:itemError}=await admin.from('order_items').select('product_name,sku,quantity,unit_gross_huf,line_total_gross_huf').eq('order_id',job.order_id); if(itemError)throw new Error('Invoice items unavailable');
   const result=await getInvoiceProvider().createInvoice({orderId:order.order_number,customer:{email:order.customer_email,phone:order.customer_phone??undefined,name:order.billing_name,companyName:order.billing_company??undefined,taxNumber:order.billing_tax_number??undefined},billingAddress:{country:'HU',postalCode:order.billing_postcode,city:order.billing_city,line1:order.billing_address},items:(items??[]).map(i=>({name:i.product_name,sku:i.sku,quantity:i.quantity,unitGrossHuf:i.unit_gross_huf,lineGrossHuf:i.line_total_gross_huf})),shippingGrossHuf:order.shipping_gross_huf,totalGrossHuf:order.total_gross_huf});
   await admin.from('orders').update({invoice_number:result.invoiceNumber,invoice_url:result.documentUrl??null,invoiced_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',job.order_id); await admin.from('order_events').insert({order_id:job.order_id,event_type:'invoice_created',metadata:{provider:job.provider,invoice_number:result.invoiceNumber}}); return await complete(result);
  }
  if(job.kind==='email_send'){
   if(!job.order_id)throw new Error('Missing order'); const template=String(job.payload?.template??'') as EmailTemplate; if(!emailTemplates.includes(template))throw new Error('Unsupported email template');
   const {data:order,error}=await admin.from('orders').select('order_number,customer_email,billing_name,total_gross_huf,tracking_number,invoice_url').eq('id',job.order_id).maybeSingle(); if(error||!order)throw new Error('Email order not found');
   const result=await sendTransactionalEmail({to:order.customer_email,template,orderNumber:order.order_number,customerName:order.billing_name,totalGrossHuf:order.total_gross_huf,trackingNumber:order.tracking_number,invoiceUrl:order.invoice_url});
   await admin.from('order_events').insert({order_id:job.order_id,event_type:'email_sent',metadata:{template,provider:job.provider,message_id:result.messageId}}); return await complete(result);
  }
  throw new Error(`Unsupported integration job kind: ${job.kind}`);
 }catch(error){const message=error instanceof Error?error.message:'Unknown integration error';const blocked=isBlockedError(error)||attempt>=MAX_ATTEMPTS;await admin.from('integration_jobs').update({status:blocked?'blocked':'failed',processing_token:null,last_error:message,next_attempt_at:blocked?null:retryAt(attempt),updated_at:new Date().toISOString()}).eq('id',jobId).eq('processing_token',claimToken);throw error}
}
