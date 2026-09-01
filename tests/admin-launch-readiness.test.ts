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

  it('keeps the Alap dashboard commerce shortcut out of Pro integration operations',()=>{
    const dashboard=read('src/app/admin/page.tsx');
    const commerceCard=dashboard.match(/<Link className="card textLink" href="([^"]+)"><strong>Fizetés és szállítás<\/strong>/);
    expect(commerceCard?.[1]).toBe('/admin/beallitasok/fizetes-szallitas');
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

  it('recognizes platform-level roles as admin access',()=>{
    const guard=read('src/lib/auth/require-admin.ts');
    const platform=read('src/lib/auth/platform-operator.ts');
    expect(guard).toContain("from('platform_operators')");
    expect(guard).toContain("['owner','admin','operator']");
    expect(platform).toContain("export type PlatformRole = 'owner' | 'admin' | 'operator'");
    expect(platform).toContain('requirePlatformOwner');
  });

  it('keeps platform-owner claims private and role-based',()=>{
    const migration=read('supabase/migrations/20260901102358_platform_owner_access.sql');
    expect(migration).toContain('private.platform_owner_claims');
    expect(migration).toContain("check (role in ('owner','admin','operator'))");
    expect(migration).toContain('revoke all on private.platform_owner_claims from public, anon, authenticated');
  });
});
