import { createClient } from '@/lib/supabase/server';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export type ApprovedReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewerName: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

export type ProductEngagement = {
  productId: string | null;
  wishlisted: boolean;
  signedIn: boolean;
  reviews: ApprovedReview[];
  averageRating: number | null;
};

export async function getProductEngagement(variantId: string): Promise<ProductEngagement> {
  const empty: ProductEngagement = { productId: null, wishlisted: false, signedIn: false, reviews: [], averageRating: null };
  try {
    const supabase = await createClient();
    const instance = await getCurrentWebshopInstance();
    if (!instance) return empty;
    const [{ data: variant }, { data: auth }] = await Promise.all([
      supabase.from('product_variants').select('product_id').eq('id', variantId).eq('instance_id',instance.id).maybeSingle(),
      supabase.auth.getUser(),
    ]);
    if (!variant?.product_id) return { ...empty, signedIn: Boolean(auth.user) };

    const { data: reviewRows } = await supabase
      .from('product_reviews')
      .select('id,rating,title,body,reviewer_name,verified_purchase,created_at')
      .eq('instance_id',instance.id)
      .eq('product_id', variant.product_id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50);

    let wishlisted = false;
    if (auth.user) {
      const { data } = await supabase
        .from('wishlists')
        .select('id')
        .eq('instance_id',instance.id)
        .eq('user_id', auth.user.id)
        .eq('variant_id', variantId)
        .maybeSingle();
      wishlisted = Boolean(data);
    }

    const reviews: ApprovedReview[] = (reviewRows ?? []).map((row) => ({
      id: row.id,
      rating: Number(row.rating),
      title: row.title,
      body: row.body,
      reviewerName: row.reviewer_name || 'Vásárló',
      verifiedPurchase: Boolean(row.verified_purchase),
      createdAt: row.created_at,
    }));
    const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;

    return { productId: variant.product_id, wishlisted, signedIn: Boolean(auth.user), reviews, averageRating };
  } catch {
    return empty;
  }
}
