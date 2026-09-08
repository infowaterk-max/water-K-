import type {CSSProperties,ReactNode} from 'react';
import {
  type StorefrontComponentRenderProps,
} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontCoreCommerceRendererRegistry} from '@/components/builder/storefront-commerce';
import type {StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_EDITORIAL_RENDERERS_VERSION='shoporation.storefront-editorial-renderers.v1' as const;

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const number=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const record=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const rows=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.flatMap(item=>{const row=record(item);return row?[row]:[]}):[];
const gridSpanStyle=(node:StorefrontResolvedComponentNode):CSSProperties=>({gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`});

const safeHref=(value:unknown,fallback='#')=>{
  if(typeof value!=='string'||!value.trim())return fallback;
  const href=value.trim();
  if(href.startsWith('/')||href.startsWith('#')||href.startsWith('https://')||href.startsWith('mailto:')||href.startsWith('tel:'))return href;
  return fallback;
};

const safeImageSrc=(value:unknown)=>{
  if(typeof value!=='string'||!value.trim())return null;
  const src=value.trim();
  if(src.startsWith('/')||src.startsWith('https://'))return src;
  return null;
};

const editorialButton=(label:unknown,href:unknown,primary=true)=>{
  const content=text(label);
  if(!content)return null;
  return <a href={safeHref(href)} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'0.85rem 1.15rem',border:primary?'1px solid var(--shoporation-color-primary, #171717)':'1px solid var(--shoporation-color-border, #aaa)',background:primary?'var(--shoporation-color-primary, #171717)':'transparent',color:primary?'var(--shoporation-color-primary-contrast, #fff)':'inherit',textDecoration:'none',fontWeight:600}}>{content}</a>;
};

function EditorialHeroRenderer({config,node}:StorefrontComponentRenderProps){
  const image=safeImageSrc(config.image);
  const imagePosition=text(config.imagePosition,'right')==='left'?'left':'right';
  const visual=<div style={{minHeight:'clamp(24rem,55vw,46rem)',background:'var(--shoporation-color-surface-muted, #e9e1d8)',overflow:'hidden'}}>{image?<img src={image} alt={text(config.imageAlt)} loading="eager" style={{width:'100%',height:'100%',minHeight:'inherit',display:'block',objectFit:'cover'}}/>:null}</div>;
  const copy=<div style={{display:'flex',flexDirection:'column',justifyContent:'center',gap:'1.25rem',padding:'clamp(2rem,6vw,6rem)'}}>
    {text(config.eyebrow)?<small style={{letterSpacing:'0.16em',textTransform:'uppercase'}}>{text(config.eyebrow)}</small>:null}
    <h1 style={{margin:0,fontFamily:'var(--shoporation-heading-font, Georgia, serif)',fontSize:'clamp(3rem,7vw,7rem)',fontWeight:500,lineHeight:0.9,letterSpacing:'-0.035em'}}>{text(config.title,'Monarche')}</h1>
    {text(config.copy)?<p style={{margin:0,maxWidth:'36rem',lineHeight:1.75,color:'var(--shoporation-color-muted-text, #555)',fontSize:'1.05rem'}}>{text(config.copy)}</p>:null}
    <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>{editorialButton(config.primaryLabel,config.primaryHref,true)}{editorialButton(config.secondaryLabel,config.secondaryHref,false)}</div>
  </div>;
  return <section data-storefront-editorial="hero" style={{...gridSpanStyle(node),display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%, 32rem),1fr))',background:'var(--shoporation-color-background, #f6f2ec)'}}>{imagePosition==='left'?<>{visual}{copy}</>:<>{copy}{visual}</>}</section>;
}

function EditorialSplitFeatureRenderer({config,node}:StorefrontComponentRenderProps){
  const image=safeImageSrc(config.image);
  const imagePosition=text(config.imagePosition,'left')==='right'?'right':'left';
  const visual=<div style={{minHeight:'30rem',background:'var(--shoporation-color-surface-muted, #e9e1d8)',overflow:'hidden'}}>{image?<img src={image} alt={text(config.imageAlt)} loading="lazy" style={{width:'100%',height:'100%',minHeight:'inherit',display:'block',objectFit:'cover'}}/>:null}</div>;
  const copy=<div style={{display:'flex',flexDirection:'column',justifyContent:'center',gap:'1rem',padding:'clamp(2rem,5vw,5rem)'}}>
    {text(config.eyebrow)?<small style={{letterSpacing:'0.14em',textTransform:'uppercase'}}>{text(config.eyebrow)}</small>:null}
    <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font, Georgia, serif)',fontSize:'clamp(2.25rem,5vw,4.5rem)',fontWeight:500,lineHeight:1}}>{text(config.title,'Editorial feature')}</h2>
    {text(config.copy)?<p style={{margin:0,maxWidth:'34rem',lineHeight:1.75,color:'var(--shoporation-color-muted-text, #555)'}}>{text(config.copy)}</p>:null}
    {editorialButton(config.ctaLabel,config.ctaHref,false)}
  </div>;
  return <section data-storefront-editorial="split-feature" style={{...gridSpanStyle(node),display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%, 30rem),1fr))',background:text(config.tone)==='surface'?'var(--shoporation-color-surface, #efe9e2)':'transparent'}}>{imagePosition==='left'?<>{visual}{copy}</>:<>{copy}{visual}</>}</section>;
}

function JournalPreviewRenderer({config,node}:StorefrontComponentRenderProps){
  const items=rows(config.items);
  const columns=Math.max(2,Math.min(4,Math.round(number(config.columns,3))));
  return <section data-storefront-editorial="journal-preview" style={{...gridSpanStyle(node),display:'grid',gap:'1.5rem'}}>
    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:'1rem'}}><h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font, Georgia, serif)',fontSize:'clamp(2rem,4vw,3.5rem)',fontWeight:500}}>{text(config.title,'Journal')}</h2></div>
    {items.length?<div style={{display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%, ${Math.max(220,Math.round(960/columns))}px),1fr))`,gap:'1.25rem'}}>{items.map((item,index)=>{
      const href=safeHref(item.href,'#');
      const image=safeImageSrc(item.image);
      return <article key={`${href}:${index}`} style={{display:'grid',gap:'0.75rem'}}><a href={href} style={{color:'inherit',textDecoration:'none'}}>{image?<img src={image} alt={text(item.imageAlt,text(item.title))} loading="lazy" style={{width:'100%',aspectRatio:'4 / 3',objectFit:'cover',display:'block'}}/>:<div style={{aspectRatio:'4 / 3',background:'var(--shoporation-color-surface-muted, #e9e1d8)'}}/>}</a>{text(item.eyebrow)?<small style={{letterSpacing:'0.12em',textTransform:'uppercase'}}>{text(item.eyebrow)}</small>:null}<h3 style={{margin:0,fontFamily:'var(--shoporation-heading-font, Georgia, serif)',fontSize:'1.5rem',fontWeight:500}}><a href={href} style={{color:'inherit',textDecoration:'none'}}>{text(item.title,'Történet')}</a></h3>{text(item.excerpt)?<p style={{margin:0,color:'var(--shoporation-color-muted-text, #555)',lineHeight:1.6}}>{text(item.excerpt)}</p>:null}</article>;
    })}</div>:<p>{text(config.emptyLabel,'A journal hamarosan új történetekkel jelentkezik.')}</p>}
  </section>;
}

