import {describe,expect,it} from 'vitest';
import {
  buildRegisteredStorefrontTemplateFactoryCandidate,
  getStorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory/recipe-registry';
import {
  LOOT_VAULT_V2_FACTORY_MEDIA_ASSETS,
  LOOT_VAULT_V2_FACTORY_RECIPE,
} from '@/lib/builder/template-factory/recipes/loot-vault-v2';
import {LOOT_VAULT_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/loot-vault/v2';
import {resolveStorefrontTemplatePreviewPackage} from '@/lib/builder/storefront-template-preview-auth';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {STOREFRONT_SUPPORT_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-support';

const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);

describe('Loot Vault v2 Factory canonical wiring',()=>{
  it('keeps Factory media metadata complete and package-owned',()=>{
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.reference).toMatchObject({
      key:'gaming.loot-vault.accepted-reference-2026-09-06',
      approved:true,
    });
    expect(LOOT_VAULT_V2_FACTORY_MEDIA_ASSETS).toHaveLength(14);
    expect(LOOT_VAULT_V2_FACTORY_MEDIA_ASSETS.every(asset=>asset.state==='ready'&&asset.src.startsWith('/storefront-demo/loot-vault-v2/'))).toBe(true);
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.requirements?.reduce((sum,item)=>sum+item.minCount,0)).toBe(14);
  });

  it('compiles the exact canonical 14-page v2 package instead of a parallel Page Schema authority',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.package).toEqual(LOOT_VAULT_V2_TEMPLATE_PACKAGE);
    expect(build.package.pages.map(page=>page.pageType)).toEqual(STOREFRONT_PAGE_TYPES);
    expect(build.report.inheritedPageTypes).toEqual([]);
    expect(build.report.overriddenPageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    const article=build.package.pages.find(page=>page.pageType==='blog-article');
    expect(JSON.stringify(article)).toContain('"componentKey":"story.hero"');
  });

  it('is Product Owner preview-ready without implying acceptance or production catalog activation',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.report.issues).toEqual([]);
    expect(build.report.technicalReady).toBe(true);
    expect(build.report.productOwnerReady).toBe(true);
    expect(build.report.representativeMediaCount).toBe(14);
    expect(build.report.plannedMediaCount).toBe(0);
    expect(build.report.internalReferenceMediaCount).toBe(0);

    const preview=resolveStorefrontTemplatePreviewPackage('gaming.loot-vault',2,true);
    expect(preview).toEqual(LOOT_VAULT_V2_TEMPLATE_PACKAGE);

    expect(getStorefrontTemplatePackage('gaming.loot-vault',2)).toBeUndefined();
    expect(getStorefrontTemplatePackage('gaming.loot-vault',1)?.manifest.templateVersion).toBe(1);
  });

  it('requires complete shopper navigation in preview, especially on mobile',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const required=['/','/webaruhaz','/blog','/oldal/rolunk','/gyik','/kapcsolat','/szallitas-es-fizetes','/oldal/visszakuldes','/kedvencek','/fiokom','/aszf','/adatvedelem','/impresszum'];
    for(const page of build.package.pages){
      const nodes=walk(page.sections);
      const header=nodes.find(node=>node.componentKey==='system.commerce-header');
      expect(header, page.pageType).toBeTruthy();
      const menu=(header?.config.mobileMenuItems??[]) as {label?:string;href?:string}[];
      expect(menu.map(item=>item.href), page.pageType).toEqual(required);
      const footer=nodes.find(node=>node.componentKey==='editorial.footer');
      const footerRoutes=((footer?.config.columns??[]) as {items?:{href?:string}[]}[]).flatMap(column=>column.items??[]).map(item=>item.href);
      for(const href of ['/webaruhaz','/blog','/oldal/rolunk','/gyik','/kapcsolat','/szallitas-es-fizetes','/oldal/visszakuldes','/fiokom','/aszf','/adatvedelem','/impresszum'])expect(footerRoutes).toContain(href);
    }
  });

  it('keeps Contact functionally complete with real location map plus the shared topic-first wizard',()=>{
    const page=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='contact');
    expect(page).toBeTruthy();
    const nodes=walk(page!.sections);
    expect(nodes.some(node=>node.componentKey==='support.location-map')).toBe(true);
    expect(nodes.some(node=>node.componentKey==='support.contact-form')).toBe(true);
    const map=nodes.find(node=>node.componentKey==='support.location-map');
    expect(String(map?.config.embedUrl)).toMatch(/^https:\/\/www\.google\.com\/maps/);
    expect(page?.metadata?.contactCompleteness).toEqual({
      companyDetails:true,
      embeddedMap:'shared-support-location-map-v1',
      formWizard:'storefront-form-wizard-v1',
    });
    expect(STOREFRONT_SUPPORT_COMPONENT_DEFINITIONS.map(item=>item.manifest.componentKey)).toContain('support.location-map');
  });

  it('keeps Account capability-complete but compact instead of rendering a long tile directory',()=>{
    const page=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='account');
    const nodes=walk(page!.sections);
    const nav=nodes.find(node=>node.id==='loot-vault-loot-v2-account-capability-navigation');
    expect((nav?.config.items as unknown[])).toHaveLength(9);
    expect(nodes.some(node=>node.id==='loot-vault-loot-v2-account-capability-cards')).toBe(false);
    expect(JSON.stringify(page)).not.toContain('loot-vault-loot-v2-account-card-');
    expect(page?.metadata?.accountCompleteness).toEqual({
      navigationAuthority:'shared-account-capabilities',
      presentation:'compact-template-owned',
      longTileDirectory:false,
    });
  });

  it('keeps legal and information fixture content page-specific instead of title-swapped duplicates',()=>{
    const fixtures=LOOT_VAULT_V2_TEMPLATE_PACKAGE.demoFixtures??[];
    const legalSlugs=['aszf','adatvedelem','impresszum','szallitas','fizetes','visszakuldes'];
    const content=fixtures.filter(item=>item.entityType==='content'&&legalSlugs.includes(String((item.payload as Record<string,unknown>).slug)));
    expect(content).toHaveLength(legalSlugs.length);
    const bodies=content.map(item=>String((item.payload as Record<string,unknown>).body??'').trim());
    expect(bodies.every(body=>body.length>80)).toBe(true);
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it('keeps all 14 pages free from Playroom presentation leakage',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    for(const page of build.package.pages){
      const serialized=JSON.stringify(page);
      expect(serialized).not.toContain('PLAYROOM');
      expect(serialized).not.toContain('Playroom');
    }
  });

  it('fails closed for an unregistered template instead of fabricating a recipe',()=>{
    expect(getStorefrontTemplateFactoryRecipe('gaming.missing')).toBeNull();
    expect(()=>buildRegisteredStorefrontTemplateFactoryCandidate('gaming.missing')).toThrow('TEMPLATE_FACTORY_RECIPE_MISSING:gaming.missing');
  });
});
