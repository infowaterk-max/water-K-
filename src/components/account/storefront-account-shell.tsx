import type{CSSProperties,ReactNode}from'react';
import{headers}from'next/headers';
import{StorefrontRuntimeRenderer}from'@/components/builder/storefront-runtime-renderer';
import{createStorefrontVisualBuilderComponentRegistry}from'@/lib/builder/storefront-builder-registry';
import{createStorefrontVisualBuilderRendererRegistry}from'@/components/builder/storefront-builder-renderer-registry';
import{resolveCurrentStorefrontAccountRuntimePage}from'@/lib/builder/storefront-runtime-source';
import{resolveStorefrontGlobalStyleCssVariables}from'@/lib/builder/storefront-global-styles';
import type{StorefrontComponentNode,StorefrontPageDocument}from'@/lib/builder/storefront-runtime';
import type{StorefrontViewport}from'@/lib/builder/storefront-foundation';

const idMarker=(id:string,kind:'header'|'footer')=>new RegExp(`(^|[-_.])${kind}($|[-_.])`,'i').test(id);
function contains(node:StorefrontComponentNode,predicate:(node:StorefrontComponentNode)=>boolean):boolean{return predicate(node)||(node.children??[]).some(child=>contains(child,predicate))}
const isHeader=(node:StorefrontComponentNode)=>contains(node,item=>item.componentKey==='system.commerce-header'||item.componentKey==='editorial.header'||item.componentKey.endsWith('.header')||idMarker(item.id,'header'));
const isFooter=(node:StorefrontComponentNode)=>contains(node,item=>item.componentKey==='system.footer'||item.componentKey==='editorial.footer'||item.componentKey.endsWith('.footer')||idMarker(item.id,'footer'));
const isAccountNav=(node:StorefrontComponentNode)=>contains(node,item=>item.componentKey==='account.capability-navigation');
function viewportFromUserAgent(value:string):StorefrontViewport{const v=value.toLowerCase();if(/ipad|tablet|kindle|silk/.test(v))return'tablet';if(/mobi|iphone|ipod|android/.test(v))return'mobile';return'desktop'}
function slicePage(page:StorefrontPageDocument,sections:StorefrontComponentNode[]):StorefrontPageDocument{return{...page,sections}}

export async function StorefrontAccountShell({customerId,fallbackNavigation,children}:{customerId:string|null;fallbackNavigation:ReactNode;children:ReactNode}){
 if(!customerId)return <>{fallbackNavigation}{children}</>;
 const runtime=await resolveCurrentStorefrontAccountRuntimePage(customerId);
 if(!runtime)return <>{fallbackNavigation}{children}</>;
 const userAgent=(await headers()).get('user-agent')??'',viewport=viewportFromUserAgent(userAgent);
 const headerSections=runtime.page.sections.filter(isHeader);
 const navSections=runtime.page.sections.filter(isAccountNav);
 const footerSections=runtime.page.sections.filter(isFooter);
 if(!headerSections.length||!footerSections.length)return <>{fallbackNavigation}{children}</>;
 const vars=resolveStorefrontGlobalStyleCssVariables(runtime.page) as CSSProperties;
 const registry=createStorefrontVisualBuilderComponentRegistry(),renderers=createStorefrontVisualBuilderRendererRegistry();
 const render=(sections:StorefrontComponentNode[])=><StorefrontRuntimeRenderer page={slicePage(runtime.page,sections)} viewport={viewport} bindingContext={runtime.bindingContext} capability={runtime.capability} componentRegistry={registry} rendererRegistry={renderers}/>;
 return <div className="storefrontAccountShell" data-storefront-account-shell={runtime.source} style={{...vars,fontFamily:'var(--shoporation-body-font,Arial,sans-serif)',background:'var(--shoporation-color-background,#fff)',color:'var(--shoporation-color-text,#111827)'}}>
   {render(headerSections)}
   {navSections.length?render(navSections):fallbackNavigation}
   <div className="storefrontAccountRouteContent">{children}</div>
   {render(footerSections)}
  </div>;
}
