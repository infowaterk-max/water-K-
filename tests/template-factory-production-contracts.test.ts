import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import {
  evaluateStorefrontTemplateFileOwnershipChanges,
  evaluateStorefrontTemplateProductionContracts,
} from '@/lib/builder/template-factory/production-contracts';
import {LOOT_VAULT_V2_GENERATOR_BLUEPRINT} from '@/lib/builder/template-factory/blueprints/loot-vault-v2';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';

describe('Template production contracts v0.1',()=>{
  it('binds the accepted Loot Vault visual reference without changing the rendered package authority',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.report.productionContracts).toMatchObject({declared:true,ready:true,issues:[]});
    expect(build.report.productionContracts.visualAuthority).toEqual({
      contract:'shoporation.template-visual-authority.v0.1',
      referenceKey:LOOT_VAULT_V2_FACTORY_RECIPE.reference.key,
      state:'accepted-reference',
      requiredPageTypes:LOOT_VAULT_V2_FACTORY_RECIPE.reference.requiredPageTypes,
      designChangePolicy:'product-owner-reapproval-required',
    });
    expect(build.report.generatorReadiness.ready).toBe(true);
  });

  it('derives deterministic component usage from the compiled canonical 14-page package',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const usage=build.report.productionContracts.componentUsage;
    expect(usage.pageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect(usage.uniqueComponentCount).toBeGreaterThan(0);
    expect(usage.totalNodeCount).toBeGreaterThan(usage.uniqueComponentCount);
    const header=usage.entries.find(entry=>entry.componentKey==='system.commerce-header');
    expect(header?.pageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect(header?.nodeCount).toBe(STOREFRONT_PAGE_TYPES.length);
  });

  it('classifies template-owned files, shared authority extensions and foreign template edits separately',()=>{
    const contract=LOOT_VAULT_V2_GENERATOR_BLUEPRINT.productionContracts.fileOwnership;
    const owned=evaluateStorefrontTemplateFileOwnershipChanges({
      contract,
      changedFiles:[
        'src/lib/builder/templates/gaming/loot-vault/v2/canonical-package.json',
        'public/storefront-demo/loot-vault-v2/hero-cinematic.webp',
      ],
    });
    expect(owned).toMatchObject({ready:true,reviewRequired:false,issues:[]});
    expect(owned.classifications.every(item=>item.ownership==='template-owned')).toBe(true);

    const shared=evaluateStorefrontTemplateFileOwnershipChanges({
      contract,
      changedFiles:['src/components/builder/storefront-commerce.tsx'],
    });
    expect(shared.ready).toBe(true);
    expect(shared.reviewRequired).toBe(true);
    expect(shared.issues.map(item=>item.code)).toContain('TEMPLATE_SHARED_AUTHORITY_CHANGE_REVIEW_REQUIRED');

    const foreign=evaluateStorefrontTemplateFileOwnershipChanges({
      contract,
      changedFiles:['src/lib/builder/template-factory/recipes/playroom-v20.ts'],
    });
    expect(foreign.ready).toBe(false);
    expect(foreign.issues.map(item=>item.code)).toContain('TEMPLATE_FILE_OUTSIDE_OWNERSHIP_CONTRACT');
  });

  it('fails closed if the Factory reference drifts away from the accepted visual authority',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const result=evaluateStorefrontTemplateProductionContracts({
      declaration:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.productionContracts,
      recipe:{
        ...LOOT_VAULT_V2_FACTORY_RECIPE,
        reference:{...LOOT_VAULT_V2_FACTORY_RECIPE.reference,key:'gaming.loot-vault.unapproved-drift'},
      },
      package:build.package,
    });
    expect(result.ready).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('TEMPLATE_VISUAL_AUTHORITY_REFERENCE_DRIFT');
  });
});
