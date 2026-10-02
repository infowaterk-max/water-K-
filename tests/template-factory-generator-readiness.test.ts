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
import {defineStorefrontTemplateGenome} from '@/lib/builder/template-factory/template-genome';

describe('Template Generator Readiness v0.1',()=>{
  it('marks Loot Vault v2 generator-ready without activating a generator runtime',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.report.generatorReadiness).toMatchObject({
      declared:true,
      ready:true,
      blueprintIdentity:'gaming.loot-vault@2',
      template3AuthoringReady:false,
      issues:[],
    });
    expect(build.report.generatorReadiness.productionMaturity.valid).toBe(true);
    expect(build.report.generatorReadiness.genomeValidation.valid).toBe(true);
    expect(build.report.generatorReadiness.typeSystemValidation.valid).toBe(true);
    expect(build.report.generatorReadiness.typeCompatibility.valid).toBe(true);
    expect(build.report.generatorReadiness.typeCompatibility.definition?.typeId).toBe('gaming');
    expect(build.report.generatorReadiness.productionMaturity.blockingCapabilityIds).toContain('VX-SMART-INTENT');
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

  it('keeps structural generator readiness separate from Brabus Template #3 maturity',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.report.generatorReadiness.ready).toBe(true);
    expect(build.report.generatorReadiness.template3AuthoringReady).toBe(false);
    expect(build.report.generatorReadiness.productionMaturity.blockingCapabilityIds.length).toBeGreaterThan(0);
  });

  it('fails closed when a generator-ready recipe omits its Template Genome',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const recipe={...LOOT_VAULT_V2_FACTORY_RECIPE,genome:undefined};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,recipe,package:build.package});
    expect(result.ready).toBe(false);
    expect(result.genomeValidation.valid).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('TEMPLATE_GENOME_REQUIRED');
  });

  it('fails closed when Genome content drifts without a matching immutable hash',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const genome=structuredClone(LOOT_VAULT_V2_FACTORY_RECIPE.genome!);
    genome.dimensions.composition.grammar='mutated-after-hash';
    const recipe={...LOOT_VAULT_V2_FACTORY_RECIPE,genome};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,recipe,package:build.package});
    expect(result.ready).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('TEMPLATE_GENOME_HASH_MISMATCH');
  });


  it('fails closed when a generator-ready recipe selects an unsupported Template Type',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const recipe={...LOOT_VAULT_V2_FACTORY_RECIPE,category:'automotive'};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,recipe,package:build.package});
    expect(result.ready).toBe(false);
    expect(result.typeCompatibility.valid).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('TEMPLATE_TYPE_UNSUPPORTED');
  });

  it('fails closed when a hash-valid Genome has no meaningful semantic overlap with its selected type',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const source=structuredClone(LOOT_VAULT_V2_FACTORY_RECIPE.genome!);
    const {hash:_hash,...input}=source;
    input.dimensions.composition.archetypes=['alien-layout'];
    input.dimensions.image.roles=['alien-media'];
    input.dimensions.componentGrammar.preferred=['alien.component'];
    const genome=defineStorefrontTemplateGenome(input);
    const recipe={...LOOT_VAULT_V2_FACTORY_RECIPE,genome};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,recipe,package:build.package});
    expect(result.genomeValidation.valid).toBe(true);
    expect(result.typeCompatibility.valid).toBe(false);
    expect(result.ready).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toEqual(expect.arrayContaining([
      'TEMPLATE_TYPE_ARCHETYPE_INCOMPATIBLE',
      'TEMPLATE_TYPE_MEDIA_ROLE_INCOMPATIBLE',
      'TEMPLATE_TYPE_COMPONENT_GRAMMAR_INCOMPATIBLE',
    ]));
  });

  it('keeps undeclared recipes outside generator-ready status instead of inventing metadata',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const result=evaluateStorefrontTemplateGeneratorReadiness({recipe:LOOT_VAULT_V2_FACTORY_RECIPE,package:build.package});
    expect(result).toMatchObject({declared:false,ready:false,blueprintIdentity:null});
    expect(result.issues.map(issue=>issue.code)).toContain('GENERATOR_BLUEPRINT_REQUIRED');
  });
});
