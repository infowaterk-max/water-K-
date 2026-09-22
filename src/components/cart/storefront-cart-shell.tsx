import type {CSSProperties,ReactNode} from 'react';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {resolveStorefrontGlobalStyleCssVariables} from '@/lib/builder/storefront-global-styles';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontResolvedRuntimePage} from '@/lib/builder/storefront-runtime-source';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';

const componentRegistry=createStorefrontVisualBuilderComponentRegistry();
const rendererRegistry=createStorefrontVisualBuilderRendererRegistry();
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};

function containsCartSummary(node:StorefrontComponentNode):boolean{
  return node.componentKey==='commerce.cart-summary'||(node.children??[]).some(containsCartSummary);
}
function pageWithSections(page:StorefrontPageDocument,sections:StorefrontComponentNode[]):StorefrontPageDocument{return{...page,sections};}
function cartThemeStyle(page:StorefrontPageDocument,bodySection:StorefrontComponentNode):CSSProperties{
  const inherited=resolveStorefrontGlobalStyleCssVariables(page) as CSSProperties;
  const bodyStyle=record(record(bodySection.config).style) as CSSProperties;
  return{
    ...inherited,
    ...bodyStyle,
    '--card':'var(--shoporation-color-surface)',
    '--ink':'var(--shoporation-color-text)',
    '--muted':'var(--shoporation-color-muted-text)',
    '--line':'var(--shoporation-color-border)',
    '--green':'var(--shoporation-color-primary)',
    '--radius':'var(--shoporation-radius-l)',
    background:typeof bodyStyle.background==='string'?bodyStyle.background:'var(--shoporation-color-background)',
    color:'var(--shoporation-color-text)',
    fontFamily:'var(--shoporation-body-font,Arial,sans-serif)',
    padding:'clamp(1rem,2.5vw,2rem) 0',
  } as CSSProperties;
}

export function StorefrontCartShell({runtime,viewport,children}:{runtime:StorefrontResolvedRuntimePage;viewport:StorefrontViewport;children:ReactNode}){
  const bodyIndex=runtime.page.sections.findIndex(containsCartSummary);
  if(bodyIndex<0)return <div data-storefront-cart-template-missing="true">{children}</div>;
  const bodySection=runtime.page.sections[bodyIndex]!;
  const before=pageWithSections(runtime.page,runtime.page.sections.slice(0,bodyIndex));
  const after=pageWithSections(runtime.page,runtime.page.sections.slice(bodyIndex+1));
  const render=(page:StorefrontPageDocument)=>page.sections.length?<StorefrontRuntimeRenderer page={page} viewport={viewport} bindingContext={runtime.bindingContext} capability={runtime.capability} componentRegistry={componentRegistry} rendererRegistry={rendererRegistry}/>:null;
  return <main data-storefront-cart-runtime="template-native" data-storefront-template-key={runtime.page.templateKey} data-storefront-template-version={runtime.page.templateVersion}>
    {render(before)}
    <section data-storefront-live-cart="shared-cart-v1" style={cartThemeStyle(runtime.page,bodySection)}>
      <div style={{width:'min(1180px,calc(100% - 32px))',margin:'0 auto'}}>{children}</div>
    </section>
    {render(after)}
  </main>;
}
