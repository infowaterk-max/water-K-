import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getCommerceProviders,isProviderCheckoutReady,type FulfillmentKind,type PaymentFlow } from '@/lib/commerce/providers';

export type ShippingOption={code:string;label:string;fee:number;kind:Exclude<FulfillmentKind,null>;adapterKey:string};
export type PaymentOption={code:string;label:string;adapterKey:string;flow:Exclude<PaymentFlow,null>};
export type CommerceSettings={shippingOptions:ShippingOption[];paymentOptions:PaymentOption[];freeShippingThreshold:number};

const disabledCommerceSettings:CommerceSettings={shippingOptions:[],paymentOptions:[],freeShippingThreshold:0};

export async function getCommerceSettings():Promise<CommerceSettings>{
 const instance=await getCurrentWebshopInstance();
 // A sellable Shoperation instance must never inherit the reference shop's carriers,
 // payment provider or pricing. Checkout stays disabled until an instance is resolved
 // and its own provider connections are configured.
 if(!instance)return disabledCommerceSettings;
 try{
  const providers=await getCommerceProviders();
  const connected=providers.filter(isProviderCheckoutReady);
  const shippingOptions=connected.filter(p=>p.type==='shipping'&&p.fulfillmentKind).map(p=>({code:p.code,label:p.displayLabel||p.name,fee:p.feeHuf??0,kind:p.fulfillmentKind as Exclude<FulfillmentKind,null>,adapterKey:p.adapterKey}));
  const paymentOptions=connected.filter(p=>p.type==='payment'&&p.paymentFlow).map(p=>({code:p.code,label:p.displayLabel||p.name,adapterKey:p.adapterKey,flow:p.paymentFlow as Exclude<PaymentFlow,null>}));
  const admin=createAdminClient();
  const{data:instanceSettings,error}=await admin.from('webshop_instance_commerce_settings').select('free_shipping_threshold_huf').eq('instance_id',instance.id).maybeSingle();
  if(error)throw error;
  return{shippingOptions,paymentOptions,freeShippingThreshold:Number(instanceSettings?.free_shipping_threshold_huf??0)};
 }catch{return disabledCommerceSettings}
}
