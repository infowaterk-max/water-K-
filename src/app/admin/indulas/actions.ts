'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getAdminContent } from '@/lib/content/server';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

export async function openWebshopAction(){
  const scope=await requireCurrentStoreContext('store.manage');
  const instance=await getCurrentWebshopInstance();
  if(!instance) redirect('/admin/indulas?launch=no-instance');
  if(instance.status==='active') redirect('/admin/indulas?launch=already-open');
  const [products,commerce,content]=await Promise.all([getProducts({includeAllChannels:true}),getCommerceSettings(),getAdminContent()]);
  const published=new Set(content.filter(x=>x.status==='published').map(x=>x.slug));
  const ready=Boolean(instance.brand.name&&(instance.brand.supportEmail||instance.brand.supportPhone))&&products.length>0&&commerce.shippingOptions.length>0&&commerce.paymentOptions.length>0&&published.has('aszf')&&published.has('adatvedelem')&&published.has('impresszum');
  if(!ready) redirect('/admin/indulas?launch=blocked');
  const admin=createAdminClient();
  const {error}=await admin.from('webshop_instances').update({status:'active',updated_at:new Date().toISOString()}).eq('id',scope.instanceId).eq('status','pilot');
  if(error) redirect('/admin/indulas?launch=error');
  revalidatePath('/');revalidatePath('/webaruhaz');revalidatePath('/admin/indulas');
  redirect('/admin/indulas?launch=opened');
}
