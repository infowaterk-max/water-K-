'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';

function target(status:'saved'|'invalid'|'forbidden'|'error'){
  return `/admin/ugyfelertek?loyalty=${status}`;
}

export async function updateLoyaltyProgramSettingsAction(formData:FormData){
  const enabled=String(formData.get('enabled')??'off')==='on';
  const accrualEnabled=String(formData.get('accrualEnabled')??'off')==='on';
  const rawExpiry=String(formData.get('pointsExpireDays')??'0').trim();
  const parsedExpiry=Number(rawExpiry);
  if(!Number.isInteger(parsedExpiry)||parsedExpiry<0||parsedExpiry>3650)redirect(target('invalid'));
  const pointsExpireDays=parsedExpiry===0?null:parsedExpiry;

  const actor=await getAdminRequestUser('store.manage');
  if(!actor)redirect(target('forbidden'));
  const scope=await requireCurrentStoreContext('store.manage');
  const admin=createAdminClient();

  const{data,error}=await admin.rpc('merchant_update_loyalty_program_settings_v1',{
    p_instance_id:scope.instanceId,
    p_actor_user_id:actor.id,
    p_enabled:enabled,
    p_accrual_enabled:accrualEnabled,
    p_points_expire_days:pointsExpireDays,
  });
  if(error){
    if(error.message.includes('STORE_MANAGE_PERMISSION_REQUIRED'))redirect(target('forbidden'));
    if(error.message.includes('LOYALTY_EXPIRY_DAYS_INVALID'))redirect(target('invalid'));
    redirect(target('error'));
  }

  const evidence=(data??{}) as{
    instanceId?:string;
    enabled?:boolean;
    accrualEnabled?:boolean;
    pointsExpireDays?:number|null;
  };
  if(evidence.instanceId!==scope.instanceId||
     evidence.enabled!==enabled||
     evidence.accrualEnabled!==accrualEnabled||
     (evidence.pointsExpireDays??null)!==pointsExpireDays){
    redirect(target('error'));
  }

  revalidatePath('/admin/ugyfelertek');
  revalidatePath('/admin/audit');
  revalidatePath('/fiokom');
  revalidatePath('/fiokom/huseg');
  redirect(target('saved'));
}
