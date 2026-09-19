'use client';

import Link from 'next/link';
import { useEffect,useRef,useState,type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/cart-provider';
import { useAnalytics } from '@/components/analytics/analytics-provider';
import { PickupPointPicker } from '@/components/checkout/pickup-point-picker';
import { formatHuf } from '@/lib/catalog';
import { buildCartCommerceGroups } from '@/lib/cart/types';
import { isValidHuTaxNumber,normalizeHuTaxNumber } from '@/lib/commerce/hu-tax-number';
import type { CustomerType,OrderStatus } from '@/lib/orders/types';
import type { ShippingOption,PaymentOption } from '@/lib/commerce/settings';
import styles from './checkout-guided.module.css';

type FulfillmentMode='physical'|'digital'|'mixed';
type OrderApiResponse={error?:string;orderNumber?:string;confirmationToken?:string;status?:OrderStatus;total?:number;paymentRedirectUrl?:string;fulfillmentMode?:FulfillmentMode;requiresShipping?:boolean};
type QuoteLine={variantId:string;productId:string;sku:string;name:string;variantLabel?:string|null;quantity:number;unitGrossHuf:number;lineGrossHuf:number;availableQuantity:number;minimumQuantity?:number;orderMultiple?:number;channel?:'b2c'|'b2b'};
type Quote={items:QuoteLine[];subtotal_gross_huf:number;discount_gross_huf:number;shipping_gross_huf:number;total_gross_huf:number;coupon_code?:string|null;fulfillment_mode:FulfillmentMode;requires_shipping:boolean;physical_lines:number;digital_lines:number};
type CheckoutStep='shipping'|'payment'|'summary';
const STEP_INDEX:Record<CheckoutStep,number>={shipping:0,payment:1,summary:2};

function key(){return typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`}
function shippingMeta(kind:string){if(kind==='parcel_point')return{icon:'▦',title:'Csomagpont / automata',description:'Válassz számodra kényelmes átvételi pontot.'};if(kind==='home_delivery')return{icon:'⌂',title:'Házhozszállítás',description:'A futár a megadott szállítási címre kézbesít.'};return{icon:'✓',title:'Személyes átvétel',description:'Vedd át rendelésed a megadott átvételi helyen.'}}
function paymentMeta(flow:string){if(flow==='online_redirect')return{icon:'▣',description:'Biztonságos online fizetés a szolgáltató felületén.'};if(flow==='bank_transfer')return{icon:'↗',description:'Az utalási adatokat a rendelés után kapod meg.'};return{icon:'○',description:'Fizetés az átvételhez kapcsolódó módon.'}}

function CheckoutAccordionStep({step,number,title,summary,active,completed,locked,onOpen,children}:{step:CheckoutStep;number:number;title:string;summary:string;active:boolean;completed:boolean;locked:boolean;onOpen:()=>void;children:ReactNode}){
  const panelId=`checkout-step-${step}`;
  const state=active?'active':completed?'completed':'idle';
  return <section className={styles.step} data-checkout-step={step} data-state={state}>
    <button type="button" className={styles.stepHeader} aria-expanded={active} aria-controls={panelId} disabled={locked} onClick={onOpen}>
      <span className={styles.stepNumber}>{completed&&!active?'✓':number}</span>
      <span className={styles.stepTitle}><strong>{title}</strong><small>{summary}</small></span>
      <span className={styles.stepState}>{active?'Nyitva':completed?'Kész':locked?'Következő':'Szerkesztés'}</span>
    </button>
    <div id={panelId} data-checkout-panel={step} className={styles.stepPanel} hidden={!active}><div className={styles.stepPanelInner}>{children}</div></div>
  </section>;
}

export function CheckoutForm({shippingOptions,paymentOptions,freeShippingThreshold,resellerApproved,embedded=false,acceptancePreview=false}:{shippingOptions:ShippingOption[];paymentOptions:PaymentOption[];freeShippingThreshold:number;resellerApproved:boolean;embedded?:boolean;acceptancePreview?:boolean}){
  const{cart,clear,couponCode,setCouponCode}=useCart(),router=useRouter(),{track}=useAnalytics(),submitting=useRef(false),requestKey=useRef(key()),formRef=useRef<HTMLFormElement|null>(null);
  const[state,setState]=useState<'idle'|'sending'|'error'>('idle'),[error,setError]=useState(''),[customerType,setCustomerType]=useState<CustomerType>(resellerApproved?'reseller':'retail'),[shippingCode,setShippingCode]=useState(shippingOptions[0]?.code??''),[paymentCode,setPaymentCode]=useState(paymentOptions[0]?.code??''),[parcelPointId,setParcelPointId]=useState(''),[pickupInvalid,setPickupInvalid]=useState(false),[sameAddress,setSameAddress]=useState(true),[legalAccepted,setLegalAccepted]=useState(false),[couponInput,setCouponInput]=useState(''),[couponMessage,setCouponMessage]=useState(''),[quote,setQuote]=useState<Quote|null>(null),[quoteLoading,setQuoteLoading]=useState(false),[quoteError,setQuoteError]=useState(''),[activeStep,setActiveStep]=useState<CheckoutStep>('shipping'),[furthestStep,setFurthestStep]=useState(0);
  const shipping=shippingOptions.find(o=>o.code===shippingCode)??shippingOptions[0];
  const requiresShipping=quote?.requires_shipping!==false;
  const containsDigital=(quote?.digital_lines??0)>0;
  const availablePayments=containsDigital?paymentOptions.filter(option=>option.flow!=='cash_on_delivery'):paymentOptions;
  const payment=availablePayments.find(o=>o.code===paymentCode)??availablePayments[0];
  const quoteByVariant=new Map<string,number>();for(const item of cart.items)if(item.variantId)quoteByVariant.set(item.variantId,(quoteByVariant.get(item.variantId)??0)+item.quantity);
  const quoteItems=[...quoteByVariant].map(([variantId,quantity])=>({variantId,quantity}));
  const commerceGroups=buildCartCommerceGroups(cart);
  const missingVariant=cart.items.some(i=>!i.variantId);
  const effectiveCustomerType:CustomerType=resellerApproved?'reseller':customerType;

  async function refreshQuote(code=couponCode){
    if(!quoteItems.length||missingVariant){setQuote(null);setQuoteError(missingVariant?'A kosár egy régi, termékváltozat nélküli tételt tartalmaz. Töröld és tedd újra kosárba a terméket.':'');return null}
    setQuoteLoading(true);setQuoteError('');
    try{
      const r=await fetch('/api/checkout/quote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({shippingProvider:shipping?.code||undefined,couponCode:code||undefined,items:quoteItems})});
      const p=await r.json() as ({ok?:boolean;error?:string}&Partial<Quote>);
      if(!r.ok||!p.ok){setQuote(null);setQuoteError(p.error??'A kosár ellenőrzése nem sikerült.');return null}
      const q=p as Quote;setQuote(q);return q;
    }catch{setQuote(null);setQuoteError('A kosár ellenőrzése nem sikerült.');return null}
    finally{setQuoteLoading(false)}
  }

  useEffect(()=>{const t=setTimeout(()=>{void refreshQuote()},180);return()=>clearTimeout(t)},[shippingCode,couponCode,JSON.stringify(quoteItems)]);
  useEffect(()=>{if(couponCode&&!couponInput)setCouponInput(couponCode)},[couponCode,couponInput]);
  useEffect(()=>{if(quote?.digital_lines&&paymentOptions.find(option=>option.code===paymentCode)?.flow==='cash_on_delivery'){const fallback=paymentOptions.find(option=>option.flow!=='cash_on_delivery');if(fallback)setPaymentCode(fallback.code)}},[quote?.digital_lines,paymentCode,paymentOptions]);

  function validatePanel(step:CheckoutStep){
    const panel=formRef.current?.querySelector<HTMLElement>(`[data-checkout-panel="${step}"]`);
    if(!panel)return false;
    const controls=Array.from(panel.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea'));
    for(const control of controls){
      if(control.disabled||control.type==='hidden')continue;
      if(!control.checkValidity()){control.reportValidity();return false}
    }
    return true;
  }
  function validateTaxNumber(){
    if(effectiveCustomerType==='retail')return true;
    const input=formRef.current?.elements.namedItem('taxNumber');
    if(!(input instanceof HTMLInputElement))return false;
    const normalized=normalizeHuTaxNumber(input.value);input.value=normalized;
    if(isValidHuTaxNumber(normalized))return true;
    setState('error');setError('Az adószám formátuma vagy ellenőrzőszáma hibás. Formátum: 12345676-1-12.');input.focus();return false;
  }
  function openStep(step:CheckoutStep){if(STEP_INDEX[step]<=furthestStep)setActiveStep(step)}
  function continueFromShipping(){
    setState('idle');setError('');
    if(requiresShipping&&!shipping){setState('error');setError('A kosár fizikai terméket tartalmaz, de nincs választható szállítási mód.');return}
    if(requiresShipping&&shipping?.kind==='parcel_point'&&!parcelPointId){setPickupInvalid(true);setState('error');setError('Válassz átvételi pontot a folytatás előtt.');return}
    if(!validatePanel('shipping')||!validateTaxNumber())return;
    setFurthestStep(current=>Math.max(current,1));setActiveStep('payment');
  }
  function continueFromPayment(){
    setState('idle');setError('');
    if(!payment){setState('error');setError('Ehhez a kosárhoz nincs választható fizetési mód.');return}
    if(!validatePanel('payment'))return;
    setFurthestStep(current=>Math.max(current,2));setActiveStep('summary');
  }

  async function applyCoupon(){
    const code=couponInput.trim().toUpperCase();setCouponMessage('');
    if(!code){setCouponCode('');return}
    const q=await refreshQuote(code);
    if(!q){setCouponCode('');setCouponMessage('A kupon nem alkalmazható.');return}
    setCouponCode(q.coupon_code??code);setCouponMessage(`Kupon érvényesítve: −${formatHuf(q.discount_gross_huf)}`);track('select_promotion',{promotion_id:q.coupon_code??code,value:q.discount_gross_huf,currency:'HUF'});
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    if(acceptancePreview){setState('error');setError('Acceptance módban a rendelés tényleges leadása tiltva van. A teljes folyamat az összesítésig biztonságosan tesztelhető.');return}
    if(submitting.current||!payment)return;
    if(requiresShipping&&!shipping){setActiveStep('shipping');setState('error');setError('A kosár fizikai terméket tartalmaz, ezért szállítási mód szükséges.');return}
    if(requiresShipping&&shipping?.kind==='parcel_point'&&!parcelPointId){setActiveStep('shipping');setPickupInvalid(true);setState('error');setError('Válassz átvételi pontot a rendelés leadása előtt.');return}
    if(!legalAccepted){setActiveStep('summary');setState('error');setError('A rendelés leadásához el kell fogadnod az ÁSZF-et és tudomásul kell venned az adatkezelési tájékoztatót.');return}

    const verified=await refreshQuote();
    if(!verified){setActiveStep('summary');setState('error');setError('A rendelés leadása előtt a kosár ellenőrzése szükséges.');return}
    if(verified.digital_lines>0&&payment.flow==='cash_on_delivery'){setActiveStep('payment');setState('error');setError('Digitális tartalmat tartalmazó rendeléshez utánvét nem választható.');return}

    const f=new FormData(form),checkout=Object.fromEntries(f.entries());
    checkout.customerType=effectiveCustomerType;
    if(effectiveCustomerType!=='retail'){
      const normalizedTax=normalizeHuTaxNumber(String(checkout.taxNumber??''));
      if(!isValidHuTaxNumber(normalizedTax)){setActiveStep('shipping');setState('error');setError('Az adószám formátuma vagy ellenőrzőszáma hibás. Formátum: 12345676-1-12.');return}
      checkout.taxNumber=normalizedTax;
    }

    submitting.current=true;setState('sending');setError('');track('begin_checkout',{value:verified.total_gross_huf,currency:'HUF',items:verified.items.length,fulfillment_mode:verified.fulfillment_mode});
    try{
      checkout.sameAddress=sameAddress?'true':'false';checkout.legalAccepted='true';checkout.couponCode=couponCode;checkout.paymentProvider=payment.code;
      if(verified.requires_shipping&&shipping){checkout.shippingProvider=shipping.code;checkout.shippingKind=shipping.kind;checkout.parcelPointId=shipping.kind==='parcel_point'?parcelPointId:''}else{delete checkout.shippingProvider;delete checkout.shippingKind;checkout.parcelPointId=''}
      const items=quoteItems.map(i=>({productId:i.variantId,quantity:i.quantity}));
      const r=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json','x-idempotency-key':requestKey.current},body:JSON.stringify({checkout,items,commerceGroups})}),p=await r.json()as OrderApiResponse;
      if(!r.ok||!p.orderNumber||!p.status||!p.confirmationToken){setState('error');setError(p.error??'Nem sikerült létrehozni a rendelést.');submitting.current=false;return}
      clear();track('order_submitted',{transaction_id:p.orderNumber,value:p.total??verified.total_gross_huf,currency:'HUF',shipping:verified.shipping_gross_huf,coupon:couponCode||'',payment_provider:payment.code,shipping_provider:verified.requires_shipping?shipping?.code??'':'digital_delivery',fulfillment_mode:p.fulfillmentMode??verified.fulfillment_mode});
      if(p.paymentRedirectUrl){window.location.assign(p.paymentRedirectUrl);return}
      router.replace(`/rendeles-sikeres?token=${encodeURIComponent(p.confirmationToken)}`);
    }catch{setState('error');setError('A kapcsolat megszakadt. A kosarad megmaradt. Ellenőrizd a rendeléseidet, mielőtt újra megpróbálod.');submitting.current=false}
  }

  if(!paymentOptions.length)return <div className="card"><h2>A pénztár még nincs aktiválva</h2><p className="muted">A webshop üzemeltetőjének legalább egy fizetési módot kell beállítania. Fizikai termékhez aktív szállítási mód is szükséges.</p></div>;
  const subtotal=quote?.subtotal_gross_huf??0,discount=quote?.discount_gross_huf??0,deliveryFee=quote?.shipping_gross_huf??0,total=quote?.total_gross_huf??0;
  const shippingSummary=quote?.requires_shipping===false?'Digitális kézbesítés · nincs szállítási díj':shipping?`${shipping.label} · kapcsolattartó és cím`:'Válassz szállítási módot';
  const paymentSummary=payment?payment.label:'Válassz fizetési módot';
  const firstStepTitle=quote?.requires_shipping===false?'Adatok és kézbesítés':'Szállítás';

  return <div className={`${styles.root} checkoutLayout`} data-storefront-design-inheritance="current-theme" data-checkout-ux="guided-accordion" data-fulfillment-mode={quote?.fulfillment_mode??'unknown'} data-checkout-embedded={embedded?'true':'false'} data-checkout-acceptance={acceptancePreview?'preview':'live'}>
    <form ref={formRef} className="checkout-form" onSubmit={submit} aria-busy={state==='sending'||quoteLoading}>
      {!embedded?<div className="checkoutHeading"><span className="eyebrow">Biztonságos rendelés</span><h1>Pénztár</h1><p className="muted">A végösszeget, készletet és teljesítési módot a rendelés előtt szerveroldalon újra ellenőrizzük. Kézbesítés → Fizetés → Összesítés; egyszerre csak az aktuális lépés van nyitva.</p></div>:null}
      {acceptancePreview?<div className="partnerCheckoutBadge" role="status"><strong>Acceptance tesztmód</strong><span>A rendelés tényleges elküldése tiltva van; a szállítási, fizetési, kupon- és összesítési folyamat tesztelhető.</span></div>:null}
      {quote?.fulfillment_mode==='digital'&&<div className="partnerCheckoutBadge" role="status"><strong>Digitális kézbesítés</strong><span>Ehhez a kosárhoz nem kell fizikai szállítást választanod. Fizetés után a jogosult tartalmak a Dokumentumok és letöltések felületen érhetők el.</span></div>}
      {quote?.fulfillment_mode==='mixed'&&<div className="partnerCheckoutBadge" role="status"><strong>Vegyes rendelés</strong><span>A fizikai tételeket a választott módon szállítjuk; a digitális tartalmak a fizetés igazolása után külön hozzáférést kapnak.</span></div>}
      {commerceGroups.length?<div className="partnerCheckoutBadge" role="status"><strong>{commerceGroups.length} összeállítás megőrzése</strong><span>A csoportos kosártételek a rendelésben is együtt maradnak, miközben az ár és a készlet a véglegesítés előtt újra ellenőrzésre kerül.</span></div>:null}
      {resellerApproved&&<div className="partnerCheckoutBadge" role="status"><strong>B2B partner mód aktív</strong><span>A partnerár, a B2B minimum rendelés és a rendelési egység automatikusan érvényes.</span></div>}
      <div className={styles.accordion}>
        <CheckoutAccordionStep step="shipping" number={2} title={firstStepTitle} summary={shippingSummary} active={activeStep==='shipping'} completed={furthestStep>0} locked={false} onOpen={()=>openStep('shipping')}>
          <fieldset className="formSection" disabled={state==='sending'}><legend>Kapcsolattartó és vásárlói típus</legend><div className="form-grid">
            <label className="checkoutField"><span>Név / kapcsolattartó</span><input name="name" required autoComplete="name" placeholder="Név / kapcsolattartó"/></label>
            <label className="checkoutField"><span>E-mail</span><input name="email" required type="email" autoComplete="email" placeholder="E-mail"/></label>
            <label className="checkoutField"><span>Telefonszám</span><input name="phone" required autoComplete="tel" placeholder="Telefonszám"/></label>
            {resellerApproved?<input type="hidden" name="customerType" value="reseller"/>:<label className="checkoutField"><span>Vásárlói típus</span><select name="customerType" value={customerType} onChange={e=>setCustomerType(e.target.value as CustomerType)}><option value="retail">Lakossági</option><option value="company">Céges</option></select></label>}
            {effectiveCustomerType!=='retail'&&<label className="checkoutField"><span>Számlázási cégnév</span><input name="companyName" required autoComplete="organization" placeholder="Cégnév"/></label>}
            {effectiveCustomerType!=='retail'&&<label className="checkoutField"><span>Magyar adószám</span><input name="taxNumber" required inputMode="numeric" placeholder="12345676-1-12" onBlur={e=>{e.currentTarget.value=normalizeHuTaxNumber(e.currentTarget.value)}}/><small>8 számjegy + áfakód + területi kód.</small></label>}
          </div></fieldset>
          <fieldset className="formSection" disabled={state==='sending'}><legend>Számlázási cím</legend><div className="form-grid">
            <label className="checkoutField"><span>Számlázási irányítószám</span><input name="billingPostcode" required autoComplete="postal-code" placeholder="Irányítószám"/></label>
            <label className="checkoutField"><span>Számlázási település</span><input name="billingCity" required autoComplete="address-level2" placeholder="Település"/></label>
            <label className="checkoutField"><span>Számlázási utca, házszám</span><input name="billingAddress" required autoComplete="street-address" placeholder="Utca, házszám"/></label>
          </div></fieldset>
          {requiresShipping?<fieldset className="formSection" disabled={state==='sending'}><legend>Szállítási mód</legend><div className="choiceCards" data-addon-insertion-point="checkout.shipping.methods">{shippingOptions.map(o=>{const meta=shippingMeta(o.kind),active=o.code===shippingCode,fee=active&&quote?quote.shipping_gross_huf:o.fee;return <label key={o.code} className={active?'choiceCard active':'choiceCard'}><input type="radio" name="shippingProvider" value={o.code} checked={active} onChange={()=>{setShippingCode(o.code);setParcelPointId('');setPickupInvalid(false)}}/><span className="choiceIcon">{meta.icon}</span><span className="choiceBody"><strong>{o.label}</strong><small>{meta.title}</small><em>{meta.description}</em></span><b>{fee===0?'Díjmentes':formatHuf(fee)}</b></label>})}</div>
            {shipping?.kind==='parcel_point'&&(shipping.externalLogistics?<label className="checkoutField"><span>Átvételi pont / automata</span><input value={parcelPointId} onChange={e=>{setParcelPointId(e.target.value.slice(0,160));if(e.target.value)setPickupInvalid(false)}} placeholder="Írd be a választott automata vagy átvételi pont nevét / címét" required aria-invalid={pickupInvalid}/></label>:<PickupPointPicker key={shipping.code} provider={shipping.code} label={shipping.label} selectedId={parcelPointId} invalid={pickupInvalid} onChange={id=>{setParcelPointId(id);if(id)setPickupInvalid(false)}}/>)}
            {shipping?.kind==='home_delivery'&&<><label className="inlineCheck"><input type="checkbox" checked={sameAddress} onChange={e=>setSameAddress(e.target.checked)}/> A szállítási cím megegyezik a számlázási címmel</label>{!sameAddress&&<div className="form-grid"><label className="checkoutField"><span>Szállítási irányítószám</span><input name="shippingPostcode" required placeholder="Szállítási irányítószám"/></label><label className="checkoutField"><span>Szállítási település</span><input name="shippingCity" required placeholder="Szállítási település"/></label><label className="checkoutField"><span>Szállítási utca, házszám</span><input name="shippingAddress" required placeholder="Szállítási utca, házszám"/></label></div>}</>}
          </fieldset>:<section className="formSection" aria-label="Digitális kézbesítés"><h3>Digitális kézbesítés</h3><p className="muted">Nincs fizikai szállítás vagy csomagpont. A hozzáférés a fizetés igazolása után a fiók Dokumentumok és letöltések felületén, vendég vásárlásnál pedig biztonságos hozzáférési linken jelenik meg.</p></section>}
          <div className={styles.stepActions}><button className="btn btnPrimary" type="button" onClick={continueFromShipping}>Tovább a fizetéshez</button></div>
        </CheckoutAccordionStep>

        <CheckoutAccordionStep step="payment" number={3} title="Fizetés" summary={paymentSummary} active={activeStep==='payment'} completed={furthestStep>1} locked={furthestStep<1} onOpen={()=>openStep('payment')}>
          <fieldset className="formSection" disabled={state==='sending'}><legend>Fizetési mód</legend><div className="choiceCards paymentChoices" data-addon-insertion-point="checkout.payment.methods">{availablePayments.map(o=>{const meta=paymentMeta(o.flow),active=o.code===payment?.code;return <label key={o.code} className={active?'choiceCard active':'choiceCard'}><input type="radio" name="paymentProvider" value={o.code} checked={active} onChange={()=>setPaymentCode(o.code)}/><span className="choiceIcon">{meta.icon}</span><span className="choiceBody"><strong>{o.label}</strong><em>{meta.description}</em></span><span className="choiceCheck">{active?'✓':''}</span></label>})}</div>{containsDigital&&paymentOptions.some(o=>o.flow==='cash_on_delivery')&&<p className="muted">Digitális tartalmat tartalmazó kosárnál az utánvét nem elérhető, mert a letöltési jogosultság csak igazolt fizetésből oldható fel.</p>}</fieldset>
          <div className={styles.stepActions}><button className="btn btnGhost" type="button" onClick={()=>setActiveStep('shipping')}>Vissza</button><button className="btn btnPrimary" type="button" onClick={continueFromPayment}>Tovább az összesítéshez</button></div>
        </CheckoutAccordionStep>

        <CheckoutAccordionStep step="summary" number={4} title="Összesítés" summary={quote?`Fizetendő: ${formatHuf(total)}`:'Végső ellenőrzés'} active={activeStep==='summary'} completed={false} locked={furthestStep<2} onOpen={()=>openStep('summary')}>
          <div className={styles.summaryPreview}><span>Kézbesítés <strong>{requiresShipping?shipping?.label??'—':'Digitális kézbesítés'}</strong></span><span>Fizetés <strong>{payment?.label??'—'}</strong></span><span>Végösszeg <strong>{quote?formatHuf(total):'Ellenőrzés alatt'}</strong></span></div>
          <fieldset className="formSection" disabled={state==='sending'}><legend>Kupon és megjegyzés</legend><div className="form-grid"><label className="checkoutField"><span>Kuponkód</span><input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="Kuponkód"/></label><button className="btn btnGhost" type="button" onClick={applyCoupon} disabled={quoteLoading||!quoteItems.length}>{quoteLoading?'Ellenőrzés…':'Kupon alkalmazása'}</button></div>{couponMessage&&<p className="helperText" role="status">{couponMessage}</p>}<label className="checkoutField"><span>Megjegyzés a rendeléshez</span><textarea name="note" placeholder="Megjegyzés a rendeléshez" rows={4}/></label></fieldset>
          <fieldset className="formSection" disabled={state==='sending'}><legend>Nyilatkozatok</legend><label className="inlineCheck"><input type="checkbox" checked={legalAccepted} onChange={e=>setLegalAccepted(e.target.checked)} required/> Elolvastam és elfogadom az <Link href="/aszf" target="_blank">ÁSZF-et</Link>, valamint tudomásul vettem az <Link href="/adatvedelem" target="_blank">adatkezelési tájékoztatót</Link>.</label></fieldset>
          <div className={styles.stepActions}><button className="btn btnGhost" type="button" onClick={()=>setActiveStep('payment')}>Vissza</button><button className="btn btnPrimary checkoutSubmit" type={acceptancePreview?'button':'submit'} disabled={acceptancePreview||state==='sending'||quoteLoading||!quote||!legalAccepted||!payment}>{acceptancePreview?'Acceptance · rendelés leadása tiltva':state==='sending'?'Rendelés előkészítése…':quoteLoading?'Kosár ellenőrzése…':`Rendelés leadása · ${formatHuf(total)}`}</button></div>
        </CheckoutAccordionStep>
      </div>
      {(state==='error'||quoteError)&&<p className="errorNotice" role="alert">{error||quoteError}</p>}
    </form>
    <aside className="checkoutSummary card"><span className="eyebrow">Rendelésed</span><h2>Ellenőrzött összesítő</h2>{resellerApproved&&<div className="partnerSummaryBadge">B2B partnerár és rendelési szabályok</div>}{quote?.items.map(i=><div className="summaryLine" key={i.variantId}><span>{i.name}{i.variantLabel?` · ${i.variantLabel}`:''} × {i.quantity}{i.channel==='b2b'&&i.orderMultiple&&i.orderMultiple>1?` · egység: ${i.orderMultiple} db`:''}</span><strong>{formatHuf(i.lineGrossHuf)}</strong></div>)}{!quote&&<p className="muted">{quoteLoading?'A kosár ellenőrzése folyamatban…':'A kosár ellenőrzésre vár.'}</p>}<div className="summaryLine"><span>Termékek</span><strong>{formatHuf(subtotal)}</strong></div>{discount>0&&<div className="summaryLine"><span>Kedvezmény · {couponCode}</span><strong>−{formatHuf(discount)}</strong></div>}<div className="summaryLine"><span>Kézbesítés</span><strong>{requiresShipping?(deliveryFee===0?'Díjmentes':formatHuf(deliveryFee)):'Digitális · díjmentes'}</strong></div><div className="summaryTotal"><span>Fizetendő</span><strong>{formatHuf(total)}</strong></div>{requiresShipping&&freeShippingThreshold>0&&subtotal-discount<freeShippingThreshold&&shipping?.kind!=='pickup'&&<p className="shippingProgress">Még {formatHuf(freeShippingThreshold-(subtotal-discount))} a díjmentes szállításhoz.</p>}<div className="trustList"><span>✓ Ellenőrzött ár</span><span>✓ Ellenőrzött készlet</span><span>✓ Szerveroldali teljesítési és jogosultsági ellenőrzés</span></div></aside>
  </div>;
}
