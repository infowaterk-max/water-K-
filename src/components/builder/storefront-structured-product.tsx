import type {CSSProperties,ReactNode} from 'react';
import type {StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontEditorialRendererRegistry} from '@/components/builder/storefront-editorial';
import type {StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_STRUCTURED_PRODUCT_RENDERERS_VERSION='shoporation.storefront-structured-product-renderers.v1' as const;

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const number=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const bool=(value:unknown,fallback=false)=>typeof value==='boolean'?value:fallback;
const record=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const rows=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.flatMap(item=>{const row=record(item);return row?[row]:[]}):[];
const gridSpanStyle=(node:StorefrontResolvedComponentNode):CSSProperties=>({gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`});
const safeHref=(value:unknown,fallback='#')=>{if(typeof value!=='string'||!value.trim())return fallback;const href=value.trim();return href.startsWith('/')||href.startsWith('#')||href.startsWith('https://')||href.startsWith('mailto:')||href.startsWith('tel:')?href:fallback;};
const safeImageSrc=(value:unknown)=>{if(typeof value!=='string'||!value.trim())return null;const src=value.trim();return src.startsWith('/')||src.startsWith('https://')?src:null;};
const money=(value:unknown,currency='HUF')=>typeof value==='string'?value:typeof value==='number'&&Number.isFinite(value)?new Intl.NumberFormat('hu-HU',{style:'currency',currency,maximumFractionDigits:currency==='HUF'?0:2}).format(value):'';

function OptionSelectorRenderer({config,node}:StorefrontComponentRenderProps){
  const options=rows(config.options);
  return <fieldset data-storefront-structured="option-selector" style={{...gridSpanStyle(node),border:0,padding:0,margin:0,display:'grid',gap:'0.65rem'}}>
    <legend style={{fontWeight:650}}>{text(config.label,'Opció')}</legend>
    <div style={{display:'flex',gap:'0.55rem',flexWrap:'wrap'}}>{options.map((option,index)=>{
      const label=text(option.label,text(option.value,`Opció ${index+1}`));
      const available=option.available!==false;const selected=option.selected===true;const href=safeHref(option.href,'');
      const style:CSSProperties={display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'0.7rem 0.9rem',border:selected?'2px solid var(--shoporation-color-text, #111)':'1px solid var(--shoporation-color-border, #ccc)',borderRadius:'0.55rem',background:selected?'var(--shoporation-color-surface, #f3f3f3)':'transparent',color:'inherit',textDecoration:available?'none':'line-through',opacity:available?1:0.38};
      return available&&href?<a key={text(option.id,`${index}`)} href={href} aria-current={selected?'true':undefined} style={style}>{label}</a>:<span key={text(option.id,`${index}`)} aria-disabled={available?undefined:'true'} aria-current={selected?'true':undefined} style={style}>{label}</span>;
    })}</div>
  </fieldset>;
}

function KeySpecsRenderer({config,node}:StorefrontComponentRenderProps){
  const items=rows(config.items);const columns=Math.max(2,Math.min(4,Math.round(number(config.columns,2))));
  return <section data-storefront-structured="key-specs" style={{...gridSpanStyle(node),display:'grid',gap:'1rem'}}>
    {text(config.title)?<h2 style={{margin:0,fontSize:'1rem'}}>{text(config.title)}</h2>:null}
    <dl style={{margin:0,display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%, ${Math.round(520/columns)}px),1fr))`,gap:'0.75rem'}}>{items.map((item,index)=><div key={text(item.specKey,`${index}`)} style={{padding:'0.85rem 1rem',borderRadius:'0.75rem',background:'var(--shoporation-color-surface, #f4f5f6)'}}><dt style={{fontSize:'0.8rem',color:'var(--shoporation-color-muted-text, #666)'}}>{text(item.label)}</dt><dd title={item.missing===true?text(item.missingLabel,text(config.missingLabel,'Nincs megadva')):undefined} style={{margin:'0.25rem 0 0',fontWeight:650}}>{text(item.displayValue,'—')}</dd></div>)}</dl>
  </section>;
}

