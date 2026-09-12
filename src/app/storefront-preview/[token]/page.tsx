import type {CSSProperties} from 'react';
import {notFound} from 'next/navigation';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {getStorefrontTemplatePreviewTheme} from '@/lib/builder/storefront-template-preview-demo';
import {resolveStorefrontPreviewRuntimePage} from '@/lib/builder/storefront-runtime-source';

export const dynamic='force-dynamic';

type Props={params:Promise<{token:string}>;searchParams:Promise<{viewport?:string}>};

export default async function StorefrontBuilderPreview({params,searchParams}:Props){
  const[{token},query]=await Promise.all([params,searchParams]);
  const resolved=await resolveStorefrontPreviewRuntimePage(token);
  if(!resolved)notFound();
  const viewport=query.viewport==='mobile'?'mobile':query.viewport==='tablet'?'tablet':'desktop';
  const theme=getStorefrontTemplatePreviewTheme(resolved.page.templateKey) as CSSProperties;
  return <main data-storefront-preview="immutable-draft" data-preview-viewport={viewport} data-template-key={resolved.page.templateKey} style={{...theme,minHeight:'100vh',background:'var(--shoporation-color-background,#fff)'}}>
    <StorefrontRuntimeRenderer
      page={resolved.page}
      viewport={viewport}
      bindingContext={resolved.bindingContext}
      capability={resolved.capability}
      componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
      rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
    />
  </main>;
}
