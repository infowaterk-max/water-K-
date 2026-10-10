import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');
const sql=read('tests/fixtures/customer-baseline-team-chat-owner-transfer-runtime.sql');
const runner=read('scripts/shoperation-customer-baseline-postgres-rehearsal.mjs');
describe('Core #1186 U10A2 F25: real isolated PostgreSQL Team Chat owner transfer',()=>{
 it('uses two explicitly disposable tenant identities and real role-bound chat participants',()=>{
  expect(sql).toContain('INSERT INTO auth.users(id,email)');
  expect(sql).toContain('INSERT INTO public.organizations');
  expect(sql).toContain('INSERT INTO public.webshop_instances');
  expect(sql).toContain('INSERT INTO public.role_bindings');
  expect(sql).toContain('INSERT INTO public.office_threads');
  expect(sql).toContain('INSERT INTO public.office_thread_participants');
  expect(sql).toContain("'internal_group'");
  expect(sql).toContain("participant_role='owner'");
 });
 it('requires active read membership on both valid actors, and denies cross-tenant outsider',()=>{
  expect(sql).toContain('public.can_read_office_thread_v1(shop_a,t,owner_a)');
  expect(sql).toContain('public.can_read_office_thread_v1(shop_a,t,member_b)');
  expect(sql).toContain('public.can_read_office_thread_v1(shop_a,t,foreign_c)');
  expect(sql).toContain('F25_TEST_ROLE_AND_PARTICIPANT_PREREQUISITE_FAILED');
 });
 it('expects exact owner, self, cross-tenant target and wrong-instance error messages, not generic failure',()=>{
  for(const error of ['OFFICE_THREAD_OWNER_REQUIRED','OFFICE_OWNER_TRANSFER_SELF_FORBIDDEN','OFFICE_OWNER_TRANSFER_TARGET_MEMBER_REQUIRED','OFFICE_INTERNAL_THREAD_NOT_FOUND']){
   expect(sql).toContain("err <> '"+error+"'");
  }
  expect(sql).toContain('F25_TEST_CROSS_TENANT_TRANSFER_ACCEPTED');
  expect(sql).toContain('F25_TEST_WRONG_INSTANCE_ACCEPTED');
 });
 it('proves actual valid transfer, single active owner, prior owner demotion, audit and reverse transfer',()=>{
  expect(sql).toContain('result:=public.admin_transfer_office_thread_owner_v1(shop_a,owner_a,t,member_b)');
  expect(sql).toContain('result:=public.admin_transfer_office_thread_owner_v1(shop_a,member_b,t,owner_a)');
  expect(sql).toContain('F25_TEST_POSITIVE_NOT_SINGLE_OWNER');
  expect(sql).toContain('F25_TEST_PREVIOUS_OWNER_NOT_DEMOTED');
  expect(sql).toContain('F25_TEST_REVERSE_NOT_SINGLE_OWNER');
  expect(sql).toContain("action='office.private_owner_transferred'");
  expect(sql).toContain('F25_TEST_REVERSE_AUDIT_COUNT');
 });
 it('remains purely local, rollback-only, fail closed and does not claim native Supabase identity parity',()=>{
  expect(sql.trimStart()).toContain('No real Supabase Auth claim parity');
  expect(sql).toContain('BEGIN;');
  expect(sql.trimEnd()).toMatch(/ROLLBACK;$/);
  expect(runner).toContain("file('tests/fixtures/customer-baseline-team-chat-owner-transfer-runtime.sql','TEAM_CHAT_OWNER_TRANSFER_POSITIVE_NEGATIVE_DML')");
  expect(runner).toContain('TEAM_CHAT_OWNER_FIXTURE_ROLLBACK');
  expect(runner).toContain("listen_addresses = ''");
  expect(runner).toContain('NOT_PROVEN: native Supabase Auth/Storage');
 });
});
