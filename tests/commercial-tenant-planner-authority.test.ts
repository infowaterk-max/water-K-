import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903192000_commercial_tenant_planner_authority_v4.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('commercial tenant planner authority',()=>{
  test('B2B opportunity planning uses only the tenant-authoritative reseller view',()=>{
    const sql=read(migration);
    expect(sql).toContain('from public.reseller_growth_priorities_v2 r');
    expect(sql).toContain('r.instance_id=p_instance_id');
    expect(sql).toContain("'authority','customer_instance_roles'");
    expect(sql).not.toMatch(/from public\.reseller_growth_priorities r\b/);
  });

  test('stale tenant opportunities are dismissed when customer or reseller state is no longer actionable',()=>{
    const sql=read(migration);
    expect(sql).toMatch(/commercial_opportunities o[\s\S]*o\.instance_id=p_instance_id[\s\S]*segment_no_longer_actionable/);
    expect(sql).toMatch(/commercial_opportunities o[\s\S]*o\.instance_id=p_instance_id[\s\S]*tenant_reseller_no_longer_actionable/);
    expect(sql).toMatch(/not exists\([\s\S]*reseller_growth_priorities_v2 r[\s\S]*r\.customer_id=o\.reseller_id/);
  });

  test('B2C refresh is an in-place tenant upsert instead of leaving stale segment data',()=>{
    const sql=read(migration);
    expect(sql).toContain("'b2c:'||c.customer_key||':active'");
    expect(sql).toContain('on conflict(instance_id,opportunity_key) do update');
    expect(sql).toContain('customer_id=excluded.customer_id');
    expect(sql).toContain('closed_at=null');
  });

  test('generated sales tasks are cancelled only inside the requested tenant when their opportunity is no longer actionable',()=>{
    const sql=read(migration);
    expect(sql).toMatch(/update public\.sales_tasks t[\s\S]*t\.instance_id=p_instance_id/);
    expect(sql).toMatch(/commercial_opportunities o[\s\S]*o\.id=t\.opportunity_id[\s\S]*o\.instance_id=p_instance_id/);
    expect(sql).toContain("status='cancelled'");
    expect(sql).toContain('o.priority_score>=80 or o.expected_value_net_huf>=100000');
  });

  test('legacy global planner surfaces stay unavailable to service runtime',()=>{
    const sql=read(migration);
    expect(sql).toContain('revoke all on function public.plan_commercial_opportunities() from public,anon,authenticated,service_role');
    expect(sql).toContain('revoke all on function public.plan_high_value_sales_tasks() from public,anon,authenticated,service_role');
    expect(sql).toContain('revoke all on public.reseller_reorder_signals from public,anon,authenticated,service_role');
    expect(sql).toContain('revoke all on public.reseller_growth_priorities from public,anon,authenticated,service_role');
    expect(sql).toContain('revoke all on function public.plan_commercial_opportunities_v2(uuid) from public,anon,authenticated,service_role');
  });

  test('audited commercial refresh remains the only application entry point',()=>{
    const wrapper=read('supabase/migrations/20260903184500_admin_commercial_evidence_atomic_v3.sql');
    const route=read('src/app/api/admin/commercial/actions/route.ts');
    expect(wrapper).toContain('public.plan_commercial_opportunities_v2(p_instance_id)');
    expect(wrapper).toContain('public.plan_high_value_sales_tasks_v2(p_instance_id)');
    expect(route).toContain("a.rpc('admin_refresh_commercial_workspace_v3'");
    expect(route).not.toContain("a.rpc('plan_commercial_opportunities_v2'");
  });
});
