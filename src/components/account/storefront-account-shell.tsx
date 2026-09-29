import type{CSSProperties,ReactNode}from'react';
import{headers}from'next/headers';
import{AccountSubnav}from'@/components/account/account-subnav';
import{StorefrontAccountWorkspace}from'@/components/account/storefront-account-workspace';
import{resolveTemplateAccountCapabilityOptIns,type AccountCapabilityContext}from'@/lib/account/account-capabilities';
import{StorefrontResponsiveRuntime}from'@/components/builder/storefront-responsive-runtime';
import{resolveCurrentStorefrontAccountRuntimePage}from'@/lib/builder/storefront-runtime-source';
import{resolveStorefrontTemplateAccountPreviewRuntimePage}from'@/lib/builder/storefront-template-preview-auth';
import{resolveStorefrontGlobalStyleCssVariables}from'@/lib/builder/storefront-global-styles';
import type{StorefrontPageDocument}from'@/lib/builder/storefront-runtime';
import type{StorefrontViewport}from'@/lib/builder/storefront-foundation';
import{sliceStorefrontAccountTemplatePage,splitStorefrontAccountTemplateSections}from'@/lib/account/storefront-account-composition';

function viewportFromUserAgent(value:string):StorefrontViewport{const v=value.toLowerCase();if(/ipad|tablet|kindle|silk/.test(v))return'tablet';if(/mobi|iphone|ipod|android/.test(v))return'mobile';return'desktop'}
export async function StorefrontAccountShell({customerId,fallbackNavigation,children,previewTemplate,accountNavigationContext}:{customerId:string|null;fallbackNavigation:ReactNode;children:ReactNode;previewTemplate?:{templateKey:string;templateVersion?:number;factoryCandidate?:boolean}|null;accountNavigationContext?:Pick<AccountCapabilityContext,'showLoyalty'|'showB2BOrganization'|'showB2BQuotes'>}){
 const runtime=previewTemplate
  ?resolveStorefrontTemplateAccountPreviewRuntimePage(previewTemplate.templateKey,previewTemplate.templateVersion,previewTemplate.factoryCandidate===true)
  :await resolveCurrentStorefrontAccountRuntimePage(customerId);
 const navigationFor=(page?:StorefrontPageDocument|null)=>accountNavigationContext
  ?<AccountSubnav {...accountNavigationContext} templateCapabilities={resolveTemplateAccountCapabilityOptIns(page?.metadata)}/>
  :fallbackNavigation;
 if(!runtime)return customerId
  ?<div className="storefrontAccountShell" data-authenticated="true"><StorefrontAccountWorkspace navigation={navigationFor()}>{children}</StorefrontAccountWorkspace></div>
  :<div className="storefrontAccountShell" data-authenticated="false"><div className="storefrontAccountRouteContent storefrontAuthRouteContent">{children}</div></div>;
 const userAgent=(await headers()).get('user-agent')??'',viewport=viewportFromUserAgent(userAgent);
 const{headerSections,footerSections,publicAuthSections}=splitStorefrontAccountTemplateSections(runtime.page);
 if(!headerSections.length||!footerSections.length)return customerId
  ?<div className="storefrontAccountShell" data-authenticated="true"><StorefrontAccountWorkspace navigation={navigationFor(runtime.page)}>{children}</StorefrontAccountWorkspace></div>
  :<div className="storefrontAccountShell" data-authenticated="false"><div className="storefrontAccountRouteContent storefrontAuthRouteContent">{children}</div></div>;
 const vars=resolveStorefrontGlobalStyleCssVariables(runtime.page) as CSSProperties;
 const render=(sections:StorefrontPageDocument['sections'])=><StorefrontResponsiveRuntime page={sliceStorefrontAccountTemplatePage(runtime.page,[...sections])} initialViewport={viewport} bindingContext={runtime.bindingContext} capability={runtime.capability}/>;
 return <div className="storefrontAccountShell" data-storefront-account-shell={runtime.source} data-storefront-template={runtime.page.templateKey} data-authenticated={customerId?'true':'false'} style={{...vars,fontFamily:'var(--shoporation-body-font,Arial,sans-serif)',background:'var(--shoporation-color-background,#fff)',color:'var(--shoporation-color-text,#111827)'}}>
   {render(headerSections)}
   {!customerId&&publicAuthSections.length?render(publicAuthSections):null}
   {customerId?<StorefrontAccountWorkspace navigation={navigationFor(runtime.page)}>{children}</StorefrontAccountWorkspace>:<div className="storefrontAccountRouteContent storefrontAuthRouteContent">{children}</div>}
   {render(footerSections)}
  </div>;
}
