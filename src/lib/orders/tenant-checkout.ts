import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

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
};

export async function placeTenantOrder(input:TenantCheckoutInput){
  const admin=createAdminClient();
  const {data,error}=await admin.rpc('place_order_provider_v5_idempotent',{
    p_instance_id:input.instanceId,
    p_idempotency_key:input.idempotencyKey,
    p_customer_email:input.customerEmail,
    p_billing_name:input.billingName,
    p_billing_company:input.billingCompany,
    p_billing_tax_number:input.billingTaxNumber,
    p_billing_postcode:input.billingPostcode,
    p_billing_city:input.billingCity,
    p_billing_address:input.billingAddress,
    p_shipping_name:input.shippingName,
    p_shipping_postcode:input.shippingPostcode,
    p_shipping_city:input.shippingCity,
    p_shipping_address:input.shippingAddress,
    p_customer_phone:input.customerPhone,
    p_shipping_provider:input.shippingProvider,
    p_shipping_kind:input.shippingKind,
    p_shipping_fee_huf:input.shippingFeeHuf,
    p_free_shipping_threshold_huf:input.freeShippingThresholdHuf,
    p_parcel_point_id:input.parcelPointId,
    p_payment_provider:input.paymentProvider,
    p_note:input.note,
    p_customer_id:input.customerId,
    p_coupon_code:input.couponCode,
    p_items:input.items,
  });
  if(error||!data)throw error??new Error('Tenant checkout RPC returned no data.');
  return data;
}
