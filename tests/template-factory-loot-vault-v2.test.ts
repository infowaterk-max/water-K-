import {describe,expect,it} from 'vitest';
import {
  buildRegisteredStorefrontTemplateFactoryCandidate,
  getStorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory/recipe-registry';
import {getStorefrontTemplateDemoContent} from '@/lib/builder/storefront-template-route-integrity';
import {createStorefrontTemplateFactoryMediaWorkOrder,pendingStorefrontTemplateFactoryMediaWorkOrders} from '@/lib/builder/template-factory/media-production';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';

describe('Loot Vault v2 Factory canary recipe',()=>{
  it('locks the accepted visual reference and the complete 14-asset production plan',()=>{
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.reference).toMatchObject({
      key:'gaming.loot-vault.accepted-reference-2026-09-06',
      approved:true,
      requiredPageTypes:['home','catalog','product','blog-index','blog-article'],
    });
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.minimumRepresentativeMedia).toBe(14);
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.assets.filter(asset=>asset.representative)).toHaveLength(14);
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({role:'hero',minCount:1,aspectRatio:'16:9'}),
      expect.objectContaining({role:'category',minCount:6,aspectRatio:'4:5'}),
      expect.objectContaining({role:'product',minCount:4,aspectRatio:'4:5'}),
      expect.objectContaining({role:'editorial',minCount:2,aspectRatio:'3:2'}),
      expect.objectContaining({role:'background',minCount:1,aspectRatio:'16:9'}),
    ]));
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.assets.every(asset=>!asset.src.endsWith('.svg'))).toBe(true);
  });

  it('builds the full 14-page v2 candidate with one registry call while keeping inherited pages',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.package.pages).toHaveLength(14);
    expect(build.package.pages.every(page=>page.templateKey==='gaming.loot-vault'&&page.templateVersion===2)).toBe(true);
    expect(build.package.manifest.demoContent.namespace).toBe('gaming-loot-vault-v2');
    expect(build.report.overriddenPageTypes).toEqual(expect.arrayContaining(['home','catalog','product','account','blog-index','blog-article']));
    expect(build.report.overriddenPageTypes).toHaveLength(6);
    expect(build.report.inheritedPageTypes).toHaveLength(8);
    const account=build.package.pages.find(page=>page.pageType==='account')!;
    expect(account.metadata?.templateFactory).toMatchObject({ownership:'template',category:'gaming'});
    expect(account.metadata).toMatchObject({authComposition:'template-owned-v1',authPreset:'loot-vault-v2-vault-access'});
    expect(account.sections.some(section=>(section.config as Record<string,unknown>).authPublic===true)).toBe(true);
    expect(JSON.stringify(account)).not.toContain('FIÓK KÖZPONT');
    expect(JSON.stringify(account)).not.toContain('#ff63bf');
  });

  it('uses one Loot Vault-owned shell and removes all Playroom brand/media leakage from every page',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const header=JSON.stringify(build.package.pages[0]!.sections[0]);
    const footer=JSON.stringify(build.package.pages[0]!.sections.at(-1));
    for(const page of build.package.pages){
      expect(JSON.stringify(page.sections[0])).toBe(header);
      expect(JSON.stringify(page.sections.at(-1))).toBe(footer);
      const serialized=JSON.stringify(page);
      expect(serialized).not.toContain('PLAYROOM');
      expect(serialized).not.toContain('Playroom');
      expect(serialized).not.toContain('/storefront/playroom/');
      expect(serialized).toContain('Loot Vault');
    }
  });

  it('promotes final local media to Product Owner readiness after the internal screenshot review passes',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.report.representativeMediaCount).toBe(14);
    expect(build.report.technicalRepresentativeMediaCount).toBe(14);
    expect(build.report.internalReferenceMediaCount).toBe(0);
    expect(build.report.plannedMediaCount).toBe(0);
    expect(build.report.technicalReady).toBe(true);
    expect(build.report.productOwnerReady).toBe(true);
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.productOwnerReview.internalVisualReviewPassed).toBe(true);
    const codes=build.report.issues.map(issue=>issue.code);
    expect(codes).not.toContain('FACTORY_INTERNAL_VISUAL_REVIEW_REQUIRED');
    expect(codes).not.toContain('FACTORY_MEDIA_FINALIZATION_REQUIRED');
    expect(codes).not.toEqual(expect.arrayContaining([
      'FACTORY_MEDIA_COVERAGE',
      'FACTORY_MEDIA_ROLE_MISSING',
      'FACTORY_MEDIA_REQUIREMENT_MISSING',
    ]));
    expect(codes).not.toEqual(expect.arrayContaining([
      'FACTORY_REFERENCE_PAGE_NOT_OWNED',
      'FACTORY_FOUNDATION_MEDIA_LEAK',
      'FACTORY_FOUNDATION_BRAND_LEAK',
      'FACTORY_CANONICAL_HEADER_DRIFT',
      'FACTORY_CANONICAL_FOOTER_DRIFT',
      'FACTORY_ACCOUNT_AUTH_TEMPLATE_OWNERSHIP_REQUIRED',
      'FACTORY_ACCOUNT_AUTH_PUBLIC_COMPOSITION_REQUIRED',
    ]));
    expect(getStorefrontTemplateDemoContent(build.package,'szallitas')?.payload.slug).toBe('szallitas');
  });

  it('keeps the five accepted-reference surfaces explicitly template-owned and media-wired',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    for(const pageType of LOOT_VAULT_V2_FACTORY_RECIPE.reference.requiredPageTypes){
      expect(build.report.overriddenPageTypes).toContain(pageType);
      const page=build.package.pages.find(item=>item.pageType===pageType)!;
      expect(page.metadata?.factoryVisualPack).toBe('loot-vault-v2-reference-pack-v1');
    }
    for(const asset of LOOT_VAULT_V2_FACTORY_RECIPE.media.assets){
      expect(asset.src.startsWith('/storefront-demo/loot-vault-v2/')).toBe(true);
      expect(asset.state).toBe('ready');
      expect(asset.referenceSrc).toBeUndefined();
      for(const pageType of asset.pageTypes){
        const page=build.package.pages.find(item=>item.pageType===pageType)!;
        expect(JSON.stringify(page)).toContain(asset.src);
      }
    }
  });

  it('turns the visual recipe into a deterministic 14-item media production work order',()=>{
    const orders=createStorefrontTemplateFactoryMediaWorkOrder(LOOT_VAULT_V2_FACTORY_RECIPE);
    expect(orders).toHaveLength(14);
    expect(pendingStorefrontTemplateFactoryMediaWorkOrders(LOOT_VAULT_V2_FACTORY_RECIPE)).toHaveLength(0);
    expect(new Set(orders.map(order=>order.assetKey)).size).toBe(14);
    expect(orders.every(order=>order.referenceKey==='gaming.loot-vault.accepted-reference-2026-09-06')).toBe(true);
    expect(orders.every(order=>order.outputPath.startsWith('/storefront-demo/loot-vault-v2/')&&order.outputPath.endsWith('.webp'))).toBe(true);
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.assets.every(asset=>asset.state==='ready'&&asset.referenceSrc===undefined)).toBe(true);
    expect(orders.every(order=>order.productionBrief.includes('Prémium, kész webshop-minőségű'))).toBe(true);
    expect(orders.every(order=>order.constraints.some(value=>value.includes('felirat, logó, vízjel')))).toBe(true);
    expect(orders.find(order=>order.role==='hero')).toMatchObject({aspectRatio:'16:9',state:'ready'});
    expect(orders.filter(order=>order.role==='category')).toHaveLength(6);
    expect(orders.filter(order=>order.role==='product')).toHaveLength(4);
  });
  it('fails closed for an unregistered template instead of fabricating a recipe',()=>{
    expect(getStorefrontTemplateFactoryRecipe('gaming.missing')).toBeNull();
    expect(()=>buildRegisteredStorefrontTemplateFactoryCandidate('gaming.missing')).toThrow('TEMPLATE_FACTORY_RECIPE_MISSING:gaming.missing');
  });
});
