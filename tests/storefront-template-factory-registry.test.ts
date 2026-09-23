import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_TEMPLATE_FACTORY_DEFINITIONS,
  buildStorefrontFactoryCandidate,
} from '@/lib/builder/storefront-template-factory-registry';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

describe('Template Factory registry',()=>{
  it('turns one registered definition into one complete candidate package',()=>{
    expect(STOREFRONT_TEMPLATE_FACTORY_DEFINITIONS.map(item=>item.templateKey)).toContain('gaming.loot-vault');
    const candidate=buildStorefrontFactoryCandidate('gaming.loot-vault');
    expect(candidate.template.pages).toHaveLength(14);
    expect(candidate.readiness.productOwnerReady).toBe(false);
  });

  it('requires every registered template to declare a reference and explicit media production plan',()=>{
    for(const definition of STOREFRONT_TEMPLATE_FACTORY_DEFINITIONS){
      expect(definition.reference.referenceKey.trim().length).toBeGreaterThan(0);
      expect(definition.reference.mediaRequirements.length).toBeGreaterThan(0);
      expect(definition.reference.minimumRepresentativeMedia).toBeGreaterThan(0);
    }
  });

  it('fails closed instead of fabricating an unregistered template',()=>{
    expect(()=>buildStorefrontFactoryCandidate('unknown.template')).toThrow('TEMPLATE_FACTORY_DEFINITION_MISSING:unknown.template');
  });
  it('keeps non-ready candidates out of the normal template-library live preview surface',()=>{
    const model=readFileSync(resolve(process.cwd(),'src/lib/builder/storefront-template-library.ts'),'utf8');
    const ui=readFileSync(resolve(process.cwd(),'src/components/admin/storefront-template-library.tsx'),'utf8');
    expect(model).toContain('productOwnerPreviewReady');
    expect(ui).toContain('Vizuális előnézet készül');
    expect(ui).toContain('template.productOwnerPreviewReady');
  });
});
