import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { quoteTenantCheckout } from '@/lib/commerce/checkout-quote';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

const schema=z.object({
 shippingProvider:z.string().trim().min(2).max(80),
 couponCode:z.string().trim().max(32).optional().default(''),
 items:z.array(z.object({variantId:z.string().uuid(),quantity:z.number().int().min(1).max(99)})).min(1).max(30),
});

export async function POST(request:Request){
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:'Érvénytelen JSON kérés.'},{status:400})}
 const parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({error:'A kosár adatai érvénytelenek.'},{status:400});
 const instance=await getCurrentWebshopInstance();if(!instance||!['pilot','active'].includes(instance.status))return NextResponse.json({error:'Ehhez a kéréshez nem tartozik rendelhető webshop.'},{status:409});
 const commerce=await getCommerceSettings(),shipping=commerce.shippingOptions.find(o=>o.code===parsed.data.shippingProvider);if(!shipping)return NextResponse.json({error:'Ez a szállítási mód nem aktív.'},{status:409});
 try{const session=await createClient(),{data:{user}}=await session.auth.getUser();const quote=await quoteTenantCheckout({instanceId:instance.id,customerId:user?.id??null,couponCode:parsed.data.couponCode.toUpperCase(),shippingKind:shipping.kind,shippingFeeHuf:shipping.fee,freeShippingThresholdHuf:commerce.freeShippingThreshold,items:parsed.data.items});return NextResponse.json({ok:true,items:quote.items,subtotal_gross_huf:quote.subtotalGrossHuf,discount_gross_huf:quote.discountGrossHuf,shipping_gross_huf:quote.shippingGrossHuf,total_gross_huf:quote.totalGrossHuf,coupon_code:quote.couponCode})}
 catch(error){console.error('checkout quote failed',{instanceId:instance.id,error});return NextResponse.json({error:'A kosár ára vagy készlete megváltozott. Frissítsd a kosarat és próbáld újra.'},{status:409})}
}
