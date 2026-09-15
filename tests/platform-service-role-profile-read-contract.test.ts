import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('platform service-role read contracts',()=>{
  it('keeps the profile forward migration explicit',()=>{
    const migration=read('supabase/migrations/20260914190000_profiles_service_role_read_contract.sql');
    expect(migration).toContain('grant select on table public.profiles to service_role');
  });

  it('keeps profile Fresh Install parity explicit',()=>{
    const baseline=read('supabase/customer-baseline/migrations/0031_profiles_service_role_read_contract.sql');
    expect(baseline).toContain('grant select on table public.profiles to service_role');
  });

  it('keeps the authoritative role-binding forward migration explicit',()=>{
    const migration=read('supabase/migrations/20260915012500_role_bindings_service_role_read_contract.sql');
    expect(migration).toContain('grant select on table public.role_bindings to service_role');
  });

  it('keeps role-binding Fresh Install parity explicit',()=>{
    const baseline=read('supabase/customer-baseline/migrations/0032_role_bindings_service_role_read_contract.sql');
    expect(baseline).toContain('grant select on table public.role_bindings to service_role');
  });

  it('protects both server-side read consumers',()=>{
    const page=read('src/app/admin/platform/webaruhazak/page.tsx');
    const resolver=read('src/lib/instances/access.ts');
    expect(page).toContain("a.from('profiles').select('id,email,full_name,company_name')");
    expect(page).toContain('profileResult.error');
    expect(resolver).toContain("admin.from('role_bindings')");
    expect(resolver).toContain('bindingError');
  });
});
