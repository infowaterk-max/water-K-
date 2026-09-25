import type{CSSProperties}from'react';
import {StorefrontRendererRegistry,type StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {StorefrontSupportContactFormClient} from '@/components/builder/storefront-support-contact-form-client';

const text=(value:unknown,fallback='')=>typeof value==='string'&&value.trim()?value:fallback;
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const safeMapEmbed=(value:unknown)=>{const raw=text(value);if(!raw)return'';try{const url=new URL(raw);return url.protocol==='https:'&&['www.google.com','maps.google.com'].includes(url.hostname)&&url.pathname.startsWith('/maps')?url.toString():''}catch{return''}};
const safeMapLink=(value:unknown)=>{const raw=text(value);if(!raw)return'';try{const url=new URL(raw);return url.protocol==='https:'&&['www.google.com','maps.google.com'].includes(url.hostname)?url.toString():''}catch{return''}};

function ContactForm({config,node}:StorefrontComponentRenderProps){
  return <StorefrontSupportContactFormClient config={config} gridSpan={node.resolved.gridSpan}/>;
}

function LocationMap({config,node}:StorefrontComponentRenderProps){
  const embedUrl=safeMapEmbed(config.embedUrl);
  const linkUrl=safeMapLink(config.linkUrl);
  const height=text(config.height,'24rem');
  const authoredStyle=record(config.style) as CSSProperties;
  return <section data-storefront-support="location-map" style={{gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`,display:'grid',gap:'.7rem',minWidth:0,...authoredStyle}}>
    <div style={{display:'grid',gap:'.25rem'}}>
      <strong>{text(config.title,'Térkép')}</strong>
      {text(config.address)?<span style={{opacity:.78,fontSize:'.9rem'}}>{text(config.address)}</span>:null}
    </div>
    {embedUrl?<iframe data-storefront-location-map="google-embed" src={embedUrl} title={text(config.title,'Térkép')} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen style={{display:'block',width:'100%',height,border:0,borderRadius:'inherit',background:'var(--shoporation-color-surface,#17191a)'}}/>:<div role="status" style={{minHeight:height,display:'grid',placeItems:'center',border:'1px solid var(--shoporation-color-border,#393a35)',borderRadius:'inherit'}}>A térkép nincs beállítva.</div>}
    {linkUrl?<a href={linkUrl} target="_blank" rel="noreferrer" style={{width:'fit-content',color:'inherit',fontWeight:750}}>{text(config.linkLabel,'Megnyitás Google Térképen')}</a>:null}
  </section>;
}

export function createStorefrontSupportRendererRegistry(){
  return new StorefrontRendererRegistry()
    .register('support.contact-form',1,ContactForm)
    .register('support.location-map',1,LocationMap);
}
