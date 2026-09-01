import Link from 'next/link';
import { getProductEngagement } from '@/lib/engagement';
import { addWishlistAction, removeWishlistAction, stockNotificationAction, submitReviewAction } from '@/app/termek/[slug]/actions';

type Props = { variantId: string; slug: string; stock: number };

export async function EngagementPanel({ variantId, slug, stock }: Props) {
  const engagement = await getProductEngagement(variantId);

  return (
    <section className="productEngagement">
      <div className="detailGrid">
        <article className="card">
          <span className="eyebrow">Kívánságlista</span>
          <h2>{engagement.wishlisted ? 'Elmentve a kívánságlistádra' : 'Mentsd el későbbre'}</h2>
          {engagement.signedIn ? (
            <form action={engagement.wishlisted ? removeWishlistAction : addWishlistAction}>
              <input type="hidden" name="variantId" value={variantId}/><input type="hidden" name="slug" value={slug}/>
              <button className="btn" type="submit">{engagement.wishlisted ? 'Eltávolítás' : 'Kívánságlistára'}</button>
            </form>
          ) : <Link className="btn" href={`/fiokom?next=${encodeURIComponent(`/termek/${slug}`)}`}>Belépés a mentéshez</Link>}
        </article>

        <article className="card">
          <span className="eyebrow">Készletértesítő</span>
          <h2>{stock > 0 ? 'Most raktáron van' : 'Értesíts, ha újra kapható'}</h2>
          {stock > 0 ? <p className="muted">Jelenleg {stock} db elérhető.</p> : (
            <form action={stockNotificationAction} className="stackForm">
              <input type="hidden" name="variantId" value={variantId}/><input type="hidden" name="slug" value={slug}/>
              <label>E-mail cím<input required type="email" name="email" autoComplete="email" placeholder="nev@pelda.hu"/></label>
              <button className="btn btnPrimary" type="submit">Kérek értesítést</button>
            </form>
          )}
        </article>
      </div>

      <section className="card" id="velemenyek">
        <div className="adminToolbar">
          <div><span className="eyebrow">Vásárlói vélemények</span><h2>{engagement.reviews.length ? `${engagement.averageRating?.toFixed(1)} / 5 · ${engagement.reviews.length} vélemény` : 'Még nincs jóváhagyott vélemény'}</h2></div>
        </div>
        {engagement.reviews.length > 0 && <div className="cards">{engagement.reviews.map((review) => <article className="card" key={review.id}><strong>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</strong><h3>{review.title || review.reviewerName}</h3><p>{review.body}</p><p className="muted">{review.reviewerName}{review.verifiedPurchase ? ' · Ellenőrzött vásárlás' : ''}</p></article>)}</div>}

        <div className="card">
          <h3>Írj véleményt</h3>
          {engagement.signedIn ? (
            <form action={submitReviewAction} className="stackForm">
              <input type="hidden" name="variantId" value={variantId}/><input type="hidden" name="slug" value={slug}/>
              <label>Értékelés<select name="rating" defaultValue="5"><option value="5">5 – Kiváló</option><option value="4">4 – Jó</option><option value="3">3 – Közepes</option><option value="2">2 – Gyenge</option><option value="1">1 – Rossz</option></select></label>
              <label>Megjelenő név<input name="reviewerName" maxLength={80}/></label>
              <label>Cím<input name="title" maxLength={120}/></label>
              <label>Vélemény<textarea required name="body" minLength={5} maxLength={2000} rows={5}/></label>
              <button className="btn btnPrimary" type="submit">Vélemény beküldése</button>
              <p className="muted">A vélemény moderálás után jelenik meg. A rendszer a jogosult rendelés alapján automatikusan jelöli az ellenőrzött vásárlást.</p>
            </form>
          ) : <Link className="btn" href={`/fiokom?next=${encodeURIComponent(`/termek/${slug}#velemenyek`)}`}>Belépés véleményíráshoz</Link>}
        </div>
      </section>
    </section>
  );
}
