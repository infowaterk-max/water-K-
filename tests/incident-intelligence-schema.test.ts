import{describe,expect,it}from'vitest';import{readFileSync}from'node:fs';import{join}from'node:path';
const sql=readFileSync(join(process.cwd(),'supabase/migrations/20260924103000_incident_intelligence_foundation_v1.sql'),'utf8').toLowerCase();
describe('Incident Intelligence database foundation v1',()=>{
  it('layers engineering incidents on the existing Support ticket authority',()=>{
    expect(sql).toContain('support_ticket_id uuid references public.support_tickets');
    expect(sql).toContain("p_source='customer' and p_support_ticket_id is null");
    expect(sql).toContain("'support_ticket'");
    expect(sql).not.toContain('create table if not exists public.customer_bug_tickets');
    expect(sql).toContain('create_customer_incident_report_v1');
    expect(sql).toContain('v_ticket:=public.create_support_ticket_v2');
    expect(sql).toContain('v_incident:=public.create_platform_incident_v1');
  });
  it('preserves who, when, tenant, route, component and correlation context without raw IP storage',()=>{
    for(const field of['instance_id','reporter_user_id','reporter_role','correlation_id','route_path','surface_key','component_key','app_version','environment','created_at'])expect(sql).toContain(field);
    expect(sql).not.toContain(' ip_address text');
    expect(sql).toContain("'ip_address'");
    expect(sql).toContain('incident_redact_json_v1');
  });
  it('makes audit history append-only and blocks deletion of incident evidence',()=>{
    expect(sql).toContain('incident_history_immutable');
    expect(sql).toContain('before update or delete on public.platform_incident_events');
    expect(sql).toContain('before update or delete on public.platform_incident_links');
    expect(sql).toContain('incident_delete_forbidden');
    expect(sql).toContain('after insert or update on public.platform_incidents');
    expect(sql).toContain('after insert or update on public.platform_repair_requests');
    expect(sql).toContain('after insert or update on public.platform_self_healing_runs');
  });
  it('uses valid PL/pgSQL dollar quoting for every new incident RPC',()=>{
    for(const fn of['triage_platform_incident_v2','create_customer_incident_report_v1']){
      const start=sql.indexOf(`create or replace function public.${fn}`);
      expect(start,fn).toBeGreaterThanOrEqual(0);
      const tail=sql.slice(start,start+6500);
      expect(tail,fn).toContain('as $');
      expect(tail,fn).toContain('$;');
      expect(tail,fn).not.toContain('as $\\ndeclare');
    }
  });
  it('keeps incident mutation behind service-role RPC authority',()=>{
    for(const fn of['create_platform_incident_v1','create_customer_incident_report_v1','triage_platform_incident_v1','create_incident_repair_request_v1','create_self_healing_run_v1']){
      expect(sql).toContain(`grant execute on function public.${fn}`);
    }
    expect(sql).toContain('revoke all on public.platform_incidents,public.platform_incident_events');
    expect(sql).toContain('grant select on public.platform_incidents,public.platform_incident_events');
  });
  it('allows direct self-healing only for explicitly allowed low-risk runbooks',()=>{
    expect(sql).toContain("check(mode<>'auto' or (risk='low' and auto_allowed))");
    expect(sql).toContain("check(not(repair_kind='code_pr' and auto_apply))");
  });
  it('requires merchant reports to prove authoritative active RBAC or legacy membership',()=>{
    expect(sql).toContain("p_source='merchant'");
    expect(sql).toContain('from public.role_bindings r');
    expect(sql).toContain('r.revoked_at is null');
    expect(sql).toContain('r.valid_from<=now()');
    expect(sql).toContain('public.webshop_instance_members');
    expect(sql).toContain('incident_merchant_membership_required');
  });
  it('attributes deterministic/AI triage to the real system actor instead of a fake platform user',()=>{
    expect(sql).toContain('triage_platform_incident_v2');
    expect(sql).toContain("p_actor_kind not in('system','platform','ai')");
    expect(sql).toContain("set_config('app.incident_actor_kind',p_actor_kind,true)");
    expect(sql).toContain("'actorkind',p_actor_kind");
    expect(sql).toContain('grant execute on function public.triage_platform_incident_v2');
  });
});
