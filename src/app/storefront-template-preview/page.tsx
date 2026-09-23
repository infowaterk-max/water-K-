import type {CSSProperties} from 'react';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requirePlanFeature} from '@/lib/plans/access';
import {requireAdmin} from '@/lib/auth/require-admin';
import {PLANS} from '@/lib/plans/catalog';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {
  createStorefrontTemplatePreviewBindingContext,
  getStorefrontTemplatePreviewTheme,
} from '@/lib/builder/storefront-template-preview-demo';
import {applyAuthoredTemplatePreviewFallbacks} from '@/lib/builder/storefront-template-preview-canonical';
import {augmentStorefrontDigitalCommercePreviewContext} from '@/lib/builder/storefront-digital-commerce-preview';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {STOREFRONT_CANONICAL_VIEWPORT_WIDTH_PX,STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {applyStorefrontTemplateDemoNotice,getStorefrontTemplateDemoContent,rewriteStorefrontTemplatePreviewLinks} from '@/lib/builder/storefront-template-route-integrity';
import styles from './storefront-template-preview.module.css';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{template?:string;version?:string;page?:string;viewport?:string;embed?:string;demoContent?:string}>};
const widths=STOREFRONT_CANONICAL_VIEWPORT_WIDTH_PX;
const allowedPageTypes=new Set<StorefrontBuilderPageType>(STOREFRONT_PAGE_TYPES);

export default async function StorefrontTemplatePreview({searchParams}:Props){
  const query=await searchParams;
  const returnParams=new URLSearchParams();
  for(const [key,value] of Object.entries(query))if(typeof value==='string'&&value) returnParams.set(key,value);
  // Representative template preview is platform-owned and intentionally does not require an active webshop context.
  // Representative preview is read-only and tenant-independent after authentication.
  await requireAdmin(`/storefront-template-preview?${returnParams.toString()}`);
  await requirePlanFeature('contentMarketing');
  const templateKey=(query.template??'').trim();
  const version=query.version?Number(query.version):undefined;
  const pageType=(query.page??'home') as StorefrontBuilderPageType;
  if(!templateKey||version!==undefined&&!Number.isInteger(version)||!allowedPageTypes.has(pageType))notFound();
  const template=getStorefrontTemplatePackage(templateKey,version);
  if(!template)notFound();
  const sourcePage=template.pages.find(candidate=>candidate.pageType===pageType);
  if(!sourcePage)notFound();
  const viewport:StorefrontViewport=query.viewport==='mobile'?'mobile':query.viewport==='tablet'?'tablet':'desktop';
  const demoFixture=query.demoContent?getStorefrontTemplateDemoContent(template,query.demoContent):null;
  if(query.demoContent&&!demoFixture)notFound();
  const demoPayload=demoFixture?.payload??null;
  const noticedPage=demoPayload?applyStorefrontTemplateDemoNotice(sourcePage):sourcePage;
  const page=rewriteStorefrontTemplatePreviewLinks(noticedPage,{templateKey:template.manifest.templateKey,templateVersion:template.manifest.templateVersion,viewport});
  const embed=query.embed==='1';
  const baseContext=applyAuthoredTemplatePreviewFallbacks({page,context:createStorefrontTemplatePreviewBindingContext({template,page})});
  if(demoPayload){
    const content=baseContext.content&&typeof baseContext.content==='object'&&!Array.isArray(baseContext.content)?baseContext.content as Record<string,unknown>:{};
    const title=typeof demoPayload.title==='string'?demoPayload.title:'Minta tartalom';
    const summary=typeof demoPayload.excerpt==='string'?demoPayload.excerpt:'Előre generált mintaoldal.';
    const body=typeof demoPayload.body==='string'?demoPayload.body:'';
    baseContext.content={
      ...content,
      page:{title,summary,body},
      article:{title,excerpt:summary,summary,body,image:'',imageAlt:''},
    };
  }
  const bindingContext=augmentStorefrontDigitalCommercePreviewContext({template,page,context:baseContext});
  const theme=getStorefrontTemplatePreviewTheme(template.manifest.templateKey) as CSSProperties;
  const previewCapability={plan:'pro' as const,features:[...PLANS.pro.features]};
  const content=<StorefrontRuntimeRenderer
    page={page}
    viewport={viewport}
    bindingContext={bindingContext}
    componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
    rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
    capability={previewCapability}
  />;
  if(embed)return <main className={styles.embed} style={theme} data-template-preview="representative-demo" data-template-key={templateKey} data-page-type={pageType}>{content}</main>;
  const href=(next:StorefrontViewport)=>{
    const params=new URLSearchParams();
    for(const[key,value]of Object.entries(query))if(typeof value==='string'&&value)params.set(key,value);
    params.set('template',templateKey);
    params.set('version',String(template.manifest.templateVersion));
    params.set('page',pageType);
    params.set('viewport',next);
    params.delete('embed');
    return`/storefront-template-preview?${params.toString()}`;
  };
  return <main className={styles.page}>
    <header className={styles.bar}>
      <Link href="/admin/tartalom/builder?view=templates">← Vissza a sablonokhoz</Link>
      <div><strong>{templateKey.split('.').at(-1)?.split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ')}</strong><span>Élő sablon-előnézet · reprezentatív demo tartalom · semmit nem telepít</span></div>
      <nav aria-label="Előnézeti méret"><Link data-active={viewport==='desktop'} href={href('desktop')}>Desktop</Link><Link data-active={viewport==='tablet'} href={href('tablet')}>Tablet</Link><Link data-active={viewport==='mobile'} href={href('mobile')}>Mobil</Link></nav>
    </header>
    <section className={styles.stage}><div className={styles.viewport} style={{...theme,maxWidth:widths[viewport]}} data-template-preview="representative-demo" data-template-key={templateKey} data-page-type={pageType}>{content}</div></section>
  </main>;
}
