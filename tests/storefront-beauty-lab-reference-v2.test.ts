import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Beauty Lab retired reference source history',()=>{
  it('retains historical source for later PO-approved visual-reference extraction without runtime authority',()=>{
    const source=read('src/lib/builder/templates/beauty-lab-reference-v2.ts');
    expect(source).toContain('BEAUTY_LAB_REFERENCE_V2_VERSION');
    expect(getStorefrontTemplatePackage('beauty.beauty-lab')).toBeUndefined();
  });

  it('keeps active preview authority free from Beauty Lab registration',()=>{
    const preview=read('src/lib/builder/storefront-template-preview-demo.ts');
    const catalog=read('src/lib/builder/storefront-template-catalog.ts');
    expect(preview).not.toContain('BEAUTY_LAB');
    expect(preview).not.toContain('beauty.beauty-lab');
    expect(catalog).not.toContain('beauty.beauty-lab');
  });

  it('does not promote historical visual implementation details into current acceptance authority',()=>{
    expect(fs.existsSync(path.join(process.cwd(),'src/lib/builder/templates/beauty-lab-reference-v2.ts'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(),'src/lib/builder/templates/beauty-lab-reference-v28.ts'))).toBe(true);
    expect(getStorefrontTemplatePackage('beauty.beauty-lab',2)).toBeUndefined();
  });
});
