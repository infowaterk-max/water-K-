import{mkdtempSync,readFileSync,rmSync}from'node:fs';
import{tmpdir}from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';
import{describe,expect,it}from'vitest';

const read=(p:string)=>readFileSync(p,'utf8');

describe('Control Plane diagnostic coverage',()=>{
  it('turns command failures into machine-readable diagnostics with localization',()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'command-diagnostic-'));
    const out=path.join(dir,'typecheck.json');
    const result=spawnSync(process.execPath,['scripts/shoperation-command-diagnostic.mjs','--',process.execPath,'-e',"console.error('src/demo.ts(7,9): error TS2322: Type string is not assignable to number');process.exit(2)"],{
      encoding:'utf8',
      env:{...process.env,SHOPERATION_DIAGNOSTIC_OUTPUT:out,SHOPERATION_DIAGNOSTIC_CODE:'TYPECHECK_FAILED',SHOPERATION_DIAGNOSTIC_GATE:'test-typecheck',SHOPERATION_DIAGNOSTIC_EXPECTED:'TypeScript PASS'},
    });
    const report=JSON.parse(read(out));
    rmSync(dir,{recursive:true,force:true});
    expect(result.status).toBe(2);
    expect(report.decision).toBe('FAIL');
    expect(report.errors[0]).toMatchObject({code:'TS2322',file:'src/demo.ts'});
  });

  it('preserves nested executor failure codes, raw error evidence and original exit status',()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'release-diagnostic-'));
    try{
      const out=path.join(dir,'release.json'),summary=path.join(dir,'summary.md');
      const payload={reason:'RELEASE_PARENT_PROOF_OR_PERSISTENCE_FAILED',error:'RELEASE_PARENT_CLOSURE_PR_IDENTITY_MISMATCH:stale remote PR head'};
      const js='console.log("executor progress");console.error("Error: RELEASE_UNIT_EXECUTION_BLOCK:"+JSON.stringify('+JSON.stringify(payload)+'));process.exit(9)';
      const res=spawnSync(process.execPath,['scripts/shoperation-command-diagnostic.mjs','--',process.execPath,'-e',js],{
        encoding:'utf8',env:{...process.env,SHOPERATION_DIAGNOSTIC_OUTPUT:out,
          SHOPERATION_DIAGNOSTIC_CODE:'RELEASE_UNIT_EXECUTION_FAILED',
          SHOPERATION_DIAGNOSTIC_GATE:'trusted-release-executor',
          SHOPERATION_SOURCE_COMMIT:'a'.repeat(40),GITHUB_RUN_ID:'12345',GITHUB_STEP_SUMMARY:summary},
      });
      const report=JSON.parse(read(out));
      expect(res.status).toBe(9);
      expect(res.stdout).toContain('executor progress');
      expect(report).toMatchObject({contract:'shoporation.command-diagnostic.v1',decision:'FAIL',
        gateId:'trusted-release-executor',exitCode:9,runId:'12345'});
      expect(report.errors[0]).toMatchObject({code:'RELEASE_PARENT_CLOSURE_PR_IDENTITY_MISMATCH',
        reason:'RELEASE_PARENT_CLOSURE_PR_IDENTITY_MISMATCH:stale remote PR head'});
      expect(report.errors[0].rawError).toContain('RELEASE_UNIT_EXECUTION_BLOCK');
      expect(read(summary)).toContain('RELEASE_PARENT_CLOSURE_PR_IDENTITY_MISMATCH');
    }finally{rmSync(dir,{recursive:true,force:true});}
  });

  it('redacts tokens in durable diagnostics and preserves a stable fallback when no code exists',()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'release-diagnostic-redact-'));
    try{
      const out=path.join(dir,'release.json'),summary=path.join(dir,'summary.md');
      const token='ghp_dummy_private_secret_1234567';
      const js='console.error("opaque executor error: "+process.env.GH_TOKEN);process.exit(13)';
      const res=spawnSync(process.execPath,['scripts/shoperation-command-diagnostic.mjs','--',process.execPath,'-e',js],{
        encoding:'utf8',env:{...process.env,GH_TOKEN:token,GITHUB_TOKEN:token,
          SHOPERATION_DIAGNOSTIC_OUTPUT:out,SHOPERATION_DIAGNOSTIC_CODE:'RELEASE_UNIT_EXECUTION_FAILED',
          SHOPERATION_DIAGNOSTIC_GATE:'trusted-release-executor',GITHUB_STEP_SUMMARY:summary},
      });
      expect(res.status).toBe(13);
      expect(JSON.parse(read(out)).errors[0].code).toBe('RELEASE_UNIT_EXECUTION_FAILED');
      expect(read(out)).not.toContain(token);
      expect(read(summary)).not.toContain(token);
      expect(read(out)).toContain('[REDACTED]');
    }finally{rmSync(dir,{recursive:true,force:true});}
  });

  it('keeps successful wrapped commands successful without inventing failures',()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'command-diagnostic-pass-'));
    try{
      const out=path.join(dir,'pass.json');
      const res=spawnSync(process.execPath,['scripts/shoperation-command-diagnostic.mjs','--',process.execPath,'-e',"console.log('OK')"],{
        encoding:'utf8',env:{...process.env,SHOPERATION_DIAGNOSTIC_OUTPUT:out,SHOPERATION_DIAGNOSTIC_GATE:'fixture'},
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('OK');
      expect(JSON.parse(read(out))).toMatchObject({decision:'PASS',exitCode:0,errors:[]});
    }finally{rmSync(dir,{recursive:true,force:true});}
  });

  it('wires separate security-audit and trusted release executor failures into existing Failure Intake',()=>{
    const ci=read('.github/workflows/ci.yml');
    const executor=read('.github/workflows/release-unit-execution.yml');
    const command=read('scripts/shoperation-command-diagnostic.mjs');
    for(const token of[
      'id: security-audit-command',
      'SECURITY_AUDIT_FAILED',
      'shoperation-command-diagnostics/security-audit.json',
      'Record security audit failure intake',
      'Upload security audit failure evidence',
    ])expect(ci).toContain(token);
    for(const token of[
      'id: drive-release-executor',
      'node scripts/shoperation-command-diagnostic.mjs --',
      'RELEASE_UNIT_EXECUTION_FAILED',
      'Record trusted executor failure intake',
      'Upload trusted executor diagnostic evidence',
    ])expect(executor).toContain(token);
    expect(command).toContain("const child=spawn(command,args,");
    expect(command).toContain('RELEASE_UNIT_EXECUTION_BLOCK');
    expect(command).toContain('GITHUB_STEP_SUMMARY');
  });

  it('wires core CI baseline, market-ready, typecheck and build failures into structured intake',()=>{
    const ci=read('.github/workflows/ci.yml');
    for(const marker of[
      'id: customer-baseline-guard',
      'id: market-ready',
      'CUSTOMER_BASELINE_GUARD_FAILED=artifacts/shoperation-command-diagnostics/customer-baseline.json',
      'MARKET_READY_GATE_FAILED=artifacts/shoperation-command-diagnostics/market-ready.json',
      'TYPECHECK_FAILED=artifacts/shoperation-command-diagnostics/typecheck.json',
      'BUILD_FAILED=artifacts/shoperation-command-diagnostics/production-build.json',
    ])expect(ci).toContain(marker);
  });

  it('wires Product Owner handoff and exact-head preview diagnostics without log mining',()=>{
    const workflow=read('.github/workflows/template-factory-quality-gate.yml');
    const handoff=read('scripts/template-factory-product-owner-handoff.mjs');
    const intake=read('scripts/shoperation-failure-intake.mjs');
    for(const marker of[
      'id: qa-runtime','QA_RUNTIME_OUTCOME','TARGET_OUTCOME','RUNTIME_PREVIEW_OUTCOME','HANDOFF_OUTCOME',
      'SHOPERATION_HANDOFF_PROOF: artifacts/template-factory-handoff/proof.json',
      'runtime-preview.json','product-owner-target.json','template-qa-runtime.json',
      'PRODUCT_OWNER_JOURNEY_FAILED',
    ])expect(workflow).toContain(marker);
    expect(handoff).toContain('diagnostics,');
    expect(handoff).toContain("contract:'template-aware-auth-shell'");
    expect(handoff).toContain('templateAwareAuthShellCount');
    expect(intake).toContain('data.diagnostics');
    expect(intake).toContain("coveredGenericCodes.add('PRODUCT_OWNER_JOURNEY_FAILED')");
  });

  it('keeps periodic full replay on failure-intake v2 fingerprint identity with concrete artifacts',()=>{
    const workflow=read('.github/workflows/shoperation-knowledge-full-replay.yml');
    expect(workflow).toContain('KNOWLEDGE_PREFLIGHT_FAILED=artifacts/shoperation-quality/knowledge-preflight.json');
    expect(workflow).toContain('TEST_FAILED=artifacts/test-results.json');
    expect(workflow).toContain('TYPECHECK_FAILED=artifacts/shoperation-command-diagnostics/full-replay-typecheck.json');
    expect(workflow).toContain('record.failureFingerprint||record.candidateId');
    expect(workflow).toContain('shoporation.failure-intake.v2');
  });

  it('classifies Product Owner handoff proof infrastructure without lowering risk weight',()=>{
    const policy=JSON.parse(read('deploy/release-risk-policy.json'));
    const quality=policy.subsystems.find((x:{name:string})=>x.name==='quality-infrastructure');
    expect(quality.risk).toBe('medium');
    expect(quality.patterns).toContain('scripts/template-factory-product-owner-handoff.mjs');
    expect(quality.patterns).toContain('scripts/template-factory-quality-gate.mjs');
    expect(policy.neutralPatterns).not.toContain('scripts/template-factory-quality-gate.mjs');
    const account=policy.subsystems.find((x:{name:string})=>x.name==='customer-account');
    expect(account.risk).toBe('medium');
    expect(account.patterns).toContain('src/lib/account/**');
    expect(policy.maxPoints).toBe(5);
    expect(policy.maxSubsystems).toBe(3);
  });
});
