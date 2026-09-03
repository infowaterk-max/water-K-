'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { configuredEnvironmentFields,getProviderGuide } from '@/lib/commerce/onboarding';
import { getPaymentGatewayAdapter,getShippingProviderAdapter,hasPaymentGatewayAdapter,hasShippingProviderAdapter } from '@/lib/integrations/adapters';
import { verifyInvoiceProviderConnection } from '@/lib/integrations/invoice-health';

const codeRx=/^[a-z0-9_-]{2,80}$/;const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;const bankAccountRx=/^[A-Z0-9]{8,34}$/;
const commerceSettingsFailed=(operation:string,error?:{message?:string}|null)=>{console.error(`commerce settings ${operation} failed`,error?.message??'missing persisted evidence');throw new Error('A fizetési, szállítási vagy számlázási beállítást nem tekintjük elmentettnek.')};
async function commerceAccess(){const actor=await getAdminRequestUser('store.manage');if(!actor)throw new Error('Nincs jogosultság.');const scope=await requireCurrentStoreContext('store.manage');return{actor,scope,admin:createAdminClient()};}
function providerEvidence(data:unknown,providerCode:string,operation:string){const result=(data??{})as{providerCode?:string};if(result.providerCode!==providerCode)commerceSettingsFailed(operation);return result;}

export async function updateCommerceProviderAction(formData:FormData){
 const{actor,scope,admin}=await commerceAccess();
 const providerCode=String(formData.get('providerCode')??'').trim(); if(!codeRx.test(providerCode))return;
 const enabled=String(formData.get('enabled')??'false')==='true'; const displayLabel=String(formData.get('displayLabel')??'').trim().slice(0,100)||null;
 const feeRaw=String(formData.get('feeHuf')??'').trim(); const feeHuf=feeRaw===''?null:Number(feeRaw); if(feeHuf!==null&&(!Number.isInteger(feeHuf)||feeHuf<0||feeHuf>1000000))return;
 const logisticsEmail=String(formData.get('logisticsEmail')??'').trim().toLowerCase().slice(0,254);const bankAccountHolder=String(formData.get('bankAccountHolder')??'').trim().slice(0,160),bankName=String(formData.get('bankName')??'').trim().slice(0,160),bankAccount=String(formData.get('bankAccount')??'').trim().slice(0,80),transferNote=String(formData.get('transferNote')??'').trim().slice(0,500),bankTransfer=providerCode==='bank_transfer',bankTransferComplete=!bankTransfer||(bankAccountHolder.length>=2&&bankAccountRx.test(bankAccount.replace(/[\s-]+/g,'').toUpperCase()));
 const {data:provider,error:providerError}=await admin.from('commerce_provider_catalog').select('code,provider_type,connection_mode,adapter_key').eq('code',providerCode).eq('is_available',true).maybeSingle();
 if(providerError)commerceSettingsFailed('provider catalogue read',providerError); if(!provider)return;
 const externalLogistics=provider.adapter_key==='external_logistics_email';
 if(externalLogistics&&logisticsEmail&&!emailRx.test(logisticsEmail))return;
 const guide=getProviderGuide(providerCode,provider.connection_mode);const present=configuredEnvironmentFields(guide.requirements);const complete=externalLogistics?emailRx.test(logisticsEmail):bankTransfer?bankTransferComplete:(guide.requirements.length===0||present.length===guide.requirements.length);
 const connectionStatus=externalLogistics?(enabled&&complete?'active':'not_configured'):provider.connection_mode==='manual'&&enabled?(complete?'active':'not_configured'):enabled&&complete?'configured':enabled?'not_configured':'not_configured';
 const onboardingStep=externalLogistics?(!enabled?'selection':complete?'ready':'credentials'):!enabled?'selection':provider.connection_mode==='manual'?(complete?'ready':'credentials'):complete?'verification':'credentials';
 const payload:Record<string,unknown>={enabled,displayLabel,feeHuf:provider.provider_type==='shipping'?feeHuf:null,connectionStatus,onboardingStep,credentialFieldsPresent:present};
 if(externalLogistics)payload.configuration={fulfillment_model:'external_logistics_email',logistics_email:logisticsEmail,direct_api_contract:false};else if(bankTransfer)payload.configuration={account_holder:bankAccountHolder,bank_name:bankName,bank_account:bankAccount,transfer_note:transferNote};
 const{data:saved,error:saveError}=await admin.rpc('admin_mutate_commerce_provider_connection_v2',{p_instance_id:scope.instanceId,p_actor:actor.id,p_provider_code:providerCode,p_action:'save',p_payload:payload});
 if(saveError)commerceSettingsFailed('provider upsert',saveError);providerEvidence(saved,providerCode,'provider upsert');
 revalidatePath('/admin/beallitasok/fizetes-szallitas'); revalidatePath('/penztar');
}

