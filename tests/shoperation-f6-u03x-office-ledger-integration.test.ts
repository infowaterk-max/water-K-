import {beforeAll,describe,it,expect} from 'vitest';
// @ts-expect-error Source-only JS integration file has no TS declarations.
import {integratedOfficeBundle,assessIntegratedRelease,assessBaselineEnvelope,ledgerBeforeSql,ledgerAfterSql} from '../scripts/shoperation-f6-u03x-office-ledger-integration.mjs';
// @ts-expect-error Existing source-exact Office package is ESM.
import {sourceBoundOfficeBundle} from '../scripts/shoperation-f6-u03w-office-release-bundle.mjs';
// @ts-expect-error Original customer SQL manifest is ESM.
import {SOURCE_78_SHA256} from '../scripts/shoperation-f6-u03s-forward-release-readiness.mjs';
const baseline:any={
 contract:'shoporation.f6-u03x.reviewed-0046-baseline-identity.v1',
 projectRef:'istjjkdcvsvilrycqecd',version:'20261017180000',
 name:'shoperation_managed_0046_current_state',snapshotSha256:'a'.repeat(64)
};
let original:any,integrated:any;
beforeAll(()=>{original=sourceBoundOfficeBundle();integrated=integratedOfficeBundle({baseline,original})},120000);
describe('F6-U03x sibling merger: immutable single adopted 0046 baseline ledger and exact Office forward',()=>{
 it('integrates 31 immutable Git-pinned Office sources with exact bound 0046 baseline',()=>{
  expect(integrated.manifest.exactForwardSources).toBe(31);
  expect(integrated.manifest.originalOfficeSourceSetSha256).toBe(SOURCE_78_SHA256);
  expect(integrated.manifest.originalOfficeBundleSha256).toBe(original.manifest.executableBundleSha256);
  expect(integrated.manifest.originalSourceSha256).toEqual(original.manifest.sources.map((x:any)=>x.sha256));
  expect(integrated.sql.startsWith('BEGIN;\n')).toBe(true);
  expect(integrated.sql.endsWith('COMMIT;\n')).toBe(true);
  expect((integrated.sql.match(/^-- F6-U03w ORIGINAL #/gm)||[])).toHaveLength(31);
  expect(integrated.sql).toContain("F6U03F_APPLICATION_SCHEMA_HASH_DRIFT");
  expect(integrated.sql).toContain("F6U03F_APPLICATION_USER_DATA_PRESENT");
  expect(integrated.sql).toContain("F6U03W_PLAN_SCOPED_POLICY_SET_MISSING");
  expect(integrated.sql).toContain("(state->>'migrationHistory')::int<>1");
  expect(integrated.sql).toContain("F6U03X_BASELINE_LEDGER_FINGERPRINT_CHANGED");
  expect(integrated.sql).not.toContain("(state->>'migrationHistory')::int<>0");
 });
 it('enforces count=1, exact version/name, row lock and exact JSON fingerprint before and after',()=>{
  const b=ledgerBeforeSql(baseline),a=ledgerAfterSql(baseline);
  expect(b).toContain('LOCK TABLE supabase_migrations.schema_migrations IN SHARE MODE NOWAIT');
  expect(b).toContain("F6U03X_BASELINE_HISTORY_COUNT_INVALID");
  expect(b).toContain("version='20261017180000' AND m.name='shoperation_managed_0046_current_state'");
  expect(b).toContain("set_config('shoperation.f6u03x_baseline_fingerprint'");
  expect(a).toContain("F6U03X_LEDGER_ROW_COUNT_CHANGED");
  expect(a).toContain("F6U03X_BASELINE_LEDGER_FINGERPRINT_CHANGED");
  expect(a).toContain("current_setting('shoperation.f6u03x_baseline_fingerprint',true)");
  expect(integrated.sql.indexOf('f6u03x_ledger_before')).toBeLessThan(integrated.sql.indexOf('0047_team_permissions_foundation'));
  expect(integrated.sql.lastIndexOf('f6u03x_ledger_after')).toBeGreaterThan(integrated.sql.lastIndexOf('0058_digital_office_plan_scoped'));
 });
 it('rejects wrong project, malformed version, absent hash or arbitrary baseline name',()=>{
  for(const changes of [
   {projectRef:'ewdederyvnwmghlydbno'},{version:'20261017'},{version:"20261017180000';DROP SCHEMA public;--"},
   {name:'alap_auto_pro'},{snapshotSha256:'X'.repeat(64)}, {snapshotSha256:''}
  ]){
   expect(()=>assessBaselineEnvelope({...baseline,...changes})).toThrow('F6U03X_EXPLICIT_0046_BASELINE_IDENTITY_REQUIRED');
  }
  expect(()=>assessBaselineEnvelope(null)).toThrow('F6U03X_EXPLICIT_0046_BASELINE_IDENTITY_REQUIRED');
 });
 it('keeps source-only candidate and real managed release strictly denied',()=>{
  const a=assessIntegratedRelease(integrated);
  expect(a.releaseAuthorized).toBe(false);
  expect(a.baselineRemoteHistoryProven).toBe(false);
  expect(integrated.manifest.baselineIsCallerSuppliedIdentityOnly).toBe(true);
  expect(integrated.manifest.baselineRealRemoteRowVerified).toBe(false);
  expect(integrated.manifest.hostedTouched).toBe(false);
  expect(()=>assessIntegratedRelease({...integrated,manifest:{...integrated.manifest,releaseAuthorized:true}}))
   .toThrow('F6U03X_INTEGRATED_CANDIDATE_OR_RELEASE_OVERCLAIM');
 });
 it('fails closed on untrusted source manifest or injected source SQL after source verification',()=>{
  expect(()=>integratedOfficeBundle({baseline,original:{...original,bundle:original.bundle+'-- mutated'}}))
   .toThrow('F6U03W_EXECUTABLE_BUNDLE_MANIFEST_INVALID');
  const fake={...original,manifest:{...original.manifest,releaseAuthorized:true}};
  expect(()=>integratedOfficeBundle({baseline,original:fake}))
   .toThrow('F6U03W_EXECUTABLE_BUNDLE_MANIFEST_INVALID');
 });
});
