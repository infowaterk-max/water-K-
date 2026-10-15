import {describe,it,expect} from 'vitest';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
// @ts-expect-error Plain .mjs security runtime intentionally has no separate declarations.
import{HOSTED_EXECUTION_ENABLED,HISTORICAL_SCHEMA_MD5,NEUTRAL_CATALOGS,validateOccupiedTargetSnapshot,compileAtomicReview,reviewTargetAndReprovision}from'../scripts/shoperation-fresh-disposable-reprovision.mjs';
const ref='istjjkdcvsvilrycqecd';
const url='postgresql://postgres:secret@db.'+ref+'.supabase.co:5432/postgres';
const buckets=[
{id:'digital-products-private',public:false,file_size_limit:2147483648},
{id:'order-documents-private',public:false,file_size_limit:26214400},
{id:'product-documents-private',public:false,file_size_limit:26214400},
{id:'product-media',public:true,file_size_limit:8388608},
];
const valid=()=>({
  publicTables:175,privateTables:2,publicFunctions:344,privateFunctions:36,publicPolicies:126,
  authUsers:0,authIdentities:0,authSessions:0,authMfaFactors:0,
  storageObjects:0,storageUploads:0,migrations:0,
  externalForeignKeys:0,unexpectedExternalTriggers:0,appExtensions:0,
  neutralRowTotal:113,catalogMd5:HISTORICAL_SCHEMA_MD5,
  neutralCatalogs:Object.fromEntries(Object.entries(NEUTRAL_CATALOGS as Record<string,[number,string]>).map(([k,[count,md5]])=>[k,{count,md5}])),
  buckets,authTrigger:'auth.users/on_auth_user_created/private.handle_new_user',
});
describe('Core #1186 F6-U03b guarded, offline-only review',()=>{
  it('accepts the precisely known 0046-era occupied disposable schema snapshot as REVIEW only',()=>{
    const report=validateOccupiedTargetSnapshot(valid());
    expect(report.decision).toBe('REVIEW_ONLY');
    expect(report.hostedDatabaseTouched).toBe(false);
    expect(report.appTables).toBe(177);
  });
  it.each(['publicTables','privateTables','publicFunctions','privateFunctions','publicPolicies','neutralRowTotal','authUsers','authIdentities','authSessions','authMfaFactors','storageObjects','storageUploads','migrations','externalForeignKeys','unexpectedExternalTriggers','appExtensions'] as const)(
    'blocks any changed live guard value %s',key=>{
      const snapshot=valid();snapshot[key]=snapshot[key]+1;
      expect(()=>validateOccupiedTargetSnapshot(snapshot)).toThrow('FRESH_REPROVISION_SNAPSHOT_DRIFT:'+key);
    });
  it('blocks a changed app catalog fingerprint even with unchanged counts',()=>{
    expect(()=>validateOccupiedTargetSnapshot({...valid(),catalogMd5:'0'.repeat(32)})).toThrow('FRESH_REPROVISION_SCHEMA_FINGERPRINT_DRIFT');
  });
  it('blocks a changed neutral catalog hash, unknown table or changed catalog count',()=>{
    const s=valid();
    s.neutralCatalogs.entitlement_capabilities.md5='0'.repeat(32);
    expect(()=>validateOccupiedTargetSnapshot(s)).toThrow('FRESH_REPROVISION_NEUTRAL_CATALOG_DRIFT');
    const t=valid();t.neutralCatalogs.unexpected_table={count:0,md5:'x'};
    expect(()=>validateOccupiedTargetSnapshot(t)).toThrow('FRESH_REPROVISION_CATALOG_SET_DRIFT');
  });
  it('rejects added or modified managed Storage bucket configuration',()=>{
    const s=valid();s.buckets=[...buckets,{id:'unknown',public:false,file_size_limit:0}];
    expect(()=>validateOccupiedTargetSnapshot(s)).toThrow('FRESH_REPROVISION_STORAGE_BUCKET_DRIFT');
    const t=valid();t.buckets=buckets.map(b=>({...b}));
    t.buckets[0].file_size_limit=123;
    expect(()=>validateOccupiedTargetSnapshot(t)).toThrow('FRESH_REPROVISION_STORAGE_BUCKET_DRIFT');
  });
  it('blocks an unexpected Auth trigger and requires the known bootstrap dependency',()=>{
    expect(()=>validateOccupiedTargetSnapshot({...valid(),authTrigger:'unexpected'})).toThrow('FRESH_REPROVISION_AUTH_TRIGGER_DRIFT');
  });
  it('compiles the actual pinned 59-file customer baseline into a review-only atomic SQL candidate',()=>{
    const a=compileAtomicReview(process.cwd());
    expect(a.decision).toBe('REVIEW_ONLY');
    expect(a.migrationCount).toBe(59);
    expect(a.reviewedSource).toBe('6a29778b6ea971f42fe25eb26181b192a97ab23d');
    expect(a.hostedDatabaseTouched).toBe(false);
    expect(a.sqlSha256).toMatch(/^[a-f0-9]{64}$/);
    const sql=a.sql;
    expect(sql.trimStart().startsWith('BEGIN;')).toBe(true);
    expect(sql.trimEnd().endsWith('COMMIT;')).toBe(true);
    expect(sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED')).toBeGreaterThan(0);
    expect(sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED')).toBeLessThan(sql.indexOf('DROP SCHEMA private CASCADE;'));
    expect(sql.indexOf('target-preflight-ok')).toBeGreaterThan(sql.indexOf('CREATE SCHEMA private AUTHORIZATION postgres;'));
    expect(sql.indexOf('target-postflight')).toBeGreaterThan(sql.indexOf('target-preflight-ok'));
    expect(a.mustAbortBeforeDestructiveSql).toBe(true);
  });
  it('does not provide hosted execution even with otherwise valid snapshot and TLS input',()=>{
    const dir=mkdtempSync(join(tmpdir(),'f6-u03b-ca-')),ca=join(dir,'ca.pem');
    try{
      writeFileSync(ca,'-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n');
      const report=reviewTargetAndReprovision({dbUrl:url,snapshot:valid(),env:{PATH:'/usr/bin',SHOPERATION_FRESH_TLS_CA_CERT:ca}});
      expect(report.decision).toBe('REVIEW_ONLY');
      expect(report.executionEnabled).toBe(false);
      expect(report.projectRef).toBe(ref);
      expect(report.hostedDatabaseTouched).toBe(false);
      expect(report.limitations).toContain('ROLLBACK_UNPROVEN');
    }finally{rmSync(dir,{recursive:true,force:true});}
  });
  it('rejects platform and staging URLs before replay review',()=>{
    for(const wrong of ['ewdederyvnwmghlydbno','rfuvzgumbardvbvqjxdq'])
      expect(()=>reviewTargetAndReprovision({dbUrl:url.replace(ref,wrong),snapshot:valid(),env:{}})).toThrow();
  });
  it('rejects inherited libpq destination selectors before hosted SQL could be considered',()=>{
    expect(()=>reviewTargetAndReprovision({dbUrl:url,snapshot:valid(),env:{PGHOSTADDR:'198.51.100.2'}})).toThrow();
  });
  it('refuses CLI --execute, preserving no-SQL/no-connection authority',()=>{
    expect(HOSTED_EXECUTION_ENABLED).toBe(false);
    const p=spawnSync(process.execPath,['scripts/shoperation-fresh-disposable-reprovision.mjs','--execute'],{encoding:'utf8'});
    expect(p.status).not.toBe(0);
    expect(p.stderr).toContain('FRESH_REPROVISION_HOSTED_EXECUTION_DISABLED');
  });
});
