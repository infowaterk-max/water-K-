// @ts-nocheck
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {applyReleaseUnitEvent,createReleaseParentExecution,recordReleaseParentClosure} from '../scripts/lib/shoperation-release-unit-runtime.mjs';
import {needsFreshReleaseUnitReevaluation,reconcileExactMaterializedCommit,releaseUnitCommitMessage,runSuccessorReevaluationPlan,runSuccessorReevaluationProjection} from '../scripts/release-unit-github-runtime.mjs';

const A='a'.repeat(40);
const manifest={
  contract:'shoporation.release-unit-manifest.v1',decision:'PASS',releaseUnitId:'DEV-NOCODE-U01',order:1,
  transaction:{id:'DEV-NOCODE',parentTransactionId:'DEV-NOCODE',sourceRef:'PO-NOCODE'},targetBaseSha:A,
  lease:{expectedBaseSha:A,failOnDrift:true,reconciled:true,reconciledFromSha:null},
  intendedFiles:['scripts/already.mjs'],operations:[{operation:'modify',file:'scripts/already.mjs'}],requiredDependencyFiles:[],
  authorities:['release-infrastructure'],subsystems:['release-infrastructure'],
  projectedRisk:{decision:'PASS',score:1,maxPoints:5,subsystems:[],violations:[]},
  requiredGates:['GUARD-EDIT-TIME','GUARD-QUALITY-TESTS'],
  requiredEvidence:{gateIds:['GUARD-EDIT-TIME','GUARD-QUALITY-TESTS'],proofFiles:[],externalGateIds:[]},
  forbiddenPaths:[],readOnlyPaths:[],generatedArtifactSemantics:[],prerequisites:[],predecessorUnits:[],
  expectedPostUnitState:{filesPresent:['scripts/already.mjs'],filesAbsent:[]},
  reconciliationPolicy:{mode:'merged-main-sequential',requireExactMainLease:true,requirePredecessorReceipts:false,requiresReconciliationAfterPredecessor:false,failOnUnrelatedMainDrift:true},
  sourceIdentity:{sourceCommit:'source',sealed:true},manifestDigest:'manifest-1',
  childDevelopmentTransaction:{contract:'shoporation.release-unit-child-transaction.v1',taskId:'DEV-NOCODE-U01-TX',planDigest:'plan-1',operationDigest:'op-1',bindingDigest:'binding-1',plan:{taskId:'DEV-NOCODE-U01-TX'}},
};
const context={parentTransactionId:'DEV-NOCODE',releaseUnitId:'DEV-NOCODE-U01',manifestDigest:'manifest-1',childPlanDigest:'plan-1',bindingDigest:'binding-1'};
const truth={contract:'shoporation.completion-truth.v2',taskId:'DEV-NOCODE-U01-TX',decision:'PASS',truthStatus:'VERIFIED',internalState:'VERIFIED_DONE',releaseUnitContext:context,currentExactState:{head:A}};
const lifecycle={taskId:'DEV-NOCODE-U01-TX',status:'closed',releaseUnitContext:context,lifecycle:{state:'LEARN',truthStatus:'VERIFIED',verifiedImplementationHead:A}};

const materialized=(alreadyApplied=[{operation:'modify',file:'scripts/already.mjs'}])=>({
  contract:'shoporation.release-unit-materialization.v1',status:'ALREADY_APPLIED',releaseUnitId:manifest.releaseUnitId,
  targetBaseSha:A,commitSha:null,materializedHeadSha:A,manifestDigest:'manifest-1',bindingDigest:'binding-1',
  sourceCommit:'source',applied:[],alreadyApplied,
});

