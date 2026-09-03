'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { configuredEnvironmentFields,getProviderGuide } from '@/lib/commerce/onboarding';
import { getPaymentGatewayAdapter,getShippingProviderAdapter,hasPaymentGatewayAdapter,hasShippingProviderAdapter } from '@/lib/integrations/adapters';
import { verifyInvoiceProviderConnection } from '@/lib/integrations/invoice-health';

const codeRx=/^[a-z0-9_-]{2,80}$/;const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;const bankAccountRx=/^[A-Z0-9]{8,34}$/;
export async function updateCommerceProviderAction(formData:FormData){
 const scope=await requireCurrentStoreContext('store.manage');
 const providerCode=String(formData.get('providerCode')??'').trim(); if(!codeRx.test(providerCode))return;
 const enabled=String(formData.get('enabled')??'false')==='true'; const displayLabel=String(formData.get('displayLabel')??'').trim().slice(0,100)||null;
 const feeRaw=String(formData.get('feeHuf')??'').trim(); const feeHuf=feeRaw===''?null:Number(feeRaw); if(feeHuf!==null&&(!Number.isInteger(feeHuf)||feeHuf<0||feeHuf>1000000))return;
 const logisticsEmail=String(formData.get('logisticsEmail')??'').trim().toLowerCase().slice(0,254);const bankAccountHolder=String(formData.get('bankAccountHolder')??'').trim().slice(0,160),bankName=String(formData.get('bankName')??'').trim().slice(0,160),bankAccount=String(formData.get('bankAccount')??'').trim().slice(0,80),transferNote=String(formData.get('transferNote')??'').trim().slice(0,500),bankTransfer=providerCode==='bank_transfer',bankTransferComplete=!bankTransfer||(bankAccountHolder.length>=2&&bankAccountRx.test(bankAccount.replace(/[\s-]+/g,'').toUpperCase()));
 const admin=createAdminClient(); const {data:provider}=await admin.from('commerce_provider_catalog').select('code,provider_type,connection_mode,adapter_key').eq('code',providerCode).eq('is_available',true).maybeSingle(); if(!provider)return;
 const externalLogistics=provider.adapter_key==='external_logistics_email';
 if(externalLogistics&&logisticsEmail&&!emailRx.test(logisticsEmail))return;
 const guide=getProviderGuide(providerCode,provider.connection_mode);const present=configuredEnvironmentFields(guide.requirements);const complete=externalLogistics?emailRx.test(logisticsEmail):bankTransfer?bankTransferComplete:(guide.requirements.length===0||present.length===guide.requirements.length);
 const connectionStatus=externalLogistics?(enabled&&complete?'active':'not_configured'):provider.connection_mode==='manual'&&enabled?(complete?'active':'not_configured'):enabled&&complete?'configured':enabled?'not_configured':'not_configured';
 const onboardingStep=externalLogistics?(!enabled?'selection':complete?'ready':'credentials'):!enabled?'selection':provider.connection_mode==='manual'?(complete?'ready':'credentials'):complete?'verification':'credentials';
 const row:Record<string,unknown>={instance_id:scope.instanceId,provider_code:providerCode,enabled,display_label:displayLabel,fee_huf:provider.provider_type==='shipping'?feeHuf:null,connection_status:connectionStatus,onboarding_step:onboardingStep,credential_fields_present:present,updated_at:new Date().toISOString()};
 if(externalLogistics)row.configuration={fulfillment_model:'external_logistics_email',logistics_email:logisticsEmail,direct_api_contract:false};else if(bankTransfer)row.configuration={account_holder:bankAccountHolder,bank_name:bankName,bank_account:bankAccount,transfer_note:transferNote};
 await admin.from('webshop_instance_provider_connections').upsert(row,{onConflict:'instance_id,provider_code'});
 revalidatePath('/admin/beallitasok/fizetes-szallitas'); revalidatePath('/penztar');
}

export async function verifyCommerceProviderAction(formData:FormData){
 const scope=await requireCurrentStoreContext('store.manage');
 const providerCode=String(formData.get('providerCode')??'').trim();if(!codeRx.test(providerCode))return;
 const admin=createAdminClient();const {data:provider}=await admin.from('commerce_provider_catalog').select('code,provider_type,connection_mode,adapter_key').eq('code',providerCode).eq('is_available',true).maybeSingle();if(!provider)return;
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
 await admin.from('webshop_instance_provider_connections').update({connection_status:status,onboarding_step:step,credential_fields_present:present,last_tested_at:new Date().toISOString(),last_test_message:message,updated_at:new Date().toISOString()}).eq('instance_id',scope.instanceId).eq('provider_code',providerCode);
 revalidatePath('/admin/beallitasok/fizetes-szallitas');revalidatePath('/penztar');
}
