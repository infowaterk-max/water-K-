'use client';

import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';

export const STOREFRONT_STICKY_HEADER_STATE_VERSION='shoporation.storefront-sticky-header-state.v1' as const;

export function StorefrontStickyHeaderState({
  children,
  threshold,
  presentation,
  rootStyle,
  rootScrolledStyle,
  innerStyle,
  innerScrolledStyle,
}:{
  children:ReactNode;
  threshold:number;
  presentation?:string;
  rootStyle:CSSProperties;
  rootScrolledStyle:CSSProperties;
  innerStyle:CSSProperties;
  innerScrolledStyle:CSSProperties;
}){
  const[scrolled,setScrolled]=useState(false);
  const frameRef=useRef<number|null>(null);

  useEffect(()=>{
    const update=()=>{
      frameRef.current=null;
      const next=window.scrollY>=threshold;
      setScrolled(current=>current===next?current:next);
    };
    const onScroll=()=>{
      if(frameRef.current!==null)return;
      frameRef.current=window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll',onScroll,{passive:true});
    return()=>{
      window.removeEventListener('scroll',onScroll);
      if(frameRef.current!==null)window.cancelAnimationFrame(frameRef.current);
    };
  },[threshold]);

  return <header
    data-storefront-component="system.header"
    data-storefront-protected-system="header"
    data-storefront-scroll-state={scrolled?'scrolled':'top'}
    data-presentation={presentation||undefined}
    style={{...rootStyle,...(scrolled?rootScrolledStyle:{})}}
  ><div style={{...innerStyle,...(scrolled?innerScrolledStyle:{})}}>{children}</div></header>;
}
