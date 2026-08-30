'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const safeSlug = (value: FormDataEntryValue | null) => String(value ?? '').replace(/[^a-z0-9-]/gi, '');
const productPath = (slug: string) => `/termek/${slug}`;

export async function addWishlistAction(formData: FormData) {
  const slug = safeSlug(formData.get('slug'));
  const variantId = String(formData.get('variantId') ?? '');
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/fiokom?next=${encodeURIComponent(productPath(slug))}`);
  await supabase.from('wishlists').upsert({ user_id: auth.user.id, variant_id: variantId }, { onConflict: 'user_id,variant_id', ignoreDuplicates: true });
  revalidatePath(productPath(slug));
}

export async function removeWishlistAction(formData: FormData) {
  const slug = safeSlug(formData.get('slug'));
  const variantId = String(formData.get('variantId') ?? '');
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('wishlists').delete().eq('user_id', auth.user.id).eq('variant_id', variantId);
  revalidatePath(productPath(slug));
}

export async function stockNotificationAction(formData: FormData) {
  const slug = safeSlug(formData.get('slug'));
  const variantId = String(formData.get('variantId') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!variantId || !/^\S+@\S+\.\S+$/.test(email)) redirect(`${productPath(slug)}?notify=invalid`);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { data: allowed, error: limitError } = await supabase.rpc('allow_stock_notification_request', { p_email: email, p_ip: forwarded });
    if (limitError || allowed !== true) redirect(`${productPath(slug)}?notify=rate-limited`);
  }
  const { error } = await supabase.from('stock_notifications').insert({ variant_id: variantId, user_id: auth.user?.id ?? null, email, status: 'waiting' });
  if (error && error.code !== '23505') redirect(`${productPath(slug)}?notify=error`);
  redirect(`${productPath(slug)}?notify=ok`);
}

export async function submitReviewAction(formData: FormData) {
  const slug = safeSlug(formData.get('slug'));
  const variantId = String(formData.get('variantId') ?? '');
  const rating = Number(formData.get('rating'));
  const reviewerName = String(formData.get('reviewerName') ?? '').trim().slice(0, 80);
  const title = String(formData.get('title') ?? '').trim().slice(0, 120);
  const body = String(formData.get('body') ?? '').trim().slice(0, 2000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || body.length < 5) redirect(`${productPath(slug)}?review=invalid`);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/fiokom?next=${encodeURIComponent(productPath(slug))}`);
  const { data: variant } = await supabase.from('product_variants').select('product_id').eq('id', variantId).maybeSingle();
  if (!variant?.product_id) redirect(`${productPath(slug)}?review=error`);
  const { data: purchases } = await supabase.from('order_items').select('id,orders!inner(customer_id,status)').eq('variant_id', variantId).eq('orders.customer_id', auth.user.id).in('orders.status', ['paid', 'processing', 'shipped', 'completed']).limit(1);
  const { error } = await supabase.from('product_reviews').insert({ product_id: variant.product_id, user_id: auth.user.id, rating, reviewer_name: reviewerName || 'Vásárló', title: title || null, body, status: 'pending', verified_purchase: Boolean(purchases?.length) });
  if (error) redirect(`${productPath(slug)}?review=error`);
  redirect(`${productPath(slug)}?review=ok`);
}
