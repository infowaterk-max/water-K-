import type{CSSProperties,ReactNode}from'react';
import{headers}from'next/headers';
import{StorefrontResponsiveRuntime}from'@/components/builder/storefront-responsive-runtime';
import{resolveCurrentStorefrontRouteRuntimePage}from'@/lib/builder/storefront-runtime-source';
import{resolveStorefrontGlobalStyleCssVariables}from'@/lib/builder/storefront-global-styles';
import type{StorefrontComponentNode,StorefrontPageDocument}from'@/lib/builder/storefront-runtime';
import type{StorefrontBuilderPageType,StorefrontViewport}from'@/lib/builder/storefront-foundation';

const idMarker=(id:string,kind:'header'|'footer')=>new RegExp(`(^|[-_.])${kind}($|[-_.])`,'i').test(id);
function contains(node:StorefrontComponentNode,predicate:(node:StorefrontComponentNode)=>boolean):boolean{return predicate(node)||(node.children??[]).some(child=>contains(child,predicate))}
const isHeader=(node:StorefrontComponentNode)=>contains(node,item=>item.componentKey==='system.commerce-header'||item.componentKey==='editorial.header'||item.componentKey.endsWith('.header')||idMarker(item.id,'header'));
const isFooter=(node:StorefrontComponentNode)=>contains(node,item=>item.componentKey==='system.footer'||item.componentKey==='editorial.footer'||item.componentKey.endsWith('.footer')||idMarker(item.id,'footer'));
function viewportFromUserAgent(value:string):StorefrontViewport{const v=value.toLowerCase();if(/ipad|tablet|kindle|silk/.test(v))return'tablet';if(/mobi|iphone|ipod|android/.test(v))return'mobile';return'desktop'}
function slicePage(page:StorefrontPageDocument,sections:StorefrontComponentNode[]):StorefrontPageDocument{return{...page,sections}}

export async function StorefrontContentShell({children,pageKey='content'}:{children:ReactNode;pageKey?:StorefrontBuilderPageType}){
 const runtime=await resolveCurrentStorefrontRouteRuntimePage(pageKey);
 if(!runtime)return <>{children}</>;
 const headerSections=runtime.page.sections.filter(isHeader),footerSections=runtime.page.sections.filter(isFooter);
 if(!headerSections.length||!footerSections.length)return <>{children}</>;
 const viewport=viewportFromUserAgent((await headers()).get('user-agent')??'');
 const vars=resolveStorefrontGlobalStyleCssVariables(runtime.page) as CSSProperties;
 const render=(sections:StorefrontComponentNode[])=><StorefrontResponsiveRuntime page={slicePage(runtime.page,sections)} initialViewport={viewport} bindingContext={runtime.bindingContext} capability={runtime.capability}/>;
 return <div className="storefrontContentShell" data-storefront-content-shell={runtime.source} data-storefront-route-page={pageKey} data-storefront-template={runtime.page.templateKey} style={{...vars,fontFamily:'var(--shoporation-body-font,Arial,sans-serif)',background:'var(--shoporation-color-background,#fff)',color:'var(--shoporation-color-text,#111827)'}}>
   {render(headerSections)}
   <div className="storefrontContentRouteContent">{children}</div>
   {render(footerSections)}
  </div>;
}
