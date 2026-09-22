import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const sqlFile='supabase/migrations/20260903183000_admin_growth_refresh_evidence_atomic_v3.sql';

describe('admin Growth refresh evidence',()=>{
  test('interactive refresh uses one audited wrapper transaction',()=>{
    const route=read('src/app/api/admin/growth/run/route.ts');
    const sql=read(sqlFile);
    expect(route).toContain("getAdminRequestUser('marketing.manage')");
    expect(route).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(route).toContain('admin_refresh_growth_workflows_v3');
    expect(route).not.toContain("a.rpc('plan_customer_retention_journeys_v2'");
    expect(route).not.toContain("a.rpc('dispatch_due_customer_journey_steps_v2'");
    expect(sql).toContain('public.plan_customer_retention_journeys_v2(p_instance_id)');
    expect(sql).toContain('public.dispatch_due_customer_journey_steps_v2(p_instance_id,p_limit)');
    expect(sql).toContain('insert into public.admin_audit_log');
    expect(sql).toContain('GROWTH_AUDIT_EVIDENCE_MISSING');
  });

  test('wrapper validates planner and dispatcher evidence before success',()=>{
    const route=read('src/app/api/admin/growth/run/route.ts');
    const sql=read(sqlFile);
    expect(sql).toContain('GROWTH_PLAN_EVIDENCE_MISSING');
    expect(sql).toContain('GROWTH_DISPATCH_EVIDENCE_MISSING');
    expect(sql).toContain('GROWTH_DISPATCH_EVIDENCE_INVALID');
    expect(route).toContain('Number(dispatched.queued)+Number(dispatched.blocked)>Number(dispatched.seen)');
    expect(route).toContain("evidence.partial!==(Number(dispatched.blocked)>0)");
  });

  test('blocked journey steps are surfaced as partial outcome in the UI',()=>{
    const button=read('src/components/admin/growth-refresh-button.tsx');
    expect(button).toContain("j.partial===true||blocked>0");
    expect(button).toContain('Részleges frissítés:');
    expect(button).toContain('blokkolva');
    expect(button).toContain("'warningNotice'");
    expect(button).toContain("'errorNotice'");
  });

  test('admin wrapper is service-runtime only without changing cron v2 contracts',()=>{
    const sql=read(sqlFile);
    const cron=read('src/app/api/cron/integrations/route.ts');
    expect(sql).toContain('revoke all on function public.admin_refresh_growth_workflows_v3');
    expect(sql).toMatch(/grant execute on function public\.admin_refresh_growth_workflows_v3[\s\S]{0,220}to service_role/);
    expect(cron).toContain('plan_customer_retention_journeys_v2');
    expect(cron).toContain('dispatch_due_customer_journey_steps_v2');
  });
});
