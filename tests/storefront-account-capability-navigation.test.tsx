import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {CANONICAL_ACCOUNT_CAPABILITIES} from '@/lib/account/account-capabilities';
import {normalizeStorefrontTemplateRuntimeComposition} from '@/lib/builder/storefront-template-runtime-normalization';
import {createStorefrontTemplatePreviewBindingContext} from '@/lib/builder/storefront-template-preview-demo';
import {augmentStorefrontDigitalCommercePreviewContext} from '@/lib/builder/storefront-digital-commerce-preview';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {PLANS} from '@/lib/plans/catalog';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v19-canonical';

const flatten=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...flatten(node.children??[])]);
const capability={plan:'pro' as const,features:PLANS.pro.features};

describe('shared storefront account capability navigation',()=>{
  it('uses the canonical Digital Commerce account navigation primitive exactly once',()=>{
    const account=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
    const normalized=normalizeStorefrontTemplateRuntimeComposition(account);
    const nav=flatten(normalized.sections).filter(node=>node.componentKey==='account.capability-navigation');
    expect(nav).toHaveLength(1);
    expect(nav[0]?.config.layout).toBe('responsive');
    expect(normalized.sections.some(section=>section.id.startsWith('shared-')&&section.id.endsWith('-account-navigation'))).toBe(true);
  });

  it('derives preview capabilities from the same canonical resolver used by account runtime',()=>{
    const account=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
    const base=createStorefrontTemplatePreviewBindingContext({template:PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,page:account});
    const context=augmentStorefrontDigitalCommercePreviewContext({template:PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,page:account,context:base});
    const items=((context.commerce as any).digitalCommerce.accountCapabilities.items) as Array<{key:string;label:string;href:string}>;
    expect(items.map(item=>item.key)).toEqual(CANONICAL_ACCOUNT_CAPABILITIES.map(item=>item.key));
  });

  it('renders the same complete account capability set on desktop, tablet and mobile',()=>{
    const account=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
    const base=createStorefrontTemplatePreviewBindingContext({template:PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,page:account});
    const bindingContext=augmentStorefrontDigitalCommercePreviewContext({template:PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,page:account,context:base});
    for(const viewport of ['desktop','tablet','mobile'] as const){
      const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
        page={account}
        viewport={viewport}
        bindingContext={bindingContext}
        componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
        rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
        capability={capability}
      />);
      expect(html).toContain('data-storefront-account="capability-navigation"');
      for(const item of CANONICAL_ACCOUNT_CAPABILITIES)expect(html,viewport).toContain(item.label);
    }
  });
});
