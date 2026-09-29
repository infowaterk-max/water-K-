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
      'id: qa-runtime','QA_RUNTIME_OUTCOME','TARGET_OUTCOME','PREVIEW_OUTCOME','HANDOFF_OUTCOME',
      'SHOPERATION_HANDOFF_PROOF: artifacts/template-factory-handoff/proof.json',
      'product-owner-preview.json','product-owner-target.json','template-qa-runtime.json',
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
