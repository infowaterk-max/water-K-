'use client';

import {useRef,type CSSProperties,type ReactNode} from 'react';

type Viewport='desktop'|'tablet'|'mobile';

export function StorefrontProductRail({children,viewport,ariaLabel='Termékek lapozása'}:{children:ReactNode;viewport:Viewport;ariaLabel?:string}){
  const track=useRef<HTMLDivElement>(null);
  const mobile=viewport==='mobile';
  const itemWidth=mobile?'82%':viewport==='tablet'?'42%':'calc((100% - 2.4rem) / 4)';
  const move=(direction:-1|1)=>{
    const element=track.current;
    if(!element)return;
    element.scrollBy({left:direction*Math.max(280,element.clientWidth*.82),behavior:'smooth'});
  };
  const buttonStyle:CSSProperties={
    minWidth:'2.75rem',minHeight:'2.75rem',display:'inline-grid',placeItems:'center',
    border:'1px solid var(--shoporation-color-border,currentColor)',
    borderRadius:'999px',background:'var(--shoporation-color-surface,transparent)',
    color:'inherit',font:'inherit',fontSize:'1.15rem',fontWeight:900,cursor:'pointer',
  };
  return <div data-storefront-product-rail="true" style={{display:'grid',gap:'.7rem',minWidth:0}}>
    {!mobile?<div aria-label={ariaLabel} style={{display:'flex',justifyContent:'flex-end',gap:'.5rem'}}>
      <button type="button" aria-label="Előző termékek" onClick={()=>move(-1)} style={buttonStyle}>←</button>
      <button type="button" aria-label="Következő termékek" onClick={()=>move(1)} style={buttonStyle}>→</button>
    </div>:null}
    <div ref={track} data-storefront-product-rail-track="true" style={{
      display:'grid',gridAutoFlow:'column',gridAutoColumns:`minmax(0,${itemWidth})`,
      gap:'.8rem',overflowX:'auto',scrollSnapType:'x mandatory',overscrollBehaviorX:'contain',
      scrollbarWidth:'thin',paddingBottom:'.35rem',minWidth:0,
    }}>{children}</div>
  </div>;
}
