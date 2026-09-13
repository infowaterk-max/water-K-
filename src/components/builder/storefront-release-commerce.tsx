import type {CSSProperties} from 'react';
import {StorefrontRendererRegistry,type StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {StorefrontReleaseCommerceExperience} from '@/components/builder/storefront-release-commerce-experience';
import type {ReleaseCommerceReadModel} from '@/lib/commerce/release-commerce';

export const STOREFRONT_RELEASE_COMMERCE_RENDERERS_VERSION='shoporation.storefront-release-commerce-renderers.v1' as const;
const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const rows=(value:unknown):ReleaseCommerceReadModel[]=>Array.isArray(value)?value.filter((item):item is ReleaseCommerceReadModel=>Boolean(item)&&typeof item==='object'&&!Array.isArray(item)&&typeof (item as ReleaseCommerceReadModel).releaseKey==='string'&&typeof (item as ReleaseCommerceReadModel).state==='string'):[];

export function StorefrontReleaseCommerce({config,node}:StorefrontComponentRenderProps){
  const releases=rows(config.releases),releaseKey=text(config.releaseKey);
  const selected=releaseKey?releases.find(item=>item.releaseKey===releaseKey)??null:releases[0]??null;
  const span:CSSProperties={gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`};
  if(!selected)return <section data-storefront-release-commerce-v1 data-release-state="missing" style={{...span,display:'grid',gap:'.75rem',padding:'1.25rem',border:'1px solid var(--shoporation-color-border,#ddd)'}}><strong>{text(config.title,'Drop / Release')}</strong><p style={{margin:0}}>Nincs elérhető release.</p></section>;
  return <div style={span}><StorefrontReleaseCommerceExperience model={selected} config={config}/></div>;
}

export function createStorefrontReleaseCommerceRendererRegistry(){const registry=new StorefrontRendererRegistry();registry.register('commerce.release',1,StorefrontReleaseCommerce);return registry;}
