import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('admin evidence atomicity closure',()=>{
  test('launch opening verifies that the pilot row was actually activated',()=>{
    const source=read('src/app/admin/indulas/actions.ts');
    expect(source).toContain(".eq('status','pilot').select('id').maybeSingle()");
    expect(source).toContain('if(error||!activated)');
  });

  test('all CMS mutations delegate business state and audit to one database transaction',()=>{
    const create=read('src/app/api/admin/content/route.ts');
    const detail=read('src/app/api/admin/content/[id]/route.ts');
    const sql=read('supabase/migrations/20260903143000_admin_content_fulfillment_atomic_v2.sql');
    for(const source of [create,detail]){
      expect(source).toContain("admin_mutate_content_page_v2");
      expect(source).not.toContain('recordAdminAudit');
    }
    expect(sql).toContain('create or replace function public.admin_mutate_content_page_v2');
    expect(sql).toContain("p_action not in ('create','update','delete')");
    expect(sql).toContain('public.can_manage_marketing(p_instance_id,p_actor)');
    expect(sql).toContain("insert into public.admin_audit_log");
    expect(sql).toContain("'content.created'");
    expect(sql).toContain("'content.updated'");
    expect(sql).toContain("'content.deleted'");
    expect(sql).toContain('to service_role');
  });

  test('manual fulfillment state, order event and audit are atomic',()=>{
    const route=read('src/app/api/admin/orders/[id]/manual/route.ts');
    const sql=read('supabase/migrations/20260903143000_admin_content_fulfillment_atomic_v2.sql');
    expect(route).toContain("admin_update_manual_fulfillment_v2");
    expect(route).not.toContain("from('orders').update");
    expect(route).not.toContain("from('order_events').insert");
    expect(route).not.toContain('recordAdminAudit');
    expect(sql).toContain('create or replace function public.admin_update_manual_fulfillment_v2');
    expect(sql).toContain('public.can_manage_orders(p_instance_id,p_actor)');
    expect(sql).toContain("'STALE_MANUAL_FULFILLMENT'");
    expect(sql).toContain('insert into public.order_events');
    expect(sql).toContain("'order.manual_fulfillment_updated'");
    expect(sql).toContain("jsonb_build_object('audit_source','database_rpc'");
  });
});
