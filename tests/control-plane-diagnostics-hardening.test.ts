import {describe,expect,it} from 'vitest';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Control Plane diagnostics and exact-head hardening',()=>{
  it('keeps actual implementation diffs inside the full planned scope envelope',()=>{
    const gate=read('scripts/shoperation-plan-before-code.mjs');
    expect(gate).toContain("evaluationMode:changedFiles.length?'actual-diff-with-plan-envelope':'planned-projection'");
    expect(gate).toContain("DEV_PLAN_DOMAIN_SCOPE_EXPANDED");
    expect(gate).toContain("DEV_PLAN_AUTHORITY_SCOPE_EXPANDED");
    expect(gate).toContain("DEV_PLAN_FAILURE_SCOPE_EXPANDED");
    expect(gate).toContain("mode:'planned-projection'");
    expect(gate).toContain('projectedFiles');
    expect(gate).toContain('outside(actualDomains,expectedDomains)');
  });

  it('preserves structured gate reason and produces a source-independent failure fingerprint',()=>{
    const root=process.cwd();
    const script=resolve(root,'scripts/shoperation-failure-intake.mjs');
    const temp=mkdtempSync(join(tmpdir(),'shoperation-intake-'));
    const diagnostic=join(temp,'plan-before-code.json');
    writeFileSync(diagnostic,JSON.stringify({
      contract:'shoporation.plan-before-code-gate.v1',
      decision:'BLOCK',
      issues:[{
        code:'DEV_PLAN_DOMAIN_SCOPE_DRIFT',
        expected:['DOMAIN-QUALITY'],
        actual:[],
        file:'scripts/example.mjs',
        reason:'planned scope and actual scope differ',
      }],
    }));

    const run=(source:string,commit:string,output:string)=>{
      const result=spawnSync(process.execPath,[script],{
        cwd:root,
        encoding:'utf8',
        env:{
          ...process.env,
          SHOPERATION_FAILURE_INTAKE_OUTPUT_DIR:output,
          SHOPERATION_SOURCE_COMMIT:commit,
          SHOPERATION_FAILURE_SOURCE:source,
          SHOPERATION_CI_RUN_ID:'12345',
          SHOPERATION_DIAGNOSTIC_ARTIFACTS:`DEVELOPMENT_PLAN_FAILED=${diagnostic}`,
          SHOPERATION_GENERIC_FAILURES:'DEVELOPMENT_PLAN_FAILED',
        },
      });
      expect(result.status,result.stderr||result.stdout).toBe(0);
      return JSON.parse(readFileSync(join(output,'failure-intake.json'),'utf8'));
    };

    const first=run('ci','aaaaaaaa',join(temp,'out-a'));
    const second=run('template-factory','bbbbbbbb',join(temp,'out-b'));
    expect(first.records).toHaveLength(1);
    expect(second.records).toHaveLength(1);
    expect(first.records[0].failureFingerprint).toBe(second.records[0].failureFingerprint);
    expect(first.records[0].rawErrorCode).toBe('DEV_PLAN_DOMAIN_SCOPE_DRIFT');
    expect(first.records[0].reason).toBe('planned scope and actual scope differ');
    expect(first.records[0].file).toBe('scripts/example.mjs');
    expect(first.records[0].expected).toBe('["DOMAIN-QUALITY"]');
    expect(first.records[0].actual).toBe('[]');
    expect(first.records[0].ciRunId).toBe('12345');
    expect(first.records.some((record:{rawErrorCode:string})=>record.rawErrorCode==='DEVELOPMENT_PLAN_FAILED')).toBe(false);
  });

  it('localizes Knowledge Before Build integrity failures from the evidence artifact',()=>{
    const root=process.cwd();
    const script=resolve(root,'scripts/shoperation-failure-intake.mjs');
    const temp=mkdtempSync(join(tmpdir(),'shoperation-knowledge-intake-'));
    const diagnostic=join(temp,'knowledge-preflight.json');
    writeFileSync(diagnostic,JSON.stringify({
      contract:'shoporation.quality-knowledge-preflight.v1',
      decision:'BLOCK',
      integrityIssues:[{code:'SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED',file:'scripts/smoke.mjs'}],
    }));
    const result=spawnSync(process.execPath,[script],{
      cwd:root,
      encoding:'utf8',
      env:{
        ...process.env,
        SHOPERATION_FAILURE_INTAKE_OUTPUT_DIR:join(temp,'out'),
        SHOPERATION_SOURCE_COMMIT:'cccccccc',
        SHOPERATION_FAILURE_SOURCE:'ci',
        SHOPERATION_DIAGNOSTIC_ARTIFACTS:`KNOWLEDGE_PREFLIGHT_FAILED=${diagnostic}`,
        SHOPERATION_GENERIC_FAILURES:'KNOWLEDGE_PREFLIGHT_FAILED',
      },
    });
    expect(result.status,result.stderr||result.stdout).toBe(0);
    const report=JSON.parse(readFileSync(join(temp,'out','failure-intake.json'),'utf8'));
    expect(report.records).toHaveLength(1);
    expect(report.records[0].rawErrorCode).toBe('SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED');
    expect(report.records[0].file).toBe('scripts/smoke.mjs');
    expect(report.records[0].gateCode).toBe('KNOWLEDGE_PREFLIGHT_FAILED');
    expect(report.records.some((record:{rawErrorCode:string})=>record.rawErrorCode==='KNOWLEDGE_PREFLIGHT_FAILED')).toBe(false);
  });

  it('rejects stale risk evidence and binds matching risk evidence into the release manifest',()=>{
    const script=resolve(process.cwd(),'scripts/release-manifest.mjs');
    const temp=mkdtempSync(join(tmpdir(),'shoperation-release-'));
    mkdirSync(join(temp,'artifacts'),{recursive:true});
    const riskFile=join(temp,'artifacts','release-risk-budget.json');
    const baseRisk={
      version:1,
      policyVersion:1,
      base:'base-sha',
      mergeBase:'base-sha',
      head:'bbbbbbbb',
      score:2,
      maxPoints:5,
      subsystemCount:1,
      subsystems:[{subsystem:'release-infrastructure',risk:'medium',points:2}],
      decision:'PASS',
      atlasClosure:{sourceCommit:'bbbbbbbb'},
    };
    writeFileSync(riskFile,JSON.stringify(baseRisk));

    const env={
      ...process.env,
      RELEASE_HEAD_SHA:'aaaaaaaa',
      RELEASE_REF_NAME:'feature/control-plane',
      DEPLOY_ENVIRONMENT:'ci',
      GITHUB_REPOSITORY:'infowaterk-max/water-K-',
      GITHUB_RUN_ID:'777',
      GITHUB_WORKFLOW:'CI',
    };
    const stale=spawnSync(process.execPath,[script],{cwd:temp,encoding:'utf8',env});
    expect(stale.status).not.toBe(0);
    expect(`${stale.stderr}\n${stale.stdout}`).toContain('RELEASE_MANIFEST_STALE_RISK_EVIDENCE');

    writeFileSync(riskFile,JSON.stringify({...baseRisk,head:'aaaaaaaa',atlasClosure:{sourceCommit:'aaaaaaaa'}}));
    const exact=spawnSync(process.execPath,[script],{cwd:temp,encoding:'utf8',env});
    expect(exact.status,exact.stderr||exact.stdout).toBe(0);
    const manifest=JSON.parse(readFileSync(join(temp,'release-manifest.json'),'utf8'));
    expect(manifest.sha).toBe('aaaaaaaa');
    expect(manifest.repository).toBe('infowaterk-max/water-K-');
    expect(manifest.ciRunId).toBe('777');
    expect(manifest.releaseRisk.head).toBe('aaaaaaaa');
    expect(manifest.releaseRisk.atlasSourceCommit).toBe('aaaaaaaa');
    expect(manifest.releaseRisk.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('wires exact-head identity and structured diagnostics through existing workflows',()=>{
    const ci=read('.github/workflows/ci.yml');
    expect(ci).toContain('RELEASE_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(ci).toContain('SHOPERATION_DIAGNOSTIC_ARTIFACTS');
    expect(ci).toContain('RELEASE_RISK_BUDGET_FAILED=artifacts/release-risk-budget.json');
    expect(ci).toContain('failureFingerprint');

    const factory=read('.github/workflows/template-factory-quality-gate.yml');
    expect(factory).toContain('id: contract-regressions');
    expect(factory).toContain('CONTRACT_OUTCOME');
    expect(factory).toContain('TEST_FAILED=artifacts/test-results.json');
    expect(factory).toContain('failureFingerprint');
  });
  it('classifies Control Plane changes explicitly without relaxing the Release Risk Budget',()=>{
    const policy=JSON.parse(read('deploy/release-risk-policy.json')) as {
      maxPoints:number;
      maxSubsystems:number;
      riskWeights:Record<string,number>;
      subsystems:{name:string;risk:string;patterns:string[]}[];
    };
    const quality=policy.subsystems.find(item=>item.name==='quality-infrastructure');
    expect(quality).toBeTruthy();
    expect(quality?.risk).toBe('medium');
    expect(quality?.patterns).toContain('scripts/shoperation-*.mjs');
    expect(quality?.patterns).toContain('scripts/lib/shoperation-*.mjs');
    expect(policy.riskWeights.medium).toBe(2);
    expect(policy.maxPoints).toBe(5);
    expect(policy.maxSubsystems).toBe(3);
  });

  it('persists exact-head Fresh Install and Cloud Smoke proof through existing authorities',()=>{
    const ci=read('.github/workflows/ci.yml');
    expect(ci).toContain("contract:'shoporation.fresh-install-proof.v2'");
    expect(ci).toContain('sourceCommit:process.env.GITHUB_SHA');
    expect(ci).toContain('fresh-install-proof-${{ github.sha }}');
    expect(ci).toContain('productionTouched:false');

    const smoke=read('scripts/smoke.mjs');
    expect(smoke).toContain("contract:'shoporation.cloud-smoke-proof.v2'");
    expect(smoke).toContain('CLOUD_SMOKE_SHA_MISMATCH');
    expect(smoke).toContain('CLOUD_SMOKE_CONTENT_TYPE_MISMATCH');
    expect(smoke).toContain('artifacts/cloud-smoke');
    expect(smoke).toContain('sourceCommit:expectedSha||null');

    const domains=JSON.parse(read('quality/knowledge/domain-foundations.v1.json')) as {domains:{id:string;canonicalPaths:string[]}[]};
    expect(domains.domains.find(item=>item.id==='DOMAIN-RELEASE')?.canonicalPaths).toContain('scripts/smoke.mjs');

    const workflow=read('.github/workflows/cloud-smoke.yml');
    expect(workflow).toContain('SMOKE_ATTEMPT="$attempt"');
    expect(workflow).toContain('Upload Cloud Smoke exact-head evidence');
    expect(workflow).toContain('SHOPERATION_FAILURE_SOURCE: cloud-smoke');
    expect(workflow).toContain('CLOUD_SMOKE_FAILED=artifacts/cloud-smoke/smoke.json');
    expect(workflow).toContain('cloud-smoke-failure-intake-${{ inputs.environment }}-${{ github.sha }}');
  });

});
