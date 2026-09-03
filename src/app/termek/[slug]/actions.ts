'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

const safeSlug=(value:FormDataEntryValue|null)=>String(value??'').replace(/[^a-z0-9-]/gi,'');
const productPath=(slug:string)=>`/termek/${slug}`;
async function resolveCurrentVariant(variantId:string){
  const instance=await getCurrentWebshopInstance();if(!instance)return null;
  const admin=createAdminClient();
  const{data:variant,error}=await admin.from('product_variants').select('id,product_id').eq('id',variantId).eq('instance_id',instance.id).maybeSingle();
  if(error||!variant?.product_id)return null;
  return{instance,variant,admin};
}
export async function addWishlistAction(formData:FormData){
  const slug=safeSlug(formData.get('slug')),variantId=String(formData.get('variantId')??''),supabase=await createClient(),{data:auth}=await supabase.auth.getUser();
  if(!auth.user)redirect(`/fiokom?next=${encodeURIComponent(productPath(slug))}`);
  const resolved=await resolveCurrentVariant(variantId);if(!resolved)redirect(`${productPath(slug)}?wishlist=error`);
  const{error}=await resolved.admin.from('wishlists').upsert({instance_id:resolved.instance.id,user_id:auth.user.id,variant_id:variantId},{onConflict:'user_id,variant_id',ignoreDuplicates:true});
  if(error)redirect(`${productPath(slug)}?wishlist=error`);
  revalidatePath(productPath(slug));
}
export async function removeWishlistAction(formData:FormData){
  const slug=safeSlug(formData.get('slug')),variantId=String(formData.get('variantId')??''),supabase=await createClient(),{data:auth}=await supabase.auth.getUser();if(!auth.user)return;
  const resolved=await resolveCurrentVariant(variantId);if(!resolved)return;
  await resolved.admin.from('wishlists').delete().eq('instance_id',resolved.instance.id).eq('user_id',auth.user.id).eq('variant_id',variantId);
  revalidatePath(productPath(slug));
}
export async function stockNotificationAction(formData:FormData){
  const slug=safeSlug(formData.get('slug')),variantId=String(formData.get('variantId')??''),email=String(formData.get('email')??'').trim().toLowerCase();if(!variantId||!/^\S+@\S+\.\S+$/.test(email))redirect(`${productPath(slug)}?notify=invalid`);
  const resolved=await resolveCurrentVariant(variantId);if(!resolved)redirect(`${productPath(slug)}?notify=error`);
  const supabase=await createClient(),{data:auth}=await supabase.auth.getUser();
  if(!auth.user){const h=await headers(),forwarded=h.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown',{data:allowed,error:limitError}=await resolved.admin.rpc('allow_stock_notification_request',{p_email:email,p_ip:forwarded});if(limitError||allowed!==true)redirect(`${productPath(slug)}?notify=rate-limited`);}
  const{error}=await resolved.admin.from('stock_notifications').insert({instance_id:resolved.instance.id,variant_id:variantId,user_id:auth.user?.id??null,email,status:'waiting'});if(error&&error.code!=='23505')redirect(`${productPath(slug)}?notify=error`);redirect(`${productPath(slug)}?notify=ok`);
}
export async function submitReviewAction(formData:FormData){
  const slug=safeSlug(formData.get('slug')),variantId=String(formData.get('variantId')??''),rating=Number(formData.get('rating')),reviewerName=String(formData.get('reviewerName')??'').trim().slice(0,80),title=String(formData.get('title')??'').trim().slice(0,120),body=String(formData.get('body')??'').trim().slice(0,2000);if(!Number.isInteger(rating)||rating<1||rating>5||body.length<5)redirect(`${productPath(slug)}?review=invalid`);
  const supabase=await createClient(),{data:auth}=await supabase.auth.getUser();if(!auth.user)redirect(`/fiokom?next=${encodeURIComponent(productPath(slug))}`);
  const resolved=await resolveCurrentVariant(variantId);if(!resolved)redirect(`${productPath(slug)}?review=error`);
  const{data:purchases}=await resolved.admin.from('order_items').select('id,orders!inner(customer_id,status,instance_id)').eq('instance_id',resolved.instance.id).eq('variant_id',variantId).eq('orders.instance_id',resolved.instance.id).eq('orders.customer_id',auth.user.id).in('orders.status',['paid','processing','shipped','completed']).limit(1);
  const{error}=await resolved.admin.from('product_reviews').insert({instance_id:resolved.instance.id,product_id:resolved.variant.product_id,user_id:auth.user.id,rating,reviewer_name:reviewerName||'Vásárló',title:title||null,body,status:'pending',verified_purchase:Boolean(purchases?.length)});if(error)redirect(`${productPath(slug)}?review=error`);redirect(`${productPath(slug)}?review=ok`);
}
