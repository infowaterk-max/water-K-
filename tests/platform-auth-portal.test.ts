import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Shoperation platform auth portal',()=>{
  it('keeps platform auth separate from shopper registration',()=>{
    const page=read('src/app/platform/page.tsx');
    const form=read('src/components/auth/platform-auth-form.tsx');
    expect(page).toContain('Rendszerszintű belépés');
    expect(form).toContain('Első aktiválás');
    expect(form).not.toContain('Lakossági vásárló');
    expect(form).not.toContain('Viszonteladói partner');
  });

  it('checks the server-side owner claim before signup',()=>{
    const form=read('src/components/auth/platform-auth-form.tsx');
    const route=read('src/app/api/platform/activation/route.ts');
    const migration=read('supabase/migrations/20260901125500_platform_owner_activation_gate.sql');
    expect(form).toContain("fetch('/api/platform/activation'");
    expect(route).toContain("rpc('platform_owner_claim_available'");
    expect(migration).toContain('private.platform_owner_claims');
    expect(migration).toContain('grant execute on function public.platform_owner_claim_available(text) to service_role');
  });

  it('keeps the platform portal out of search indexing',()=>{
    const page=read('src/app/platform/page.tsx');
    expect(page).toContain('robots:{index:false,follow:false}');
  });
});
