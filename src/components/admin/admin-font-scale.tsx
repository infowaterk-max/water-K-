'use client';

import { useEffect, useState } from 'react';

type Scale='compact'|'normal'|'large';
const labels:Record<Scale,string>={compact:'Kompakt',normal:'Normál',large:'Nagy'};
const KEY='shoperation-admin-font-scale';

export function AdminFontScale(){
  const[scale,setScale]=useState<Scale>('normal');
  useEffect(()=>{
    const saved=window.localStorage.getItem(KEY) as Scale|null;
    const next=saved&&saved in labels?saved:'normal';
    setScale(next);
    document.documentElement.dataset.adminFontScale=next;
  },[]);
  function apply(next:Scale){
    setScale(next);
    window.localStorage.setItem(KEY,next);
    document.documentElement.dataset.adminFontScale=next;
  }
  return <div className="adminFontScale" aria-label="Workbench betűméret">
    <span>Betűméret</span>
    <div>{(Object.keys(labels) as Scale[]).map(key=><button key={key} type="button" className={scale===key?'active':undefined} onClick={()=>apply(key)} aria-pressed={scale===key}>{labels[key]}</button>)}</div>
  </div>;
}
