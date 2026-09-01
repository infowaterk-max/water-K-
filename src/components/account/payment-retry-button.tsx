'use client';
import { useState } from 'react';

export function PaymentRetryButton({orderId}:{orderId:string}){
 const[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function retry(){if(busy)return;setBusy(true);setError('');try{const response=await fetch(`/api/orders/${encodeURIComponent(orderId)}/retry-payment`,{method:'POST'}),data=await response.json() as {redirectUrl?:string;error?:string};if(!response.ok||!data.redirectUrl)throw new Error(data.error||'A fizetés nem indítható újra.');window.location.assign(data.redirectUrl)}catch(err){setError(err instanceof Error?err.message:'A fizetés nem indítható újra.');setBusy(false)}}
 return <div className="paymentRetry"><button className="btn btnPrimary" type="button" onClick={retry} disabled={busy}>{busy?'Fizetés indítása…':'Fizetés újrapróbálása'}</button>{error&&<p className="errorNotice" role="alert">{error}</p>}</div>;
}
