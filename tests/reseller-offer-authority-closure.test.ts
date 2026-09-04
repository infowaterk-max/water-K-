import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903200000_reseller_offer_authority_v4.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('reseller offer authority and downstream closure',()=>{
  test('active offers are fail-closed on opportunity, variant and current reseller authority',()=>{
    const sql=read(migration);
    expect(sql).toContain('commercial_offer_authority_guard');
    expect(sql).toContain("new.status not in ('draft','approved','sent','accepted')");
    expect(sql).toContain("v_opp.status not in ('open','in_progress')");
    expect(sql).toContain('COMMERCIAL_OPPORTUNITY_NOT_ACTIVE');
    expect(sql).toContain('COMMERCIAL_VARIANT_TENANT_MISMATCH');
    expect(sql).toContain('public.customer_instance_roles cir');
    expect(sql).toContain("cir.role='reseller'");
    expect(sql).toContain('cir.reseller_approved=true');
    expect(sql).toContain('B2B_RESELLER_AUTHORITY_REQUIRED');
    expect(sql).toContain("where f.status in ('draft','approved','sent')");
    expect(sql).toContain("o.status not in ('open','in_progress')");
    expect(sql).toMatch(/o\.channel='b2b'[\s\S]*not exists\([\s\S]*customer_instance_roles cir/);
  });

  test('role revocation closes only active offers linked to that tenant reseller with null-safe nested evidence',()=>{
    const sql=read(migration);
    expect(sql).toContain("v_result->>'role' is null");
    expect(sql).toContain("jsonb_typeof(v_result->'resellerApproved') is distinct from 'boolean'");
    expect(sql).toContain("jsonb_typeof(v_result->'retiredOpportunities') is distinct from 'number'");
    expect(sql).toContain("jsonb_typeof(v_result->'cancelledTasks') is distinct from 'number'");
    expect(sql).toContain('public.admin_update_customer_store_role_v3(');
    expect(sql).toContain('f.instance_id=p_instance_id');
    expect(sql).toContain("f.status in ('draft','approved','sent')");
    expect(sql).toContain('o.reseller_id=p_user_id');
    expect(sql).toContain("o.channel='b2b'");
    expect(sql).toContain("'customer.store_role_offer_reconciled'");
    expect(sql).toContain("'cancelledOffers',v_cancelled_offers");
  });

  test('closed opportunities atomically retire active offers and generated tasks',()=>{
    const sql=read(migration);
    expect(sql).toContain("if p_status in ('won','lost','dismissed') then");
    expect(sql).toContain('f.opportunity_id=p_opportunity_id');
    expect(sql).toContain("t.task_key='opportunity:'||p_opportunity_id::text");
    expect(sql).toContain("'commercial.opportunity_downstream_reconciled'");
    expect(sql).toContain("'cancelledTasks',v_cancelled_tasks");
  });

  test('B2B opportunities cannot be reopened or progressed without current tenant approval',()=>{
    const sql=read(migration);
    expect(sql).toContain("p_status in ('open','in_progress') and v_before.channel='b2b'");
    expect(sql).toContain('cir.instance_id=p_instance_id');
    expect(sql).toContain('cir.user_id=v_before.reseller_id');
    expect(sql).toContain('B2B_RESELLER_AUTHORITY_REQUIRED');
  });

  test('application routes use v4 closure entrypoints and validate exact cleanup counts',()=>{
    const customer=read('src/app/api/admin/customers/[id]/route.ts');
    const commercial=read('src/app/api/admin/commercial/actions/route.ts');
    expect(customer).toContain("admin.rpc('admin_update_customer_store_role_v4'");
    expect(customer).toContain("typeof result.cancelledOffers==='number'");
    expect(commercial).toContain("a.rpc('admin_transition_commercial_opportunity_v4'");
    expect(commercial).toContain('Number.isInteger(e.cancelledOffers)');
    expect(commercial).toContain('Number.isInteger(e.cancelledTasks)');
    expect(commercial).toContain('B2B_RESELLER_AUTHORITY_REQUIRED');
    expect(commercial).toContain('COMMERCIAL_OPPORTUNITY_NOT_ACTIVE');
    expect(commercial).toContain("a.rpc('admin_transition_commercial_offer_v4'");
  });

  test('v3 role/opportunity mutators are internal while v4 wrappers are service-runtime entrypoints',()=>{
    const sql=read(migration);
    expect(sql).toMatch(/revoke all on function public\.admin_update_customer_store_role_v3[\s\S]{0,220}service_role/);
    expect(sql).toMatch(/grant execute on function public\.admin_update_customer_store_role_v4[\s\S]{0,220}to service_role/);
    expect(sql).toMatch(/revoke all on function public\.admin_transition_commercial_opportunity_v3[\s\S]{0,220}service_role/);
    expect(sql).toMatch(/grant execute on function public\.admin_transition_commercial_opportunity_v4[\s\S]{0,220}to service_role/);
  });
});
