'use client';

import {useEffect,useId,useState,type CSSProperties,type KeyboardEvent} from 'react';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {storefrontInteractiveStateProps} from '@/components/builder/storefront-interactive-state';

export type StorefrontContentDisclosureTab={id:string;label:string;title:string;copy:string};
export type StorefrontContentDisclosureStyles={
  nav?:CSSProperties;
  tab?:CSSProperties;
  tabActive?:CSSProperties;
  panels?:CSSProperties;
  panel?:CSSProperties;
  panelTitle?:CSSProperties;
  panelCopy?:CSSProperties;
};

export function StorefrontContentDisclosure({
  mode,tabs,defaultIndex,allowCollapse,styles={},styleSlots,viewport,
}:{
  mode:'tabs'|'accordion';
  tabs:readonly StorefrontContentDisclosureTab[];
  defaultIndex:number;
  allowCollapse:boolean;
  styles?:StorefrontContentDisclosureStyles;
  styleSlots?:unknown;
  viewport:StorefrontViewport;
}){
  const uid=useId().replace(/:/g,'');
  const initial=tabs.length?Math.max(0,Math.min(tabs.length-1,defaultIndex)):0;
  const[active,setActive]=useState<number|null>(tabs.length?initial:null);
  useEffect(()=>setActive(tabs.length?initial:null),[initial,mode,tabs.length]);
  const interaction=storefrontInteractiveStateProps(styleSlots,viewport,'tab');
  const baseButton:CSSProperties={appearance:'none',border:0,background:'transparent',padding:0,color:'inherit',font:'inherit',textAlign:'left',cursor:'pointer',...styles.tab,...interaction.style};
  const buttonClass=interaction.className;
  const panelContent=(tab:StorefrontContentDisclosureTab)=><><h3 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontWeight:500,fontSize:'1.35rem',...styles.panelTitle}}>{tab.title||tab.label}</h3><p style={{margin:0,lineHeight:1.65,color:'var(--shoporation-color-muted-text,#555)',whiteSpace:'pre-line',...styles.panelCopy}}>{tab.copy}</p></>;

  if(mode==='accordion')return <div data-storefront-content-mode="accordion" style={{display:'grid',...styles.panels}}>{tabs.map((tab,index)=>{
    const open=active===index;
    const triggerId=`sf-${uid}-accordion-trigger-${index}`;
    const panelId=`sf-${uid}-accordion-panel-${index}`;
    return <div key={tab.id} style={{borderBottom:'1px solid var(--shoporation-color-border,#ddd)'}}>
      <button id={triggerId} type="button" aria-expanded={open} aria-controls={panelId} className={buttonClass} style={{...baseButton,width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1rem 0',...(open?styles.tabActive:{})}} onClick={()=>setActive(current=>current===index&&allowCollapse?null:index)}>{tab.label||tab.title}<span aria-hidden="true">{open?'−':'+'}</span></button>
      <article id={panelId} role="region" aria-labelledby={triggerId} hidden={!open} style={{...styles.panel,display:open?'grid':'none',alignContent:'start',gap:'.55rem',padding:'0 0 1rem'}}>{panelContent(tab)}</article>
    </div>;
  })}</div>;

  const move=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{
    if(!tabs.length)return;
    let next=index;
    if(event.key==='ArrowRight')next=(index+1)%tabs.length;
    else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=tabs.length-1;
    else return;
    event.preventDefault();
    setActive(next);
    const buttons=event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]');
    buttons?.[next]?.focus();
  };
  return <div data-storefront-content-mode="tabs">
    <div role="tablist" aria-label="Termékinformáció" style={{display:'flex',gap:viewport==='mobile'?'.85rem':'1.8rem',overflowX:'auto',padding:'1rem 0',borderBottom:'1px solid var(--shoporation-color-border,#ddd)',...styles.nav}}>{tabs.map((tab,index)=>{
      const selected=active===index;
      const triggerId=`sf-${uid}-tab-${index}`;
      const panelId=`sf-${uid}-tabpanel-${index}`;
      return <button key={tab.id} id={triggerId} type="button" role="tab" aria-selected={selected} aria-controls={panelId} tabIndex={selected?0:-1} className={buttonClass} style={{...baseButton,...(selected?{borderBottom:'2px solid currentColor',...styles.tabActive}:{})}} onClick={()=>setActive(index)} onKeyDown={event=>move(event,index)}>{tab.label||tab.title}</button>;
    })}</div>
    <div style={{display:'grid',padding:'clamp(1.5rem,3vw,2.5rem) 0',...styles.panels}}>{tabs.map((tab,index)=>{
      const selected=active===index;
      const triggerId=`sf-${uid}-tab-${index}`;
      const panelId=`sf-${uid}-tabpanel-${index}`;
      return <article key={tab.id} id={panelId} role="tabpanel" aria-labelledby={triggerId} hidden={!selected} tabIndex={0} style={{...styles.panel,display:selected?'grid':'none',alignContent:'start',gap:'.55rem'}}>{panelContent(tab)}</article>;
    })}</div>
  </div>;
}
