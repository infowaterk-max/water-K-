'use server';

import{revalidatePath}from'next/cache';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireAdmin}from'@/lib/auth/require-admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function moderateReviewAction(formData:FormData){
  const actor=await requireAdmin();
  const scope=await requireCurrentStoreContext('marketing.manage');
  const id=String(formData.get('id')??'');
  const status=String(formData.get('status')??'');
  if(!uuid.test(id)||!['approved','rejected'].includes(status))throw new Error('Érvénytelen moderációs kérés.');

  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_moderate_product_review_v2',{
    p_instance_id:scope.instanceId,p_review_id:id,p_actor:actor.id,p_status:status
  });
  if(error){
    if(error.message.includes('REVIEW_ALREADY_MODERATED'))throw new Error('A véleményt időközben már moderálták.');
    if(error.message.includes('REVIEW_NOT_FOUND'))throw new Error('A vélemény nem található ebben a webshopban.');
    throw new Error('A moderáció mentése nem sikerült. A vélemény állapotát nem tekintjük módosítottnak.');
  }
  if(!(data as{id?:string}|null)?.id)throw new Error('A moderáció eredménye nem igazolható.');
  revalidatePath('/admin/velemenyek');
}
