import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903211500_loyalty_tenant_lifecycle_engine_v2.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('tenant loyalty lifecycle engine v2',()=>{
  test('milestone identity is store-local instead of globally customer-local',()=>{
    const sql=read(migration);
    expect(sql).toContain('drop constraint if exists customer_lifecycle_milestones_customer_id_milestone_key_key');
    expect(sql).toContain('on public.customer_lifecycle_milestones(instance_id,customer_id,milestone_key)');
    expect(sql).toContain('on conflict(instance_id,customer_id,milestone_key) do nothing');
  });

  test('each webshop receives independent loyalty settings and default benefit rules',()=>{
    const sql=read(migration);
    expect(sql).toContain('private.ensure_loyalty_program_defaults_v2');
    expect(sql).toContain('values(p_instance_id,true,now(),now())');
    expect(sql).toContain("p_instance_id,'silver-points-boost'");
    expect(sql).toContain("p_instance_id,'platinum-manual-review'");
    expect(sql).toContain('on conflict(instance_id,rule_key) do nothing');
  });

  test('redemption idempotency balance and order ownership are instance scoped',()=>{
    const sql=read(migration);
    const start=sql.indexOf('create or replace function public.redeem_loyalty_points_v2');
    const end=sql.indexOf('create or replace function public.use_loyalty_benefit_v2');
    const fn=sql.slice(start,end);
    expect(fn).toContain('where instance_id=p_instance_id and event_key=trim(p_event_key)');
    expect(fn).toContain('where instance_id=p_instance_id and customer_id=p_customer_id');
    expect(fn).toContain('o.instance_id=p_instance_id');
    expect(fn).toContain('instance_id,customer_id,event_key');
  });

  test('benefit use is scoped by webshop rule profile usage and order',()=>{
    const sql=read(migration);
    const start=sql.indexOf('create or replace function public.use_loyalty_benefit_v2');
    const end=sql.indexOf('create or replace function public.use_discount_loyalty_benefit_v2');
    const fn=sql.slice(start,end);
    expect(fn).toContain('where id=p_rule_id and instance_id=p_instance_id');
    expect(fn).toContain('where instance_id=p_instance_id and customer_id=p_customer_id');
    expect(fn).toContain('where instance_id=p_instance_id and customer_id=p_customer_id and rule_id=p_rule_id');
    expect(fn).toContain('o.id=p_order_id and o.instance_id=p_instance_id and o.customer_id=p_customer_id');
  });

  test('discount benefit uses tenant-aware margin authority and exact variant evidence',()=>{
    const sql=read(migration);
    const start=sql.indexOf('create or replace function public.use_discount_loyalty_benefit_v2');
    const end=sql.indexOf('create or replace function public.apply_loyalty_tier_bonus_points_v2');
    const fn=sql.slice(start,end);
    expect(fn).toContain('public.preview_promotion_margin_v2(');
    expect(fn).toContain('p_instance_id,p_variant_id');
    expect(fn).toContain("v_preview->>'variantId' is distinct from p_variant_id::text");
    expect(fn).toContain("coalesce((v_preview->>'safe')::boolean,false) is not true");
  });

  test('bonus and reversal stages cannot cross instance boundaries',()=>{
    const sql=read(migration);
    expect(sql).toMatch(/apply_loyalty_tier_bonus_points_v2[\s\S]*e\.instance_id=p_instance_id[\s\S]*o\.instance_id=p_instance_id/);
    expect(sql).toMatch(/reverse_loyalty_points_for_ineligible_orders_v2[\s\S]*e\.instance_id=p_instance_id[\s\S]*rc\.instance_id=p_instance_id/);
    expect(sql).toContain('on conflict(instance_id,event_key) do nothing');
  });

  test('loyalty retention planning writes only tenant opportunities and uses store-local balances',()=>{
    const sql=read(migration);
    const start=sql.indexOf('create or replace function public.plan_loyalty_retention_opportunities_v2');
    const end=sql.indexOf('create or replace function public.process_loyalty_lifecycle_v2');
    const fn=sql.slice(start,end);
    expect(fn).toContain('o.instance_id=p_instance_id');
    expect(fn).toContain('p.instance_id=p_instance_id');
    expect(fn).toContain('b.instance_id=p_instance_id');
    expect(fn).toContain('instance_id,opportunity_key');
    expect(fn).toContain('on conflict(instance_id,opportunity_key) do update');
  });

  test('lifecycle run key and every stage are tenant explicit',()=>{
    const sql=read(migration);
    const start=sql.indexOf('create or replace function public.process_loyalty_lifecycle_v2');
    const end=sql.indexOf('-- Internal lifecycle stages');
    const fn=sql.slice(start,end);
    expect(fn).toContain('where instance_id=p_instance_id and run_key=trim(p_run_key)');
    expect(fn).toContain('insert into public.loyalty_processing_runs(instance_id,run_key)');
    for(const name of[
      'accrue_loyalty_points_from_paid_orders_v2',
      'refresh_customer_value_profiles_v2',
      'apply_loyalty_tier_bonus_points_v2',
      'reverse_loyalty_points_for_ineligible_orders_v2',
      'plan_customer_lifecycle_milestones_v2',
      'plan_loyalty_retention_opportunities_v2',
    ])expect(fn).toContain(`public.${name}(p_instance_id)`);
    expect(fn).toContain('LOYALTY_LIFECYCLE_EVIDENCE_MISSING');
  });

  test('only complete tenant entrypoints are exposed to service runtime',()=>{
    const sql=read(migration);
    for(const internal of[
      'apply_loyalty_tier_bonus_points_v2',
      'reverse_loyalty_points_for_ineligible_orders_v2',
      'plan_customer_lifecycle_milestones_v2',
      'plan_loyalty_retention_opportunities_v2',
    ])expect(sql).toMatch(new RegExp(
      `revoke all on function public\\.${internal}\\(uuid\\)[\\s\\S]{0,100}service_role`
    ));

    for(const exposed of[
      'refresh_customer_value_profiles_v2',
      'accrue_loyalty_points_from_paid_orders_v2',
      'get_customer_loyalty_snapshot_v2',
      'redeem_loyalty_points_v2',
      'use_loyalty_benefit_v2',
      'use_discount_loyalty_benefit_v2',
      'process_loyalty_lifecycle_v2',
    ])expect(sql).toContain(`grant execute on function public.${exposed}`);
  });

  test('legacy global milestone planner is no longer a service-role escape hatch',()=>{
    const sql=read(migration);
    expect(sql).toMatch(/revoke all on function public\.plan_customer_lifecycle_milestones\(\)[\s\S]{0,120}service_role/);
  });

  test('snapshot is tenant-aware and remains a side-effect-free read',()=>{
    const sql=read(migration);
    const start=sql.indexOf('create or replace function public.get_customer_loyalty_snapshot_v2');
    const end=sql.indexOf('create or replace function public.redeem_loyalty_points_v2');
    const fn=sql.slice(start,end);
    expect(fn).toContain('LOYALTY_INSTANCE_REQUIRED');
    expect(fn).not.toContain('ensure_loyalty_program_defaults_v2');

    const page=read('src/app/fiokom/huseg/page.tsx');
    expect(page).toContain("rpc('get_customer_loyalty_snapshot_v2'");
    expect(page).toContain('p_instance_id:instance.id');
  });

  test('automatic opportunity reopen removes the auto-close marker so later manual dismissal stays final',()=>{
    const sql=read(migration);
    const start=sql.indexOf('create or replace function public.plan_loyalty_retention_opportunities_v2');
    const end=sql.indexOf('create or replace function public.process_loyalty_lifecycle_v2');
    const fn=sql.slice(start,end);
    expect(fn).toContain("(coalesce(public.commercial_opportunities.source,'{}'::jsonb)-'auto_closed_reason')||excluded.source");
    expect(fn).toContain("(coalesce(o.source,'{}'::jsonb)-'auto_closed_reason')||jsonb_build_object");
  });
});
