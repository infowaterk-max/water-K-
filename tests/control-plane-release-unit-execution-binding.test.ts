// @ts-nocheck
import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
  bindReleaseUnitChildTransaction,
  classifyReleaseUnitObligationDrift,
  createReleaseUnitExecution,
  recordReleaseUnitMaterialization,
  recordReleaseUnitPullRequest,
  recordReleaseUnitVerification,
  reprojectReleaseUnitChildTransaction,
  releaseUnitChildPlanDigest,
  releaseUnitContextBindingDigest,
  sealReleaseUnitManifest,
  decodeReleaseUnitContextEnvelope,
  derivePlannedOperations,
  validateReleaseUnitCiContext,
} from '../scripts/lib/shoperation-release-unit-runtime.mjs';
import {
  buildReleaseUnitCiEnvelope,
  classifyExactChildCiRuns,
  releaseUnitCommitMessage,
  releaseUnitPullRequestBody,
  selectExactSuccessfulCiRun,
  stateRefFor,
  validateExactPullRequest,
} from '../scripts/release-unit-github-runtime.mjs';
import {resolveReleaseUnitCiPullRequest} from '../scripts/release-unit-ci-context.mjs';

const A='a'.repeat(40),H='1'.repeat(40);
const parentPlan:any={
  contract:'shoporation.development-plan.v1',
  taskId:'DEV-PARENT',
  task:'Parent transaction',
  status:'ready-for-implementation',
  guardDigest:'parent',
  changeBaseSha:A,
  plannedFilePatterns:['scripts/a.mjs'],
  expectedSubsystems:['release-infrastructure'],
  expectedDomains:['DOMAIN-RELEASE'],
  expectedAuthorities:['release-infrastructure'],
  expectedKnownFailureIds:['SQ-KF-001'],
  acknowledgedPoInstructionIds:[],
  acknowledgedNegativeKnowledgeIds:['SQ-NK-002'],
  exceptions:[],
  operationalIntelligence:{
    sourceKind:'product-owner-request',
    sourceRef:'PO-CHILD',
    riskTier:'critical',
    problemStatement:'Parent problem statement contains enough concrete release execution context for deterministic child projection and exact proof identity.',
    observableOutcomes:['Parent release execution remains observable through canonical child transaction proof and merge receipts.'],
    unresolvedRisks:['Repository drift can invalidate a later release-unit child transaction and therefore must remain fail closed.'],
    scope:{in:['Canonical release transaction execution remains in scope.'],out:['Parallel truth authority remains out of scope.']},
    assuranceCeiling:{level:'critical-practical',rationale:'Critical release execution requires deterministic identity because a foreign receipt could otherwise advance unauthorized code.',selectedTechniques:['explicit-specification'],deferredTechniques:[]},
    definition:{acceptanceCriteria:['Canonical child evidence remains exact and fail closed.'],invariants:['Parent lifecycle remains separate from child lifecycle evidence.'],forbiddenStates:['parent-closed-by-child']},
    model:{phases:[],transitions:[],failureModes:['Foreign child evidence could advance a parent transaction.'],edgeCases:['A create-only child may not have a legitimate mustEdit path.']},
    alternatives:[],
    specialistReviews:[],
    challenge:[],
    proofPlan:['Run exact child transaction adversarial verification before merge.'],
    semanticExecutionRoute:{request:'PO-CHILD',authority:['release-infrastructure'],mustEdit:['scripts/a.mjs'],mayEdit:[],impactedReadOnly:[],mustCreate:[],forbidden:[],proof:['tests/a.test.ts'],unknown:[],plannedDeletions:[],plannedRenames:[],generatedArtifacts:[]},
    executionAuthorized:true,
  },
  completionContract:{sourceKind:'product-owner-request',sourceRef:'PO-CHILD',systemObligations:{requiredGuards:[],externalGuards:[],phase:'PLAN'},requirements:[]},
};
const baseManifest:any={
  contract:'shoporation.release-unit-manifest.v1',
  decision:'PASS',
  releaseUnitId:'DEV-PARENT-U01',
  order:1,
  transaction:{id:'DEV-PARENT',parentTransactionId:'DEV-PARENT',sourceRef:'PO-CHILD',developmentBaseSha:A},
  targetBaseSha:A,
  lease:{expectedBaseSha:A,failOnDrift:true,reconciled:true,reconciledFromSha:null},
  intendedFiles:['scripts/a.mjs'],
  operations:[{operation:'modify',file:'scripts/a.mjs'}],
  requiredDependencyFiles:[],
  authorities:['release-infrastructure'],
  subsystems:['release-infrastructure'],
  projectedRisk:{decision:'PASS'},
  requiredGates:['GUARD-PLAN-BEFORE-CODE','GUARD-EDIT-TIME','GUARD-RELEASE-RISK','GUARD-QUALITY-TESTS'],
  requiredEvidence:{gateIds:['GUARD-PLAN-BEFORE-CODE','GUARD-EDIT-TIME','GUARD-RELEASE-RISK','GUARD-QUALITY-TESTS'],proofFiles:['tests/a.test.ts'],externalGateIds:[]},
  forbiddenPaths:[],
  readOnlyPaths:[],
  generatedArtifactSemantics:[],
  prerequisites:[],
  predecessorUnits:[],
  expectedPostUnitState:{filesPresent:['scripts/a.mjs'],filesAbsent:[]},
  reconciliationPolicy:{mode:'merged-main-sequential',requireExactMainLease:true,requirePredecessorReceipts:false,requiresReconciliationAfterPredecessor:false,failOnUnrelatedMainDrift:true},
  sourceIdentity:{sourceCommit:'source-a',sealed:true},
  manifestDigest:'legacy',
};
const manifest=()=>bindReleaseUnitChildTransaction(baseManifest,{
  parentPlan,
  guardDigest:'child-guard',
  expectedSubsystems:['release-infrastructure'],
  expectedDomains:['DOMAIN-RELEASE'],
  expectedAuthorities:['release-infrastructure'],
  expectedKnownFailureIds:['SQ-KF-001'],
  acknowledgedNegativeKnowledgeIds:['SQ-NK-002'],
  semanticExecutionRoute:{request:'PO-CHILD',authority:['release-infrastructure'],mustEdit:['scripts/a.mjs'],mayEdit:[],impactedReadOnly:[],mustCreate:[],forbidden:[],proof:['tests/a.test.ts'],unknown:[],plannedDeletions:[],plannedRenames:[],generatedArtifacts:[]},
});

