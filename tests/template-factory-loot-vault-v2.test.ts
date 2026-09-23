import {describe,expect,it} from 'vitest';
import {
  buildRegisteredStorefrontTemplateFactoryCandidate,
  getStorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory/recipe-registry';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';

describe('Loot Vault v2 Factory canary recipe',()=>{
  it('locks the accepted visual reference and the complete media production plan',()=>{
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.reference).toMatchObject({
      key:'gaming.loot-vault.accepted-reference-2026-09-06',
      approved:true,
    });
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.minimumRepresentativeMedia).toBe(14);
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({role:'hero',minCount:1,aspectRatio:'16:9'}),
      expect.objectContaining({role:'category',minCount:6,aspectRatio:'4:5'}),
      expect.objectContaining({role:'product',minCount:4,aspectRatio:'4:5'}),
      expect.objectContaining({role:'editorial',minCount:2,aspectRatio:'3:2'}),
      expect.objectContaining({role:'background',minCount:1,aspectRatio:'16:9'}),
    ]));
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.requirements?.reduce((sum,item)=>sum+item.minCount,0)).toBe(14);
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.assets).toHaveLength(14);
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.assets.every(asset=>asset.state==='planned')).toBe(true);
  });

  it('builds the full 14-page technical candidate with one registry call',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.package.pages).toHaveLength(14);
    expect(build.package.pages.every(page=>page.templateKey==='gaming.loot-vault'&&page.templateVersion===2)).toBe(true);
    expect(build.package.manifest.demoContent.namespace).toBe('gaming-loot-vault-v2');
    expect(build.report.overriddenPageTypes).toEqual(expect.arrayContaining(['home','catalog','product','blog-index','blog-article']));
    expect(build.report.overriddenPageTypes).toHaveLength(5);
    expect(build.report.plannedMediaCount).toBe(14);
    expect(build.report.representativeMediaCount).toBe(0);
  });

  it('automatically removes Playroom brand text from inherited pages',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    for(const page of build.package.pages){
      const serialized=JSON.stringify(page);
      expect(serialized).not.toContain('PLAYROOM');
      expect(serialized).not.toContain('Playroom');
    }
  });

  it('stays fail-closed until reference-critical pages, representative media and internal review are complete',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.report.productOwnerReady).toBe(false);
    const codes=build.report.issues.map(issue=>issue.code);
    expect(codes).toEqual(expect.arrayContaining([
      'FACTORY_MEDIA_COVERAGE',
      'FACTORY_MEDIA_ROLE_MISSING',
      'FACTORY_MEDIA_REQUIREMENT_MISSING',
      'FACTORY_INTERNAL_VISUAL_REVIEW_REQUIRED',
    ]));
    expect(codes).not.toContain('FACTORY_REFERENCE_PAGE_NOT_OWNED');
    expect(codes).not.toContain('FACTORY_FOUNDATION_MEDIA_LEAK');
    expect(codes).not.toContain('FACTORY_MEDIA_NOT_WIRED');
  });

  it('fails closed for an unregistered template instead of fabricating a recipe',()=>{
    expect(getStorefrontTemplateFactoryRecipe('gaming.missing')).toBeNull();
    expect(()=>buildRegisteredStorefrontTemplateFactoryCandidate('gaming.missing')).toThrow('TEMPLATE_FACTORY_RECIPE_MISSING:gaming.missing');
  });
});
