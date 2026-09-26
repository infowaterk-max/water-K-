'use client';

import {useMemo,useState,type CSSProperties} from 'react';

type Viewport='desktop'|'tablet'|'mobile';
type CartLine={id:string;name:string;quantity:number;lineTotal:unknown;variantLabel:string;unitPrice:number|null;image:string|null};
type Props={initialLines:CartLine[];config:Record<string,unknown>;nodeId:string;gridSpan:number;viewport:Viewport;resolvedStyles:Record<string,CSSProperties>};

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const num=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const safeHref=(value:unknown,fallback='#')=>typeof value==='string'&&(value.startsWith('/')||value.startsWith('#')||value.startsWith('https://'))?value:fallback;
const money=(value:unknown,currencyValue:unknown='HUF')=>{
  if(typeof value==='string'&&value.trim())return value.trim();
  if(typeof value!=='number'||!Number.isFinite(value))return '';
  const currency=typeof currencyValue==='string'&&/^[A-Z]{3}$/.test(currencyValue)?currencyValue:'HUF';
  return new Intl.NumberFormat('hu-HU',{style:'currency',currency,maximumFractionDigits:currency==='HUF'?0:2}).format(value);
};
function TrashIcon(){return <svg data-cart-icon="trash" aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style={{display:'block',flex:'0 0 auto'}}><path d="M7 2h6l1 2h3v2H3V4h3l1-2Zm-2 5h10l-.78 10.12A2 2 0 0 1 12.23 19H7.77a2 2 0 0 1-1.99-1.88L5 7Zm3 2v6h1.5V9H8Zm2.5 0v6H12V9h-1.5Z"/></svg>}
function ChevronIcon({direction}:{direction:'up'|'down'}){return <svg data-cart-icon={'chevron-'+direction} aria-hidden="true" viewBox="0 0 14 8" width="14" height="8" fill="currentColor" style={{display:'block',flex:'0 0 auto'}}><path d={direction==='up'?'M7 1 13 7H1L7 1Z':'M1 1h12L7 7 1 1Z'}/></svg>}

