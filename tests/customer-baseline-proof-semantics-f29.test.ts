import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
// @ts-ignore JavaScript runtime module intentionally has no declaration file.
import {evaluateSentinelIntegrity} from '../scripts/lib/shoperation-sentinel-integrity.mjs';

const read=(path:string)=>readFileSync(path,'utf8');
const registry=JSON.parse(read('quality/knowledge/guard-registry.v1.json'));
const baseline=registry.guards.find((guard:{id:string})=>guard.id==='GUARD-CUSTOMER-BASELINE');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const requirement=(capability:string,strength:number,dimensions:string[])=>({
  id:'REQ-F29-SOURCE-ONLY',
  requirement:'Customer baseline source guard may only attest source-level manifest and migration invariants.',
  requiredCapabilities:[capability],
  claimScope:{capability,strength,dimensions},
  evidence:{implementation:['GUARD-CUSTOMER-BASELINE'],outcome:['GUARD-CUSTOMER-BASELINE']},
  forbiddenRegressions:[{id:'NEG-F29-PROOF-SCOPE',statement:'Source-level proof never grants native auth.',evidence:['GUARD-CUSTOMER-BASELINE']}],
});
const inspect=(r:ReturnType<typeof requirement>)=>evaluateSentinelIntegrity({
  sourceCommit:'f29-fake-test-head',guardRegistry:registry,plan:{contract:'shoporation.development-plan.v1',completionContract:{requirements:[r]}},evidenceRecords:[],
});

describe('F29 Customer Baseline: truthful producer, scope and native-proof exclusion',()=>{
  it('points to an actual validator and exactly the CI diagnostic artifact producer',()=>{
    expect(baseline?.producer).toBe('scripts/validate-customer-baseline.mjs');
    expect(existsSync(baseline.producer)).toBe(true);
    expect(baseline?.evidence).toBe('artifacts/shoperation-command-diagnostics/customer-baseline.json');
    const pkg=JSON.parse(read('package.json'));
    expect(pkg.scripts['db:customer:guard']).toBe('node scripts/validate-customer-baseline.mjs');
    const workflow=read('.github/workflows/ci.yml');
    expect(workflow).toContain('name: Customer database baseline guard');
    expect(workflow).toContain('SHOPERATION_DIAGNOSTIC_OUTPUT: artifacts/shoperation-command-diagnostics/customer-baseline.json');
    expect(workflow).toContain('node scripts/shoperation-command-diagnostic.mjs -- npm run db:customer:guard');
  });
  it('declares only CAP-QUALITY strength 1 source-level evidence, not native Auth/JWT/RLS or wildcard',()=>{
    const p=baseline.proofSemantics;
    expect(p).toEqual({
      capabilities:['CAP-QUALITY'],scopeStrength:1,
      scope:'source-only-customer-baseline-manifest-and-migration-structure',
      dimensions:['status','scope','limitations','baseline-manifest','migration-source','fresh-install-required-state'],
    });
    expect(p.capabilities).not.toContain('CAP-AUTH');
    expect(p.capabilities).not.toContain('*');
    expect(p.scope).not.toMatch(/native|deployed|runtime|rls/i);
    expect(p.dimensions).not.toContain('authorization');
  });
  it('preserves the current 69-file unverified snapshot and no new proof contract',()=>{
    const files=readdirSync(manifest.baselineMigrationDirectory).filter((f:string)=>f.endsWith('.sql')).sort();
    expect(files).toHaveLength(69);
    expect(files[0]).toBe(manifest.snapshotFile.split('/').at(-1));
    expect(manifest.status).toBe('snapshot-reviewed');
    expect(manifest.freshInstallProofRequired).toBe(true);
    expect(manifest.proofContractSha256).toBeNull();
    expect(manifest.legacyMigrationReplay).toBe(false);
    expect(manifest.notes).toContain('0046_alap_team_chat_plan_grant_reconcile.sql');
    expect(manifest.notes).toContain('native actor/tenant/Pro proofs still required');
  });
  it('accepts the matching narrow source-only CAP-QUALITY evidence claim',()=>{
    const report=inspect(requirement('CAP-QUALITY',1,['status','scope','limitations']));
    expect(report.decision).toBe('PASS');
    expect(report.findings).toEqual([]);
  });
  it('blocks a native CAP-AUTH claim backed only by this source validator',()=>{
    const report=inspect(requirement('CAP-AUTH',1,['status']));
    expect(report.decision).toBe('BLOCK');
    expect(report.findings.some((f:{code:string})=>f.code==='SENTINEL_INTEGRITY_PROOF_CAPABILITY_DRIFT')).toBe(true);
  });
  it('blocks higher scope strength even if capability name matches',()=>{
    const report=inspect(requirement('CAP-QUALITY',2,['status']));
    expect(report.decision).toBe('BLOCK');
    expect(report.findings.some((f:{code:string})=>f.code==='SENTINEL_INTEGRITY_PROOF_SCOPE_OVERCLAIM')).toBe(true);
  });
  it('blocks native RLS proof dimension even at source-level strength',()=>{
    const report=inspect(requirement('CAP-QUALITY',1,['native-rls']));
    expect(report.decision).toBe('BLOCK');
    expect(report.findings.some((f:{code:string})=>f.code==='SENTINEL_INTEGRITY_PROOF_DIMENSION_DRIFT')).toBe(true);
  });
  it('does not make the source validator look like a native SQL executor',()=>{
    const src=read('scripts/validate-customer-baseline.mjs');
    expect(src).toContain('proofContractSha256');
    expect(src).toContain('migrationDir');
    expect(src).toContain('freshInstallProofRequired');
    expect(src).not.toContain('execute_sql');
    expect(src).not.toContain('supabase db reset');
    expect(src).not.toContain('psql ');
  });
});
