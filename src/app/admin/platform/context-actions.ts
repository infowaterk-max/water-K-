'use server';

import {redirect} from 'next/navigation';
import {requirePlatformOperator} from '@/lib/auth/platform-operator';
import {createAdminClient} from '@/lib/supabase/admin';
import {clearPlatformTenantContext,setPlatformTenantContext} from '@/lib/instances/platform-tenant-context';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function selectPlatformTenantContextAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const instanceId=String(formData.get('instanceId')??'').trim();
  if(!UUID.test(instanceId))redirect('/admin/platform/webaruhazak?context=invalid');

  const admin=createAdminClient();
  const{data:instance,error}=await admin
    .from('webshop_instances')
    .select('id,status')
    .eq('id',instanceId)
    .in('status',['pilot','active'])
    .maybeSingle();
  if(error||!instance)redirect('/admin/platform/webaruhazak?context=unavailable');

  try{await setPlatformTenantContext(actor.id,instance.id)}
  catch{redirect('/admin/platform/webaruhazak?context=error')}
  redirect('/admin');
}

export async function clearPlatformTenantContextAction(){
  await requirePlatformOperator();
  await clearPlatformTenantContext();
  redirect('/admin/platform');
}