function SpecificationGroupsRenderer({config,node}:StorefrontComponentRenderProps){
  const groups=rows(config.groups);
  return <section data-storefront-structured="specification-groups" style={{...gridSpanStyle(node),display:'grid',gap:'1.5rem'}}>
    <h2 style={{margin:0,fontSize:'clamp(1.7rem,3vw,2.4rem)'}}>{text(config.title,'Műszaki adatok')}</h2>
    {groups.map((group,index)=><section key={text(group.groupKey,`${index}`)} style={{display:'grid',gap:'0.65rem'}}><h3 style={{margin:0,fontSize:'1rem'}}>{text(group.label,'Specifikáció')}</h3><dl style={{margin:0,borderTop:'1px solid var(--shoporation-color-border, #ddd)'}}>{rows(group.rows).map((item,rowIndex)=><div key={text(item.specKey,`${rowIndex}`)} style={{display:'grid',gridTemplateColumns:'minmax(10rem,1fr) minmax(0,1.4fr)',gap:'1rem',padding:'0.75rem 0',borderBottom:'1px solid var(--shoporation-color-border, #ddd)'}}><dt style={{color:'var(--shoporation-color-muted-text, #666)'}}>{text(item.label)}</dt><dd title={item.missing===true?text(item.missingLabel,text(config.missingLabel,'Nincs megadva')):undefined} style={{margin:0,fontWeight:550}}>{text(item.displayValue,'—')}</dd></div>)}</dl></section>)}
  </section>;
}

function CompareButtonRenderer({config,node}:StorefrontComponentRenderProps){
  const disabled=bool(config.disabled,false);const count=Math.max(0,Math.round(number(config.count,0)));const label=text(config.label,'Összehasonlítás');
  return <div data-storefront-structured="compare-button" style={gridSpanStyle(node)}>{disabled?<span aria-disabled="true" style={{display:'inline-flex',padding:'0.7rem 0.9rem',border:'1px solid var(--shoporation-color-border, #ccc)',borderRadius:'999px',opacity:0.45}}>{label}</span>:<a href={safeHref(config.href,'#compare')} style={{display:'inline-flex',gap:'0.45rem',padding:'0.7rem 0.9rem',border:'1px solid var(--shoporation-color-border, #ccc)',borderRadius:'999px',color:'inherit',textDecoration:'none'}}>{label}{count?<span>({count})</span>:null}</a>}</div>;
}

function CompareTrayRenderer({config,node}:StorefrontComponentRenderProps){
  const items=rows(config.items);const maxItems=Math.max(2,Math.min(6,Math.round(number(config.maxItems,4))));
  return <aside data-storefront-structured="compare-tray" style={{...gridSpanStyle(node),display:'grid',gap:'0.8rem',padding:'1rem',border:'1px solid var(--shoporation-color-border, #ddd)',borderRadius:'1rem'}}><strong>{text(config.title,'Összehasonlítás')}</strong>{items.length?<div style={{display:'flex',gap:'0.6rem',flexWrap:'wrap'}}>{items.slice(0,maxItems).map((item,index)=><span key={text(item.id,`${index}`)} style={{padding:'0.45rem 0.65rem',background:'var(--shoporation-color-surface, #f4f5f6)',borderRadius:'999px'}}>{text(item.label,'Termék')}</span>)}</div>:<small>{text(config.emptyLabel,'Válassz legalább két terméket.')}</small>}<a href={safeHref(config.compareHref,'#compare')} style={{color:'inherit',fontWeight:650}}>{text(config.compareLabel,'Termékek összevetése')}</a></aside>;
}

function CompareTableRenderer({config,node}:StorefrontComponentRenderProps){
  const products=rows(config.products);const groups=rows(config.groups);
  return <section data-storefront-structured="compare-table" style={{...gridSpanStyle(node),display:'grid',gap:'1.25rem',overflowX:'auto'}}><h1 style={{margin:0,fontSize:'clamp(2rem,4vw,3.5rem)'}}>{text(config.title,'Összehasonlítás')}</h1><table style={{borderCollapse:'collapse',minWidth:`${Math.max(680,products.length*190+220)}px`,width:'100%'}}><thead><tr><th style={{textAlign:'left',padding:'0.75rem'}}>Tulajdonság</th>{products.map((product,index)=><th key={text(product.id,`${index}`)} style={{textAlign:'left',padding:'0.75rem'}}><a href={safeHref(product.href,'#')} style={{color:'inherit',textDecoration:'none'}}>{text(product.label,'Termék')}</a></th>)}</tr></thead><tbody>{groups.flatMap((group,groupIndex)=>[<tr key={`group-${text(group.groupKey,`${groupIndex}`)}`}><th colSpan={products.length+1} style={{textAlign:'left',padding:'1rem 0.75rem',background:'var(--shoporation-color-surface, #f4f5f6)'}}>{text(group.label,'Specifikáció')}</th></tr>,...rows(group.rows).filter(row=>!bool(config.differencesOnly,false)||row.hasDifference===true).map((row,rowIndex)=><tr key={`${text(group.groupKey)}-${text(row.specKey,`${rowIndex}`)}`}><th style={{textAlign:'left',fontWeight:550,padding:'0.75rem',borderBottom:'1px solid var(--shoporation-color-border, #ddd)'}}>{text(row.label)}</th>{rows(row.cells).map((cell,cellIndex)=><td key={`${text(cell.itemId)}-${cellIndex}`} title={cell.missing===true?text(cell.missingLabel,text(config.missingLabel,'Nincs megadva')):undefined} style={{padding:'0.75rem',borderBottom:'1px solid var(--shoporation-color-border, #ddd)',fontWeight:row.hasDifference===true?650:400}}>{text(cell.displayValue,'—')}</td>)}</tr>)] )}</tbody></table></section>;
}

