import type {CSSProperties,ReactNode} from 'react';
import {
  StorefrontRendererRegistry,
  type StorefrontComponentRenderProps,
} from '@/components/builder/storefront-runtime-renderer';
import type {StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_PRIMITIVE_RENDERERS_VERSION='shoporation.storefront-primitive-renderers.v1' as const;

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const bool=(value:unknown,fallback=false)=>typeof value==='boolean'?value:fallback;
const number=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const oneOf=<T extends string>(value:unknown,allowed:readonly T[],fallback:T):T=>typeof value==='string'&&allowed.includes(value as T)?value as T:fallback;

const SPACING=['none','xs','s','m','l','xl','2xl'] as const;
type Spacing=typeof SPACING[number];
const spacingValue=(value:unknown,fallback:Spacing='m')=>{
  const token=oneOf(value,SPACING,fallback);
  const values:Record<Spacing,string>={none:'0',xs:'0.5rem',s:'1rem',m:'1.5rem',l:'2.5rem',xl:'4rem','2xl':'6rem'};
  return `var(--shoporation-space-${token}, ${values[token]})`;
};

const toneStyle=(value:unknown):CSSProperties=>{
  const tone=oneOf(value,['background','surface','muted','primary','text'] as const,'background');
  const styles:Record<typeof tone,CSSProperties>={
    background:{background:'var(--shoporation-color-background, #ffffff)',color:'var(--shoporation-color-text, #111827)'},
    surface:{background:'var(--shoporation-color-surface, #f8fafc)',color:'var(--shoporation-color-text, #111827)'},
    muted:{color:'var(--shoporation-color-muted-text, #64748b)'},
    primary:{background:'var(--shoporation-color-primary, #111827)',color:'var(--shoporation-color-primary-contrast, #ffffff)'},
    text:{color:'var(--shoporation-color-text, #111827)'},
  };
  return styles[tone];
};

const gridSpanStyle=(node:StorefrontResolvedComponentNode):CSSProperties=>({gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`});

const widthStyle=(value:unknown):CSSProperties=>{
  const width=oneOf(value,['full','content','narrow'] as const,'content');
  if(width==='full')return{width:'100%'};
  if(width==='narrow')return{width:'100%',maxWidth:'760px',marginInline:'auto'};
  return{width:'100%',maxWidth:'1440px',marginInline:'auto'};
};

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

function SectionRenderer({config,children,node}:StorefrontComponentRenderProps){
  const style:CSSProperties={...toneStyle(config.tone),...gridSpanStyle(node),paddingBlock:spacingValue(config.spacing,'l')};
  return <section data-storefront-component="layout.section" style={style}><div style={widthStyle(config.width)}>{children}</div></section>;
}

function ContainerRenderer({config,children,node}:StorefrontComponentRenderProps){
  const style:CSSProperties={...widthStyle(config.width),...gridSpanStyle(node),paddingInline:spacingValue(config.spacing,'m')};
  return <div data-storefront-component="layout.container" style={style}>{children}</div>;
}

function GridRenderer({config,children,node}:StorefrontComponentRenderProps){
  const columns=Math.max(1,Math.min(12,Math.round(number(config.columns,12))));
  const align=oneOf(config.align,['start','center','end','stretch'] as const,'stretch');
  const style:CSSProperties={...gridSpanStyle(node),display:'grid',gridTemplateColumns:`repeat(${columns}, minmax(0, 1fr))`,gap:spacingValue(config.gap,'m'),alignItems:align};
  return <div data-storefront-component="layout.grid" style={style}>{children}</div>;
}

function StackRenderer({config,children,node}:StorefrontComponentRenderProps){
  const direction=oneOf(config.direction,['vertical','horizontal'] as const,'vertical');
  const align=oneOf(config.align,['start','center','end','stretch'] as const,'stretch');
  const justify=oneOf(config.justify,['start','center','end','between'] as const,'start');
  const alignItems:CSSProperties['alignItems']=align==='start'?'flex-start':align==='end'?'flex-end':align;
  const justifyContent:CSSProperties['justifyContent']=justify==='start'?'flex-start':justify==='end'?'flex-end':justify==='between'?'space-between':'center';
  const style:CSSProperties={...gridSpanStyle(node),display:'flex',flexDirection:direction==='horizontal'?'row':'column',gap:spacingValue(config.gap,'m'),alignItems,justifyContent};
  return <div data-storefront-component="layout.stack" style={style}>{children}</div>;
}

function HeadingRenderer({config,node}:StorefrontComponentRenderProps){
  const level=Math.max(1,Math.min(6,Math.round(number(config.level,2))));
  const align=oneOf(config.align,['left','center','right'] as const,'left');
  const style:CSSProperties={...toneStyle(config.tone),...gridSpanStyle(node),textAlign:align,margin:0};
  const content=text(config.text);
  if(level===1)return <h1 data-storefront-component="content.heading" style={style}>{content}</h1>;
  if(level===2)return <h2 data-storefront-component="content.heading" style={style}>{content}</h2>;
  if(level===3)return <h3 data-storefront-component="content.heading" style={style}>{content}</h3>;
  if(level===4)return <h4 data-storefront-component="content.heading" style={style}>{content}</h4>;
  if(level===5)return <h5 data-storefront-component="content.heading" style={style}>{content}</h5>;
  return <h6 data-storefront-component="content.heading" style={style}>{content}</h6>;
}

function TextRenderer({config,node}:StorefrontComponentRenderProps){
  const as=oneOf(config.as,['p','span','small','strong'] as const,'p');
  const align=oneOf(config.align,['left','center','right'] as const,'left');
  const style:CSSProperties={...toneStyle(config.tone),...gridSpanStyle(node),textAlign:align,margin:as==='p'?0:undefined};
  const content=text(config.text);
  if(as==='span')return <span data-storefront-component="content.text" style={style}>{content}</span>;
  if(as==='small')return <small data-storefront-component="content.text" style={style}>{content}</small>;
  if(as==='strong')return <strong data-storefront-component="content.text" style={style}>{content}</strong>;
  return <p data-storefront-component="content.text" style={style}>{content}</p>;
}

function ImageRenderer({config,node}:StorefrontComponentRenderProps){
  const src=safeImageSrc(config.src);
  if(!src)return null;
  const fit=oneOf(config.fit,['cover','contain'] as const,'cover');
  const loading=oneOf(config.loading,['lazy','eager'] as const,'lazy');
  const radius=oneOf(config.radius,['none','s','m','l','pill'] as const,'none');
  const radiusValue={none:'0',s:'0.375rem',m:'0.75rem',l:'1.25rem',pill:'9999px'}[radius];
  const width=Math.max(1,Math.round(number(config.width,1200)));
  const height=Math.max(1,Math.round(number(config.height,800)));
  return <img data-storefront-component="content.image" src={src} alt={text(config.alt)} width={width} height={height} loading={loading} style={{...gridSpanStyle(node),display:'block',width:'100%',height:'auto',objectFit:fit,borderRadius:radiusValue}}/>;
}

function ButtonRenderer({config,node}:StorefrontComponentRenderProps){
  const href=safeHref(config.href);
  const variant=oneOf(config.variant,['primary','secondary','ghost'] as const,'primary');
  const size=oneOf(config.size,['s','m','l'] as const,'m');
  const padding=size==='s'?'0.5rem 0.875rem':size==='l'?'0.875rem 1.375rem':'0.7rem 1.1rem';
  const variantStyle:Record<typeof variant,CSSProperties>={
    primary:{background:'var(--shoporation-color-primary, #111827)',color:'var(--shoporation-color-primary-contrast, #ffffff)',border:'1px solid var(--shoporation-color-primary, #111827)'},
    secondary:{background:'transparent',color:'var(--shoporation-color-text, #111827)',border:'1px solid var(--shoporation-color-border, #cbd5e1)'},
    ghost:{background:'transparent',color:'var(--shoporation-color-text, #111827)',border:'1px solid transparent'},
  };
  return <a data-storefront-component="content.button" href={href} aria-label={text(config.ariaLabel)||undefined} style={{...gridSpanStyle(node),...variantStyle[variant],display:'inline-flex',width:'fit-content',alignItems:'center',justifyContent:'center',padding,borderRadius:'var(--shoporation-radius-m, 0.75rem)',textDecoration:'none',fontWeight:600}}>{text(config.label,'Tovább')}</a>;
}

type NavigationItem={label:string;href:string};
const navigationItems=(value:unknown):NavigationItem[]=>Array.isArray(value)?value.flatMap(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return[];
  const row=item as Record<string,unknown>;
  const label=text(row.label);
  const href=safeHref(row.href,'');
  return label&&href?[{label,href}]:[];
}):[];

function NavigationRenderer({config,node}:StorefrontComponentRenderProps){
  const items=navigationItems(config.items);
  const layout=oneOf(config.layout,['horizontal','vertical'] as const,'horizontal');
  return <nav data-storefront-component="system.navigation" data-storefront-protected-system="navigation" aria-label={text(config.ariaLabel,'Fő navigáció')} style={{...gridSpanStyle(node),display:'flex',flexDirection:layout==='vertical'?'column':'row',gap:'var(--shoporation-space-m, 1.5rem)',alignItems:layout==='vertical'?'stretch':'center'}}>{items.map(item=><a key={`${item.href}:${item.label}`} href={item.href} style={{color:'inherit',textDecoration:'none'}}>{item.label}</a>)}</nav>;
}

function HeaderRenderer({config,children,node}:StorefrontComponentRenderProps){
  const sticky=bool(config.sticky,false);
  const tone=oneOf(config.tone,['background','surface','primary'] as const,'background');
  return <header data-storefront-component="system.header" data-storefront-protected-system="header" style={{...toneStyle(tone),...gridSpanStyle(node),position:sticky?'sticky':'relative',top:sticky?0:undefined,zIndex:sticky?20:undefined,borderBottom:'1px solid var(--shoporation-color-border, #e2e8f0)'}}><div style={{maxWidth:'1440px',marginInline:'auto',padding:'1rem clamp(1rem, 3vw, 2rem)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1.5rem'}}><a href={safeHref(config.brandHref,'/')} style={{fontWeight:700,color:'inherit',textDecoration:'none'}}>{text(config.brandLabel,'Shoporation')}</a>{children}</div></header>;
}

const RENDERERS:readonly [string,number,(props:StorefrontComponentRenderProps)=>ReactNode][]=[
  ['layout.section',1,SectionRenderer],
  ['layout.container',1,ContainerRenderer],
  ['layout.grid',1,GridRenderer],
  ['layout.stack',1,StackRenderer],
  ['content.heading',1,HeadingRenderer],
  ['content.text',1,TextRenderer],
  ['content.image',1,ImageRenderer],
  ['content.button',1,ButtonRenderer],
  ['system.header',1,HeaderRenderer],
  ['system.navigation',1,NavigationRenderer],
] as const;

export function createStorefrontPrimitiveRendererRegistry(){
  const registry=new StorefrontRendererRegistry();
  for(const[componentKey,componentVersion,renderer]of RENDERERS)registry.register(componentKey,componentVersion,renderer);
  return registry;
}
