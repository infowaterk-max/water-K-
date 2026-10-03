import {describe,expect,it} from 'vitest';
import {
  createStorefrontTemplateDistinctnessProfile,
  evaluateStorefrontTemplateDistinctness,
  STOREFRONT_TEMPLATE_DISTINCTNESS_AXES,
} from '@/lib/builder/template-factory/template-distinctness';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES} from '@/lib/builder/storefront-template-catalog';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

function foreignClone(source:StorefrontInstallableTemplatePackage,key='gaming.clone-probe'):StorefrontInstallableTemplatePackage{
  const clone=structuredClone(source);
  clone.manifest={...clone.manifest,templateKey:key,templateVersion:1,demoContent:{...clone.manifest.demoContent,namespace:'clone-probe'}};
  clone.pages=clone.pages.map(page=>({...page,templateKey:key,templateVersion:1}));
  return clone;
}

function repaint(source:StorefrontInstallableTemplatePackage):StorefrontInstallableTemplatePackage{
  const clone=foreignClone(source,'gaming.repaint-probe');
  const visit=(value:unknown,key=''):unknown=>{
    if(Array.isArray(value))return value.map(item=>visit(item,key));
    if(value&&typeof value==='object'){
      return Object.fromEntries(Object.keys(value as Record<string,unknown>).sort().map(k=>[k,visit((value as Record<string,unknown>)[k],k)]));
    }
    if(typeof value==='string'){
      if(/(?:src|logoUrl|image)$/i.test(key))return '/repainted/'+value.split('/').at(-1);
      if(/#(?:[0-9a-f]{3,8})\b/i.test(value)||/rgba?\(/i.test(value))return '#765432';
      if(/(?:brandLabel|tagline|title|copy|label|alt)$/i.test(key))return 'Repainted identity copy';
    }
    return value;
  };
  return visit(clone) as StorefrontInstallableTemplatePackage;
}

describe('Cross-template distinctness / anti-clone Brabus authority',()=>{
  it('profiles exactly eight explainable axes without concrete media source tokens',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const profile=createStorefrontTemplateDistinctnessProfile({package:build.package,genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome});
    expect(Object.keys(profile.axes)).toEqual(STOREFRONT_TEMPLATE_DISTINCTNESS_AXES);
    for(const axis of STOREFRONT_TEMPLATE_DISTINCTNESS_AXES)expect(profile.axes[axis].length).toBeGreaterThan(0);
    expect(JSON.stringify(profile)).not.toContain('/storefront-demo/');
    expect(JSON.stringify(profile)).not.toContain('.webp');
  });

  it('keeps canonical Loot Vault v2 distinct from every foreign implemented catalog package',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const result=evaluateStorefrontTemplateDistinctness({
      package:build.package,
      genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome,
      references:STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.corpusSize).toBeGreaterThan(20);
    expect(result.comparisons.some(row=>row.reference.templateKey==='gaming.loot-vault')).toBe(false);
    expect(result.nearest.length).toBeLessThanOrEqual(5);
    const playroom=result.comparisons.find(row=>row.reference.templateKey==='gaming.playroom');
    expect(playroom).toBeDefined();
    expect(playroom?.exclusionHits.length).toBeGreaterThan(0);
    expect(playroom?.blocked).toBe(false);
  });

  it('blocks an exact foreign package clone even after template identity changes',()=>{
    const candidate=foreignClone(PLAYROOM_V20_TEMPLATE_PACKAGE);
    const result=evaluateStorefrontTemplateDistinctness({package:candidate,references:[PLAYROOM_V20_TEMPLATE_PACKAGE]});
    expect(result.valid).toBe(false);
    expect(result.comparisons[0]?.overallSimilarity).toBe(100);
    expect(result.comparisons[0]?.criticalAxisHits.length).toBeGreaterThanOrEqual(4);
    expect(result.issues.map(row=>row.code)).toContain('DISTINCTNESS_SIMILARITY_BUDGET_EXCEEDED');
  });

  it('blocks a repaint clone when colors, copy and media paths change but visual grammar remains',()=>{
    const candidate=repaint(PLAYROOM_V20_TEMPLATE_PACKAGE);
    const result=evaluateStorefrontTemplateDistinctness({package:candidate,references:[PLAYROOM_V20_TEMPLATE_PACKAGE]});
    expect(result.valid).toBe(false);
    expect(result.comparisons[0]?.blocked).toBe(true);
    expect(result.comparisons[0]?.criticalAxisHits.length).toBeGreaterThanOrEqual(4);
  });

  it('excludes same-templateKey evolution from cross-template clone comparison',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const legacy=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.find(row=>row.manifest.templateKey==='gaming.loot-vault');
    if(!legacy)throw new Error('TEST_LEGACY_LOOT_VAULT_MISSING');
    const result=evaluateStorefrontTemplateDistinctness({
      package:build.package,
      genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome,
      references:[legacy,PLAYROOM_V20_TEMPLATE_PACKAGE],
    });
    expect(result.corpusSize).toBe(1);
    expect(result.comparisons).toHaveLength(1);
    expect(result.comparisons[0]?.reference.templateKey).toBe('gaming.playroom');
  });

  it('fails closed instead of inventing distinctness proof when no foreign corpus exists',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const result=evaluateStorefrontTemplateDistinctness({package:build.package,genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome,references:[]});
    expect(result.valid).toBe(false);
    expect(result.corpusSize).toBe(0);
    expect(result.issues.map(row=>row.code)).toContain('DISTINCTNESS_REFERENCE_CORPUS_EMPTY');
  });

  it('is invariant to object-key insertion order for equivalent package evidence',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const clone=structuredClone(build.package);
    const reordered={demoFixtures:clone.demoFixtures,pages:clone.pages,manifest:clone.manifest} as StorefrontInstallableTemplatePackage;
    expect(createStorefrontTemplateDistinctnessProfile({package:reordered,genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome}))
      .toEqual(createStorefrontTemplateDistinctnessProfile({package:build.package,genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome}));
  });
});
