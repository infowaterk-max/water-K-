import type {CSSProperties,ReactNode} from 'react';
import {
  StorefrontRendererRegistry,
  type StorefrontComponentRenderProps,
} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontPrimitiveRendererRegistry} from '@/components/builder/storefront-primitives';
import type {StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_CORE_COMMERCE_RENDERERS_VERSION='shoporation.storefront-core-commerce-renderers.v1' as const;

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const number=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const bool=(value:unknown,fallback=false)=>typeof value==='boolean'?value:fallback;
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

const money=(value:unknown,currencyValue:unknown='HUF')=>{
  if(typeof value==='string'&&value.trim())return value.trim();
  if(typeof value!=='number'||!Number.isFinite(value))return '';
  const currency=typeof currencyValue==='string'&&/^[A-Z]{3}$/.test(currencyValue)?currencyValue:'HUF';
  return new Intl.NumberFormat('hu-HU',{style:'currency',currency,maximumFractionDigits:currency==='HUF'?0:2}).format(value);
};

const sectionTitle=(value:unknown)=>text(value).trim();

type CommerceProduct={
  id:string;
  name:string;
  href:string;
  image:string|null;
  imageAlt:string;
  price:unknown;
  compareAtPrice:unknown;
  badge:string;
  stockLabel:string;
};

const commerceProducts=(value:unknown):CommerceProduct[]=>rows(value).map((row,index)=>({
  id:text(row.id,`product-${index}`),
  name:text(row.name,'Termék'),
  href:safeHref(row.href,'#'),
  image:safeImageSrc(row.image),
  imageAlt:text(row.imageAlt,text(row.name,'Termék')),
  price:row.price,
  compareAtPrice:row.compareAtPrice,
  badge:text(row.badge),
  stockLabel:text(row.stockLabel),
}));

const productCards=(products:CommerceProduct[],config:Record<string,unknown>)=>{
  const showBadges=bool(config.showBadges,true);
  const showCompareAt=bool(config.showCompareAt,true);
  const presentation=text(config.presentation,'standard');
  return products.map(product=><article key={product.id} data-storefront-commerce-card={presentation} style={{display:'flex',flexDirection:'column',gap:'0.75rem',minWidth:0}}>
    <a href={product.href} style={{color:'inherit',textDecoration:'none'}}>
      <div style={{position:'relative',background:'var(--shoporation-color-surface-muted, #eee9e2)',aspectRatio:text(config.imageRatio,'4 / 5'),overflow:'hidden'}}>
        {product.image?<img src={product.image} alt={product.imageAlt} loading="lazy" style={{display:'block',width:'100%',height:'100%',objectFit:'cover'}}/>:<div aria-hidden="true" style={{width:'100%',height:'100%',background:'linear-gradient(145deg, var(--shoporation-color-surface, #f6f2ec), var(--shoporation-color-border, #d8d1c7))'}}/>}
        {showBadges&&product.badge?<span style={{position:'absolute',top:'0.75rem',left:'0.75rem',background:'var(--shoporation-color-background, #fff)',padding:'0.3rem 0.55rem',fontSize:'0.75rem',letterSpacing:'0.04em'}}>{product.badge}</span>:null}
      </div>
    </a>
    <div style={{display:'grid',gap:'0.3rem'}}>
      <a href={product.href} style={{color:'inherit',textDecoration:'none',fontWeight:600}}>{product.name}</a>
      <div style={{display:'flex',gap:'0.5rem',alignItems:'baseline',flexWrap:'wrap'}}>
        <strong>{money(product.price,config.currency)}</strong>
        {showCompareAt&&product.compareAtPrice?<span style={{color:'var(--shoporation-color-muted-text, #6b6b6b)',textDecoration:'line-through',fontSize:'0.9em'}}>{money(product.compareAtPrice,config.currency)}</span>:null}
      </div>
      {product.stockLabel?<small style={{color:'var(--shoporation-color-muted-text, #6b6b6b)'}}>{product.stockLabel}</small>:null}
    </div>
  </article>);
};

function CollectionNavigationRenderer({config,node}:StorefrontComponentRenderProps){
  const items=rows(config.items);
  const columns=Math.max(2,Math.min(6,Math.round(number(config.columns,4))));
  return <section data-storefront-commerce="collection-navigation" style={{...gridSpanStyle(node),display:'grid',gap:'1.5rem'}}>
    {sectionTitle(config.title)?<h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font, serif)',fontWeight:500}}>{sectionTitle(config.title)}</h2>:null}
    <div style={{display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%, ${Math.max(150,Math.round(900/columns))}px),1fr))`,gap:'1rem'}}>
      {items.map((item,index)=>{
        const href=safeHref(item.href,'#');
        const image=safeImageSrc(item.image);
        const label=text(item.label,`Kollekció ${index+1}`);
        return <a key={`${href}:${label}:${index}`} href={href} style={{color:'inherit',textDecoration:'none',display:'grid',gap:'0.65rem'}}>
          <div style={{background:'var(--shoporation-color-surface-muted, #eee9e2)',aspectRatio:text(config.imageRatio,'4 / 5'),overflow:'hidden'}}>
            {image?<img src={image} alt={text(item.imageAlt,label)} loading="lazy" style={{display:'block',width:'100%',height:'100%',objectFit:'cover'}}/>:null}
          </div>
          <span style={{display:'flex',justifyContent:'space-between',gap:'1rem'}}><strong>{label}</strong><span aria-hidden="true">↗</span></span>
        </a>;
      })}
    </div>
  </section>;
}

function CollectionHeaderRenderer({config,node}:StorefrontComponentRenderProps){
  const image=safeImageSrc(config.image);
  const align=text(config.align,'left')==='center'?'center':'left';
  return <header data-storefront-commerce="collection-header" style={{...gridSpanStyle(node),display:'grid',gap:'1rem',textAlign:align,paddingBlock:'clamp(2rem,6vw,6rem)'}}>
    {text(config.eyebrow)?<small style={{letterSpacing:'0.14em',textTransform:'uppercase'}}>{text(config.eyebrow)}</small>:null}
    <h1 style={{margin:0,fontFamily:'var(--shoporation-heading-font, serif)',fontSize:'clamp(2.4rem,6vw,5.5rem)',fontWeight:500,lineHeight:0.95}}>{text(config.title,'Kollekció')}</h1>
    {text(config.description)?<p style={{margin:align==='center'?'0 auto':'0',maxWidth:'52rem',color:'var(--shoporation-color-muted-text, #666)',fontSize:'1.05rem',lineHeight:1.7}}>{text(config.description)}</p>:null}
    {image?<img src={image} alt={text(config.imageAlt)} loading="eager" style={{display:'block',width:'100%',maxHeight:'42rem',objectFit:'cover',marginTop:'1rem'}}/>:null}
  </header>;
}

function ProductGridRenderer({config,node}:StorefrontComponentRenderProps){
  const products=commerceProducts(config.products);
  const columns=Math.max(2,Math.min(5,Math.round(number(config.columns,4))));
  return <section data-storefront-commerce="product-grid" style={{...gridSpanStyle(node),display:'grid',gap:'1.5rem'}}>
    {sectionTitle(config.title)?<h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font, serif)',fontWeight:500}}>{sectionTitle(config.title)}</h2>:null}
    {products.length?<div style={{display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%, ${Math.max(170,Math.round(960/columns))}px),1fr))`,gap:'clamp(1rem,2.2vw,2rem)'}}>{productCards(products,config)}</div>:<p>{text(config.emptyLabel,'Jelenleg nincs megjeleníthető termék.')}</p>}
  </section>;
}

