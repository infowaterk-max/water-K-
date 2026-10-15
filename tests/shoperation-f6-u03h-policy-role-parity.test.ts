import {describe,it,expect} from 'vitest';
// @ts-expect-error Guarded local-only JS diagnostics have no TS type declarations.
import {HOSTED_EXECUTION_ENABLED,HOSTED_REFERENCE,compilePolicyQueries,parsePolicyDigest,parseRoles,classifyRoleOidParity} from '../scripts/shoperation-f6-u03h-policy-role-parity.mjs';
// @ts-expect-error Original 47-file historical source selector is a JS module.
import {selectHistorical0046} from '../scripts/shoperation-f6-u03g-positive-fixture.mjs';
// @ts-expect-error Canonical unchanged guard is a JS module.
import {TRANSACTION_GUARD_SQL} from '../scripts/shoperation-f6-u03f-target-transaction-guard.mjs';
// @ts-expect-error Review-only SQL compiler is JS.
import {compileAtomicReview} from '../scripts/shoperation-fresh-disposable-reprovision.mjs';
const baseline=()=>{const h=selectHistorical0046();return{sourceCount:47,scope:'LOCAL_HISTORICAL_0046_ONLY',sourceSetSha256:h.sourceSetSha256,files:h.files};};
const good={rawDigest:'126|fb55c5ca1e64d6607b15e148c0c9e64e',namedDigest:'126|e5dc03a08c272c6b993b45306c5f664d',roleRows:'anon|16510|2\nauthenticated|16511|124\n',manifest:baseline(),realPg17:true,all47Committed:true};
describe('Core #1186 F6-U03h historically observed role/OID policy diagnosis',()=>{
 it('derives only read-only policy SQL from the unchanged full strict guard',()=>{
  const q=compilePolicyQueries();
  expect(q.rawPolicy).toContain('p.polroles::text');
  expect(q.namedPolicy).not.toContain('p.polroles::text');
  expect(q.namedPolicy).toContain('!UNKNOWN_ROLE:');
  expect(q.namedPolicy).toContain('pg_get_expr(p.polqual,p.polrelid)');
  expect(q.namedPolicy).toContain("WHERE k LIKE 'policy:%'");
  expect(q.sourceGuardSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(q.rawPolicy).not.toMatch(/DROP\s+SCHEMA/i);
  expect(q.namedPolicy).not.toMatch(/DROP\s+SCHEMA/i);
  expect(TRANSACTION_GUARD_SQL).toContain('F6U03F_DB_ROLE_VERSION_DRIFT');
 });
 it('pins read-only hosted 126 role policies and independent normalized fingerprint',()=>{
  expect(HOSTED_REFERENCE.policyCount).toBe(126);
  expect(HOSTED_REFERENCE.roles).toEqual([{name:'anon',oid:'16484',policies:2},{name:'authenticated',oid:'16485',policies:124}]);
  expect(HOSTED_REFERENCE.namedMd5).toBe('e5dc03a08c272c6b993b45306c5f664d');
 });
 it('classifies an unchanged role-name MD5 with different OIDs as OID-only catalog drift, NOT hosted acceptance',()=>{
  const r=classifyRoleOidParity(good);
  expect(r.verdict).toBe('RAW_OID_SERIALIZATION_ONLY');
  expect(r.normalizedMatches).toBe(true);
  expect(r.rawMatches).toBe(false);
  expect(r.hostedSupabaseTouched).toBe(false);
  expect(r.hosted59MigrationsApplied).toBe(0);
  expect(r.fullStrictGuardAccepted).toBe(false);
  expect(r.authenticatedAlapProRlsProven).toBe(false);
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
 });
 it('returns honest blocker when expression-level digest differs even with OID drift',()=>{
  const r=classifyRoleOidParity({...good,namedDigest:'126|00000000000000000000000000000000'});
  expect(r.normalizedMatches).toBe(false);
  expect(r.verdict).toBe('POLICY_DIFFERENCE_NOT_FULLY_EXPLAINED');
 });
 it('never accepts missing role, altered role membership, duplicate role or weak digest',()=>{
  expect(()=>parseRoles('anon|16510|2\n')).toThrow('F6U03H_ROLE_SET_DRIFT');
  expect(()=>parseRoles('anon|16510|2\nanon|16511|124')).toThrow('F6U03H_DUPLICATE_ROLE');
  expect(()=>parseRoles('!UNKNOWN_ROLE|16510|2\nauthenticated|16511|124')).toThrow('F6U03H_ROLE_MALFORMED');
  expect(()=>parseRoles('anon|16510|3\nauthenticated|16511|123')).toThrow('F6U03H_POLICY_ROLE_MEMBERSHIP_DRIFT');
  expect(()=>parseRoles('anon|16510|2\nauthenticated|16510|124')).toThrow('F6U03H_ROLE_OIDS_COLLIDE');
  expect(()=>parsePolicyDigest('125|e5dc03a08c272c6b993b45306c5f664d')).toThrow('F6U03H_POLICY_COUNT_OR_MD5_INVALID');
  expect(()=>parsePolicyDigest('126|NOT_A_HASH')).toThrow('F6U03H_POLICY_COUNT_OR_MD5_INVALID');
 });
 it('requires genuine executed 47-file historical source identity rather than synthetic claims',()=>{
  expect(()=>classifyRoleOidParity({...good,all47Committed:false})).toThrow('F6U03H_REAL_47_FILE_REPLAY_REQUIRED');
  expect(()=>classifyRoleOidParity({...good,realPg17:false})).toThrow('F6U03H_REAL_47_FILE_REPLAY_REQUIRED');
  expect(()=>classifyRoleOidParity({...good,manifest:{...baseline(),sourceSetSha256:'forged'}})).toThrow('F6U03H_HISTORICAL_SOURCE_SET_DRIFT');
 });
 it('retains original unconditional hosted F6 review abort before any schema DROP',()=>{
  const r=compileAtomicReview(),abort=r.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
  expect(r.executionEnabled).toBe(false);
  expect(abort).toBeGreaterThanOrEqual(0);
  expect(r.sql.indexOf('DROP SCHEMA private CASCADE;')).toBeGreaterThan(abort);
 });
});
