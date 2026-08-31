import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export type CommerceProviderType='payment'|'shipping';
export type ProviderConnectionMode='builtin'|'api'|'manual'|'custom';
export type ProviderConnectionStatus='not_configured'|'configured'|'active'|'error';
export type FulfillmentKind='parcel_point'|'home_delivery'|'pickup'|null;
export type PaymentFlow='online_redirect'|'bank_transfer'|'cash_on_delivery'|null;
export type CommerceProvider={code:string;type:CommerceProviderType;name:string;connectionMode:ProviderConnectionMode;adapterKey:string;fulfillmentKind:FulfillmentKind;paymentFlow:PaymentFlow;available:boolean;sortOrder:number;enabled:boolean;displayLabel:string|null;feeHuf:number|null;connectionStatus:ProviderConnectionStatus;configuration:Record<string,unknown>};

export async function getCommerceProviders(type?:CommerceProviderType):Promise<CommerceProvider[]>{
 const instance=await getCurrentWebshopInstance(); const admin=createAdminClient();
 let catalogQuery=admin.from('commerce_provider_catalog').select('code,provider_type,name,connection_mode,adapter_key,fulfillment_kind,payment_flow,is_available,sort_order').eq('is_available',true).order('sort_order');
 if(type)catalogQuery=catalogQuery.eq('provider_type',type);
 const {data:catalog,error}=await catalogQuery;if(error)return[];
 let connections:Record<string,unknown>[]=[];
 if(instance){const result=await admin.from('webshop_instance_provider_connections').select('provider_code,enabled,display_label,fee_huf,configuration,connection_status').eq('instance_id',instance.id);connections=(result.data??[]) as Record<string,unknown>[];}
 const byCode=new Map(connections.map(row=>[String(row.provider_code),row]));
 return (catalog??[]).map(row=>{const c=byCode.get(row.code);return{code:row.code,type:row.provider_type as CommerceProviderType,name:row.name,connectionMode:row.connection_mode as ProviderConnectionMode,adapterKey:row.adapter_key,fulfillmentKind:(row.fulfillment_kind??null) as FulfillmentKind,paymentFlow:(row.payment_flow??null) as PaymentFlow,available:Boolean(row.is_available),sortOrder:Number(row.sort_order??100),enabled:Boolean(c?.enabled),displayLabel:c?.display_label?String(c.display_label):null,feeHuf:c?.fee_huf==null?null:Number(c.fee_huf),connectionStatus:(c?.connection_status??'not_configured') as ProviderConnectionStatus,configuration:(c?.configuration&&typeof c.configuration==='object'?c.configuration:{}) as Record<string,unknown>}});
}

export function isProviderCheckoutReady(provider:CommerceProvider){return provider.enabled&&(provider.connectionMode==='manual'||provider.connectionStatus==='active');}
