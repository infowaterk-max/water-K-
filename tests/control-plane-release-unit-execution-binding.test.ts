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
  buildReleaseParentClosureProofPlan,
  buildReleaseParentClosureProofArtifactFromContext,
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
import {advanceParentPostMergeMainCi,classifyParentPostMergeMainCiRun,createPendingParentMainCiState,dispatchArmedParentMainCi,ensureParentClosureCiDispatch,finishParentClosurePersistence,proveParentMainAdvance,requireExactParentClosurePrIdentity,proveInterruptedParentClosureProjection} from '../scripts/release-unit-parent-close.mjs';

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
  it('proves parent main advance with rename-safe aggregate child protection and rejects overlap/non-fast-forward',()=>{
    const state:any={units:[
      {order:1,state:'CLOSED',manifest:{intendedFiles:['quality/fixture-a.json'],operations:[{operation:'create',file:'quality/fixture-a.json'}]},closeReceipt:{releaseUnitId:'U1',decision:'PASS'}},
      {order:2,state:'CLOSED',manifest:{intendedFiles:['tests/proof.test.ts'],operations:[{operation:'rename',previousFile:'tests/old-proof.test.ts',file:'tests/proof.test.ts'}]},closeReceipt:{releaseUnitId:'U2',decision:'PASS'}},
    ]};
    const calls:string[]=[];
    const run=(command:string,args:string[])=>{
      calls.push([command,...args].join(' '));
      if(command==='git'&&args[0]==='merge-base')return '';
      if(command==='git'&&args[0]==='diff')return 'scripts/release-unit-execute.mjs\n';
      throw new Error('unexpected '+command+' '+args.join(' '));
    };
    const pass=proveParentMainAdvance({state,fromSha:A,toSha:H,run});
    expect(pass.decision).toBe('PASS');
    expect(pass.proof.protectedFiles).toEqual(['quality/fixture-a.json','tests/old-proof.test.ts','tests/proof.test.ts']);
    expect(calls.some(call=>call.includes('git diff --name-only --no-renames --diff-filter=ACMRD'))).toBe(true);
    const overlap=proveParentMainAdvance({state,fromSha:A,toSha:H,run:(command:string,args:string[])=>{
      if(command==='git'&&args[0]==='merge-base')return '';
      if(command==='git'&&args[0]==='diff')return 'tests/old-proof.test.ts\n';
      throw new Error('unexpected');
    }});
    expect(overlap).toMatchObject({decision:'BLOCK'});
    expect(overlap.error).toContain('PROTECTED_SCOPE_OVERLAP');
    const nonFastForward=proveParentMainAdvance({state,fromSha:A,toSha:H,run:(command:string,args:string[])=>{
      if(command==='git'&&args[0]==='merge-base')throw new Error('not ancestor');
      throw new Error('unexpected');
    }});
    expect(nonFastForward.error).toContain('NON_FAST_FORWARD');
  });

  it('explicitly dispatches exact parent closure CI without release-unit child proof mode and reuses exact pending/success runs',()=>{
    const calls:string[]=[];
    const dispatched=ensureParentClosureCiDispatch({headSha:H,headBranch:'release-execution/closure/dev-parent',repo:'infowaterk-max/water-K-',run:(command:string,args:string[])=>{
      calls.push([command,...args].join(' '));
      if(command==='gh'&&args[0]==='run'&&args[1]==='list')return '[]';
      if(command==='gh'&&args[0]==='workflow'&&args[1]==='run')return '';
      throw new Error('unexpected '+command+' '+args.join(' '));
    }});
    expect(dispatched.decision).toBe('DISPATCHED');
    const dispatchCall=calls.find(call=>call.includes('gh workflow run ci.yml'))??'';
    expect(dispatchCall).toContain('--ref release-execution/closure/dev-parent');
    expect(dispatchCall).not.toContain('release_unit_proof');
    const exists=ensureParentClosureCiDispatch({headSha:H,headBranch:'release-execution/closure/dev-parent',repo:'infowaterk-max/water-K-',run:(command:string,args:string[])=>{
      if(command==='gh'&&args[0]==='run')return JSON.stringify([{databaseId:77,status:'in_progress',conclusion:null,headSha:H,headBranch:'release-execution/closure/dev-parent',event:'workflow_dispatch'}]);
      throw new Error('dispatch should not repeat');
    }});
    expect(exists).toMatchObject({decision:'EXISTS',runId:77,status:'in_progress'});
  });

  it('passes immutable source authority into parent closure persistence and preserves stale-main reprojection/lease guards',()=>{
    const executeSource=readFileSync('scripts/release-unit-execute.mjs','utf8');
    const parentSource=readFileSync('scripts/release-unit-parent-close.mjs','utf8');
    expect(executeSource).toContain('finishParentClosurePersistence({state,sourceCommit:source})');
    expect(parentSource).toContain("--force-with-lease='+remoteRef+':'+remoteHead");
    expect(parentSource).toContain("reason:'PARENT_CLOSURE_REPROJECTED'");
    expect(parentSource).toContain("reason:'RELEASE_PARENT_CLOSURE_MAIN_DRIFT'");
    expect(parentSource).toContain("ensureParentClosureCiDispatch({headSha,headBranch:branch");
    expect(parentSource).toContain("--event','workflow_dispatch'");
    expect(parentSource).toContain("--event','pull_request'");
  });


  it('wires parent proof to a derived closure plan instead of reusing the immutable source implementation envelope',()=>{
    const parentSource=readFileSync('scripts/release-unit-parent-close.mjs','utf8');
    const orchestrateSource=readFileSync('scripts/release-unit-orchestrate.mjs','utf8');
    expect(parentSource).toContain("const sourcePlan=parse(run('git',['show',sourceCommit+':quality/development/active-plan.json']");
    expect(parentSource).toContain('buildReleaseParentClosureProofPlan({parent:state,sourcePlan,sourceCommit,finalMainSha:finalMain,trustedMainAdvance})');
    expect(parentSource).toContain("writeFileSync(planPath,JSON.stringify(plan,null,2)+'\\n')");
    expect(parentSource).toContain('recordReleaseParentClosureWithProofContext(state');
    expect(parentSource).not.toContain("const plan=parse(run('git',['show',sourceCommit+':quality/development/active-plan.json']");
    expect(orchestrateSource).toContain('recordReleaseParentClosureWithProofContext');
    expect(orchestrateSource).toContain("execFileSync('git',['show',source+':quality/development/active-plan.json']");
    expect(orchestrateSource).toContain("RELEASE_PARENT_CLOSURE_SOURCE_COMMIT_REQUIRED");
    expect(orchestrateSource).not.toContain('?recordReleaseParentClosure(state');
  });

  it('binds parent closure proof artifact through parent proof, Edit-Time, staging and receipt acceptance',()=>{
    const parentSource=readFileSync('scripts/release-unit-parent-close.mjs','utf8');
    const editSource=readFileSync('scripts/shoperation-edit-time-guard.mjs','utf8');
    const runtimeSource=readFileSync('scripts/lib/shoperation-release-unit-runtime.mjs','utf8');
    expect(parentSource).toContain('SHOPERATION_PARENT_CLOSURE_PROOF_ARTIFACT:parentClosureProofArtifact.path');
    expect(parentSource).toContain("run('git',['add','quality/development/active-plan.json',parentClosureProofArtifact.path]");
    expect(parentSource).toContain('proofArtifact:proof.parentClosureProofArtifact');
    expect(editSource).toContain('DEV-BLOCK-PARENT-CLOSURE-PROOF-ARTIFACT');
    expect(editSource).toContain('buildReleaseParentClosureProofArtifactFromContext');
    expect(editSource).toContain('releaseParentClosureProofArtifactByteDigest');
    expect(runtimeSource).toContain("RELEASE_PARENT_CLOSURE_PROOF_ARTIFACT_CONTRACT='shoporation.release-parent-closure-proof-artifact.v1'");
    expect(runtimeSource).toContain('proofArtifactPath:proofArtifact.path');
    expect(runtimeSource).toContain('proofArtifactDigest:proofArtifact.digest');
    expect(readFileSync('scripts/shoperation-plan-before-code.mjs','utf8')).not.toContain('metadataOnlyParentClosure');
  });

  it('keeps executable parent proof and committed closure metadata identities separate',()=>{
    const editSource=readFileSync('scripts/shoperation-edit-time-guard.mjs','utf8');
    expect(editSource).toContain("const persistedClosureMetadata=plan.status==='closed'");
    expect(editSource).toContain("const verifiedProofPath=parentClosureProofPath||(persistedClosureMetadata?expected.path:'')");
    expect(editSource).toContain('EDIT_TIME_PARENT_CLOSURE_ARTIFACT_PATH_MISMATCH');
    expect(editSource).toContain('EDIT_TIME_PARENT_CLOSURE_COMMITTED_ARTIFACT_BYTES_MISMATCH');
    expect(editSource).toContain('EDIT_TIME_PARENT_CLOSURE_COMMITTED_ARTIFACT_MISSING');
    expect(editSource).toContain("git(['show',`${diff.head}:${expected.path}`])");
    expect(editSource).toContain("git(['rev-list','--parents','-n','1',diff.head])");
    expect(editSource).toContain('parents.length!==2');
    expect(editSource).toContain('parents[1]!==finalMainSha');
    expect(editSource).toContain('plan.changeBaseSha!==finalMainSha');
    expect(editSource).toContain('EDIT_TIME_PARENT_CLOSURE_METADATA_PARENT_MISMATCH');
    expect(editSource).toContain('EDIT_TIME_PARENT_CLOSURE_METADATA_HEAD_INVALID');
    expect(editSource).toContain('else if(diff.head&&finalMainSha!==diff.head)');
    expect(editSource).not.toContain('parentClosureContext?.finalMainSha!==diff.head');
  });

  it('binds exact parent closure PR identity on the first authoritative numbered GET',()=>{
    const branch='release-execution/closure/dev-abc',head='2'.repeat(40),base='3'.repeat(40);
    const current={number:1138,state:'open',head:{sha:head,ref:branch},base:{sha:base,ref:'main'}};
    let reads=0,waits=0;
    const run=(command:string,args:string[])=>{
      expect(command).toBe('gh');
      expect(args).toEqual(['api','repos/owner/repo/pulls/1138']);
      reads+=1;
      return JSON.stringify(current);
    };
    const pr=requireExactParentClosurePrIdentity({repository:'owner/repo',prNumber:1138,headSha:head,branch,finalMain:base,run,wait:()=>{waits+=1;}});
    expect(pr).toEqual(current);
    expect(reads).toBe(1);
    expect(waits).toBe(0);
  });

  it('waits for exact head and base convergence without admitting stale values',()=>{
    const branch='release-execution/closure/dev-abc',head='4'.repeat(40),base='5'.repeat(40);
    const correct={number:1138,state:'open',head:{sha:head,ref:branch},base:{sha:base,ref:'main'}};
    const sequence=[
      {...correct,head:{sha:'6'.repeat(40),ref:branch}},
      {...correct,base:{sha:'7'.repeat(40),ref:'main'}},
      correct,
    ];
    let reads=0,waits=0;
    const run=(_command:string,_args:string[])=>{const entry=sequence[Math.min(reads,sequence.length-1)];reads+=1;return JSON.stringify(entry);};
    const pr=requireExactParentClosurePrIdentity({repository:'owner/repo',prNumber:1138,headSha:head,branch,finalMain:base,run,wait:()=>{waits+=1;}});
    expect(pr).toEqual(correct);
    expect(reads).toBe(3);
    expect(waits).toBe(2);
  });

  it('fails closed with exact expected and observed fields on permanent PR identity drift',()=>{
    const branch='release-execution/closure/dev-abc',head='8'.repeat(40),base='9'.repeat(40);
    const valid={number:1138,state:'open',head:{sha:head,ref:branch},base:{sha:base,ref:'main'}};
    for(const {name,pr} of [
      {name:'stale head',pr:{...valid,head:{sha:'a'.repeat(40),ref:branch}}},
      {name:'wrong base',pr:{...valid,base:{sha:'b'.repeat(40),ref:'main'}}},
      {name:'foreign head ref',pr:{...valid,head:{sha:head,ref:'foreign'}}},
      {name:'foreign base ref',pr:{...valid,base:{sha:base,ref:'feature'}}},
      {name:'closed',pr:{...valid,state:'closed'}},
      {name:'wrong PR number',pr:{...valid,number:999}},
    ]){
      let reads=0,waits=0;
      const run=()=>{reads+=1;return JSON.stringify(pr);};
      let message='';
      try{
        requireExactParentClosurePrIdentity({repository:'owner/repo',prNumber:1138,headSha:head,branch,finalMain:base,run,wait:()=>{waits+=1;},maxReads:3});
      }catch(error){message=String((error as Error).message);}
      expect(message,name).toMatch(/^RELEASE_PARENT_CLOSURE_PR_IDENTITY_MISMATCH:/);
      const detail=JSON.parse(message.slice(message.indexOf(':')+1));
      expect(detail.reads).toBe(3);
      expect(detail.expected).toEqual({number:1138,state:'open',headSha:head,headRef:branch,baseRef:'main',baseSha:base});
      expect(detail.observed,name).toBeTruthy();
      expect(reads).toBe(3);
      expect(waits).toBe(2);
    }
  });

  it('caps requested retries and preserves fail-closed GitHub PR fetch failures',()=>{
    const branch='release-execution/closure/dev-abc';
    let reads=0,waits=0;
    const run=()=>{reads+=1;throw new Error('temporary remote lookup unavailable');};
    expect(()=>requireExactParentClosurePrIdentity({repository:'owner/repo',prNumber:1138,headSha:'c'.repeat(40),branch,finalMain:'d'.repeat(40),run,wait:()=>{waits+=1;},maxReads:99}))
      .toThrow(/RELEASE_PARENT_CLOSURE_PR_IDENTITY_MISMATCH/);
    expect(reads).toBe(8);
    expect(waits).toBe(7);
  });

  it('authenticates an interrupted parent closure PR projection from exact committed receipt proof',()=>{
    const oldMain='a'.repeat(40),prevMain='b'.repeat(40),nowMain='c'.repeat(40),newHead='d'.repeat(40),oldHead='e'.repeat(40),sourceCommit='f'.repeat(40);
    const branch='release-execution/closure/dev-parent';
    const state:any={
      contract:'shoporation.release-parent-execution.v1',
      parentTransactionId:'DEV-PARENT',executionSourceCommit:sourceCommit,closureComplete:true,
      closurePersistence:{state:'PR_OPEN',prNumber:1138,branch,headSha:oldHead,baseSha:oldMain},
      units:[{state:'CLOSED',order:1,manifest:{intendedFiles:['scripts/a.mjs'],operations:[]},
        closeReceipt:{decision:'PASS',releaseUnitId:'DEV-PARENT-U01'},
        merge:{mergedMainSha:oldMain}}],
    };
    const pr:any={number:1138,state:'open',head:{sha:newHead,ref:branch,repo:{full_name:'owner/repo'}},
      base:{sha:prevMain,ref:'main',repo:{full_name:'owner/repo'}}};
    const basic=(cmd:string,args:string[],opts:any={})=>{
      if(cmd!=='git')throw Error('unexpected command');
      if(args[0]==='merge-base')return '';
      if(args[0]==='diff'&&args[1]==='--name-only')return 'scripts/independent-safe-change.mjs';
      if(args[0]==='fetch')return '';
      if(args[0]==='rev-list')return newHead+' '+prevMain;
      if(args[0]==='show'&&args[1]===sourceCommit+':quality/development/active-plan.json')return JSON.stringify(parentPlan);
      throw Error('unhandled '+args.join(' '));
    };
    const advance=proveParentMainAdvance({state,fromSha:oldMain,toSha:prevMain,run:basic});
    expect(advance.decision).toBe('PASS');
    const expectedPlan=buildReleaseParentClosureProofPlan({
      parent:state,sourcePlan:parentPlan,sourceCommit,finalMainSha:prevMain,trustedMainAdvance:advance.proof,
    });
    const committedPlan={...expectedPlan,status:'closed',lifecycle:{state:'LEARN',truthStatus:'VERIFIED',verifiedImplementationHead:prevMain}};
    const artifact=buildReleaseParentClosureProofArtifactFromContext(expectedPlan.parentClosureContext),blob='1'.repeat(40);
    const originalRun=(command:string,args:string[],opts:any={})=>{
      if(args[0]==='show'&&args[1]===newHead+':quality/development/active-plan.json')return JSON.stringify(committedPlan);
      if(args[0]==='diff'&&args[1]==='--name-status')return 'M'+String.fromCharCode(9)+'quality/development/active-plan.json'+String.fromCharCode(10)+'A'+String.fromCharCode(9)+artifact.path;
      if(args[0]==='rev-parse')return blob;
      if(args[0]==='hash-object')return opts.input===artifact.content?blob:'2'.repeat(40);
      return basic(command,args,opts);
    };
    const evalCase=(run:any,remotePr:any=pr,current:string=nowMain)=>proveInterruptedParentClosureProjection({
      state,sourceCommit,pr:remotePr,currentMain:current,repo:'owner/repo',run,
    });
    const positive=evalCase(originalRun);
    expect(positive,JSON.stringify(positive)).toMatchObject({decision:'PASS',reason:'AUTHENTIC_INTERRUPTED_PARENT_PROJECTION'});
    const invalid=[
      {name:'no main advance',pr,current:oldMain},
      {name:'foreign ref',pr:{...pr,head:{...pr.head,ref:'foreign'}},current:nowMain},
      {name:'closed PR',pr:{...pr,state:'closed'},current:nowMain},
      {name:'wrong remote repository',pr:{...pr,head:{...pr.head,repo:{full_name:'attacker/repo'}}},current:nowMain},
      {name:'same persisted head',pr:{...pr,head:{...pr.head,sha:oldHead}},current:nowMain},
    ];
    for(const x of invalid)expect(evalCase(originalRun,x.pr,x.current),x.name).toMatchObject({decision:'BLOCK'});
    const variations=[
      {name:'foreign extra parent',run:(cmd:string,args:string[],opts:any)=>args[0]==='rev-list'?newHead+' '+prevMain+' '+'7'.repeat(40):originalRun(cmd,args,opts)},
      {name:'extra material file',run:(cmd:string,args:string[],opts:any)=>args[0]==='diff'&&args[1]==='--name-status'?['M'+String.fromCharCode(9)+'quality/development/active-plan.json','A'+String.fromCharCode(9)+artifact.path,'M'+String.fromCharCode(9)+'scripts/foreign.mjs'].join(String.fromCharCode(10)):originalRun(cmd,args,opts)},
      {name:'wrong committed artifact blob',run:(cmd:string,args:string[],opts:any)=>args[0]==='rev-parse'?'3'.repeat(40):originalRun(cmd,args,opts)},
      {name:'wrong closed plan source',run:(cmd:string,args:string[],opts:any)=>args[0]==='show'&&args[1]===newHead+':quality/development/active-plan.json'?JSON.stringify({...committedPlan,parentClosureContext:{...committedPlan.parentClosureContext,sourceCommit:'4'.repeat(40)}}):originalRun(cmd,args,opts)},
      {name:'unavailable commit',run:(cmd:string,args:string[],opts:any)=>args[0]==='fetch'?(()=>{throw Error('commit unavailable');})():originalRun(cmd,args,opts)},
      {name:'not a trusted ancestor',run:(cmd:string,args:string[],opts:any)=>args[0]==='merge-base'&&args.at(-2)===prevMain?(()=>{throw Error('non-ancestor');})():originalRun(cmd,args,opts)},
    ];
    for(const x of variations){
      const res=evalCase(x.run);
      expect(res.decision,x.name).toBe('BLOCK');
      expect(res.error,x.name).toMatch(/^RELEASE_PARENT_INTERRUPTED_REPROJECTION_INVALID:/);
    }
  });
  it('keeps normal parent closure PR authority separate from interrupted remote recovery',()=>{
    const source=readFileSync('scripts/release-unit-parent-close.mjs','utf8');
    expect(source).toContain('const persistedPrIdentityValid=');
    expect(source).toContain("const recovered=proveInterruptedParentClosureProjection({state,sourceCommit,pr,currentMain,repo:repository,run,cwd})");
    expect(source).toContain("if(currentMain!==persistence.baseSha)return reproject(currentMain)");
    expect(source).toContain("if(!persistedPrIdentityValid)");
    expect(source).toContain("return reproject(currentMain);");
    expect(source).toContain("buildReleaseParentClosureProofArtifactFromContext(expectedPlan.parentClosureContext)");
    expect(source).toContain("run('git',['hash-object','--stdin'],{cwd,input:artifact.content})");
  });

  it('requires a durable post-merge pending state and preserves the immutable source/receipt binding',()=>{
    const source='a'.repeat(40),base='b'.repeat(40),merged='c'.repeat(40),head='d'.repeat(40);
    const parent:any={
      parentTransactionId:'DEV-PARENT',executionSourceCommit:source,closureComplete:true,
      closedReceipt:{decision:'PASS',truthStatus:'VERIFIED',parentTransactionId:'DEV-PARENT'},
      units:[{state:'CLOSED',closeReceipt:{decision:'PASS'}}],
      closurePersistence:{contract:'shoporation.release-parent-closure-persistence.v1',state:'PR_OPEN',prNumber:1138,headSha:head,branch:'release-execution/closure/dev-parent',baseSha:base},
    };
    const next=createPendingParentMainCiState({state:parent,sourceCommit:source,mergedMainSha:merged});
    expect(next.closurePersistence).toMatchObject({state:'POST_MERGE_CI_PENDING',mergedMainSha:merged,
      postMergeMainCi:{status:'INTENT_RECORDED',decision:'PENDING',headBranch:'main',runId:null,sourceCommit:source}});
    expect(next.closurePersistence.postMergeMainCi.nonce).toMatch(/^parent-main-ci-[a-f0-9]{32}$/);
    expect(()=>createPendingParentMainCiState({state:parent,sourceCommit:'f'.repeat(40),mergedMainSha:merged})).toThrow(/CLOSED_RECEIPTS_INVALID/);
    const broken=structuredClone(parent);broken.units[0].closeReceipt.decision='FAKE';
    expect(()=>createPendingParentMainCiState({state:broken,sourceCommit:source,mergedMainSha:merged})).toThrow(/CLOSED_RECEIPTS_INVALID/);
    const workflow=readFileSync('.github/workflows/ci.yml','utf8');
    expect(workflow).toContain('Bind exact parent post-merge main CI');
    expect(workflow).toContain('process.env.GITHUB_SHA!==merged');
    expect(workflow).toContain('parent_post_merge_nonce');
    const driver=readFileSync('scripts/release-unit-execute.mjs','utf8');
    expect(driver).toContain("state.closurePersistence?.state==='POST_MERGE_CI_PENDING'");
    expect(driver).toContain('advanceParentPostMergeMainCi({state,sourceCommit:source})');
    expect(readFileSync('scripts/release-unit-parent-close.mjs','utf8')).toContain("reason:'PARENT_POST_MERGE_MAIN_CI_REQUIRED'");
  });
  it('accepts only a bot-dispatched exact merged SHA with required successful job steps',()=>{
    const source='a'.repeat(40),base='b'.repeat(40),merged='c'.repeat(40),head='d'.repeat(40);
    const state:any=createPendingParentMainCiState({state:{
      parentTransactionId:'DEV-PARENT',executionSourceCommit:source,closureComplete:true,
      closedReceipt:{decision:'PASS',truthStatus:'VERIFIED',parentTransactionId:'DEV-PARENT'},
      units:[{state:'CLOSED',closeReceipt:{decision:'PASS'}}],
      closurePersistence:{contract:'shoporation.release-parent-closure-persistence.v1',state:'PR_OPEN',prNumber:1138,headSha:head,branch:'release-execution/closure/dev-parent',baseSha:base},
    },sourceCommit:source,mergedMainSha:merged});
    const workflowRun:any={id:987,run_attempt:1,name:state.closurePersistence.postMergeMainCi.nonce,path:'.github/workflows/ci.yml',event:'workflow_dispatch',head_sha:merged,
      head_branch:'main',display_title:state.closurePersistence.postMergeMainCi.nonce,actor:{login:'github-actions[bot]'},
      status:'completed',conclusion:'success',created_at:'2026-10-08T21:00:00Z',updated_at:'2026-10-08T21:06:00Z'};
    const steps=['Bind exact parent post-merge main CI','Knowledge Before Build preflight','Incremental Known Failure Replay','Quality tests','TypeScript check','Production build'].map(name=>({name,status:'completed',conclusion:'success'}));
    const jobs:any=[{name:'build',status:'completed',conclusion:'success',steps},{name:'security-audit',status:'completed',conclusion:'success'}];
    const classify=(run:any=workflowRun,jobList:any=jobs,projected:any=state)=>classifyParentPostMergeMainCiRun({state:projected,ciRun:run,jobs:jobList,mergedAt:'2026-10-08T20:55:00Z'});
    expect(classify()).toMatchObject({decision:'PASS',receipt:{runId:987,conclusion:'success',headSha:merged,sourceCommit:source}});
    expect(classify({...workflowRun,status:'in_progress',conclusion:null},null)).toMatchObject({decision:'PENDING'});
    for(const [name,field] of [
      ['wrong sha',{head_sha:'f'.repeat(40)}],['wrong branch',{head_branch:'feature/foreign'}],
      ['wrong event',{event:'pull_request'}],['ordinary main push',{event:'push'}],['manual actor',{actor:{login:'chall'}}],
      ['wrong nonce',{display_title:'CI regular manual run'}],['foreign workflow',{path:'.github/workflows/other.yml'}],
      ['wrong name',{name:'CI'}],['wrong ID',{id:999}],
    ]){
      const bound=structuredClone(state);bound.closurePersistence.postMergeMainCi.runId=987;
      expect(classify({...workflowRun,...field},jobs,bound).decision,name).toBe('BLOCK');
    }
    expect(classify({...workflowRun,created_at:'2026-10-08T20:00:00Z'}).decision).toBe('BLOCK');
    expect(classify({...workflowRun,conclusion:'failure'}).decision).toBe('BLOCK');
    expect(classify({...workflowRun,conclusion:'cancelled'}).decision).toBe('BLOCK');
    expect(classify(workflowRun,[]).decision).toBe('BLOCK');
    expect(classify(workflowRun,[jobs[0]]).decision).toBe('BLOCK');
    expect(classify(workflowRun,[{...jobs[0],steps:steps.slice(1)},jobs[1]]).decision).toBe('BLOCK');
    const wrongSource=structuredClone(state);wrongSource.closurePersistence.postMergeMainCi.sourceCommit='f'.repeat(40);
    expect(classify(workflowRun,jobs,wrongSource).decision).toBe('BLOCK');
  });
  it('dispatches exactly once, polls the exact run and fails closed on changed main or invisible events',()=>{
    const source='a'.repeat(40),base='b'.repeat(40),merged='c'.repeat(40),head='d'.repeat(40);
    let state:any=createPendingParentMainCiState({state:{
      parentTransactionId:'DEV-PARENT',executionSourceCommit:source,closureComplete:true,
      closedReceipt:{decision:'PASS',truthStatus:'VERIFIED',parentTransactionId:'DEV-PARENT'},
      units:[{state:'CLOSED',closeReceipt:{decision:'PASS'}}],
      closurePersistence:{contract:'shoporation.release-parent-closure-persistence.v1',state:'PR_OPEN',prNumber:1138,headSha:head,branch:'release-execution/closure/dev-parent',baseSha:base},
    },sourceCommit:source,mergedMainSha:merged});
    const nonce=state.closurePersistence.postMergeMainCi.nonce;
    const pr:any={state:'closed',merged:true,number:1138,head:{sha:head,ref:'release-execution/closure/dev-parent'},
      base:{sha:base,ref:'main'},merge_commit_sha:merged,merged_by:{login:'github-actions[bot]'},merged_at:'2026-10-08T20:00:00Z'};
    const ciRun:any={id:991,run_attempt:1,name:nonce,path:'.github/workflows/ci.yml',event:'workflow_dispatch',head_sha:merged,
      head_branch:'main',display_title:nonce,actor:{login:'github-actions[bot]'},status:'queued',conclusion:null,
      created_at:'2026-10-08T20:05:00Z',updated_at:'2026-10-08T20:05:00Z'};
    const steps=['Bind exact parent post-merge main CI','Knowledge Before Build preflight','Incremental Known Failure Replay','Quality tests','TypeScript check','Production build'].map(name=>({name,status:'completed',conclusion:'success'}));
    const jobs:any=[{name:'build',status:'completed',conclusion:'success',steps},{name:'security-audit',status:'completed',conclusion:'success'}];
    let dispatches=0,listing:any[]=[],main=merged;
    const fake=(command:string,args:string[])=>{
      if(command==='gh'&&args[0]==='repo')return 'owner/repo';
      if(command==='gh'&&args[0]==='api'&&args[1]==='repos/owner/repo/pulls/1138')return JSON.stringify(pr);
      if(command==='git'&&args[0]==='ls-remote')return main+'\trefs/heads/main';
      if(command==='gh'&&args[0]==='run'&&args[1]==='list')return JSON.stringify(listing);
      if(command==='gh'&&args[0]==='workflow'&&args[1]==='run'){
        dispatches+=1;expect(args).toContain('parent_post_merge_sha='+merged);expect(args).toContain('parent_post_merge_nonce='+nonce);
        expect(args).not.toContain('release_unit_proof=true');return 'https://github.com/owner/repo/actions/runs/991';
      }
      if(command==='gh'&&args[0]==='api'&&args[1]==='repos/owner/repo/actions/runs/991')return JSON.stringify(ciRun);
      if(command==='gh'&&args[0]==='api'&&args[1]==='repos/owner/repo/actions/runs/991/jobs?per_page=100')return JSON.stringify({jobs});
      throw Error('unexpected '+command+' '+args.join(' '));
    };
    const reserved=advanceParentPostMergeMainCi({state,sourceCommit:source,run:fake});
    expect(reserved).toMatchObject({decision:'DISPATCH_ARMED',reason:'PARENT_POST_MERGE_MAIN_CI_DISPATCH_RESERVED',
      state:{closurePersistence:{postMergeMainCi:{status:'DISPATCH_ARMED',runId:null}}}});
    expect(dispatches).toBe(0);
    // Simulates the driver's successful CAS of reserved.state before the
    // external call; dispatch is not allowed from the old uncommitted state.
    const first=dispatchArmedParentMainCi({state:reserved.state,sourceCommit:source,run:fake});
    expect(first).toMatchObject({decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_DISPATCHED',
      state:{closurePersistence:{postMergeMainCi:{status:'DISPATCH_REQUESTED',runId:991}}}});
    expect(dispatches).toBe(1);state=first.state;
    const waiting=advanceParentPostMergeMainCi({state,sourceCommit:source,run:fake});
    expect(waiting.decision).toBe('PENDING');expect(dispatches).toBe(1);
    state=waiting.state;ciRun.status='completed';ciRun.conclusion='success';ciRun.updated_at='2026-10-08T20:09:00Z';
    const closed=advanceParentPostMergeMainCi({state,sourceCommit:source,run:fake});
    expect(closed).toMatchObject({decision:'PARENT_CLOSED',state:{closurePersistence:{state:'MERGED',postMergeMainCi:{decision:'PASS',runId:991}}}});
    expect(dispatches).toBe(1);
    main='f'.repeat(40);
    expect(advanceParentPostMergeMainCi({state:first.state,sourceCommit:source,run:fake})).toMatchObject({decision:'BLOCK',reason:'RELEASE_PARENT_POST_MERGE_MAIN_DRIFT'});
    main=merged;
    const resumed=structuredClone(first.state);resumed.closurePersistence.postMergeMainCi.runId=null;
    listing=[{databaseId:991,status:'completed',conclusion:'success',headSha:merged,headBranch:'main',
      event:'workflow_dispatch',workflowName:'CI',displayTitle:nonce}];
    expect(advanceParentPostMergeMainCi({state:resumed,sourceCommit:source,run:fake}).decision).toBe('PARENT_CLOSED');
    listing=[];
    expect(advanceParentPostMergeMainCi({state:resumed,sourceCommit:source,run:fake})).toMatchObject({decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_DISPATCH_UNCERTAIN'});
    expect(dispatches).toBe(1);
    const claimedButNotDispatched=advanceParentPostMergeMainCi({state:reserved.state,sourceCommit:source,run:fake});
    expect(claimedButNotDispatched).toMatchObject({decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_DISPATCH_UNCERTAIN'});
    expect(dispatches).toBe(1);
    const driver=readFileSync('scripts/release-unit-execute.mjs','utf8');
    const durable=driver.indexOf("const saved=persistRemoteExecutionState({state:result.state,stateRef,expectedStateCommit:loaded.stateCommit})");
    const sideEffect=driver.indexOf('const dispatched=dispatchArmedParentMainCi({state:loaded.state,sourceCommit:source})');
    expect(durable).toBeGreaterThan(0);
    expect(sideEffect).toBeGreaterThan(durable); // Persist reservation before dispatch
  });

  it('does not redispatch after GitHub accepted the event but the process crashed before persisting its run ID',()=>{
    const source='a'.repeat(40),merged='c'.repeat(40),head='d'.repeat(40),base='b'.repeat(40);
    const state:any=createPendingParentMainCiState({state:{
      parentTransactionId:'DEV-PARENT',executionSourceCommit:source,closureComplete:true,
      closedReceipt:{decision:'PASS',truthStatus:'VERIFIED',parentTransactionId:'DEV-PARENT'},
      units:[{state:'CLOSED',closeReceipt:{decision:'PASS'}}],
      closurePersistence:{contract:'shoporation.release-parent-closure-persistence.v1',state:'PR_OPEN',
        prNumber:1138,headSha:head,branch:'release-execution/closure/dev-parent',baseSha:base},
    },sourceCommit:source,mergedMainSha:merged});
    const pr:any={state:'closed',merged:true,number:1138,head:{sha:head,ref:'release-execution/closure/dev-parent'},
      base:{sha:base,ref:'main'},merge_commit_sha:merged,merged_by:{login:'github-actions[bot]'},merged_at:'2026-10-08T20:00:00Z'};
    let requests=0,visible=false,main=merged;
    const nonce=state.closurePersistence.postMergeMainCi.nonce;
    const runInfo:any={id:911,name:nonce,path:'.github/workflows/ci.yml',event:'workflow_dispatch',
      head_sha:merged,head_branch:'main',display_title:nonce,actor:{login:'github-actions[bot]'},
      status:'queued',conclusion:null,created_at:'2026-10-08T20:05:00Z'};
    const invoke=(command:string,args:string[])=>{
      if(command==='gh'&&args[0]==='repo')return 'owner/repo';
      if(command==='gh'&&args[0]==='api'&&args[1].endsWith('/pulls/1138'))return JSON.stringify(pr);
      if(command==='git'&&args[0]==='ls-remote')return main+'\trefs/heads/main';
      if(command==='gh'&&args[0]==='run'&&args[1]==='list')return JSON.stringify(visible?
        [{databaseId:911,displayTitle:nonce,headSha:merged,headBranch:'main',event:'workflow_dispatch'}]:[]);
      if(command==='gh'&&args[0]==='api'&&args[1].endsWith('/actions/runs/911'))return JSON.stringify(runInfo);
      if(command==='gh'&&args[0]==='workflow'&&args[1]==='run'){
        requests+=1;
        // Simulate server accepted the dispatch then the caller's transport
        // failed before returning any run-ID or persisting a response.
        throw new Error('TRANSPORT_DROPPED_AFTER_GITHUB_ACCEPTED');
      }
      throw Error('unexpected '+command+' '+args.join(' '));
    };
    const first=advanceParentPostMergeMainCi({state,sourceCommit:source,run:invoke});
    expect(first.decision).toBe('DISPATCH_ARMED');
    const durablyReserved=first.state;
    expect(()=>dispatchArmedParentMainCi({state:durablyReserved,sourceCommit:source,run:invoke})).toThrow('TRANSPORT_DROPPED_AFTER_GITHUB_ACCEPTED');
    expect(requests).toBe(1);
    // A restarted executor is handed only the durable reservation. Empty
    // eventual-consistency listing MUST NOT authorize a second dispatch.
    const resumed=advanceParentPostMergeMainCi({state:durablyReserved,sourceCommit:source,run:invoke});
    expect(resumed).toMatchObject({decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_DISPATCH_UNCERTAIN'});
    expect(resumed.details.operatorReviewRequired).toBe(true);
    expect(requests).toBe(1);
    visible=true;
    const observed=advanceParentPostMergeMainCi({state:durablyReserved,sourceCommit:source,run:invoke});
    expect(observed).toMatchObject({decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_PENDING'});
    expect(requests).toBe(1);
    main='f'.repeat(40);
    expect(advanceParentPostMergeMainCi({state:durablyReserved,sourceCommit:source,run:invoke})).toMatchObject({decision:'BLOCK',reason:'RELEASE_PARENT_POST_MERGE_MAIN_DRIFT'});
    expect(requests).toBe(1);
  });

});
