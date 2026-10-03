import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {
  getStorefrontTemplatePackage,
  STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,
} from '@/lib/builder/storefront-template-catalog';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Beauty Lab retirement boundary',()=>{
  it('does not expose the retired Beauty Lab implementation through active catalog authority',()=>{
    expect(getStorefrontTemplatePackage('beauty.beauty-lab')).toBeUndefined();
    expect(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.some(template=>template.manifest.templateKey==='beauty.beauty-lab')).toBe(false);
  });

  it('keeps legacy Beauty Lab implementation only as inert source history until reference-image migration',()=>{
    expect(fs.existsSync(path.join(process.cwd(),'src/lib/builder/templates/beauty-lab-canonical-v2.ts'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(),'src/lib/builder/templates/beauty-lab-reference-v28.ts'))).toBe(true);
    const catalog=read('src/lib/builder/storefront-template-catalog.ts');
    expect(catalog).not.toContain("from '@/lib/builder/templates/beauty-lab-canonical-v2'");
    expect(catalog).not.toContain('BEAUTY_LAB_CANONICAL_TEMPLATE_PACKAGE');
  });

  it('does not make generic Builder upgrade UX evidence imply Beauty Lab activation',()=>{
    const library=read('src/components/admin/storefront-template-library.tsx');
    expect(library).toContain('Sablon frissítése');
    expect(library).toContain('A publikált storefront érintetlen marad');
    expect(getStorefrontTemplatePackage('beauty.beauty-lab',2)).toBeUndefined();
  });
});
