import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CommunicationIdentity } from '@/lib/communication/identity';
import { emailRenderContextSchema } from './context-schema';
import type { EmailRenderContext } from './types';

export type BuilderBankTransferDetails={accountHolder:string;bankName:string|null;bankAccount:string;note:string|null};

type Input={
  instanceId:string;
  orderNumber:string;
  identity:CommunicationIdentity;
  brandLogoUrl?:string|null;
  bankTransfer?:BuilderBankTransferDetails|null;
};

const address=(name:string|null,postcode:string|null,city:string|null,line:string|null)=>[name,postcode&&city?`${postcode} ${city}`:postcode||city,line].filter(Boolean).join('\n')||null;

export async function loadOrderConfirmationEmailContext(input:Input):Promise<EmailRenderContext>{
  const admin=createAdminClient();
  const{data:order,error:orderError}=await admin.from('orders').select('id,order_number,customer_email,billing_name,billing_postcode,billing_city,billing_address,shipping_name,shipping_postcode,shipping_city,shipping_address,subtotal_gross_huf,shipping_gross_huf,discount_gross_huf,total_gross_huf,payment_method,shipping_method,tracking_number,invoice_url,coupon_code').eq('instance_id',input.instanceId).eq('order_number',input.orderNumber).maybeSingle();
  if(orderError)throw new Error(`EMAIL_ORDER_CONTEXT_FAILED:${orderError.message}`);
  if(!order)throw new Error('EMAIL_ORDER_CONTEXT_NOT_FOUND');
  const{data:items,error:itemError}=await admin.from('order_items').select('product_name,variant_label,quantity,unit_gross_huf,line_total_gross_huf,line_total_net_huf_snapshot').eq('instance_id',input.instanceId).eq('order_id',order.id).order('id',{ascending:true});
  if(itemError)throw new Error(`EMAIL_ORDER_ITEMS_CONTEXT_FAILED:${itemError.message}`);
  if(!(items??[]).length)throw new Error('EMAIL_ORDER_ITEMS_CONTEXT_EMPTY');
  if(order.payment_method==='bank_transfer'&&!input.bankTransfer)throw new Error('EMAIL_BANK_TRANSFER_DETAILS_REQUIRED');

  const itemTax=(items??[]).reduce((sum,item)=>item.line_total_net_huf_snapshot==null?sum:sum+Math.max(0,Number(item.line_total_gross_huf)-Number(item.line_total_net_huf_snapshot)),0);
  const fullName=String(order.billing_name||'').trim();
  const customerLabel=fullName||'Vásárló';
  const context:EmailRenderContext={
    store:{name:input.identity.brandName,siteUrl:input.identity.siteUrl,logoUrl:input.brandLogoUrl??null,supportEmail:input.identity.supportEmail},
    customer:{firstName:customerLabel,fullName:customerLabel,email:order.customer_email,type:null},
    order:{number:order.order_number,subtotal:Number(order.subtotal_gross_huf??0),shipping:Number(order.shipping_gross_huf??0),discount:Number(order.discount_gross_huf??0),tax:itemTax,total:Number(order.total_gross_huf??0),currency:'HUF',items:(items??[]).map(item=>({name:item.product_name,variant:item.variant_label,quantity:Number(item.quantity),unitPrice:Number(item.unit_gross_huf),lineTotal:Number(item.line_total_gross_huf)})),invoiceUrl:order.invoice_url},
    payment:{method:order.payment_method||'unknown',accountHolder:input.bankTransfer?.accountHolder??null,bankName:input.bankTransfer?.bankName??null,bankAccount:input.bankTransfer?.bankAccount??null,note:input.bankTransfer?.note??null},
    shipping:{method:order.shipping_method,carrier:null,trackingNumber:order.tracking_number,trackingUrl:null,address:address(order.shipping_name,order.shipping_postcode,order.shipping_city,order.shipping_address)},
    billing:{address:address(order.billing_name,order.billing_postcode,order.billing_city,order.billing_address)},
    coupon:order.coupon_code?{code:order.coupon_code,discount:Number(order.discount_gross_huf??0),expiry:null}:undefined,
  };
  return emailRenderContextSchema.parse(context);
}
