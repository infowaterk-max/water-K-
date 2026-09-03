import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const routeFile='src/app/api/admin/commercial/actions/route.ts';
const sqlFile='supabase/migrations/20260903184500_admin_commercial_evidence_atomic_v3.sql';

describe('commercial admin evidence atomicity',()=>{
  test('commercial route has no direct table writes and uses audited v3 RPCs',()=>{
    const route=read(routeFile);
    expect(route).not.toContain("from('commercial_opportunities').update");
    expect(route).not.toContain("from('sales_tasks').update");
    for(const name of[
      'admin_refresh_commercial_workspace_v3',
      'admin_transition_commercial_opportunity_v3',
      'admin_transition_sales_task_v3',
      'admin_create_commercial_offer_v3',
      'admin_approve_commercial_offer_v3',
      'admin_transition_commercial_offer_v3'
    ])expect(route).toContain(name);
    expect(route).toContain('hasAudit(data)');
    expect(route).toContain('auditId');
  });

  test('refresh planning and task generation share one audited transaction',()=>{
    const sql=read(sqlFile);
    expect(sql).toContain('public.plan_commercial_opportunities_v2(p_instance_id)');
    expect(sql).toContain('public.plan_high_value_sales_tasks_v2(p_instance_id)');
    expect(sql).toContain('COMMERCIAL_REFRESH_EVIDENCE_MISSING');
    expect(sql).toContain("'commercial.workspace_refreshed'");
    expect(sql).toContain('insert into public.admin_audit_log');
  });

  test('opportunity and task status writes are tenant locked and audited',()=>{
    const sql=read(sqlFile);
    expect(sql).toMatch(/commercial_opportunities[\s\S]*id=p_opportunity_id and instance_id=p_instance_id for update/);
    expect(sql).toMatch(/sales_tasks[\s\S]*id=p_task_id and instance_id=p_instance_id for update/);
    expect(sql).toContain("'commercial.opportunity_status_changed'");
    expect(sql).toContain("'commercial.sales_task_status_changed'");
    expect(sql).toContain('COMMERCIAL_OPPORTUNITY_EVIDENCE_MISSING');
    expect(sql).toContain('SALES_TASK_EVIDENCE_MISSING');
  });

  test('offer create approve and transition wrap the existing business engines with atomic audit evidence',()=>{
    const sql=read(sqlFile);
    expect(sql).toContain('public.create_commercial_offer_v2(');
    expect(sql).toContain('public.approve_commercial_offer_v2(p_instance_id,p_offer_id)');
    expect(sql).toContain('public.transition_commercial_offer_v2(p_instance_id,p_offer_id,p_status)');
    expect(sql).toContain("'commercial.offer_created'");
    expect(sql).toContain("'commercial.offer_approved'");
    expect(sql).toContain("'commercial.offer_status_changed'");
    expect(sql).toContain('COMMERCIAL_OFFER_EVIDENCE_MISSING');
  });

  test('v3 RPCs are service-runtime only and direct unaudited v2 service access is retired',()=>{
    const sql=read(sqlFile);
    for(const name of[
      'admin_refresh_commercial_workspace_v3',
      'admin_transition_commercial_opportunity_v3',
      'admin_transition_sales_task_v3',
      'admin_create_commercial_offer_v3',
      'admin_approve_commercial_offer_v3',
      'admin_transition_commercial_offer_v3'
    ]){
      expect(sql).toContain(`revoke all on function public.${name}`);
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]{0,260}to service_role`));
    }
    for(const oldName of[
      'plan_commercial_opportunities_v2',
      'plan_high_value_sales_tasks_v2',
      'create_commercial_offer_v2',
      'approve_commercial_offer_v2',
      'transition_commercial_offer_v2'
    ])expect(sql).toMatch(new RegExp(`revoke all on function public\\.${oldName}[\\s\\S]{0,260}service_role`));
  });
});
