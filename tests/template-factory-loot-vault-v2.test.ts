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
      key:'gaming.loot-vault.visual-first-approved-2026-09-28',
      approved:true,
    });
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.reference.requiredPageTypes).toEqual(STOREFRONT_PAGE_TYPES);
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

  it('locks the Product Owner approved Visual First authority and 95% fidelity target across all 14 pages',()=>{
    expect(LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    for(const page of LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages){
      expect(page.metadata?.visualAuthority).toBe('product-owner-approved-2026-09-28');
      expect(page.metadata?.referenceComposition).toBe('approved-2026-09-28-visual-first');
      expect(page.metadata?.visualFidelityTargetPercent).toBe(95);
      expect(page.metadata?.builderCompatibility).toBe('required-public-visual-builder');
      expect(page.metadata?.implementationMode).toBe('canonical-page-schema-builder-safe');
    }
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

  it('keeps the core Loot Vault commerce assortment visually diverse',()=>{
    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home');
    const catalog=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog');
    expect(home).toBeTruthy();
    expect(catalog).toBeTruthy();

    const homeNodes=walk(home!.sections);
    const universeImages=homeNodes
      .filter(node=>/^loot-vault-loot-v2-universe-\d+-image$/.test(node.id))
      .map(node=>String(node.config.src??''));
    expect(universeImages).toHaveLength(6);
    expect(new Set(universeImages).size).toBeGreaterThanOrEqual(5);

    const catalogProducts=walk(catalog!.sections).find(node=>node.id==='loot-vault-loot-v2-catalog-products');
    const products=(catalogProducts?.config.products??[]) as Array<Record<string,unknown>>;
    expect(products).toHaveLength(6);
    const productImages=products.map(item=>String(item.image??''));
    expect(new Set(productImages).size).toBeGreaterThanOrEqual(5);
  });

  it('locks the cinematic responsive shell details that define the approved Loot Vault direction',()=>{
    const byType=(pageType:string)=>{
      const page=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===pageType);
      expect(page,pageType).toBeTruthy();
      return {page:page!,nodes:walk(page!.sections)};
    };

    for(const pageType of ['account','cart','checkout','faq','contact']){
      const {nodes}=byType(pageType);
      const cinematicHeroImage=nodes.find(node=>node.componentKey==='content.image'&&String(node.id).includes(pageType)&&String(node.id).includes('bg'));
      expect(cinematicHeroImage,pageType).toBeTruthy();
      expect(String(cinematicHeroImage?.config.src),pageType).toMatch(/^\/storefront-demo\/loot-vault-v2\//);
    }

    const {nodes:homeNodes}=byType('home');
    const universeGrid=homeNodes.find(node=>node.id==='loot-vault-loot-v2-universe-grid');
    expect((universeGrid?.config.style as Record<string,unknown>)?.mobile).toMatchObject({
      gridAutoFlow:'column',
      scrollSnapType:'x mandatory',
      overflowX:'auto',
    });
    for(let index=1;index<=6;index++){
      const card=homeNodes.find(node=>node.id===`loot-vault-loot-v2-universe-${index}`);
      expect(card?.responsive?.mobile?.gridSpan).toBe(1);
    }

    const {nodes:checkoutNodes}=byType('checkout');
    const checkoutSummary=checkoutNodes.find(node=>node.componentKey==='commerce.checkout-summary');
    expect(checkoutSummary?.config.presentation).toBe('loot-vault-cinematic');

    for(const page of LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const header=nodes.find(node=>node.id==='loot-vault-shell-header');
      expect(header?.config.presentation,page.pageType).toBe('compact-single-row');
      expect(header?.config.showUtilityLabels,page.pageType).toBe(false);
      const navigation=nodes.find(node=>node.id==='loot-vault-shell-nav');
      expect((navigation?.config.items as unknown[]),page.pageType).toHaveLength(4);

      const footer=nodes.find(node=>node.id==='loot-vault-shell-footer');
      expect(footer?.config.presentation,page.pageType).toBe('flush');
      expect(footer?.config.spacing,page.pageType).toBe('none');
    }
  });

  it('keeps Loot Vault category and product visuals on dedicated asset paths',()=>{
    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home');
    expect(home).toBeTruthy();
    const nodes=walk(home!.sections);
    const universeImages=nodes
      .filter(node=>/^loot-vault-loot-v2-universe-\d-image$/.test(node.id))
      .map(node=>String(node.config.src??''));
    expect(universeImages).toHaveLength(6);
    expect(new Set(universeImages).size).toBe(6);
    expect(universeImages.every(src=>src.startsWith('/storefront-demo/loot-vault-v2/category-'))).toBe(true);

    const grid=nodes.find(node=>node.id==='loot-vault-loot-v2-product-grid');
    const products=(grid?.config.products??[]) as Array<Record<string,unknown>>;
    const productImages=products.map(item=>String(item.image??''));
    expect(productImages).toHaveLength(4);
    expect(new Set(productImages).size).toBe(4);
    expect(productImages.every(src=>src.startsWith('/storefront-demo/loot-vault-v2/product-'))).toBe(true);
  });

  it('keeps customer-facing demo copy free from internal platform vocabulary',()=>{
    const fixtures=LOOT_VAULT_V2_TEMPLATE_PACKAGE.demoFixtures??[];
    const customerCopy=fixtures.flatMap(item=>{
      const payload=item.payload as Record<string,unknown>;
      return ['title','excerpt','body'].map(key=>String(payload[key]??'')).filter(Boolean);
    }).join('\n');
    expect(customerCopy).not.toMatch(/\b(?:acceptance|preview|canonical|authority|engine|builder|storefront|shoperation|fixture|platformképesség|showroom)\b/i);
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
