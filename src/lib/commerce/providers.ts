import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export type CommerceProviderType='payment'|'shipping'|'invoice';
export type ProviderConnectionMode='builtin'|'api'|'manual'|'custom';
export type ProviderConnectionStatus='not_configured'|'configured'|'active'|'error';
export type FulfillmentKind='parcel_point'|'home_delivery'|'pickup'|null;
export type PaymentFlow='online_redirect'|'bank_transfer'|'cash_on_delivery'|null;
export type ProviderOnboardingStep='selection'|'contract'|'credentials'|'verification'|'ready';
export type CommerceProvider={code:string;type:CommerceProviderType;name:string;connectionMode:ProviderConnectionMode;adapterKey:string;fulfillmentKind:FulfillmentKind;paymentFlow:PaymentFlow;available:boolean;sortOrder:number;enabled:boolean;displayLabel:string|null;feeHuf:number|null;connectionStatus:ProviderConnectionStatus;onboardingStep:ProviderOnboardingStep;lastTestedAt:string|null;lastTestMessage:string|null;credentialFieldsPresent:string[];configuration:Record<string,unknown>};
export type BankTransferInstructions={label:string;accountHolder:string;bankName:string|null;bankAccount:string;note:string|null};
const bankAccountKey=(value:unknown)=>String(value??'').replace(/[\s-]+/g,'').toUpperCase();
const validBankAccount=(value:unknown)=>/^[A-Z0-9]{8,34}$/.test(bankAccountKey(value));

export async function getCommerceProviders(type?:CommerceProviderType,options:{throwOnError?:boolean}={}):Promise<CommerceProvider[]>{
 const instance=await getCurrentWebshopInstance();if(!instance&&options.throwOnError)throw new Error('COMMERCE_INSTANCE_REQUIRED'); const admin=createAdminClient();
 let catalogQuery=admin.from('commerce_provider_catalog').select('code,provider_type,name,connection_mode,adapter_key,fulfillment_kind,payment_flow,is_available,sort_order').eq('is_available',true).order('sort_order');
 if(type)catalogQuery=catalogQuery.eq('provider_type',type);
 const {data:catalog,error}=await catalogQuery;if(error){if(options.throwOnError)throw error;return[];}
 let connections:Record<string,unknown>[]=[];
 if(instance){const result=await admin.from('webshop_instance_provider_connections').select('provider_code,enabled,display_label,fee_huf,configuration,connection_status,onboarding_step,last_tested_at,last_test_message,credential_fields_present').eq('instance_id',instance.id);if(result.error){if(options.throwOnError)throw result.error;return[];}connections=(result.data??[]) as Record<string,unknown>[];}
 const byCode=new Map(connections.map(row=>[String(row.provider_code),row]));
 return (catalog??[]).map(row=>{const c=byCode.get(row.code);return{code:row.code,type:row.provider_type as CommerceProviderType,name:row.name,connectionMode:row.connection_mode as ProviderConnectionMode,adapterKey:row.adapter_key,fulfillmentKind:(row.fulfillment_kind??null) as FulfillmentKind,paymentFlow:(row.payment_flow??null) as PaymentFlow,available:Boolean(row.is_available),sortOrder:Number(row.sort_order??100),enabled:Boolean(c?.enabled),displayLabel:c?.display_label?String(c.display_label):null,feeHuf:c?.fee_huf==null?null:Number(c.fee_huf),connectionStatus:(c?.connection_status??'not_configured') as ProviderConnectionStatus,onboardingStep:(c?.onboarding_step??'selection') as ProviderOnboardingStep,lastTestedAt:c?.last_tested_at?String(c.last_tested_at):null,lastTestMessage:c?.last_test_message?String(c.last_test_message):null,credentialFieldsPresent:Array.isArray(c?.credential_fields_present)?c.credential_fields_present.map(String):[],configuration:(c?.configuration&&typeof c.configuration==='object'?c.configuration:{}) as Record<string,unknown>}});
}

export async function getBankTransferInstructionsForInstance(instanceId:string):Promise<BankTransferInstructions|null>{
 const admin=createAdminClient();
 const{data,error}=await admin.from('webshop_instance_provider_connections').select('enabled,display_label,connection_status,configuration').eq('instance_id',instanceId).eq('provider_code','bank_transfer').maybeSingle();
 if(error||!data||data.enabled!==true||data.connection_status!=='active')return null;
 const config=(data.configuration&&typeof data.configuration==='object'&&!Array.isArray(data.configuration)?data.configuration:{}) as Record<string,unknown>;
 const accountHolder=String(config.account_holder??'').trim(),bankAccount=String(config.bank_account??'').trim();
 if(accountHolder.length<2||!validBankAccount(bankAccount))return null;
 return{label:String(data.display_label||'Banki átutalás'),accountHolder,bankName:String(config.bank_name??'').trim()||null,bankAccount,note:String(config.transfer_note??'').trim()||null};
}
export function isProviderCheckoutReady(provider:CommerceProvider){
 if(!provider.enabled)return false;
 if(provider.adapterKey==='external_logistics_email'){
   const recipient=String(provider.configuration.logistics_email??'').trim();
   return provider.connectionStatus==='active'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
 }
 if(provider.code==='bank_transfer'){
   const holder=String(provider.configuration.account_holder??'').trim();
   return provider.connectionStatus==='active'&&holder.length>=2&&validBankAccount(provider.configuration.bank_account);
 }
 return provider.connectionMode==='manual'||provider.connectionStatus==='active';
}
