import type {CSSProperties} from 'react';
import {notFound} from 'next/navigation';
import {PLANS} from '@/lib/plans/catalog';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {resolveStorefrontTemplateQualityCandidate} from '@/lib/builder/storefront-template-quality-candidates';
import {
  createStorefrontTemplatePreviewBindingContext,
  getStorefrontTemplatePreviewTheme,
} from '@/lib/builder/storefront-template-preview-demo';
import {applyAuthoredTemplatePreviewFallbacks} from '@/lib/builder/storefront-template-preview-canonical';
import {augmentStorefrontDigitalCommercePreviewContext} from '@/lib/builder/storefront-digital-commerce-preview';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {STOREFRONT_TEMPLATE_PERFORMANCE_BUDGET,STOREFRONT_PERFORMANCE_CONTRACT_VERSION} from '@/lib/builder/storefront-performance-contract';
import {STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {applyStorefrontTemplateDemoContent,applyStorefrontTemplateDemoNotice,getStorefrontTemplateDemoContent,isStorefrontShowroomReadyDemoContent,rewriteStorefrontTemplatePreviewBindingContext} from '@/lib/builder/storefront-template-route-integrity';

export const dynamic='force-dynamic';

type Props={searchParams:Promise<{template?:string;version?:string;page?:string;viewport?:string;demoContent?:string;factory?:string;qualityCandidate?:string}>};
// The route is gated by VISUAL_FIDELITY_QA=1, so it can safely render the full
// canonical storefront page family for exact-head screenshot acceptance.
const ALLOWED_PAGE_TYPES=new Set<StorefrontBuilderPageType>(STOREFRONT_PAGE_TYPES);

export default async function VisualFidelityQaPage({searchParams}:Props){
  if(process.env.VISUAL_FIDELITY_QA!=='1')notFound();
  const query=await searchParams;
  const templateKey=(query.template??'').trim();
  const version=query.version?Number(query.version):undefined;
  const pageType=(query.page??'home') as StorefrontBuilderPageType;
  if(!templateKey||version!==undefined&&!Number.isInteger(version)||!ALLOWED_PAGE_TYPES.has(pageType))notFound();
  const factoryCandidate=query.factory==='1';
  const qualityCandidate=query.qualityCandidate==='1';
  if(factoryCandidate&&qualityCandidate)notFound();
  let template;
  if(qualityCandidate){
    const registration=resolveStorefrontTemplateQualityCandidate(templateKey,version);
    if(!registration)notFound();
    template=registration.template;
  }else if(factoryCandidate){
    try{
      const build=buildRegisteredStorefrontTemplateFactoryCandidate(templateKey);
      if(!build.report.productOwnerReady)notFound();
      template=build.package;
      if(version!==undefined&&template.manifest.templateVersion!==version)notFound();
    }catch{notFound();}
  }else{
    template=getStorefrontTemplatePackage(templateKey,version);
    if(!template)notFound();
  }
  const sourcePage=template.pages.find(candidate=>candidate.pageType===pageType);
  if(!sourcePage)notFound();
  const viewport:StorefrontViewport=query.viewport==='mobile'?'mobile':query.viewport==='tablet'?'tablet':'desktop';
  const demoFixture=query.demoContent?getStorefrontTemplateDemoContent(template,query.demoContent):null;
  if(query.demoContent&&!demoFixture)notFound();
  const demoPayload=demoFixture?.payload??null;
  const contentBoundPage=demoPayload?applyStorefrontTemplateDemoContent(sourcePage,demoPayload):sourcePage;
  const demoNoticeRequired=Boolean(demoPayload)&&(!factoryCandidate||!isStorefrontShowroomReadyDemoContent(demoFixture));
  const page=demoNoticeRequired?applyStorefrontTemplateDemoNotice(contentBoundPage):contentBoundPage;
  const baseContext=applyAuthoredTemplatePreviewFallbacks({page,context:createStorefrontTemplatePreviewBindingContext({template,page})});
  if(demoPayload){
    const content=baseContext.content&&typeof baseContext.content==='object'&&!Array.isArray(baseContext.content)?baseContext.content as Record<string,unknown>:{};
    const title=typeof demoPayload.title==='string'?demoPayload.title:'Minta tartalom';
    const summary=typeof demoPayload.excerpt==='string'?demoPayload.excerpt:'Előre generált mintaoldal.';
    const body=typeof demoPayload.body==='string'?demoPayload.body:'';
    baseContext.content={...content,page:{title,summary,body},article:{title,excerpt:summary,summary,body,image:'',imageAlt:''}};
  }
  const bindingContext=rewriteStorefrontTemplatePreviewBindingContext(
    augmentStorefrontDigitalCommercePreviewContext({template,page,context:baseContext}),
    {templateKey:template.manifest.templateKey,templateVersion:template.manifest.templateVersion,viewport,factoryCandidate},
  );
  const theme=getStorefrontTemplatePreviewTheme(template.manifest.templateKey) as CSSProperties;
  const capability={plan:'pro' as const,features:[...PLANS.pro.features]};
  return <main
    data-visual-fidelity-root="runtime"
    data-template-key={templateKey}
    data-factory-candidate={factoryCandidate?'true':'false'}
    data-quality-candidate={qualityCandidate?'true':'false'}
    data-page-type={pageType}
    data-viewport={viewport}
    data-performance-contract={STOREFRONT_PERFORMANCE_CONTRACT_VERSION}
    data-runtime-performance-budget={JSON.stringify(STOREFRONT_TEMPLATE_PERFORMANCE_BUDGET.runtime)}
    style={{...theme,width:'100%',maxWidth:'none',minHeight:'100vh',margin:0,padding:0,overflow:'hidden',background:'var(--shoporation-color-background,#fff)'}}
  >
    <StorefrontRuntimeRenderer
      page={page}
      viewport={viewport}
      bindingContext={bindingContext}
      componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
      rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
      capability={capability}
    />
  </main>;
}