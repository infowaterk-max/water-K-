import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('platform service-role profile read contract',()=>{
  it('keeps the forward migration explicit',()=>{
    const migration=read('supabase/migrations/20260914190000_profiles_service_role_read_contract.sql');
    expect(migration).toContain('grant select on table public.profiles to service_role');
  });

  it('keeps Fresh Install parity explicit',()=>{
    const baseline=read('supabase/customer-baseline/migrations/0031_profiles_service_role_read_contract.sql');
    expect(baseline).toContain('grant select on table public.profiles to service_role');
  });

  it('protects the platform membership profile lookup contract',()=>{
    const page=read('src/app/admin/platform/webaruhazak/page.tsx');
    expect(page).toContain("a.from('profiles').select('id,email,full_name,company_name')");
    expect(page).toContain('profileResult.error');
  });
});
