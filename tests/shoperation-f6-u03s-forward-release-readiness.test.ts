import {describe,it,expect,beforeAll} from 'vitest';
// @ts-expect-error Source-only Node ESM QA helper is imported intentionally.
import {PROJECT_REF,SCOPE,SOURCE_78_SHA256,buildBoundOriginalForwardSource,buildReadOnlyManagedSQL,
assessManagedReadiness} from '../scripts/shoperation-f6-u03s-forward-release-readiness.mjs';
let original:any;
const backup={projectRef:PROJECT_REF,localPg17Restore:true,restoredCatalogRows:113,
hostedMutation:false,releaseAuthorized:false,ciphertextSha256:'a'.repeat(64)};
const observed=()=>({capturedAt:'2026-10-16T18:24:34.775Z',database:'postgres',role:'postgres',pgVersion:170006,
 publicTables:175,privateTables:2,authUsers:0,authMfa:0,authIdentities:0,authSessions:0,storageObjects:0,
 migrationLedger:0,organizations:0,tenants:0,threads:0,messages:0,tasks:0,neutralRows:113,
 authUserTrigger:1,modernParticipants:null,modernOfficeHelper:null,
 buckets:['digital-products-private','order-documents-private','product-documents-private','product-media']
   .map(id=>({id,public:id==='product-media'})),
 events:['issue_graphql_placeholder','issue_pg_cron_access','issue_pg_graphql_access',
  'issue_pg_net_access','pgrst_ddl_watch','pgrst_drop_watch'].map(name=>({name,enabled:'O'})),
 legacyPolicies:['office_messages','office_tasks','office_threads']});
const input=()=>({projectRef:PROJECT_REF,source:'connected-supabase-readonly',observed:observed(),backup,original});
describe('F6-U03s immutable original forward SQL versus managed Fresh Install read-only release authority',()=>{
 beforeAll(()=>{original=buildBoundOriginalForwardSource()});
 it('proves original 78 ordered Git blobs and 31 forward SQL sources, not copied fixture SQL',()=>{
  expect(original.scope).toBe(SCOPE);expect(original.sourceSetSha256).toBe(SOURCE_78_SHA256);
  expect(original.originalCount).toBe(78);expect(original.forwardCount).toBe(31);
  expect(new Set(original.paths.map((p:any)=>p.path)).size).toBe(31);
  expect(original.paths[0].path).toContain('0047_team_permissions_foundation');
  expect(original.paths.at(-1).path).toContain('0058_digital_office_plan_scoped_sql_guard');
  expect(original.originalForwardSqlSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(original.hostedSqlGenerated).toBe(false);
 });
 it('only builds managed SELECT catalog metadata; never hosted writes or private customer row exports',()=>{
  const sql=buildReadOnlyManagedSQL();
  expect(sql).toContain('SELECT jsonb_build_object(');
  expect(sql).toContain('office_thread_participants');
  expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|GRANT|REVOKE)\s+(?:TABLE|INTO|FROM|SCHEMA|POLICY|FUNCTION|ON)\b/i);
 });
 it('matches legacy hosted application counts but NEVER infers migration release readiness',()=>{
  const report=assessManagedReadiness(input());
  expect(report.legacySchemaConsistent).toBe(true);expect(report.forwardCount).toBe(31);
  expect(report.releaseAuthorized).toBe(false);expect(report.hostedMigrationExecuted).toBe(false);
  expect(report.blockers).toContain('OWNER_OFF_PLATFORM_KEY_RETENTION_UNCONFIRMED');
  expect(report.blockers).toContain('MANAGED_MIGRATION_LEDGER_PROVENANCE_UNATTESTED');
  expect(report.blockers).toContain('SIGNED_SUPABASE_AUTH_JWT_UNPROVEN');
  expect(report.decision).toBe('BLOCKED_RELEASE_PREREQUISITES');
 });
 it('drift of hosted schema/managed provider objects cannot become ready even if key custody true',()=>{
  const x=input();x.ownerKeyCustodyConfirmed=true;x.observed.publicTables=174;
  x.observed.events=[];
  const z=assessManagedReadiness(x);
  expect(z.blockers).toContain('HOSTED_0046_DRIFT:publicTables');
  expect(z.blockers).toContain('MANAGED_PROVIDER_EVENTS_DRIFT');
  expect(z.releaseAuthorized).toBe(false);
 });
 it('fails closed on foreign target, claimed source, falsified backup, source mutation and stale token',()=>{
  const x=input();x.projectRef='ewdederyvnwmghlydbno';
  expect(()=>assessManagedReadiness(x)).toThrow('F6U03S_WRONG_PROJECT_OR_UNTRUSTED_SOURCE');
  const y=input();y.source='local-pg17';
  expect(()=>assessManagedReadiness(y)).toThrow('F6U03S_WRONG_PROJECT_OR_UNTRUSTED_SOURCE');
  const a=input();a.backup={...backup,ciphertextSha256:'invalid'};
  expect(()=>assessManagedReadiness(a)).toThrow('F6U03S_BACKUP_EVIDENCE_UNTRUSTED');
  const b=input();b.original={...original,sourceSetSha256:'b'.repeat(64)};
  expect(()=>assessManagedReadiness(b)).toThrow('F6U03S_SOURCE_PROVENANCE_INVALID');
  const c=input();c.observed.capturedAt='not-a-date';
  expect(()=>assessManagedReadiness(c)).toThrow('F6U03S_INVALID_MANAGED_OBSERVATION');
 });
});