function ProductGalleryRenderer({config,node}:StorefrontComponentRenderProps){
  const images=rows(config.images).map((item,index)=>({src:safeImageSrc(item.src),alt:text(item.alt,`Termékkép ${index+1}`)})).filter(item=>item.src);
  return <div data-storefront-commerce="product-gallery" style={{...gridSpanStyle(node),display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'0.75rem'}}>
    {images.length?images.map((image,index)=><img key={`${image.src}:${index}`} src={image.src??''} alt={image.alt} loading={index===0?'eager':'lazy'} style={{display:'block',width:'100%',height:'100%',minHeight:index===0?'28rem':'16rem',objectFit:'cover',gridColumn:index===0?'span 2':'span 1',background:'var(--shoporation-color-surface-muted, #eee9e2)'}}/>):<div style={{gridColumn:'span 2',aspectRatio:text(config.aspectRatio,'4 / 5'),background:'var(--shoporation-color-surface-muted, #eee9e2)'}}/>}
  </div>;
}

function ProductInfoRenderer({config,node}:StorefrontComponentRenderProps){
  const badges=Array.isArray(config.badges)?config.badges.filter(item=>typeof item==='string') as string[]:[];
  const price=money(config.price,config.currency);
  const compareAt=money(config.compareAtPrice,config.currency);
  return <section data-storefront-commerce="product-info" style={{...gridSpanStyle(node),display:'grid',gap:'1rem'}}>
    {text(config.eyebrow)?<small style={{letterSpacing:'0.13em',textTransform:'uppercase'}}>{text(config.eyebrow)}</small>:null}
    <h1 style={{margin:0,fontFamily:'var(--shoporation-heading-font, serif)',fontSize:'clamp(2.25rem,5vw,4.5rem)',fontWeight:500,lineHeight:1}}>{text(config.title,'Termék')}</h1>
    <div style={{display:'flex',gap:'0.75rem',alignItems:'baseline',flexWrap:'wrap'}}>{price?<strong style={{fontSize:'1.25rem'}}>{price}</strong>:null}{compareAt?<span style={{color:'var(--shoporation-color-muted-text, #666)',textDecoration:'line-through'}}>{compareAt}</span>:null}</div>
    {badges.length?<div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>{badges.map(item=><span key={item} style={{border:'1px solid var(--shoporation-color-border, #d8d1c7)',padding:'0.35rem 0.55rem',fontSize:'0.75rem'}}>{item}</span>)}</div>:null}
    {text(config.description)?<p style={{margin:0,lineHeight:1.75,color:'var(--shoporation-color-muted-text, #555)'}}>{text(config.description)}</p>:null}
    {text(config.stockLabel)?<small>{text(config.stockLabel)}</small>:null}
  </section>;
}

