import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('fine grained store RBAC contracts',()=>{
  it('keeps support separate from order mutation rights',()=>{
    const source=read('src/lib/auth/store-rbac.ts');
    expect(source).toContain("support:['support.manage','store.read']");
    expect(source).not.toContain("support:['support.manage','orders.manage'");
    expect(source).toContain("'procurement.manage'");
    expect(source).toContain("'integrations.manage'");
  });

  it('requires support permission and tenant scope for support mutations',()=>{
    for(const path of ['src/app/api/admin/support/[id]/route.ts','src/app/api/admin/support/[id]/messages/route.ts']){
      const source=read(path);
      expect(source).toContain("getAdminRequestUser('support.manage')");
      expect(source).toContain("requireCurrentStoreContext('support.manage')");
      expect(source).toContain(".eq('instance_id',scope.instanceId)");
    }
  });

  it('requires procurement permission and tenant-safe RPCs',()=>{
    const create=read('src/app/api/admin/procurement/route.ts');
    const update=read('src/app/api/admin/procurement/[id]/route.ts');
    expect(create).toContain("getAdminRequestUser('procurement.manage')");
    expect(create).toContain('create_purchase_order_v2');
    expect(create).toContain('p_instance_id:scope.instanceId');
    expect(update).toContain('receive_purchase_order_items_v2');
    expect(update).toContain('receive_purchase_order_v2');
    expect(update).toContain('transition_purchase_order_v2');
  });

  it('writes integration jobs with an explicit or order-derived tenant',()=>{
    const source=read('src/lib/integrations/outbox.ts');
    expect(source).toContain('instance_id:instanceId');
    expect(source).toContain('Cross-store integration job is not allowed.');
    expect(source).toContain('Integration job requires tenant instance.');
  });

  it('aligns database support and procurement permissions with app RBAC',()=>{
    const sql=read('supabase/migrations/20260901153000_permission_rpc_tenant_alignment.sql').toLowerCase();
    expect(sql).toContain("array['owner','admin','order_manager']");
    expect(sql).toContain("array['owner','admin','order_manager','support']");
    expect(sql).toContain("array['owner','admin','catalog_manager']");
    expect(sql).toContain('enqueue_communication_v2');
    expect(sql).toContain('create_purchase_order_v2');
    expect(sql).toContain('suppliers_instance_name_unique_ci');
  });
});
