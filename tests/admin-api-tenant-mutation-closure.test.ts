import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('admin API tenant mutation closure',()=>{
  test('catalog export import and bulk operations require catalog.manage and explicit instance scope',()=>{
    const exp=read('src/app/api/admin/catalog/export/route.ts');
    const imp=read('src/app/api/admin/catalog/import/route.ts');
    const bulk=read('src/app/api/admin/catalog/bulk/route.ts');

    for(const source of [exp,imp,bulk]){
      expect(source).toContain("getAdminRequestUser('catalog.manage')");
      expect(source).toContain("requireCurrentStoreContext('catalog.manage')");
      expect(source).toContain("scope.instanceId");
    }
    expect(exp).toContain(".eq('instance_id',scope.instanceId)");
    expect(imp).toContain("bulk_update_product_variants_v3");
    expect(bulk).toContain("bulk_update_product_variants_v3");
    expect(imp).not.toContain('recordAdminAudit');
    expect(bulk).not.toContain('recordAdminAudit');
  });

  test('tenant-safe bulk RPC locks every selected and updated variant to p_instance_id',()=>{
    const sql=read('supabase/migrations/20260903115000_catalog_bulk_tenant_rpc_v2.sql');
    expect(sql).toContain('bulk_update_product_variants_v2');
    expect(sql.match(/instance_id = p_instance_id/g)?.length).toBeGreaterThanOrEqual(2);
    expect(sql).toContain('insert into public.inventory_events');
    expect(sql).toContain('p_instance_id,');
    expect(sql).toContain('revoke all on function public.bulk_update_product_variants_v2');
  });

  test('bulk and CSV catalog mutations commit audit in the same database transaction',()=>{
    const sql=read('supabase/migrations/20260903133000_catalog_variant_atomic_v2.sql');
    expect(sql).toContain('bulk_update_product_variants_v3');
    expect(sql).toContain('v_result:=public.bulk_update_product_variants_v2');
    expect(sql).toContain('insert into public.admin_audit_log');
    expect(sql).toContain("p_audit_action not in ('catalog.bulk_update_applied','catalog.csv_import_applied')");
    expect(sql).toContain('CATALOG_PERMISSION_REQUIRED');
    expect(sql).toContain('revoke all on function public.bulk_update_product_variants_v3');
  });

  test('content update delete cannot address another webshop by id',()=>{
    const route=read('src/app/api/admin/content/[id]/route.ts');
    const sql=read('supabase/migrations/20260903143000_admin_content_fulfillment_atomic_v2.sql');
    expect(route.match(/requireCurrentStoreContext\('marketing\.manage'\)/g)?.length).toBe(2);
    expect(route.match(/p_instance_id:scope\.instanceId/g)?.length).toBe(2);
    expect(route).toContain("admin_mutate_content_page_v2");
    expect(route).not.toContain('recordAdminAudit');
    expect(sql).toContain('where id=p_content_id and instance_id=p_instance_id');
    expect(sql).toContain('public.can_manage_marketing(p_instance_id,p_actor)');
  });

  test('manual fulfillment is order-manager and tenant scoped',()=>{
    const route=read('src/app/api/admin/orders/[id]/manual/route.ts');
    const sql=read('supabase/migrations/20260903143000_admin_content_fulfillment_atomic_v2.sql');
    expect(route).toContain("getAdminRequestUser('orders.manage')");
    expect(route).toContain("requireCurrentStoreContext('orders.manage')");
    expect(route).toContain(".eq('instance_id',scope.instanceId)");
    expect(route).toContain('p_instance_id:scope.instanceId');
    expect(route).toContain("admin_update_manual_fulfillment_v2");
    expect(route).not.toContain('recordAdminAudit');
    expect(sql).toContain('where id=p_order_id and instance_id=p_instance_id');
    expect(sql).toContain('insert into public.order_events');
    expect(sql).toContain('insert into public.admin_audit_log');
  });

  test('catalog and content mutation pages require their matching permissions',()=>{
    expect(read('src/app/admin/termekek/import-export/page.tsx')).toContain("requireCurrentStoreContext('catalog.manage')");
    expect(read('src/app/admin/termekek/tomeges/page.tsx')).toContain("requireCurrentStoreContext('catalog.manage')");
    expect(read('src/app/admin/tartalom/page.tsx')).toContain("requireCurrentStoreContext('marketing.manage')");
  });
  test('single variant update is tenant-scoped and atomic with inventory evidence and audit',()=>{
    const route=read('src/app/api/admin/variants/[id]/route.ts');
    const sql=read('supabase/migrations/20260903133000_catalog_variant_atomic_v2.sql');
    expect(route).toContain("getAdminRequestUser('catalog.manage')");
    expect(route).toContain("requireCurrentStoreContext('catalog.manage')");
    expect(route).toContain("admin_update_product_variant_v2");
    expect(route).toContain("p_expected_updated_at:current.updated_at");
    expect(route).toContain("(data as {id?:string}|null)?.id!==id");
    expect(route).toContain('A termékváltozat módosításának eredménye nem igazolható.');
    expect(route).not.toContain(".from('product_variants').update(");
    expect(sql).toContain('for update');
    expect(sql).toContain('instance_id=p_instance_id');
    expect(sql).toContain('insert into public.inventory_events');
    expect(sql).toContain('insert into public.admin_audit_log');
    expect(sql).toContain('CATALOG_PERMISSION_REQUIRED');
    expect(sql).toContain('revoke all on function public.admin_update_product_variant_v2');
  });

});
