import type{StorefrontRuntimeCapabilityContext}from'@/lib/builder/storefront-runtime';
import{getStorefrontTemplatePackage}from'@/lib/builder/storefront-template-catalog';
import{createStorefrontTemplatePreviewBindingContext}from'@/lib/builder/storefront-template-preview-demo';
import{PLANS}from'@/lib/plans/catalog';

export type StorefrontTemplatePreviewAccountRuntime={
 source:'preview';
 instanceId:string;
 page:NonNullable<ReturnType<typeof getStorefrontTemplatePackage>>['pages'][number];
 bindingContext:Record<string,unknown>;
 capability:StorefrontRuntimeCapabilityContext;
};

export function resolveStorefrontTemplateAccountPreviewRuntimePage(templateKey:string,templateVersion?:number):StorefrontTemplatePreviewAccountRuntime|null{
 const template=getStorefrontTemplatePackage(templateKey,templateVersion);
 if(!template)return null;
 const page=template.pages.find(item=>item.pageType==='account');
 if(!page)return null;
 const capability={plan:'pro' as const,features:[...PLANS.pro.features]};
 return{
  source:'preview',
  instanceId:`template-preview:${template.manifest.templateKey}`,
  page:structuredClone(page),
  bindingContext:createStorefrontTemplatePreviewBindingContext({template,page}),
  capability,
 };
}
