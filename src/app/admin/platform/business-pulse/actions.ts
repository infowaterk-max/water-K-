'use server';

import {revalidatePath} from 'next/cache';
import {requirePlatformOperator} from '@/lib/auth/platform-operator';
import {createAdminClient} from '@/lib/supabase/admin';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function startBusinessPulseTrialAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const instanceId=String(formData.get('instanceId')??'').trim();
  if(!UUID.test(instanceId))throw new Error('Érvénytelen webshop-azonosító.');

  const startKey=`platform:${instanceId}:${new Date().toISOString().slice(0,10)}`;
  const db=createAdminClient();
  const{data,error}=await db.rpc('service_start_business_pulse_trial_v1',{
    p_instance_id:instanceId,
    p_actor_id:actor.id,
    p_start_key:startKey,
    p_source:'platform',
  });
  if(error)throw new Error(`A trial nem indítható: ${error.message}`);
  const row=(data??{}) as {id?:unknown;instance_id?:unknown;status?:unknown;starts_at?:unknown;ends_at?:unknown};
  if(row.instance_id!==instanceId||row.status!=='active'||typeof row.id!=='string'||typeof row.starts_at!=='string'||typeof row.ends_at!=='string'){
    throw new Error('BUSINESS_PULSE_TRIAL_EVIDENCE_MISSING');
  }
  revalidatePath('/admin/platform/business-pulse');
}
