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

  it('keeps catalog read parity explicit in forward and Fresh Install migrations',()=>{
    const forward=read('supabase/migrations/20260915073000_catalog_service_role_read_contract.sql');
    const baseline=read('supabase/customer-baseline/migrations/0033_catalog_service_role_read_contract.sql');
    for(const table of ['products','product_variants','webshop_sales_channels','product_channel_settings','product_media','product_media_presentations']){
      const marker=`grant select on table public.${table} to service_role`;
      expect(forward).toContain(marker);
      expect(baseline).toContain(marker);
    }
  });

  it('protects the server-side read consumers',()=>{
    const platformPage=read('src/app/admin/platform/webaruhazak/page.tsx');
    const resolver=read('src/lib/instances/access.ts');
    const productsPage=read('src/app/admin/termekek/page.tsx');
    const documentsPage=read('src/app/admin/termekek/dokumentumok/page.tsx');
    expect(platformPage).toContain("a.from('profiles').select('id,email,full_name,company_name')");
    expect(platformPage).toContain('profileResult.error');
    expect(resolver).toContain("admin.from('role_bindings')");
    expect(resolver).toContain('bindingError');
    expect(productsPage).toContain("admin.from('product_variants')");
    expect(productsPage).toContain("admin.from('webshop_sales_channels')");
    expect(productsPage).toContain("admin.from('product_channel_settings')");
    expect(documentsPage).toContain("admin.from('products')");
    expect(documentsPage).toContain("admin.from('product_variants')");
  });
});
