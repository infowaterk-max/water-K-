import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Shoperation admin launch readiness',()=>{
  it('keeps the launch center visible in merchant navigation',()=>{
    const layout=read('src/app/admin/layout.tsx');
    expect(layout).toContain("href:'/admin/indulas'");
    expect(layout).toContain("label:'Indítási központ'");
  });

  it('uses standard Alap commerce settings for payment and shipping setup',()=>{
    const page=read('src/app/admin/indulas/page.tsx');
    expect(page).toContain("href:'/admin/beallitasok/fizetes-szallitas'");
    expect(page).not.toContain("href:'/admin/integraciok'");
  });

  it('degrades safely while a fresh database is not fully bootstrapped',()=>{
    const page=read('src/app/admin/indulas/page.tsx');
    expect(page).toContain('safeProducts');
    expect(page).toContain('safeCommerce');
    expect(page).toContain('Promise.all');
  });

  it('keeps mobile admin navigation accessible',()=>{
    const css=read('src/app/admin/admin-shell.css');
    expect(css).toMatch(/@media\(max-width:850px\)[\s\S]*\.adminSide\{display:block/);
    expect(css).not.toMatch(/@media\(max-width:850px\)[\s\S]*\.adminSide\{display:none/);
  });
});