describe('release-unit execution binding hardening',()=>{
  it('keeps exact base-to-head operation kinds authoritative over candidate Atlas existence',()=>{
    const atlas={nodes:[
      {path:'scripts/new.mjs'},
      {path:'scripts/existing.mjs'},
      {path:'scripts/renamed.mjs'},
    ]};
    const operations=derivePlannedOperations({
      projectedFiles:['scripts/new.mjs','scripts/existing.mjs','scripts/deleted.mjs','scripts/renamed.mjs'],
      atlas,
      transactionChanges:[
        {status:'A',file:'scripts/new.mjs'},
        {status:'M',file:'scripts/existing.mjs'},
        {status:'D',file:'scripts/deleted.mjs'},
        {status:'R',previousFile:'scripts/old.mjs',file:'scripts/renamed.mjs'},
      ],
    });
    expect(operations).toEqual([
      {operation:'delete',file:'scripts/deleted.mjs'},
      {operation:'modify',file:'scripts/existing.mjs',generated:null},
      {operation:'create',file:'scripts/new.mjs',generated:null},
      {operation:'rename',previousFile:'scripts/old.mjs',file:'scripts/renamed.mjs',generated:null},
    ]);
    expect(derivePlannedOperations({projectedFiles:['scripts/new.mjs'],atlas})[0].operation).toBe('modify');
  });

  it('restores deterministic sealed provenance before obligation comparison and keeps source drift material',()=>{
    const current=manifest();
    current.intendedFiles=['scripts/release-unit-github-runtime.mjs'];
    current.operations=[{operation:'modify',file:'scripts/release-unit-github-runtime.mjs'}];
    current.sourceIdentity={sourceCommit:null,sealed:false};
    const sealed=sealReleaseUnitManifest(current,{sourceCommit:'HEAD',cwd:process.cwd()});
    const projected=structuredClone(sealed);
    projected.operations=projected.operations.map(({source,...operation})=>operation);
    projected.sourceIdentity={sourceCommit:null,sealed:false};
    const resealed=sealReleaseUnitManifest(projected,{sourceCommit:'HEAD',cwd:process.cwd()});
    expect(resealed.operations).toEqual(sealed.operations);
    expect(resealed.operations[0].source).toMatchObject({mode:'sealed',commit:'HEAD',fileMode:'100644'});
    expect(resealed.childDevelopmentTransaction.operationDigest).toBe(sealed.childDevelopmentTransaction.operationDigest);
    const tampered=structuredClone(resealed);
    tampered.operations[0].source={...tampered.operations[0].source,blobSha:'f'.repeat(40)};
    const drift=classifyReleaseUnitObligationDrift(resealed,tampered);
    expect(drift.material.map(item=>item.field)).toContain('operations');
  });

  it('seals child plan and operation identity into a strong context binding',()=>{
    const m=manifest(),child=m.childDevelopmentTransaction;
    expect(child.planDigest).toHaveLength(64);
    expect(child.bindingDigest).toHaveLength(64);
    expect(releaseUnitChildPlanDigest(child.plan)).toBe(child.planDigest);
    expect(releaseUnitContextBindingDigest({
      manifestDigest:m.manifestDigest,
      childPlanDigest:child.planDigest,
      operationDigest:child.operationDigest,
      releaseUnitId:m.releaseUnitId,
      parentTransactionId:'DEV-PARENT',
      targetBaseSha:A,
    })).toBe(child.bindingDigest);
  });

  it('rejects mutable PR context unless exact commit trailers bind the same child transaction',()=>{
    const m=manifest(),envelope=buildReleaseUnitCiEnvelope(m);
    const body=releaseUnitPullRequestBody(m),decoded=decodeReleaseUnitContextEnvelope(body),message=releaseUnitCommitMessage(m);
    expect(decoded.bindingDigest).toBe(envelope.bindingDigest);
    const ok=validateReleaseUnitCiContext({envelope:decoded,headSha:H,baseSha:A,commitMessage:message});
    expect(ok.decision).toBe('CHILD');
    expect(ok.plan.releaseUnitContext.manifestDigest).toBe(m.manifestDigest);
    expect(()=>validateReleaseUnitCiContext({envelope:{...decoded,operationDigest:'tampered'},headSha:H,baseSha:A,commitMessage:message})).toThrow(/BINDING_DIGEST_MISMATCH/);
    expect(()=>validateReleaseUnitCiContext({envelope:decoded,headSha:H,baseSha:'b'.repeat(40),commitMessage:message})).toThrow(/BASE_MISMATCH/);
  });

  it('makes child transaction identity mandatory for VERIFIED and rejects parent or foreign lifecycle receipts',()=>{
    const m=manifest();let e=createReleaseUnitExecution(m);e={...e,state:'READY'};
    e=recordReleaseUnitMaterialization(e,{contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:m.releaseUnitId,targetBaseSha:A,materializedHeadSha:H,commitSha:H,manifestDigest:m.manifestDigest,bindingDigest:m.childDevelopmentTransaction.bindingDigest,sourceCommit:'source-a'});
    e=recordReleaseUnitPullRequest(e,{number:1,headSha:H,baseSha:A,manifestDigest:m.manifestDigest,bindingDigest:m.childDevelopmentTransaction.bindingDigest,sourceCommit:'source-a'});
    const ctx={parentTransactionId:'DEV-PARENT',releaseUnitId:m.releaseUnitId,manifestDigest:m.manifestDigest,childPlanDigest:m.childDevelopmentTransaction.planDigest,bindingDigest:m.childDevelopmentTransaction.bindingDigest};
    const goodTruth={taskId:m.childDevelopmentTransaction.taskId,decision:'PASS',truthStatus:'VERIFIED',internalState:'VERIFIED_DONE',releaseUnitContext:ctx,currentExactState:{head:H}};
    const goodLifecycle={...m.childDevelopmentTransaction.plan,status:'closed',releaseUnitContext:ctx,lifecycle:{state:'LEARN',truthStatus:'VERIFIED',verifiedImplementationHead:H}};
    expect(recordReleaseUnitVerification(e,{truth:goodTruth,lifecyclePlan:goodLifecycle}).state).toBe('VERIFIED');
    expect(()=>recordReleaseUnitVerification(e,{truth:{...goodTruth,taskId:'DEV-PARENT'},lifecyclePlan:goodLifecycle})).toThrow(/TRUTH_TASK_MISMATCH/);
    expect(()=>recordReleaseUnitVerification(e,{truth:goodTruth,lifecyclePlan:{...goodLifecycle,releaseUnitContext:{...ctx,releaseUnitId:'OTHER'}}})).toThrow(/LIFECYCLE_CONTEXT_MISMATCH/);
  });

  it('classifies exact child CI success, pending and terminal action_required without timeout masking',()=>{
    const branch='release-unit/dev',success={databaseId:1,headSha:H,headBranch:branch,status:'completed',conclusion:'success',event:'workflow_dispatch'};
    expect(classifyExactChildCiRuns([success],{headSha:H,headBranch:branch})).toMatchObject({decision:'PASS',run:{databaseId:1}});
    expect(classifyExactChildCiRuns([{databaseId:2,headSha:H,headBranch:branch,status:'in_progress',conclusion:null,event:'workflow_dispatch'}],{headSha:H,headBranch:branch})).toMatchObject({decision:'PENDING',reason:'RELEASE_UNIT_CHILD_CI_PENDING'});
    expect(classifyExactChildCiRuns([{databaseId:3,headSha:H,headBranch:branch,status:'completed',conclusion:'action_required',event:'pull_request'}],{headSha:H,headBranch:branch})).toMatchObject({decision:'BLOCK',reason:'RELEASE_UNIT_CHILD_CI_ACTION_REQUIRED'});
    expect(classifyExactChildCiRuns([{databaseId:4,headSha:'2'.repeat(40),headBranch:branch,status:'completed',conclusion:'failure'}],{headSha:H,headBranch:branch})).toMatchObject({decision:'PENDING',reason:'RELEASE_UNIT_CHILD_CI_NOT_STARTED'});
  });

  it('validates trusted workflow_dispatch PR identity against the actual same-repository PR',()=>{
    const event={inputs:{release_unit_proof:'true',release_unit_pr_number:'7',release_unit_head_sha:H,release_unit_base_sha:A,release_unit_head_ref:'release-unit/dev'}};
    const pr={number:7,state:'open',head:{sha:H,ref:'release-unit/dev',repo:{full_name:'infowaterk-max/water-K-'}},base:{sha:A},body:'body'};
    const resolved=resolveReleaseUnitCiPullRequest({event,repository:'infowaterk-max/water-K-',fetchPullRequest:number=>number===7?pr:null});
    expect(resolved.mode).toBe('workflow_dispatch');
    expect(resolved.pullRequest.number).toBe(7);
    expect(()=>resolveReleaseUnitCiPullRequest({event:{inputs:{...event.inputs,release_unit_head_sha:'2'.repeat(40)}},repository:'infowaterk-max/water-K-',fetchPullRequest:()=>pr})).toThrow(/DISPATCH_PR_HEAD_MISMATCH/);
    expect(()=>resolveReleaseUnitCiPullRequest({event,repository:'infowaterk-max/water-K-',fetchPullRequest:()=>({...pr,head:{...pr.head,repo:{full_name:'evil/fork'}}})})).toThrow(/DISPATCH_PR_REPOSITORY_MISMATCH/);
    expect(resolveReleaseUnitCiPullRequest({event:{pull_request:pr},repository:'infowaterk-max/water-K-',fetchPullRequest:()=>null}).mode).toBe('pull_request');
  });

  it('binds exact PR and CI run identity and keeps state refs deterministic',()=>{
    const m=manifest(),body=releaseUnitPullRequestBody(m);
    expect(validateExactPullRequest({number:7,head:{sha:H},base:{sha:A},body},{headSha:H,baseSha:A,bindingDigest:m.childDevelopmentTransaction.bindingDigest}).number).toBe(7);
    expect(()=>validateExactPullRequest({number:7,head:{sha:'2'.repeat(40)},base:{sha:A},body},{headSha:H,baseSha:A,bindingDigest:m.childDevelopmentTransaction.bindingDigest})).toThrow(/HEAD_MISMATCH/);
    expect(()=>validateExactPullRequest({number:7,head:{sha:H},base:{sha:A},body:'no canonical envelope'},{headSha:H,baseSha:A,bindingDigest:m.childDevelopmentTransaction.bindingDigest})).toThrow(/CONTEXT_MISMATCH/);
    const tamperedBody=releaseUnitPullRequestBody({...m,childDevelopmentTransaction:{...m.childDevelopmentTransaction,bindingDigest:'f'.repeat(64)}});
    expect(()=>validateExactPullRequest({number:7,head:{sha:H},base:{sha:A},body:tamperedBody},{headSha:H,baseSha:A,bindingDigest:m.childDevelopmentTransaction.bindingDigest})).toThrow(/CONTEXT_MISMATCH/);
    expect(selectExactSuccessfulCiRun([{databaseId:1,headSha:H,headBranch:'release-unit/dev',status:'completed',conclusion:'success'}],{headSha:H,headBranch:'release-unit/dev'}).databaseId).toBe(1);
    expect(selectExactSuccessfulCiRun([{databaseId:2,headSha:H,headBranch:'other',status:'completed',conclusion:'success'}],{headSha:H,headBranch:'release-unit/dev'})).toBeNull();
    expect(stateRefFor('DEV Parent 1')).toBe('refs/heads/control-plane/release-state/dev-parent-1');
  });
  it('reprojects child plan metadata and atomically refreshes plan, manifest and binding identity',()=>{
    const before=manifest();
    const projection={
      contract:'shoporation.release-unit-child-plan-projection.v1',
      guardDigest:'fresh-guard',
      expectedSubsystems:['release-infrastructure','quality-infrastructure'],
      expectedDomains:['DOMAIN-QUALITY','DOMAIN-RELEASE'],
      expectedAuthorities:['quality-knowledge-system','release-infrastructure'],
      expectedKnownFailureIds:['SQ-KF-001','SQ-KF-024'],
      acknowledgedPoInstructionIds:['PO-TEST'],
      acknowledgedNegativeKnowledgeIds:['SQ-NK-002','SQ-NK-012'],
      requiredGates:['GUARD-PLAN-BEFORE-CODE','GUARD-EDIT-TIME','GUARD-QUALITY-TESTS'],
      externalGateIds:['EXTERNAL-PROOF'],
      semanticExecutionRoute:{
        request:'PO-CHILD',
        authority:['quality-knowledge-system','release-infrastructure'],
        mustEdit:['scripts/a.mjs'],
        mayEdit:[],
        impactedReadOnly:['tests/a.test.ts'],
        mustCreate:[],
        forbidden:[],
        proof:['tests/a.test.ts'],
        unknown:[],
        plannedDeletions:[],
        plannedRenames:[],
        generatedArtifacts:[],
      },
    };
    const after=reprojectReleaseUnitChildTransaction(before,projection);
    expect(after.releaseUnitId).toBe(before.releaseUnitId);
    expect(after.transaction.parentTransactionId).toBe(before.transaction.parentTransactionId);
    expect(after.intendedFiles).toEqual(before.intendedFiles);
    expect(after.targetBaseSha).toBe(before.targetBaseSha);
    expect(after.childDevelopmentTransaction.plan.guardDigest).toBe('fresh-guard');
    expect(after.childDevelopmentTransaction.plan.expectedSubsystems).toEqual(['quality-infrastructure','release-infrastructure']);
    expect(after.childDevelopmentTransaction.plan.acknowledgedNegativeKnowledgeIds).toEqual(['SQ-NK-002','SQ-NK-012']);
    expect(after.childDevelopmentTransaction.plan.operationalIntelligence.semanticExecutionRoute.proof).toEqual(['tests/a.test.ts']);
    expect(after.childDevelopmentTransaction.plan.completionContract.systemObligations.requiredGuards).toEqual(['GUARD-EDIT-TIME','GUARD-PLAN-BEFORE-CODE','GUARD-QUALITY-TESTS']);
    expect(after.childDevelopmentTransaction.plan.completionContract.systemObligations.externalGuards).toEqual(['EXTERNAL-PROOF']);
    expect(after.childDevelopmentTransaction.planDigest).not.toBe(before.childDevelopmentTransaction.planDigest);
    expect(after.manifestDigest).not.toBe(before.manifestDigest);
    expect(after.childDevelopmentTransaction.bindingDigest).not.toBe(before.childDevelopmentTransaction.bindingDigest);
    expect(releaseUnitChildPlanDigest(after.childDevelopmentTransaction.plan)).toBe(after.childDevelopmentTransaction.planDigest);
    expect(releaseUnitContextBindingDigest({
      manifestDigest:after.manifestDigest,
      childPlanDigest:after.childDevelopmentTransaction.planDigest,
      operationDigest:after.childDevelopmentTransaction.operationDigest,
      releaseUnitId:after.releaseUnitId,
      parentTransactionId:after.transaction.parentTransactionId,
      targetBaseSha:after.targetBaseSha,
    })).toBe(after.childDevelopmentTransaction.bindingDigest);
  });

  it('rejects incomplete child projection envelopes instead of retaining stale metadata',()=>{
    const before=manifest();
    expect(()=>reprojectReleaseUnitChildTransaction(before,{contract:'shoporation.release-unit-child-plan-projection.v1',guardDigest:'fresh'})).toThrow(/PROJECTION_FIELD_REQUIRED/);
    expect(()=>reprojectReleaseUnitChildTransaction(before,{contract:'foreign'})).toThrow(/PROJECTION_CONTRACT_INVALID/);
  });

  it('preserves normalized release blocker reason plus exact nested error at the executor boundary',()=>{
    const source=readFileSync('scripts/release-unit-execute.mjs','utf8');
    expect(source).toContain("const releaseExecutionBlockDiagnostic=result=>({reason:result?.reason??null,error:result?.error??null});");
    expect(source).toContain("JSON.stringify(releaseExecutionBlockDiagnostic(result))");
    expect(source).not.toContain("JSON.stringify(result.reason??result.error??null)");
    const formatter=(result:any)=>({reason:result?.reason??null,error:result?.error??null});
    expect(formatter({reason:'RELEASE_PARENT_PROOF_OR_PERSISTENCE_FAILED',error:'exact-child-error',state:{secret:'not-serialized'}})).toEqual({reason:'RELEASE_PARENT_PROOF_OR_PERSISTENCE_FAILED',error:'exact-child-error'});
    expect(formatter({reason:'RELEASE_PARENT_NOT_CLOSURE_ELIGIBLE'})).toEqual({reason:'RELEASE_PARENT_NOT_CLOSURE_ELIGIBLE',error:null});
    expect(formatter({error:'unclassified-authoritative-error'})).toEqual({reason:null,error:'unclassified-authoritative-error'});
  });

});
