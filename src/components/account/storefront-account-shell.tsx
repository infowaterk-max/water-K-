import type{CSSProperties,ReactNode}from'react';
import{headers}from'next/headers';
import{StorefrontResponsiveRuntime}from'@/components/builder/storefront-responsive-runtime';
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
 const runtime=await resolveCurrentStorefrontAccountRuntimePage(customerId);
 if(!runtime)return <div className="storefrontAccountShell"><div className="storefrontAccountWorkspace"><aside className="storefrontAccountSidebar" aria-label="Fiók navigáció">{fallbackNavigation}</aside><div className="storefrontAccountRouteContent">{children}</div></div></div>;
 const userAgent=(await headers()).get('user-agent')??'',viewport=viewportFromUserAgent(userAgent);
 const headerSections=runtime.page.sections.filter(isHeader);
 const navSections=runtime.page.sections.filter(isAccountNav);
 const footerSections=runtime.page.sections.filter(isFooter);
 if(!headerSections.length||!footerSections.length)return <div className="storefrontAccountShell"><div className="storefrontAccountWorkspace"><aside className="storefrontAccountSidebar" aria-label="Fiók navigáció">{fallbackNavigation}</aside><div className="storefrontAccountRouteContent">{children}</div></div></div>;
 const vars=resolveStorefrontGlobalStyleCssVariables(runtime.page) as CSSProperties;
 const render=(sections:StorefrontComponentNode[])=><StorefrontResponsiveRuntime page={slicePage(runtime.page,sections)} initialViewport={viewport} bindingContext={runtime.bindingContext} capability={runtime.capability}/>;
 return <div className="storefrontAccountShell" data-storefront-account-shell={runtime.source} data-storefront-template={runtime.page.templateKey} data-authenticated={customerId?'true':'false'} style={{...vars,fontFamily:'var(--shoporation-body-font,Arial,sans-serif)',background:'var(--shoporation-color-background,#fff)',color:'var(--shoporation-color-text,#111827)'}}>
   {render(headerSections)}
   {customerId?<div className="storefrontAccountWorkspace">
     <aside className="storefrontAccountSidebar" aria-label="Fiók navigáció">{navSections.length?render(navSections):fallbackNavigation}</aside>
     <div className="storefrontAccountRouteContent">{children}</div>
   </div>:<div className="storefrontAccountRouteContent storefrontAuthRouteContent">{children}</div>}
   {render(footerSections)}
  </div>;
}
