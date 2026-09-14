import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type {CartCommerceGroupRequest} from '@/lib/cart/types';
import {classifyCheckoutFulfillment,type CheckoutFulfillment} from '@/lib/commerce/digital-commerce';

export type TenantCheckoutInput={
  instanceId:string;
  idempotencyKey:string;
  customerEmail:string;
  billingName:string;
  billingCompany:string;
  billingTaxNumber:string;
  billingPostcode:string;
  billingCity:string;
  billingAddress:string;
  shippingName:string;
  shippingPostcode:string;
  shippingCity:string;
  shippingAddress:string;
  customerPhone:string;
  shippingProvider:string;
  shippingKind:string;
  shippingFeeHuf:number;
  freeShippingThresholdHuf:number;
  parcelPointId:string;
  paymentProvider:string;
  note:string;
  customerId:string|null;
  couponCode:string;
  items:Array<{variant_id:string;quantity:number}>;
  commerceGroups:CartCommerceGroupRequest[];
};

type TenantOrderResult={
  order_id?:string;
  subtotal_gross_huf?:number;
  discount_gross_huf?:number;
  shipping_gross_huf?:number;
  total_gross_huf?:number;
  [key:string]:unknown;
};

async function removeSyntheticShippingFromDigitalOrder(admin:ReturnType<typeof createAdminClient>,instanceId:string,result:TenantOrderResult,fulfillment:CheckoutFulfillment){
  if(fulfillment.mode!=='digital'||!result.order_id)return;
  const subtotal=Number(result.subtotal_gross_huf??0),discount=Number(result.discount_gross_huf??0),total=Math.max(0,subtotal-discount);
  const{error}=await admin.from('orders').update({
    fulfillment_mode:'digital',
    shipping_method:null,
    parcel_point_id:null,
    shipping_name:null,
    shipping_postcode:null,
    shipping_city:null,
    shipping_address:null,
    shipping_gross_huf:0,
    total_gross_huf:total,
  }).eq('id',result.order_id).eq('instance_id',instanceId);
  if(error)throw error;
  result.shipping_gross_huf=0;
  result.total_gross_huf=total;
}

export async function placeTenantOrder(input:TenantCheckoutInput){
  const admin=createAdminClient();
  const fulfillment=await classifyCheckoutFulfillment(input.instanceId,input.items);
  const digitalOnly=fulfillment.mode==='digital';
  const{data,error}=await admin.rpc('place_order_provider_v6_idempotent',{
    p_instance_id:input.instanceId,
    p_idempotency_key:input.idempotencyKey,
    p_customer_email:input.customerEmail,
    p_billing_name:input.billingName,
    p_billing_company:input.billingCompany,
    p_billing_tax_number:input.billingTaxNumber,
    p_billing_postcode:input.billingPostcode,
    p_billing_city:input.billingCity,
    p_billing_address:input.billingAddress,
    p_shipping_name:digitalOnly?'':input.shippingName,
    p_shipping_postcode:digitalOnly?'':input.shippingPostcode,
    p_shipping_city:digitalOnly?'':input.shippingCity,
    p_shipping_address:digitalOnly?'':input.shippingAddress,
    p_customer_phone:input.customerPhone,
    p_shipping_provider:digitalOnly?'digital_delivery':input.shippingProvider,
    // v6/v5 currently accepts the legacy physical enum. For a pure-digital order the
    // adapter value is deliberately internal-only and is removed from the persisted
    // order immediately after the authoritative order transaction returns.
    p_shipping_kind:digitalOnly?'pickup':input.shippingKind,
    p_shipping_fee_huf:digitalOnly?0:input.shippingFeeHuf,
    p_free_shipping_threshold_huf:digitalOnly?0:input.freeShippingThresholdHuf,
    p_parcel_point_id:digitalOnly?'':input.parcelPointId,
    p_payment_provider:input.paymentProvider,
    p_note:input.note,
    p_customer_id:input.customerId,
    p_coupon_code:input.couponCode,
    p_items:input.items,
    p_commerce_groups:input.commerceGroups,
  });
  if(error||!data)throw error??new Error('Tenant checkout RPC returned no data.');
  const result=data as TenantOrderResult;
  await removeSyntheticShippingFromDigitalOrder(admin,input.instanceId,result,fulfillment);
  return{...result,fulfillment_mode:fulfillment.mode,requires_shipping:fulfillment.requiresShipping};
}
