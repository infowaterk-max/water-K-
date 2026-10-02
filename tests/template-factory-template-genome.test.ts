import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_TEMPLATE_GENOME_DIMENSIONS,
  defineStorefrontTemplateGenome,
  hashStorefrontTemplateGenome,
  validateStorefrontTemplateGenome,
  type StorefrontTemplateGenomeInput,
} from '@/lib/builder/template-factory/template-genome';
import {LOOT_VAULT_V2_TEMPLATE_GENOME} from '@/lib/builder/template-factory/recipes/loot-vault-v2';

const inputFromGenome=():StorefrontTemplateGenomeInput=>{
  const clone=structuredClone(LOOT_VAULT_V2_TEMPLATE_GENOME);
  const {hash:_hash,...input}=clone;
  return input;
};

describe('Template Genome Brabus authority',()=>{
  it('defines a deeply frozen versioned Genome with every required Brabus dimension',()=>{
    const genome=LOOT_VAULT_V2_TEMPLATE_GENOME;
    expect(genome.contract).toBe('shoporation.template-genome.v1');
    expect(genome.hash).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
    expect(Object.keys(genome.dimensions).sort()).toEqual([...STOREFRONT_TEMPLATE_GENOME_DIMENSIONS].sort());
    expect(Object.isFrozen(genome)).toBe(true);
    expect(Object.isFrozen(genome.dimensions)).toBe(true);
    expect(Object.isFrozen(genome.dimensions.composition.archetypes)).toBe(true);
    expect(validateStorefrontTemplateGenome(genome).valid).toBe(true);
  });

  it('uses canonical key ordering so semantically identical token maps hash identically',()=>{
    const left=inputFromGenome();
    const right=inputFromGenome();
    left.dimensions.color.tokens={background:'#0D0E0F',surface:'#17191A',text:'#F3EBDD',accent:'#A57A45',secondary:'#53695D'};
    right.dimensions.color.tokens={secondary:'#53695D',accent:'#A57A45',text:'#F3EBDD',surface:'#17191A',background:'#0D0E0F'};
    expect(hashStorefrontTemplateGenome(left)).toBe(hashStorefrontTemplateGenome(right));
  });

  it('fails closed when semantic content changes without a matching immutable hash',()=>{
    const drift=structuredClone(LOOT_VAULT_V2_TEMPLATE_GENOME);
    drift.dimensions.spacing.rhythm='silent-mutated-rhythm';
    const result=validateStorefrontTemplateGenome(drift);
    expect(result.valid).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('TEMPLATE_GENOME_HASH_MISMATCH');
  });

  it('rejects concrete media paths from Genome media language',()=>{
    const input=inputFromGenome();
    input.dimensions.image.roles=['hero-scene','/storefront-demo/copied-hero.webp'];
    expect(()=>defineStorefrontTemplateGenome(input)).toThrow(/TEMPLATE_GENOME_CONCRETE_MEDIA_FORBIDDEN/);
  });

  it('fails closed on Factory identity drift',()=>{
    const result=validateStorefrontTemplateGenome(LOOT_VAULT_V2_TEMPLATE_GENOME,{
      category:'gaming',
      templateKey:'gaming.other-template',
      displayName:'Loot Vault',
      templateVersion:2,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('TEMPLATE_GENOME_TEMPLATE_KEY_DRIFT');
  });

  it('requires controlled evolution to name its immutable parent',()=>{
    const input=inputFromGenome();
    input.identity.genomeVersion=2;
    input.lineage={parentHash:null,evolution:'compatible-evolution',note:'test evolution'};
    expect(()=>defineStorefrontTemplateGenome(input)).toThrow(/TEMPLATE_GENOME_EVOLUTION_PARENT_REQUIRED/);
  });
});
