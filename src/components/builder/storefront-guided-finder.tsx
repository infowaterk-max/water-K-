import type {CSSProperties,ReactNode} from 'react';
import type {StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontStructuredProductRendererRegistry} from '@/components/builder/storefront-structured-product';
import type {StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';
import {sanitizeStorefrontStyleSlots} from '@/lib/builder/storefront-fidelity-engine';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_GUIDED_FINDER_RENDERERS_VERSION='shoporation.storefront-guided-finder-renderers.v2' as const;
const text=(v:unknown,f='')=>typeof v==='string'?v:f;
const num=(v:unknown,f=0)=>typeof v==='number'&&Number.isFinite(v)?v:f;
const rec=(v:unknown):Record<string,unknown>|null=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const rows=(v:unknown):Record<string,unknown>[]=>Array.isArray(v)?v.flatMap(x=>{const r=rec(x);return r?[r]:[]}):[];
const span=(n:StorefrontResolvedComponentNode):CSSProperties=>({gridColumn:`span ${n.resolved.gridSpan} / span ${n.resolved.gridSpan}`});
const safeHref=(v:unknown,f='#')=>{if(typeof v!=='string')return f;const h=v.trim();return h.startsWith('/')||h.startsWith('#')||h.startsWith('https://')?h:f;};
const image=(v:unknown)=>typeof v==='string'&&(v.startsWith('/')||v.startsWith('https://'))?v:null;
const titleStyle:CSSProperties={margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontSize:'clamp(1.9rem,3.4vw,3rem)',fontWeight:500,lineHeight:.98,letterSpacing:'-.035em'};
const styles=(config:Record<string,unknown>,viewport:StorefrontComponentRenderProps['viewport'])=>{
  const slots=sanitizeStorefrontStyleSlots(config.styleSlots);
  return(slot:string)=>resolveStorefrontVisualStyle(slots[slot],viewport) as CSSProperties;
};
const eyebrow=(value:unknown,style:CSSProperties={})=>text(value)?<small style={{textTransform:'uppercase',letterSpacing:'.14em',fontSize:'.7rem',color:'var(--shoporation-color-accent,#ad85c6)',...style}}>{text(value)}</small>:null;

function Finder({config,node,viewport}:StorefrontComponentRenderProps){
  const options=rows(config.options);const presentation=text(config.presentation);const slot=styles(config,viewport);
  if(presentation==='editorial-choice-grid'){
    const requested=Math.max(3,Math.min(6,Math.round(num(config.columns,5))));
    const columns=viewport==='mobile'?2:viewport==='tablet'?Math.min(3,requested):requested;
    const aside=image(config.asideImage);
    return <section data-storefront-guided="finder" data-presentation={presentation} style={{...span(node),display:'grid',gridTemplateColumns:viewport==='mobile'?'1fr':'minmax(0,1.65fr) minmax(14rem,.85fr)',borderTop:'1px solid var(--shoporation-color-border,#ddd)',borderBottom:'1px solid var(--shoporation-color-border,#ddd)',background:'var(--shoporation-color-background,#fff)',...slot('root')}}>
      <div style={{display:'grid',gap:'1rem',padding:viewport==='mobile'?'1.5rem 1rem':'clamp(1.5rem,3vw,2.75rem)',...slot('content')}}>
        {eyebrow(config.eyebrow,slot('eyebrow'))}
        <h2 style={{...titleStyle,...slot('title')}}>{text(config.title,'Mi az, amin javítani szeretnél?')}</h2>
        {text(config.copy)?<p style={{margin:0,maxWidth:'48rem',lineHeight:1.55,...slot('copy')}}>{text(config.copy)}</p>:null}
        <div style={{display:'grid',gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`,gap:'.65rem',...slot('options')}}>{options.map((option,i)=>{
          const src=image(option.image);const selected=option.selected===true;
          return <a key={text(option.id,`${i}`)} href={safeHref(option.href,'#')} aria-current={selected?'true':undefined} style={{minHeight:viewport==='mobile'?'4.6rem':'5.25rem',padding:'.75rem',display:'grid',alignContent:'center',justifyItems:'center',gap:'.4rem',textAlign:'center',border:'1px solid var(--shoporation-color-border,#ddd)',background:selected?'var(--shoporation-color-surface,#f1f4f8)':'var(--shoporation-color-surface-muted,#f4f4f4)',color:'inherit',textDecoration:'none',borderRadius:'2px',...slot('option'),...(selected?slot('optionActive'):{})}}>
            {src?<img src={src} alt="" aria-hidden="true" loading="lazy" style={{width:'2rem',height:'2rem',objectFit:'contain',...slot('optionMedia')}}/>:<span aria-hidden="true" style={{fontSize:'1.25rem',...slot('optionMedia')}}>{text(option.symbol,'◌')}</span>}
            <strong style={{fontSize:'.78rem',...slot('optionLabel')}}>{text(option.label,'Opció')}</strong>
          </a>;
        })}</div>
        {text(config.actionLabel)?<a href={safeHref(config.actionHref,'#finder-results')} style={{display:'inline-flex',width:'fit-content',padding:'.75rem 1.4rem',background:'var(--shoporation-color-primary,#111)',color:'var(--shoporation-color-primary-contrast,#fff)',textDecoration:'none',fontWeight:650,fontSize:'.78rem',textTransform:'uppercase',letterSpacing:'.04em',...slot('action')}}>{text(config.actionLabel)} →</a>:null}
      </div>
      <aside style={{position:'relative',minHeight:viewport==='mobile'?'13rem':'15rem',overflow:'hidden',background:'var(--shoporation-color-surface,#f3eef4)',...slot('aside')}}>
        {aside?<img src={aside} alt={text(config.asideImageAlt)} loading="lazy" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',...slot('asideImage')}}/>:null}
        <div style={{position:'absolute',inset:'1rem',display:'grid',alignContent:'start',gap:'.25rem',pointerEvents:'none',...slot('asideContent')}}>
          {text(config.asideTitle)?<strong style={{fontSize:'.7rem',letterSpacing:'.08em',textTransform:'uppercase',...slot('asideTitle')}}>{text(config.asideTitle)}</strong>:null}
          {text(config.asideCopy)?<small style={slot('asideCopy')}>{text(config.asideCopy)}</small>:null}
        </div>
      </aside>
    </section>;
  }
  return <section data-storefront-guided="finder" style={{...span(node),display:'grid',gap:'1rem',padding:'clamp(1.5rem,4vw,3rem)',background:'var(--shoporation-color-surface,#f5f1f3)',borderRadius:'1.5rem',...slot('root')}}>
    {eyebrow(config.eyebrow,slot('eyebrow'))}
    <h2 style={{margin:0,fontSize:'clamp(2rem,4vw,3.6rem)',letterSpacing:'-.03em',...slot('title')}}>{text(config.title,'Találd meg, ami hozzád illik')}</h2>
    {text(config.copy)?<p style={{margin:0,maxWidth:'44rem',lineHeight:1.7,...slot('copy')}}>{text(config.copy)}</p>:null}
    <div style={{display:'grid',gap:'.5rem',...slot('content')}}><small>{text(config.progressLabel)}</small><strong>{text(config.stepTitle)}</strong>{text(config.stepCopy)?<span>{text(config.stepCopy)}</span>:null}<h3 style={{margin:'.7rem 0 .2rem'}}>{text(config.question)}</h3><div style={{display:'flex',gap:'.55rem',flexWrap:'wrap',...slot('options')}}>{options.map((option,i)=><a key={text(option.id,`${i}`)} href={safeHref(option.href,'#')} aria-current={option.selected===true?'true':undefined} style={{padding:'.7rem .9rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'999px',background:option.selected===true?'var(--shoporation-color-primary,#222)':'var(--shoporation-color-background,#fff)',color:option.selected===true?'var(--shoporation-color-primary-contrast,#fff)':'inherit',textDecoration:'none',...slot('option'),...(option.selected===true?slot('optionActive'):{})}}>{text(option.label,'Opció')}</a>)}</div></div>
    {text(config.actionLabel)?<a href={safeHref(config.actionHref,'#finder-results')} style={{justifySelf:'start',fontWeight:700,color:'inherit',...slot('action')}}>{text(config.actionLabel)}</a>:null}
  </section>;
}

function Results({config,node,viewport}:StorefrontComponentRenderProps){
  const items=rows(config.items);const slot=styles(config,viewport);
  return <section data-storefront-guided="results" style={{...span(node),display:'grid',gap:'1rem',...slot('root')}}>{eyebrow(config.eyebrow,slot('eyebrow'))}<h2 style={{margin:0,...slot('title')}}>{text(config.title,'Ajánlott találatok')}</h2><p style={{margin:0,...slot('copy')}}>{text(config.explanation)}</p>{items.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(14rem,1fr))',gap:'.8rem',...slot('grid')}}>{items.map((item,i)=><article key={text(item.id,`${i}`)} style={{padding:'1rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'1rem',...slot('card')}}><small style={slot('status')}>{text(item.statusLabel,text(config.status))}</small><h3 style={{margin:'.45rem 0',...slot('itemTitle')}}><a href={safeHref(item.href,'#')} style={{color:'inherit',textDecoration:'none'}}>{text(item.label,'Termék')}</a></h3>{text(item.summary)?<p style={{margin:0,lineHeight:1.55,...slot('itemCopy')}}>{text(item.summary)}</p>:null}</article>)}</div>:<p style={slot('empty')}>{text(config.emptyLabel,'Nincs megjeleníthető találat.')}</p>}</section>;
}

function Explanation({config,node,viewport}:StorefrontComponentRenderProps){
  const evidence=rows(config.evidence);const matched=evidence.filter(x=>x.matched===true),mismatched=evidence.filter(x=>x.matched!==true);const slot=styles(config,viewport);
  return <section data-storefront-guided="explanation" data-presentation={text(config.presentation)||undefined} style={{...span(node),display:'grid',gap:'1rem',...slot('root')}}><h2 style={{margin:0,...slot('title')}}>{text(config.title,'Miért ezt ajánljuk?')}</h2>{matched.length?<div style={slot('matched')}><strong>{text(config.matchedTitle,'Egyező szempontok')}</strong><ul>{matched.map((x,i)=><li key={text(x.ruleId,`${i}`)}>{text(x.reason)}</li>)}</ul></div>:null}{mismatched.length?<div style={slot('mismatched')}><strong>{text(config.mismatchedTitle,'Eltérő szempontok')}</strong><ul>{mismatched.map((x,i)=><li key={text(x.ruleId,`${i}`)}>{text(x.reason)}</li>)}</ul></div>:null}</section>;
}

function AttributeIndex({config,node,viewport}:StorefrontComponentRenderProps){
  const items=rows(config.items);const presentation=text(config.presentation);const media=presentation==='media-index';const requested=Math.max(2,Math.min(6,Math.round(num(config.columns,4))));const columns=media?(viewport==='mobile'?2:viewport==='tablet'?Math.min(3,requested):requested):requested;const slot=styles(config,viewport);
  return <section data-storefront-guided="attribute-index" data-presentation={presentation||undefined} style={{...span(node),display:'grid',gap:'1rem',...slot('root')}}>{eyebrow(config.eyebrow,slot('eyebrow'))}<div style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:'1rem',...slot('header')}}><div><h2 style={{...(media?titleStyle:{margin:0,fontSize:'clamp(2rem,4vw,3.5rem)'}),...slot('title')}}>{text(config.title,'Index')}</h2>{text(config.copy)?<p style={{margin:'.35rem 0 0',maxWidth:'46rem',lineHeight:1.55,...slot('copy')}}>{text(config.copy)}</p>:null}</div>{text(config.linkLabel)?<span style={{fontSize:'.78rem',textDecoration:'underline',...slot('link')}}>{text(config.linkLabel)} →</span>:null}</div><div style={{display:'grid',gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`,gap:media?'.55rem':'.75rem',...slot('grid')}}>{items.map((x,i)=>{const src=image(x.image);return <a key={text(x.id,`${i}`)} href={safeHref(x.href,'#')} style={{display:'grid',background:media?'var(--shoporation-color-background,#fff)':'var(--shoporation-color-surface,#f5f1f3)',borderRadius:media?'0':'1rem',color:'inherit',textDecoration:'none',overflow:'hidden',border:media?'1px solid var(--shoporation-color-border,#ddd)':'0',...slot('card')}}>{media?<div style={{aspectRatio:'1.35 / 1',background:'var(--shoporation-color-surface-muted,#eee)',overflow:'hidden',...slot('media')}}>{src?<img src={src} alt={text(x.imageAlt,text(x.label))} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',...slot('mediaImage')}}/>:null}</div>:null}<span style={{display:'grid',gap:'.22rem',padding:media?'.65rem':'1rem',...slot('cardBody')}}><strong style={{fontSize:media?'.78rem':undefined,...slot('label')}}>{text(x.label)}</strong>{text(x.copy)?<small style={{fontSize:media?'.65rem':undefined,lineHeight:1.4,...slot('itemCopy')}}>{text(x.copy)}</small>:null}{media&&text(x.meta)?<small style={{letterSpacing:'.1em',...slot('meta')}}>{text(x.meta)}</small>:null}</span></a>;})}</div></section>;
}

function AttributeNavigation({config,node,viewport}:StorefrontComponentRenderProps){
  const items=rows(config.items);const presentation=text(config.presentation);const media=presentation==='media-navigation';const requested=Math.max(2,Math.min(5,Math.round(num(config.columns,4))));const columns=media?(viewport==='mobile'?1:viewport==='tablet'?Math.min(2,requested):requested):requested;const slot=styles(config,viewport);
  return <section data-storefront-guided="attribute-navigation" data-presentation={presentation||undefined} style={{...span(node),display:'grid',gap:'1rem',...slot('root')}}>{eyebrow(config.eyebrow,slot('eyebrow'))}<div style={slot('header')}><h2 style={{...(media?titleStyle:{margin:0}),...slot('title')}}>{text(config.title,'Fedezd fel')}</h2>{text(config.copy)?<p style={{margin:'.35rem 0 0',lineHeight:1.55,...slot('copy')}}>{text(config.copy)}</p>:null}</div>{media?<div style={{display:'grid',gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`,gap:'.55rem',...slot('grid')}}>{items.map((x,i)=>{const src=image(x.image);return <a key={text(x.id,`${i}`)} href={safeHref(x.href,'#')} style={{display:'grid',color:'inherit',textDecoration:'none',border:'1px solid var(--shoporation-color-border,#ddd)',...slot('card')}}><div style={{aspectRatio:'2.15 / 1',background:'var(--shoporation-color-surface-muted,#eee)',overflow:'hidden',...slot('media')}}>{src?<img src={src} alt={text(x.imageAlt,text(x.label))} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',...slot('mediaImage')}}/>:null}</div><span style={{display:'grid',gap:'.2rem',padding:'.65rem',...slot('cardBody')}}><strong style={{fontSize:'.88rem',textTransform:'uppercase',...slot('label')}}>{text(x.label)}</strong>{text(x.copy)?<small style={slot('itemCopy')}>{text(x.copy)}</small>:null}{text(x.ctaLabel)?<small style={{fontWeight:650,...slot('cta')}}>{text(x.ctaLabel)} →</small>:null}</span></a>;})}</div>:<div style={{display:'flex',gap:'.55rem',flexWrap:'wrap',...slot('grid')}}>{items.map((x,i)=><a key={text(x.id,`${i}`)} href={safeHref(x.href,'#')} style={{padding:'.7rem .85rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'999px',color:'inherit',textDecoration:'none',...slot('card')}}>{text(x.label)}</a>)}</div>}</section>;
}

const R:readonly [string,number,(p:StorefrontComponentRenderProps)=>ReactNode][]=[['guided.finder',1,Finder],['guided.results',1,Results],['guided.explanation',1,Explanation],['guided.attribute-index',1,AttributeIndex],['guided.attribute-navigation',1,AttributeNavigation]] as const;
export function createStorefrontGuidedFinderRendererRegistry(){const registry=createStorefrontStructuredProductRendererRegistry();for(const[k,v,r]of R)registry.register(k,v,r);return registry;}
