import {describe,it,expect} from 'vitest';
// @ts-expect-error Source-only ESM module has no TypeScript declaration.
import {buildReadOnlyPrerequisiteSql,assessPrerequisites,buildReadOnlyFixtureSql,assessFixtureObservation,fixtureBinding,CONTRACT} from '../scripts/shoperation-f6-u03v-fixture-lineage.mjs';
const fixture:any={
 alap:{userId:'aaaaaaaa-0000-4000-8000-000000000003',storeId:'aaaaaaaa-0000-4000-8000-000000000002',
  customerThreadId:'aaaaaaaa-0000-4000-8000-000000000010',internalThreadId:'aaaaaaaa-0000-4000-8000-000000000011'},
 pro:{userId:'bbbbbbbb-0000-4000-8000-000000000003',storeId:'bbbbbbbb-0000-4000-8000-000000000002',
  customerThreadId:'bbbbbbbb-0000-4000-8000-000000000010',internalThreadId:'bbbbbbbb-0000-4000-8000-000000000011'},
 revoked:{userId:'bbbbbbbb-0000-4000-8000-000000000012'}
};
const projectRef='istjjkdcvsvilrycqecd', source='connected-supabase-readonly';
const now=Date.now();
const prereq=()=>({projectRef,source,now,observation:{
 contract:'shoporation.f6-u03v.fixture-prerequisites.v1',capturedAt:new Date(now).toISOString(),
 database:'postgres',role:'postgres',pgVersion:170006,participantsPresent:false,authUsers:0,
 migrationRows:0,officeTableRls:true,participantsTableRls:null
}});
const counts=['authUsers','alapStore','proStore','alapCustomerThread','alapInternalThread','proCustomerThread',
 'proInternalThread','alapActiveOwner','proActiveOwner','revokedFormerRole',
 'revokedActiveRoles','alapCustomerParticipant','proCustomerParticipant',
 'proInternalParticipant','alapCustomerEntitlement','proAdvancedEntitlement'];
const valid=():any=>({projectRef,source,now,fixture:structuredClone(fixture),observation:{
 contract:CONTRACT,capturedAt:new Date(now).toISOString(),database:'postgres',
 role:'postgres',pgVersion:170006,fixtureSha256:fixtureBinding(fixture),
 ...Object.fromEntries(counts.map(c=>[c,c==='authUsers'?3:c==='revokedActiveRoles'?0:1]))
}});
describe('F6-U03v independent 0048 fixture existence and revoked role SQL source',()=>{
 it('prerequisite audit only emits one SELECT including missing 0048 metadata and Auth count',()=>{
  const sql=buildReadOnlyPrerequisiteSql();
  expect(sql).toContain("to_regclass('public.office_thread_participants')");
  expect(sql).toContain("count(*) FROM auth.users");
  expect((sql.match(/;/g)||[]).length).toBe(1);
  expect(sql).not.toMatch(/\b(?:INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE)\b/i);
 });
 it('real empty Fresh Install shape must be explicitly blocked; no 0048 query may be run',()=>{
  const x=assessPrerequisites(prereq());
  expect(x.canExecuteFixtureSql).toBe(false);
  expect(x.blockers).toContain('MODERN_OFFICE_PARTICIPANTS_MISSING');
  expect(x.blockers).toContain('THREE_REAL_AUTH_USERS_MISSING');
  expect(x.blockers).toContain('MANAGED_MIGRATION_LEDGER_EMPTY');
  expect(x.releaseAuthorized).toBe(false);
 });
 it('fixture SQL uses only SELECT, binds source UUIDs, all 16 states and active revocation windows',()=>{
  const sql=buildReadOnlyFixtureSql(fixture);
  expect(sql).toContain("id='"+fixture.alap.customerThreadId+"'::uuid");
  expect(sql).toContain("thread_id='"+fixture.pro.internalThreadId+"'::uuid");
  expect(sql).toContain("user_id='"+fixture.revoked.userId+"'::uuid AND instance_id='"+fixture.pro.storeId+"'::uuid AND revoked_at IS NOT NULL");
  expect(sql).toContain("feature_code='officeCommunicationAdvanced'");
  expect(sql).toContain('left_at IS NULL');
  expect((sql.match(/;/g)||[]).length).toBe(1);
  expect(sql).not.toMatch(/\b(?:INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE|GRANT|REVOKE)\b/i);
 });
 it('16 correct fixture counts still cannot assert signed provider JWT, RLS or release',()=>{
  const x=assessFixtureObservation(valid());
  expect(x.decision).toBe('FIXTURE_ROW_STATE_MATCHES_BOUND_SNAPSHOT_NOT_PROVIDER_PROOF');
  expect(x.checkedCountFields).toBe(16);
  expect(x.fixtureRowsObservedClean).toBe(true);
  expect(x.signedProviderJwtProven).toBe(false);
  expect(x.postgrestRlsProven).toBe(false);
  expect(x.independentProviderFixtureProven).toBe(false);
  expect(x.releaseAuthorized).toBe(false);
 });
 it('rejects forged fixture, wrong project, stale role state and unauthorized actor/cross-tenant fault injection',()=>{
  const modified=valid();modified.fixture.pro.storeId=modified.fixture.alap.storeId;
  expect(()=>assessFixtureObservation(modified)).toThrow('F6U03U_FIXTURE_IDENTITIES_NOT_ISOLATED');
  const wrong=valid();wrong.projectRef='ewdederyvnwmghlydbno';
  expect(()=>assessFixtureObservation(wrong)).toThrow('F6U03V_WRONG_PROJECT_OR_UNATTESTED_OBSERVATION');
  const drift=valid();drift.observation.fixtureSha256='f'.repeat(64);
  expect(()=>assessFixtureObservation(drift)).toThrow('F6U03V_FIXTURE_SHA_MISMATCH');
  const stale=valid();stale.now+=900001;
  expect(()=>assessFixtureObservation(stale)).toThrow('F6U03V_STALE_OBSERVATION');
  const faults=valid();faults.observation.revokedActiveRoles=1;
  faults.observation.proInternalParticipant=0;faults.observation.alapInternalThread=0;
  faults.observation.proAdvancedEntitlement=0;
  const result=assessFixtureObservation(faults);
  expect(result.faults).toContain('FIXTURE_STATE_MISMATCH_REVOKEDACTIVEROLES');
  expect(result.faults).toContain('FIXTURE_STATE_MISMATCH_PROINTERNALPARTICIPANT');
  expect(result.faults).toContain('FIXTURE_STATE_MISMATCH_ALAPINTERNALTHREAD');
  expect(result.faults).toContain('FIXTURE_STATE_MISMATCH_PROADVANCEDENTITLEMENT');
  expect(result.releaseAuthorized).toBe(false);
 });
});
