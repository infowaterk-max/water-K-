'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getAdminContent } from '@/lib/content/server';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

export async function openWebshopAction(){
  const actor=await getAdminRequestUser('store.manage');if(!actor)redirect('/admin/indulas?launch=forbidden');
  const scope=await requireCurrentStoreContext('store.manage');
  const instance=await getCurrentWebshopInstance();
  if(!instance) redirect('/admin/indulas?launch=no-instance');
  if(instance.status==='active') redirect('/admin/indulas?launch=already-open');
  const [products,commerce,content]=await Promise.all([getProducts({includeAllChannels:true}),getCommerceSettings(),getAdminContent()]);
  const published=new Set(content.filter(x=>x.status==='published').map(x=>x.slug));
  const ready=Boolean(instance.brand.name&&(instance.brand.supportEmail||instance.brand.supportPhone))&&products.length>0&&commerce.shippingOptions.length>0&&commerce.paymentOptions.length>0&&published.has('aszf')&&published.has('adatvedelem')&&published.has('impresszum');
  if(!ready) redirect('/admin/indulas?launch=blocked');
  const admin=createAdminClient();
  const {data:activated,error}=await admin.rpc('admin_activate_webshop_v2',{p_instance_id:scope.instanceId,p_actor:actor.id});
  const evidence=(activated??{})as{id?:string;status?:string};
  if(error||evidence.id!==scope.instanceId||evidence.status!=='active') redirect('/admin/indulas?launch=error');
  revalidatePath('/');revalidatePath('/webaruhaz');revalidatePath('/admin/indulas');
  redirect('/admin/indulas?launch=opened');
}
