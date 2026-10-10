import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');
const script=read('scripts/shoperation-customer-baseline-postgres-rehearsal.mjs');
const fixture=read('tests/fixtures/customer-baseline-team-chat-negative.sql');
describe('Core #1186 F23 real local PostgreSQL Team Chat security contract',()=>{
 it('validates actual RLS and denies browser access to both new Team Chat tables',()=>{
  expect(script).toContain("'office_message_mentions','office_message_object_links'");
  expect(script).toContain("deny('anon',table)");
  expect(script).toContain("deny('authenticated',table)");
  expect(script).toContain("SELECT relrowsecurity FROM pg_class");
  expect(script).toContain("TEAM_CHAT_SERVICE_ROLE_READ_");
 });
 it('checks live installed BEFORE INSERT/UPDATE integrity triggers and active unique owner index',()=>{
  expect(script).toContain("'office_message_mentions_integrity','office_message_object_links_integrity'");
  expect(script).toContain("(tgtype & 2)=2");
  expect(script).toContain("(tgtype & 4)=4");
  expect(script).toContain("(tgtype & 16)=16");
  expect(script).toContain("tgenabled='O'");
  expect(script).toContain("office_thread_participants_active_owner_uidx");
  expect(script).toContain('indpred IS NOT NULL');
 });
 it('asserts real owner transfer RPC execute denied to browser and allowed service role',()=>{
  expect(script).toContain("NOT has_function_privilege('anon','public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid)','EXECUTE')");
  expect(script).toContain("NOT has_function_privilege('authenticated','public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid)','EXECUTE')");
  expect(script).toContain("has_function_privilege('service_role','public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid)','EXECUTE')");
 });
 it('runs isolated rollback-only negative mention/object DML after schema install',()=>{
  expect(fixture).toContain('BEGIN;');
  expect(fixture).toContain('ROLLBACK;');
  expect(fixture).toContain('INSERT INTO public.office_message_mentions(');
  expect(fixture).toContain('INSERT INTO public.office_message_object_links(');
  expect(fixture).toContain("err <> 'OFFICE_MENTION_MESSAGE_INTEGRITY_INVALID'");
  expect(fixture).toContain("err <> 'OFFICE_OBJECT_MESSAGE_INTEGRITY_INVALID'");
  expect(fixture).toContain('TEST_FAILED_MENTION_WITHOUT_MESSAGE_ACCEPTED');
  expect(fixture).toContain('TEST_FAILED_OBJECT_LINK_WITHOUT_MESSAGE_ACCEPTED');
  expect(script).toContain("file('tests/fixtures/customer-baseline-team-chat-negative.sql','TEAM_CHAT_ROLLBACK_NEGATIVE_DML')");
 });
 it('keeps native Supabase/Pro proof explicitly open and never enables remote DB',()=>{
  expect(script).toContain("listen_addresses = ''");
  expect(script).toContain("PGHOST:socket");
  expect(script).toContain('NOT_PROVEN: native Supabase Auth/Storage');
  expect(script).not.toContain('process.env.PGHOST');
  expect(script).toContain("finally{");
 });
});
