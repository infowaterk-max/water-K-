import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_TEMPLATE_PRODUCT_OWNER_INTENT_VERSION,
  planStorefrontTemplateConstraints,
  type StorefrontTemplateProductOwnerIntent,
} from '@/lib/builder/template-factory/constraint-planner';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';
import {LOOT_VAULT_V2_GENERATOR_BLUEPRINT} from '@/lib/builder/template-factory/blueprints/loot-vault-v2';

const visualAuthority=LOOT_VAULT_V2_GENERATOR_BLUEPRINT.productionContracts.visualAuthority;
const baseIntent=():StorefrontTemplateProductOwnerIntent=>structuredClone(LOOT_VAULT_V2_FACTORY_RECIPE.productionIntent!);

const plan=(intent:StorefrontTemplateProductOwnerIntent=baseIntent())=>planStorefrontTemplateConstraints({
  category:LOOT_VAULT_V2_FACTORY_RECIPE.category,
  templateKey:LOOT_VAULT_V2_FACTORY_RECIPE.templateKey,
  templateVersion:LOOT_VAULT_V2_FACTORY_RECIPE.templateVersion,
  visualAuthority,
  genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome,
  intent,
});

describe('Template Constraint Planner Brabus authority',()=>{
  it('compiles accepted authorities and bounded PO intent into one immutable semantic plan',()=>{
    const result=plan();
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.plan).not.toBeNull();
    expect(result.plan?.sources.visualAuthority.referenceKey).toBe(visualAuthority.referenceKey);
    expect(result.plan?.sources.genome.hash).toBe(LOOT_VAULT_V2_FACTORY_RECIPE.genome?.hash);
    expect(result.plan?.sources.templateType.typeId).toBe('gaming');
    expect(result.plan?.sources.productOwnerIntent.intentId).toBe('gaming.loot-vault.v2.production-intent');
    expect(result.plan?.constraints.composition.requiredArchetypes).toEqual(['cinematic-hero','collector-grid']);
    expect(result.plan?.constraints.media.requiredSemanticRoles).toEqual(['hero-scene','collector-product']);
    expect(result.plan?.constraints.componentGrammar.preferredFamilies).toEqual([
      'story.hero','commerce.product-grid','commerce.key-specs',
    ]);
    expect(result.plan?.constraints.composition.density).toBe('balanced');
    expect(result.plan?.hash).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.plan?.constraints)).toBe(true);
    expect(Object.isFrozen(result.plan?.constraints.media.requiredSemanticRoles)).toBe(true);
  });

  it('normalizes set-like Product Owner selections so equivalent intent ordering has identical lineage hash',()=>{
    const left=baseIntent();
    const right=baseIntent();
    left.requiredArchetypes=['collector-grid','cinematic-hero','collector-grid'];
    left.requiredMediaRoles=['collector-product','hero-scene','hero-scene'];
    left.preferredComponentFamilies=['commerce.key-specs','story.hero','commerce.product-grid','story.hero'];
    left.prioritizedEngines=['E10','E6','E7','E6'];

    right.requiredArchetypes=['cinematic-hero','collector-grid'];
    right.requiredMediaRoles=['hero-scene','collector-product'];
    right.preferredComponentFamilies=['story.hero','commerce.product-grid','commerce.key-specs'];
    right.prioritizedEngines=['E6','E7','E10'];

    const a=plan(left),b=plan(right);
    expect(a.valid).toBe(true);
    expect(b.valid).toBe(true);
    expect(a.plan?.hash).toBe(b.plan?.hash);
    expect(a.plan).toEqual(b.plan);
  });

  it('fails closed when Product Owner intent is missing',()=>{
    const result=planStorefrontTemplateConstraints({
      category:LOOT_VAULT_V2_FACTORY_RECIPE.category,
      templateKey:LOOT_VAULT_V2_FACTORY_RECIPE.templateKey,
      templateVersion:LOOT_VAULT_V2_FACTORY_RECIPE.templateVersion,
      visualAuthority,
      genome:LOOT_VAULT_V2_FACTORY_RECIPE.genome,
      intent:undefined,
    });
    expect(result.valid).toBe(false);
    expect(result.plan).toBeNull();
    expect(result.issues.map(item=>item.code)).toContain('CONSTRAINT_PLANNER_INTENT_REQUIRED');
  });

  it('fails closed when intent references a different accepted Visual Authority',()=>{
    const intent=baseIntent();
    intent.visualAuthorityReferenceKey='gaming.foreign.visual-authority';
    const result=plan(intent);
    expect(result.valid).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('CONSTRAINT_PLANNER_VISUAL_AUTHORITY_DRIFT');
  });

  it('rejects PO attempts to expand archetype, media, component or engine authority',()=>{
    const intent=baseIntent();
    intent.requiredArchetypes=['generic-dashboard'];
    intent.requiredMediaRoles=['copied-template-hero'];
    intent.preferredComponentFamilies=['legacy.freeform-widget'];
    intent.prioritizedEngines=['E11'];
    const result=plan(intent);
    expect(result.valid).toBe(false);
    expect(result.plan).toBeNull();
    expect(result.issues.map(item=>item.code)).toEqual(expect.arrayContaining([
      'CONSTRAINT_PLANNER_ARCHETYPE_OUT_OF_BOUNDS',
      'CONSTRAINT_PLANNER_MEDIA_ROLE_OUT_OF_BOUNDS',
      'CONSTRAINT_PLANNER_COMPONENT_FAMILY_OUT_OF_BOUNDS',
      'CONSTRAINT_PLANNER_ENGINE_OUT_OF_BOUNDS',
    ]));
  });

  it('keeps the plan semantic: no concrete media source, Page Schema tree or arbitrary source-code instruction enters output',()=>{
    const result=plan();
    expect(result.valid).toBe(true);
    const serialized=JSON.stringify(result.plan);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/\/storefront\//);
    expect(serialized).not.toMatch(/\.(?:png|jpe?g|webp|svg|gif|avif)(?:\"|\?)/i);
    expect(serialized).not.toContain('"sections"');
    expect(serialized).not.toContain('"componentKey"');
    expect(serialized).not.toContain('"src"');
    expect(serialized).not.toContain('"referenceSrc"');
  });

  it('requires stable intent identity and exact contract semantics',()=>{
    const intent=baseIntent();
    intent.contract='broken' as typeof STOREFRONT_TEMPLATE_PRODUCT_OWNER_INTENT_VERSION;
    intent.intentId='';
    intent.intentVersion=0;
    intent.note='';
    const result=plan(intent);
    expect(result.valid).toBe(false);
    expect(result.issues.map(item=>item.code)).toEqual(expect.arrayContaining([
      'CONSTRAINT_PLANNER_INTENT_CONTRACT_INVALID',
      'CONSTRAINT_PLANNER_INTENT_ID_REQUIRED',
      'CONSTRAINT_PLANNER_INTENT_VERSION_INVALID',
      'CONSTRAINT_PLANNER_INTENT_NOTE_REQUIRED',
    ]));
  });
});
