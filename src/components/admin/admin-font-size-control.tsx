'use client';
import { useEffect, useState } from 'react';
type Size='compact'|'normal'|'large';
const labels:{value:Size;label:string}[]=[{value:'compact',label:'Kompakt'},{value:'normal',label:'Normál'},{value:'large',label:'Nagy'}];
export function AdminFontSizeControl(){const[size,setSize]=useState<Size>('normal');useEffect(()=>{const saved=(localStorage.getItem('shoperation-admin-text-size') as Size|null);const next=saved&&labels.some(x=>x.value===saved)?saved:'normal';setSize(next);document.documentElement.dataset.adminTextSize=next},[]);function apply(next:Size){setSize(next);localStorage.setItem('shoperation-admin-text-size',next);document.documentElement.dataset.adminTextSize=next}return <div className="adminTextSize" aria-label="Betűméret"><span>Betűméret</span>{labels.map(x=><button key={x.value} type="button" className={size===x.value?'active':undefined} onClick={()=>apply(x.value)} aria-pressed={size===x.value}>{x.label}</button>)}</div>}
