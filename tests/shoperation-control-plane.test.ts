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
    expect(registry.principles.externalExecutionPlanBelongsToControlPlane).toBe(true);
    expect(registry.principles.authorityConflictDetectionIsGlobal).toBe(true);
    expect(registry.principles.deterministicControlPlanePrecedesAi).toBe(true);
    expect(registry.principles.humanAuthorityCannotBeOverridden).toBe(true);
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
    expect(control).toContain('--run-external');
    expect(control).toContain('runExternalSpecialists');
    expect(control).toContain('topoSort(new Set((registry.guards');
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

  it('derives external specialist execution from the registry graph rather than workflow sibling order',()=>{
    const registry=json('quality/knowledge/guard-registry.v1.json');
    const orchestrator=read('scripts/lib/shoperation-external-orchestrator.mjs');
    expect(orchestrator).toContain('topoSort(selectedIds)');
    expect(orchestrator).toContain("scripts/shoperation-specialist-runner.mjs");
    for(const id of ['GUARD-RELEASE-RISK','GUARD-CUSTOMER-BASELINE','GUARD-MARKET-READY','GUARD-QUALITY-TESTS','GUARD-TYPECHECK','GUARD-PRODUCTION-BUILD','GUARD-TEMPLATE-FACTORY']){
      const guard=registry.guards.find((item:any)=>item.id===id);
      expect(guard?.execution?.mode,id).toBe('external-specialist');
      expect(guard?.execution?.command,id).toBeTruthy();
      expect(Array.isArray(guard?.execution?.args),id).toBe(true);
    }
    for(const file of ['.github/workflows/ci.yml','.github/workflows/template-factory-quality-gate.yml','.github/workflows/shoperation-knowledge-full-replay.yml']){
      const workflow=read(file);
      expect(workflow).toContain('--run-external --check');
      expect(workflow).not.toContain('SHOPERATION_EXTERNAL_GUARD_RESULTS');
      expect(workflow).not.toContain('shoperation-specialist-runner.mjs --guard');
    }
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
    expect(ci).toContain('--run-external --check');
    expect(ci).not.toContain('shoperation-specialist-runner.mjs --guard');
    expect(reporter).toContain('REASON ');
    expect(reporter).toContain('CLASSIFICATION:');
    expect(reporter).toContain('ACTION:');
  });

  it('pulls registered specialist diagnostics into the central failure report',()=>{
    const registry=json('quality/knowledge/guard-registry.v1.json');
    const factory=registry.guards.find((guard:any)=>guard.id==='GUARD-TEMPLATE-FACTORY');
    expect(factory?.diagnosticSources).toEqual(expect.arrayContaining([
      expect.objectContaining({file:'artifacts/template-factory-quality/manifest.json',arrayPath:'errors'})
    ]));
    const control=read('scripts/shoperation-control-plane.mjs');
    expect(control).toContain('diagnosticSourceRows');
    expect(control).toContain('golden-only visual differences');
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
