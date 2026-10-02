import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_TEMPLATE_PRODUCTION_LINEAGE_VERSION,
  createStorefrontTemplateProductionLineage,
  fingerprintStorefrontTemplatePackage,
  validateStorefrontTemplateProductionLineage,
  type StorefrontTemplateProductionLineageInput,
} from '@/lib/builder/template-factory/production-lineage';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

function fixture():{
  build:ReturnType<typeof buildRegisteredStorefrontTemplateFactoryCandidate>;
  input:StorefrontTemplateProductionLineageInput;
}{
  const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
  const readiness=build.report.generatorReadiness;
  const input:StorefrontTemplateProductionLineageInput={
    factoryVersion:build.report.factoryVersion,
    foundation:{
      category:build.report.foundation.category,
      templateKey:build.report.foundation.templateKey,
      templateVersion:build.report.foundation.templateVersion,
    },
    recipe:{
      category:LOOT_VAULT_V2_FACTORY_RECIPE.category,
      templateKey:LOOT_VAULT_V2_FACTORY_RECIPE.templateKey,
      templateVersion:LOOT_VAULT_V2_FACTORY_RECIPE.templateVersion,
      reference:{key:LOOT_VAULT_V2_FACTORY_RECIPE.reference.key},
      genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome,
      productionIntent:LOOT_VAULT_V2_FACTORY_RECIPE.productionIntent,
    },
    visualAuthority:readiness.productionContracts.visualAuthority,
    constraintPlan:readiness.constraintPlanning.plan,
    mediaPlan:readiness.mediaPlanning.plan,
    package:build.package,
  };
  return{build,input};
}

