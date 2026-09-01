'use client';
import{useEffect}from'react';
const KEY='shoperation-campaign-attribution';
export function OrderAttributionReporter({token}:{token:string}){useEffect(()=>{const raw=localStorage.getItem(KEY);if(!raw)return;let attribution:unknown;try{attribution=JSON.parse(raw)}catch{return}fetch('/api/orders/attribution',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,attribution}),keepalive:true}).then(r=>{if(r.ok)localStorage.removeItem(KEY)}).catch(()=>{})},[token]);return null}
