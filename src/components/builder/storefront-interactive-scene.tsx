import type {CSSProperties} from 'react';
import type {StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontContextRetentionRendererRegistry} from '@/components/builder/storefront-context-retention';
import {
  INTERACTIVE_SCENE_KINDS,
  resolveInteractiveScene,
  type InteractiveSceneHotspot,
  type InteractiveSceneKind,
  type InteractiveSceneProductProjection,
} from '@/lib/commerce/interactive-scene';

export const STOREFRONT_INTERACTIVE_SCENE_RENDERERS_VERSION='shoporation.storefront-interactive-scene-renderers.v1' as const;
const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const bool=(value:unknown,fallback=false)=>typeof value==='boolean'?value:fallback;
const rows=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==='object'&&!Array.isArray(item)):[];
const safeHref=(value:unknown,fallback='#')=>{const href=text(value).trim();return href.startsWith('/')||href.startsWith('#')||href.startsWith('https://')?href:fallback;};
const number=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const point=(value:unknown,fallback:{x:number;y:number})=>{const record=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};return{x:number(record.x,fallback.x),y:number(record.y,fallback.y)};};

function parseHotspots(value:unknown):InteractiveSceneHotspot[]{
  return rows(value).map((row,index)=>{
    const positions=row.position&&typeof row.position==='object'&&!Array.isArray(row.position)?row.position as Record<string,unknown>:{};
    const desktop=point(positions.desktop,{x:50,y:50});
    return{
      id:text(row.id,`hotspot-${index+1}`),
      productId:text(row.productId),
      label:text(row.label)||undefined,
      position:{
        desktop,
        ...(positions.tablet?{tablet:point(positions.tablet,desktop)}:{}),
        ...(positions.mobile?{mobile:point(positions.mobile,point(positions.tablet,desktop))}:{}),
      },
    };
  });
}
function parseProducts(value:unknown):InteractiveSceneProductProjection[]{
  return rows(value).map(row=>({
    productId:text(row.productId),label:text(row.label),href:safeHref(row.href,'#'),eligible:row.eligible===true,
    priceDisplay:text(row.priceDisplay)||null,stockLabel:text(row.stockLabel)||null,imageUrl:text(row.imageUrl)||null,
  }));
}

function InteractiveScene({config,node,viewport}:StorefrontComponentRenderProps){
  const sceneKind=INTERACTIVE_SCENE_KINDS.includes(text(config.sceneKind) as InteractiveSceneKind)?text(config.sceneKind) as InteractiveSceneKind:'generic';
  let resolved:ReturnType<typeof resolveInteractiveScene>|null=null;
  try{
    resolved=resolveInteractiveScene({
      config:{sceneKey:text(config.sceneKey,node.id),kind:sceneKind,hotspots:parseHotspots(config.hotspots)},
      products:parseProducts(config.products),
      viewport,
    });
  }catch{resolved=null;}
  const hotspots=resolved?.hotspots??[];
  const background=text(config.backgroundImage);
  const span:CSSProperties={gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`};
  return <section data-storefront-interactive-scene-v1 data-scene-kind={sceneKind} style={{...span,display:'grid',gap:'1rem'}}>
    <header style={{display:'grid',gap:'.45rem'}}>
      {text(config.eyebrow)?<small style={{textTransform:'uppercase',letterSpacing:'.12em'}}>{text(config.eyebrow)}</small>:null}
      <h2 style={{margin:0,fontSize:'clamp(2rem,4vw,3.8rem)'}}>{text(config.title,sceneKind==='look'?'Vásárold meg a szettet':sceneKind==='room'?'Vásárold meg a teret':'Fedezd fel a jelenetet')}</h2>
      {text(config.copy)?<p style={{margin:0,maxWidth:'52rem',lineHeight:1.65}}>{text(config.copy)}</p>:null}
    </header>
    <div style={{position:'relative',minHeight:'clamp(20rem,55vw,46rem)',overflow:'hidden',borderRadius:'var(--shoporation-radius-l,1.4rem)',background:'var(--shoporation-color-surface,#eee)'}}>
      {background?<img src={safeHref(background,'')} alt={text(config.backgroundAlt)} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>:null}
      {hotspots.map((hotspot,index)=><a key={hotspot.id} href={hotspot.href} aria-label={`${hotspot.label}${hotspot.priceDisplay?` – ${hotspot.priceDisplay}`:''}`} style={{position:'absolute',left:`${hotspot.position.x}%`,top:`${hotspot.position.y}%`,transform:'translate(-50%,-50%)',display:'grid',gridTemplateColumns:'2.5rem minmax(0,auto)',alignItems:'center',gap:'.5rem',maxWidth:'min(18rem,70vw)',color:'var(--shoporation-color-text,#111)',textDecoration:'none',zIndex:2}}>
        <span aria-hidden="true" style={{display:'grid',placeItems:'center',width:'2.5rem',height:'2.5rem',borderRadius:'999px',background:'var(--shoporation-color-background,#fff)',border:'2px solid var(--shoporation-color-primary,#111)',fontWeight:900,boxShadow:'var(--shoporation-shadow-overlay,0 8px 24px rgba(0,0,0,.14))'}}>{index+1}</span>
        <span style={{display:'grid',gap:'.1rem',padding:'.55rem .7rem',borderRadius:'.75rem',background:'var(--shoporation-color-background,#fff)',boxShadow:'var(--shoporation-shadow-overlay,0 8px 24px rgba(0,0,0,.14))'}}><strong>{hotspot.label}</strong>{hotspot.priceDisplay?<small>{hotspot.priceDisplay}</small>:null}{hotspot.stockLabel?<small>{hotspot.stockLabel}</small>:null}</span>
      </a>)}
      {!hotspots.length?<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',padding:'2rem',textAlign:'center'}}><p>{text(config.emptyLabel,'A jelenet termékei jelenleg nem érhetők el. Böngészd tovább a katalógust.')}</p></div>:null}
    </div>
    {bool(config.showSetSummary,true)&&hotspots.length?<div style={{display:'grid',gap:'.75rem',padding:'1rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'var(--shoporation-radius-m,1rem)'}}>
      <strong>{text(config.setTitle,sceneKind==='look'?'A teljes look':'A jelenet termékei')}</strong>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(11rem,1fr))',gap:'.6rem'}}>{hotspots.map(hotspot=><a key={`summary-${hotspot.id}`} href={hotspot.href} style={{color:'inherit',textDecoration:'none',padding:'.7rem',background:'var(--shoporation-color-surface,#f5f5f5)',borderRadius:'.7rem'}}><strong>{hotspot.label}</strong>{hotspot.priceDisplay?<small style={{display:'block'}}>{hotspot.priceDisplay}</small>:null}</a>)}</div>
      {text(config.setCtaLabel)?<a href={safeHref(config.setCtaHref,'#')} style={{width:'fit-content',fontWeight:800,color:'inherit'}}>{text(config.setCtaLabel)}</a>:null}
    </div>:null}
  </section>;
}

export function createStorefrontInteractiveSceneRendererRegistry(){
  const registry=createStorefrontContextRetentionRendererRegistry();
  registry.register('commerce.interactive-scene',1,InteractiveScene);
  return registry;
}
