import {describe,expect,it} from 'vitest';
import {
  compileStorefrontTemplateMediaPlan,
  promoteStorefrontTemplateMediaAsset,
} from '@/lib/builder/template-factory/media-planner';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {
  compileStorefrontTemplateFactoryPackage,
  type StorefrontTemplateFactoryMediaAsset,
  type StorefrontTemplateFactoryMediaManifest,
} from '@/lib/builder/template-factory/scaffold';
import {GAMING_TEMPLATE_FACTORY_FOUNDATION} from '@/lib/builder/template-factory/category-foundations';

function constraintPlan(){
  const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
  const plan=build.report.generatorReadiness.constraintPlanning.plan;
  if(!plan)throw new Error('TEST_CONSTRAINT_PLAN_MISSING');
  return plan;
}

function manifest():StorefrontTemplateFactoryMediaManifest{
  return structuredClone(LOOT_VAULT_V2_FACTORY_RECIPE.media);
}

describe('Template Media Planner / Compiler Brabus authority',()=>{
  it('compiles deterministic immutable Asset Briefs from Constraint Plan semantic roles and manifest bindings',()=>{
    const plan=constraintPlan();
    const first=compileStorefrontTemplateMediaPlan({constraintPlan:plan,manifest:LOOT_VAULT_V2_FACTORY_RECIPE.media});
    const second=compileStorefrontTemplateMediaPlan({constraintPlan:plan,manifest:LOOT_VAULT_V2_FACTORY_RECIPE.media});

    expect(first.valid).toBe(true);
    expect(first.technicalFulfilled).toBe(true);
    expect(first.readyFulfilled).toBe(true);
    expect(first.issues).toEqual([]);
    expect(first.plan?.hash).toBe(second.plan?.hash);
    expect(Object.isFrozen(first.plan)).toBe(true);
    expect(first.plan?.sources.constraintPlanHash).toBe(plan.hash);
    expect(first.plan?.briefs.find(row=>row.semanticRole==='hero-scene')).toMatchObject({
      technicalRole:'hero',required:true,minCount:1,aspectRatio:'16:9',pageTypes:['home'],
    });
    expect(first.plan?.briefs.find(row=>row.semanticRole==='collector-product')).toMatchObject({
      technicalRole:'product',required:true,minCount:4,aspectRatio:'4:5',
    });
    const serialized=JSON.stringify(first.plan);
    expect(serialized).not.toContain('/storefront-demo/');
    expect(serialized).not.toContain('referenceSrc');
  });

  it('fails closed when a required Constraint Plan semantic role has no explicit manifest binding',()=>{
    const media=manifest();
    media.semanticBindings=media.semanticBindings?.filter(row=>row.semanticRole!=='hero-scene');
    const result=compileStorefrontTemplateMediaPlan({constraintPlan:constraintPlan(),manifest:media});
    expect(result.valid).toBe(false);
    expect(result.issues.map(row=>row.code)).toContain('MEDIA_PLANNER_REQUIRED_BINDING_MISSING');
  });

  it('rejects duplicate semantic ownership instead of making compilation declaration-order dependent',()=>{
    const media=manifest();
    const hero=media.semanticBindings?.find(row=>row.semanticRole==='hero-scene');
    if(!hero)throw new Error('TEST_HERO_BINDING_MISSING');
    media.semanticBindings=[...(media.semanticBindings??[]),{...hero,technicalRole:'editorial',aspectRatio:'3:2'}];
    const result=compileStorefrontTemplateMediaPlan({constraintPlan:constraintPlan(),manifest:media});
    expect(result.valid).toBe(false);
    expect(result.issues.map(row=>row.code)).toContain('MEDIA_PLANNER_SEMANTIC_ROLE_DUPLICATE');
  });

  it('rejects semantic bindings outside the Constraint Plan allowed media language',()=>{
    const media=manifest();
    media.semanticBindings=[...(media.semanticBindings??[]),{
      semanticRole:'foreign-campaign',
      technicalRole:'hero',
      minCount:1,
      aspectRatio:'16:9',
      pageTypes:['home'],
      representative:true,
    }];
    const result=compileStorefrontTemplateMediaPlan({constraintPlan:constraintPlan(),manifest:media});
    expect(result.valid).toBe(false);
    expect(result.issues.map(row=>row.code)).toContain('MEDIA_PLANNER_SEMANTIC_ROLE_OUT_OF_BOUNDS');
  });

  it('rejects concrete assets that violate their semantic brief and emits bounded repair actions',()=>{
    const media=manifest();
    const index=media.assets.findIndex(row=>row.semanticRole==='hero-scene');
    if(index<0)throw new Error('TEST_HERO_ASSET_MISSING');
    const assets=structuredClone(media.assets) as StorefrontTemplateFactoryMediaAsset[];
    assets[index]={...assets[index]!,role:'editorial',aspectRatio:'3:2',pageTypes:['home','catalog']};
    media.assets=assets;

    const result=compileStorefrontTemplateMediaPlan({constraintPlan:constraintPlan(),manifest:media});
    expect(result.valid).toBe(false);
    expect(result.issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'MEDIA_PLANNER_ASSET_ROLE_MISMATCH',
      'MEDIA_PLANNER_ASSET_ASPECT_MISMATCH',
      'MEDIA_PLANNER_ASSET_PAGE_SCOPE_MISMATCH',
    ]));
    expect(result.repairs.map(row=>row.action)).toEqual(expect.arrayContaining([
      'fix-role','fix-aspect-ratio','fix-page-scope','add-asset',
    ]));
  });

  it('keeps internal-reference technical fulfillment separate from ready fulfillment',()=>{
    const media=manifest();
    const assets=structuredClone(media.assets) as StorefrontTemplateFactoryMediaAsset[];
    const index=assets.findIndex(row=>row.semanticRole==='hero-scene');
    if(index<0)throw new Error('TEST_HERO_ASSET_MISSING');
    assets[index]={
      ...assets[index]!,
      state:'internal-reference',
      src:'planned://hero-scene',
      referenceSrc:'https://example.invalid/reference/hero-scene.webp',
    };
    media.assets=assets;
    const result=compileStorefrontTemplateMediaPlan({constraintPlan:constraintPlan(),manifest:media});
    const hero=result.fulfillment.find(row=>row.semanticRole==='hero-scene');
    expect(result.valid).toBe(true);
    expect(hero).toMatchObject({technicalFulfilled:true,readyFulfilled:false,technicalCount:1,readyCount:0});
    expect(result.technicalFulfilled).toBe(true);
    expect(result.readyFulfilled).toBe(false);
    expect(result.repairs).toContainEqual(expect.objectContaining({action:'promote-or-replace',semanticRole:'hero-scene'}));
  });


  it('fails closed when manifest state labels are unsupported by their source evidence',()=>{
    const badReference=manifest();
    const referenceAssets=structuredClone(badReference.assets) as StorefrontTemplateFactoryMediaAsset[];
    const heroIndex=referenceAssets.findIndex(row=>row.semanticRole==='hero-scene');
    if(heroIndex<0)throw new Error('TEST_HERO_ASSET_MISSING');
    referenceAssets[heroIndex]={...referenceAssets[heroIndex]!,state:'internal-reference',src:'planned://hero'};
    badReference.assets=referenceAssets;
    const referenceResult=compileStorefrontTemplateMediaPlan({constraintPlan:constraintPlan(),manifest:badReference});
    expect(referenceResult.valid).toBe(false);
    expect(referenceResult.issues.map(row=>row.code)).toContain('MEDIA_PLANNER_INTERNAL_REFERENCE_SOURCE_INVALID');

    const badReady=manifest();
    const readyAssets=structuredClone(badReady.assets) as StorefrontTemplateFactoryMediaAsset[];
    readyAssets[heroIndex]={...readyAssets[heroIndex]!,state:'ready',src:'https://example.invalid/fake-ready.webp'};
    badReady.assets=readyAssets;
    const readyResult=compileStorefrontTemplateMediaPlan({constraintPlan:constraintPlan(),manifest:badReady});
    expect(readyResult.valid).toBe(false);
    expect(readyResult.issues.map(row=>row.code)).toContain('MEDIA_PLANNER_READY_SOURCE_INVALID');
    expect(readyResult.readyFulfilled).toBe(false);
  });

  it('hashes the complete Asset Brief so binding changes cannot reuse stale evidence',()=>{
    const plan=constraintPlan();
    const first=compileStorefrontTemplateMediaPlan({constraintPlan:plan,manifest:manifest()});
    const changed=manifest();
    changed.semanticBindings=changed.semanticBindings?.map(row=>row.semanticRole==='hero-scene'
      ?{...row,pageTypes:['home','catalog']}
      :row);
    const second=compileStorefrontTemplateMediaPlan({constraintPlan:plan,manifest:changed});
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    expect(second.plan?.hash).not.toBe(first.plan?.hash);
  });


  it('blocks Factory technical readiness when generic media exists but required semantic fulfillment is missing',()=>{
    const recipe=structuredClone(LOOT_VAULT_V2_FACTORY_RECIPE);
    const assets=structuredClone(recipe.media.assets) as StorefrontTemplateFactoryMediaAsset[];
    const heroIndex=assets.findIndex(row=>row.semanticRole==='hero-scene');
    if(heroIndex<0)throw new Error('TEST_HERO_ASSET_MISSING');
    const {semanticRole:_semanticRole,...genericHero}=assets[heroIndex]!;
    assets[heroIndex]=genericHero;
    recipe.media={...recipe.media,assets};

    const build=compileStorefrontTemplateFactoryPackage({foundation:GAMING_TEMPLATE_FACTORY_FOUNDATION,recipe});
    expect(build.report.generatorReadiness.mediaPlanning.valid).toBe(true);
    expect(build.report.generatorReadiness.mediaPlanning.technicalFulfilled).toBe(false);
    expect(build.report.issues.map(row=>row.code)).toContain('FACTORY_SEMANTIC_MEDIA_COVERAGE');
    expect(build.report.technicalReady).toBe(false);
    expect(build.report.productOwnerReady).toBe(false);
  });

  it('allows semantic internal-reference media for technical QA but not Product Owner readiness',()=>{
    const recipe=structuredClone(LOOT_VAULT_V2_FACTORY_RECIPE);
    const assets=structuredClone(recipe.media.assets) as StorefrontTemplateFactoryMediaAsset[];
    const heroIndex=assets.findIndex(row=>row.semanticRole==='hero-scene');
    if(heroIndex<0)throw new Error('TEST_HERO_ASSET_MISSING');
    assets[heroIndex]={
      ...assets[heroIndex]!,
      state:'internal-reference',
      referenceSrc:'https://example.invalid/reference/hero-scene.webp',
    };
    recipe.media={...recipe.media,assets};

    const build=compileStorefrontTemplateFactoryPackage({foundation:GAMING_TEMPLATE_FACTORY_FOUNDATION,recipe});
    expect(build.report.generatorReadiness.mediaPlanning.valid).toBe(true);
    expect(build.report.generatorReadiness.mediaPlanning.technicalFulfilled).toBe(true);
    expect(build.report.generatorReadiness.mediaPlanning.readyFulfilled).toBe(false);
    expect(build.report.issues.map(row=>row.code)).toContain('FACTORY_MEDIA_FINALIZATION_REQUIRED');
    expect(build.report.technicalReady).toBe(true);
    expect(build.report.productOwnerReady).toBe(false);
  });

  it('enforces atomic media-state promotion and source evidence',()=>{
    const planned:StorefrontTemplateFactoryMediaAsset={
      key:'planned-hero',state:'planned',role:'hero',semanticRole:'hero-scene',
      src:'planned://hero',alt:'Planned hero',pageTypes:['home'],representative:true,aspectRatio:'16:9',
    };
    expect(promoteStorefrontTemplateMediaAsset({asset:planned,targetState:'ready',src:'/media/hero.webp'}).issues.map(row=>row.code))
      .toContain('MEDIA_PROMOTION_TRANSITION_INVALID');
    expect(promoteStorefrontTemplateMediaAsset({asset:planned,targetState:'internal-reference',referenceSrc:'http://unsafe.example/hero.webp'}).issues.map(row=>row.code))
      .toContain('MEDIA_PROMOTION_REFERENCE_SOURCE_REQUIRED');

    const reference=promoteStorefrontTemplateMediaAsset({
      asset:planned,targetState:'internal-reference',referenceSrc:'https://example.invalid/hero.webp',
    });
    expect(reference.valid).toBe(true);
    expect(reference.asset?.state).toBe('internal-reference');
    expect(Object.isFrozen(reference.asset)).toBe(true);
    expect(planned.state).toBe('planned');

    const badReady=promoteStorefrontTemplateMediaAsset({
      asset:reference.asset!,targetState:'ready',src:'https://example.invalid/final.webp',
    });
    expect(badReady.valid).toBe(false);
    expect(badReady.issues.map(row=>row.code)).toContain('MEDIA_PROMOTION_READY_SOURCE_REQUIRED');

    const ready=promoteStorefrontTemplateMediaAsset({
      asset:reference.asset!,targetState:'ready',src:'/storefront-demo/test/final.webp',
    });
    expect(ready.valid).toBe(true);
    expect(ready.asset?.state).toBe('ready');
    expect(ready.asset?.src).toBe('/storefront-demo/test/final.webp');
  });
});