type VariantOption={id:string;label:string;value:string;available:boolean;selected:boolean;href:string;swatch:string|null};
const variantOptions=(value:unknown):VariantOption[]=>rows(value).map((row,index)=>{
  const swatchRaw=text(row.swatch);
  return{
    id:text(row.id,`option-${index}`),
    label:text(row.label,text(row.value,`Opció ${index+1}`)),
    value:text(row.value),
    available:row.available!==false,
    selected:row.selected===true,
    href:safeHref(row.href,''),
    swatch:/^#[0-9a-fA-F]{3,8}$/.test(swatchRaw)?swatchRaw:null,
  };
});

function VariantSwatchesRenderer({config,node}:StorefrontComponentRenderProps){
  const options=variantOptions(config.options);
  return <fieldset data-storefront-commerce="variant-swatches" style={{...gridSpanStyle(node),border:0,padding:0,margin:0,display:'grid',gap:'0.6rem'}}>
    <legend style={{fontWeight:600}}>{text(config.label,'Szín')}</legend>
    <div style={{display:'flex',gap:'0.65rem',flexWrap:'wrap'}}>{options.map(option=>{
      const style:CSSProperties={display:'inline-flex',width:'2.25rem',height:'2.25rem',borderRadius:'999px',border:option.selected?'2px solid var(--shoporation-color-text, #111)':'1px solid var(--shoporation-color-border, #bbb)',padding:'0.2rem',opacity:option.available?1:0.35,background:option.swatch??'var(--shoporation-color-surface, #fff)',boxShadow:option.selected?'0 0 0 2px var(--shoporation-color-background, #fff) inset':undefined};
      if(option.available&&option.href)return <a key={option.id} href={option.href} aria-label={option.label} aria-current={option.selected?'true':undefined} title={option.label} style={style}/>;
      return <span key={option.id} aria-label={option.label} aria-disabled={option.available?undefined:'true'} aria-current={option.selected?'true':undefined} title={option.label} style={style}/>;
    })}</div>
  </fieldset>;
}

