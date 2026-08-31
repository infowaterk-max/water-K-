import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getCommerceProviders,isProviderCheckoutReady,type FulfillmentKind,type PaymentFlow } from '@/lib/commerce/providers';

export type ShippingOption={code:string;label:string;fee:number;kind:Exclude<FulfillmentKind,null>;adapterKey:string};
export type PaymentOption={code:string;label:string;adapterKey:string;flow:Exclude<PaymentFlow,null>};
export type CommerceSettings={shippingOptions:ShippingOption[];paymentOptions:PaymentOption[];freeShippingThreshold:number};
const legacyFallback:CommerceSettings={shippingOptions:[{code:'foxpost',label:'Foxpost automata',fee:1490,kind:'parcel_point',adapterKey:'foxpost'},{code:'gls',label:'GLS házhozszállítás',fee:2190,kind:'home_delivery',adapterKey:'gls'},{code:'mpl',label:'MPL',fee:1990,kind:'home_delivery',adapterKey:'mpl'},{code:'pickup',label:'Személyes átvétel',fee:0,kind:'pickup',adapterKey:'pickup'}],paymentOptions:[{code:'kh_card',label:'K&H bankkártya',adapterKey:'kh',flow:'online_redirect'},{code:'bank_transfer',label:'Banki átutalás',adapterKey:'bank_transfer',flow:'bank_transfer'}],freeShippingThreshold:50000};
const disabledInstanceSettings:CommerceSettings={shippingOptions:[],paymentOptions:[],freeShippingThreshold:50000};
export async function getCommerceSettings():Promise<CommerceSettings>{
 const instance=await getCurrentWebshopInstance();if(!instance)return legacyFallback;
 try{
  const providers=await getCommerceProviders();const connected=providers.filter(isProviderCheckoutReady);const shippingOptions=connected.filter(p=>p.type==='shipping'&&p.fulfillmentKind).map(p=>({code:p.code,label:p.displayLabel||p.name,fee:p.feeHuf??0,kind:p.fulfillmentKind as Exclude<FulfillmentKind,null>,adapterKey:p.adapterKey}));const paymentOptions=connected.filter(p=>p.type==='payment'&&p.paymentFlow).map(p=>({code:p.code,label:p.displayLabel||p.name,adapterKey:p.adapterKey,flow:p.paymentFlow as Exclude<PaymentFlow,null>}));const admin=createAdminClient();const{data:instanceSettings}=await admin.from('webshop_instance_commerce_settings').select('free_shipping_threshold_huf').eq('instance_id',instance.id).maybeSingle();return{shippingOptions,paymentOptions,freeShippingThreshold:Number(instanceSettings?.free_shipping_threshold_huf??50000)};
 }catch{return disabledInstanceSettings}
}
