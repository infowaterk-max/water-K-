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

function containsCheckoutSummary(node:StorefrontComponentNode):boolean{
  return node.componentKey==='commerce.checkout-summary'||(node.children??[]).some(containsCheckoutSummary);
}
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const cssValue=(recordValue:Record<string,unknown>,key:string,fallback:string)=>typeof recordValue[key]==='string'&&String(recordValue[key]).trim()?String(recordValue[key]):fallback;

function checkoutThemeStyle(page:StorefrontPageDocument):CSSProperties{
  const theme=record(page.metadata?.checkoutTheme);
  return {
    ...(resolveStorefrontGlobalStyleCssVariables(page) as CSSProperties),
    '--shoporation-color-background':cssValue(theme,'background','#f3f6f0'),
    '--shoporation-color-surface':cssValue(theme,'surface','#ffffff'),
    '--shoporation-color-surface-muted':cssValue(theme,'surfaceMuted','#f7f9f6'),
    '--shoporation-color-text':cssValue(theme,'text','#17231a'),
    '--shoporation-color-muted-text':cssValue(theme,'mutedText','#637066'),
    '--shoporation-color-border':cssValue(theme,'border','rgba(23,35,26,.11)'),
    '--shoporation-color-primary':cssValue(theme,'primary','#2f6f3e'),
    '--shoporation-color-primary-contrast':cssValue(theme,'primaryContrast','#ffffff'),
    '--shoporation-color-accent':cssValue(theme,'accent',cssValue(theme,'primary','#2f6f3e')),
    '--shoporation-radius-s':cssValue(theme,'radiusS','.55rem'),
    '--shoporation-radius-m':cssValue(theme,'radiusM','.9rem'),
    '--shoporation-radius-l':cssValue(theme,'radiusL','1.6rem'),
    color:'var(--shoporation-color-text)',
    fontFamily:'var(--shoporation-body-font,Arial,sans-serif)',
  } as CSSProperties;
}

function pageWithSections(page:StorefrontPageDocument,sections:StorefrontComponentNode[]):StorefrontPageDocument{
  return {...page,sections};
}

export function StorefrontCheckoutShell({
  runtime,viewport,children,
}:{
  runtime:StorefrontResolvedRuntimePage;
  viewport:StorefrontViewport;
  children:ReactNode;
}){
  const bodyIndex=runtime.page.sections.findIndex(containsCheckoutSummary);
  if(bodyIndex<0)return <div data-storefront-checkout-template-missing="true">{children}</div>;
  const bodySection=runtime.page.sections[bodyIndex]!;
  const before=pageWithSections(runtime.page,runtime.page.sections.slice(0,bodyIndex));
  const after=pageWithSections(runtime.page,runtime.page.sections.slice(bodyIndex+1));
  const bodyConfig=record(bodySection.config),bodyStyle=record(bodyConfig.style);
  const sectionStyle:CSSProperties={
    ...checkoutThemeStyle(runtime.page),
    ...(bodyStyle as CSSProperties),
    background:typeof bodyStyle.background==='string'?bodyStyle.background:'var(--shoporation-color-background)',
    padding:'clamp(1rem,2.5vw,2rem) 0',
  };
  return <main
    data-storefront-checkout-runtime="template-native"
    data-storefront-template-key={runtime.page.templateKey}
    data-storefront-template-version={runtime.page.templateVersion}
  >
    {before.sections.length?<StorefrontRuntimeRenderer
      page={before}
      viewport={viewport}
      bindingContext={runtime.bindingContext}
      capability={runtime.capability}
      componentRegistry={componentRegistry}
      rendererRegistry={rendererRegistry}
    />:null}
    <section data-storefront-live-checkout="shared-e13" style={sectionStyle}>
      <div style={{width:'min(1180px,calc(100% - 32px))',margin:'0 auto'}}>
        {children}
      </div>
    </section>
    {after.sections.length?<StorefrontRuntimeRenderer
      page={after}
      viewport={viewport}
      bindingContext={runtime.bindingContext}
      capability={runtime.capability}
      componentRegistry={componentRegistry}
      rendererRegistry={rendererRegistry}
    />:null}
  </main>;
}
