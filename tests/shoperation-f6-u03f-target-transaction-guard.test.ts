import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
// @ts-expect-error Source-owned .mjs security module intentionally has no TS types.
import {NEUTRAL_ROWS,TRANSACTION_GUARD_SQL,compileReviewGuard,HOSTED_EXECUTION_ENABLED} from '../scripts/shoperation-f6-u03f-target-transaction-guard.mjs';
// @ts-expect-error Previous CI-verified non-executing source-owned .mjs module.
import {compileAtomicReview,NEUTRAL_CATALOGS,HISTORICAL_SCHEMA_MD5} from '../scripts/shoperation-fresh-disposable-reprovision.mjs';
describe('Core F6-U03f transaction-local non-executing guard',()=>{
 it('binds all seven immutable neutral counts and content hashes to the previous historical authority',()=>{
   expect(NEUTRAL_ROWS).toEqual(NEUTRAL_CATALOGS);
   expect(Object.keys(NEUTRAL_ROWS)).toHaveLength(7);
   for(const [name,[count,md5]] of Object.entries(NEUTRAL_ROWS as Record<string,[number,string]>)){
     expect(count).toBeGreaterThan(0);
     expect(md5).toMatch(/^[a-f0-9]{32}$/);
     expect(TRANSACTION_GUARD_SQL).toContain("WHEN '"+name+"'");
     expect(TRANSACTION_GUARD_SQL).toContain("'"+md5+"'");
   }
   expect(HISTORICAL_SCHEMA_MD5).toMatch(/^[a-f0-9]{32}$/);
 });
 it('selects project/role/version and a transaction-wide advisory lock before touching app rows',()=>{
   const s=TRANSACTION_GUARD_SQL;
   expect(s).toContain("current_database()<>'postgres'");
   expect(s).toContain("current_user<>'postgres'");
   expect(s).toContain("server_version_num");
   expect(s).toContain("pg_try_advisory_xact_lock(118603,6)");
   expect(s.indexOf("pg_try_advisory_xact_lock")).toBeLessThan(s.indexOf("LOCK TABLE %I.%I"));
   expect(s.indexOf("LOCK TABLE %I.%I")).toBeLessThan(s.indexOf("SELECT count(*),md5("));
   expect(s).toContain("ACCESS EXCLUSIVE MODE NOWAIT");
 });
 it('checks every public/private owned relation and rejects unknown rows or altered neutral data',()=>{
   const s=TRANSACTION_GUARD_SQL;
   expect(s).toContain("FROM pg_class c");
   expect(s).toContain("nspname IN('public','private')");
   expect(s).toContain("FOR rec IN");
   expect(s).toContain("F6U03F_APPLICATION_USER_DATA_PRESENT");
   expect(s).toContain("F6U03F_NEUTRAL_CATALOG_HASH_DRIFT");
   expect(s).toContain("F6U03F_CATALOG_ROW_TOTAL_DRIFT");
   expect(s).toContain("ORDER BY to_jsonb(x)::text");
   expect(s).toContain('F6U03F_APPLICATION_SCHEMA_HASH_DRIFT');
   expect(s).toContain('catalog_items<>4621');
   expect(s).toContain('e312b40ad91150ce937f4aa00db587f3');
   expect(s).toContain('pg_get_functiondef');
   expect(s).toContain('pg_get_indexdef');
   expect(s).toContain('pg_get_constraintdef');
 });
 it('blocks unknown Auth/Storage changes and managed dependencies, ACLs and event function digests',()=>{
   const s=TRANSACTION_GUARD_SQL;
   for(const clause of ['auth.mfa_factors','auth.users','storage.s3_multipart_uploads',
    'storage.buckets','F6U03F_CROSS_SCHEMA_DEPENDENCY_DRIFT','F6U03F_AUTH_TRIGGER_DRIFT',
    'F6U03F_SCHEMA_ACL_DRIFT:public','F6U03F_SCHEMA_ACL_DRIFT:private',
    'F6U03F_MANAGED_EVENT_DRIFT:pgrst_drop_watch','F6U03F_MANAGED_EVENT_DRIFT:pgrst_ddl_watch']){
      expect(s).toContain(clause);
   }
   expect(s).not.toContain('@@');
 });
 it('keeps the 59-file source-pinned candidate BEGIN/guard/fatal abort/DROP sequencing',()=>{
   const r=compileAtomicReview(process.cwd());
   const sql=r.sql;
   const guard=sql.indexOf('DO $f6_guard$');
   const stop=sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
   const drop=sql.indexOf('DROP SCHEMA private CASCADE;');
   const first=sql.indexOf('BEGIN;');
   expect(guard).toBeGreaterThan(first);
   expect(stop).toBeGreaterThan(guard);
   expect(drop).toBeGreaterThan(stop);
   expect(sql.trimEnd().endsWith('COMMIT;')).toBe(true);
   expect(r.mustAbortBeforeDestructiveSql).toBe(true);
   expect(r.executionEnabled).toBe(false);
   expect(r.transactionGuard.scope).toBe('SOURCE_ONLY_TRANSACTION_GUARD');
   expect(r.transactionGuard.projectTLSIdentityProven).toBe(false);
   expect(r.migrationCount).toBe(59);
 });
 it('does not overclaim hosted TLS identity, full schema hash, real SQL execution or signed-in RLS',()=>{
   const r=compileReviewGuard();
   expect(HOSTED_EXECUTION_ENABLED).toBe(false);
   expect(r.hostedDatabaseTouched).toBe(false);
   expect(r.hostedExecutionEnabled).toBe(false);
   expect(r.projectTLSIdentityProven).toBe(false);
   expect(r.fullObjectFingerprintProven).toBe(false);
   expect(r.fullObjectFingerprintGuardIncluded).toBe(true);
   expect(r.liveTransactionalGuardProven).toBe(false);
   expect(r.hosted59MigrationsProven).toBe(false);
   expect(r.sqlSha256).toMatch(/^[a-f0-9]{64}$/);
 });
 it('never runs a database operation from CLI',()=>{
   const cli=spawnSync(process.execPath,['scripts/shoperation-f6-u03f-target-transaction-guard.mjs','--execute'],{encoding:'utf8'});
   expect(cli.status).not.toBe(0);
   expect(cli.stderr).toContain('F6U03F_HOSTED_EXECUTION_DISABLED');
   const old=spawnSync(process.execPath,['scripts/shoperation-fresh-disposable-reprovision.mjs','--execute'],{encoding:'utf8'});
   expect(old.status).not.toBe(0);
   expect(old.stderr).toContain('FRESH_REPROVISION_HOSTED_EXECUTION_DISABLED');
 });
});