export function StorefrontCartSummaryClient({initialLines,config,nodeId,gridSpan,viewport,resolvedStyles:s}:Props){
  const[lines,setLines]=useState(initialLines);
  const showQuantityControls=config.showQuantityControls!==false,showRemoveControl=config.showRemoveControl!==false,showCouponEntry=config.showCouponEntry!==false;
  const discount=num(config.discount,0);
  const priced=lines.every(line=>line.unitPrice!==null);
  const calculatedSubtotal=useMemo(()=>priced?lines.reduce((sum,line)=>sum+(line.unitPrice??0)*line.quantity,0):null,[lines,priced]);
  const subtotal=calculatedSubtotal??config.subtotal;
  const total=typeof calculatedSubtotal==='number'?Math.max(0,calculatedSubtotal-discount):config.total;
  const setQuantity=(id:string,delta:number)=>setLines(current=>current.map(line=>line.id===id?{...line,quantity:Math.max(1,line.quantity+delta)}:line));
  const remove=(id:string)=>setLines(current=>current.filter(line=>line.id!==id));
  return <section data-storefront-commerce="cart-summary" data-cart-customer-task-contract="v2" data-cart-interactive-controls="true" style={{gridColumn:'span '+gridSpan+' / span '+gridSpan,display:'grid',gap:'1.5rem',maxWidth:'64rem',marginInline:'auto',...s.root}}>
    <h1 style={{margin:0,fontFamily:'var(--shoporation-heading-font,serif)',fontWeight:500,...s.title}}>Kosár</h1>
    {lines.length?<div style={{display:'grid',gap:'1rem',...s.lines}}>{lines.map(line=>{const lineTotal=line.unitPrice!==null?line.unitPrice*line.quantity:line.lineTotal;return <div key={line.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'.75rem',paddingBlock:'.8rem',borderBottom:'1px solid var(--shoporation-color-border,#ddd)',...s.line}}>
      <div style={{display:'grid',gridTemplateColumns:line.image?'4.25rem minmax(0,1fr)':'1fr',gap:'.75rem',minWidth:0,...s.lineContent}}>
        {line.image?<img src={line.image} alt="" loading="lazy" style={{width:'4.25rem',height:'4.25rem',objectFit:'cover',borderRadius:'.45rem',background:'var(--shoporation-color-surface-muted,#211f3e)'}}/>:null}
        <div style={{display:'grid',gap:'.38rem',alignContent:'start',minWidth:0}}><strong>{line.name}</strong>{line.variantLabel?<small>{line.variantLabel}</small>:null}
          {showQuantityControls?<div data-cart-quantity-controls="true" data-cart-quantity-layout="vertical-arrows" style={{display:'flex',alignItems:'center',gap:'.45rem',flexWrap:'wrap'}}>
            <span aria-live="polite" style={{minWidth:'2.7rem',fontSize:'.78rem',fontWeight:700}}>{line.quantity} db</span>
            <span data-cart-stepper="vertical" style={{display:'grid',gap:'.16rem',alignContent:'center'}}>
              <button data-cart-step="increase" type="button" aria-label="Mennyiség növelése" onClick={()=>setQuantity(line.id,1)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:'2rem',height:'2rem',minWidth:'2rem',minHeight:'2rem',padding:0,margin:0,border:'1px solid var(--shoporation-color-border,#373259)',borderRadius:'.3rem',background:'var(--shoporation-color-surface-muted,#211f3e)',color:'var(--shoporation-color-text,#fff7e8)',lineHeight:0,cursor:'pointer'}}><ChevronIcon direction="up"/></button>
              <button data-cart-step="decrease" type="button" aria-label="Mennyiség csökkentése" aria-disabled={line.quantity<=1} disabled={line.quantity<=1} onClick={()=>setQuantity(line.id,-1)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:'2rem',height:'2rem',minWidth:'2rem',minHeight:'2rem',padding:0,margin:0,border:'1px solid var(--shoporation-color-border,#373259)',borderRadius:'.3rem',background:'var(--shoporation-color-surface-muted,#211f3e)',color:'var(--shoporation-color-text,#fff7e8)',lineHeight:0,cursor:line.quantity<=1?'not-allowed':'pointer',opacity:line.quantity<=1?.55:1}}><ChevronIcon direction="down"/></button>
            </span>
            {showRemoveControl?<button data-cart-remove-control="true" type="button" aria-label="Tétel törlése" title="Törlés" onClick={()=>remove(line.id)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:'2.25rem',height:'2.25rem',minWidth:'2.25rem',minHeight:'2.25rem',padding:0,margin:0,border:'1px solid #ef5454',borderRadius:'.45rem',background:'#cf3038',color:'#fff',lineHeight:0,cursor:'pointer'}}><TrashIcon/></button>:null}
          </div>:<small>{line.quantity} db</small>}
        </div>
      </div>
      <strong style={{alignSelf:'center',whiteSpace:'nowrap',...s.lineTotal}}>{money(lineTotal,config.currency)}</strong>
    </div>})}</div>:<div data-cart-empty-state="true" style={{display:'grid',gap:'.9rem',justifyItems:'start',...s.empty}}><p style={{margin:0}}>{text(config.emptyLabel,'A kosarad jelenleg üres.')}</p><a href={safeHref(config.emptyCtaHref,'/webaruhaz')} style={{display:'inline-flex',justifyContent:'center',padding:'.8rem 1rem',background:'var(--shoporation-color-primary,#171717)',color:'var(--shoporation-color-primary-contrast,#fff)',textDecoration:'none',...s.emptyCta}}>{text(config.emptyCtaLabel,'Vásárlás folytatása')}</a></div>}
    {lines.length?<div style={{display:'grid',gap:'.7rem',justifySelf:'end',minWidth:'min(100%,22rem)',...s.summary}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:'2rem',...s.summaryRow}}><span>Részösszeg</span><strong>{money(subtotal,config.currency)}</strong></div>
      {showCouponEntry?<div data-cart-coupon-entry="true" data-cart-coupon-presentation="template-native" style={{display:'grid',gap:'.5rem',paddingBlock:'.4rem',...s.coupon}}><label htmlFor={nodeId+'-coupon'} style={{fontSize:'.82rem',...s.couponLabel}}><strong>{text(config.couponLabel,'Van kuponkódod?')}</strong></label><div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:'.5rem',alignItems:'stretch',...s.couponRow}}><input data-cart-coupon-input="true" id={nodeId+'-coupon'} defaultValue={text(config.couponCode)} placeholder={text(config.couponPlaceholder,'Kuponkód')} style={{minWidth:0,padding:'.68rem .78rem',border:'1px solid var(--shoporation-color-border,#52677b)',borderRadius:'.55rem',background:'var(--shoporation-color-surface,#0c2942)',color:'var(--shoporation-color-text,#fff)',outline:'none',...s.couponInput}}/><button data-cart-coupon-apply="true" type="button" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'.68rem .9rem',border:'1px solid var(--shoporation-color-primary,#5b78ff)',borderRadius:'.55rem',background:'var(--shoporation-color-primary,#5b78ff)',color:'var(--shoporation-color-primary-contrast,#fff)',fontWeight:700,cursor:'pointer',...s.couponButton}}>{text(config.couponApplyLabel,'Alkalmazás')}</button></div></div>:null}
      {discount>0?<div style={{display:'flex',justifyContent:'space-between',gap:'2rem',...s.discountRow}}><span>Kedvezmény{text(config.couponCode)?' · '+text(config.couponCode):''}</span><strong>−{money(discount,config.currency)}</strong></div>:null}
      <div style={{display:'flex',justifyContent:'space-between',gap:'2rem',...s.totalRow}}><span>Összesen</span><strong>{money(total,config.currency)}</strong></div>
      <a href={safeHref(config.checkoutHref,'/penztar')} style={{display:'inline-flex',justifyContent:'center',padding:'.9rem 1.2rem',background:'var(--shoporation-color-primary,#171717)',color:'var(--shoporation-color-primary-contrast,#fff)',textDecoration:'none',...s.checkout}}>{text(config.checkoutLabel,'Tovább a pénztárhoz')}</a>
    </div>:null}
  </section>;
}
