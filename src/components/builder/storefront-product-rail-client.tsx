'use client';

import {Children,useRef,type CSSProperties,type ReactNode} from 'react';

type Viewport='desktop'|'tablet'|'mobile';

export function StorefrontProductRail({
  children,
  viewport,
  ariaLabel='Termékek lapozása',
  mobileItemWidth='82%',
  showMobileControls=false,
}:{
  children:ReactNode;
  viewport:Viewport;
  ariaLabel?:string;
  mobileItemWidth?:string;
  showMobileControls?:boolean;
}){
  const track=useRef<HTMLDivElement>(null);
  const mobile=viewport==='mobile';
  const itemWidth=mobile?mobileItemWidth:viewport==='tablet'?'42%':'calc((100% - 2.4rem) / 4)';
  const items=Children.toArray(children);
  const move=(direction:-1|1)=>{
    const element=track.current;
    if(!element)return;
    element.scrollBy({left:direction*Math.max(1,element.clientWidth),behavior:'smooth'});
  };
  const buttonStyle:CSSProperties={
    minWidth:mobile?'2.45rem':'2.75rem',minHeight:mobile?'2.45rem':'2.75rem',display:'inline-grid',placeItems:'center',
    border:'1px solid var(--shoporation-color-border,currentColor)',
    borderRadius:'999px',background:'var(--shoporation-color-surface,transparent)',
    color:'inherit',font:'inherit',fontSize:'1.15rem',fontWeight:900,cursor:'pointer',
  };
  const controls=!mobile||showMobileControls;
  return <div data-storefront-product-rail="true" data-mobile-item-width={mobile?mobileItemWidth:undefined} style={{display:'grid',gap:'.7rem',minWidth:0}}>
    {controls?<div aria-label={ariaLabel} data-storefront-product-rail-controls={mobile?'mobile':'desktop'} style={{display:'flex',justifyContent:'flex-end',gap:'.5rem'}}>
      <button type="button" aria-label="Előző termékek" onClick={()=>move(-1)} style={buttonStyle}>←</button>
      <button type="button" aria-label="Következő termékek" onClick={()=>move(1)} style={buttonStyle}>→</button>
    </div>:null}
    <div ref={track} data-storefront-product-rail-track="true" style={{
      display:'flex',gap:'.8rem',overflowX:'auto',overflowY:'hidden',
      scrollSnapType:'x mandatory',scrollBehavior:'smooth',overscrollBehaviorX:'contain',
      WebkitOverflowScrolling:'touch',touchAction:'pan-x',scrollbarWidth:'thin',
      paddingBottom:'.35rem',minWidth:0,maxWidth:'100%',
    }}>{items.map((child,index)=><div key={index} data-storefront-product-rail-item="true" style={{
      flex:`0 0 ${itemWidth}`,width:itemWidth,maxWidth:itemWidth,minWidth:0,
      scrollSnapAlign:'start',scrollSnapStop:'always',
    }}>{child}</div>)}</div>
  </div>;
}
