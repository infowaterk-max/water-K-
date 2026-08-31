'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

const codeRx=/^[a-z0-9_-]{2,80}$/;
export async function updateCommerceProviderAction(formData:FormData){
 await requireAdmin(); const instance=await getCurrentWebshopInstance(); if(!instance)return;
 const providerCode=String(formData.get('providerCode')??'').trim(); if(!codeRx.test(providerCode))return;
 const enabled=String(formData.get('enabled')??'false')==='true'; const displayLabel=String(formData.get('displayLabel')??'').trim().slice(0,100)||null;
 const feeRaw=String(formData.get('feeHuf')??'').trim(); const feeHuf=feeRaw===''?null:Number(feeRaw); if(feeHuf!==null&&(!Number.isInteger(feeHuf)||feeHuf<0||feeHuf>1000000))return;
 const admin=createAdminClient(); const {data:provider}=await admin.from('commerce_provider_catalog').select('code,connection_mode').eq('code',providerCode).eq('is_available',true).maybeSingle(); if(!provider)return;
 const connectionStatus=provider.connection_mode==='manual'&&enabled?'active':enabled?'configured':'not_configured';
 await admin.from('webshop_instance_provider_connections').upsert({instance_id:instance.id,provider_code:providerCode,enabled,display_label:displayLabel,fee_huf:feeHuf,connection_status:connectionStatus,updated_at:new Date().toISOString()},{onConflict:'instance_id,provider_code'});
 revalidatePath('/admin/beallitasok/fizetes-szallitas'); revalidatePath('/penztar');
}
