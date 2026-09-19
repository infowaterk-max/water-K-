import {Children,type CSSProperties,type ReactNode} from 'react';
import {StorefrontRendererRegistry,type StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontPrimitiveRendererRegistry} from '@/components/builder/storefront-primitives';
import {resolveStorefrontStyleSlot} from '@/lib/builder/storefront-fidelity-engine';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import styles from './storefront-commerce-header.module.css';

export const STOREFRONT_COMMERCE_HEADER_RENDERERS_VERSION='shoporation.storefront-commerce-header-renderers.v2' as const;
const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const bool=(value:unknown,fallback=false)=>typeof value==='boolean'?value:fallback;
const safeHref=(value:unknown,fallback='#')=>{const href=text(value).trim();return href.startsWith('/')||href.startsWith('#')||href.startsWith('https://')?href:fallback;};
const safeImage=(value:unknown)=>{const src=text(value).trim();return src.startsWith('/')||src.startsWith('https://')?src:null;};
const safeQueryParam=(value:unknown)=>{const candidate=text(value,'q').trim();return /^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(candidate)?candidate:'q';};
const visualStyle=(value:unknown,viewport:StorefrontComponentRenderProps['viewport'])=>resolveStorefrontVisualStyle(value,viewport) as CSSProperties;
const slotStyle=(value:unknown,slot:string,viewport:StorefrontComponentRenderProps['viewport'])=>resolveStorefrontStyleSlot(value,slot,viewport) as CSSProperties;
const toneStyle=(value:unknown):CSSProperties=>value==='primary'
  ?{background:'var(--shoporation-color-primary,#111827)',color:'var(--shoporation-color-primary-contrast,#fff)'}
  :value==='surface'
    ?{background:'var(--shoporation-color-surface,#f8fafc)',color:'var(--shoporation-color-text,#111827)'}
    :{background:'var(--shoporation-color-background,#fff)',color:'var(--shoporation-color-text,#111827)'};

function SearchIcon(){
  return <span aria-hidden="true" style={{width:'1.5rem',height:'1.5rem',display:'grid',placeItems:'center',lineHeight:0,transform:'translateY(-1px)'}}><svg data-storefront-search-icon="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flex:'0 0 auto'}}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.6 4.6"/></svg></span>;
}

type UtilityItem={label:string;href:string;symbol:string;count:string};
const utilityItems=(value:unknown):UtilityItem[]=>Array.isArray(value)?value.flatMap((item,index)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return[];
  const row=item as Record<string,unknown>;
  const label=text(row.label,`Művelet ${index+1}`),href=safeHref(row.href,'#'),symbol=text(row.symbol,label.slice(0,1));
  const count=typeof row.count==='number'&&Number.isFinite(row.count)?String(Math.max(0,Math.round(row.count))):text(row.count);
  return[{label,href,symbol,count}];
}):[];

function SearchRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const action=safeHref(config.action,'/kereses'),queryParam=safeQueryParam(config.queryParam),presentation=text(config.presentation,'commerce');
  const buttonLabel=text(config.buttonLabel,'Keresés').trim();
  const iconOnly=['⌕','🔍','🔎'].includes(buttonLabel);
  const rootStyle:CSSProperties={gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`,display:'flex',width:'100%',minWidth:0,alignItems:'stretch',border:'1px solid var(--shoporation-color-border,#d8dce7)',borderRadius:'var(--shoporation-radius-m,.75rem)',background:'var(--shoporation-color-surface,#fff)',overflow:'hidden',...visualStyle(config.style,viewport),...slotStyle(config.styleSlots,'root',viewport)};
  return <form data-storefront-component="system.search" data-presentation={presentation} role="search" method="get" action={action} style={rootStyle}>
    <input type="search" name={queryParam} placeholder={text(config.placeholder,'Keresés a webshopban')} aria-label={text(config.ariaLabel,'Keresés a webshopban')} style={{appearance:'none',flex:'1 1 auto',minWidth:0,border:0,outline:0,background:'transparent',color:'inherit',padding:viewport==='mobile'?'.72rem .82rem':'.78rem 1rem',font:'inherit',...visualStyle(config.inputStyle,viewport),...slotStyle(config.styleSlots,'input',viewport)}}/>
    <button type="submit" aria-label={iconOnly?text(config.ariaLabel,'Keresés a webshopban'):undefined} style={{border:0,borderLeft:'1px solid var(--shoporation-color-border,#d8dce7)',background:'var(--shoporation-color-primary,#111827)',color:'var(--shoporation-color-primary-contrast,#fff)',font:'inherit',fontWeight:750,lineHeight:1,cursor:'pointer',...visualStyle(config.buttonStyle,viewport),...slotStyle(config.styleSlots,'button',viewport),display:'grid',placeItems:'center',alignSelf:'stretch',flex:'0 0 auto',...(iconOnly?{boxSizing:'border-box',minWidth:'3rem',width:'3rem',minHeight:'2.75rem',padding:0,lineHeight:0}:{padding:viewport==='mobile'?'.7rem .82rem':'.75rem 1rem'})}}>{iconOnly?<SearchIcon/>:buttonLabel}</button>
  </form>;
}

function CommerceHeaderRenderer({config,children,node,viewport}:StorefrontComponentRenderProps){
  const sticky=bool(config.sticky,true),mobile=viewport==='mobile',tablet=viewport==='tablet',utility=utilityItems(config.utilityItems),rendered=Children.toArray(children);
  const showUtilityLabels=bool(config.showUtilityLabels,false);
  const navigationItemCount=node.children
    .filter(child=>child.componentKey==='system.navigation')
    .reduce((count,child)=>count+(Array.isArray(child.config.items)?child.config.items.length:0),0);
  const denseDesktop=viewport==='desktop'&&navigationItemCount>=8;
  const paired=node.children.map((child,index)=>({componentKey:child.componentKey,rendered:rendered[index]??null}));
  const search=paired.filter(item=>item.componentKey==='system.search').map(item=>item.rendered);
  const navigation=paired.filter(item=>item.componentKey==='system.navigation').map(item=>item.rendered);
  const logo=safeImage(config.logoUrl);
  const rootStyle:CSSProperties={...toneStyle(config.tone),gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`,position:sticky?'sticky':'relative',top:sticky?0:undefined,zIndex:sticky?40:undefined,borderBottom:'1px solid var(--shoporation-color-border,#d8dce7)',...visualStyle(config.style,viewport),...slotStyle(config.styleSlots,'root',viewport)};
  const innerStyle:CSSProperties={maxWidth:'1440px',marginInline:'auto',padding:mobile?'.7rem 1rem':tablet?'.8rem 1.4rem':'1rem clamp(1.25rem,3vw,2.6rem)',display:'grid',gap:mobile?'.7rem':'.8rem',...visualStyle(config.innerStyle,viewport),...slotStyle(config.styleSlots,'inner',viewport)};
  const brand=<a href={safeHref(config.brandHref,'/')} style={{display:'flex',alignItems:'center',gap:'.65rem',minWidth:0,color:'inherit',textDecoration:'none',fontWeight:850,letterSpacing:'-.02em',...visualStyle(config.brandStyle,viewport),...slotStyle(config.styleSlots,'brand',viewport)}}>{logo?<img src={logo} alt={text(config.logoAlt,text(config.brandLabel,'Webshop'))} loading="eager" style={{display:'block',width:mobile?'2rem':'2.35rem',height:mobile?'2rem':'2.35rem',objectFit:'contain',...visualStyle(config.logoStyle,viewport),...slotStyle(config.styleSlots,'logo',viewport)}}/>:null}<span style={{display:'grid',gap:'.08rem',minWidth:0}}><strong style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{text(config.brandLabel,'Webshop')}</strong>{text(config.tagline)?<small style={{color:'var(--shoporation-color-muted-text,#677084)',fontSize:'.68rem',fontWeight:600,letterSpacing:'.05em',...visualStyle(config.taglineStyle,viewport),...slotStyle(config.styleSlots,'tagline',viewport)}}>{text(config.tagline)}</small>:null}</span></a>;
  const utilities=<nav aria-label="Webshop műveletek" style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:mobile?'.45rem':'.7rem',...visualStyle(config.utilityStyle,viewport),...slotStyle(config.styleSlots,'utility',viewport)}}>{utility.map(item=><a key={`${item.label}:${item.href}`} href={item.href} aria-label={item.label} title={item.label} style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:showUtilityLabels&&!mobile?'.38rem':undefined,minWidth:mobile?'2rem':showUtilityLabels?'auto':'2.25rem',minHeight:mobile?'2rem':'2.25rem',padding:showUtilityLabels&&!mobile?'.35rem .55rem':'.35rem',border:'1px solid var(--shoporation-color-border,#d8dce7)',borderRadius:'var(--shoporation-radius-m,.75rem)',color:'inherit',textDecoration:'none',fontWeight:800,...slotStyle(config.styleSlots,'utilityItem',viewport)}}><span aria-hidden="true">{item.symbol}</span>{showUtilityLabels&&!mobile?<span style={{fontSize:'.72rem',whiteSpace:'nowrap',...slotStyle(config.styleSlots,'utilityLabel',viewport)}}>{item.label}</span>:null}{item.count?<small style={{position:'absolute',top:'-.35rem',right:'-.35rem',minWidth:'1.1rem',height:'1.1rem',padding:'0 .2rem',display:'grid',placeItems:'center',borderRadius:'999px',background:'var(--shoporation-color-accent,#ff6b5e)',color:'var(--shoporation-color-background,#fff)',fontSize:'.62rem',fontWeight:900}}>{item.count}</small>:null}</a>)}</nav>;
  const topStyle:CSSProperties=mobile?{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',alignItems:'center',gap:'.75rem'}:{display:'grid',gridTemplateColumns:tablet?'minmax(9rem,.8fr) minmax(15rem,1.4fr) auto':'minmax(11rem,.75fr) minmax(20rem,1.6fr) auto',alignItems:'center',gap:'clamp(1rem,2vw,2rem)'};
  const navFrameStyle:CSSProperties={display:'flex',alignItems:'center',gap:denseDesktop?'.4rem':'.7rem',minWidth:0,overflowX:'auto',overflowY:'hidden',overscrollBehaviorX:'contain',paddingTop:mobile?'.15rem':'.25rem',borderTop:'1px solid color-mix(in srgb,var(--shoporation-color-border,#d8dce7) 70%,transparent)',...slotStyle(config.styleSlots,'navigationFrame',viewport)};
  const categoryLabel=text(config.categoryTriggerLabel),categorySymbol=text(config.categoryTriggerSymbol,'☰'),categoryHref=safeHref(config.categoryTriggerHref,'/webaruhaz');
  const categoryTrigger=categoryLabel||text(config.categoryTriggerSymbol)?<a href={categoryHref} aria-label={categoryLabel||'Kategóriák'} style={{display:'inline-flex',alignItems:'center',gap:'.4rem',flex:'0 0 auto',color:'inherit',textDecoration:'none',fontWeight:850,...slotStyle(config.styleSlots,'categoryTrigger',viewport)}}><span aria-hidden="true">{categorySymbol}</span>{categoryLabel&&!mobile?<span>{categoryLabel}</span>:null}</a>:null;
  const navTagline=text(config.navTagline);
  return <header data-storefront-component="system.commerce-header" data-storefront-protected-system="header" data-presentation={text(config.presentation,'commerce-two-tier')} style={rootStyle}>
    <div style={innerStyle}>
      <div style={{...topStyle,...slotStyle(config.styleSlots,'topRow',viewport)}}>{brand}{!mobile?<div style={{minWidth:0,...slotStyle(config.styleSlots,'searchFrame',viewport)}}>{search}</div>:null}{utilities}</div>
      {mobile?<div style={{minWidth:0,...slotStyle(config.styleSlots,'searchFrame',viewport)}}>{search}</div>:null}
      <div className={denseDesktop?styles.denseNavigation:undefined} data-navigation-density={denseDesktop?'dense':undefined} style={navFrameStyle}>{categoryTrigger}<div style={{minWidth:0,flex:'1 1 auto'}}>{navigation}</div>{navTagline&&!mobile&&!denseDesktop?<small style={{flex:'0 0 auto',whiteSpace:'nowrap',fontSize:'.58rem',letterSpacing:'.22em',textTransform:'uppercase',opacity:.72,...slotStyle(config.styleSlots,'navTagline',viewport)}}>{navTagline}</small>:null}</div>
    </div>
  </header>;
}

const RENDERERS:readonly [string,number,(props:StorefrontComponentRenderProps)=>ReactNode][]=[
  ['system.commerce-header',1,CommerceHeaderRenderer],
  ['system.search',1,SearchRenderer],
] as const;

export function createStorefrontCommerceHeaderRendererRegistry(){
  const registry:StorefrontRendererRegistry=createStorefrontPrimitiveRendererRegistry();
  for(const[componentKey,componentVersion,renderer]of RENDERERS)registry.register(componentKey,componentVersion,renderer);
  return registry;
}
