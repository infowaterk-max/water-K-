'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/cart-provider';
import { useAnalytics } from '@/components/analytics/analytics-provider';
import { formatHuf } from '@/lib/catalog';
import { freeShippingThreshold, shippingFee, shippingOptions } from '@/lib/commerce/pricing';
import type { CustomerType, OrderStatus, ShippingMethod } from '@/lib/orders/types';

type OrderApiResponse={error?:string;orderNumber?:string;status?:OrderStatus;total?:number};
type CouponResponse={valid?:boolean;code?:string;discount?:number;error?:string};

function makeCheckoutKey(){return typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;}

export function CheckoutForm({khEnabled}:{khEnabled:boolean}){
  const {cart,total:subtotal,clear}=useCart(); const router=useRouter(); const {track}=useAnalytics();
  const submitting=useRef(false); const requestKey=useRef(makeCheckoutKey());
  const [state,setState]=useState<'idle'|'sending'|'error'>('idle'); const [error,setError]=useState('');
  const [customerType,setCustomerType]=useState<CustomerType>('retail'); const [shippingMethod,setShippingMethod]=useState<ShippingMethod>('foxpost'); const [sameAddress,setSameAddress]=useState(true); const [legalAccepted,setLegalAccepted]=useState(false);
  const [couponInput,setCouponInput]=useState(''); const [couponCode,setCouponCode]=useState(''); const [couponDiscount,setCouponDiscount]=useState(0); const [couponMessage,setCouponMessage]=useState(''); const [couponLoading,setCouponLoading]=useState(false);
  const companyRequired=customerType!=='retail'; const discountedSubtotal=Math.max(0,subtotal-couponDiscount); const deliveryFee=shippingFee(shippingMethod,discountedSubtotal); const total=discountedSubtotal+deliveryFee;

  async function applyCoupon(){
    const code=couponInput.trim().toUpperCase(); if(!code){setCouponCode('');setCouponDiscount(0);setCouponMessage('');return;}
    setCouponLoading(true); setCouponMessage('');
    try{const response=await fetch('/api/coupons/validate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,subtotal})});const payload=await response.json() as CouponResponse;if(!response.ok||!payload.valid){setCouponCode('');setCouponDiscount(0);setCouponMessage(payload.error??'A kupon nem érvényes.');return;}setCouponCode(payload.code??code);setCouponDiscount(payload.discount??0);setCouponMessage(`Kupon érvényesítve: −${formatHuf(payload.discount??0)}`);track('select_promotion',{promotion_id:payload.code??code,value:payload.discount??0,currency:'HUF'});}catch{setCouponMessage('A kupon ellenőrzése most nem sikerült.');}finally{setCouponLoading(false);}
  }

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); if(submitting.current)return; if(!legalAccepted){setState('error');setError('A rendelés leadásához el kell fogadnod az ÁSZF-et és tudomásul kell venned az adatkezelési tájékoztatót.');return;}
    submitting.current=true; setState('sending'); setError(''); track('begin_checkout',{value:total,currency:'HUF',items:cart.items.length});
    try{
      const formData=new FormData(event.currentTarget); const checkout=Object.fromEntries(formData.entries()); checkout.sameAddress=sameAddress?'true':'false'; checkout.legalAccepted='true'; checkout.couponCode=couponCode;
      const response=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json','x-idempotency-key':requestKey.current},body:JSON.stringify({checkout,items:cart.items})}); const payload=await response.json() as OrderApiResponse;
      if(!response.ok||!payload.orderNumber||!payload.status){setState('error');setError(payload.error??'Nem sikerült létrehozni a rendelést.');submitting.current=false;return;}
      const finalTotal=payload.total??total; track('purchase',{transaction_id:payload.orderNumber,value:finalTotal,currency:'HUF',shipping:deliveryFee,coupon:couponCode||''});
      clear(); const query=new URLSearchParams({order:payload.orderNumber,status:payload.status,total:String(finalTotal)}); router.replace(`/rendeles-sikeres?${query.toString()}`);
    }catch{setState('error');setError('A kapcsolat megszakadt. A kosarad megmaradt. Ellenőrizd a rendeléseidet, mielőtt újra megpróbálod.');submitting.current=false;}
  }

  return <div className="checkoutLayout"><form className="checkout-form" onSubmit={submit} aria-busy={state==='sending'}>
    <div className="checkoutHeading"><span className="eyebrow">Biztonságos rendelés</span><h1>Pénztár</h1><p className="muted">Az ár, a készlet és a kedvezmény rendeléskor újra ellenőrződik a szerveren.</p></div>
    <fieldset className="formSection" disabled={state==='sending'}><legend>Kapcsolattartó és vásárlói típus</legend><div className="form-grid"><input name="name" required placeholder="Név / kapcsolattartó" autoComplete="name"/><input name="email" required type="email" placeholder="E-mail" autoComplete="email"/><input name="phone" required placeholder="Telefonszám" autoComplete="tel"/><select name="customerType" value={customerType} onChange={e=>setCustomerType(e.target.value as CustomerType)}><option value="retail">Lakossági</option><option value="company">Céges</option><option value="reseller">Viszonteladó</option></select>{companyRequired&&<input name="companyName" required placeholder="Cégnév" autoComplete="organization"/>}{companyRequired&&<input name="taxNumber" required placeholder="Adószám"/>}</div></fieldset>
    <fieldset className="formSection" disabled={state==='sending'}><legend>Számlázási cím</legend><div className="form-grid"><input name="billingPostcode" required placeholder="Irányítószám" autoComplete="billing postal-code" inputMode="numeric"/><input name="billingCity" required placeholder="Település" autoComplete="billing address-level2"/><input name="billingAddress" required placeholder="Utca, házszám" autoComplete="billing street-address"/></div></fieldset>
    <fieldset className="formSection" disabled={state==='sending'}><legend>Szállítás és fizetés</legend><div className="form-grid"><select name="shippingMethod" value={shippingMethod} onChange={e=>setShippingMethod(e.target.value as ShippingMethod)}>{shippingOptions.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select><select name="paymentMethod" defaultValue={khEnabled?'kh_card':'bank_transfer'}>{khEnabled&&<option value="kh_card">Bankkártya – K&H</option>}<option value="bank_transfer">Banki átutalás</option></select>{shippingMethod==='foxpost'&&<input name="parcelPointId" required placeholder="Foxpost automata azonosító / választás"/>}</div>
      {!khEnabled&&<p className="notice">A K&H bankkártyás fizetés a banki sandbox bekötéséig nem választható. Jelenleg banki átutalással adható le rendelés.</p>}
      {shippingMethod!=='pickup'&&shippingMethod!=='foxpost'&&<><label className="inlineCheck"><input type="checkbox" checked={sameAddress} onChange={e=>setSameAddress(e.target.checked)}/> A szállítási cím megegyezik a számlázási címmel</label>{!sameAddress&&<div className="form-grid"><input name="shippingPostcode" required placeholder="Szállítási irányítószám" inputMode="numeric"/><input name="shippingCity" required placeholder="Szállítási település"/><input name="shippingAddress" required placeholder="Szállítási utca, házszám"/></div>}</>}
      {shippingMethod==='foxpost'&&<p className="helperText">A következő integrációs lépésben ezt hivatalos automata-választó váltja fel.</p>}<textarea name="note" placeholder="Megjegyzés a rendeléshez" rows={4}/>
    </fieldset>
    <fieldset className="formSection" disabled={state==='sending'}><legend>Kupon</legend><div className="form-grid"><input value={couponInput} onChange={e=>{setCouponInput(e.target.value.toUpperCase());if(couponCode){setCouponCode('');setCouponDiscount(0);}}} placeholder="Kuponkód" maxLength={32}/><button className="btn btnGhost" type="button" onClick={applyCoupon} disabled={couponLoading||subtotal<=0}>{couponLoading?'Ellenőrzés…':'Kupon alkalmazása'}</button></div>{couponMessage&&<p className={couponDiscount>0?'helperText':'errorNotice'}>{couponMessage}</p>}<p className="helperText">A kijelzett kedvezmény előzetes; a végleges összeget az adatbázis számolja újra.</p></fieldset>
    <fieldset className="formSection" disabled={state==='sending'}><legend>Nyilatkozatok</legend><label className="inlineCheck"><input type="checkbox" checked={legalAccepted} onChange={e=>setLegalAccepted(e.target.checked)} required/> Elolvastam és elfogadom az <Link href="/aszf" target="_blank">ÁSZF-et</Link>, valamint tudomásul vettem az <Link href="/adatvedelem" target="_blank">adatkezelési tájékoztatót</Link>.</label></fieldset>
    <button className="btn btnPrimary checkoutSubmit" disabled={state==='sending'||cart.items.length===0||!legalAccepted}>{state==='sending'?'Rendelés biztonságos rögzítése…':`Rendelés leadása · ${formatHuf(total)}`}</button>{state==='sending'&&<p className="helperText" role="status">Ne zárd be az oldalt. A rendelést csak egyszer küldjük el.</p>}{state==='error'&&<p className="errorNotice" role="alert">{error}</p>}
  </form><aside className="checkoutSummary card"><span className="eyebrow">Rendelésed</span><h2>Összesítő</h2><div className="summaryItems">{cart.items.map(item=><div className="summaryLine" key={item.productId}><span>{item.name} × {item.quantity}</span><strong>{formatHuf(item.unitPrice*item.quantity)}</strong></div>)}</div><div className="summaryLine"><span>Termékek</span><strong>{formatHuf(subtotal)}</strong></div>{couponDiscount>0&&<div className="summaryLine"><span>Kedvezmény · {couponCode}</span><strong>−{formatHuf(couponDiscount)}</strong></div>}<div className="summaryLine"><span>Szállítás</span><strong>{deliveryFee===0?'Díjmentes':formatHuf(deliveryFee)}</strong></div><div className="summaryTotal"><span>Fizetendő</span><strong>{formatHuf(total)}</strong></div>{discountedSubtotal<freeShippingThreshold&&shippingMethod!=='pickup'&&<p className="shippingProgress">Még {formatHuf(freeShippingThreshold-discountedSubtotal)} a díjmentes szállításhoz.</p>}<div className="trustList"><span>✓ Szerveroldali ár- és kuponvalidáció</span><span>✓ Atomi készletlevonás</span><span>✓ Dupla rendelés elleni kliensvédelem</span><span>✓ Jogi nyilatkozat rögzítve</span></div></aside></div>;
}