function NewsletterSignupRenderer({config,node}:StorefrontComponentRenderProps){
  const action=safeHref(config.actionHref,'#');
  return <section data-storefront-marketing="newsletter-signup" style={{...gridSpanStyle(node),display:'grid',gap:'1rem',justifyItems:'center',textAlign:'center',padding:'clamp(3rem,8vw,7rem) 1.5rem',background:text(config.tone)==='primary'?'var(--shoporation-color-primary, #171717)':'var(--shoporation-color-surface, #eee8e1)',color:text(config.tone)==='primary'?'var(--shoporation-color-primary-contrast, #fff)':'inherit'}}>
    {text(config.eyebrow)?<small style={{letterSpacing:'0.14em',textTransform:'uppercase'}}>{text(config.eyebrow)}</small>:null}
    <h2 style={{margin:0,maxWidth:'48rem',fontFamily:'var(--shoporation-heading-font, Georgia, serif)',fontSize:'clamp(2.25rem,5vw,4.5rem)',fontWeight:500}}>{text(config.title,'Maradj közel')}</h2>
    {text(config.copy)?<p style={{margin:0,maxWidth:'42rem',lineHeight:1.7}}>{text(config.copy)}</p>:null}
    <form action={action} method="post" style={{display:'flex',width:'min(100%, 34rem)',marginTop:'0.5rem'}}>
      <label style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0 0 0 0)'}} htmlFor={`newsletter-${node.id}`}>{text(config.inputLabel,'E-mail-cím')}</label>
      <input id={`newsletter-${node.id}`} name="email" type="email" autoComplete="email" required placeholder={text(config.inputLabel,'E-mail-cím')} style={{minWidth:0,flex:1,padding:'0.9rem 1rem',border:'1px solid currentColor',background:'transparent',color:'inherit'}}/>
      <button type="submit" style={{padding:'0.9rem 1.15rem',border:'1px solid currentColor',background:'transparent',color:'inherit',fontWeight:600}}>{text(config.buttonLabel,'Feliratkozom')}</button>
    </form>
    {text(config.consentLabel)?<small style={{maxWidth:'34rem',opacity:0.75}}>{text(config.consentLabel)}</small>:null}
  </section>;
}

