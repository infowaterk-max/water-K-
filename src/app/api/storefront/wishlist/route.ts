import {NextResponse} from 'next/server';
import {addWishlistAction} from '@/app/termek/[slug]/actions';

const safeSlug=(value:FormDataEntryValue|null)=>String(value??'').replace(/[^a-z0-9-]/gi,'');

/**
 * Same-origin adapter for reusable Storefront purchase controls.
 * Wishlist mutation authority remains in the canonical product server action.
 */
export async function POST(request:Request){
  const formData=await request.formData();
  const slug=safeSlug(formData.get('slug'));
  await addWishlistAction(formData);
  return NextResponse.redirect(new URL(slug?`/termek/${slug}`:'/webaruhaz',request.url),303);
}