function TechnicalDocumentsRenderer({config,node}:StorefrontComponentRenderProps){
  const documents=rows(config.documents);
  return <section data-storefront-structured="technical-documents" style={{...gridSpanStyle(node),display:'grid',gap:'1rem'}}><h2 style={{margin:0,fontSize:'1.5rem'}}>{text(config.title,'Dokumentumok')}</h2>{documents.length?<div style={{display:'grid',gap:'0.65rem'}}>{documents.flatMap((document,index)=>{const href=safeHref(document.href,'');if(!href)return[];return[<a key={text(document.id,`${index}`)} href={href} style={{display:'flex',justifyContent:'space-between',gap:'1rem',padding:'0.8rem 0',borderBottom:'1px solid var(--shoporation-color-border, #ddd)',color:'inherit',textDecoration:'none'}}><span>{text(document.displayLabel,text(document.label,'Dokumentum'))}</span><span aria-hidden="true">↗</span></a>];})}</div>:<p>{text(config.emptyLabel,'Ehhez a termékhez nincs letölthető dokumentum.')}</p>}</section>;
}

function CatalogFacetsRenderer({config,node}:StorefrontComponentRenderProps){
  const facets=rows(config.facets);
  return <aside data-storefront-structured="catalog-facets" style={{...gridSpanStyle(node),display:'grid',gap:'1.25rem',alignContent:'start'}}><div style={{display:'flex',justifyContent:'space-between',gap:'1rem'}}><strong>{text(config.title,'Szűrés')}</strong>{text(config.clearLabel)?<a href={safeHref(config.clearHref,'#')} style={{color:'inherit'}}>{text(config.clearLabel)}</a>:null}</div>{facets.map((facet,index)=><section key={text(facet.specKey,`${index}`)} style={{display:'grid',gap:'0.5rem'}}><strong style={{fontSize:'0.9rem'}}>{text(facet.label)}</strong><div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>{rows(facet.options).map((option,optionIndex)=>{const label=`${text(option.label)}${typeof option.count==='number'?` (${option.count})`:''}`;const href=safeHref(option.href,'');return href?<a key={text(option.key,`${optionIndex}`)} href={href} aria-current={option.selected===true?'true':undefined} style={{padding:'0.45rem 0.65rem',border:'1px solid var(--shoporation-color-border, #ccc)',borderRadius:'999px',color:'inherit',textDecoration:'none',background:option.selected===true?'var(--shoporation-color-surface, #f4f5f6)':'transparent'}}>{label}</a>:<span key={text(option.key,`${optionIndex}`)} style={{padding:'0.45rem 0.65rem',border:'1px solid var(--shoporation-color-border, #ccc)',borderRadius:'999px'}}>{label}</span>;})}</div></section>)}</aside>;
}

