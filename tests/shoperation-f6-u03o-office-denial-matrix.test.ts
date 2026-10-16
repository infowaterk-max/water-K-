import {describe,it,expect} from 'vitest';
// @ts-expect-error F6-U03o local PG17 original-source role-denial ESM JavaScript.
import {CASES,SCOPE,buildNativeDenialSQL,validateNativeDenials} from '../scripts/shoperation-f6-u03o-office-denial-matrix.mjs';
function evidence(){
 const role='F6U03O_ANON_ROLE='+JSON.stringify({role:'anon',uid:null,bypass:false});
 const anon=['office_threads','office_messages','office_tasks'].map(table=>
  'psql:role-proof.sql:22: NOTICE:  F6U03O_ANON_TABLE='+JSON.stringify({table,result:'permission_denied',visible:null}));
 const helpers=CASES.map((c:any)=>
  'F6U03O_HELPER='+JSON.stringify({case:c.case,role:'authenticated',uid:c.actor,bypass:false,
    currentRead:c.currentRead??true,threadPlan:c.threadPlan,taskPlan:c.taskPlan}));
 return [role,...anon,...helpers].join('\n');
}
describe('F6-U03o anonymous and foreign tenant native helper negative-role evidence',()=>{
 it('uses an actual anonymous unfiltered Office SELECT and proper authenticated session scopes',()=>{
  const sql=buildNativeDenialSQL();
  expect(sql).toContain('SET LOCAL ROLE anon;');
  expect(sql).toContain('SET LOCAL ROLE authenticated;');
  expect(sql).toContain('WHEN insufficient_privilege');
  for(const t of ['office_threads','office_messages','office_tasks'])
   expect(sql).toContain('SELECT count(*) INTO c FROM public.'+t);
  for(const helper of ['private.current_user_can_read_office_thread_v1','private.office_thread_plan_allowed_v2','private.office_task_plan_allowed_v2'])
   expect(sql).toContain(helper+'(');
  expect(sql).toContain('ROLLBACK;');
  expect(sql).not.toMatch(/\b(?:grant\s+execute|revoke\s+all|drop\s+schema|alter\s+policy)\b/i);
 });
 it('records real anon permission rejection plus 3 legitimate helper positives and 5 unauthorized denials',()=>{
  const e=validateNativeDenials(evidence());
  expect(e.originalSqlSourceCount).toBe(78);
  expect(e.anonRelationCases).toBe(3);
  expect(e.positiveTenantHelperCases).toBe(3);
  expect(e.crossTenantAndUnauthorizedDenialCases).toBe(5);
  expect(e.genuineSignedSupabaseJwtProven).toBe(false);
  expect(e.releaseAuthorized).toBe(false);
  expect(e.hostedTouched).toBe(false);
  expect(e.scope).toBe(SCOPE);
 });
 it('accepts 0 visible rows as an RLS denial only with valid native anon role',()=>{
  const e=evidence().replace('"result":"permission_denied","visible":null',
                              '"result":"zero_rows","visible":0');
  expect(validateNativeDenials(e).anonZeroRows).toBe(1);
  expect(()=>validateNativeDenials(e.replace('"role":"anon"','"role":"postgres"')))
   .toThrow('F6U03O_ANONYMOUS_ROLE_NOT_AUTHENTIC');
 });
 it('fails closed on any anonymous row exposure, privilege-mask mismatch or missing probe',()=>{
  expect(()=>validateNativeDenials(evidence().replace('"result":"permission_denied","visible":null',
    '"result":"visible_rows","visible":1')))
    .toThrow('F6U03O_ANONYMOUS_OFFICE_ROW_EXPOSURE');
  expect(()=>validateNativeDenials(evidence().replace('"bypass":false','"bypass":true')))
    .toThrow('F6U03O_ANONYMOUS_ROLE_NOT_AUTHENTIC');
  const fewer=evidence().split('\n').filter(x=>!x.includes('"table":"office_tasks"')).join('\n');
  expect(()=>validateNativeDenials(fewer)).toThrow('F6U03O_ANONYMOUS_OFFICE_ROW_EXPOSURE');
 });
 it('fails closed on foreign helper TRUE, Alap private TRUE and missing own-customer positive',()=>{
  const e=evidence();
  let foreign=e.replace('"case":"A_foreign_B","role":"authenticated","uid":"aaaaaaaa-0000-4000-8000-000000000003","bypass":false,"currentRead":false',
   '"case":"A_foreign_B","role":"authenticated","uid":"aaaaaaaa-0000-4000-8000-000000000003","bypass":false,"currentRead":true');
  expect(()=>validateNativeDenials(foreign)).toThrow('F6U03O_CROSS_TENANT_OR_ALAP_HELPER_DENIAL_FAILED');
  let internal=e.replace('"case":"A_internal","role":"authenticated","uid":"aaaaaaaa-0000-4000-8000-000000000003","bypass":false,"currentRead":true,"threadPlan":false',
   '"case":"A_internal","role":"authenticated","uid":"aaaaaaaa-0000-4000-8000-000000000003","bypass":false,"currentRead":true,"threadPlan":true');
  expect(()=>validateNativeDenials(internal)).toThrow('F6U03O_CROSS_TENANT_OR_ALAP_HELPER_DENIAL_FAILED');
  let falsePositive=e.replace('"case":"A_customer","role":"authenticated","uid":"aaaaaaaa-0000-4000-8000-000000000003","bypass":false,"currentRead":true',
   '"case":"A_customer","role":"authenticated","uid":"aaaaaaaa-0000-4000-8000-000000000003","bypass":false,"currentRead":false');
  expect(()=>validateNativeDenials(falsePositive)).toThrow('F6U03O_CROSS_TENANT_OR_ALAP_HELPER_DENIAL_FAILED');
  expect(()=>validateNativeDenials(e.split('\n').filter(s=>!s.includes('"case":"B_private"')).join('\n')))
   .toThrow('F6U03O_HELPER_POSITIVE_OR_NEGATIVE_MISSING');
 });
});
