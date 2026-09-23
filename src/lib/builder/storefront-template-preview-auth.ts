import type{StorefrontRuntimeCapabilityContext}from'@/lib/builder/storefront-runtime';
import type{StorefrontInstallableTemplatePackage}from'@/lib/builder/storefront-template-installation';
import{getStorefrontTemplatePackage}from'@/lib/builder/storefront-template-catalog';
import{buildRegisteredStorefrontTemplateFactoryCandidate}from'@/lib/builder/template-factory/recipe-registry';
import{createStorefrontTemplatePreviewBindingContext}from'@/lib/builder/storefront-template-preview-demo';
import{PLANS}from'@/lib/plans/catalog';

export type StorefrontTemplatePreviewAccountRuntime={
 source:'preview';
 instanceId:string;
 page:StorefrontInstallableTemplatePackage['pages'][number];
 bindingContext:Record<string,unknown>;
 capability:StorefrontRuntimeCapabilityContext;
};

export function resolveStorefrontTemplatePreviewPackage(templateKey:string,templateVersion?:number,factoryCandidate=false):StorefrontInstallableTemplatePackage|null{
 if(factoryCandidate){
  try{
   const build=buildRegisteredStorefrontTemplateFactoryCandidate(templateKey);
   if(!build.report.productOwnerReady)return null;
   if(templateVersion!==undefined&&build.package.manifest.templateVersion!==templateVersion)return null;
   return build.package;
  }catch{return null}
 }
 return getStorefrontTemplatePackage(templateKey,templateVersion)??null;
}

export function resolveStorefrontTemplateAccountPreviewRuntimePage(templateKey:string,templateVersion?:number,factoryCandidate=false):StorefrontTemplatePreviewAccountRuntime|null{
 const template=resolveStorefrontTemplatePreviewPackage(templateKey,templateVersion,factoryCandidate);
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
