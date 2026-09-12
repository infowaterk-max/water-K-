import type {CSSProperties} from 'react';
import {notFound} from 'next/navigation';
import {PLANS} from '@/lib/plans/catalog';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {
  createStorefrontTemplatePreviewBindingContext,
  getStorefrontTemplatePreviewTheme,
} from '@/lib/builder/storefront-template-preview-demo';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import type {StorefrontBuilderPageType,StorefrontViewport} from '@/lib/builder/storefront-foundation';

export const dynamic='force-dynamic';

type Props={searchParams:Promise<{template?:string;version?:string;page?:string;viewport?:string}>};
const ALLOWED_PAGE_TYPES=new Set<StorefrontBuilderPageType>(['home','product']);

export default async function VisualFidelityQaPage({searchParams}:Props){
  if(process.env.VISUAL_FIDELITY_QA!=='1')notFound();
  const query=await searchParams;
  const templateKey=(query.template??'').trim();
  const version=query.version?Number(query.version):undefined;
  const pageType=(query.page??'home') as StorefrontBuilderPageType;
  if(!templateKey||version!==undefined&&!Number.isInteger(version)||!ALLOWED_PAGE_TYPES.has(pageType))notFound();
  const template=getStorefrontTemplatePackage(templateKey,version);
  if(!template)notFound();
  const page=template.pages.find(candidate=>candidate.pageType===pageType);
  if(!page)notFound();
  const viewport:StorefrontViewport=query.viewport==='mobile'?'mobile':query.viewport==='tablet'?'tablet':'desktop';
  const bindingContext=createStorefrontTemplatePreviewBindingContext({template,page});
  const theme=getStorefrontTemplatePreviewTheme(template.manifest.templateKey) as CSSProperties;
  const capability={plan:'pro' as const,features:[...PLANS.pro.features]};
  return <main
    data-visual-fidelity-root="runtime"
    data-template-key={templateKey}
    data-page-type={pageType}
    data-viewport={viewport}
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
