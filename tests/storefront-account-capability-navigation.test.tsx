import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {CANONICAL_ACCOUNT_CAPABILITIES} from '@/lib/account/account-capabilities';
import {normalizeStorefrontTemplateRuntimeComposition} from '@/lib/builder/storefront-template-runtime-normalization';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {PLANS} from '@/lib/plans/catalog';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v19-canonical';
import {MARKET_PANTRY_TEMPLATE_PACKAGE} from '@/lib/builder/templates/market-pantry';

const flatten=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...flatten(node.children??[])]);
const capability={plan:'pro' as const,features:PLANS.pro.features};
const accountItems=CANONICAL_ACCOUNT_CAPABILITIES.map(item=>({key:item.key,label:item.label,href:item.href}));

describe('shared storefront account capability navigation',()=>{
  it('normalizes every account page onto one canonical protected navigation primitive',()=>{
    for(const template of [PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,MARKET_PANTRY_TEMPLATE_PACKAGE]){
      const account=template.pages.find(page=>page.pageType==='account');
      expect(account).toBeTruthy();if(!account)continue;
      const normalized=normalizeStorefrontTemplateRuntimeComposition(account);
      const nav=flatten(normalized.sections).filter(node=>node.componentKey==='account.capability-navigation');
      expect(nav,template.manifest.templateKey).toHaveLength(1);
      expect(nav[0]?.bindings?.items?.path).toBe('account.capabilities');
      expect(nav[0]?.config.presentation).toBe('account-navigation');
      expect(normalized.metadata?.accountNavigationAuthority).toBe('canonical-capabilities-v1');
      expect((nav[0]?.bindings?.items?.fallback as Array<{key:string}>).map(item=>item.key)).toEqual(
        CANONICAL_ACCOUNT_CAPABILITIES.filter(item=>!item.optional).map(item=>item.key),
      );
    }
  });

  it('renders the same canonical account capabilities on desktop, tablet and mobile',()=>{
    const account=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
    for(const viewport of ['desktop','tablet','mobile'] as const){
      const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
        page={account}
        viewport={viewport}
        bindingContext={{account:{capabilities:accountItems}}}
        componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
        rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
        capability={capability}
      />);
      expect(html).toContain('data-storefront-component="account.capability-navigation"');
      expect(html).toContain('data-storefront-protected-system="account-navigation"');
      for(const item of CANONICAL_ACCOUNT_CAPABILITIES)expect(html,viewport).toContain(item.label);
    }
  });

  it('keeps the canonical capability source single-authority rather than a Playroom-local copy',()=>{
    expect(CANONICAL_ACCOUNT_CAPABILITIES.map(item=>item.label)).toEqual([
      'Áttekintés','Rendeléseim','Letöltéseim','Dokumentumaim','Kívánságlista','Ügyeim','Visszaküldés','Fiókadatok','Marketing beállítások','B2B szervezet','Ajánlatkéréseim','Hűségprogram',
    ]);
  });
});
