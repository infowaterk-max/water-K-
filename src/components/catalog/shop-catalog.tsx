'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AddToCart } from '@/components/catalog/add-to-cart';
import { formatHuf, type Product } from '@/lib/catalog';

type Props = { products: Product[]; signedIn: boolean; resellerApproved: boolean };
type AudienceFilter = 'all' | 'retail' | 'professional';
type StockFilter = 'all' | 'in-stock';
type SortMode = 'recommended' | 'price-asc' | 'price-desc' | 'size-asc';

const normalize = (value: string) => value.toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function ShopCatalog({ products, signedIn, resellerApproved }: Props) {
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState<AudienceFilter>('all');
  const [stock, setStock] = useState<StockFilter>('all');
  const [sort, setSort] = useState<SortMode>('recommended');

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return products
      .filter(product => {
        const haystack = normalize([product.name, product.sku, product.size, product.short, ...product.useCases, ...product.highlights].join(' '));
        return (!needle || haystack.includes(needle)) &&
          (audience === 'all' || product.audience === audience) &&
          (stock === 'all' || product.stock > 0);
      })
      .sort((a, b) => {
        if (sort === 'price-asc') return a.grossPrice - b.grossPrice;
        if (sort === 'price-desc') return b.grossPrice - a.grossPrice;
        if (sort === 'size-asc') return a.weightGrams - b.weightGrams;
        return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.grossPrice - b.grossPrice;
      });
  }, [products, query, audience, stock, sort]);

  const reset = () => { setQuery(''); setAudience('all'); setStock('all'); setSort('recommended'); };

  if(!products.length)return <section className="catalogEmpty"><strong>A kínálat feltöltés alatt áll.</strong><p>Jelenleg nincs megjeleníthető termék ebben a webáruházban. Kérjük, nézz vissza később.</p></section>;

  return <>
    <section className="catalogToolbar" aria-label="Termékkereső és szűrők">
      <div className="catalogSearch">
        <label htmlFor="shop-search">Keresés</label>
        <input id="shop-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Termék, felhasználás, cikkszám…" autoComplete="off" />
      </div>
      <div className="catalogFilter">
        <label htmlFor="shop-audience">Vásárlói kör</label>
        <select id="shop-audience" value={audience} onChange={event => setAudience(event.target.value as AudienceFilter)}>
          <option value="all">Minden termék</option><option value="retail">Lakossági</option><option value="professional">Viszonteladói</option>
        </select>
      </div>
      <div className="catalogFilter">
        <label htmlFor="shop-stock">Készlet</label>
        <select id="shop-stock" value={stock} onChange={event => setStock(event.target.value as StockFilter)}>
          <option value="all">Minden készletállapot</option><option value="in-stock">Csak raktáron</option>
        </select>
      </div>
      <div className="catalogFilter">
        <label htmlFor="shop-sort">Rendezés</label>
        <select id="shop-sort" value={sort} onChange={event => setSort(event.target.value as SortMode)}>
          <option value="recommended">Ajánlott</option><option value="price-asc">Ár szerint növekvő</option><option value="price-desc">Ár szerint csökkenő</option><option value="size-asc">Kiszerelés szerint</option>
        </select>
      </div>
      <div className="catalogResultMeta"><strong>{filtered.length}</strong> találat <button type="button" className="catalogReset" onClick={reset}>Szűrők törlése</button></div>
    </section>

    {filtered.length ? <div className="cards productCards shopCards">{filtered.map(product => {
      const partnerLocked = product.audience === 'professional' && !resellerApproved;
      const onSale=Boolean(product.discountPercent&&product.discountPercent>0&&product.originalGrossPrice&&product.originalGrossPrice>product.grossPrice);
      return <article className={`card productCard ${product.featured ? 'isFeatured' : ''}`} key={product.id}>
        <div className="productCardTop"><span className="badge">{onSale?`Akció · −${product.discountPercent}%`:product.featured ? 'Ajánlott' : product.audience === 'professional' ? 'Viszonteladói' : 'Lakossági'}</span><span className={`stockDot ${product.stock === 0 ? 'outOfStock' : ''}`}>{product.stock > 0 ? `${product.stock} db raktáron` : 'Elfogyott'}</span></div>
        <div className="productVisual"><div className="productPack"><small>{product.audience==='professional'?'B2B':'SHOP'}</small><strong>{product.size}</strong></div></div>
        <h2>{product.name}</h2><p className="muted">{product.short}</p><div className="tagRow">{product.useCases.slice(0, 3).map(useCase => <span key={useCase}>{useCase}</span>)}</div>
        <div className="price">{onSale&&product.originalGrossPrice?<span className="muted" style={{fontSize:14,textDecoration:'line-through',marginRight:8}}>{formatHuf(product.originalGrossPrice)}</span>:null}{formatHuf(product.grossPrice)}</div><p className="muted priceMeta">Nettó ár: {formatHuf(product.netPrice)}{product.minimumQuantity>1?` · Minimum ${product.minimumQuantity} db`:''}{product.orderMultiple>1?` · rendelési egység ${product.orderMultiple} db`:''}</p>
        <div className="actions shopActions">{partnerLocked ? <Link className="btn btnPrimary" href="/fiokom">{signedIn ? 'Partnerjóváhagyás szükséges' : 'Partnerfiók / belépés'}</Link> : <AddToCart id={product.id} variantId={product.id} slug={product.slug} name={product.name} price={product.grossPrice} availableQuantity={product.stock} minimumQuantity={product.minimumQuantity} orderMultiple={product.orderMultiple}/>}<Link className="btn btnGhost" href={`/termek/${product.slug}`}>Részletek</Link></div>
      </article>;
    })}</div> : <section className="catalogEmpty"><strong>Nincs találat a jelenlegi szűrésben.</strong><p>Próbálj más keresést vagy töröld a szűrőket.</p><button type="button" className="btn btnGhost" onClick={reset}>Összes termék mutatása</button></section>}
  </>;
}