function CompareSpotlightRenderer({config,node}:StorefrontComponentRenderProps){
  const products=rows(config.products);const compareRows=rows(config.rows).slice(0,4);
  return <section data-storefront-structured="compare-spotlight" style={{...gridSpanStyle(node),display:'grid',gap:'1.5rem',padding:'clamp(1.5rem,4vw,3rem)',borderRadius:'1.5rem',background:'var(--shoporation-color-surface, #f4f5f6)'}}><div style={{display:'grid',gap:'0.6rem'}}><h2 style={{margin:0,fontSize:'clamp(2rem,4vw,3.5rem)',letterSpacing:'-0.03em'}}>{text(config.title,'Hasonlítsd össze')}</h2>{text(config.copy)?<p style={{margin:0,maxWidth:'44rem',color:'var(--shoporation-color-muted-text, #666)'}}>{text(config.copy)}</p>:null}</div><div style={{display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%, 14rem),1fr))`,gap:'0.75rem'}}>{products.map((product,index)=><div key={text(product.id,`${index}`)} style={{padding:'1rem',background:'var(--shoporation-color-background, #fff)',borderRadius:'1rem'}}><strong>{text(product.label,'Termék')}</strong>{text(product.subtitle)?<small style={{display:'block',marginTop:'0.25rem',color:'var(--shoporation-color-muted-text, #666)'}}>{text(product.subtitle)}</small>:null}</div>)}</div>{compareRows.length?<div style={{display:'grid',gap:'0.35rem'}}>{compareRows.map((row,index)=><div key={text(row.specKey,`${index}`)} style={{display:'flex',justifyContent:'space-between',gap:'1rem',padding:'0.55rem 0',borderBottom:'1px solid var(--shoporation-color-border, #ddd)'}}><span>{text(row.label)}</span><strong>{text(row.summary,text(row.displayValue))}</strong></div>)}</div>:null}{text(config.ctaLabel)?<a href={safeHref(config.ctaHref,'#compare')} style={{justifySelf:'start',color:'inherit',fontWeight:650}}>{text(config.ctaLabel)}</a>:null}</section>;
}

function ProductLaunchHeroRenderer({config,node}:StorefrontComponentRenderProps){
  const image=safeImageSrc(config.image);const price=money(config.price);const compareAt=money(config.compareAtPrice);
  const copy=<div style={{display:'flex',flexDirection:'column',justifyContent:'center',gap:'1rem',padding:'clamp(2rem,6vw,6rem)'}}>{text(config.eyebrow)?<small style={{textTransform:'uppercase',letterSpacing:'0.14em'}}>{text(config.eyebrow)}</small>:null}{text(config.badge)?<span style={{alignSelf:'flex-start',padding:'0.3rem 0.55rem',borderRadius:'999px',background:'var(--shoporation-color-accent-soft, #e8f1ff)',fontSize:'0.75rem',fontWeight:650}}>{text(config.badge)}</span>:null}<h1 style={{margin:0,fontSize:'clamp(3rem,7vw,6.5rem)',lineHeight:0.92,letterSpacing:'-0.055em',fontWeight:700}}>{text(config.title,'Új technológia')}</h1>{text(config.copy)?<p style={{margin:0,maxWidth:'38rem',fontSize:'1.05rem',lineHeight:1.65,color:'var(--shoporation-color-muted-text, #5f6368)'}}>{text(config.copy)}</p>:null}<div style={{display:'flex',gap:'0.7rem',alignItems:'baseline'}}>{price?<strong style={{fontSize:'1.25rem'}}>{price}</strong>:null}{compareAt?<span style={{textDecoration:'line-through',color:'var(--shoporation-color-muted-text, #777)'}}>{compareAt}</span>:null}</div><div style={{display:'flex',gap:'0.65rem',flexWrap:'wrap'}}>{text(config.primaryLabel)?<a href={safeHref(config.primaryHref,'#')} style={{padding:'0.8rem 1rem',borderRadius:'999px',background:'var(--shoporation-color-primary, #111)',color:'var(--shoporation-color-primary-contrast, #fff)',textDecoration:'none',fontWeight:650}}>{text(config.primaryLabel)}</a>:null}{text(config.secondaryLabel)?<a href={safeHref(config.secondaryHref,'#')} style={{padding:'0.8rem 1rem',borderRadius:'999px',border:'1px solid var(--shoporation-color-border, #ccc)',color:'inherit',textDecoration:'none',fontWeight:650}}>{text(config.secondaryLabel)}</a>:null}</div></div>;
  const visual=<div style={{minHeight:'clamp(26rem,55vw,48rem)',background:'var(--shoporation-color-surface, #f3f5f7)',overflow:'hidden'}}>{image?<img src={image} alt={text(config.imageAlt)} loading="eager" style={{width:'100%',height:'100%',minHeight:'inherit',objectFit:'cover',display:'block'}}/>:null}</div>;
  return <section data-storefront-structured="product-launch-hero" style={{...gridSpanStyle(node),display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%, 32rem),1fr))',background:'var(--shoporation-color-background, #fff)'}}>{copy}{visual}</section>;
}

const RENDERERS:readonly [string,number,(props:StorefrontComponentRenderProps)=>ReactNode][]=[
  ['commerce.option-selector',1,OptionSelectorRenderer],
  ['commerce.key-specs',1,KeySpecsRenderer],
  ['commerce.specification-groups',1,SpecificationGroupsRenderer],
  ['commerce.compare-button',1,CompareButtonRenderer],
  ['commerce.compare-tray',1,CompareTrayRenderer],
  ['commerce.compare-table',1,CompareTableRenderer],
  ['commerce.technical-documents',1,TechnicalDocumentsRenderer],
  ['commerce.catalog-facets',1,CatalogFacetsRenderer],
  ['commerce.compare-spotlight',1,CompareSpotlightRenderer],
  ['commerce.product-launch-hero',1,ProductLaunchHeroRenderer],
] as const;

export function createStorefrontStructuredProductRendererRegistry(){
  const registry=createStorefrontEditorialRendererRegistry();
  for(const[componentKey,componentVersion,renderer]of RENDERERS)registry.register(componentKey,componentVersion,renderer);
  return registry;
}
