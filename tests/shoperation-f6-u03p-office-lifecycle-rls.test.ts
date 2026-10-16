import {describe,it,expect} from 'vitest';
// @ts-expect-error Intentional direct ESM import from source-authentic PG17 proof script.
import {SCOPE,SCENARIOS,buildLifecycleSQL,validateLifecycleEvidence} from '../scripts/shoperation-f6-u03p-office-lifecycle-rls.mjs';
function fakeEvidence(){
 return SCENARIOS.flatMap((s:any)=>s.probes.map((p:any)=>'F6U03P_CASE='+JSON.stringify({
  scenario:s.name,label:p.label,role:'authenticated',uid:p.uid,bypass:false,
  threads:p.expected,messages:p.expected,tasks:p.expected}))).join('\n');
}
describe('F6-U03p original-source PG17 lifecycle and membership RLS oracle',()=>{
 it('uses a real browser role and rollback-scoped mutations without historical migration edits',()=>{
  const sql=buildLifecycleSQL();
  expect(sql).toContain('SET LOCAL ROLE authenticated');
  expect(sql).toContain('ROLLBACK;');
  expect(sql).toContain('F6U03P_WRONG_OR_HOSTED_TARGET');
  for(const table of ['office_threads','office_messages','office_tasks'])
   expect(sql).toContain('FROM public.'+table);
  for(const token of ['revoked_at=now()',"valid_until=now()-interval '1 day'",'left_at=now()', "subscription_plan='alap'"])
   expect(sql).toContain(token);
  expect(sql).not.toMatch(/\b(?:alter\s+policy|drop\s+schema|grant\s+execute|truncate\s+table)\b/i);
 });
 it('requires all seven scenarios with native authentic positives and negatives in all three source Office relations',()=>{
  const p=validateLifecycleEvidence(fakeEvidence());
  expect(p.scenarioCount).toBe(7);
  expect(p.authenticatedNativeRoleProbeCases).toBe(14);
  expect(p.originalSqlSourceCount).toBe(78);
  expect(p.positiveAndNegativeControlsRequired).toBe(true);
  expect(p.genuineSignedSupabaseJwtProven).toBe(false);
  expect(p.managedDataApiProven).toBe(false);
  expect(p.releaseAuthorized).toBe(false);
  expect(p.scope).toBe(SCOPE);
 });
 it('fails closed on a same-store nonparticipant private-message leak',()=>{
  let data=fakeEvidence().split('\n');
  const i=data.findIndex(x=>x.includes('"label":"support_customer_only"'));
  const row=JSON.parse(data[i].slice('F6U03P_CASE='.length));
  row.messages.push('bbbbbbbb-0000-4000-8000-000000000011');
  data[i]='F6U03P_CASE='+JSON.stringify(row);
  expect(()=>validateLifecycleEvidence(data.join('\n'))).toThrow('F6U03P_OFFICE_ROW_RLS_LEAK_OR_MISSING_POSITIVE');
 });
 it('rejects an all-deny false positive and missing control',()=>{
  const lines=fakeEvidence().split('\n');
  const row=JSON.parse(lines[0].slice('F6U03P_CASE='.length));row.threads=[];
  lines[0]='F6U03P_CASE='+JSON.stringify(row);
  expect(()=>validateLifecycleEvidence(lines.join('\n'))).toThrow('F6U03P_OFFICE_ROW_RLS_LEAK_OR_MISSING_POSITIVE');
  expect(()=>validateLifecycleEvidence(lines.slice(1).join('\n'))).toThrow('F6U03P_MISSING_POSITIVE_OR_NEGATIVE_CONTROL');
 });
 it('rejects PostgreSQL superuser/bypass forged evidence and task-only data leakage',()=>{
  const lines=fakeEvidence().split('\n');
  const row=JSON.parse(lines[0].slice('F6U03P_CASE='.length));
  row.role='postgres';lines[0]='F6U03P_CASE='+JSON.stringify(row);
  expect(()=>validateLifecycleEvidence(lines.join('\n'))).toThrow('F6U03P_NOT_AUTHENTICATED_NATIVE_ROLE');
  row.role='authenticated';row.bypass=true;lines[0]='F6U03P_CASE='+JSON.stringify(row);
  expect(()=>validateLifecycleEvidence(lines.join('\n'))).toThrow('F6U03P_NOT_AUTHENTICATED_NATIVE_ROLE');
  row.bypass=false;row.tasks=[];lines[0]='F6U03P_CASE='+JSON.stringify(row);
  expect(()=>validateLifecycleEvidence(lines.join('\n'))).toThrow('F6U03P_OFFICE_ROW_RLS_LEAK_OR_MISSING_POSITIVE');
 });
});
