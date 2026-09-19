'use client';

import Link from 'next/link';
import { useEffect,useState } from 'react';
import { useCart } from './cart-provider';
import { formatHuf } from '@/lib/catalog';
import { freeShippingApplies } from '@/lib/commerce/pricing';
import { cartLineKey,normalizeQuantity } from '@/lib/commerce/cart-engine';

type CartViewProps={freeShippingThreshold:number;products:Array<{id:string;name:string;slug:string;grossPrice:number;minimumQuantity:number;orderMultiple:number;fulfillmentType?:'physical'|'digital'}>};
type CartQuote={ok?:boolean;error?:string;subtotal_gross_huf:number;discount_gross_huf:number;total_gross_huf:number;coupon_code?:string|null};

function CartTrashIcon(){
  return <svg data-cart-icon="trash" aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style={{display:'block',flex:'0 0 auto'}}><path d="M7 2h6l1 2h3v2H3V4h3l1-2Zm-2 5h10l-.78 10.12A2 2 0 0 1 12.23 19H7.77a2 2 0 0 1-1.99-1.88L5 7Zm3 2v6h1.5V9H8Zm2.5 0v6H12V9h-1.5Z"/></svg>;
}
function CartChevronIcon({direction}:{direction:'up'|'down'}){
  return <svg data-cart-icon={`chevron-${direction}`} aria-hidden="true" viewBox="0 0 14 8" width="14" height="8" fill="currentColor" style={{display:'block',flex:'0 0 auto'}}><path d={direction==='up'?'M7 1 13 7H1L7 1Z':'M1 1h12L7 7 1 1Z'}/></svg>;
}


