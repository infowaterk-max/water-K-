'use client';

import {Children,useRef,useState,type CSSProperties,type ReactNode,type UIEvent} from 'react';

type Viewport='desktop'|'tablet'|'mobile';

const clampPerView=(value:number|undefined)=>{
  if(typeof value!=='number'||!Number.isFinite(value))return undefined;
  return Math.max(1,Math.min(6,Math.round(value)));
};
const perViewWidth=(count:number)=>count===1?'100%':'calc((100% - '+((count-1)*0.8)+'rem) / '+count+')';

export function StorefrontProductRail({
  children,
  viewport,
  ariaLabel='Termékek lapozása',
  mobileItemWidth='82%',
  showMobileControls=false,
  mobileSingleItem=false,
  tabletItemsPerView,
  desktopItemsPerView,
}:{
  children:ReactNode;
  viewport:Viewport;
  ariaLabel?:string;
  mobileItemWidth?:string;
  showMobileControls?:boolean;
  mobileSingleItem?:boolean;
  tabletItemsPerView?:number;
  desktopItemsPerView?:number;
}){
  const track=useRef<HTMLDivElement>(null);
  const mobile=viewport==='mobile';
  const singleMobile=mobile&&mobileSingleItem;
  const tabletCount=clampPerView(tabletItemsPerView);
  const desktopCount=clampPerView(desktopItemsPerView);
  const itemsPerView=singleMobile?1:viewport==='tablet'?tabletCount:viewport==='desktop'?desktopCount:undefined;
  const itemWidth=mobile
    ?(singleMobile?'100%':mobileItemWidth)
    :viewport==='tablet'
      ?(tabletCount?perViewWidth(tabletCount):'42%')
      :(desktopCount?perViewWidth(desktopCount):'calc((100% - 2.4rem) / 4)');
  const items=Children.toArray(children);
  const[activeIndex,setActiveIndex]=useState(0);
  const move=(direction:-1|1)=>{
    const element=track.current;
    if(!element)return;
    element.scrollBy({left:direction*Math.max(1,element.clientWidth),behavior:'smooth'});
  };
  const onScroll=(event:UIEvent<HTMLDivElement>)=>{
    if(!singleMobile)return;
    const element=event.currentTarget;
    const slides=Array.from(element.children) as HTMLElement[];
    if(!slides.length)return;
    let nextIndex=0;
    let closest=Number.POSITIVE_INFINITY;
    for(let index=0;index<slides.length;index+=1){
      const distance=Math.abs(slides[index]!.offsetLeft-element.scrollLeft);
      if(distance<closest){closest=distance;nextIndex=index;}
    }
    setActiveIndex(current=>current===nextIndex?current:nextIndex);
  };
  const buttonStyle:CSSProperties={
    minWidth:mobile?'2.45rem':'2.75rem',minHeight:mobile?'2.45rem':'2.75rem',display:'inline-grid',placeItems:'center',
    border:'1px solid var(--shoporation-color-border,currentColor)',
    borderRadius:'999px',background:'var(--shoporation-color-surface,transparent)',
    color:'inherit',font:'inherit',fontSize:'1.15rem',fontWeight:900,cursor:'pointer',
  };
  const controls=!mobile||showMobileControls;
  return <div
    data-storefront-product-rail="true"
    data-mobile-item-width={mobile?itemWidth:undefined}
    data-mobile-single-item={singleMobile?'true':undefined}
    data-items-per-view={itemsPerView}
    style={{display:'grid',gap:'.7rem',minWidth:0}}
  >
    {controls?<div aria-label={ariaLabel} data-storefront-product-rail-controls={mobile?'mobile':'desktop'} style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:'.5rem'}}>
      {singleMobile&&items.length>1?<small aria-live="polite" style={{marginRight:'auto',fontVariantNumeric:'tabular-nums',opacity:.78}}>{activeIndex+1} / {items.length}</small>:null}
      <button type="button" aria-label={singleMobile?'Előző termék':'Előző termékek'} onClick={()=>move(-1)} style={buttonStyle}>←</button>
      <button type="button" aria-label={singleMobile?'Következő termék':'Következő termékek'} onClick={()=>move(1)} style={buttonStyle}>→</button>
    </div>:null}
    <div ref={track} data-storefront-product-rail-track="true" onScroll={onScroll} style={{
      display:'flex',gap:'.8rem',overflowX:'auto',overflowY:'hidden',
      scrollSnapType:'x mandatory',scrollBehavior:'smooth',overscrollBehaviorX:'contain',
      WebkitOverflowScrolling:'touch',touchAction:'pan-x',scrollbarWidth:'thin',
      paddingBottom:'.35rem',minWidth:0,maxWidth:'100%',
    }}>{items.map((child,index)=><div
      key={index}
      data-storefront-product-rail-item="true"
      data-active-index={singleMobile&&index===activeIndex?activeIndex:undefined}
      style={{
        flex:'0 0 '+itemWidth,width:itemWidth,maxWidth:itemWidth,minWidth:0,
        scrollSnapAlign:'start',scrollSnapStop:'always',
      }}
    >{child}</div>)}</div>
  </div>;
}
