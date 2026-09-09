'use server';

import { revalidatePath } from 'next/cache';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';

export async function markCustomerThreadReadAction(form:FormData){
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)throw new Error('Nincs jogosultság.');
  await requirePlanFeature('officeCommunication');
  const scope=await requireCurrentStoreContext('support.manage');
  const threadId=String(form.get('threadId')??'').trim();
  if(!threadId)return;
  const db=createAdminClient();
  const{data,error}=await db.rpc('admin_mutate_office_privacy_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_action:'mark_read',
    p_payload:{threadId},
  });
  if(error)throw new Error('Az ügyféllevelezés olvasási állapota nem menthető.');
  const result=(data??{})as{id?:string;threadId?:string};
  if(result.id!==threadId&&result.threadId!==threadId)throw new Error('Az olvasási állapot mentése nem igazolható.');
  revalidatePath('/admin/kommunikacio/iroda');
}
