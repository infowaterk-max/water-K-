import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_TEMPLATE_FACTORY_DEFINITIONS,
  buildStorefrontFactoryCandidate,
} from '@/lib/builder/storefront-template-factory-registry';

describe('Template Factory registry',()=>{
  it('turns one registered definition into one complete candidate package',()=>{
    expect(STOREFRONT_TEMPLATE_FACTORY_DEFINITIONS.map(item=>item.templateKey)).toContain('gaming.loot-vault');
    const candidate=buildStorefrontFactoryCandidate('gaming.loot-vault');
    expect(candidate.template.pages).toHaveLength(14);
    expect(candidate.readiness.productOwnerReady).toBe(false);
  });

  it('fails closed instead of fabricating an unregistered template',()=>{
    expect(()=>buildStorefrontFactoryCandidate('unknown.template')).toThrow('TEMPLATE_FACTORY_DEFINITION_MISSING:unknown.template');
  });
});
