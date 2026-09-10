import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Roadmap Block 12 Migration Assistant contract',()=>{
  test('database model is tenant scoped, journaled and service-role mutation only',()=>{
    const sql=read('supabase/migrations/20260910162000_block12_migration_assistant_v1.sql');
    for(const table of ['migration_runs','migration_records','migration_issues','migration_external_links','migration_change_journal'])expect(sql).toContain(`public.${table}`);
    expect(sql).toContain('MIGRATION_TENANT_MISMATCH');
    expect(sql).toContain('MIGRATION_CHILD_TENANT_MISMATCH');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('public.can_read_store(instance_id,(select auth.uid()))');
    expect(sql).toContain('revoke all on table public.migration_runs');
    expect(sql).toContain('apply_shopware6_catalog_migration_v1');
    expect(sql).toContain('rollback_shopware6_catalog_migration_v1');
    expect(sql).toContain('MIGRATION_ROLLBACK_TARGET_CHANGED');
    expect(sql).toContain('grant execute on function public.apply_shopware6_catalog_migration_v1(uuid,uuid,uuid,integer) to service_role');
    expect(sql).not.toMatch(/insert\s+into\s+auth\.users/i);
    expect(sql).not.toMatch(/delete\s+from\s+auth\.users/i);
  });

  test('production and fresh customer forward migrations stay identical and proof lifecycle is fail closed',()=>{
    expect(read('supabase/customer-baseline/migrations/0006_block12_migration_assistant.sql')).toBe(read('supabase/migrations/20260910162000_block12_migration_assistant_v1.sql'));
    expect(read('supabase/customer-baseline/migrations/0007_block12_trigger_privilege_hardening.sql')).toBe(read('supabase/migrations/20260910162400_block12_trigger_privilege_hardening.sql'));
    expect(read('supabase/customer-baseline/migrations/0008_block12_fk_index_hardening.sql')).toBe(read('supabase/migrations/20260910163000_block12_fk_index_hardening.sql'));
    const hardening=read('supabase/migrations/20260910162400_block12_trigger_privilege_hardening.sql');
    for(const fn of ['migration_run_tenant_guard_v1','migration_child_tenant_guard_v1','migration_external_link_tenant_guard_v1'])expect(hardening).toContain(`revoke all on function public.${fn}() from public,anon,authenticated`);
    const indexes=read('supabase/migrations/20260910163000_block12_fk_index_hardening.sql');
    for(const index of ['migration_runs_organization_idx','migration_runs_created_by_idx','migration_records_instance_idx','migration_records_organization_idx','migration_issues_instance_idx','migration_issues_organization_idx','migration_issues_resolved_by_idx','migration_external_links_organization_idx','migration_change_journal_instance_idx','migration_change_journal_organization_idx'])expect(indexes).toContain(`create index if not exists ${index}`);
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
    expect(['snapshot-reviewed','ready']).toContain(manifest.status);
    if(manifest.status==='ready'){
      expect(manifest.freshInstallProofRequired).toBe(false);
      expect(manifest.proofContractSha256).toMatch(/^[a-f0-9]{64}$/);
    }else{
      expect(manifest.freshInstallProofRequired).toBe(true);
      expect(manifest.proofContractSha256).toBeNull();
    }
  });

  test('Shopware connector rejects unsafe network targets and never persists credentials',()=>{
    const source=read('src/lib/migration/shopware6.ts'),route=read('src/app/api/admin/migration/shopware6/route.ts');
    expect(source).toContain("url.protocol!=='https:'");
    expect(source).toContain("lookup(host,{all:true,verbatim:true})");
    expect(source).toContain("redirect:'manual'");
    expect(source).toContain('SHOPWARE_URL_PRIVATE_HOST');
    expect(route).toContain("getAdminRequestUser('store.manage')");
    expect(route).toContain("requireCurrentStoreContext('store.manage')");
    expect(route).toContain("hasCurrentPlanFeature('importExport')");
    expect(route).toContain(".eq('instance_id',scope.instanceId)");
    expect(route).toContain("credentials_persisted:false");
    expect(route).not.toMatch(/secret_access_key\s*:/i);
    expect(route).not.toMatch(/access_key_id\s*:/i);
  });

  test('preview is fail closed and non-lossless entities remain staged/deferred',()=>{
    const route=read('src/app/api/admin/migration/shopware6/route.ts');
    expect(route).toContain('TARGET_WRITE_DEFERRED');
    expect(route).toContain('auth_identity_not_auto_created');
    expect(route).toContain('TARGET_SLUG_CONFLICT');
    expect(route).toContain('TARGET_SKU_CONFLICT');
    expect(route).toContain("String(run.source_summary?.systemCurrency??'').toUpperCase()!=='HUF'");
    expect(route).toContain("admin.rpc('apply_shopware6_catalog_migration_v1'");
    expect(route).toContain("admin.rpc('rollback_shopware6_catalog_migration_v1'");
  });

  test('admin surface keeps Block 12 separate from Page Schema and Visual Builder',()=>{
    const page=read('src/app/admin/migracio/page.tsx'),ui=read('src/components/admin/shopware-migration-assistant.tsx');
    expect(page).toContain("requirePlanFeature('importExport')");
    expect(page).toContain("requireCurrentStorePageContext('store.manage')");
    expect(page).toContain('Shopware 6 → Shoporation');
    expect(ui).toContain('Dry-run / előnézet');
    expect(ui).toContain('Nem destruktív rollback');
    expect(ui).toContain('nincs payment-token migráció');
    expect(page+ui).not.toMatch(/drag.?drop|live canvas/i);
  });
});
