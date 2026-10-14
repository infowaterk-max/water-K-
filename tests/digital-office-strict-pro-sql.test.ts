import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
const migration=read('supabase/migrations/20261010093000_digital_office_strict_pro_sql_guard_v1.sql');
const legacyPrivacy=read('supabase/migrations/20260908022500_digital_office_privacy_foundation_v1.sql');
const exposedHelper=read('supabase/migrations/20260908024000_digital_office_rls_helper_exposure_closure_v1.sql');
const canonicalPolicy=read('src/lib/entitlements/policy.ts');

describe('Core #1186 U10A1 Digital Office tenant Pro SQL boundary',()=>{
  it('fails closed before any DDL if real privacy/participant prerequisites are absent',()=>{
    expect(migration).toContain('OFFICE_STRICT_PRO_PRIVACY_PREREQUISITE_MISSING');
    expect(migration).toContain('OFFICE_STRICT_PRO_PARTICIPANT_RLS_PREREQUISITE_MISSING');
    expect(migration).toContain("p.cmd='SELECT'");
    expect(migration).toContain("p.qual like '%current_user_can_read_office_thread_v1%'");
    expect(exposedHelper).toContain('private.current_user_can_read_office_thread_v1');
    expect(legacyPrivacy).toContain('private.office_active_participant_v1');
  });

  it('does not accept stale Pro entitlement for Alap, missing store or unknown feature source',()=>{
    const resolver=migration.slice(migration.indexOf('create or replace function private.office_effective_feature_enabled_v1('),migration.indexOf('revoke all on function private.office_effective_feature_enabled_v1('));
    const planGuard=resolver.indexOf("v_plan is distinct from 'pro'");
    const entitlementQuery=resolver.indexOf('from public.feature_entitlements e');
    expect(resolver).toContain('from public.webshop_instances w');
    expect(resolver).toContain('if v_org is null then return false');
    expect(planGuard).toBeGreaterThan(0);
    expect(planGuard).toBeLessThan(entitlementQuery);
    expect(resolver).toContain("'officeCommunicationAdvanced','teamChat','teamChatSecureAttachments'");
    expect(resolver).toContain("e.source in ('platform','manual','trial','addon','plan')");
    expect(resolver).toContain("e.valid_from<=now()");
    expect(resolver).toContain("e.valid_until>now()");
    for(const priority of ['500','400','300','200','100'])expect(resolver).toContain(priority);
    for(const source of ['platform','manual','trial','addon','plan'])expect(canonicalPolicy).toContain(source+':');
  });

  it('removes platform-operator blanket bypass from privileged Office RPC authority',()=>{
    const start=migration.indexOf('create or replace function private.office_advanced_actor_v1(');
    const end=migration.indexOf('revoke all on function private.office_advanced_actor_v1');
    const sql=migration.slice(start,end);
    expect(sql).toContain('p_actor is not null');
    expect(sql).toContain("private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunicationAdvanced')");
    expect(sql).not.toContain('platform_operators');
    expect(sql).not.toMatch(/\bor\b\s+private\.office_effective_feature_enabled_v1/);
  });

  it('preserves Team Chat participant/capability authority, separate from customer Office',()=>{
    const start=migration.indexOf('create or replace function public.can_read_office_thread_v1(');
    const end=migration.indexOf('revoke all on function public.can_read_office_thread_v1');
    const sql=migration.slice(start,end);
    expect(sql).toContain("w.subscription_plan='pro'");
    expect(sql).toContain("v_thread.conversation_type='customer'");
    expect(sql).toContain("private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunicationAdvanced')");
    expect(sql).toContain("v_thread.conversation_type not in ('internal_private','internal_group')");
    expect(sql).toContain("private.office_effective_feature_enabled_v1(p_instance_id,'teamChat')");
    expect(sql).toContain('private.office_active_participant_v1');
    expect(sql).toContain("'office.internal_chat'");
    expect(sql.indexOf('private.office_active_participant_v1')).toBeLessThan(sql.indexOf('public.evaluate_store_capability_v1'));
  });

  it('adds restrictive Pro SELECT policy for all Office shared tables without broadening table grants',()=>{
    const sql=migration.toLowerCase();
    for(const table of ['office_threads','office_messages','office_tasks']){
      expect(migration).toContain('create policy '+table+'_strict_pro_v1 on public.'+table);
    }
    expect((sql.match(/as restrictive for select to authenticated/g)??[]).length).toBe(3);
    expect((sql.match(/using \(private\.office_pro_plan_allowed_v1\(instance_id\)\)/g)??[]).length).toBe(3);
    expect(migration).toContain('grant execute on function private.office_pro_plan_allowed_v1(uuid) to authenticated');
    expect(sql).not.toMatch(/\bgrant\s+(select|all)\s+on\s+(?:table\s+)?public\.office_/);
    expect(sql).not.toMatch(/\bcreate policy\s+\w+\s+on public\.office_\w+\s+for all/);
  });

  it('does not claim empty-target baseline or production acceptance',()=>{
    expect(migration).toContain('Customer-baseline parity is a separate blocked');
    expect(migration).toContain('DO NOT cherry-pick onto staging');
  });
});
