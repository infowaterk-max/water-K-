import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlanFeature } from '@/lib/plans/access';
import { moderateReviewAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ReviewsAdminPage() {
  await requirePlanFeature('reviews');
  const admin = createAdminClient();
  const { data } = await admin
    .from('product_reviews')
    .select('id,rating,title,body,reviewer_name,status,verified_purchase,created_at,products(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  const reviews = data ?? [];
  const pending = reviews.filter((review) => review.status === 'pending').length;

  return <section className="adminMain">
    <span className="eyebrow">Alap · Vásárlói bizalom</span><h1 className="sectionTitle">Vásárlói vélemények</h1><p className="lead">Beérkező értékelések moderációja, ellenőrzött vásárlás jelöléssel.</p>
    <div className="cards adminMetricCards"><div className="card"><span className="badge">Összes</span><div className="price">{reviews.length}</div></div><div className="card"><span className="badge">Moderációra vár</span><div className="price">{pending}</div></div></div>
    <div className="integrationList">{reviews.map((review) => <article className="card" key={review.id}><div className="adminToolbar"><div><span className="badge">{review.status}</span> <strong>{'★'.repeat(Number(review.rating))}</strong><h3>{review.title || review.reviewer_name || 'Vásárlói vélemény'}</h3></div><strong>{review.verified_purchase ? 'Ellenőrzött vásárlás' : 'Nem ellenőrzött'}</strong></div><p>{review.body}</p><p className="muted">{review.reviewer_name || 'Vásárló'} · {new Date(review.created_at).toLocaleDateString('hu-HU')}</p>{review.status === 'pending' && <div className="actions"><form action={moderateReviewAction}><input type="hidden" name="id" value={review.id}/><input type="hidden" name="status" value="approved"/><button className="btn btnPrimary" type="submit">Jóváhagyás</button></form><form action={moderateReviewAction}><input type="hidden" name="id" value={review.id}/><input type="hidden" name="status" value="rejected"/><button className="btn" type="submit">Elutasítás</button></form></div>}</article>)}</div>
    {reviews.length === 0 && <div className="card"><p className="muted">Még nem érkezett vélemény.</p></div>}
  </section>;
}
