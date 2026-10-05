import{notFound,redirect}from'next/navigation';
import{normalizeWorkforceReturnTarget,workforceLoginHref}from'@/lib/auth/workforce-return-target';
import{resolveStorefrontTemplatePreviewPackage}from'@/lib/builder/storefront-template-preview-auth';
import{STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType}from'@/lib/builder/storefront-foundation';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{template?:string;version?:string;page?:string;viewport?:string;next?:string;factory?:string}>};
const allowedPageTypes=new Set<StorefrontBuilderPageType>(STOREFRONT_PAGE_TYPES);

function previewTarget(input:{templateKey:string;templateVersion:number;pageType:StorefrontBuilderPageType;viewport:string;requested?:string;factoryCandidate:boolean}){
 const requested=normalizeWorkforceReturnTarget(input.requested);
 if(requested&&(requested==='/storefront-template-preview'||requested.startsWith('/storefront-template-preview?')))return requested;
 const params=new URLSearchParams({
  template:input.templateKey,
  version:String(input.templateVersion),
  page:input.pageType,
  viewport:input.viewport==='mobile'?'mobile':input.viewport==='tablet'?'tablet':'desktop',
 });
 if(input.factoryCandidate)params.set('factory','1');
 return`/storefront-template-preview?${params.toString()}`;
}

export default async function StorefrontTemplatePreviewLogin({searchParams}:Props){
 const query=await searchParams;
 const templateKey=(query.template??'').trim();
 const version=query.version?Number(query.version):undefined;
 const pageType=(query.page??'home') as StorefrontBuilderPageType;
 if(!templateKey||version!==undefined&&!Number.isInteger(version)||!allowedPageTypes.has(pageType))notFound();
 const factoryCandidate=query.factory==='1';
 const template=resolveStorefrontTemplatePreviewPackage(templateKey,version,factoryCandidate);
 if(!template||!template.pages.some(page=>page.pageType==='account'))notFound();
 const target=previewTarget({
  templateKey:template.manifest.templateKey,
  templateVersion:template.manifest.templateVersion,
  pageType,
  viewport:query.viewport??'desktop',
  requested:query.next,
  factoryCandidate,
 });
 redirect(workforceLoginHref(target));
}
