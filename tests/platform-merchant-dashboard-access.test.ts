import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('platform operator merchant dashboard access',()=>{
  it('keeps zero-tenant platform operators on the platform center but allows a selected webshop dashboard',()=>{
    const page=read('src/app/admin/page.tsx');
    expect(page).toContain("if (platformRole && !instance) redirect('/admin/platform')");
    expect(page).not.toContain("if (platformRole) redirect('/admin/platform')");
  });

  it('keeps the merchant overview entry available when a webshop context exists',()=>{
    const layout=read('src/app/admin/layout.tsx');
    const ia=read('src/lib/navigation/admin-ia.ts');
    expect(ia).toContain("href:'/admin',label:'Áttekintés'");
    expect(ia).toContain("permission:'store.read',reportFamily:'overview'");
    expect(layout).toContain('const sections=isPlatform&&!instance?[]:resolveMerchantNavigation(effectivePlan,can)');
  });
});
