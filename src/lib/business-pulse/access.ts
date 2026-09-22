import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';

export async function hasActiveBusinessPulseTrial(instanceId:string):Promise<boolean>{
  try{
    const db=createAdminClient();
    const now=new Date().toISOString();
    const{data,error}=await db.from('business_pulse_trials').select('id')
      .eq('instance_id',instanceId).eq('status','active').lte('starts_at',now).gt('ends_at',now).limit(1);
    if(error)return false;
    return Boolean(data?.length);
  }catch{return false}
}

export async function isBusinessPulseStorefrontPaused(instanceId:string):Promise<boolean>{
  const db=createAdminClient();
  const{data,error}=await db.from('business_pulse_trials').select('status')
    .eq('instance_id',instanceId).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw new Error('BUSINESS_PULSE_PAUSE_STATE_UNAVAILABLE');
  return data?.status==='paused';
}
