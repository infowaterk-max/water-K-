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
import type {StorefrontTemplateFactoryMediaAsset} from '@/lib/builder/template-factory/scaffold';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';
import {STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION} from '@/lib/builder/template-factory/production-compiler-contract';

describe('Template Generator Readiness v0.1',()=>{
  it('marks Loot Vault v2 generator-ready through the canonical Dynamic Production Compiler',()=>{
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
    expect(build.report.generatorReadiness.constraintPlanning.valid).toBe(true);
    expect(build.report.generatorReadiness.constraintPlanning.plan?.sources.visualAuthority.referenceKey).toBe(LOOT_VAULT_V2_GENERATOR_BLUEPRINT.productionContracts.visualAuthority.referenceKey);
    expect(build.report.generatorReadiness.mediaPlanning.valid).toBe(true);
    expect(build.report.generatorReadiness.mediaPlanning.technicalFulfilled).toBe(true);
    expect(build.report.generatorReadiness.mediaPlanning.readyFulfilled).toBe(true);
    expect(build.report.generatorReadiness.mediaPlanning.plan?.sources.constraintPlanHash).toBe(build.report.generatorReadiness.constraintPlanning.plan?.hash);
    expect(build.report.generatorReadiness.productionLineage?.valid).toBe(true);
    expect(build.report.generatorReadiness.productionLineage?.lineage?.hash).toBe(build.report.provenance.lineage?.hash);
    expect(build.report.generatorReadiness.distinctness.valid).toBe(true);
    expect(build.report.generatorReadiness.distinctness.corpusSize).toBeGreaterThan(20);
    expect(build.report.generatorReadiness.distinctness.comparisons.some(row=>row.reference.templateKey==='gaming.loot-vault')).toBe(false);
    expect(build.report.generatorReadiness.productionMaturity.blockingCapabilityIds).not.toContain('FACTORY-CONSTRAINT-PLANNER');
    expect(build.report.generatorReadiness.productionMaturity.blockingCapabilityIds).toContain('VX-SMART-INTENT');
    expect(LOOT_VAULT_V2_GENERATOR_BLUEPRINT.generator).toEqual({implementation:'dynamic-production-compiler',target:'template-compiler',compilerContract:STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION});
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


  it('fails closed when generator-ready production intent is missing',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const recipe={...LOOT_VAULT_V2_FACTORY_RECIPE,productionIntent:undefined};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,recipe,package:build.package});
    expect(result.ready).toBe(false);
    expect(result.constraintPlanning.valid).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('CONSTRAINT_PLANNER_INTENT_REQUIRED');
  });

  it('fails closed when Product Owner intent is bound to a foreign Visual Authority',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const productionIntent={...LOOT_VAULT_V2_FACTORY_RECIPE.productionIntent!,visualAuthorityReferenceKey:'gaming.foreign.reference'};
    const recipe={...LOOT_VAULT_V2_FACTORY_RECIPE,productionIntent};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,recipe,package:build.package});
    expect(result.ready).toBe(false);
    expect(result.constraintPlanning.valid).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('CONSTRAINT_PLANNER_VISUAL_AUTHORITY_DRIFT');
  });


  it('fails closed when a required Media Planner semantic binding is missing',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const media={
      ...LOOT_VAULT_V2_FACTORY_RECIPE.media,
      semanticBindings:LOOT_VAULT_V2_FACTORY_RECIPE.media.semanticBindings?.filter(row=>row.semanticRole!=='hero-scene'),
    };
    const recipe={...LOOT_VAULT_V2_FACTORY_RECIPE,media};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,recipe,package:build.package});
    expect(result.constraintPlanning.valid).toBe(true);
    expect(result.mediaPlanning.valid).toBe(false);
    expect(result.ready).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('MEDIA_PLANNER_REQUIRED_BINDING_MISSING');
  });

  it('does not confuse non-ready media production state with an invalid Media Plan',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const assets=structuredClone(LOOT_VAULT_V2_FACTORY_RECIPE.media.assets) as StorefrontTemplateFactoryMediaAsset[];
    const index=assets.findIndex(row=>row.semanticRole==='hero-scene');
    if(index<0)throw new Error('TEST_HERO_ASSET_MISSING');
    assets[index]={
      ...assets[index]!,
      state:'internal-reference',
      src:'planned://hero-scene',
      referenceSrc:'https://example.invalid/hero-scene.webp',
    };
    const recipe={...LOOT_VAULT_V2_FACTORY_RECIPE,media:{...LOOT_VAULT_V2_FACTORY_RECIPE.media,assets}};
    const result=evaluateStorefrontTemplateGeneratorReadiness({blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,recipe,package:build.package});
    expect(result.mediaPlanning.valid).toBe(true);
    expect(result.mediaPlanning.technicalFulfilled).toBe(true);
    expect(result.mediaPlanning.readyFulfilled).toBe(false);
    expect(result.ready).toBe(true);
  });


  it('fails closed when Factory lineage context disagrees with compiled page provenance',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const result=evaluateStorefrontTemplateGeneratorReadiness({
      blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,
      recipe:LOOT_VAULT_V2_FACTORY_RECIPE,
      package:build.package,
      lineageContext:{
        factoryVersion:build.report.factoryVersion,
        foundation:{
          category:build.report.foundation.category,
          templateKey:build.report.foundation.templateKey,
          templateVersion:build.report.foundation.templateVersion+1,
        },
      },
    });
    expect(result.productionLineage?.valid).toBe(false);
    expect(result.ready).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('PRODUCTION_LINEAGE_FOUNDATION_VERSION_DRIFT');
  });


  it('fails closed when a foreign Playroom package is relabeled as the Loot Vault candidate',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const clone=structuredClone(PLAYROOM_V20_TEMPLATE_PACKAGE);
    clone.manifest={...clone.manifest,templateKey:LOOT_VAULT_V2_FACTORY_RECIPE.templateKey,templateVersion:LOOT_VAULT_V2_FACTORY_RECIPE.templateVersion};
    clone.pages=clone.pages.map(page=>({...page,templateKey:LOOT_VAULT_V2_FACTORY_RECIPE.templateKey,templateVersion:LOOT_VAULT_V2_FACTORY_RECIPE.templateVersion}));
    const result=evaluateStorefrontTemplateGeneratorReadiness({
      blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,
      recipe:LOOT_VAULT_V2_FACTORY_RECIPE,
      package:clone,
      lineageContext:{
        factoryVersion:build.report.factoryVersion,
        foundation:{
          category:build.report.foundation.category,
          templateKey:build.report.foundation.templateKey,
          templateVersion:build.report.foundation.templateVersion,
        },
      },
    });
    expect(result.distinctness.valid).toBe(false);
    expect(result.ready).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('DISTINCTNESS_SIMILARITY_BUDGET_EXCEEDED');
    expect(result.distinctness.comparisons.find(row=>row.reference.templateKey==='gaming.playroom')?.blocked).toBe(true);
  });

  it('keeps undeclared recipes outside generator-ready status instead of inventing metadata',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const result=evaluateStorefrontTemplateGeneratorReadiness({recipe:LOOT_VAULT_V2_FACTORY_RECIPE,package:build.package});
    expect(result).toMatchObject({declared:false,ready:false,blueprintIdentity:null});
    expect(result.issues.map(issue=>issue.code)).toContain('GENERATOR_BLUEPRINT_REQUIRED');
  });
});