export async function verifyCommerceProviderAction(formData:FormData){
 const{actor,scope,admin}=await commerceAccess();
 const providerCode=String(formData.get('providerCode')??'').trim();if(!codeRx.test(providerCode))return;
 const {data:provider,error:providerError}=await admin.from('commerce_provider_catalog').select('code,provider_type,connection_mode,adapter_key').eq('code',providerCode).eq('is_available',true).maybeSingle();
 if(providerError)commerceSettingsFailed('provider catalogue read',providerError);if(!provider)return;
 const guide=getProviderGuide(providerCode,provider.connection_mode);const present=configuredEnvironmentFields(guide.requirements);const complete=guide.requirements.length===0||present.length===guide.requirements.length;
 let status='not_configured',step='credentials',message='Hiányzik egy vagy több szükséges szerveroldali hitelesítő adat.';
 if(provider.connection_mode==='manual'){status='active';step='ready';message='A kézi szolgáltatási mód használatra kész.'}
 else if(complete&&provider.provider_type==='payment'&&hasPaymentGatewayAdapter(provider.adapter_key)){
  try{const adapter=getPaymentGatewayAdapter(provider.adapter_key);if(adapter.healthCheck){const check=await adapter.healthCheck();status=check.ok?'active':'error';step=check.ok?'ready':'verification';message=check.message}else{status='configured';step='verification';message='Az adapter telepítve van, de automatikus kapcsolatpróba még nem érhető el.'}}catch(error){status='error';step='verification';message=error instanceof Error?error.message:'A szolgáltatói kapcsolat ellenőrzése sikertelen.'}
 }
 else if(complete&&provider.provider_type==='shipping'&&hasShippingProviderAdapter(provider.adapter_key)){
  try{const adapter=getShippingProviderAdapter(provider.adapter_key);if(adapter.healthCheck){const check=await adapter.healthCheck();status=check.ok?'active':'error';step=check.ok?'ready':'verification';message=check.message}else{status='configured';step='verification';message='Az adapter telepítve van, de automatikus kapcsolatpróba még nem érhető el.'}}catch(error){status='error';step='verification';message=error instanceof Error?error.message:'A szállítási kapcsolat ellenőrzése sikertelen.'}
 }
 else if(complete&&provider.provider_type==='invoice'){
  const check=await verifyInvoiceProviderConnection(String(provider.adapter_key));status=check.ok?'active':'error';step=check.ok?'ready':'verification';message=check.message;
 }
 else if(complete){status='configured';step='verification';message=`A szükséges hitelesítő mezők rendelkezésre állnak. A(z) ${provider.adapter_key} adapter éles kapcsolatpróbája még szükséges az aktiváláshoz.`}
 const{data:saved,error:saveError}=await admin.rpc('admin_mutate_commerce_provider_connection_v2',{p_instance_id:scope.instanceId,p_actor:actor.id,p_provider_code:providerCode,p_action:'verify',p_payload:{connectionStatus:status,onboardingStep:step,credentialFieldsPresent:present,lastTestedAt:new Date().toISOString(),lastTestMessage:message}});
 if(saveError)commerceSettingsFailed('provider verification persistence',saveError);providerEvidence(saved,providerCode,'provider verification persistence');
 revalidatePath('/admin/beallitasok/fizetes-szallitas');revalidatePath('/penztar');
}
