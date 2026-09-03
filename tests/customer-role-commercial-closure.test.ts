import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903194500_customer_role_commercial_atomic_v3.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('customer role commercial closure',()=>{
  test('role mutation is wrapped and the legacy v2 runtime entrypoint is retired',()=>{
    const sql=read(migration);
    const route=read('src/app/api/admin/customers/[id]/route.ts');
    expect(sql).toContain('public.admin_update_customer_store_role_v2(');
    expect(sql).toMatch(/revoke all on function public\.admin_update_customer_store_role_v2[\s\S]{0,180}service_role/);
    expect(sql).toMatch(/grant execute on function public\.admin_update_customer_store_role_v3[\s\S]{0,180}to service_role/);
    expect(route).toContain("admin.rpc('admin_update_customer_store_role_v3'");
    expect(route).not.toContain("admin.rpc('admin_update_customer_store_role_v2'");
  });

  test('reseller revocation retires only the exact tenant generated reorder opportunity',()=>{
    const sql=read(migration);
    expect(sql).toContain("o.instance_id=p_instance_id");
    expect(sql).toContain("o.reseller_id=p_user_id");
    expect(sql).toContain("o.channel='b2b'");
    expect(sql).toContain("o.kind='reorder'");
    expect(sql).toContain("o.opportunity_key='b2b:'||p_user_id::text||':reorder'");
    expect(sql).toContain("'auto_closed_reason','tenant_reseller_no_longer_actionable'");
  });

  test('only generated tasks linked to retired opportunities are cancelled in the same tenant',()=>{
    const sql=read(migration);
    expect(sql).toContain('t.instance_id=p_instance_id');
    expect(sql).toContain('t.opportunity_id=any(v_retired_ids)');
    expect(sql).toContain("t.task_key='opportunity:'||t.opportunity_id::text");
    expect(sql).toContain("t.status in('open','in_progress')");
    expect(sql).toContain('Automatikusan lezárva [commercial_planner]');
  });

  test('commercial cleanup writes atomic audit evidence and returns exact counts',()=>{
    const sql=read(migration);
    expect(sql).toContain("'customer.store_role_commercial_reconciled'");
    expect(sql).toContain("'retiredOpportunities',v_retired");
    expect(sql).toContain("'cancelledTasks',v_cancelled");
    expect(sql).toContain("return v_result||jsonb_build_object(");
  });

  test('API validates target, resulting authority and reconciliation evidence',()=>{
    const route=read('src/app/api/admin/customers/[id]/route.ts');
    expect(route).toContain("select('role,reseller_approved,updated_at')");
    expect(route).toContain('result.id!==id');
    expect(route).toContain('result.role!==expectedRole');
    expect(route).toContain('result.resellerApproved!==expectedApproved');
    expect(route).toContain("typeof result.retiredOpportunities==='number'");
    expect(route).toContain("typeof result.cancelledTasks==='number'");
  });
});
