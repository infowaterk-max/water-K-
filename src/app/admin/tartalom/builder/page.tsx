import type {CSSProperties} from 'react';
import {requirePlanFeature} from '@/lib/plans/access';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {getCurrentStorefrontPageState} from '@/lib/builder/storefront-persistence';
import {listCurrentStorefrontSavedBlocks} from '@/lib/builder/storefront-saved-block-persistence';
import {
  getCurrentStorefrontBuilderBindingContext,
  getCurrentStorefrontBuilderCapability,
  listCurrentStorefrontBuilderPages,
  listCurrentStorefrontBuilderRevisionHistory,
} from '@/lib/builder/storefront-builder-server';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {listStorefrontTemplateLibraryEntries} from '@/lib/builder/storefront-template-library';
import {getStorefrontTemplatePreviewTheme} from '@/lib/builder/storefront-template-preview-demo';
import {StorefrontVisualBuilder95} from '@/components/admin/storefront-visual-builder-95';
import {StorefrontTemplateLibrary} from '@/components/admin/storefront-template-library';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{page?:string;view?:string}>};

function withMerchantEditorDefaults(document:StorefrontPageDocument):StorefrontPageDocument{
  const visit=(node:StorefrontComponentNode):StorefrontComponentNode=>{
    const config={...node.config};
    if(node.componentKey==='system.header'){
      const editorial=config.presentation==='editorial-lab';
      if(config.showBrandText===undefined)config.showBrandText=true;
      if(config.showNavigation===undefined)config.showNavigation=true;
      if(config.showUtilities===undefined)config.showUtilities=editorial;
      if(config.showSearch===undefined)config.showSearch=false;
      if(config.showAccount===undefined)config.showAccount=false;
      if(config.showCart===undefined)config.showCart=false;
      if(config.mobileMenu===undefined)config.mobileMenu=editorial;
      if(config.utilityItems===undefined)config.utilityItems=[];
    }
    return{...node,config,children:node.children?.map(visit)};
  };
  return{...document,sections:document.sections.map(visit)};
}

export default async function VisualBuilderAdmin({searchParams}:Props){
  await requirePlanFeature('contentMarketing');
  await requireCurrentStoreContext('store.manage');
  const[params,pages,capability,bindingContext,savedBlocks]=await Promise.all([
    searchParams,
    listCurrentStorefrontBuilderPages(),
    getCurrentStorefrontBuilderCapability(),
    getCurrentStorefrontBuilderBindingContext(),
    listCurrentStorefrontSavedBlocks(),
  ]);
  const requested=(params.page??'').trim();
  const selectedKey=pages.some(page=>page.pageKey===requested)?requested:pages[0]?.pageKey??null;
  const state=selectedKey?await getCurrentStorefrontPageState(selectedKey):null;
  const revisions=state?await listCurrentStorefrontBuilderRevisionHistory(state.pageId):[];
  const persistedDocument=state?.draft?.document??state?.published?.document??null;
  const document=persistedDocument?withMerchantEditorDefaults(persistedDocument):null;
  const showTemplateLibrary=params.view==='templates'||!document;

  if(showTemplateLibrary)return <section className="adminMain">
    <StorefrontTemplateLibrary
      templates={listStorefrontTemplateLibraryEntries()}
      capability={capability}
      hasExistingStorefront={Boolean(document)}
      currentTemplateKey={document?.templateKey??null}
      currentTemplateVersion={document?.templateVersion??null}
      editorHref={selectedKey?`/admin/tartalom/builder?page=${encodeURIComponent(selectedKey)}`:'/admin/tartalom/builder'}
    />
  </section>;

  const theme=getStorefrontTemplatePreviewTheme(document.templateKey) as CSSProperties;
  return <section className="adminMain" style={theme} data-storefront-builder-theme={document.templateKey}>
    <StorefrontVisualBuilder95
      key={selectedKey??'no-page'}
      pages={pages}
      document={document}
      pageId={state?.pageId??null}
      draftRevision={state?.draft?.revisionNumber??null}
      publishedRevision={state?.published?.revisionNumber??null}
      revisions={revisions}
      capability={capability}
      bindingContext={bindingContext}
      savedBlocks={savedBlocks}
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
