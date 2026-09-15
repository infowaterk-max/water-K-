import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { quoteTenantCheckout } from '@/lib/commerce/checkout-quote';
import { classifyCheckoutFulfillment } from '@/lib/commerce/digital-commerce';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

const schema=z.object({
 shippingProvider:z.string().trim().min(2).max(80).optional(),
 couponCode:z.string().trim().max(32).optional().default(''),
 items:z.array(z.object({variantId:z.string().uuid(),quantity:z.number().int().min(1).max(99)})).min(1).max(30),
});

export async function POST(request:Request){
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:'Érvénytelen JSON kérés.'},{status:400})}
 const parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({error:'A kosár adatai érvénytelenek.'},{status:400});
 const instance=await getCurrentWebshopInstance();if(!instance||!['pilot','active'].includes(instance.status))return NextResponse.json({error:'Ehhez a kéréshez nem tartozik rendelhető webshop.'},{status:409});
 try{
  const items=parsed.data.items.map(item=>({variant_id:item.variantId,quantity:item.quantity}));
  const fulfillment=await classifyCheckoutFulfillment(instance.id,items);
  const commerce=await getCommerceSettings();
  const shipping=fulfillment.requiresShipping?commerce.shippingOptions.find(o=>o.code===parsed.data.shippingProvider):null;
  if(fulfillment.requiresShipping&&!parsed.data.shippingProvider)return NextResponse.json({error:'A kosár fizikai terméket tartalmaz, ezért szállítási módot kell választani.'},{status:400});
  if(fulfillment.requiresShipping&&!shipping)return NextResponse.json({error:'Ez a szállítási mód nem aktív.'},{status:409});
  const session=await createClient(),{data:{user}}=await session.auth.getUser();
  const quote=await quoteTenantCheckout({
    instanceId:instance.id,customerId:user?.id??null,couponCode:parsed.data.couponCode.toUpperCase(),
    shippingKind:shipping?.kind??'pickup',shippingFeeHuf:shipping?.fee??0,
    freeShippingThresholdHuf:shipping?commerce.freeShippingThreshold:0,items:parsed.data.items
  });
  return NextResponse.json({ok:true,items:quote.items,subtotal_gross_huf:quote.subtotalGrossHuf,discount_gross_huf:quote.discountGrossHuf,shipping_gross_huf:fulfillment.requiresShipping?quote.shippingGrossHuf:0,total_gross_huf:fulfillment.requiresShipping?quote.totalGrossHuf:Math.max(0,quote.subtotalGrossHuf-quote.discountGrossHuf),coupon_code:quote.couponCode,fulfillment_mode:fulfillment.mode,requires_shipping:fulfillment.requiresShipping,physical_lines:fulfillment.physicalLines,digital_lines:fulfillment.digitalLines});
 }
 catch(error){console.error('checkout quote failed',{instanceId:instance.id,error});return NextResponse.json({error:'A kosár ára, készlete vagy teljesítési módja megváltozott. Frissítsd a kosarat és próbáld újra.'},{status:409})}
}
