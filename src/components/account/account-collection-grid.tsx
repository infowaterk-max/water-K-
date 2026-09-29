'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';

export type AccountCollectionItem={
  id:string;
  name:string;
  href:string;
  imageUrl?:string|null;
  owned:boolean;
};

export function AccountCollectionGrid({items}:{items:readonly AccountCollectionItem[]}){
  const[query,setQuery]=useState(''),[status,setStatus]=useState<'all'|'owned'|'missing'>('all');
  const showFilters=items.length>12;
  const visible=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase('hu-HU');
    return items.filter(item=>{
      if(status==='owned'&&!item.owned)return false;
      if(status==='missing'&&item.owned)return false;
      return !needle||item.name.toLocaleLowerCase('hu-HU').includes(needle);
    });
  },[items,query,status]);

  if(!items.length)return <section className="card accountCollectionEmpty"><h2>Még nincs követhető katalógustétel.</h2><p className="muted">Amint a webshopban valódi termékek vannak, itt külön láthatod, melyeket szerezted már meg.</p><Link className="btn btnPrimary" href="/webaruhaz">Katalógus megnyitása</Link></section>;

  return <section data-account-collection-authority="purchase-history-v1">
    {showFilters?<div className="accountCollectionFilters" aria-label="Gyűjtemény szűrők">
      <label><span>Keresés</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Termék neve"/></label>
      <label><span>Állapot</span><select value={status} onChange={event=>setStatus(event.target.value as 'all'|'owned'|'missing')}><option value="all">Mind</option><option value="owned">Megvan</option><option value="missing">Még hiányzik</option></select></label>
    </div>:null}
    <div className="accountCollectionGrid">
      {visible.map(item=><Link className="accountCollectionTile" data-owned={item.owned?'true':'false'} href={item.href} key={item.id}>
        <div className="accountCollectionImage">{item.imageUrl?<img src={item.imageUrl} alt="" loading="lazy"/>:<span aria-hidden="true">◇</span>}</div>
        <strong>{item.name}</strong>
        <span className="accountCollectionStatus">{item.owned?'Megvan':'Még hiányzik'}</span>
      </Link>)}
    </div>
    {!visible.length?<p className="muted">A kiválasztott szűrőkkel nincs találat.</p>:null}
  </section>;
}
