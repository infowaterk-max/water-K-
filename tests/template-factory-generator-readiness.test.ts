import {describe,expect,it} from 'vitest';
import {
  assertStorefrontTemplateGeneratorReady,
  evaluateStorefrontTemplateGeneratorReadiness,
  type StorefrontTemplateGeneratorBlueprint,
} from '@/lib/builder/template-factory/generator-readiness';
import {LOOT_VAULT_V2_GENERATOR_BLUEPRINT} from '@/lib/builder/template-factory/blueprints/loot-vault-v2';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS} from '@/lib/builder/storefront-foundation';

describe('Template Generator Readiness v0.1',()=>{
  it('marks Loot Vault v2 generator-ready without activating a generator runtime',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.report.generatorReadiness).toMatchObject({
      declared:true,
      ready:true,
      blueprintIdentity:'gaming.loot-vault@2',
      issues:[],
    });
    expect(LOOT_VAULT_V2_GENERATOR_BLUEPRINT.generator).toEqual({implementation:'deferred',target:'template-compiler'});
    expect(LOOT_VAULT_V2_GENERATOR_BLUEPRINT.composition.pageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect(LOOT_VAULT_V2_GENERATOR_BLUEPRINT.composition.viewports).toEqual(STOREFRONT_VIEWPORTS);
    expect(()=>assertStorefrontTemplateGeneratorReady(build.report.generatorReadiness)).not.toThrow();
  });

  it('fails closed when canonical viewport authority drifts',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const drift=structuredClone(LOOT_VAULT_V2_GENERATOR_BLUEPRINT) as StorefrontTemplateGeneratorBlueprint;
    drift.composition={...drift.composition,viewports:['desktop','mobile'] as StorefrontTemplateGeneratorBlueprint['composition']['viewports']};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:drift,recipe:LOOT_VAULT_V2_FACTORY_RECIPE,package:build.package});
    expect(result.ready).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('GENERATOR_CANONICAL_VIEWPORT_MATRIX_REQUIRED');
    expect(()=>assertStorefrontTemplateGeneratorReady(result)).toThrow(/TEMPLATE_GENERATOR_NOT_READY/);
  });

  it('fails closed when declared page ownership stops matching the Factory recipe',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const drift=structuredClone(LOOT_VAULT_V2_GENERATOR_BLUEPRINT) as StorefrontTemplateGeneratorBlueprint;
    drift.composition={...drift.composition,templateOwnedPageTypes:['home'] as StorefrontTemplateGeneratorBlueprint['composition']['templateOwnedPageTypes']};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:drift,recipe:LOOT_VAULT_V2_FACTORY_RECIPE,package:build.package});
    expect(result.ready).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('GENERATOR_PAGE_OWNERSHIP_DRIFT');
  });

  it('keeps undeclared recipes outside generator-ready status instead of inventing metadata',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const result=evaluateStorefrontTemplateGeneratorReadiness({recipe:LOOT_VAULT_V2_FACTORY_RECIPE,package:build.package});
    expect(result).toMatchObject({declared:false,ready:false,blueprintIdentity:null});
    expect(result.issues.map(issue=>issue.code)).toContain('GENERATOR_BLUEPRINT_REQUIRED');
  });
});
