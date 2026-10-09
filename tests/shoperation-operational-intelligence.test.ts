import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
// @ts-ignore JavaScript runtime module intentionally has no separate declaration file.
import {evaluateClosedDevelopmentPlan,validateCommittedParentClosureMetadata,validateOperationalIntelligence} from '../scripts/lib/shoperation-operational-intelligence.mjs';
// @ts-ignore JavaScript runtime module intentionally has no separate declaration file.
import {buildReleaseParentClosureProofArtifactFromContext,buildReleaseParentClosureProofPlan} from '../scripts/lib/shoperation-release-unit-runtime.mjs';

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

  it('keeps critical semantic route authority exactly coherent with expectedAuthorities, including truthful neutral scope',()=>{
    const policy=json<any>('quality/knowledge/development-guard-policy.v1.json');
    const registry=json<any>('quality/knowledge/guard-registry.v1.json');
    const basePlan=json<any>('quality/development/active-plan.json');
    const guardIds=registry.guards.map((item:any)=>item.id);
    const codesFor=(expectedAuthorities:string[],routeAuthority:string[]|undefined)=>{
      const plan=JSON.parse(JSON.stringify(basePlan));
      plan.expectedAuthorities=expectedAuthorities;
      // This test validates critical-only routing independently of the active work item risk tier.
      plan.operationalIntelligence.riskTier='critical';
      const route={...plan.operationalIntelligence.semanticExecutionRoute};
      if(routeAuthority===undefined)delete route.authority;
      else route.authority=routeAuthority;
      plan.operationalIntelligence.semanticExecutionRoute=route;
      return validateOperationalIntelligence({plan,policy,guardIds}).issues.map((item:any)=>item.code);
    };

    const neutral=codesFor([],[]);
    expect(neutral).not.toContain('DEV_PLAN_SEMANTIC_EXECUTION_ROUTE_REQUIRED');
    expect(neutral).not.toContain('DEV_PLAN_SEMANTIC_EXECUTION_AUTHORITY_DRIFT');

    expect(codesFor([],undefined)).toContain('DEV_PLAN_SEMANTIC_EXECUTION_ROUTE_REQUIRED');
    expect(codesFor([],['release-infrastructure'])).toContain('DEV_PLAN_SEMANTIC_EXECUTION_AUTHORITY_DRIFT');
    expect(codesFor(['quality-knowledge-system'],[])).toContain('DEV_PLAN_SEMANTIC_EXECUTION_AUTHORITY_DRIFT');

    const matching=codesFor(['quality-knowledge-system'],['quality-knowledge-system']);
    expect(matching).not.toContain('DEV_PLAN_SEMANTIC_EXECUTION_ROUTE_REQUIRED');
    expect(matching).not.toContain('DEV_PLAN_SEMANTIC_EXECUTION_AUTHORITY_DRIFT');

    const reordered=codesFor(['authority-b','authority-a'],['authority-a','authority-b']);
    expect(reordered).not.toContain('DEV_PLAN_SEMANTIC_EXECUTION_AUTHORITY_DRIFT');
  });

  it('documents authority reuse and forbids completion evidence circularity',()=>{
    const doc=read('docs/architecture/CONTROL_PLANE_OPERATIONAL_INTELLIGENCE.md');
    const policy=json<any>('quality/knowledge/development-guard-policy.v1.json');
    expect(doc).toContain('does not create a second Control Plane');
    expect(doc).toContain('CLAIM WITHOUT EVIDENCE = NOT VERIFIED');
    expect(policy.operationalIntelligence.completionEvidence.forbiddenCircularEvidenceIds).toEqual(['GUARD-COMPLETION-TRUTH']);
  });
  it('allows canonical parent closure mustCreate targeting but keeps generic critical mustCreate fail-closed',()=>{
    const policy=json<any>('quality/knowledge/development-guard-policy.v1.json');
    const registry=json<any>('quality/knowledge/guard-registry.v1.json');
    const basePlan=json<any>('quality/development/active-plan.json');
    const guardIds=registry.guards.map((item:any)=>item.id);
    const proofPath='quality/knowledge/release-parent-closure-proofs/dev-parent.json';
    // The live active-plan may itself be a persisted CLOSED parent/child
    // transaction. Synthetic *generic* scenarios must not inherit that authority.
    const candidate=JSON.parse(JSON.stringify(basePlan));
    delete candidate.parentClosureContext;
    delete candidate.releaseUnitContext;
    candidate.operationalIntelligence.riskTier='critical';
    candidate.operationalIntelligence.semanticExecutionRoute={...candidate.operationalIntelligence.semanticExecutionRoute,mustEdit:[],mustCreate:[proofPath],proof:[proofPath],unknown:[]};
    const routeIssues=(plan:any)=>validateOperationalIntelligence({plan,policy,guardIds}).issues.map((item:any)=>item.code);
    expect(routeIssues(candidate)).toContain('DEV_PLAN_SEMANTIC_EXECUTION_ROUTE_REQUIRED');

    candidate.parentClosureContext={contract:'shoporation.release-parent-closure-proof-context.v0'};
    expect(routeIssues(candidate)).toContain('DEV_PLAN_SEMANTIC_EXECUTION_ROUTE_REQUIRED');

    candidate.parentClosureContext={contract:'shoporation.release-parent-closure-proof-context.v1'};
    expect(routeIssues(candidate)).not.toContain('DEV_PLAN_SEMANTIC_EXECUTION_ROUTE_REQUIRED');

    delete candidate.parentClosureContext;
    candidate.releaseUnitContext={contract:'shoporation.release-unit-child-transaction.v1'};
    expect(routeIssues(candidate)).not.toContain('DEV_PLAN_SEMANTIC_EXECUTION_ROUTE_REQUIRED');

    candidate.releaseUnitContext={contract:'shoporation.release-unit-child-transaction.v0'};
    expect(routeIssues(candidate)).toContain('DEV_PLAN_SEMANTIC_EXECUTION_ROUTE_REQUIRED');
  });

  it('accepts only exact committed parent closure metadata bound to canonical source, receipts and persisted projection',()=>{
    const sha=(digit:string)=>digit.repeat(40);
    const sourceCommit=sha('a'),finalMain=sha('b'),metadataHead=sha('c');
    const id='DEV-PARENT-TRUTH-TEST',branch='release-execution/closure/dev-parent-truth-test';
    const parent:any={
      contract:'shoporation.release-parent-execution.v1',parentTransactionId:id,
      executionSourceCommit:sourceCommit,closureComplete:true,
      units:[1,2,3].map(order=>({order,state:'CLOSED',releaseUnitId:id+'-U0'+order,closeReceipt:{contract:'shoporation.test-receipt.v1',order,decision:'PASS'},merge:{mergedMainSha:finalMain}})),
      closurePersistence:{contract:'shoporation.release-parent-closure-persistence.v1',state:'PR_OPEN',headSha:metadataHead,baseSha:finalMain,branch},
    };
    const sourcePlan:any={
      contract:'shoporation.development-plan.v1',taskId:id,task:'Verify parent closure.',
      completionContract:{sourceKind:'product-owner-request',sourceRef:'PO-PARENT-TRUTH',requirements:[]},
      operationalIntelligence:{semanticExecutionRoute:{request:'PO-PARENT-TRUTH',authority:[],forbidden:[]}},
      expectedSubsystems:[],expectedDomains:[],expectedAuthorities:[],
    };
    const open=buildReleaseParentClosureProofPlan({parent,sourcePlan,sourceCommit,finalMainSha:finalMain});
    const plan:any={...structuredClone(open),status:'closed',lifecycle:{state:'LEARN',truthStatus:'VERIFIED',verifiedImplementationHead:finalMain}};
    const proof=buildReleaseParentClosureProofArtifactFromContext(plan.parentClosureContext);
    parent.closedReceipt={parentClosureContext:structuredClone(plan.parentClosureContext),proofArtifactPath:proof.path,proofArtifactDigest:proof.digest};
    const exact={head:metadataHead,branch,stateVersion:'shoporation-ci.v1'};
    const metadataParents=[metadataHead,finalMain];
    const metadataChanges=['M\tquality/development/active-plan.json','A\t'+proof.path];
    const verify=(changes:any={})=>validateCommittedParentClosureMetadata({
      plan:changes.plan??plan,parent:changes.parent??parent,sourcePlan:changes.sourcePlan??sourcePlan,
      currentExactState:changes.currentExactState??exact,artifactContent:changes.artifactContent??proof.content,
      metadataParents:changes.metadataParents??metadataParents,metadataChanges:changes.metadataChanges??metadataChanges,
      trustedMainAdvance:changes.trustedMainAdvance??null,
    });
    const valid=verify();
    expect(valid).toMatchObject({decision:'PASS',path:proof.path,issues:[]});
    const lifecycle=(files:string[],validated:string|null)=>evaluateClosedDevelopmentPlan({
      plan,currentExactState:exact,changedSinceVerified:files,verifiedHeadIsAncestor:true,
      planIssues:[],verifiedParentClosureProofPath:validated,
    });
    expect(lifecycle(['quality/development/active-plan.json',proof.path],valid.path).decision).toBe('PASS');
    expect(lifecycle([proof.path],null).issues.map((item:any)=>item.code)).toContain('DEV_LIFECYCLE_POST_VERIFICATION_MATERIAL_CHANGE');
    expect(lifecycle([proof.path,'src/unrelated.ts'],valid.path).issues.find((item:any)=>item.code==='DEV_LIFECYCLE_POST_VERIFICATION_MATERIAL_CHANGE')?.files).toEqual(['src/unrelated.ts']);
    const forgedPlan=structuredClone(plan);forgedPlan.parentClosureContext.sourceCommit=sha('d');
    const forgedProof=buildReleaseParentClosureProofArtifactFromContext(forgedPlan.parentClosureContext);
    const malformedPlan=structuredClone(plan);malformedPlan.parentClosureContext.contract='shoporation.release-parent-closure-proof-context.v0';
    const unclosed=structuredClone(parent);unclosed.units[1].state='STALE';
    const changedReceipt=structuredClone(parent);changedReceipt.units[0].closeReceipt.decision='FORGED';
    const stalePersistence=structuredClone(parent);stalePersistence.closurePersistence.headSha=sha('e');
    const changedMain=structuredClone(plan);changedMain.parentClosureContext.finalMainSha=sha('f');
    for(const candidate of [
      {artifactContent:proof.content+' '},
      {artifactContent:JSON.stringify({...proof.artifact,unitCloseReceiptDigests:['forged']})+'\n'},
      {plan:forgedPlan,artifactContent:forgedProof.content},
      {plan:malformedPlan},
      {plan:changedMain},
      {parent:unclosed},
      {parent:changedReceipt},
      {parent:stalePersistence},
      {sourcePlan:{...sourcePlan,completionContract:{...sourcePlan.completionContract,sourceRef:'PO-FORGED'}}},
      {metadataParents:[metadataHead,sha('f')]},
      {metadataChanges:[...metadataChanges,'M\tscripts/runtime.ts']},
      {currentExactState:{...exact,branch:'feature/forged'}},
    ])expect(verify(candidate).decision,JSON.stringify(Object.keys(candidate))).toBe('BLOCK');
    const generic={...structuredClone(plan)};delete generic.parentClosureContext;
    expect(evaluateClosedDevelopmentPlan({plan:generic,currentExactState:exact,changedSinceVerified:[proof.path],verifiedHeadIsAncestor:true,verifiedParentClosureProofPath:proof.path}).decision).toBe('BLOCK');
  });

});
