import {Children,type CSSProperties,type ReactNode} from 'react';
import {StorefrontRendererRegistry,type StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontPrimitiveRendererRegistry} from '@/components/builder/storefront-primitives';
import {resolveStorefrontStyleSlot} from '@/lib/builder/storefront-fidelity-engine';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import styles from './storefront-commerce-header.module.css';
import {StorefrontAccountAuthTrigger} from '@/components/auth/storefront-auth-dialog';

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
  return <span aria-hidden="true" style={{position:'absolute',left:'50%',top:'50%',width:'1.5rem',height:'1.5rem',display:'grid',placeItems:'center',lineHeight:0,transform:'translate(-50%,-50%)',pointerEvents:'none'}}><svg data-storefront-search-icon="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'block'}}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.6 4.6"/></svg></span>;
}

type UtilityItem={label:string;href:string;symbol:string;count:string};
type UtilityKind='favorites'|'account'|'cart'|'custom';
const utilityKind=(item:UtilityItem):UtilityKind=>{
  if(item.href==='/kedvencek'||item.href==='/fiokom/kivansaglista')return'favorites';
  if(item.href==='/fiokom')return'account';
  if(item.href==='/kosar')return'cart';
  return'custom';
};
function UtilityIcon({kind,symbol}:{kind:UtilityKind;symbol:string}){
  const svgProps={viewBox:'0 0 24 24',width:22,height:22,fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,style:{display:'block'}};
  if(kind==='favorites')return <svg data-storefront-utility-icon="favorites" {...svgProps}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z"/></svg>;
  if(kind==='account')return <svg data-storefront-utility-icon="account" {...svgProps}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
  if(kind==='cart')return <svg data-storefront-utility-icon="cart" {...svgProps}><path d="M3 4h2l2.3 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>;
  return <span data-storefront-utility-icon="custom">{symbol}</span>;
}
const utilityItems=(value:unknown):UtilityItem[]=>Array.isArray(value)?value.flatMap((item,index)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return[];
  const row=item as Record<string,unknown>;
  const label=text(row.label,`Művelet ${index+1}`),href=safeHref(row.href,'#'),symbol=text(row.symbol,label.slice(0,1));
  const count=typeof row.count==='number'&&Number.isFinite(row.count)?String(Math.max(0,Math.round(row.count))):text(row.count);
  return[{label,href,symbol,count}];
}):[];

type MobileMenuItem={label:string;href:string};
const mobileMenuItems=(value:unknown):MobileMenuItem[]=>Array.isArray(value)?value.flatMap((item,index)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return[];
  const row=item as Record<string,unknown>;
  const label=text(row.label,`Menüpont ${index+1}`).trim(),href=safeHref(row.href,'');
  return label&&href?[{label,href}]:[];
}):[];

function SearchRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const action=safeHref(config.action,'/kereses'),queryParam=safeQueryParam(config.queryParam),presentation=text(config.presentation,'commerce');
  const buttonLabel=text(config.buttonLabel,'Keresés').trim();
  const iconOnly=['⌕','🔍','🔎'].includes(buttonLabel);
  const rootStyle:CSSProperties={gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`,display:'flex',width:'100%',minWidth:0,alignItems:'stretch',border:'1px solid var(--shoporation-color-border,#d8dce7)',borderRadius:'var(--shoporation-radius-m,.75rem)',background:'var(--shoporation-color-surface,#fff)',overflow:'hidden',...visualStyle(config.style,viewport),...slotStyle(config.styleSlots,'root',viewport),minHeight:viewport==='mobile'?'2.8rem':'2.85rem'};
  return <form data-storefront-component="system.search" data-presentation={presentation} role="search" method="get" action={action} style={rootStyle}>
    <input type="search" name={queryParam} placeholder={text(config.placeholder,'Keresés a webshopban')} aria-label={text(config.ariaLabel,'Keresés a webshopban')} style={{appearance:'none',flex:'1 1 auto',minWidth:0,border:0,outline:0,background:'transparent',color:'inherit',padding:viewport==='mobile'?'.72rem .82rem':'.78rem 1rem',font:'inherit',...visualStyle(config.inputStyle,viewport),...slotStyle(config.styleSlots,'input',viewport),fontSize:viewport==='mobile'?'1rem':'.94rem',lineHeight:1.35}}/>
    <button type="submit" aria-label={iconOnly?text(config.ariaLabel,'Keresés a webshopban'):undefined} style={{border:0,borderLeft:'1px solid var(--shoporation-color-border,#d8dce7)',background:'var(--shoporation-color-primary,#111827)',color:'var(--shoporation-color-primary-contrast,#fff)',font:'inherit',fontWeight:750,cursor:'pointer',...visualStyle(config.buttonStyle,viewport),...slotStyle(config.styleSlots,'button',viewport),position:'relative',display:'block',alignSelf:'stretch',flex:'0 0 auto',...(iconOnly?{appearance:'none',boxSizing:'border-box',minWidth:'3rem',width:'3rem',height:'auto',minHeight:0,padding:0,lineHeight:0}:{lineHeight:1,padding:viewport==='mobile'?'.7rem .82rem':'.75rem 1rem'})}}>{iconOnly?<SearchIcon/>:buttonLabel}</button>
  </form>;
}

function CommerceHeaderRenderer({config,children,node,viewport}:StorefrontComponentRenderProps){
  const sticky=bool(config.sticky,true),mobile=viewport==='mobile',tablet=viewport==='tablet',utility=utilityItems(config.utilityItems),fullMobileMenu=mobileMenuItems(config.mobileMenuItems),rendered=Children.toArray(children);
  const showUtilityLabels=bool(config.showUtilityLabels,false);
  const navigationItemCount=node.children
    .filter(child=>child.componentKey==='system.navigation')
    .reduce((count,child)=>count+(Array.isArray(child.config.items)?child.config.items.length:0),0);
  const denseDesktop=viewport==='desktop'&&navigationItemCount>=8;
  const paired=node.children.map((child,index)=>({componentKey:child.componentKey,rendered:rendered[index]??null}));
  const search=paired.filter(item=>item.componentKey==='system.search').map(item=>item.rendered);
  const navigation=paired.filter(item=>item.componentKey==='system.navigation').map(item=>item.rendered);
  const logo=safeImage(config.logoUrl);
  const rootStyle:CSSProperties={...toneStyle(config.tone),gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`,width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box',position:sticky?'sticky':'relative',top:sticky?0:undefined,zIndex:sticky?40:undefined,borderBottom:'1px solid var(--shoporation-color-border,#d8dce7)',...visualStyle(config.style,viewport),...slotStyle(config.styleSlots,'root',viewport)};
  const innerStyle:CSSProperties={width:'100%',maxWidth:'var(--shoporation-content-max, 1200px)',minWidth:0,boxSizing:'border-box',marginInline:'auto',padding:mobile?'.7rem 1rem':tablet?'.8rem 1.4rem':'1rem clamp(1.25rem,3vw,2.6rem)',display:'grid',gap:mobile?'.7rem':'.8rem',...visualStyle(config.innerStyle,viewport),...slotStyle(config.styleSlots,'inner',viewport),paddingBlock:mobile?'.72rem':tablet?'.8rem .62rem':'.84rem .68rem'};
  const brand=<a href={safeHref(config.brandHref,'/')} style={{display:'flex',alignItems:'center',gap:'.7rem',minWidth:0,color:'inherit',textDecoration:'none',fontWeight:850,letterSpacing:'-.02em',...visualStyle(config.brandStyle,viewport),...slotStyle(config.styleSlots,'brand',viewport),fontSize:mobile?'1rem':'1.12rem'}}>{logo?<img src={logo} alt={text(config.logoAlt,text(config.brandLabel,'Webshop'))} loading="eager" style={{display:'block',width:mobile?'2.25rem':'2.75rem',height:mobile?'2.25rem':'2.75rem',objectFit:'contain',...visualStyle(config.logoStyle,viewport),...slotStyle(config.styleSlots,'logo',viewport),minWidth:mobile?'2.3rem':'2.9rem',minHeight:mobile?'2.3rem':'2.9rem'}}/>:null}<span style={{display:'grid',gap:'.1rem',minWidth:0}}><strong style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{text(config.brandLabel,'Webshop')}</strong>{text(config.tagline)?<small style={{color:'var(--shoporation-color-muted-text,#677084)',fontWeight:600,letterSpacing:'.05em',...visualStyle(config.taglineStyle,viewport),...slotStyle(config.styleSlots,'tagline',viewport),fontSize:mobile?'.72rem':'.78rem',lineHeight:1.2}}>{text(config.tagline)}</small>:null}</span></a>;
  const utilities=<nav aria-label="Webshop műveletek" style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:mobile?'.45rem':'.7rem',...visualStyle(config.utilityStyle,viewport),...slotStyle(config.styleSlots,'utility',viewport)}}>{utility.map(item=>{const kind=utilityKind(item),canonical=kind!=='custom',showLabel=showUtilityLabels&&!mobile&&!canonical,icon=<UtilityIcon kind={kind} symbol={item.symbol}/>;const utilityItemStyle:CSSProperties={position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:showLabel?'.38rem':undefined,minWidth:mobile?'2.75rem':canonical?'2.75rem':showLabel?'auto':'2.75rem',minHeight:'2.75rem',padding:showLabel?'.45rem .65rem':'.45rem',border:'1px solid var(--shoporation-color-border,#d8dce7)',borderRadius:'var(--shoporation-radius-m,.75rem)',background:'transparent',color:'inherit',textDecoration:'none',fontWeight:800,fontFamily:'inherit',cursor:'pointer',...slotStyle(config.styleSlots,'utilityItem',viewport)};return item.href==='/fiokom'?<StorefrontAccountAuthTrigger key={`${item.label}:${item.href}`} label={item.label} symbol={icon} count={item.count} showLabel={showLabel} style={utilityItemStyle}/>:<a key={`${item.label}:${item.href}`} href={item.href} aria-label={item.label} title={item.label} data-storefront-utility-kind={kind} style={utilityItemStyle}><span aria-hidden="true" style={{display:'grid',placeItems:'center'}}>{icon}</span>{showLabel?<span data-storefront-utility-label="true" style={{whiteSpace:'nowrap',...slotStyle(config.styleSlots,'utilityLabel',viewport),fontSize:'.88rem',lineHeight:1.2}}>{item.label}</span>:null}{item.count?<small style={{position:'absolute',top:'-.35rem',right:'-.35rem',minWidth:'1.1rem',height:'1.1rem',padding:'0 .2rem',display:'grid',placeItems:'center',borderRadius:'999px',background:'var(--shoporation-color-accent,#ff6b5e)',color:'var(--shoporation-color-background,#fff)',fontSize:'.62rem',fontWeight:900}}>{item.count}</small>:null}</a>})}</nav>;
  const topStyle:CSSProperties=mobile?{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',alignItems:'center',gap:'.75rem',minHeight:'3rem'}:{display:'grid',gridTemplateColumns:tablet?'minmax(9rem,.8fr) minmax(15rem,1.4fr) auto':'minmax(11rem,.75fr) minmax(20rem,1.6fr) auto',alignItems:'center',gap:'clamp(1rem,2vw,2rem)',minHeight:tablet?'3.35rem':'3.65rem'};
  const navFrameStyle:CSSProperties={display:'flex',alignItems:'center',gap:denseDesktop?'.5rem':'.75rem',minWidth:0,overflowX:'auto',overflowY:'hidden',overscrollBehaviorX:'contain',paddingTop:mobile?'.25rem':'.5rem',borderTop:'1px solid color-mix(in srgb,var(--shoporation-color-border,#d8dce7) 70%,transparent)',...slotStyle(config.styleSlots,'navigationFrame',viewport),minHeight:mobile?'2.5rem':'2.9rem'};
  const categoryLabel=text(config.categoryTriggerLabel),categorySymbol=text(config.categoryTriggerSymbol,'☰'),categoryHref=safeHref(config.categoryTriggerHref,'/webaruhaz');
  const categoryTrigger=categoryLabel||text(config.categoryTriggerSymbol)?<a href={categoryHref} aria-label={categoryLabel||'Kategóriák'} style={{display:'inline-flex',alignItems:'center',gap:'.4rem',flex:'0 0 auto',color:'inherit',textDecoration:'none',fontWeight:850,...slotStyle(config.styleSlots,'categoryTrigger',viewport),fontSize:mobile?'.92rem':'.98rem',lineHeight:1.25}}><span aria-hidden="true">{categorySymbol}</span>{categoryLabel?<span>{categoryLabel}</span>:null}</a>:null;
  const navTagline=text(config.navTagline);
  return <header data-storefront-component="system.commerce-header" data-storefront-protected-system="header" data-presentation={text(config.presentation,'commerce-two-tier')} style={rootStyle}>
    <div style={innerStyle}>
      <div style={{...topStyle,...slotStyle(config.styleSlots,'topRow',viewport)}}>{brand}{!mobile?<div style={{minWidth:0,...slotStyle(config.styleSlots,'searchFrame',viewport)}}>{search}</div>:null}{utilities}</div>
      {mobile?<div style={{minWidth:0,...slotStyle(config.styleSlots,'searchFrame',viewport)}}>{search}</div>:null}
      {mobile
        ?<details className={styles.mobileMenu} data-storefront-mobile-menu="true">
          <summary className={styles.mobileMenuSummary} aria-label="Mobil navigáció megnyitása"><span aria-hidden="true">☰</span><span>Menü</span></summary>
          <div className={styles.mobileMenuPanel}>{categoryTrigger}<div className={styles.mobileMenuNavigation}>{fullMobileMenu.length?<nav aria-label="Teljes mobil navigáció" data-storefront-mobile-menu-complete="true" style={{display:'grid',gap:'.2rem'}}>{fullMobileMenu.map(item=><a key={`${item.href}:${item.label}`} href={item.href} style={{color:'inherit',textDecoration:'none',padding:'.68rem .2rem',minHeight:'2.75rem',display:'flex',alignItems:'center',borderBottom:'1px solid color-mix(in srgb,var(--shoporation-color-border,#d8dce7) 55%,transparent)',fontWeight:760}}>{item.label}</a>)}</nav>:navigation}</div></div>
        </details>
        :<div className={denseDesktop?styles.denseNavigation:undefined} data-navigation-density={denseDesktop?'dense':undefined} style={navFrameStyle}>{categoryTrigger}<div style={{minWidth:0,flex:'1 1 auto'}}>{navigation}</div>{navTagline&&!denseDesktop?<small style={{flex:'0 0 auto',whiteSpace:'nowrap',fontSize:'.58rem',letterSpacing:'.22em',textTransform:'uppercase',opacity:.72,...slotStyle(config.styleSlots,'navTagline',viewport)}}>{navTagline}</small>:null}</div>}
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
