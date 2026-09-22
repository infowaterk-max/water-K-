import type {CSSProperties} from 'react';
import {StorefrontRendererRegistry,type StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';

export const STOREFRONT_GROWTH_MARKETING_RENDERERS_VERSION='shoporation.storefront-growth-marketing-renderers.v1' as const;

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const record=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const bool=(value:unknown,fallback=false)=>typeof value==='boolean'?value:fallback;
const safeHref=(value:unknown,fallback='#')=>{const href=text(value).trim();return href.startsWith('/')||href.startsWith('#')||href.startsWith('https://')?href:fallback;};
const span=(node:StorefrontComponentRenderProps['node']):CSSProperties=>({gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`});

function PromotionBannerRenderer({config,node}:StorefrontComponentRenderProps){
  const promotion=record(config.promotion);
  if(!promotion)return null;
  const code=text(promotion.code),discount=text(promotion.discountLabel),minimum=text(promotion.minimumLabel),validity=text(promotion.validityLabel);
  if(!code||!discount)return null;
  const primary=text(config.tone)==='primary';
  return <section data-storefront-marketing="promotion-banner" data-promotion-source={text(promotion.source)} style={{...span(node),display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:'clamp(1rem,3vw,2rem)',alignItems:'center',padding:'clamp(1.25rem,4vw,2.5rem)',background:primary?'var(--shoporation-color-primary,#171717)':'var(--shoporation-color-surface,#f3eee7)',color:primary?'var(--shoporation-color-primary-contrast,#fff)':'inherit',borderRadius:'var(--shoporation-radius-l,1.25rem)'}}>
    <div style={{display:'grid',gap:'.55rem',minWidth:0}}>
      {text(config.eyebrow)?<small style={{letterSpacing:'.12em',textTransform:'uppercase'}}>{text(config.eyebrow)}</small>:null}
      <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontSize:'clamp(1.8rem,4vw,3.4rem)',lineHeight:1}}>{text(config.title,discount)}</h2>
      <p style={{margin:0,maxWidth:'48rem',lineHeight:1.6}}>{text(config.copy,text(promotion.description))}</p>
      <small>{[minimum,validity].filter(Boolean).join(' · ')}</small>
    </div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'.75rem',flexWrap:'wrap'}}>
      {bool(config.showCode,true)?<code aria-label={`Kuponkód: ${code}`} style={{padding:'.65rem .8rem',border:'1px dashed currentColor',borderRadius:'.65rem',fontWeight:800,letterSpacing:'.08em'}}>{code}</code>:null}
      {text(config.ctaLabel)?<a href={safeHref(config.ctaHref,'/webaruhaz')} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'.75rem 1rem',border:'1px solid currentColor',borderRadius:'.65rem',color:'inherit',textDecoration:'none',fontWeight:800}}>{text(config.ctaLabel)}</a>:null}
    </div>
  </section>;
}

export function createStorefrontGrowthMarketingRendererRegistry(){
  return new StorefrontRendererRegistry().register('marketing.promotion-banner',1,PromotionBannerRenderer);
}
