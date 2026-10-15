import{describe,expect,it}from'vitest';
import{readFileSync,readdirSync}from'node:fs';
import{createHash}from'node:crypto';

const root='supabase/customer-baseline/migrations/';
const sourcePath='supabase/migrations/20261015090000_digital_office_plan_scoped_sql_guard_v2.sql';
const baselinePath=root+'0058_digital_office_plan_scoped_sql_guard_v2.sql';
const historical='supabase/migrations/20261010093000_digital_office_strict_pro_sql_guard_v1.sql';
const sql=readFileSync(sourcePath,'utf8');
const baseline=readFileSync(baselinePath,'utf8');
const old=readFileSync(historical,'utf8');

describe('Core #1186 F6-U01: Alap customer rights and Pro-only internal Office SQL, source-only',()=>{
 it('copies canonical F6-v2 source byte-identically with independent SHA256 and appends 0058',()=>{
  const sha=createHash('sha256').update(sql,'utf8').digest('hex');
  const header='-- Shoperation-Office-Source: '+sourcePath.split('/').at(-1)+' sha256='+sha+'\n';
  expect(baseline.startsWith(header)).toBe(true);
  expect(baseline.slice(header.length)).toBe(sql);
  const migrations=readdirSync(root).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort();
  expect(migrations).toHaveLength(59);
  expect(migrations[54]).toBe('0054_digital_office_team_chat_owner_transfer_v1.sql');
  expect(migrations[57]).toBe('0057_communication_hub_2_0_advanced_guards_and_object_links_v1.sql');
  expect(migrations[58]).toBe('0058_digital_office_plan_scoped_sql_guard_v2.sql');
 });
 it('proves the old historical strict-Pro source denied Alap customer support and remains unchanged/unimported',()=>{
  expect(old).toMatch(/where w\.id=p_instance_id and w\.organization_id is not null\s+and w\.subscription_plan='pro'/);
  expect(old).toContain("private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunicationAdvanced')");
  expect(old).toContain('using (private.office_pro_plan_allowed_v1(instance_id))');
  expect(sql).not.toContain('using (private.office_pro_plan_allowed_v1(instance_id))');
  expect(sql).toContain('drop policy if exists office_threads_strict_pro_v1');
  expect(sql).toContain('drop policy if exists office_messages_strict_pro_v1');
  expect(sql).toContain('drop policy if exists office_tasks_strict_pro_v1');
  expect(baseline).not.toContain('Shoperation-Office-Source: 20261010093000_digital_office_strict_pro_sql_guard_v1.sql');
 });
 it('makes basic customer conversation readable to signed-in support members on entitled Alap and Pro plans',()=>{
  const start=sql.indexOf("if v_thread.conversation_type='customer' then");
  const end=sql.indexOf("if v_thread.conversation_type not in ('internal_private','internal_group')",start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const customer=sql.slice(start,end);
  expect(customer).toContain("private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunication')");
  expect(customer).toContain('public.can_manage_support(p_instance_id,p_user_id)');
  expect(customer).not.toContain('officeCommunicationAdvanced');
  expect(customer).not.toContain("subscription_plan='pro'");
 });
 it('fail-closes actual subscription Pro only for private/team chat and advanced features, never accepting a high-priority override',()=>{
  const endCustomer=sql.indexOf("if v_thread.conversation_type not in ('internal_private','internal_group')");
  const privateBlock=sql.slice(endCustomer,sql.indexOf('v_capability:=',endCustomer));
  expect(privateBlock).toContain("w.subscription_plan='pro'");
  expect(privateBlock).toContain("private.office_effective_feature_enabled_v1(p_instance_id,'teamChat')");
  expect(privateBlock).toContain('private.office_active_participant_v1(p_instance_id,p_thread_id,p_user_id)');
  expect(sql).toContain("p_feature_code in ('officeCommunicationAdvanced','teamChat','teamChatSecureAttachments')");
  expect(sql).toContain("and v_plan is distinct from 'pro'");
  expect(sql).toContain("when 'platform' then 500 when 'manual' then 400");
  expect(sql).toContain("p_instance_id,p_user_id,'office.internal_chat'");
 });
 it('retains service_role-only read helper and authentic current user security definer boundaries',()=>{
  expect(sql).toContain('revoke all on function public.can_read_office_thread_v1(uuid,uuid,uuid)');
  expect(sql).toContain('from public,anon,authenticated;');
  expect(sql).toContain('grant execute on function public.can_read_office_thread_v1(uuid,uuid,uuid) to service_role');
  expect(sql).toContain('revoke all on function private.office_pro_plan_allowed_v1(uuid)');
  expect(sql).not.toContain('grant execute on function private.office_pro_plan_allowed_v1(uuid) to authenticated');
  for(const fn of ['office_thread_plan_allowed_v2','office_task_plan_allowed_v2']){
   expect(sql).toContain('create or replace function private.'+fn+'(');
   expect(sql).toContain('revoke all on function private.'+fn+'(uuid,uuid)');
   expect(sql).toContain('grant execute on function private.'+fn+'(uuid,uuid) to authenticated');
  }
  expect(sql).toContain('public.can_read_office_thread_v1(p_instance_id,p_thread_id,auth.uid())');
 });
 it('protects all three shared Office tables with RESTRICTIVE current-user aware plan-scoped predicates',()=>{
  const pairs=[
   ['office_threads','private.office_thread_plan_allowed_v2(instance_id,id)'],
   ['office_messages','private.office_thread_plan_allowed_v2(instance_id,thread_id)'],
   ['office_tasks','private.office_task_plan_allowed_v2(instance_id,thread_id)']
  ];
  for(const [table,predicate] of pairs){
   expect(sql).toContain('create policy '+table+'_plan_scoped_v2 on public.'+table);
   expect(sql).toContain('as restrictive for select to authenticated\n  using ('+predicate+')');
   expect(sql).toContain('drop policy if exists '+table+'_strict_pro_v1');
  }
  expect(sql).toContain("private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunication')");
  expect(sql).toContain('and public.can_manage_support(p_instance_id,auth.uid())');
  expect(sql).not.toMatch(/grant\s+(?:all|select|insert|update|delete)\s+on\s+table\s+public\.office_/i);
 });
 it('does not overclaim Office provenance or live database readiness until separate U02',()=>{
  const manifest=JSON.parse(readFileSync('supabase/customer-baseline/manifest.json','utf8'));
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('F6-U01');
  expect(manifest.notes).toContain('U02');
 });
});
