import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(file:string)=>readFileSync(file,'utf8');
const json=(file:string)=>JSON.parse(read(file));

describe('Shoperation Control Plane',()=>{
  it('owns all blocking order from one executable dependency graph',()=>{
    const registry=json('quality/knowledge/guard-registry.v1.json');
    expect(registry.contract).toBe('shoporation.guard-registry.v2');
    expect(registry.principles.singleControlPlaneOwnsBlockingOrder).toBe(true);
    expect(registry.principles.specialistGuardsMustNotSelfOrchestratePeers).toBe(true);
    expect(registry.principles.finalDecisionBelongsToControlPlane).toBe(true);
    expect(registry.principles.externalExecutionPlanBelongsToControlPlane).toBe(true);
    expect(registry.principles.authorityConflictDetectionIsGlobal).toBe(true);
    const managed=registry.guards.filter((guard:any)=>guard.execution?.mode==='control-plane-managed');
    expect(managed.map((guard:any)=>guard.id)).toEqual(expect.arrayContaining([
      'GUARD-INSTRUCTION-COMPLIANCE',
      'GUARD-KNOWLEDGE-PREFLIGHT',
      'GUARD-PLAN-BEFORE-CODE',
      'GUARD-EDIT-TIME',
      'GUARD-INCREMENTAL-REPLAY',
    ]));
    const external=registry.guards.filter((guard:any)=>guard.blocking&&guard.execution?.mode==='external-specialist');
    expect(external.map((guard:any)=>guard.id)).toEqual(expect.arrayContaining([
      'GUARD-RELEASE-RISK',
      'GUARD-CUSTOMER-BASELINE',
      'GUARD-MARKET-READY',
      'GUARD-QUALITY-TESTS',
      'GUARD-TYPECHECK',
      'GUARD-PRODUCTION-BUILD',
      'GUARD-TEMPLATE-FACTORY',
    ]));
    for(const guard of [...managed,...external]){
      expect(guard.execution.profiles.length,guard.id).toBeGreaterThan(0);
    }
    for(const guard of external){
      expect(guard.execution.command,guard.id).toBeTruthy();
      expect(Array.isArray(guard.execution.args),guard.id).toBe(true);
    }
  });

  it('keeps deterministic intelligence below Product Owner authority',()=>{
    const registry=json('quality/knowledge/guard-registry.v1.json');
    expect(registry.principles.deterministicControlPlanePrecedesAi).toBe(true);
    expect(registry.principles.humanAuthorityCannotBeOverridden).toBe(true);
    expect(registry.intelligencePolicy.mode).toBe('deterministic-control-plane-first');
    expect(registry.intelligencePolicy.aiLayerStatus).toContain('not-enabled');
    expect(registry.intelligencePolicy.selfHealing.productOwnerDecisionOverrideAllowed).toBe(false);
    expect(registry.intelligencePolicy.selfHealing.explicitAuthorityRequiredFor).toEqual(expect.arrayContaining([
      'production','migration','security','payment','auth','destructive',
    ]));
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

  it('prevents specialist modules from secretly re-orchestrating sibling guards',()=>{
    const preflight=read('scripts/shoperation-knowledge-preflight.mjs');
    expect(preflight).not.toContain("scripts/shoperation-instruction-compliance.mjs");
    const control=read('scripts/shoperation-control-plane.mjs');
    const external=read('scripts/lib/shoperation-external-orchestrator.mjs');
    expect(control).toContain('CONTROL_PLANE_DEPENDENCY_CYCLE');
    expect(control).toContain('CONTROL_PLANE_PROCESS_EVIDENCE_CONTRADICTION');
    expect(control).toContain('CONTROL_PLANE_TASK_ID_DRIFT');
    expect(control).toContain('CONTROL_PLANE_HEAD_DRIFT');
    expect(control).toContain('runExternalSpecialists');
    expect(control).toContain('--run-external');
    expect(control).not.toContain('SHOPERATION_EXTERNAL_GUARD_RESULTS');
    expect(external).toContain("guard.execution?.mode==='external-specialist'");
    expect(external).toContain('topoSort');
    expect(external).toContain("scripts/shoperation-specialist-runner.mjs");
  });

  it('makes CI, Template Factory and full replay use the same Control Plane entrypoint',()=>{
    for(const file of [
      '.github/workflows/ci.yml',
      '.github/workflows/template-factory-quality-gate.yml',
      '.github/workflows/shoperation-knowledge-full-replay.yml',
    ]){
      const workflow=read(file);
      expect(workflow).toContain('Shoperation Control Plane');
      expect(workflow).toContain('shoperation-control-plane.mjs');
      expect(workflow).toContain('--run-external');
      expect(workflow).not.toContain('SHOPERATION_EXTERNAL_GUARD_RESULTS');
      expect(workflow).not.toContain('run: node scripts/shoperation-plan-before-code.mjs --check');
      expect(workflow).not.toContain('run: node scripts/shoperation-edit-time-guard.mjs --check');
      expect(workflow).not.toContain('run: node scripts/shoperation-incremental-replay.mjs --check');
    }
  });

  it('enforces external predecessor dependencies before specialist execution',()=>{
    const runner=read('scripts/shoperation-specialist-runner.mjs');
    expect(runner).toContain('CONTROL_PLANE_SPECIALIST_PREDECESSOR_NOT_PASS');
    expect(runner).toContain('guard.consumesEvidenceFrom');
    expect(runner).toContain('external-specialist-evidence.v1');
    const registry=json('quality/knowledge/guard-registry.v1.json');
    const build=registry.guards.find((guard:any)=>guard.id==='GUARD-PRODUCTION-BUILD');
    expect(build.consumesEvidenceFrom).toContain('GUARD-TYPECHECK');
    const factory=registry.guards.find((guard:any)=>guard.id==='GUARD-TEMPLATE-FACTORY');
    expect(factory.consumesEvidenceFrom).toEqual(expect.arrayContaining([
      'GUARD-INCREMENTAL-REPLAY','GUARD-TYPECHECK','GUARD-PRODUCTION-BUILD',
    ]));
  });

  it('reports blocking specialists immediately with concrete reasons and actions',()=>{
    const reporter=read('scripts/lib/shoperation-control-plane-reporter.mjs');
    expect(reporter).toContain('SHOPERATION CONTROL PLANE');
    expect(reporter).toContain('REASON ');
    expect(reporter).toContain('CLASSIFICATION:');
    expect(reporter).toContain('ACTION:');
    expect(reporter).toContain('KNOWN FAILURE:');
    expect(reporter).toContain('::error ');
    expect(reporter).toContain('GITHUB_STEP_SUMMARY');
    const registry=json('quality/knowledge/guard-registry.v1.json');
    const release=registry.guards.find((guard:any)=>guard.id==='GUARD-RELEASE-RISK');
    expect(release.reporting.violationCode).toBe('RELEASE_RISK_BUDGET_FAILED');
    expect(release.reporting.action).toContain('do not raise');
    const factory=registry.guards.find((guard:any)=>guard.id==='GUARD-TEMPLATE-FACTORY');
    expect(factory.reporting.goldenOnlyClassification).toBe('AWAITING_PRODUCT_OWNER_ACCEPTANCE');
    expect(factory.reporting.goldenOnlyAction).toContain('do not promote goldens');
  });

  it('uses one global authority-conflict mechanism without adding a checkout-specific gate',()=>{
    const registry=json('quality/knowledge/guard-registry.v1.json');
    expect(registry.authorityConflictContracts.some((item:any)=>item.authorityRuleId==='TF-AUTH-005')).toBe(true);
    expect(registry.guards.some((guard:any)=>/checkout/i.test(guard.id))).toBe(false);
    const context=read('scripts/lib/shoperation-guard-context.mjs');
    const compliance=read('scripts/shoperation-instruction-compliance.mjs');
    expect(context).toContain('authorityConflictIssues');
    expect(context).toContain('CONTROL_PLANE_AUTHORITY_CONFLICT');
    expect(context).toContain('CONTROL_PLANE_AUTHORITY_CONTINUITY_EVIDENCE_REQUIRED');
    expect(compliance).toContain('authorityConflictIssues');
    expect(compliance).not.toContain('const PROTECTED=');
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
