'use client';

import {Children,useRef,useState,type CSSProperties,type ReactNode,type TouchEvent} from 'react';

type Viewport='desktop'|'tablet'|'mobile';

export function StorefrontProductRail({
  children,
  viewport,
  ariaLabel='Termékek lapozása',
  mobileItemWidth='82%',
  showMobileControls=false,
  mobileSingleItem=false,
}:{
  children:ReactNode;
  viewport:Viewport;
  ariaLabel?:string;
  mobileItemWidth?:string;
  showMobileControls?:boolean;
  mobileSingleItem?:boolean;
}){
  const track=useRef<HTMLDivElement>(null);
  const touchStartX=useRef<number|null>(null);
  const mobile=viewport==='mobile';
  const singleMobile=mobile&&mobileSingleItem;
  const itemWidth=mobile?mobileItemWidth:viewport==='tablet'?'42%':'calc((100% - 2.4rem) / 4)';
  const items=Children.toArray(children);
  const[activeIndex,setActiveIndex]=useState(0);
  const move=(direction:-1|1)=>{
    if(singleMobile&&items.length){
      setActiveIndex(current=>(current+direction+items.length)%items.length);
      return;
    }
    const element=track.current;
    if(!element)return;
    element.scrollBy({left:direction*Math.max(1,element.clientWidth),behavior:'smooth'});
  };
  const onTouchStart=(event:TouchEvent<HTMLDivElement>)=>{
    if(!singleMobile)return;
    touchStartX.current=event.touches[0]?.clientX??null;
  };
  const onTouchEnd=(event:TouchEvent<HTMLDivElement>)=>{
    if(!singleMobile||touchStartX.current===null)return;
    const end=event.changedTouches[0]?.clientX;
    const start=touchStartX.current;
    touchStartX.current=null;
    if(typeof end!=='number')return;
    const delta=end-start;
    if(Math.abs(delta)<36)return;
    move(delta<0?1:-1);
  };
  const buttonStyle:CSSProperties={
    minWidth:mobile?'2.45rem':'2.75rem',minHeight:mobile?'2.45rem':'2.75rem',display:'inline-grid',placeItems:'center',
    border:'1px solid var(--shoporation-color-border,currentColor)',
    borderRadius:'999px',background:'var(--shoporation-color-surface,transparent)',
    color:'inherit',font:'inherit',fontSize:'1.15rem',fontWeight:900,cursor:'pointer',
  };
  const controls=!mobile||showMobileControls;
  const visibleItems=singleMobile&&items.length?[items[Math.min(activeIndex,items.length-1)]]:items;
  return <div data-storefront-product-rail="true" data-mobile-item-width={mobile?mobileItemWidth:undefined} data-mobile-single-item={singleMobile?'true':undefined} style={{display:'grid',gap:'.7rem',minWidth:0}}>
    {controls?<div aria-label={ariaLabel} data-storefront-product-rail-controls={mobile?'mobile':'desktop'} style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:'.5rem'}}>
      {singleMobile&&items.length>1?<small aria-live="polite" style={{marginRight:'auto',fontVariantNumeric:'tabular-nums',opacity:.78}}>{activeIndex+1} / {items.length}</small>:null}
      <button type="button" aria-label={singleMobile?'Előző termék':'Előző termékek'} onClick={()=>move(-1)} style={buttonStyle}>←</button>
      <button type="button" aria-label={singleMobile?'Következő termék':'Következő termékek'} onClick={()=>move(1)} style={buttonStyle}>→</button>
    </div>:null}
    <div ref={track} data-storefront-product-rail-track="true" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={singleMobile?{
      display:'block',overflow:'hidden',touchAction:'pan-y',minWidth:0,maxWidth:'100%',
    }:{
      display:'flex',gap:'.8rem',overflowX:'auto',overflowY:'hidden',
      scrollSnapType:'x mandatory',scrollBehavior:'smooth',overscrollBehaviorX:'contain',
      WebkitOverflowScrolling:'touch',touchAction:'pan-x',scrollbarWidth:'thin',
      paddingBottom:'.35rem',minWidth:0,maxWidth:'100%',
    }}>{visibleItems.map((child,index)=><div key={singleMobile?activeIndex:index} data-storefront-product-rail-item="true" data-active-index={singleMobile?activeIndex:undefined} style={singleMobile?{
      width:'100%',maxWidth:'100%',minWidth:0,
    }:{
      flex:`0 0 ${itemWidth}`,width:itemWidth,maxWidth:itemWidth,minWidth:0,
      scrollSnapAlign:'start',scrollSnapStop:'always',
    }}>{child}</div>)}</div>
  </div>;
}
