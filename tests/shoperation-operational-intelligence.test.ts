import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');
const json=<T=any>(path:string)=>JSON.parse(read(path)) as T;

describe('Control Plane Operational Intelligence',()=>{
  it('keeps risk depth proportional and reserves strongest proof for critical authority work',()=>{
    const policy=json<any>('quality/knowledge/development-guard-policy.v1.json');
    const profiles=policy.operationalIntelligence.riskProfiles;
    expect(policy.operationalIntelligence.phaseSequence).toEqual(['OBSERVE','DEFINE','MODEL','PLAN','CHALLENGE','IMPROVE','PROVE_PLAN','EXECUTE','VERIFY','TRUTH_GATE','CLOSE','LEARN']);
    expect(profiles.low.requireDissent).toBe(false);
    expect(profiles.low.minChallenges).toBe(0);
    expect(profiles.medium.requireDissent).toBe(true);
    expect(profiles.high.requiredTechniques).toContain('fault-injection');
    expect(profiles.critical.requiredTechniques).toContain('finite-state-exhaustion');
    expect(profiles.critical.minChallenges).toBeGreaterThan(profiles.medium.minChallenges);
  });

  it('uses the existing Plan Before Code authority for machine proof instead of a parallel planner gate',()=>{
    const planGate=read('scripts/shoperation-plan-before-code.mjs');
    const registry=json<any>('quality/knowledge/guard-registry.v1.json');
    expect(planGate).toContain('validateOperationalIntelligence');
    expect(planGate).toContain('operationalValidation.issues');
    const completion=registry.guards.find((item:any)=>item.id==='GUARD-COMPLETION-TRUTH');
    expect(completion).toEqual(expect.objectContaining({
      authority:'quality-knowledge-system',
      responsibilityKey:'po-completion-integrity',
      producer:'scripts/shoperation-truth-gate.mjs',
    }));
    expect(registry.guards.filter((item:any)=>item.responsibilityKey==='release-coherence-risk-budget')).toHaveLength(1);
    expect(registry.guards.filter((item:any)=>item.responsibilityKey==='po-completion-integrity')).toHaveLength(1);
  });

  it('binds the current self-change to its canonical risk profile and PO Completion Contract',()=>{
    const plan=json<any>('quality/development/active-plan.json');
    const policy=json<any>('quality/knowledge/development-guard-policy.v1.json');
    const profile=policy.operationalIntelligence.riskProfiles[plan.operationalIntelligence.riskTier];
    expect(profile).toBeTruthy();
    expect(plan.operationalIntelligence.sourceKind).toBe('product-owner-request');
    expect(plan.completionContract.sourceKind).toBe('product-owner-request');
    expect(plan.completionContract.sourceRef).toBe(plan.operationalIntelligence.sourceRef);
    expect(plan.operationalIntelligence.alternatives.length).toBeGreaterThanOrEqual(profile.minAlternatives);
    expect(plan.operationalIntelligence.specialistReviews.length).toBeGreaterThanOrEqual(profile.minSpecialists);
    expect(plan.operationalIntelligence.challenge.length).toBeGreaterThanOrEqual(profile.minChallenges);
    for(const technique of profile.requiredTechniques)expect(plan.operationalIntelligence.assuranceCeiling.selectedTechniques).toContain(technique);
    if(profile.requireDissent)expect(plan.operationalIntelligence.specialistReviews.some((item:any)=>item.mode==='dissent')).toBe(true);
    expect(plan.completionContract.requirements.length).toBeGreaterThan(0);
    for(const requirement of plan.completionContract.requirements){
      expect(requirement.id).toMatch(/^REQ-/);
      expect(requirement.requirement.trim().length).toBeGreaterThan(0);
      expect(requirement.evidence.implementation.length).toBeGreaterThan(0);
      expect(requirement.evidence.outcome.length).toBeGreaterThan(0);
      expect(requirement.forbiddenRegressions.length).toBeGreaterThan(0);
    }
  });

  it('keeps proof capabilities canonical in the existing Guard Registry',()=>{
    const registry=json<any>('quality/knowledge/guard-registry.v1.json');
    const capabilities=new Set(json<any>('quality/knowledge/capability-registry.v1.json').capabilities.map((item:any)=>item.id));
    const byId=(id:string)=>registry.guards.find((item:any)=>item.id===id);
    for(const id of ['GUARD-PLAN-BEFORE-CODE','GUARD-EDIT-TIME','GUARD-INCREMENTAL-REPLAY'])expect(byId(id).proofSemantics.capabilities).toContain('CAP-QUALITY');
    expect(byId('GUARD-RELEASE-RISK').proofSemantics.capabilities).toEqual(['CAP-RELEASE']);
    for(const guard of registry.guards.filter((item:any)=>item.proofSemantics)){
      for(const capability of guard.proofSemantics.capabilities)if(capability!=='*')expect(capabilities.has(capability),`${guard.id}:${capability}`).toBe(true);
    }
    const runtime=read('scripts/lib/shoperation-operational-intelligence.mjs');
    expect(runtime).toContain("quality/knowledge/guard-registry.v1.json");
    expect(runtime).toContain('CANONICAL_EVIDENCE_SEMANTICS');
    expect(runtime).not.toContain('const DEFAULT_EVIDENCE_SEMANTICS=Object.freeze');
  });

  it('exhausts PASS FAIL BLOCKED STALE and MISSING completion evidence combinations',()=>{
    const output=execFileSync(process.execPath,['scripts/lib/shoperation-operational-intelligence.mjs','--self-test'],{encoding:'utf8'});
    expect(output).toContain('Operational Intelligence self-test: PASS');
    expect(output).toContain('exhaustiveTruthCases=125');
  });

  it('keeps Truth Gate read-only and exact-state evidence bound',()=>{
    const truth=read('scripts/shoperation-truth-gate.mjs');
    expect(truth).toContain('evaluateCompletionTruth');
    expect(truth).toContain('report.readOnly=true');
    expect(truth).toContain('SHOPERATION_TRUTH_HEAD');
    expect(truth).toContain('SHOPERATION_TRUTH_BRANCH');
    expect(truth).toContain('SHOPERATION_TRUTH_STATE_VERSION');
    for(const forbidden of ['git push','git merge','update_ref','deploy --prod','promote-template-golden'])expect(truth).not.toContain(forbidden);
  });

  it('makes VERIFIED to CLOSE to LEARN a two-phase fail-closed lifecycle without PR write privilege',()=>{
    const ci=read('.github/workflows/ci.yml');
    const lifecycle=read('scripts/shoperation-close-development-plan.mjs');
    expect(ci).toContain('Prepare CLOSE to LEARN lifecycle transition');
    expect(ci).toContain('Lifecycle Closure Gate');
    expect(ci).toContain('DEV_LIFECYCLE_CLOSE_REQUIRED');
    expect(ci).toContain('RELEASE_EXECUTION_SOURCE_ADMISSION');
    expect(ci).toContain("startsWith(github.ref_name, 'release-execution/source/')");
    expect(ci).toContain('DEFERRED_TO_RELEASE_UNIT_EXECUTOR');
    expect(ci).toContain('active-plan.closed.json');
    expect(lifecycle).toContain('buildClosedDevelopmentPlan');
    expect(lifecycle).toContain("decision:childTransaction?'PASS':'BLOCK_UNTIL_COMMITTED'");
    expect(lifecycle).toContain("action:childTransaction?'child-receipt-emitted':(arg('--apply')?'applied':'candidate-emitted')");
    expect(lifecycle).toContain("const childTransaction=plan.releaseUnitContext?.contract==='shoporation.release-unit-child-transaction.v1'");
    expect(lifecycle).toContain("if(arg('--apply')&&!childTransaction)writeFileSync(PLAN_PATH");
    expect(lifecycle).toContain("release-unit-child-lifecycle.json");
    expect(lifecycle).toContain("shoporation.release-unit-child-lifecycle.v1");
    expect(lifecycle).toContain("plan.status==='closed'");
    expect(lifecycle).not.toContain('git push');
    expect(lifecycle).not.toContain('createOrUpdateFileContents');
    expect(ci).toContain('contents: read');
    expect(ci).not.toContain('contents: write');
  });

  it('feeds completion failures and missed-thinking review into existing CI and Failure Intake',()=>{
    const ci=read('.github/workflows/ci.yml');
    const intake=read('scripts/shoperation-failure-intake.mjs');
    expect(ci).toContain('Completion Truth Gate');
    expect(ci).toContain('node scripts/shoperation-truth-gate.mjs --check');
    expect(ci).toContain('TRUTH_GATE_FAILED=artifacts/shoperation-development-guard/truth-gate.json');
    expect(ci).toContain('TRUTH_OUTCOME: ${{ steps.completion-truth.outcome }}');
    expect(ci).toContain('LIFECYCLE_OUTCOME: ${{ steps.lifecycle-closure.outcome }}');
    expect(ci).toContain('DEV_LIFECYCLE_CLOSE_REQUIRED=artifacts/shoperation-development-guard/lifecycle-transition.json');
    expect(ci).toContain('codes="${codes}DEV_LIFECYCLE_CLOSE_REQUIRED;"');
    expect(intake).toContain('learningReview');
    expect(intake).toContain('pending-missed-thinking-review');
    expect(intake).toContain('noDefectLocalGate:true');
  });

  it('keeps new planning scaffolds fail-closed until challenge and PO contract are completed',()=>{
    const guard=read('scripts/shoperation-development-guard.mjs');
    expect(guard).toContain("status:'draft'");
    expect(guard).toContain('executionAuthorized:false');
    expect(guard).toContain("completionContract:{sourceKind:'product-owner-request'");
    expect(guard).toContain("riskTier=(value('--risk')");
  });

  it('documents authority reuse and forbids completion evidence circularity',()=>{
    const doc=read('docs/architecture/CONTROL_PLANE_OPERATIONAL_INTELLIGENCE.md');
    const policy=json<any>('quality/knowledge/development-guard-policy.v1.json');
    expect(doc).toContain('does not create a second Control Plane');
    expect(doc).toContain('CLAIM WITHOUT EVIDENCE = NOT VERIFIED');
    expect(policy.operationalIntelligence.completionEvidence.forbiddenCircularEvidenceIds).toEqual(['GUARD-COMPLETION-TRUTH']);
  });
});
