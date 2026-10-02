import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_TEMPLATE_TYPE_DEFINITIONS,
  STOREFRONT_TEMPLATE_TYPE_IDS,
  getStorefrontTemplateTypeDefinition,
  validateStorefrontTemplateTypeCompatibility,
  validateStorefrontTemplateTypeSystemCatalog,
  type StorefrontTemplateTypeDefinition,
} from '@/lib/builder/template-factory/template-type-system';
import {SHARED_STOREFRONT_ENGINE_IDS,type StorefrontEngineId} from '@/lib/builder/template-factory/engine-functional-proof-registry';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';

describe('Template Type System Brabus authority',()=>{
  it('defines exactly one complete canonical semantic profile for every supported template type',()=>{
    const result=validateStorefrontTemplateTypeSystemCatalog();
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(STOREFRONT_TEMPLATE_TYPE_DEFINITIONS.map(item=>item.typeId)).toEqual(STOREFRONT_TEMPLATE_TYPE_IDS);
    expect(STOREFRONT_TEMPLATE_TYPE_DEFINITIONS).toHaveLength(8);
    for(const definition of STOREFRONT_TEMPLATE_TYPE_DEFINITIONS){
      expect(Object.isFrozen(definition)).toBe(true);
      expect(definition.layout.archetypes.length).toBeGreaterThan(0);
      expect(definition.navigation.requiredCapabilities.length).toBeGreaterThan(0);
      expect(definition.interaction.patterns.length).toBeGreaterThan(0);
      expect(definition.content.hierarchy.length).toBeGreaterThan(0);
      expect(definition.commerce.requirements.length).toBeGreaterThan(0);
      expect(definition.media.roles.length).toBeGreaterThan(0);
      expect(definition.componentGrammar.families.length).toBeGreaterThan(0);
      expect(definition.engineExpectations.required.length).toBeGreaterThan(0);
      expect(definition.engineExpectations.priority.length).toBeGreaterThan(0);
    }
  });

  it('references only canonical shared engine identities',()=>{
    const allowed=new Set<string>(SHARED_STOREFRONT_ENGINE_IDS);
    for(const definition of STOREFRONT_TEMPLATE_TYPE_DEFINITIONS){
      for(const engineId of [...definition.engineExpectations.required,...definition.engineExpectations.priority]){
        expect(allowed.has(engineId)).toBe(true);
      }
    }
  });

  it('selects types exactly and never aliases an unknown category into a generic pass',()=>{
    expect(getStorefrontTemplateTypeDefinition('gaming')?.typeId).toBe('gaming');
    expect(getStorefrontTemplateTypeDefinition('Gaming')).toBeNull();
    expect(getStorefrontTemplateTypeDefinition('automotive')).toBeNull();
    const result=validateStorefrontTemplateTypeCompatibility({category:'automotive',genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome});
    expect(result.valid).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('TEMPLATE_TYPE_UNSUPPORTED');
  });

  it('proves Loot Vault Genome compatibility through composition, media and component overlap',()=>{
    const result=validateStorefrontTemplateTypeCompatibility({category:'gaming',genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome});
    expect(result.valid).toBe(true);
    expect(result.definition?.typeId).toBe('gaming');
    expect(result.overlaps.archetypes.length).toBeGreaterThan(0);
    expect(result.overlaps.mediaRoles.length).toBeGreaterThan(0);
    expect(result.overlaps.componentFamilies.length).toBeGreaterThan(0);
  });

  it('fails closed when Genome identity selects a different reusable type',()=>{
    const genome=structuredClone(LOOT_VAULT_V2_FACTORY_RECIPE.genome!);
    genome.identity.category='fashion';
    const result=validateStorefrontTemplateTypeCompatibility({category:'gaming',genome});
    expect(result.valid).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('TEMPLATE_TYPE_GENOME_CATEGORY_DRIFT');
  });

  it('rejects category-only compatibility when semantic overlap is absent',()=>{
    const genome=structuredClone(LOOT_VAULT_V2_FACTORY_RECIPE.genome!);
    genome.dimensions.composition.archetypes=['alien-layout'];
    genome.dimensions.image.roles=['alien-media'];
    genome.dimensions.componentGrammar.preferred=['alien.component'];
    const result=validateStorefrontTemplateTypeCompatibility({category:'gaming',genome});
    expect(result.valid).toBe(false);
    expect(result.issues.map(item=>item.code)).toEqual(expect.arrayContaining([
      'TEMPLATE_TYPE_ARCHETYPE_INCOMPATIBLE',
      'TEMPLATE_TYPE_MEDIA_ROLE_INCOMPATIBLE',
      'TEMPLATE_TYPE_COMPONENT_GRAMMAR_INCOMPATIBLE',
    ]));
  });

  it('rejects duplicate type identities and invalid engine expectations in adversarial catalogs',()=>{
    const duplicate=[
      STOREFRONT_TEMPLATE_TYPE_DEFINITIONS[0]!,
      STOREFRONT_TEMPLATE_TYPE_DEFINITIONS[0]!,
      ...STOREFRONT_TEMPLATE_TYPE_DEFINITIONS.slice(1),
    ];
    expect(validateStorefrontTemplateTypeSystemCatalog(duplicate).issues.map(item=>item.code)).toContain('TEMPLATE_TYPE_ID_DUPLICATE');

    const invalid=structuredClone(STOREFRONT_TEMPLATE_TYPE_DEFINITIONS) as StorefrontTemplateTypeDefinition[];
    invalid[0]!.engineExpectations={
      ...invalid[0]!.engineExpectations,
      priority:['E99' as unknown as StorefrontEngineId],
    };
    const result=validateStorefrontTemplateTypeSystemCatalog(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('TEMPLATE_TYPE_ENGINE_UNKNOWN');
  });
});