describe('Deterministic Template Production Lineage Brabus authority',()=>{
  it('binds the complete proven production chain to the compiled package fingerprint without mutating pages',()=>{
    const{build,input}=fixture();
    const result=createStorefrontTemplateProductionLineage(input);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.lineage).not.toBeNull();
    expect(Object.isFrozen(result.lineage)).toBe(true);
    expect(result.lineage?.contract).toBe(STOREFRONT_TEMPLATE_PRODUCTION_LINEAGE_VERSION);
    expect(result.lineage?.sources.constraintPlan.hash).toBe(build.report.generatorReadiness.constraintPlanning.plan?.hash);
    expect(result.lineage?.sources.mediaPlan.hash).toBe(build.report.generatorReadiness.mediaPlanning.plan?.hash);
    expect(result.lineage?.sources.genome.hash).toBe(LOOT_VAULT_V2_FACTORY_RECIPE.genome?.hash);
    expect(result.lineage?.output.packageFingerprint).toBe(fingerprintStorefrontTemplatePackage(build.package));
    expect(build.report.provenance.lineage?.hash).toBe(result.lineage?.hash);

    const pages=JSON.stringify(build.package.pages);
    expect(pages).not.toContain(STOREFRONT_TEMPLATE_PRODUCTION_LINEAGE_VERSION);
    expect(pages).not.toContain(result.lineage?.hash??'missing-lineage-hash');
    expect(JSON.stringify(result.lineage)).not.toContain('/storefront-demo/');
  });

  it('fingerprints semantic package content independently from object key insertion order',()=>{
    const{build}=fixture();
    const clone=structuredClone(build.package);
    const reordered={
      demoFixtures:clone.demoFixtures,
      pages:clone.pages,
      manifest:clone.manifest,
    } as StorefrontInstallableTemplatePackage;
    expect(fingerprintStorefrontTemplatePackage(reordered)).toBe(fingerprintStorefrontTemplatePackage(build.package));
  });

  it('detects compiled output mutation even when every upstream source remains unchanged',()=>{
    const{input}=fixture();
    const created=createStorefrontTemplateProductionLineage(input);
    expect(created.valid).toBe(true);
    const pkg=structuredClone(input.package);
    pkg.pages[0]!.pageKey=`${pkg.pages[0]!.pageKey}-tampered`;
    const validation=validateStorefrontTemplateProductionLineage({...input,package:pkg,lineage:created.lineage});
    expect(validation.valid).toBe(false);
    expect(validation.issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'PRODUCTION_LINEAGE_PACKAGE_FINGERPRINT_MISMATCH',
      'PRODUCTION_LINEAGE_HASH_MISMATCH',
      'PRODUCTION_LINEAGE_CONTENT_DRIFT',
    ]));
  });

  it('rejects a Media Plan spliced from a foreign Constraint Plan chain',()=>{
    const{input}=fixture();
    const mediaPlan=structuredClone(input.mediaPlan!);
    mediaPlan.sources.constraintPlanHash='fnv1a32:deadbeef';
    const result=createStorefrontTemplateProductionLineage({...input,mediaPlan});
    expect(result.valid).toBe(false);
    expect(result.issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'PRODUCTION_LINEAGE_MEDIA_HASH_INVALID',
      'PRODUCTION_LINEAGE_MEDIA_CONSTRAINT_HASH_DRIFT',
    ]));
  });

  it('rejects Genome hash drift against both canonical Genome content and Constraint Plan binding',()=>{
    const{input}=fixture();
    const genome=structuredClone(input.recipe.genome!);
    genome.hash='fnv1a32:deadbeef';
    const result=createStorefrontTemplateProductionLineage({
      ...input,
      recipe:{...input.recipe,genome},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'PRODUCTION_LINEAGE_TEMPLATE_GENOME_HASH_MISMATCH',
      'PRODUCTION_LINEAGE_GENOME_HASH_DRIFT',
    ]));
  });

  it('rejects Visual Authority and Product Owner intent source drift',()=>{
    const{input}=fixture();
    const foreignVisual=createStorefrontTemplateProductionLineage({
      ...input,
      visualAuthority:{...input.visualAuthority!,referenceKey:'gaming.foreign.visual-authority'},
    });
    expect(foreignVisual.valid).toBe(false);
    expect(foreignVisual.issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'PRODUCTION_LINEAGE_VISUAL_AUTHORITY_RECIPE_DRIFT',
      'PRODUCTION_LINEAGE_VISUAL_AUTHORITY_CONSTRAINT_DRIFT',
    ]));

    const foreignIntent=createStorefrontTemplateProductionLineage({
      ...input,
      recipe:{
        ...input.recipe,
        productionIntent:{...input.recipe.productionIntent!,intentVersion:99},
      },
    });
    expect(foreignIntent.valid).toBe(false);
    expect(foreignIntent.issues.map(row=>row.code)).toContain('PRODUCTION_LINEAGE_PO_INTENT_DRIFT');
  });

  it('rejects package identity drift and missing upstream plans instead of synthesizing placeholder lineage',()=>{
    const{input}=fixture();
    const pkg=structuredClone(input.package);
    pkg.manifest.templateVersion=999;
    const identity=createStorefrontTemplateProductionLineage({...input,package:pkg});
    expect(identity.valid).toBe(false);
    expect(identity.issues.map(row=>row.code)).toContain('PRODUCTION_LINEAGE_PACKAGE_IDENTITY_DRIFT');

    const missingConstraint=createStorefrontTemplateProductionLineage({...input,constraintPlan:null});
    expect(missingConstraint.valid).toBe(false);
    expect(missingConstraint.lineage).toBeNull();
    expect(missingConstraint.issues.map(row=>row.code)).toContain('PRODUCTION_LINEAGE_CONSTRAINT_PLAN_REQUIRED');

    const missingMedia=createStorefrontTemplateProductionLineage({...input,mediaPlan:null});
    expect(missingMedia.valid).toBe(false);
    expect(missingMedia.lineage).toBeNull();
    expect(missingMedia.issues.map(row=>row.code)).toContain('PRODUCTION_LINEAGE_MEDIA_PLAN_REQUIRED');
  });

  it('rejects tampered lineage hashes and concrete media paths inside lineage evidence',()=>{
    const{input}=fixture();
    const created=createStorefrontTemplateProductionLineage(input);
    const tampered=structuredClone(created.lineage!);
    tampered.hash='fnv1a32:00000000';
    const hashResult=validateStorefrontTemplateProductionLineage({...input,lineage:tampered});
    expect(hashResult.valid).toBe(false);
    expect(hashResult.issues.map(row=>row.code)).toEqual(expect.arrayContaining([
      'PRODUCTION_LINEAGE_HASH_MISMATCH',
      'PRODUCTION_LINEAGE_CONTENT_DRIFT',
    ]));

    const polluted=structuredClone(created.lineage!) as typeof created.lineage&{debugMedia?:string};
    polluted!.debugMedia='/storefront-demo/foreign/hero.webp';
    const pollutedResult=validateStorefrontTemplateProductionLineage({...input,lineage:polluted!});
    expect(pollutedResult.valid).toBe(false);
    expect(pollutedResult.issues.map(row=>row.code)).toContain('PRODUCTION_LINEAGE_CONCRETE_MEDIA_SOURCE_FORBIDDEN');
  });
});
