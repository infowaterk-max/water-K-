import type {CSSProperties,ReactNode} from 'react';
import {createStorefrontPrimitiveRendererRegistry} from '@/components/builder/storefront-primitives';
import type {StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {sanitizeStorefrontStyleSlots} from '@/lib/builder/storefront-fidelity-engine';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_SHARED_CONTENT_RENDERERS_VERSION='shoporation.storefront-shared-content-renderers.v1' as const;

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const number=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const record=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const rows=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.flatMap(item=>{const row=record(item);return row?[row]:[]}):[];
const safeImage=(value:unknown)=>typeof value==='string'&&(value.startsWith('/')||value.startsWith('https://'))?value:null;
const span=(node:StorefrontComponentRenderProps['node']):CSSProperties=>({gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`});
const slotStyles=(config:Record<string,unknown>,viewport:StorefrontComponentRenderProps['viewport'])=>{
  const slots=sanitizeStorefrontStyleSlots(config.styleSlots);
  return(slot:string)=>resolveStorefrontVisualStyle(slots[slot],viewport) as CSSProperties;
};

function TrustStripRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const items=rows(config.items).map((item,index)=>({
    id:text(item.id,`trust-${index}`),
    symbol:text(item.symbol),
    label:text(item.label),
    copy:text(item.copy),
  })).filter(item=>item.label||item.copy);
  if(!items.length)return null;
  const requested=Math.max(1,Math.min(6,Math.round(number(config.columns,items.length||3))));
  const mobile=Math.max(1,Math.min(2,Math.round(number(config.mobileColumns,1))));
  const columns=viewport==='mobile'?Math.min(mobile,requested):viewport==='tablet'?Math.min(3,requested):requested;
  const slot=slotStyles(config,viewport);
  return <ul data-storefront-content="trust-strip" data-presentation={text(config.presentation)||undefined} style={{...span(node),listStyle:'none',margin:0,padding:0,display:'grid',gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`,gap:'var(--shoporation-space-s, 1rem)',...slot('root')}}>
    {items.map(item=><li key={item.id} style={{minWidth:0,display:'grid',gridTemplateColumns:item.symbol?'auto minmax(0,1fr)':'minmax(0,1fr)',gap:'.45rem',alignItems:'center',...slot('item')}}>
      {item.symbol?<span aria-hidden="true" style={{fontSize:'1rem',lineHeight:1,...slot('symbol')}}>{item.symbol}</span>:null}
      <span style={{display:'grid',gap:'.12rem',minWidth:0,...slot('body')}}>
        {item.label?<strong style={{fontSize:'.72rem',lineHeight:1.2,...slot('label')}}>{item.label}</strong>:null}
        {item.copy?<small style={{color:'var(--shoporation-color-muted-text,#64748b)',lineHeight:1.3,...slot('copy')}}>{item.copy}</small>:null}
      </span>
    </li>)}
  </ul>;
}

function BeforeAfterRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const before=safeImage(config.beforeImage);
  const after=safeImage(config.afterImage);
  const verified=text(config.evidenceStatus)==='verified';
  if(!verified||!before||!after)return null;
  const slot=slotStyles(config,viewport);
  const mobile=viewport==='mobile';
  const image=(src:string,alt:unknown,label:unknown,side:'before'|'after')=><figure style={{margin:0,display:'grid',gap:'.45rem',minWidth:0,...slot('panel')}}>
    <div style={{position:'relative',overflow:'hidden',background:'var(--shoporation-color-surface-muted,#eef0f2)',...slot('media')}}>
      <img src={src} alt={text(alt)} loading="lazy" style={{display:'block',width:'100%',aspectRatio:'4 / 5',objectFit:'cover',...slot('image')}}/>
      {text(label)?<span style={{position:'absolute',left:'.6rem',bottom:'.6rem',padding:'.32rem .5rem',background:'var(--shoporation-color-background,#fff)',color:'var(--shoporation-color-text,#111)',fontSize:'.65rem',fontWeight:700,...slot('label')}}>{text(label)}</span>:null}
    </div>
    <span data-before-after-side={side} style={{fontSize:'.62rem',color:'var(--shoporation-color-muted-text,#64748b)',...slot('side')}}>{side==='before'?'Kiinduló állapot':'Későbbi állapot'}</span>
  </figure>;
  return <section data-storefront-editorial="before-after" data-evidence-status="verified" data-presentation={text(config.presentation)||undefined} style={{...span(node),display:'grid',gap:'1rem',...slot('root')}}>
    {text(config.eyebrow)||text(config.title)||text(config.copy)?<header style={{display:'grid',gap:'.45rem',maxWidth:'48rem',...slot('header')}}>
      {text(config.eyebrow)?<small style={{letterSpacing:'.12em',textTransform:'uppercase',...slot('eyebrow')}}>{text(config.eyebrow)}</small>:null}
      {text(config.title)?<h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontSize:'clamp(1.8rem,3.5vw,3.2rem)',fontWeight:500,lineHeight:1,...slot('title')}}>{text(config.title)}</h2>:null}
      {text(config.copy)?<p style={{margin:0,lineHeight:1.6,color:'var(--shoporation-color-muted-text,#64748b)',...slot('copy')}}>{text(config.copy)}</p>:null}
    </header>:null}
    <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'repeat(2,minmax(0,1fr))',gap:'.75rem',...slot('grid')}}>{image(before,config.beforeImageAlt,config.beforeLabel,'before')}{image(after,config.afterImageAlt,config.afterLabel,'after')}</div>
    {text(config.caption)?<small style={{lineHeight:1.45,color:'var(--shoporation-color-muted-text,#64748b)',...slot('caption')}}>{text(config.caption)}</small>:null}
  </section>;
}

export const STOREFRONT_SHARED_CONTENT_RENDERERS:readonly [string,number,(props:StorefrontComponentRenderProps)=>ReactNode][]=[
  ['content.trust-strip',1,TrustStripRenderer],
  ['editorial.before-after',1,BeforeAfterRenderer],
] as const;

export function createStorefrontSharedContentRendererRegistry(){
  const registry=createStorefrontPrimitiveRendererRegistry();
  for(const[key,version,renderer]of STOREFRONT_SHARED_CONTENT_RENDERERS)registry.register(key,version,renderer);
  return registry;
}
