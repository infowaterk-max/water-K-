import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getCommerceProviders,isProviderCheckoutReady,type FulfillmentKind,type PaymentFlow } from '@/lib/commerce/providers';

export type ShippingOption={code:string;label:string;fee:number;kind:Exclude<FulfillmentKind,null>;adapterKey:string};
export type PaymentOption={code:string;label:string;adapterKey:string;flow:Exclude<PaymentFlow,null>};
export type CommerceSettings={shippingOptions:ShippingOption[];paymentOptions:PaymentOption[];freeShippingThreshold:number};
const fallback:CommerceSettings={shippingOptions:[{code:'foxpost',label:'Foxpost automata',fee:1490,kind:'parcel_point',adapterKey:'foxpost'},{code:'gls',label:'GLS házhozszállítás',fee:2190,kind:'home_delivery',adapterKey:'gls'},{code:'mpl',label:'MPL',fee:1990,kind:'home_delivery',adapterKey:'mpl'},{code:'pickup',label:'Személyes átvétel',fee:0,kind:'pickup',adapterKey:'pickup'}],paymentOptions:[{code:'kh_card',label:'K&H bankkártya',adapterKey:'kh',flow:'online_redirect'},{code:'bank_transfer',label:'Banki átutalás',adapterKey:'bank_transfer',flow:'bank_transfer'}],freeShippingThreshold:50000};
export async function getCommerceSettings():Promise<CommerceSettings>{
 const instance=await getCurrentWebshopInstance();if(!instance)return fallback;
 try{
  const providers=await getCommerceProviders();const connected=providers.filter(isProviderCheckoutReady);
  if(connected.length){const shippingOptions=connected.filter(p=>p.type==='shipping'&&p.fulfillmentKind).map(p=>({code:p.code,label:p.displayLabel||p.name,fee:p.feeHuf??0,kind:p.fulfillmentKind as Exclude<FulfillmentKind,null>,adapterKey:p.adapterKey}));const paymentOptions=connected.filter(p=>p.type==='payment'&&p.paymentFlow).map(p=>({code:p.code,label:p.displayLabel||p.name,adapterKey:p.adapterKey,flow:p.paymentFlow as Exclude<PaymentFlow,null>}));const admin=createAdminClient();const{data:legacy}=await admin.from('webshop_instance_commerce_settings').select('free_shipping_threshold_huf').eq('instance_id',instance.id).maybeSingle();return{shippingOptions:shippingOptions.length?shippingOptions:fallback.shippingOptions,paymentOptions:paymentOptions.length?paymentOptions:fallback.paymentOptions,freeShippingThreshold:Number(legacy?.free_shipping_threshold_huf??50000)}}
  const admin=createAdminClient();const{data}=await admin.from('webshop_instance_commerce_settings').select('enabled_shipping_methods,enabled_payment_methods,free_shipping_threshold_huf,foxpost_fee_huf,gls_fee_huf,mpl_fee_huf,pickup_fee_huf').eq('instance_id',instance.id).maybeSingle();if(!data)return fallback;
  const fee:Record<string,number>={foxpost:Number(data.foxpost_fee_huf??1490),gls:Number(data.gls_fee_huf??2190),mpl:Number(data.mpl_fee_huf??1990),pickup:Number(data.pickup_fee_huf??0)};const kind:Record<string,Exclude<FulfillmentKind,null>>={foxpost:'parcel_point',gls:'home_delivery',mpl:'home_delivery',pickup:'pickup'};const label:Record<string,string>={foxpost:'Foxpost automata',gls:'GLS házhozszállítás',mpl:'MPL',pickup:'Személyes átvétel'};
  return{shippingOptions:(data.enabled_shipping_methods??[]).map((code:string)=>({code,label:label[code]??code,fee:fee[code]??0,kind:kind[code]??'home_delivery',adapterKey:code})),paymentOptions:(data.enabled_payment_methods??[]).map((code:string)=>({code,label:code==='kh_card'?'K&H bankkártya':'Banki átutalás',adapterKey:code==='kh_card'?'kh':code,flow:code==='kh_card'?'online_redirect':'bank_transfer'} as PaymentOption)),freeShippingThreshold:Number(data.free_shipping_threshold_huf??50000)};
 }catch{return fallback}
}
