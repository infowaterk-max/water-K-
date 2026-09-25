import type {CSSProperties} from 'react';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {requireStorefrontTemplatePreviewAccess} from '@/lib/auth/template-preview-access';
import {createClient} from '@/lib/supabase/server';
import {PLANS} from '@/lib/plans/catalog';
import {resolveStorefrontTemplatePreviewPackage} from '@/lib/builder/storefront-template-preview-auth';
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
import {applyStorefrontTemplateDemoNotice,applyStorefrontTemplateOwnerShowroomNavigation,getStorefrontTemplateDemoContent,isStorefrontShowroomReadyDemoContent,rewriteStorefrontTemplatePreviewBindingContext,rewriteStorefrontTemplatePreviewLinks} from '@/lib/builder/storefront-template-route-integrity';
import styles from './storefront-template-preview.module.css';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{template?:string;version?:string;page?:string;viewport?:string;embed?:string;demoContent?:string;factory?:string}>};
const widths=STOREFRONT_CANONICAL_VIEWPORT_WIDTH_PX;
const allowedPageTypes=new Set<StorefrontBuilderPageType>(STOREFRONT_PAGE_TYPES);

export default async function StorefrontTemplatePreview({searchParams}:Props){
  const query=await searchParams;
  const templateKey=(query.template??'').trim();
  const version=query.version?Number(query.version):undefined;
  const pageType=(query.page??'home') as StorefrontBuilderPageType;
  if(!templateKey||version!==undefined&&!Number.isInteger(version)||!allowedPageTypes.has(pageType))notFound();
  const factoryCandidate=query.factory==='1';
  const template=resolveStorefrontTemplatePreviewPackage(templateKey,version,factoryCandidate);
  if(!template)notFound();
  const returnParams=new URLSearchParams();
  for(const [key,value] of Object.entries(query))if(typeof value==='string'&&value)returnParams.set(key,value);
  returnParams.set('template',template.manifest.templateKey);
  returnParams.set('version',String(template.manifest.templateVersion));
  returnParams.set('page',pageType);
  const returnTo=`/storefront-template-preview?${returnParams.toString()}`;
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user){
    const loginParams=new URLSearchParams({
      template:template.manifest.templateKey,
      version:String(template.manifest.templateVersion),
      page:pageType,
      viewport:query.viewport==='mobile'?'mobile':query.viewport==='tablet'?'tablet':'desktop',
      next:returnTo,
      ...(factoryCandidate?{factory:'1'}:{}),
    });
    redirect(`/storefront-template-preview-login?${loginParams.toString()}`);
  }
  await requireStorefrontTemplatePreviewAccess(returnTo);
  const sourcePage=template.pages.find(candidate=>candidate.pageType===pageType);
  if(!sourcePage)notFound();
  const viewport:StorefrontViewport=query.viewport==='mobile'?'mobile':query.viewport==='tablet'?'tablet':'desktop';
  const demoFixture=query.demoContent?getStorefrontTemplateDemoContent(template,query.demoContent):null;
  if(query.demoContent&&!demoFixture)notFound();
  const demoPayload=demoFixture?.payload??null;
  const noticedPage=demoPayload&&!isStorefrontShowroomReadyDemoContent(demoFixture)?applyStorefrontTemplateDemoNotice(sourcePage):sourcePage;
  const routedPage=rewriteStorefrontTemplatePreviewLinks(noticedPage,{templateKey:template.manifest.templateKey,templateVersion:template.manifest.templateVersion,viewport,factoryCandidate});
  const embed=query.embed==='1';
  const page=embed?routedPage:applyStorefrontTemplateOwnerShowroomNavigation(routedPage,{templateKey:template.manifest.templateKey,templateVersion:template.manifest.templateVersion,viewport,factory:factoryCandidate});
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
  const bindingContext=rewriteStorefrontTemplatePreviewBindingContext(
    augmentStorefrontDigitalCommercePreviewContext({template,page,context:baseContext}),
    {templateKey:template.manifest.templateKey,templateVersion:template.manifest.templateVersion,viewport,factoryCandidate},
  );
  const theme=getStorefrontTemplatePreviewTheme(template.manifest.templateKey) as CSSProperties;
  const previewCapability={plan:'pro' as const,features:[...PLANS.pro.features]};
  const factoryMeta=sourcePage.metadata?.templateFactory&&typeof sourcePage.metadata.templateFactory==='object'
    ?sourcePage.metadata.templateFactory as Record<string,unknown>
    :null;
  const recipeIdentity=typeof factoryMeta?.recipeIdentity==='string'?factoryMeta.recipeIdentity:`${template.manifest.templateKey}@${template.manifest.templateVersion}`;
  const compileSource=typeof factoryMeta?.compileSource==='string'?factoryMeta.compileSource:(factoryCandidate?'unknown':'catalog');
  const foundationTemplate=typeof factoryMeta?.foundationTemplateKey==='string'&&typeof factoryMeta?.foundationTemplateVersion==='number'
    ?`${factoryMeta.foundationTemplateKey}@${factoryMeta.foundationTemplateVersion}`
    :'none';
  const sourceCommit=process.env.VERCEL_GIT_COMMIT_SHA??process.env.GITHUB_SHA??'unknown';
  const content=<StorefrontRuntimeRenderer
    page={page}
    viewport={viewport}
    bindingContext={bindingContext}
    componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
    rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
    capability={previewCapability}
  />;
  if(embed)return <main className={styles.embed} style={theme} data-template-preview="representative-demo" data-template-key={template.manifest.templateKey} data-template-version={template.manifest.templateVersion} data-factory-candidate={factoryCandidate?'true':'false'} data-template-recipe={recipeIdentity} data-compile-source={compileSource} data-foundation-template={foundationTemplate} data-source-commit={sourceCommit} data-page-type={pageType}>{content}</main>;
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
    <section className={styles.stage}><div className={styles.viewport} style={{...theme,maxWidth:widths[viewport]}} data-template-preview="representative-demo" data-template-key={template.manifest.templateKey} data-template-version={template.manifest.templateVersion} data-factory-candidate={factoryCandidate?'true':'false'} data-template-recipe={recipeIdentity} data-compile-source={compileSource} data-foundation-template={foundationTemplate} data-source-commit={sourceCommit} data-page-type={pageType}>{content}</div></section>
  </main>;
}
