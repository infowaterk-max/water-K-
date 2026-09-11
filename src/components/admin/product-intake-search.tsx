'use client';

import Link from'next/link';
import{useMemo,useState}from'react';
import styles from'@/app/admin/termekek/feltoltes/product-intake.module.css';

type SearchItem={id:string;name:string;active:boolean};
export function ProductIntakeSearch({items}:{items:SearchItem[]}){
 const[query,setQuery]=useState(''),normalized=query.trim().toLocaleLowerCase('hu-HU');
 const matches=useMemo(()=>normalized?items.filter(item=>item.name.toLocaleLowerCase('hu-HU').includes(normalized)).slice(0,8):[],[items,normalized]);
 return <div className={styles.searchWrap}>
  <label className={styles.searchBox}><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} aria-label="Keresés a termékek között" placeholder="Keresés a termékek között..." autoComplete="off"/></label>
  {normalized&&<div className={styles.searchResults} role="listbox" aria-label="Termékkeresési találatok">{matches.length?matches.map(item=><Link key={item.id} href={item.active?'/admin/termekek':`/admin/termekek/feltoltes/${item.id}`} onClick={()=>setQuery('')}><span>{item.name}</span><small>{item.active?'Aktív termék · Termékkezelés':'Piszkozat · Szerkesztés'}</small></Link>):<div className={styles.searchEmpty}>Nincs találat ebben a katalógusban.</div>}</div>}
 </div>;
}
