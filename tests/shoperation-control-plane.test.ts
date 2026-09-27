import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(file:string)=>readFileSync(file,'utf8');
const json=(file:string)=>JSON.parse(read(file));

describe('Shoperation Control Plane',()=>{
  it('owns blocking order from one executable dependency graph',()=>{
    const registry=json('quality/knowledge/guard-registry.v1.json');
    expect(registry.contract).toBe('shoporation.guard-registry.v2');
    expect(registry.principles.singleControlPlaneOwnsBlockingOrder).toBe(true);
    expect(registry.principles.specialistGuardsMustNotSelfOrchestratePeers).toBe(true);
    expect(registry.principles.finalDecisionBelongsToControlPlane).toBe(true);
    const managed=registry.guards.filter((guard:any)=>guard.execution?.mode==='control-plane-managed');
    expect(managed.map((guard:any)=>guard.id)).toEqual(expect.arrayContaining([
      'GUARD-INSTRUCTION-COMPLIANCE',
      'GUARD-KNOWLEDGE-PREFLIGHT',
      'GUARD-PLAN-BEFORE-CODE',
      'GUARD-EDIT-TIME',
      'GUARD-INCREMENTAL-REPLAY',
    ]));
    expect(registry.guards.find((guard:any)=>guard.id==='GUARD-RELEASE-RISK')?.execution?.mode).toBe('external-specialist');
    for(const guard of managed){
      expect(guard.execution.command).toBe('node');
      expect(Array.isArray(guard.execution.args)).toBe(true);
      expect(guard.execution.profiles.length).toBeGreaterThan(0);
    }
  });

  it('establishes one global authority for final quality decisions',()=>{
    const knowledge=json('quality/knowledge/shoperation-quality-knowledge.v1.json');
    const authority=knowledge.authorityRules.find((item:any)=>item.id==='SQ-AUTH-022');
    expect(authority?.subject).toBe('quality-control-plane-orchestration');
    expect(authority?.rule).toContain('Control Plane');
    expect(authority?.rule).toContain('final PASS/BLOCK decision');
    const failure=knowledge.knownFailures.find((item:any)=>item.id==='SQ-KF-025');
    expect(failure.invariantIds).toContain('SQ-AUTH-022');
  });

  it('prevents specialist modules from secretly re-orchestrating sibling gates',()=>{
    const preflight=read('scripts/shoperation-knowledge-preflight.mjs');
    expect(preflight).not.toContain("scripts/shoperation-instruction-compliance.mjs");
    const control=read('scripts/shoperation-control-plane.mjs');
    expect(control).toContain('CONTROL_PLANE_DEPENDENCY_CYCLE');
    expect(control).toContain('CONTROL_PLANE_PROCESS_EVIDENCE_CONTRADICTION');
    expect(control).toContain('CONTROL_PLANE_TASK_ID_DRIFT');
    expect(control).toContain('CONTROL_PLANE_HEAD_DRIFT');
    expect(control).toContain('--reconcile-external');
  });

  it('makes both workflows invoke the Control Plane instead of manually sequencing core gates',()=>{
    for(const file of ['.github/workflows/ci.yml','.github/workflows/template-factory-quality-gate.yml']){
      const workflow=read(file);
      expect(workflow).toContain('name: Shoperation Control Plane');
      expect(workflow).toContain('scripts/shoperation-control-plane.mjs');
      expect(workflow).not.toContain('run: node scripts/shoperation-plan-before-code.mjs --check');
      expect(workflow).not.toContain('run: node scripts/shoperation-edit-time-guard.mjs --check');
      expect(workflow).not.toContain('run: node scripts/shoperation-incremental-replay.mjs --check');
      expect(workflow).toContain('Upload Shoperation Control Plane evidence');
    }
  });

  it('reconciles external specialists back into the same final decision',()=>{
    const ci=read('.github/workflows/ci.yml');
    expect(ci).toContain('Shoperation Control Plane final reconciliation');
    expect(ci).toContain('"GUARD-CUSTOMER-BASELINE"');
    expect(ci).toContain('"GUARD-MARKET-READY"');
    expect(ci).toContain('"GUARD-QUALITY-TESTS"');
    expect(ci).toContain('"GUARD-TYPECHECK"');
    expect(ci).toContain('"GUARD-PRODUCTION-BUILD"');

    const factory=read('.github/workflows/template-factory-quality-gate.yml');
    expect(factory).toContain('Shoperation Control Plane final Template Factory reconciliation');
    expect(factory).toContain('"GUARD-TEMPLATE-FACTORY"');
    expect(factory).toContain("steps.control-plane-final.outcome == 'success'");
  });

  it('reports a blocking specialist immediately instead of requiring log archaeology',()=>{
    const reporter=read('scripts/lib/shoperation-control-plane-reporter.mjs');
    const runner=read('scripts/shoperation-specialist-runner.mjs');
    expect(reporter).toContain('SHOPERATION CONTROL PLANE');
    expect(reporter).toContain('KNOWN FAILURE:');
    expect(reporter).toContain('JAVÍTÁS:');
    expect(reporter).toContain('::error ');
    expect(reporter).toContain('GITHUB_STEP_SUMMARY');
    expect(runner).toContain('emitInstantGuardFailure');
    expect(runner).toContain('external-specialist-evidence.v1');

    const ci=read('.github/workflows/ci.yml');
    expect(ci).toContain('shoperation-specialist-runner.mjs --guard GUARD-RELEASE-RISK');
    expect(ci).toContain('shoperation-specialist-runner.mjs --guard GUARD-TYPECHECK');
    expect(ci).toContain('"GUARD-RELEASE-RISK"');
  });

  it('requires Product Owner handoff to consume the final Control Plane verdict',()=>{
    const handoff=read('scripts/template-factory-product-owner-handoff.mjs');
    expect(handoff).toContain('CONTROL_PLANE_FINAL_STAGE_MISSING');
    expect(handoff).toContain('CONTROL_PLANE_NOT_PASS');
    expect(handoff).toContain('CONTROL_PLANE_SPECIALIST_NOT_PASS');
    expect(handoff).toContain("'GUARD-TEMPLATE-FACTORY'");
    expect(handoff).toContain("'GUARD-PRODUCTION-BUILD'");
  });
});
