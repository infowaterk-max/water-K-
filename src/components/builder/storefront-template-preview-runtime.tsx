'use client';

import {useState,type CSSProperties,type MouseEvent,type ReactNode} from 'react';
import {useCart} from '@/components/cart/cart-provider';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import type {StorefrontResolvedComponentNode,StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';

export const STOREFRONT_TEMPLATE_PREVIEW_COMMERCE_RUNTIME_VERSION='shoporation.template-preview-commerce.v1' as const;

type Routes={catalog:string;cart:string;checkout:string;account:string};
const rec=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown,fallback='')=>typeof value==='string'&&value.trim()?value.trim():fallback;
const money=(value:number,currency='HUF')=>new Intl.NumberFormat('hu-HU',{style:'currency',currency,maximumFractionDigits:currency==='HUF'?0:2}).format(value);
const slot=(config:Record<string,unknown>,name:string,viewport:StorefrontViewport):CSSProperties=>{
  const slots=rec(config.styleSlots),entry=rec(slots[name]),base=rec(entry.base),override=rec(entry[viewport]);
  return{...(base as CSSProperties),...(override as CSSProperties)};
};
const gridSpan=(node:StorefrontResolvedComponentNode):CSSProperties=>({gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`});

function PreviewCartSummary({config,node,viewport,routes}:{config:Record<string,unknown>;node:StorefrontResolvedComponentNode;viewport:StorefrontViewport;routes:Routes}){
  const{items,total,setQuantity,remove,hydrated}=useCart();
  const currency=text(config.currency,'HUF');
  const rootStyle:CSSProperties={...gridSpan(node),display:'grid',gap:'1.5rem',maxWidth:'64rem',marginInline:'auto',padding:'clamp(1rem,2.5vw,1.5rem)',...slot(config,'root',viewport)};
  if(!hydrated)return <section data-storefront-commerce="cart-summary" data-storefront-preview-cart="hydrating" style={rootStyle}><p>Kosár betöltése…</p></section>;
  if(!items.length)return <section data-storefront-commerce="cart-summary" data-storefront-preview-cart="empty" style={rootStyle}><h1 style={{margin:0}}>Kosár</h1><p>A kosarad jelenleg üres.</p><a href={routes.catalog} style={{display:'inline-flex',justifySelf:'start',padding:'.8rem 1rem',background:'var(--shoporation-color-primary,#171717)',color:'var(--shoporation-color-primary-contrast,#fff)',textDecoration:'none'}}>Fedezd fel a Vaultot</a></section>;
  return <section data-storefront-commerce="cart-summary" data-storefront-preview-cart="interactive" style={rootStyle}>
    <h1 style={{margin:0,fontFamily:'var(--shoporation-heading-font,serif)',...slot(config,'title',viewport)}}>Kosár</h1>
    <div style={{display:'grid',gap:'1rem',...slot(config,'lines',viewport)}}>{items.map(item=>{
      const minimum=item.minimumQuantity??1,step=item.orderMultiple??1;
      return <div key={item.lineId??`${item.productId}:${item.variantId??''}`} style={{display:'grid',gridTemplateColumns:viewport==='mobile'?'1fr':'1fr auto',gap:'1rem',padding:'1rem .65rem',borderBottom:'1px solid var(--shoporation-color-border,#ddd)',...slot(config,'line',viewport)}}>
        <div style={{display:'grid',gap:'.45rem'}}><strong>{item.name}</strong><small>{money(item.unitPrice,currency)} / db</small><div style={{display:'flex',alignItems:'center',gap:'.45rem',flexWrap:'wrap'}}>
          <button type="button" aria-label="Mennyiség csökkentése" disabled={item.quantity<=minimum} onClick={()=>setQuantity(item.productId,item.quantity-step,item.variantId,item.lineId)} style={{width:'2.2rem',height:'2.2rem'}}>−</button>
          <strong aria-live="polite" data-storefront-preview-cart-quantity>{item.quantity} db</strong>
          <button type="button" aria-label="Mennyiség növelése" onClick={()=>setQuantity(item.productId,item.quantity+step,item.variantId,item.lineId)} style={{width:'2.2rem',height:'2.2rem'}}>+</button>
          <button type="button" aria-label="Tétel törlése" onClick={()=>remove(item.productId,item.variantId,item.lineId)} style={{minHeight:'2.2rem',padding:'0 .7rem',border:'1px solid #ef5454',background:'#cf3038',color:'#fff'}}>Törlés</button>
        </div></div><strong style={{alignSelf:'center',...slot(config,'lineTotal',viewport)}}>{money(item.unitPrice*item.quantity,currency)}</strong>
      </div>})}</div>
    <div style={{display:'grid',gap:'.8rem',justifySelf:'end',width:'min(100%,22rem)',...slot(config,'summary',viewport)}}><div style={{display:'flex',justifyContent:'space-between',gap:'2rem'}}><span>Összesen</span><strong>{money(total,currency)}</strong></div><a href={routes.checkout} style={{display:'inline-flex',justifyContent:'center',padding:'.9rem 1.2rem',textDecoration:'none',...slot(config,'checkout',viewport)}}>Tovább a pénztárhoz</a></div>
  </section>;
}

function PreviewCheckoutSummary({config,node,viewport,routes}:{config:Record<string,unknown>;node:StorefrontResolvedComponentNode;viewport:StorefrontViewport;routes:Routes}){
  const{items,total,hydrated}=useCart();
  const[shipping,setShipping]=useState<'courier'|'parcel'|'pickup'>('courier');
  const[payment,setPayment]=useState<'card'|'transfer'>('card');
  const[blocked,setBlocked]=useState(false);
  const shippingCost=shipping==='courier'?1990:shipping==='parcel'?1290:0;
  const currency=text(config.currency,'HUF'),grandTotal=total+shippingCost;
  const rootStyle:CSSProperties={...gridSpan(node),display:'grid',gap:'1rem',padding:'clamp(1rem,2.5vw,1.4rem)',...slot(config,'root',viewport)};
  if(!hydrated)return <section data-storefront-commerce="checkout-summary" data-storefront-preview-checkout="hydrating" style={rootStyle}><p>Pénztár betöltése…</p></section>;
  if(!items.length)return <section data-storefront-commerce="checkout-summary" data-storefront-preview-checkout="empty" style={rootStyle}><h2 style={{margin:0}}>A pénztárhoz előbb tegyél terméket a kosárba.</h2><a href={routes.catalog}>Vissza a webáruházhoz</a></section>;
  return <section data-storefront-commerce="checkout-summary" data-storefront-preview-checkout="interactive-fail-closed" style={rootStyle}>
    <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,serif)',...slot(config,'title',viewport)}}>Pénztár</h2>
    <fieldset style={{display:'grid',gap:'.55rem',border:'1px solid var(--shoporation-color-border,#ddd)',padding:'1rem'}}><legend><strong>Szállítási mód</strong></legend>
      {([['courier','Futárszolgálat',1990],['parcel','Csomagpont',1290],['pickup','Személyes átvétel',0]] as const).map(([id,label,cost])=><label key={id} style={{display:'flex',justifyContent:'space-between',gap:'1rem',alignItems:'center'}}><span><input type="radio" name="preview-shipping" checked={shipping===id} onChange={()=>setShipping(id)}/> {label}</span><strong>{cost?money(cost,currency):'0 Ft'}</strong></label>)}
    </fieldset>
    <fieldset style={{display:'grid',gap:'.55rem',border:'1px solid var(--shoporation-color-border,#ddd)',padding:'1rem'}}><legend><strong>Fizetési mód</strong></legend>
      <label><input type="radio" name="preview-payment" checked={payment==='card'} onChange={()=>setPayment('card')}/> Bankkártya</label>
      <label><input type="radio" name="preview-payment" checked={payment==='transfer'} onChange={()=>setPayment('transfer')}/> Banki átutalás</label>
    </fieldset>
    <div style={{display:'grid',gap:'.55rem'}}>{items.map(item=><div key={item.lineId??`${item.productId}:${item.variantId??''}`} style={{display:'flex',justifyContent:'space-between',gap:'1rem',...slot(config,'line',viewport)}}><span>{item.name} × {item.quantity}</span><strong>{money(item.unitPrice*item.quantity,currency)}</strong></div>)}</div>
    <div style={{display:'grid',gap:'.5rem',borderTop:'1px solid var(--shoporation-color-border,#ddd)',paddingTop:'.8rem'}}><div style={{display:'flex',justifyContent:'space-between'}}><span>Termékek</span><strong>{money(total,currency)}</strong></div><div style={{display:'flex',justifyContent:'space-between'}}><span>Szállítás</span><strong data-storefront-preview-shipping-cost>{money(shippingCost,currency)}</strong></div><div style={{display:'flex',justifyContent:'space-between',fontSize:'1.15rem',...slot(config,'totalRow',viewport)}}><span>Összesen</span><strong data-storefront-preview-grand-total>{money(grandTotal,currency)}</strong></div></div>
    <button type="button" data-storefront-preview-order-submit="true" onClick={()=>setBlocked(true)} style={{minHeight:'3rem',fontWeight:900,background:'var(--shoporation-color-primary,#171717)',color:'var(--shoporation-color-primary-contrast,#fff)',border:'1px solid var(--shoporation-color-primary,#171717)'}}>Rendelés leadása</button>
    {blocked?<p role="status" data-storefront-preview-order-blocked="true" style={{margin:0,padding:'.8rem',border:'1px solid var(--shoporation-color-border,#ddd)'}}><strong>Előnézeti módban rendelés nem adható le.</strong> A kosár, variáns-, szállítási és fizetési folyamat kipróbálható, de a rendszer itt biztonságosan megáll és nem hoz létre rendelést.</p>:null}
    <a href={routes.cart}>← Vissza a kosárhoz</a>
  </section>;
}

const ACCOUNT_PREVIEW_STATES:Readonly<Record<string,{title:string;copy:string}>>=Object.freeze({
  orders:{title:'Rendeléseim',copy:'Jelenleg nincs bemutató rendelésed. Az éles fiókban itt jelenik meg a saját rendelési előzményed.'},
  letoltesek:{title:'Letöltéseim',copy:'Jelenleg nincs letölthető digitális tartalmad.'},
  dokumentumok:{title:'Dokumentumaim',copy:'Jelenleg nincs megjeleníthető számlád vagy egyéb dokumentumod.'},
  kivansaglista:{title:'Kívánságlista',copy:'Jelenleg nincs termék a kívánságlistádon.'},
  wishlist:{title:'Kívánságlista',copy:'Jelenleg nincs termék a kívánságlistádon.'},
  ugyek:{title:'Ügyeim',copy:'Jelenleg nincs folyamatban lévő ügyed.'},
  cases:{title:'Ügyeim',copy:'Jelenleg nincs folyamatban lévő ügyed.'},
  visszakuldes:{title:'Visszaküldés',copy:'Jelenleg nincs folyamatban lévő visszaküldésed.'},
  profile:{title:'Fiókadatok',copy:'Itt kezelhetők a vásárlói és számlázási adatok.'},
  marketing:{title:'Marketing beállítások',copy:'Itt adhatók meg a hírlevél- és marketing-hozzájárulások.'},
});
function PreviewAccountCapabilityState({view,viewport}:{view:string;viewport:StorefrontViewport}){
  const state=ACCOUNT_PREVIEW_STATES[view];
  if(!state)return null;
  return <section data-storefront-preview-account-state={view} style={{marginTop:'1rem',padding:viewport==='mobile'?'1rem':'1.25rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'var(--shoporation-radius-m,.75rem)',background:'var(--shoporation-color-surface,#111)',display:'grid',gap:'.55rem'}}>
    <small style={{letterSpacing:'.08em',textTransform:'uppercase',color:'var(--shoporation-color-muted-text,#777)'}}>Fiók</small>
    <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,serif)'}}>{state.title}</h2>
    <p style={{margin:0,lineHeight:1.6,color:'var(--shoporation-color-muted-text,#777)'}}>{state.copy}</p>
  </section>;
}

export function StorefrontTemplatePreviewRuntime({page,viewport,bindingContext,capability,routes,accountView}:{page:StorefrontPageDocument;viewport:StorefrontViewport;bindingContext:Record<string,unknown>;capability?:StorefrontRuntimeCapabilityContext;routes:Routes;accountView?:string}){
  const componentRegistry=createStorefrontVisualBuilderComponentRegistry();
  const rendererRegistry=createStorefrontVisualBuilderRendererRegistry();
  const decorateNode=(node:StorefrontResolvedComponentNode,rendered:ReactNode)=>{
    if(node.componentKey==='commerce.cart-summary')return <PreviewCartSummary config={node.config} node={node} viewport={viewport} routes={routes}/>;
    if(node.componentKey==='commerce.checkout-summary')return <PreviewCheckoutSummary config={node.config} node={node} viewport={viewport} routes={routes}/>;
    if(page.pageType==='account'&&accountView&&node.componentKey==='system.navigation'&&node.config.presentation==='account-capability-demo')return <>{rendered}<PreviewAccountCapabilityState view={accountView} viewport={viewport}/></>;
    return rendered;
  };
  const interceptPreviewRoute=(event:MouseEvent<HTMLDivElement>)=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const accountTrigger=target.closest('button[aria-label="Fiókom"]');
    if(accountTrigger){
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(routes.account);
      return;
    }
    const anchor=target.closest('a[href]');
    if(!(anchor instanceof HTMLAnchorElement))return;
    const url=new URL(anchor.href,window.location.href);
    if(url.origin!==window.location.origin)return;
    if(url.pathname==='/kosar'){
      event.preventDefault();
      window.location.assign(routes.cart);
    }
  };
  return <div data-storefront-template-preview-runtime="interactive-commerce-v1" onClickCapture={interceptPreviewRoute} style={{display:'contents'}}>
    <StorefrontRuntimeRenderer page={page} viewport={viewport} bindingContext={bindingContext} componentRegistry={componentRegistry} rendererRegistry={rendererRegistry} capability={capability} decorateNode={decorateNode}/>
  </div>;
}
