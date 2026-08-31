import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import type { ShippingMethod } from '@/lib/orders/types';

export type PaymentMethod='kh_card'|'bank_transfer';
export type CommerceSettings={shippingMethods:ShippingMethod[];paymentMethods:PaymentMethod[];freeShippingThreshold:number;fees:Record<ShippingMethod,number>};
const defaults:CommerceSettings={shippingMethods:['foxpost','gls','mpl','pickup'],paymentMethods:['kh_card','bank_transfer'],freeShippingThreshold:50000,fees:{foxpost:1490,gls:2190,mpl:1990,pickup:0}};
const shipping=new Set<ShippingMethod>(['foxpost','gls','mpl','pickup']);
const payments=new Set<PaymentMethod>(['kh_card','bank_transfer']);
export async function getCommerceSettings():Promise<CommerceSettings>{
 const instance=await getCurrentWebshopInstance(); if(!instance)return defaults;
 try{const admin=createAdminClient();const {data}=await admin.from('webshop_instance_commerce_settings').select('enabled_shipping_methods,enabled_payment_methods,free_shipping_threshold_huf,foxpost_fee_huf,gls_fee_huf,mpl_fee_huf,pickup_fee_huf').eq('instance_id',instance.id).maybeSingle();if(!data)return defaults;
 const shippingMethods=(data.enabled_shipping_methods??[]).filter((v:string):v is ShippingMethod=>shipping.has(v as ShippingMethod));const paymentMethods=(data.enabled_payment_methods??[]).filter((v:string):v is PaymentMethod=>payments.has(v as PaymentMethod));
 return {shippingMethods:shippingMethods.length?shippingMethods:defaults.shippingMethods,paymentMethods:paymentMethods.length?paymentMethods:defaults.paymentMethods,freeShippingThreshold:Number(data.free_shipping_threshold_huf??defaults.freeShippingThreshold),fees:{foxpost:Number(data.foxpost_fee_huf??1490),gls:Number(data.gls_fee_huf??2190),mpl:Number(data.mpl_fee_huf??1990),pickup:Number(data.pickup_fee_huf??0)}};}catch{return defaults;}
}
