import type{CSSProperties,ReactNode}from'react';
import{StorefrontRuntimeRenderer}from'@/components/builder/storefront-runtime-renderer';
import{createStorefrontVisualBuilderComponentRegistry}from'@/lib/builder/storefront-builder-registry';
import{createStorefrontVisualBuilderRendererRegistry}from'@/components/builder/storefront-builder-renderer-registry';
import{resolveStorefrontGlobalStyleCssVariables}from'@/lib/builder/storefront-global-styles';
import type{StorefrontPageDocument}from'@/lib/builder/storefront-runtime';
import type{StorefrontResolvedRuntimePage}from'@/lib/builder/storefront-runtime-source';
import type{StorefrontViewport}from'@/lib/builder/storefront-foundation';

const componentRegistry=createStorefrontVisualBuilderComponentRegistry();
const rendererRegistry=createStorefrontVisualBuilderRendererRegistry();
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
function pageWithSections(page:StorefrontPageDocument,sections:StorefrontPageDocument['sections']):StorefrontPageDocument{return{...page,sections}}
function postPurchaseThemeStyle(page:StorefrontPageDocument):CSSProperties{
 const theme=record(page.metadata?.checkoutTheme),inherited=resolveStorefrontGlobalStyleCssVariables(page) as CSSProperties,overrides:Record<string,string>={};
 const assign=(themeKey:string,cssKey:string)=>{const value=theme[themeKey];if(typeof value==='string'&&value.trim())overrides[cssKey]=value};
 assign('background','--shoporation-color-background');assign('surface','--shoporation-color-surface');assign('surfaceMuted','--shoporation-color-surface-muted');assign('text','--shoporation-color-text');assign('mutedText','--shoporation-color-muted-text');assign('border','--shoporation-color-border');assign('primary','--shoporation-color-primary');assign('primaryContrast','--shoporation-color-primary-contrast');assign('accent','--shoporation-color-accent');assign('radiusS','--shoporation-radius-s');assign('radiusM','--shoporation-radius-m');assign('radiusL','--shoporation-radius-l');
 return{
  ...inherited,...overrides,
  '--card':'var(--shoporation-color-surface)',
  '--ink':'var(--shoporation-color-text)',
  '--muted':'var(--shoporation-color-muted-text)',
  '--line':'var(--shoporation-color-border)',
  '--green':'var(--shoporation-color-primary)',
  '--radius':'var(--shoporation-radius-l)',
  background:'var(--shoporation-color-background)',
  color:'var(--shoporation-color-text)',
  fontFamily:'var(--shoporation-body-font,Arial,sans-serif)',
  minHeight:'100vh',
 } as CSSProperties;
}
export function StorefrontPostPurchaseShell({runtime,viewport,children}:{runtime:StorefrontResolvedRuntimePage;viewport:StorefrontViewport;children:ReactNode}){
 const sections=runtime.page.sections,header=sections.length?pageWithSections(runtime.page,[sections[0]!]):null,footer=sections.length>1?pageWithSections(runtime.page,[sections[sections.length-1]!] ):null;
 const render=(page:StorefrontPageDocument|null)=>page?<StorefrontRuntimeRenderer page={page} viewport={viewport} bindingContext={runtime.bindingContext} capability={runtime.capability} componentRegistry={componentRegistry} rendererRegistry={rendererRegistry}/>:null;
 return <div data-storefront-post-purchase-runtime="template-native" data-storefront-template-key={runtime.page.templateKey} data-storefront-template-version={runtime.page.templateVersion} style={postPurchaseThemeStyle(runtime.page)}>
  {render(header)}
  <div data-storefront-post-purchase-content="shared-v1">{children}</div>
  {render(footer)}
  <style>{`
   [data-storefront-post-purchase-content="shared-v1"] .badge{background:var(--shoporation-color-surface-muted);color:var(--shoporation-color-accent,var(--shoporation-color-primary))}
   [data-storefront-post-purchase-content="shared-v1"] .successMark{background:var(--shoporation-color-primary);color:var(--shoporation-color-primary-contrast)}
   [data-storefront-post-purchase-content="shared-v1"] .card{box-shadow:0 18px 50px rgba(0,0,0,.22)}
   [data-storefront-post-purchase-content="shared-v1"] strong{overflow-wrap:anywhere}
  `}</style>
 </div>;
}