type FooterItem={label:string;href:string};
const footerColumns=(value:unknown)=>rows(value).map((column,index)=>({
  id:text(column.id,`footer-${index}`),
  title:text(column.title),
  items:rows(column.items).map(item=>({label:text(item.label),href:safeHref(item.href,'#')} satisfies FooterItem)).filter(item=>item.label),
}));

function EditorialFooterRenderer({config,node}:StorefrontComponentRenderProps){
  const columns=footerColumns(config.columns);
  return <footer data-storefront-editorial="footer" style={{...gridSpanStyle(node),padding:'clamp(2.5rem,6vw,5rem) clamp(1rem,4vw,3rem)',background:text(config.tone)==='primary'?'var(--shoporation-color-primary, #171717)':'var(--shoporation-color-background, #f6f2ec)',color:text(config.tone)==='primary'?'var(--shoporation-color-primary-contrast, #fff)':'inherit',borderTop:'1px solid var(--shoporation-color-border, #d8d1c7)'}}>
    <div style={{maxWidth:'1440px',marginInline:'auto',display:'grid',gap:'2.5rem'}}>
      <strong style={{fontFamily:'var(--shoporation-heading-font, Georgia, serif)',fontSize:'1.6rem',fontWeight:500}}>{text(config.brandLabel,'Monarche')}</strong>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(10rem,1fr))',gap:'2rem'}}>{columns.map(column=><nav key={column.id} aria-label={column.title||undefined} style={{display:'grid',gap:'0.65rem',alignContent:'start'}}>{column.title?<strong>{column.title}</strong>:null}{column.items.map(item=><a key={`${item.href}:${item.label}`} href={item.href} style={{color:'inherit',textDecoration:'none',opacity:0.82}}>{item.label}</a>)}</nav>)}</div>
      <small style={{opacity:0.7}}>{text(config.copyright,'© Monarche')}</small>
    </div>
  </footer>;
}

const RENDERERS:readonly [string,number,(props:StorefrontComponentRenderProps)=>ReactNode][]=[
  ['editorial.hero',1,EditorialHeroRenderer],
  ['editorial.split-feature',1,EditorialSplitFeatureRenderer],
  ['editorial.journal-preview',1,JournalPreviewRenderer],
  ['marketing.newsletter-signup',1,NewsletterSignupRenderer],
  ['editorial.footer',1,EditorialFooterRenderer],
] as const;

export function createStorefrontEditorialRendererRegistry(){
  const registry=createStorefrontCoreCommerceRendererRegistry();
  for(const[componentKey,componentVersion,renderer]of RENDERERS)registry.register(componentKey,componentVersion,renderer);
  return registry;
}
