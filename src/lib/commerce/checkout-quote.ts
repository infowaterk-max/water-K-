import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type CheckoutQuoteRequestItem={variantId:string;quantity:number};
export type CheckoutQuoteLine={variantId:string;productId:string;sku:string;name:string;variantLabel:string;quantity:number;unitGrossHuf:number;lineGrossHuf:number;availableQuantity:number;minimumQuantity:number;orderMultiple:number;channel:'b2c'|'b2b'};
export type CheckoutQuote={items:CheckoutQuoteLine[];subtotalGrossHuf:number;discountGrossHuf:number;shippingGrossHuf:number;totalGrossHuf:number;couponCode:string|null};

export async function quoteTenantCheckout(input:{instanceId:string;customerId:string|null;couponCode:string;shippingKind:string;shippingFeeHuf:number;freeShippingThresholdHuf:number;items:CheckoutQuoteRequestItem[]}):Promise<CheckoutQuote>{
  const admin=createAdminClient();
  const {data,error}=await admin.rpc('quote_tenant_checkout_v2',{
    p_instance_id:input.instanceId,p_customer_id:input.customerId,p_coupon_code:input.couponCode,
    p_shipping_kind:input.shippingKind,p_shipping_fee_huf:input.shippingFeeHuf,p_free_shipping_threshold_huf:input.freeShippingThresholdHuf,
    p_items:input.items.map(item=>({variant_id:item.variantId,quantity:item.quantity})),
  });
  if(error||!data)throw error??new Error('Tenant checkout quote returned no data.');
  return {items:Array.isArray(data.items)?data.items:[],subtotalGrossHuf:Number(data.subtotal_gross_huf??0),discountGrossHuf:Number(data.discount_gross_huf??0),shippingGrossHuf:Number(data.shipping_gross_huf??0),totalGrossHuf:Number(data.total_gross_huf??0),couponCode:data.coupon_code??null};
}
