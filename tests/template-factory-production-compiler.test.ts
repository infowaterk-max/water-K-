import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {LOOT_VAULT_V2_GENERATOR_BLUEPRINT} from '@/lib/builder/template-factory/blueprints/loot-vault-v2';
import {
  LOOT_VAULT_V2_FACTORY_MEDIA_MANIFEST,
  LOOT_VAULT_V2_PRODUCTION_COMPILATION,
  LOOT_VAULT_V2_PRODUCTION_INTENT,
  LOOT_VAULT_V2_TEMPLATE_GENOME,
} from '@/lib/builder/template-factory/recipes/loot-vault-v2';
import {compileStorefrontTemplateProductionCandidate} from '@/lib/builder/template-factory/production-compiler';
import {
  STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION,
  hashStorefrontTemplateProductionCompilerCandidate,
  validateStorefrontTemplateProductionCompilerProgram,
} from '@/lib/builder/template-factory/production-compiler-contract';
import {LOOT_VAULT_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/loot-vault/v2';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';
import type {StorefrontTemplateFactoryMediaManifest} from '@/lib/builder/template-factory/scaffold';

const compile=(candidate=LOOT_VAULT_V2_TEMPLATE_PACKAGE,media:StorefrontTemplateFactoryMediaManifest=LOOT_VAULT_V2_FACTORY_MEDIA_MANIFEST)=>
  compileStorefrontTemplateProductionCandidate({
    blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,
    candidate,
    genome:LOOT_VAULT_V2_TEMPLATE_GENOME,
    productionIntent:LOOT_VAULT_V2_PRODUCTION_INTENT,
    media,
    productOwnerReview:{internalVisualReviewPassed:true},
  });

describe('Dynamic Production Compiler Brabus authority',()=>{
  it('reproduces canonical Loot Vault v2 exactly through Page Presets and the existing Factory scaffold',()=>{
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.valid).toBe(true);
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.issues).toEqual([]);
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.program?.contract).toBe(STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION);
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.program?.operations.pagePresets).toHaveLength(14);
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.program?.operations.inheritedPageTypes).toEqual([]);
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.build?.package).toEqual(LOOT_VAULT_V2_TEMPLATE_PACKAGE);
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.build?.report.generatorReadiness.productionCompiler).toMatchObject({
      required:true,
      valid:true,
      issues:[],
    });
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.build?.report.generatorReadiness.productionLineage?.valid).toBe(true);
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.build?.report.generatorReadiness.distinctness.valid).toBe(true);
    expect(LOOT_VAULT_V2_PRODUCTION_COMPILATION.build?.report.provenance.compiler).toEqual({
      contract:STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION,
      hash:LOOT_VAULT_V2_PRODUCTION_COMPILATION.program?.hash,
      candidatePackageHash:LOOT_VAULT_V2_PRODUCTION_COMPILATION.program?.sources.candidatePackageHash,
    });
  });

  it('is deterministic across repeated compilation and canonical candidate hashing',()=>{
    const first=compile();
    const second=compile();
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    expect(first.program?.hash).toBe(second.program?.hash);
    expect(first.program).toEqual(second.program);
    expect(first.build?.package).toEqual(second.build?.package);
    expect(hashStorefrontTemplateProductionCompilerCandidate(first.build!.package))
      .toBe(hashStorefrontTemplateProductionCompilerCandidate(LOOT_VAULT_V2_TEMPLATE_PACKAGE));
    expect(Object.isFrozen(first.program)).toBe(true);
    expect(Object.isFrozen(first.recipe)).toBe(true);
  });

  it('fails closed on a foreign structured candidate before Factory success',()=>{
    const result=compile(PLAYROOM_V20_TEMPLATE_PACKAGE);
    expect(result.valid).toBe(false);
    expect(result.build).toBeNull();
    expect(result.program).toBeNull();
    expect(result.issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'PRODUCTION_COMPILER_CANDIDATE_TEMPLATE_KEY_DRIFT',
      'PRODUCTION_COMPILER_CANDIDATE_TEMPLATE_VERSION_DRIFT',
    ]));
  });

  it('fails closed when the Blueprint-owned Page Preset matrix is incomplete or duplicated',()=>{
    const missing=structuredClone(LOOT_VAULT_V2_TEMPLATE_PACKAGE);
    missing.pages=missing.pages.filter(page=>page.pageType!=='product');
    const missingResult=compile(missing);
    expect(missingResult.valid).toBe(false);
    expect(missingResult.issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'PRODUCTION_COMPILER_CANDIDATE_PAGE_MISSING',
      'PRODUCTION_COMPILER_CANDIDATE_PAGE_CARDINALITY',
    ]));

    const duplicate=structuredClone(LOOT_VAULT_V2_TEMPLATE_PACKAGE);
    duplicate.pages=[...duplicate.pages,structuredClone(duplicate.pages.find(page=>page.pageType==='product')!)];
    const duplicateResult=compile(duplicate);
    expect(duplicateResult.valid).toBe(false);
    expect(duplicateResult.issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'PRODUCTION_COMPILER_CANDIDATE_PAGE_DUPLICATE',
      'PRODUCTION_COMPILER_CANDIDATE_PAGE_CARDINALITY',
    ]));
  });

  it('rejects invalid semantic media input before production materialization',()=>{
    const media=structuredClone(LOOT_VAULT_V2_FACTORY_MEDIA_MANIFEST);
    media.semanticBindings=media.semanticBindings?.filter(row=>row.semanticRole!=='hero-scene');
    const result=compile(LOOT_VAULT_V2_TEMPLATE_PACKAGE,media);
    expect(result.valid).toBe(false);
    expect(result.build).toBeNull();
    expect(result.issues.map(row=>row.code)).toContain('MEDIA_PLANNER_REQUIRED_BINDING_MISSING');
  });

  it('detects forged or stale compiler provenance against the materialized package',()=>{
    const compilation=compile();
    expect(compilation.program).toBeTruthy();
    const tampered=structuredClone(compilation.program!);
    tampered.sources.genomeHash='fnv1a32:00000000';
    const issues=validateStorefrontTemplateProductionCompilerProgram({
      program:tampered,
      expected:{
        category:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.template.category,
        templateKey:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.template.templateKey,
        templateVersion:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.template.templateVersion,
        blueprintContract:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.contract,
        blueprintIdentity:'gaming.loot-vault@2',
        foundation:{
          category:compilation.build!.report.foundation.category,
          templateKey:compilation.build!.report.foundation.templateKey,
          templateVersion:compilation.build!.report.foundation.templateVersion,
        },
        visualAuthorityReferenceKey:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.productionContracts.visualAuthority.referenceKey,
        genomeHash:LOOT_VAULT_V2_TEMPLATE_GENOME.hash,
        constraintPlanHash:compilation.build!.report.generatorReadiness.constraintPlanning.plan!.hash,
        mediaPlanHash:compilation.build!.report.generatorReadiness.mediaPlanning.plan!.hash,
        ownedPageTypes:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.composition.templateOwnedPageTypes,
      },
      package:compilation.build!.package,
    });
    expect(issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'PRODUCTION_COMPILER_HASH_INVALID',
      'PRODUCTION_COMPILER_SOURCE_DRIFT',
    ]));
  });

  it('removes hand-wired materialization from the Loot Vault Factory recipe and keeps compiler pure',()=>{
    const recipe=readFileSync('src/lib/builder/template-factory/recipes/loot-vault-v2.ts','utf8');
    expect(recipe).toContain('compileStorefrontTemplateProductionCandidate');
    expect(recipe).not.toContain('CANONICAL_PAGE_OVERRIDES');
    expect(recipe).not.toContain('getStorefrontGlobalStyleState');
    expect(recipe).not.toContain('pageOverrides:');
    expect(recipe).not.toContain('headerNode:');
    expect(recipe).not.toContain('footerNode:');
    expect(recipe).not.toContain('demoFixtures:');

    const compiler=readFileSync('src/lib/builder/template-factory/production-compiler.ts','utf8');
    expect(compiler).toContain('createStorefrontPresetBundle');
    expect(compiler).toContain('materializeStorefrontPagePreset');
    expect(compiler).toContain('compileStorefrontTemplateFactoryPackage');
    expect(compiler).not.toMatch(/supabase|publishCurrent|saveCurrent|from\(['"](?:products|orders|customers)/);
    expect(compiler).not.toMatch(/dangerouslySetInnerHTML|<script|eval\(/);
  });
});
