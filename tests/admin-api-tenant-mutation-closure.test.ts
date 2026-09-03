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
    expect(imp).toContain("bulk_update_product_variants_v2");
    expect(bulk).toContain("bulk_update_product_variants_v2");
  });

  test('tenant-safe bulk RPC locks every selected and updated variant to p_instance_id',()=>{
    const sql=read('supabase/migrations/20260903115000_catalog_bulk_tenant_rpc_v2.sql');
    expect(sql).toContain('bulk_update_product_variants_v2');
    expect(sql.match(/instance_id = p_instance_id/g)?.length).toBeGreaterThanOrEqual(2);
    expect(sql).toContain('insert into public.inventory_events');
    expect(sql).toContain('p_instance_id,');
    expect(sql).toContain('revoke all on function public.bulk_update_product_variants_v2');
  });

  test('content update delete cannot address another webshop by id',()=>{
    const route=read('src/app/api/admin/content/[id]/route.ts');
    expect(route.match(/requireCurrentStoreContext\('marketing\.manage'\)/g)?.length).toBe(2);
    expect(route.match(/eq\('instance_id',scope\.instanceId\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(route).toContain('organizationId:scope.organizationId');
    expect(route).toContain('instanceId:scope.instanceId');
  });

  test('manual fulfillment is order-manager and tenant scoped',()=>{
    const route=read('src/app/api/admin/orders/[id]/manual/route.ts');
    expect(route).toContain("getAdminRequestUser('orders.manage')");
    expect(route).toContain("requireCurrentStoreContext('orders.manage')");
    expect(route.match(/eq\('instance_id',scope\.instanceId\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(route).toContain('instance_id:scope.instanceId');
    expect(route).toContain('organizationId:scope.organizationId');
  });

  test('catalog and content mutation pages require their matching permissions',()=>{
    expect(read('src/app/admin/termekek/import-export/page.tsx')).toContain("requireCurrentStoreContext('catalog.manage')");
    expect(read('src/app/admin/termekek/tomeges/page.tsx')).toContain("requireCurrentStoreContext('catalog.manage')");
    expect(read('src/app/admin/tartalom/page.tsx')).toContain("requireCurrentStoreContext('marketing.manage')");
  });
});
