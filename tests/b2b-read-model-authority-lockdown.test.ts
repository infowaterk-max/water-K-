import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903203000_legacy_b2b_read_model_lockdown.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('B2B read-model authority lockdown',()=>{
  test('legacy global reseller and V9 views are unavailable to every application runtime role',()=>{
    const sql=read(migration);
    for(const view of[
      'reseller_reorder_signals',
      'reseller_growth_priorities',
      'v9_growth_dashboard',
      'v9_channel_retention_summary',
      'v9_monthly_customer_cohorts',
    ]){
      expect(sql).toMatch(new RegExp(
        `revoke all on public\\.${view}[\\s\\S]{0,120}service_role`
      ));
    }
  });

  test('tenant-scoped replacements remain service-role readable only',()=>{
    const sql=read(migration);
    for(const view of[
      'reseller_reorder_signals_v2',
      'reseller_growth_priorities_v2',
      'v9_growth_dashboard_v2',
      'v9_channel_retention_summary_v2',
      'v9_monthly_customer_cohorts_v2',
    ]){
      expect(sql).toContain(`grant select on public.${view} to service_role`);
      expect(sql).toMatch(new RegExp(
        `revoke all on public\\.${view}[\\s\\S]{0,120}public,anon,authenticated`
      ));
    }
  });

  test('growth and executive analytics use only tenant-scoped V2 read models',()=>{
    const growth=read('src/app/admin/novekedes/page.tsx');
    const executive=read('src/app/admin/vezetoi/page.tsx');

    expect(growth).toContain("from('v9_growth_dashboard_v2')");
    expect(growth).toContain("from('reseller_growth_priorities_v2')");
    expect(growth).not.toContain("from('v9_growth_dashboard')");
    expect(growth).not.toContain("from('reseller_growth_priorities')");

    expect(executive).toContain("from('v9_channel_retention_summary_v2')");
    expect(executive).toContain("from('v9_monthly_customer_cohorts_v2')");
    expect(executive).toContain("from('v9_growth_dashboard_v2')");
    expect(executive).not.toContain("from('v9_channel_retention_summary')");
    expect(executive).not.toContain("from('v9_monthly_customer_cohorts')");
    expect(executive).not.toContain("from('v9_growth_dashboard')");
  });

  test('tenant B2B classification originates from customer_instance_roles',()=>{
    const tenantSql=read('supabase/migrations/20260901169000_customer_instance_b2b_roles.sql');
    expect(tenantSql).toContain('public.customer_instance_roles cir');
    expect(tenantSql).toContain("cir.role='reseller'");
    expect(tenantSql).toContain('cir.reseller_approved=true');
    expect(tenantSql).toContain('create or replace view public.v9_channel_retention_summary_v2');
    expect(tenantSql).toContain('create or replace view public.reseller_reorder_signals_v2');
  });
});
