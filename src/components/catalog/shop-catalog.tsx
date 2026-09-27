'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AddToCart } from '@/components/catalog/add-to-cart';
import { formatHuf, type Product } from '@/lib/catalog';

type Props = { products: Product[]; signedIn: boolean; resellerApproved: boolean };
type AudienceFilter = 'all' | 'retail' | 'professional';
type StockFilter = 'all' | 'in-stock';
type SortMode = 'recommended' | 'new' | 'price-asc' | 'price-desc' | 'size-asc';

const normalize = (value: string) => value.toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const SEARCH_ALIAS_GROUPS=[
  ['playstation','ps','ps4','ps5'],
  ['xbox','xboxone','seriesx','seriess'],
  ['nintendo','switch','nintendoswitch'],
  ['pc','szamitogep','computer'],
  ['kontroller','controller','gamepad'],
  ['fejhallgato','headset','audio'],
  ['verseny','racing','race'],
  ['kaland','adventure'],
  ['kooperativ','coop','co-op'],
  ['arcade','arkad'],
] as const;

const aliases=new Map<string,readonly string[]>();
for(const group of SEARCH_ALIAS_GROUPS){
  const normalized=group.map(normalize);
  for(const token of normalized)aliases.set(token,normalized);
}
const withinOneEdit=(a:string,b:string)=>{
  if(a===b)return true;
  if(Math.abs(a.length-b.length)>1)return false;
  let i=0,j=0,edits=0;
  while(i<a.length&&j<b.length){
    if(a[i]===b[j]){i++;j++;continue}
    edits++;
    if(edits>1)return false;
    if(a.length>b.length)i++;
    else if(b.length>a.length)j++;
    else{i++;j++}
  }
  if(i<a.length||j<b.length)edits++;
  return edits<=1;
};
const smartSearchMatch=(query:string,haystack:string)=>{
  const needle=normalize(query.trim());
  if(!needle)return true;
  const words=normalize(haystack).split(/[^a-z0-9]+/).filter(Boolean);
  const full=words.join(' ');
  return needle.split(/\s+/).filter(Boolean).every(token=>{
    const candidates=aliases.get(token)??[token];
    return candidates.some(candidate=>
      full.includes(candidate)||
      words.some(word=>word.startsWith(candidate)||candidate.startsWith(word)||(candidate.length>=4&&word.length>=4&&withinOneEdit(candidate,word)))
    );
  });
};

export function ShopCatalog({ products, signedIn, resellerApproved }: Props) {
  const params=useSearchParams();
  const semanticKeys=['category','collection','filter','type','scene','flavor','pantry','ritual','play','genre','platform','c','concern','texture'] as const;
  const semanticTerms=semanticKeys.flatMap(key=>{
    const value=params.get(key)?.trim();
    return value&&!(key==='filter'&&value==='sale')?[normalize(value)]:[];
  });
  const initialAudience=params.get('audience')==='retail'||params.get('audience')==='professional'?params.get('audience') as AudienceFilter:'all';
  const initialStock=params.get('stock')==='in-stock'?'in-stock':'all';
  const requestedSort=params.get('sort');
  const initialSort:SortMode=requestedSort==='new'||requestedSort==='price-asc'||requestedSort==='price-desc'||requestedSort==='size-asc'?requestedSort:'recommended';
  const saleOnly=params.get('sale')==='1'||params.get('filter')==='sale';
  const [query, setQuery] = useState(()=>params.get('q')?.trim()??'');
  const [audience, setAudience] = useState<AudienceFilter>(initialAudience);
  const [stock, setStock] = useState<StockFilter>(initialStock);
  const [sort, setSort] = useState<SortMode>(initialSort);
  const searchSuggestions=useMemo(()=>[...new Set(products.flatMap(product=>[product.name,...product.useCases,...product.highlights]))].filter(Boolean).slice(0,24),[products]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return products
      .filter(product => {
        const haystack = normalize([product.name, product.sku, product.size, product.short, ...product.useCases, ...product.highlights].join(' '));
        return (!needle || smartSearchMatch(needle,haystack)) &&
          semanticTerms.every(term=>haystack.includes(term)) &&
          (!saleOnly || Boolean(product.discountPercent&&product.discountPercent>0)) &&
          (audience === 'all' || product.audience === audience) &&
          (stock === 'all' || product.stock > 0);
      })
      .sort((a, b) => {
        if(sort==='new')return new Date(b.createdAt??0).getTime()-new Date(a.createdAt??0).getTime();
        if (sort === 'price-asc') return a.grossPrice - b.grossPrice;
        if (sort === 'price-desc') return b.grossPrice - a.grossPrice;
        if (sort === 'size-asc') return a.weightGrams - b.weightGrams;
        return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.grossPrice - b.grossPrice;
      });
  }, [products, query, semanticTerms.join('|'), saleOnly, audience, stock, sort]);

  const reset = () => { setQuery(''); setAudience('all'); setStock('all'); setSort('recommended'); };

  if(!products.length)return <section className="catalogEmpty"><strong>A kínálat feltöltés alatt áll.</strong><p>Jelenleg nincs megjeleníthető termék ebben a webáruházban. Kérjük, nézz vissza később.</p></section>;

  return <>
    <section className="catalogToolbar" aria-label="Termékkereső és szűrők">
      <div className="catalogSearch">
        <label htmlFor="shop-search">Keresés</label>
        <><input id="shop-search" type="search" list="shop-search-suggestions" value={query} onChange={event => setQuery(event.target.value)} placeholder="Játék, platform, kategória, kontroller…" autoComplete="off" /><datalist id="shop-search-suggestions">{searchSuggestions.map(value=><option key={value} value={value}/>)}</datalist></>
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
          <option value="recommended">Ajánlott</option><option value="new">Újdonságok</option><option value="price-asc">Ár szerint növekvő</option><option value="price-desc">Ár szerint csökkenő</option><option value="size-asc">Kiszerelés szerint</option>
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
