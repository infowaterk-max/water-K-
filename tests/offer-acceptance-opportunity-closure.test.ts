import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903201500_offer_acceptance_closure_v4.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('offer acceptance opportunity closure',()=>{
  test('v4 wraps the audited v3 transition and validates exact nested evidence',()=>{
    const sql=read(migration);
    expect(sql).toContain('public.admin_transition_commercial_offer_v3(');
    expect(sql).toContain("v_result->>'id' is distinct from p_offer_id::text");
    expect(sql).toContain("v_result->>'status' is distinct from p_status");
    expect(sql).toContain("v_result->>'auditId' is null");
    expect(sql).toContain("jsonb_typeof(v_result->'offer') is distinct from 'object'");
  });

  test('accepted offer must prove won opportunity and zero active sibling offers',()=>{
    const sql=read(migration);
    expect(sql).toContain("if p_status='accepted' then");
    expect(sql).toContain("v_opportunity.status<>'won'");
    expect(sql).toContain('v_opportunity.closed_at is null');
    expect(sql).toContain('COMMERCIAL_ACCEPTANCE_OPPORTUNITY_CLOSURE_MISSING');
    expect(sql).toContain("f.status in ('draft','approved','sent')");
    expect(sql).toContain('COMMERCIAL_ACCEPTANCE_SIBLING_CLOSURE_MISSING');
  });

  test('accepted offer closes only the exact generated tenant sales task',()=>{
    const sql=read(migration);
    expect(sql).toContain('t.instance_id=p_instance_id');
    expect(sql).toContain('t.opportunity_id=v_offer.opportunity_id');
    expect(sql).toContain("t.task_key='opportunity:'||v_offer.opportunity_id::text");
    expect(sql).toContain("t.status in ('open','in_progress')");
    expect(sql).toContain('get diagnostics v_cancelled_tasks=row_count');
  });

  test('acceptance reconciliation emits dedicated audit proof and exact counts',()=>{
    const sql=read(migration);
    expect(sql).toContain("'commercial.offer_acceptance_reconciled'");
    expect(sql).toContain("'opportunityStatus',v_opportunity.status");
    expect(sql).toContain("'cancelledTasks',v_cancelled_tasks");
    expect(sql).toContain("'siblingActiveOffers',v_sibling_active");
    expect(sql).toContain("'parentAuditId',v_result->>'auditId'");
    expect(sql).toContain("'reconciliationAuditId',v_reconciliation_audit_id");
  });

  test('application runtime uses v4 and fail-closes accepted evidence',()=>{
    const route=read('src/app/api/admin/commercial/actions/route.ts');
    expect(route).toContain("a.rpc('admin_transition_commercial_offer_v4'");
    expect(route).not.toContain("a.rpc('admin_transition_commercial_offer_v3'");
    expect(route).toContain("p.status!=='accepted'");
    expect(route).toContain("e.opportunityStatus==='won'");
    expect(route).toContain('e.siblingActiveOffers===0');
    expect(route).toContain("typeof e.reconciliationAuditId==='string'");
  });

  test('v3 direct runtime is retired after v4 becomes the service entrypoint',()=>{
    const sql=read(migration);
    expect(sql).toMatch(/revoke all on function public\.admin_transition_commercial_offer_v3[\s\S]{0,220}service_role/);
    expect(sql).toMatch(/grant execute on function public\.admin_transition_commercial_offer_v4[\s\S]{0,220}to service_role/);
  });
});