describe('Control Plane production release surface',()=>{
  it('keeps source CI read-only and moves write authority to a default-branch workflow_run executor',()=>{
    const ci=readFileSync('.github/workflows/ci.yml','utf8');
    const executor=readFileSync('.github/workflows/release-unit-execution.yml','utf8');
    expect(ci).toContain("- 'release-execution/source/**'");
    expect(ci).toContain('contents: read');
    expect(ci).not.toContain('contents: write');
    expect(executor).toContain('workflow_run:');
    expect(executor).toContain("github.event.workflow_run.event == 'push'");
    expect(executor).toContain("startsWith(github.event.workflow_run.head_branch, 'release-execution/source/')");
    expect(executor).toContain('Checkout trusted default-branch executor');
    expect(executor).toContain('ref: main');
    expect(executor).toContain('contents: write');
    expect(executor).toContain('pull-requests: write');
    expect(executor).toContain('git show "$SOURCE_SHA:quality/development/active-plan.json"');
    expect(executor).toContain('Recompute trusted Knowledge/Atlas evidence for exact source');
    expect(executor).toContain('node scripts/shoperation-knowledge-preflight.mjs');
    expect(executor).toContain("SHOPERATION_ACTIVE_PLAN: artifacts/release-execution/source-plan.json");
    expect(executor).toContain("DEVELOPMENT_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}");
    expect(executor).toContain("QUALITY_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}");
    expect(executor).toContain("GH_TOKEN: ''");
    expect(executor).toContain("GITHUB_TOKEN: ''");
    expect(executor).toContain('shoperation-plan-before-code.mjs --check');
    expect(executor).toContain('release-risk-budget.mjs');
    expect(executor).toContain('release-unit-execute.mjs');
    const fetchSource=executor.indexOf('Fetch source revision as data');
    const trustedKnowledge=executor.indexOf('Recompute trusted Knowledge/Atlas evidence for exact source');
    const trustedPlan=executor.indexOf('Recompute canonical source plan with trusted executor');
    const trustedRisk=executor.indexOf('Recompute canonical Release Risk with trusted executor');
    const driver=executor.indexOf('Drive canonical release-unit execution');
    expect(fetchSource).toBeGreaterThanOrEqual(0);
    expect(trustedKnowledge).toBeGreaterThan(fetchSource);
    expect(trustedPlan).toBeGreaterThan(trustedKnowledge);
    expect(trustedRisk).toBeGreaterThan(trustedPlan);
    expect(driver).toBeGreaterThan(trustedRisk);
    expect(ci).toContain("RELEASE_EXECUTION_SOURCE_ADMISSION: ${{ github.event_name == 'push' && startsWith(github.ref_name, 'release-execution/source/') }}");
    expect(ci).toContain('Development lifecycle closure: DEFERRED_TO_RELEASE_UNIT_EXECUTOR');
    expect(ci).toContain('DEV_LIFECYCLE_CLOSE_REQUIRED: exact-head Truth is VERIFIED');
    expect(ci).toContain('LIFECYCLE_OUTCOME: ${{ steps.lifecycle-closure.outcome }}');
    expect(ci).toContain('DEV_LIFECYCLE_CLOSE_REQUIRED=artifacts/shoperation-development-guard/lifecycle-transition.json');
    expect(ci).toContain('codes="${codes}DEV_LIFECYCLE_CLOSE_REQUIRED;"');
  });

  it('closes a fully ALREADY_APPLIED unit at exact current main without a synthetic PR',()=>{
    let state=createReleaseParentExecution({contract:'shoporation.release-decomposition.v1',decision:'PASS',releaseUnits:[structuredClone(manifest)],ordering:{decision:'PASS'}});
    state=applyReleaseUnitEvent(state,{type:'AUTHORIZE',releaseUnitId:manifest.releaseUnitId,freshManifest:manifest,currentMainSha:A,allFreshManifests:[manifest]});
    state=applyReleaseUnitEvent(state,{type:'MATERIALIZED',releaseUnitId:manifest.releaseUnitId,receipt:materialized()});
    state=applyReleaseUnitEvent(state,{type:'ALREADY_APPLIED_VERIFIED',releaseUnitId:manifest.releaseUnitId,truth,lifecyclePlan:lifecycle,currentMainSha:A});
    const unit=state.units[0];
    expect(unit.state).toBe('CLOSED');
    expect(unit.pullRequest).toBeNull();
    expect(unit.merge.mergeMethod).toBe('already-applied');
    expect(unit.closeReceipt.noCode).toBe(true);
    expect(state.closureEligible).toBe(true);
    state=recordReleaseParentClosure(state,{
      truth:{contract:'shoporation.completion-truth.v2',taskId:'DEV-NOCODE',decision:'PASS',truthStatus:'VERIFIED',internalState:'VERIFIED_DONE',currentExactState:{head:A}},
      lifecyclePlan:{status:'closed',lifecycle:{state:'LEARN',truthStatus:'VERIFIED',verifiedImplementationHead:A}},
      currentMainSha:A,
    });
    expect(state.closureComplete).toBe(true);
  });

  it('rejects incomplete ALREADY_APPLIED operation coverage',()=>{
    let state=createReleaseParentExecution({contract:'shoporation.release-decomposition.v1',decision:'PASS',releaseUnits:[structuredClone(manifest)],ordering:{decision:'PASS'}});
    state=applyReleaseUnitEvent(state,{type:'AUTHORIZE',releaseUnitId:manifest.releaseUnitId,freshManifest:manifest,currentMainSha:A,allFreshManifests:[manifest]});
    state=applyReleaseUnitEvent(state,{type:'MATERIALIZED',releaseUnitId:manifest.releaseUnitId,receipt:materialized([])});
    expect(()=>applyReleaseUnitEvent(state,{type:'ALREADY_APPLIED_VERIFIED',releaseUnitId:manifest.releaseUnitId,truth,lifecyclePlan:lifecycle,currentMainSha:A})).toThrow(/RELEASE_UNIT_ALREADY_APPLIED_COVERAGE_MISMATCH/);
  });

  it('keeps parent lifecycle persistence on a separate non-triggering closure namespace',()=>{
    const helper=readFileSync('scripts/release-unit-parent-close.mjs','utf8');
    const driver=readFileSync('scripts/release-unit-execute.mjs','utf8');
    expect(helper).toContain('release-execution/closure/');
    expect(helper).toContain('recordReleaseParentClosure');
    expect(helper).toContain('RELEASE_PARENT_CLOSURE_MAIN_DRIFT');
    expect(driver).toContain("has('--drive')");
    expect(driver).toContain('finishParentClosurePersistence');
    expect(driver).toContain('expectedStateCommit:loaded.stateCommit');
  });

  it('reuses an exact pre-existing remote materialization on rerun without pushing a replacement commit',()=>{
    const remote='b'.repeat(40),prepared='d'.repeat(40),tree='c'.repeat(40);
    const branch='release-unit/dev-nocode-u01';
    const receipt={
      contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,
      targetBaseSha:A,commitSha:prepared,materializedHeadSha:prepared,treeSha:tree,
      manifestDigest:manifest.manifestDigest,bindingDigest:manifest.childDevelopmentTransaction.bindingDigest,
      sourceCommit:'source',applied:[{operation:'modify',file:'scripts/already.mjs'}],alreadyApplied:[],
    };
    const calls=[];
    const run=(command,args)=>{
      calls.push([command,...args].join(' '));
      if(command!=='git')throw new Error('unexpected command');
      if(args[0]==='ls-remote')return remote+'\trefs/heads/'+branch;
      if(args[0]==='fetch')return '';
      if(args[0]==='rev-parse'&&args[1]==='FETCH_HEAD')return remote;
      if(args[0]==='rev-list')return remote+' '+A;
      if(args[0]==='rev-parse'&&args[1]===remote+'^{tree}')return tree;
      if(args[0]==='show')return releaseUnitCommitMessage(manifest);
      if(args[0]==='push')throw new Error('unexpected push');
      throw new Error('unexpected git call: '+args.join(' '));
    };
    const reconciled=reconcileExactMaterializedCommit({manifest,receipt,branch,run,cwd:process.cwd()});
    expect(reconciled.materializedHeadSha).toBe(remote);
    expect(reconciled.commitSha).toBe(remote);
    expect(reconciled.reusedRemote).toBe(true);
    expect(calls.some(call=>call.startsWith('git push '))).toBe(false);
  });

  it('fails closed when an existing remote materialization tree does not match the prepared unit',()=>{
    const remote='b'.repeat(40),prepared='d'.repeat(40),tree='c'.repeat(40);
    const branch='release-unit/dev-nocode-u01';
    const receipt={
      contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,
      targetBaseSha:A,commitSha:prepared,materializedHeadSha:prepared,treeSha:tree,
      manifestDigest:manifest.manifestDigest,bindingDigest:manifest.childDevelopmentTransaction.bindingDigest,
      sourceCommit:'source',applied:[{operation:'modify',file:'scripts/already.mjs'}],alreadyApplied:[],
    };
    const run=(command,args)=>{
      if(command!=='git')throw new Error('unexpected command');
      if(args[0]==='ls-remote')return remote+'\trefs/heads/'+branch;
      if(args[0]==='fetch')return '';
      if(args[0]==='rev-parse'&&args[1]==='FETCH_HEAD')return remote;
      if(args[0]==='rev-list')return remote+' '+A;
      if(args[0]==='rev-parse'&&args[1]===remote+'^{tree}')return 'e'.repeat(40);
      throw new Error('unexpected git call: '+args.join(' '));
    };
    expect(()=>reconcileExactMaterializedCommit({manifest,receipt,branch,run,cwd:process.cwd()})).toThrow(/RELEASE_UNIT_REMOTE_BRANCH_TREE_DRIFT/);
  });

  it('treats the first successor Plan pass as non-authorizing structured projection',()=>{
    const worktree=mkdtempSync(join(tmpdir(),'release-unit-projection-test-'));
    try{
      const planPath=join(worktree,'artifacts','shoperation-development-guard','release-unit-reevaluation-plan.json');
      const reportDir=join(worktree,'artifacts','shoperation-development-guard');
      mkdirSync(reportDir,{recursive:true});
      writeFileSync(planPath,'{}\n');
      const projection={
        contract:'shoporation.release-unit-child-plan-projection.v1',
        guardDigest:'fresh',
        expectedSubsystems:['release-infrastructure'],
        expectedDomains:['DOMAIN-RELEASE'],
        expectedAuthorities:['release-infrastructure'],
        expectedKnownFailureIds:[],
        acknowledgedPoInstructionIds:[],
        acknowledgedNegativeKnowledgeIds:[],
        requiredGates:['GUARD-PLAN-BEFORE-CODE'],
        externalGateIds:[],
        semanticExecutionRoute:{
          request:'PO-TEST',authority:['release-infrastructure'],mustEdit:['scripts/a.mjs'],mayEdit:[],impactedReadOnly:[],mustCreate:[],forbidden:[],proof:['tests/a.test.ts'],unknown:[],plannedDeletions:[],plannedRenames:[],generatedArtifacts:[],
        },
      };
      const calls=[];
      const run=(command,args,options={})=>{
        calls.push({command,args,options});
        if(command===process.execPath){
          writeFileSync(join(reportDir,'plan-before-code.json'),JSON.stringify({decision:'BLOCK',childPlanProjection:projection})+'\n');
        }
        return '';
      };
      const result=runSuccessorReevaluationProjection({worktree,planPath,currentMainSha:A,candidateHead:'b'.repeat(40),run});
      expect(result.decision).toBe('PROJECTED');
      expect(result.report.decision).toBe('BLOCK');
      expect(result.projection.guardDigest).toBe('fresh');
      expect(calls).toHaveLength(2);
      expect(calls[0].command).toBe('npm');
      expect(calls[1].command).toBe(process.execPath);
      expect(calls[1].args).toEqual(['scripts/shoperation-plan-before-code.mjs']);
      expect(calls[1].args).not.toContain('--check');
      expect(calls[0].options.env.GH_TOKEN).toBe('');
      expect(calls[1].options.env.GITHUB_TOKEN).toBe('');
    }finally{
      rmSync(worktree,{recursive:true,force:true});
    }
  });

  it('orders projection, child reprojection and strict Plan check before successor authorization',()=>{
    const runtime=readFileSync('scripts/release-unit-github-runtime.mjs','utf8');
    const start=runtime.indexOf('export function reevaluateSuccessorManifest');
    const body=runtime.slice(start,runtime.indexOf('export function needsFreshReleaseUnitReevaluation',start));
    const projection=body.indexOf('runSuccessorReevaluationProjection');
    const reprojection=body.indexOf('reprojectReleaseUnitChildTransaction(reconciled');
    const strict=body.indexOf('runSuccessorReevaluationPlan({worktree,planPath,currentMainSha,candidateHead,run,install:false})');
    const pass=body.indexOf("return{decision:'PASS',manifest:refreshed");
    expect(projection).toBeGreaterThanOrEqual(0);
    expect(reprojection).toBeGreaterThan(projection);
    expect(strict).toBeGreaterThan(reprojection);
    expect(pass).toBeGreaterThan(strict);
    expect(body).toContain("projectionResult.decision!=='PROJECTED'");
    expect(body).toContain("report.decision!=='PASS'");
  });

  it('emits current child projection metadata from the canonical Plan computation',()=>{
    const plan=readFileSync('scripts/shoperation-plan-before-code.mjs','utf8');
    expect(plan).toContain("contract:'shoporation.release-unit-child-plan-projection.v1'");
    expect(plan).toContain('expectedSubsystems:[...projectedSubsystems]');
    expect(plan).toContain('acknowledgedNegativeKnowledgeIds:[...projectedNegative]');
    expect(plan).toContain('requiredGates:[...(gateChain.orderedGateIds??[])]');
    expect(plan).toContain('semanticExecutionRoute:{');
    expect(plan).toContain('childPlanProjection,');
  });

  it('bootstraps exact locked reevaluation dependencies before semantic Plan and scrubs write tokens',()=>{
    const calls=[];
    const candidate='b'.repeat(40);
    const run=(command,args,options={})=>{
      calls.push({command,args,options});
      return '';
    };
    const result=runSuccessorReevaluationPlan({
      worktree:'/tmp/release-unit-reevaluation',
      planPath:'/tmp/release-unit-reevaluation/artifacts/plan.json',
      currentMainSha:A,
      candidateHead:candidate,
      run,
    });
    expect(result.decision).toBe('PASS');
    expect(calls).toHaveLength(2);
    expect(calls[0].command).toBe('npm');
    expect(calls[0].args).toEqual(['ci','--ignore-scripts','--no-audit','--no-fund']);
    expect(calls[0].options.cwd).toBe('/tmp/release-unit-reevaluation');
    expect(calls[0].options.env.GH_TOKEN).toBe('');
    expect(calls[0].options.env.GITHUB_TOKEN).toBe('');
    expect(calls[1].command).toBe(process.execPath);
    expect(calls[1].args).toEqual(['scripts/shoperation-plan-before-code.mjs','--check']);
    expect(calls[1].options.env.SHOPERATION_ACTIVE_PLAN).toContain('artifacts/plan.json');
    expect(calls[1].options.env.DEVELOPMENT_BASE_SHA).toBe(A);
    expect(calls[1].options.env.DEVELOPMENT_HEAD_SHA).toBe(candidate);
    expect(calls[1].options.env.GH_TOKEN).toBe('');
    expect(calls[1].options.env.GITHUB_TOKEN).toBe('');
  });

  it('fails closed before semantic Plan when reevaluation dependency bootstrap fails',()=>{
    const calls=[];
    const run=(command,args,options={})=>{
      calls.push({command,args,options});
      if(command==='npm'){
        const error=new Error('npm ci failed');
        error.stderr='locked install failed';
        throw error;
      }
      throw new Error('semantic Plan must not run after bootstrap failure');
    };
    const result=runSuccessorReevaluationPlan({
      worktree:'/tmp/release-unit-reevaluation',
      planPath:'/tmp/release-unit-reevaluation/artifacts/plan.json',
      currentMainSha:A,
      candidateHead:'b'.repeat(40),
      run,
    });
    expect(result.decision).toBe('BLOCK');
    expect(result.code).toBe('RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK');
    expect(result.error).toContain('locked install failed');
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('npm');
  });

  it('keeps real semantic reevaluation failures fail-closed after dependency bootstrap succeeds',()=>{
    const calls=[];
    const run=(command,args,options={})=>{
      calls.push({command,args,options});
      if(command==='npm')return '';
      const error=new Error('semantic reevaluation blocked');
      error.stderr='PLAN_REEVALUATION_BLOCK';
      throw error;
    };
    const result=runSuccessorReevaluationPlan({
      worktree:'/tmp/release-unit-reevaluation',
      planPath:'/tmp/release-unit-reevaluation/artifacts/plan.json',
      currentMainSha:A,
      candidateHead:'b'.repeat(40),
      run,
    });
    expect(result.decision).toBe('BLOCK');
    expect(result.code).toBe('RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK');
    expect(result.error).toContain('PLAN_REEVALUATION_BLOCK');
    expect(calls).toHaveLength(2);
  });

  it('forces fresh semantic reevaluation for STALE even when order and base would otherwise look current',()=>{
    expect(needsFreshReleaseUnitReevaluation({state:'STALE',order:1,manifest:{targetBaseSha:A}},A)).toBe(true);
    expect(needsFreshReleaseUnitReevaluation({state:'PLANNED',order:1,manifest:{targetBaseSha:A}},A)).toBe(false);
    expect(needsFreshReleaseUnitReevaluation({state:'PLANNED',order:1,manifest:{targetBaseSha:'b'.repeat(40)}},A)).toBe(true);
    expect(needsFreshReleaseUnitReevaluation({state:'PLANNED',order:2,manifest:{targetBaseSha:A}},A)).toBe(true);
  });

  it('re-authorizes a persisted STALE unit only through the normal fresh reconciliation event path',()=>{
    let state=createReleaseParentExecution({contract:'shoporation.release-decomposition.v1',decision:'PASS',releaseUnits:[structuredClone(manifest)],ordering:{decision:'PASS'}});
    state.units[0].state='STALE';
    state.units[0].blocker={code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK',details:{error:'prior transient proof environment failure'}};
    state.units[0].lastTransition={to:'STALE',code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK'};
    const next=applyReleaseUnitEvent(state,{
      type:'AUTHORIZE',
      releaseUnitId:manifest.releaseUnitId,
      freshManifest:structuredClone(manifest),
      currentMainSha:A,
      allFreshManifests:[structuredClone(manifest)],
    });
    expect(next.units[0].state).toBe('READY');
    expect(next.units[0].blocker).toBeNull();
    expect(next.units[0].authorization.currentMainSha).toBe(A);
    expect(next.units[0].lastTransition.code).toBe('RELEASE_UNIT_AUTHORIZED');
  });

  it('keeps BLOCKED and FAILED units outside automatic fresh reconciliation',()=>{
    for(const blockedState of ['BLOCKED','FAILED']){
      const state=createReleaseParentExecution({contract:'shoporation.release-decomposition.v1',decision:'PASS',releaseUnits:[structuredClone(manifest)],ordering:{decision:'PASS'}});
      state.units[0].state=blockedState;
      state.units[0].blocker={code:'POLICY_BLOCK',details:{}};
      expect(()=>applyReleaseUnitEvent(state,{
        type:'AUTHORIZE',
        releaseUnitId:manifest.releaseUnitId,
        freshManifest:structuredClone(manifest),
        currentMainSha:A,
        allFreshManifests:[structuredClone(manifest)],
      })).toThrow(/RELEASE_UNIT_RECONCILIATION_STATE_INVALID/);
    }
  });

  it('dispatches only PLANNED or STALE units into driver preparation',()=>{
    const driver=readFileSync('scripts/release-unit-execute.mjs','utf8');
    expect(driver.match(/\['PLANNED','STALE'\]\.includes\(active\?\.state\)/g)?.length).toBe(2);
    expect(driver).not.toContain("['PLANNED','STALE','BLOCKED']");
    expect(driver).not.toContain("['PLANNED','STALE','FAILED']");
  });

  it('scrubs write tokens from proof subprocesses',()=>{
    const runtime=readFileSync('scripts/release-unit-github-runtime.mjs','utf8');
    const core=readFileSync('scripts/lib/shoperation-release-unit-runtime.mjs','utf8');
    const parent=readFileSync('scripts/release-unit-parent-close.mjs','utf8');
    expect(runtime).toContain("GH_TOKEN:''");
    expect(runtime).toContain("GITHUB_TOKEN:''");
    expect(core).toContain("GH_TOKEN:'',GITHUB_TOKEN:''");
    expect(parent).toContain("GH_TOKEN:'',GITHUB_TOKEN:''");
  });
});