function SizeSelectorRenderer({config,node}:StorefrontComponentRenderProps){
  const options=variantOptions(config.options);
  return <fieldset data-storefront-commerce="size-selector" style={{...gridSpanStyle(node),border:0,padding:0,margin:0,display:'grid',gap:'0.6rem'}}>
    <legend style={{fontWeight:600}}>{text(config.label,'Méret')}</legend>
    <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>{options.map(option=>{
      const style:CSSProperties={display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:'3rem',padding:'0.65rem 0.8rem',border:option.selected?'2px solid var(--shoporation-color-text, #111)':'1px solid var(--shoporation-color-border, #bbb)',color:'inherit',textDecoration:option.available?'none':'line-through',opacity:option.available?1:0.4,background:'transparent'};
      if(option.available&&option.href)return <a key={option.id} href={option.href} aria-current={option.selected?'true':undefined} style={style}>{option.label}</a>;
      return <span key={option.id} aria-disabled={option.available?undefined:'true'} aria-current={option.selected?'true':undefined} style={style}>{option.label}</span>;
    })}</div>
  </fieldset>;
}

function ReviewSummaryRenderer({config,node}:StorefrontComponentRenderProps){
  const rating=Math.max(0,Math.min(5,number(config.rating,0)));
  const count=Math.max(0,Math.round(number(config.count,0)));
  return <aside data-storefront-commerce="review-summary" style={{...gridSpanStyle(node),display:'flex',gap:'0.75rem',alignItems:'center',flexWrap:'wrap'}}>
    <span aria-label={`${rating.toFixed(1)} / 5`}>{'★'.repeat(Math.round(rating))}{'☆'.repeat(5-Math.round(rating))}</span>
    <strong>{rating.toFixed(1)}</strong>
    <span style={{color:'var(--shoporation-color-muted-text, #666)'}}>{text(config.label,count?`${count} értékelés`:'Még nincs értékelés')}</span>
  </aside>;
}

function RecommendationRowRenderer({config,node}:StorefrontComponentRenderProps){
  const products=commerceProducts(config.products);
  return <section data-storefront-commerce="recommendation-row" style={{...gridSpanStyle(node),display:'grid',gap:'1.5rem'}}>
    <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font, serif)',fontWeight:500}}>{text(config.title,'Ezek is tetszhetnek')}</h2>
    {products.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%, 210px),1fr))',gap:'1.25rem'}}>{productCards(products,{...config,presentation:'recommendation'})}</div>:<p>{text(config.emptyLabel,'Jelenleg nincs kapcsolódó ajánlat.')}</p>}
  </section>;
}

const cartLines=(value:unknown)=>rows(value).map((row,index)=>({
  id:text(row.id,`line-${index}`),
  name:text(row.name,'Termék'),
  quantity:Math.max(1,Math.round(number(row.quantity,1))),
  lineTotal:row.lineTotal??row.total,
  variantLabel:text(row.variantLabel),
}));

