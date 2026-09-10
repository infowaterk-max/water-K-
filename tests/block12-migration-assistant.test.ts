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

  test('production and fresh customer forward migrations stay identical and Fresh Install proof is recorded',()=>{
    expect(read('supabase/customer-baseline/migrations/0006_block12_migration_assistant.sql')).toBe(read('supabase/migrations/20260910162000_block12_migration_assistant_v1.sql'));
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
    expect(manifest.status).toBe('ready');
    expect(manifest.freshInstallProofRequired).toBe(false);
    expect(manifest.proofContractSha256).toBe('8d583480a7503b85d5875f9612cfb909431c42439781c09d09c62313b3f3b1c7');
    expect(manifest.notes).toContain('34498485799');
    expect(manifest.notes).toContain('81fc0d540f99bcf92cd9cdce8b871f1ff85cb0f5');
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
