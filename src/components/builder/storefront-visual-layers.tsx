import type {CSSProperties,ReactNode} from 'react';
import type {StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontStructuredProductRendererRegistry} from '@/components/builder/storefront-structured-product';

export const STOREFRONT_VISUAL_LAYER_RENDERERS_VERSION='shoporation.storefront-visual-layer-renderers.v1' as const;
const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const number=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;

const HEIGHT:Record<string,string>={compact:'24rem',editorial:'36rem',hero:'clamp(38rem,72vw,58rem)'};
const RADIUS:Record<string,string>={none:'0',m:'1rem',l:'1.75rem'};
const OFFSET:Record<string,string>={none:'0',xs:'.5rem',s:'1rem',m:'1.5rem',l:'3rem',xl:'5rem',xxl:'10rem'};
const WIDTH:Record<string,string>={auto:'auto',narrow:'18rem',medium:'28rem',wide:'42rem',full:'calc(100% - 2rem)'};
const PADDING:Record<string,string>={none:'0',s:'.65rem',m:'1rem',l:'1.5rem'};

function toneBackground(value:unknown){
  const tone=text(value,'transparent');
  if(tone==='scrim-soft')return'rgba(0,0,0,.18)';
  if(tone==='scrim-strong')return'rgba(0,0,0,.36)';
  if(tone==='surface')return'var(--shoporation-color-background,#fff)';
  if(tone==='accent')return'var(--shoporation-color-accent,#b99a5d)';
  if(tone==='primary')return'var(--shoporation-color-primary,#111)';
  return'transparent';
}

function Canvas({config,node,children}:StorefrontComponentRenderProps){
  const height=HEIGHT[text(config.height,'hero')]??HEIGHT.hero;
  const tone=text(config.tone,'background');
  const background=tone==='primary'?'var(--shoporation-color-primary,#111)':tone==='surface'?'var(--shoporation-color-surface,#eee)':'var(--shoporation-color-background,#fff)';
  const radius=RADIUS[text(config.radius,'none')]??'0';
  return <section data-storefront-visual="layered-canvas" style={{gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`,position:'relative',isolation:'isolate',minHeight:height,overflow:'hidden',background,borderRadius:radius}}>{children}</section>;
}

function Layer({config,children}:StorefrontComponentRenderProps){
  const position=text(config.position,'full');
  const x=OFFSET[text(config.offsetX,'none')]??'0';
  const y=OFFSET[text(config.offsetY,'none')]??'0';
  const style:CSSProperties={position:'absolute',zIndex:Math.max(0,Math.min(20,Math.round(number(config.zIndex,1)))),width:WIDTH[text(config.width,'auto')]??'auto',padding:PADDING[text(config.padding,'none')]??'0',background:toneBackground(config.tone),opacity:Math.max(0,Math.min(1,number(config.opacity,1))),pointerEvents:text(config.pointerEvents,'auto')==='none'?'none':'auto'};
  if(position==='full')Object.assign(style,{inset:0,width:'100%'});
  else if(position==='top-left')Object.assign(style,{top:y,left:x});
  else if(position==='top-right')Object.assign(style,{top:y,right:x});
  else if(position==='bottom-left')Object.assign(style,{bottom:y,left:x});
  else if(position==='bottom-right')Object.assign(style,{bottom:y,right:x});
  else if(position==='center-left')Object.assign(style,{top:'50%',left:x,transform:'translateY(-50%)'});
  else if(position==='center-right')Object.assign(style,{top:'50%',right:x,transform:'translateY(-50%)'});
  else Object.assign(style,{top:'50%',left:'50%',transform:'translate(-50%,-50%)'});
  return <div data-storefront-visual="layer" data-layer-position={position} style={style}>{children}</div>;
}

export const STOREFRONT_VISUAL_LAYER_RENDERERS:readonly [string,number,(props:StorefrontComponentRenderProps)=>ReactNode][]=[['visual.layered-canvas',1,Canvas],['visual.layer',1,Layer]] as const;
export function createStorefrontVisualLayerRendererRegistry(){const registry=createStorefrontStructuredProductRendererRegistry();for(const[key,version,renderer]of STOREFRONT_VISUAL_LAYER_RENDERERS)registry.register(key,version,renderer);return registry;}