function CartSummaryRenderer({config,node}:StorefrontComponentRenderProps){
  const lines=cartLines(config.lines);
  return <section data-storefront-commerce="cart-summary" style={{...gridSpanStyle(node),display:'grid',gap:'1.5rem',maxWidth:'64rem',marginInline:'auto'}}>
    <h1 style={{margin:0,fontFamily:'var(--shoporation-heading-font, serif)',fontWeight:500}}>Kosár</h1>
    {lines.length?<div style={{display:'grid',gap:'1rem'}}>{lines.map(line=><div key={line.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'1rem',paddingBlock:'1rem',borderBottom:'1px solid var(--shoporation-color-border, #ddd)'}}><div><strong>{line.name}</strong>{line.variantLabel?<small style={{display:'block',color:'var(--shoporation-color-muted-text, #666)'}}>{line.variantLabel}</small>:null}<small>{line.quantity} db</small></div><strong>{money(line.lineTotal,config.currency)}</strong></div>)}</div>:<p>{text(config.emptyLabel,'A kosarad jelenleg üres.')}</p>}
    {lines.length?<div style={{display:'grid',gap:'0.7rem',justifySelf:'end',minWidth:'min(100%, 20rem)'}}><div style={{display:'flex',justifyContent:'space-between',gap:'2rem'}}><span>Részösszeg</span><strong>{money(config.subtotal,config.currency)}</strong></div><div style={{display:'flex',justifyContent:'space-between',gap:'2rem',fontSize:'1.1rem'}}><span>Összesen</span><strong>{money(config.total,config.currency)}</strong></div><a href={safeHref(config.checkoutHref,'/penztar')} style={{display:'inline-flex',justifyContent:'center',background:'var(--shoporation-color-primary, #171717)',color:'var(--shoporation-color-primary-contrast, #fff)',padding:'0.9rem 1.2rem',textDecoration:'none'}}>{text(config.checkoutLabel,'Tovább a pénztárhoz')}</a></div>:null}
  </section>;
}

function CheckoutSummaryRenderer({config,node}:StorefrontComponentRenderProps){
  const lines=cartLines(config.lines);
  return <aside data-storefront-commerce="checkout-summary" style={{...gridSpanStyle(node),display:'grid',gap:'1rem',padding:'clamp(1.25rem,3vw,2rem)',background:'var(--shoporation-color-surface, #f6f2ec)',border:'1px solid var(--shoporation-color-border, #d8d1c7)'}}>
    <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font, serif)',fontWeight:500}}>Rendelés összegzése</h2>
    {lines.map(line=><div key={line.id} style={{display:'flex',justifyContent:'space-between',gap:'1rem'}}><span>{line.name} × {line.quantity}</span><strong>{money(line.lineTotal,config.currency)}</strong></div>)}
    <hr style={{width:'100%',border:0,borderTop:'1px solid var(--shoporation-color-border, #d8d1c7)'}}/>
    <div style={{display:'flex',justifyContent:'space-between',gap:'1rem'}}><span>Részösszeg</span><strong>{money(config.subtotal,config.currency)}</strong></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:'1rem'}}><span>Szállítás</span><strong>{money(config.shipping,config.currency)||text(config.shipping,'Kalkuláció szerint')}</strong></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:'1rem',fontSize:'1.1rem'}}><span>Összesen</span><strong>{money(config.total,config.currency)}</strong></div>
    <small style={{color:'var(--shoporation-color-muted-text, #666)'}}>{text(config.secureLabel,'Biztonságos rendelés · a fizetési mód a következő lépésben kerül véglegesítésre.')}</small>
  </aside>;
}

const RENDERERS:readonly [string,number,(props:StorefrontComponentRenderProps)=>ReactNode][]=[
  ['commerce.collection-navigation',1,CollectionNavigationRenderer],
  ['commerce.collection-header',1,CollectionHeaderRenderer],
  ['commerce.product-grid',1,ProductGridRenderer],
  ['commerce.product-gallery',1,ProductGalleryRenderer],
  ['commerce.product-info',1,ProductInfoRenderer],
  ['commerce.variant-swatches',1,VariantSwatchesRenderer],
  ['commerce.size-selector',1,SizeSelectorRenderer],
  ['commerce.review-summary',1,ReviewSummaryRenderer],
  ['commerce.recommendation-row',1,RecommendationRowRenderer],
  ['commerce.cart-summary',1,CartSummaryRenderer],
  ['commerce.checkout-summary',1,CheckoutSummaryRenderer],
] as const;

export function createStorefrontCoreCommerceRendererRegistry(){
  const registry:StorefrontRendererRegistry=createStorefrontPrimitiveRendererRegistry();
  for(const[componentKey,componentVersion,renderer]of RENDERERS)registry.register(componentKey,componentVersion,renderer);
  return registry;
}
