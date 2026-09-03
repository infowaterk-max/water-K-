import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlanFeature } from '@/lib/plans/access';
import { moderateReviewAction } from './actions';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

export const dynamic='force-dynamic';
const statusLabel:Record<string,string>={pending:'Moderációra vár',approved:'Jóváhagyva',rejected:'Elutasítva'};

export default async function ReviewsAdminPage(){
 await requirePlanFeature('reviews');
 const scope=await requireCurrentStoreContext('marketing.manage');
 const admin=createAdminClient();
 const {data,error}=await admin.from('product_reviews').select('id,rating,title,body,reviewer_name,status,verified_purchase,created_at,products(name)').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(200);
 const reviews=data??[],pending=reviews.filter(review=>review.status==='pending').length,approved=reviews.filter(review=>review.status==='approved').length,rejected=reviews.filter(review=>review.status==='rejected').length;
 return <section className="adminMain">
  <span className="eyebrow">Alap · Vásárlói bizalom</span><h1 className="sectionTitle">Vásárlói vélemények</h1><p className="lead">Beérkező értékelések moderációja. Az „ellenőrzött vásárlás” jelölést a rendelési előzmény alapján a rendszer adja, nem a vásárló.</p>
  {error&&<div className="errorNotice" role="alert"><strong>A vélemények most nem tölthetők be.</strong> Ilyenkor ne tekintsd üresnek a moderációs sort.</div>}
  <div className="cards adminMetricCards"><div className="card"><span className="badge">Összes</span><div className="price">{reviews.length}</div></div><div className="card"><span className="badge">Moderációra vár</span><div className="price">{pending}</div></div><div className="card"><span className="badge">Jóváhagyva</span><div className="price">{approved}</div></div><div className="card"><span className="badge">Elutasítva</span><div className="price">{rejected}</div></div></div>
  <div className="integrationList">{reviews.map((review:any)=>{const product=Array.isArray(review.products)?review.products[0]:review.products;return <article className="card" key={review.id}><div className="adminToolbar"><div><span className="badge">{statusLabel[review.status]??review.status}</span> <strong>{'★'.repeat(Number(review.rating))}</strong><h3>{review.title||review.reviewer_name||'Vásárlói vélemény'}</h3></div><strong>{review.verified_purchase?'Ellenőrzött vásárlás':'Nincs vásárlással igazolva'}</strong></div>{product?.name&&<p className="muted">Termék: {product.name}</p>}<p>{review.body}</p><p className="muted">{review.reviewer_name||'Vásárló'} · {new Date(review.created_at).toLocaleDateString('hu-HU')}</p>{review.status==='pending'&&<div className="actions"><form action={moderateReviewAction}><input type="hidden" name="id" value={review.id}/><input type="hidden" name="status" value="approved"/><button className="btn btnPrimary" type="submit">Jóváhagyás</button></form><form action={moderateReviewAction}><input type="hidden" name="id" value={review.id}/><input type="hidden" name="status" value="rejected"/><button className="btn" type="submit">Elutasítás</button></form></div>}</article>})}</div>
  {!error&&reviews.length===0&&<div className="card"><p className="muted">Még nem érkezett vélemény.</p></div>}
 </section>;
}
