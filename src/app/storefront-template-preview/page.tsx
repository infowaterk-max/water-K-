import type {CSSProperties} from 'react';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requirePlanFeature} from '@/lib/plans/access';
import {PLANS} from '@/lib/plans/catalog';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {
  createStorefrontTemplatePreviewBindingContext,
  getStorefrontTemplatePreviewTheme,
} from '@/lib/builder/storefront-template-preview-demo';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import styles from './storefront-template-preview.module.css';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{template?:string;version?:string;viewport?:string;embed?:string}>};
const widths:Record<StorefrontViewport,number>={desktop:1200,tablet:768,mobile:390};

export default async function StorefrontTemplatePreview({searchParams}:Props){
  await requirePlanFeature('contentMarketing');
  await requireCurrentStoreContext('store.manage');
  const query=await searchParams;
  const templateKey=(query.template??'').trim();
  const version=query.version?Number(query.version):undefined;
  if(!templateKey||version!==undefined&&!Number.isInteger(version))notFound();
  const template=getStorefrontTemplatePackage(templateKey,version);
  if(!template)notFound();
  const page=template.pages.find(candidate=>candidate.pageType==='home')??template.pages[0];
  if(!page)notFound();
  const viewport:StorefrontViewport=query.viewport==='mobile'?'mobile':query.viewport==='tablet'?'tablet':'desktop';
  const embed=query.embed==='1';
  const bindingContext=createStorefrontTemplatePreviewBindingContext({template,page});
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
  if(embed)return <main className={styles.embed} style={theme} data-template-preview="representative-demo" data-template-key={templateKey}>{content}</main>;
  const href=(next:StorefrontViewport)=>`/storefront-template-preview?template=${encodeURIComponent(templateKey)}&version=${template.manifest.templateVersion}&viewport=${next}`;
  return <main className={styles.page}>
    <header className={styles.bar}>
      <Link href="/admin/tartalom/builder?view=templates">← Vissza a sablonokhoz</Link>
      <div><strong>{templateKey.split('.').at(-1)?.split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ')}</strong><span>Élő sablon-előnézet · reprezentatív demo tartalom · semmit nem telepít</span></div>
      <nav aria-label="Előnézeti méret"><Link data-active={viewport==='desktop'} href={href('desktop')}>Desktop</Link><Link data-active={viewport==='tablet'} href={href('tablet')}>Tablet</Link><Link data-active={viewport==='mobile'} href={href('mobile')}>Mobil</Link></nav>
    </header>
    <section className={styles.stage}><div className={styles.viewport} style={{...theme,maxWidth:widths[viewport]}} data-template-preview="representative-demo" data-template-key={templateKey}>{content}</div></section>
  </main>;
}
