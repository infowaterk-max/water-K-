import type {CSSProperties} from 'react';
import {requirePlanFeature} from '@/lib/plans/access';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {getCurrentStorefrontPageState} from '@/lib/builder/storefront-persistence';
import {
  getCurrentStorefrontBuilderBindingContext,
  getCurrentStorefrontBuilderCapability,
  listCurrentStorefrontBuilderPages,
  listCurrentStorefrontBuilderRevisionHistory,
} from '@/lib/builder/storefront-builder-server';
import {STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {listStorefrontTemplateLibraryEntries} from '@/lib/builder/storefront-template-library';
import {getStorefrontTemplatePreviewTheme} from '@/lib/builder/storefront-template-preview-demo';
import {StorefrontVisualBuilder} from '@/components/admin/storefront-visual-builder';
import {StorefrontTemplateLibrary} from '@/components/admin/storefront-template-library';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{page?:string;view?:string}>};

export default async function VisualBuilderAdmin({searchParams}:Props){
  await requirePlanFeature('contentMarketing');
  await requireCurrentStoreContext('store.manage');
  const[params,pages,capability,bindingContext]=await Promise.all([
    searchParams,
    listCurrentStorefrontBuilderPages(),
    getCurrentStorefrontBuilderCapability(),
    getCurrentStorefrontBuilderBindingContext(),
  ]);
  const requested=(params.page??'').trim();
  const selectedKey=pages.some(page=>page.pageKey===requested)?requested:pages[0]?.pageKey??null;
  const state=selectedKey?await getCurrentStorefrontPageState(selectedKey):null;
  const revisions=state?await listCurrentStorefrontBuilderRevisionHistory(state.pageId):[];
  const document=state?.draft?.document??state?.published?.document??null;
  const showTemplateLibrary=params.view==='templates'||!document;

  if(showTemplateLibrary)return <section className="adminMain">
    <StorefrontTemplateLibrary
      templates={listStorefrontTemplateLibraryEntries()}
      capability={capability}
      hasExistingStorefront={Boolean(document)}
      currentTemplateKey={document?.templateKey??null}
      editorHref={selectedKey?`/admin/tartalom/builder?page=${encodeURIComponent(selectedKey)}`:'/admin/tartalom/builder'}
    />
  </section>;

  const theme=getStorefrontTemplatePreviewTheme(document.templateKey) as CSSProperties;
  return <section className="adminMain" style={theme} data-storefront-builder-theme={document.templateKey}>
    <StorefrontVisualBuilder
      key={selectedKey??'no-page'}
      pages={pages}
      document={document}
      pageId={state?.pageId??null}
      draftRevision={state?.draft?.revisionNumber??null}
      publishedRevision={state?.published?.revisionNumber??null}
      revisions={revisions}
      capability={capability}
      bindingContext={bindingContext}
      templates={STOREFRONT_TEMPLATE_CATALOG.map(template=>({
        templateKey:template.templateKey,
        templateVersion:template.templateVersion,
        category:template.category,
        minPlan:template.minPlan,
        requiredFeatures:[...template.requiredFeatures],
        pageTypes:[...template.pageTypes],
      }))}
    />
  </section>;
}
