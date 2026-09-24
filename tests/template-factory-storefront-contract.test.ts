import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {
  createStorefrontTemplateShowroomEvidence,
  evaluateStorefrontTemplateShowroomContract,
  STOREFRONT_TEMPLATE_SHOWROOM_SURFACES,
} from '@/lib/builder/storefront-template-route-integrity';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import {CANONICAL_ACCOUNT_CAPABILITIES} from '@/lib/account/account-capabilities';

describe('Template Factory complete storefront contract',()=>{
  it('requires the complete canonical page and navigation showroom instead of isolated renders',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.package.pages.map(page=>page.pageType).sort()).toEqual([...STOREFRONT_PAGE_TYPES].sort());
    expect(build.report.inheritedPageTypes).toEqual([]);
    expect(build.report.overriddenPageTypes).toHaveLength(STOREFRONT_PAGE_TYPES.length);
    expect(evaluateStorefrontTemplateShowroomContract(build.package)).toEqual([]);
    const evidence=createStorefrontTemplateShowroomEvidence(build.package);
    expect(evidence).toHaveLength(STOREFRONT_TEMPLATE_SHOWROOM_SURFACES.length);
    expect(evidence.every(row=>row.pageKey&&row.schemaVersion===1&&row.presentationAuthority==='gaming.loot-vault@2')).toBe(true);
    expect(evidence.filter(row=>row.reachability==='shell-navigation').every(row=>row.navigationPresent&&row.entrypointPresent)).toBe(true);
    expect(evidence.filter(row=>row.reachability==='shopper-journey').every(row=>row.entrypointPresent)).toBe(true);
  });

  it('exposes non-empty canonical account capability navigation in the showroom',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const account=build.package.pages.find(page=>page.pageType==='account')!;
    const serialized=JSON.stringify(account);
    for(const capability of CANONICAL_ACCOUNT_CAPABILITIES.filter(item=>!item.optional)){
      expect(serialized).toContain(capability.href);
      expect(serialized).toContain(capability.label);
    }
    expect(serialized).toContain('account-capability-demo');
    expect(serialized).toContain('Letöltéseim');
    expect(serialized).toContain('Kívánságlista');
  });

  it('demonstrates E1 E2 E7 E10 and E13 through actual shared storefront components',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const serialized=JSON.stringify(build.package);
    expect(serialized).toContain('commerce.catalog-facets');
    expect(serialized).toContain('system.search');
    expect(serialized).toContain('commerce.key-specs');
    expect(serialized).toContain('story.index');
    expect(serialized).toContain('commerce.purchase-controls');
    expect(serialized).toContain('commerce.cart-summary');
    expect(serialized).toContain('commerce.checkout-summary');
    expect(build.report.showroomEvidence.flatMap(row=>row.engines)).toEqual(expect.arrayContaining(['E1','E2','E7','E10','E13']));
  });

  it('keeps shared purchase and wishlist follow-up routes inside Factory preview authority',()=>{
    const confirmation=fs.readFileSync('src/components/cart/add-to-cart-confirmation.tsx','utf8');
    const purchase=fs.readFileSync('src/components/builder/storefront-purchase-controls-client.tsx','utf8');
    expect(confirmation).toContain("pathname==='/storefront-template-preview'");
    expect(confirmation).toContain("params.set('page','cart')");
    expect(confirmation).toContain('href={cartHref}');
    expect(purchase).toContain("searchParams.get('factory')==='1'");
    expect(purchase).toContain("params.set('page','account')");
    expect(purchase).toContain('router.push(previewAccountHref)');
  });

  it('rejects placeholder and generic fallback content from Product Owner readiness',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const serialized=JSON.stringify(build.package);
    expect(serialized).not.toContain('Minta tartalom');
    expect(serialized).not.toContain('A kínálat feltöltés alatt áll');
    expect(serialized).not.toContain('Ez a sablon által létrehozott mintaoldal');
    for(const key of ['page-rolunk','page-szallitas','page-fizetes','page-visszakuldes']){
      const fixture=build.package.demoFixtures?.find(item=>item.entityKey===key);
      expect(fixture?.payload.showroomReady).toBe(true);
      expect(String(fixture?.payload.body??'').length).toBeGreaterThan(40);
    }
  });
});