export function CartView({freeShippingThreshold,products}:CartViewProps){
  const{items,total,setQuantity,remove,replace,removeCommerceGroup,couponCode,setCouponCode}=useCart();
  const[couponInput,setCouponInput]=useState(''),[couponQuote,setCouponQuote]=useState<CartQuote|null>(null),[couponLoading,setCouponLoading]=useState(false),[couponMessage,setCouponMessage]=useState('');
  const productById=new Map(products.map(product=>[product.id,product]));
  useEffect(()=>{
    if(!items.length)return;
    const byId=new Map(products.map(product=>[product.id,product]));
    let changed=false;
    const next=items.map(item=>{
      const current=byId.get(item.variantId??item.productId);
      if(!current)return item;
      const quantity=normalizeQuantity(item.quantity,undefined,current.minimumQuantity,current.orderMultiple);
      if(item.minimumQuantity!==current.minimumQuantity||item.orderMultiple!==current.orderMultiple||item.unitPrice!==current.grossPrice||item.name!==current.name||item.slug!==current.slug||item.quantity!==quantity)changed=true;
      return{...item,name:current.name,slug:current.slug,unitPrice:current.grossPrice,minimumQuantity:current.minimumQuantity,orderMultiple:current.orderMultiple,quantity};
    });
    if(changed)replace(next);
  },[items,products,replace]);

  const quoteByVariant=new Map<string,number>();for(const item of items)if(item.variantId)quoteByVariant.set(item.variantId,(quoteByVariant.get(item.variantId)??0)+item.quantity);
  const quoteItems=[...quoteByVariant].map(([variantId,quantity])=>({variantId,quantity}));
  const missingVariant=items.some(item=>!item.variantId);
  const quoteKey=JSON.stringify(quoteItems);

  async function quoteCart(code:string){
    if(!quoteItems.length||missingVariant)return null;
    setCouponLoading(true);
    try{
      const response=await fetch('/api/checkout/quote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'cart',couponCode:code||undefined,items:quoteItems})});
      const payload=await response.json() as CartQuote;
      if(!response.ok||!payload.ok)throw new Error(payload.error??'A kupon ellenőrzése nem sikerült.');
      setCouponQuote(payload);
      return payload;
    }catch(error){
      setCouponQuote(null);
      setCouponMessage(error instanceof Error?error.message:'A kupon ellenőrzése nem sikerült.');
      return null;
    }finally{setCouponLoading(false)}
  }

  useEffect(()=>{if(couponCode&&!couponInput)setCouponInput(couponCode)},[couponCode,couponInput]);
  useEffect(()=>{
    if(!couponCode){setCouponQuote(null);return}
    const timeout=setTimeout(()=>{void quoteCart(couponCode)},180);
    return()=>clearTimeout(timeout);
  },[couponCode,quoteKey]);

  async function applyCoupon(){
    const code=couponInput.trim().toUpperCase();
    setCouponMessage('');
    if(!code){setCouponCode('');setCouponQuote(null);return}
    const quote=await quoteCart(code);
    if(!quote){setCouponCode('');return}
    const applied=(quote.coupon_code??code).trim().toUpperCase();
    setCouponInput(applied);setCouponCode(applied);
    setCouponMessage(`Kupon érvényesítve: −${formatHuf(quote.discount_gross_huf)}`);
  }
  function clearCoupon(){setCouponInput('');setCouponCode('');setCouponQuote(null);setCouponMessage('');}

  if(!items.length)return <div className="emptyCart card"><span className="eyebrow">A kosár üres</span><h2>Még nincs termék a kosaradban.</h2><p className="muted">Válassz terméket, a kosár pedig ezen az eszközön megmarad, amíg be nem fejezed a vásárlást.</p><Link className="btn btnPrimary" href="/webaruhaz">Irány a webáruház</Link></div>;
  const subtotal=couponQuote?.subtotal_gross_huf??total,discount=couponQuote?.discount_gross_huf??0,discountedSubtotal=couponQuote?.total_gross_huf??total;
  const hasFreeShippingThreshold=freeShippingThreshold>0,freeShippingReached=freeShippingApplies(discountedSubtotal,freeShippingThreshold),remaining=hasFreeShippingThreshold?Math.max(0,freeShippingThreshold-discountedSubtotal):0;
  const renderedGroups=new Set<string>();
  return <div className="cartGrid"><section className="card cartItemsCard"><div className="cartHeader"><div><span className="eyebrow">Kosár</span><h2>{items.length} tétel</h2></div><span className="badge">Helyben mentve</span></div>
    {items.map(item=>{const minimum=item.minimumQuantity??1,multiple=item.orderMultiple??1,group=item.commerceGroup,groupKey=group?`${group.type}:${group.id}`:'',firstGrouped=Boolean(group&&!renderedGroups.has(groupKey)),fulfillment=productById.get(item.variantId??item.productId)?.fulfillmentType??'physical';if(firstGrouped&&group)renderedGroups.add(groupKey);const canDecrease=item.quantity>minimum;return <div key={cartLineKey(item)}>
      {firstGrouped&&group?<div className="partnerCheckoutBadge" style={{marginTop:12}}><strong>{group.type==='composition'?'Összeállított csomag':'Konfigurált összeállítás'}</strong><span>{group.definitionKey} · a csoport tételeit a rendelés együtt őrzi meg.</span><button className="btn btnGhost" type="button" onClick={()=>removeCommerceGroup(group.type,group.id)}>Teljes összeállítás törlése</button></div>:null}
      <div className="cartRow"><div className="cartProductIdentity"><div className="cartThumb">{item.name.trim().slice(0,2).toUpperCase()||'•'}</div><div><strong>{item.name}</strong><p>{formatHuf(item.unitPrice)} / db</p>{group?<small className="cartRuleText">{group.slotId?`Pozíció: ${group.slotId} · `:''}csoportos tétel</small>:<small className="cartRuleText">Minimum {minimum} db · rendelési egység {multiple} db</small>}<small className="cartRuleText" data-line-fulfillment={fulfillment}>{fulfillment==='digital'?'Digitális kézbesítés · nincs fizikai szállítás':'Fizikai kézbesítés'}</small></div></div>{group?<div className="cartQuantityStepper" aria-label="Csoportos tétel"><span className="badge">{item.quantity} db</span></div>:<div className="cartQuantityStepper" data-cart-quantity-layout="vertical-arrows" role="group" aria-label={`${item.name} mennyiségének módosítása`} style={{display:'flex',alignItems:'center',gap:8}}><output aria-live="polite" style={{minWidth:42,fontWeight:800}}>{item.quantity} db</output><span data-cart-stepper="vertical" style={{display:'grid',gap:3,alignContent:'center'}}><button data-cart-step="increase" type="button" aria-label="Mennyiség növelése" onClick={()=>setQuantity(item.productId,item.quantity+multiple,item.variantId,item.lineId)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:28,height:16,minWidth:28,minHeight:16,padding:0,margin:0,border:'1px solid var(--line)',borderRadius:5,background:'#fbfcfa',color:'var(--ink)',lineHeight:0}}><CartChevronIcon direction="up"/></button><button data-cart-step="decrease" type="button" aria-label="Mennyiség csökkentése" aria-disabled={!canDecrease} disabled={!canDecrease} onClick={()=>setQuantity(item.productId,item.quantity-multiple,item.variantId,item.lineId)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:28,height:16,minWidth:28,minHeight:16,padding:0,margin:0,border:'1px solid var(--line)',borderRadius:5,background:'#fbfcfa',color:'var(--ink)',lineHeight:0,opacity:canDecrease?1:.55}}><CartChevronIcon direction="down"/></button></span><button data-cart-remove-control="true" type="button" aria-label="Tétel törlése" title="Törlés" onClick={()=>remove(item.productId,item.variantId,item.lineId)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,minWidth:32,minHeight:32,padding:0,margin:0,border:'1px solid #ef5454',borderRadius:8,background:'#cf3038',color:'#fff',lineHeight:0}}><CartTrashIcon/></button></div>}<div className="cartLineTotal"><strong>{formatHuf(item.unitPrice*item.quantity)}</strong></div></div>
    </div>})}
    <Link className="textLink" href="/webaruhaz">← További termék hozzáadása</Link></section>
    <aside className="card cartSummaryCard"><span className="eyebrow">Összesítés</span><h2>Részösszeg</h2><div className="summaryTotal"><span>Termékek</span><strong>{formatHuf(subtotal)}</strong></div>
      <div data-cart-coupon-entry="true" data-cart-coupon-presentation="template-native" style={{display:'grid',gap:8,padding:'12px 0'}}>
        <label htmlFor="cart-coupon-code"><strong>Van kuponkódod?</strong></label>
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:8}}>
          <input data-cart-coupon-input="true" id="cart-coupon-code" value={couponInput} onChange={event=>setCouponInput(event.target.value.toUpperCase().slice(0,32))} placeholder="Kuponkód" autoComplete="off" style={{minWidth:0,minHeight:44,padding:'10px 12px',border:'1px solid var(--line)',borderRadius:12,background:'var(--card)',color:'var(--ink)',outline:'none'}}/>
          <button data-cart-coupon-apply="true" className="btn btnPrimary" type="button" onClick={applyCoupon} disabled={couponLoading||missingVariant} style={{minHeight:44,padding:'0 16px'}}>{couponLoading?'Ellenőrzés…':'Alkalmazás'}</button>
        </div>
        {couponCode?<button className="textLink" type="button" onClick={clearCoupon} style={{justifySelf:'start'}}>Kupon eltávolítása</button>:null}
        {couponMessage?<small role="status">{couponMessage}</small>:null}
        {missingVariant?<small className="muted">A kupon a régi, termékváltozat nélküli tétel újrakosarazása után alkalmazható.</small>:null}
      </div>
      {discount>0?<div className="summaryTotal"><span>Kedvezmény · {couponCode}</span><strong>−{formatHuf(discount)}</strong></div>:null}
      <div className="summaryTotal"><span>Összesen</span><strong>{formatHuf(discountedSubtotal)}</strong></div>
      {hasFreeShippingThreshold?(remaining>0?<p className="shippingProgress">Még {formatHuf(remaining)} a díjmentes szállítási küszöbig.</p>:freeShippingReached?<p className="shippingProgress">Elérted a díjmentes szállítási küszöböt.</p>:null):null}
      <Link className="btn btnPrimary cartCheckoutButton" href="/penztar">Tovább a pénztárhoz</Link>
    </aside></div>;
}
