import type {CSSProperties,ReactNode} from 'react';
import {StorefrontRendererRegistry,type StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';

type Item={key:string;label:string;href:string};
const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const safeHref=(value:unknown)=>{const href=text(value).trim();return href.startsWith('/')||href.startsWith('#')?href:'#';};
const items=(value:unknown):Item[]=>Array.isArray(value)?value.flatMap((item,index)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return[];
  const row=item as Record<string,unknown>,label=text(row.label).trim();
  if(!label)return[];
  return[{key:text(row.key,`item-${index+1}`),label,href:safeHref(row.href)}];
}):[];

function AccountCapabilityNavigationRenderer({config,node,viewport}:StorefrontComponentRenderProps):ReactNode{
  const rows=items(config.items),mobile=viewport==='mobile',tablet=viewport==='tablet';
  const root:CSSProperties={
    gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`,
    maxWidth:'var(--shoporation-content-max,1200px)',
    margin:'0 auto',
    padding:mobile?'.8rem':tablet?'1rem 1.25rem':'1rem clamp(1.25rem,3vw,2.6rem)',
    color:'var(--shoporation-color-text,#111827)',
  };
  const grid:CSSProperties={
    display:'grid',
    gridTemplateColumns:mobile?'1fr':tablet?'repeat(2,minmax(0,1fr))':'repeat(3,minmax(0,1fr))',
    gap:mobile?'.55rem':'.7rem',
  };
  const card:CSSProperties={
    display:'flex',alignItems:'center',justifyContent:'space-between',gap:'.75rem',
    minHeight:mobile?'3rem':'3.2rem',padding:mobile?'.72rem .82rem':'.78rem .9rem',
    border:'1px solid var(--shoporation-color-border,#d8dce7)',
    borderRadius:'var(--shoporation-radius-m,.75rem)',
    background:'var(--shoporation-color-surface,#fff)',
    color:'inherit',textDecoration:'none',fontWeight:800,
  };
  return <nav data-storefront-component="account.capability-navigation" data-storefront-protected-system="account-navigation" aria-label="Fiók navigáció" style={root}>
    <strong style={{display:'block',marginBottom:'.65rem',fontSize:mobile?'1rem':'1.05rem'}}>{text(config.title,'Fiókom')}</strong>
    <div style={grid}>{rows.map(item=><a key={item.key} href={item.href} style={card}>{item.label}<span aria-hidden="true">→</span></a>)}</div>
  </nav>;
}

export function createStorefrontAccountNavigationRendererRegistry(){
  return new StorefrontRendererRegistry().register('account.capability-navigation',1,AccountCapabilityNavigationRenderer);
}
