import {describe,it,expect} from 'vitest';
// @ts-expect-error Native PostgreSQL17 original-source helper is imported directly.
import {SCOPE,compile,seedOld,assess} from '../scripts/shoperation-f6-u03r-occupied-upgrade.mjs';
const native=(stage:string,over:Record<string,unknown>={})=>'F6U03R_NATIVE='+JSON.stringify({
 stage,role:'postgres',db:'f6_u03i_fresh',pgMajor:17,stores:1,owners:1,threads:1,messages:1,tasks:1,
 participantTable:stage==='after',modernHelper:stage==='after',modernPolicy:stage==='after',
 authSelect:stage==='after',...over
});
const manifest={sources:78,old:47,forward:31,hostedTouched:false,releaseAuthorized:false};
describe('F6-U03r occupied historic Office SQL upgrade',()=>{
 it('keeps all 78 original Git sources, splits exactly 47 old + 31 forward and omits incompatible occupied preflight',()=>{
  const x=compile();
  expect(x.manifest.sources).toBe(78);
  expect(x.manifest.old).toBe(47);
  expect(x.manifest.forward).toBe(31);
  expect(x.legacy).not.toContain('0047_team_permissions_foundation_v1.sql');
  expect(x.upgrade).toContain('0047_team_permissions_foundation_v1.sql');
  expect(x.upgrade).toContain('0058_digital_office_plan_scoped_sql_guard_v2.sql');
  expect(x.upgrade).not.toContain('ORIGINAL TARGET PREFLIGHT');
  expect(x.upgrade).not.toContain('ORIGINAL TARGET POSTFLIGHT');
  expect(x.rollback).toContain('F6U03R_INJECTED_ROLLBACK');
  expect(x.bootstrap).toContain('F6U03G_WRONG_POSTGRES');
  expect(x.manifest.hostedTouched).toBe(false);
 });
 it('requires nonempty synthetic legacy customer, message, task and owner before source upgrade',()=>{
  const s=seedOld();
  for(const word of ['F6R_KEEP_CUSTOMER','F6R_KEEP_MESSAGE','F6R_KEEP_TASK','role_bindings',"subscription_plan"])
   expect(s).toContain(word);
  expect(s).not.toContain('INSERT INTO public.office_thread_participants');
 });
 it('verifies real separate legacy, rolled-back and upgraded catalog state with positive rows',()=>{
  const x=assess({before:native('before'),afterRollback:native('after_rollback'),after:native('after'),manifest});
  expect(x.historicalTenantCustomerMessageTaskPreserved).toBe(true);
  expect(x.rollbackVerified).toBe(true);
  expect(x.providerJwtProven).toBe(false);
  expect(x.managedApiProven).toBe(false);
  expect(SCOPE).toContain('NOT_HOSTED');
 });
 it('fails closed on no-data false green and missing positive observations',()=>{
  expect(()=>assess({before:native('before',{threads:0}),afterRollback:native('after_rollback'),after:native('after'),manifest})).toThrow('F6U03R_LEGACY_DATA_NOT_PRESERVED');
  expect(()=>assess({before:native('before'),afterRollback:native('after_rollback',{tasks:0}),after:native('after'),manifest})).toThrow('F6U03R_LEGACY_DATA_NOT_PRESERVED');
  expect(()=>assess({before:'',afterRollback:native('after_rollback'),after:native('after'),manifest})).toThrow('F6U03R_NATIVE_OBSERVATION_MISSING');
 });
 it('rejects a failed rollback leaving participants or a modern state missing hardening',()=>{
  expect(()=>assess({before:native('before'),afterRollback:native('after_rollback',{participantTable:true}),after:native('after'),manifest})).toThrow('F6U03R_ROLLBACK_SCHEMA_DRIFT');
  expect(()=>assess({before:native('before'),afterRollback:native('after_rollback'),after:native('after',{modernPolicy:false}),manifest})).toThrow('F6U03R_MODERN_POLICY_NOT_INSTALLED');
  expect(()=>assess({before:native('before'),afterRollback:native('after_rollback'),after:native('after'),manifest:{...manifest,sources:77}})).toThrow('F6U03R_MANIFEST_REQUIRED');
 });
});
