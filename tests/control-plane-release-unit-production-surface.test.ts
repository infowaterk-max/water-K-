// @ts-nocheck
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {applyReleaseUnitEvent,createReleaseParentExecution,recordReleaseParentClosure} from '../scripts/lib/shoperation-release-unit-runtime.mjs';
import {materializationSupersedingBranch,needsFreshReleaseUnitReevaluation,proveTrustedMainAdvance,reconcileExactMaterializedCommit,reconcileMaterializationBranch,releaseUnitCommitMessage,runSuccessorReevaluationPlan,runSuccessorReevaluationProjection} from '../scripts/release-unit-github-runtime.mjs';

const A='a'.repeat(40),B='b'.repeat(40);
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
  it('dispatches bot-created child proof explicitly and surfaces terminal CI without poll-timeout masking',()=>{
    const ci=readFileSync('.github/workflows/ci.yml','utf8');
    const runtime=readFileSync('scripts/release-unit-github-runtime.mjs','utf8');
    const context=readFileSync('scripts/release-unit-ci-context.mjs','utf8');
    expect(ci).toContain('workflow_dispatch:');
    expect(ci).toContain('release_unit_proof:');
    expect(ci).toContain('release_unit_head_sha:');
    expect(ci).toContain('SHOPERATION_CI_RELEASE_UNIT_PROOF:');
    expect(ci).toContain('SHOPERATION_CI_HEAD_SHA:');
    expect(ci).toContain('pull-requests: read');
    expect(context).toContain('resolveReleaseUnitCiPullRequest');
    expect(context).toContain('RELEASE_UNIT_DISPATCH_PR_REPOSITORY_MISMATCH');
    expect(context).toContain('RELEASE_UNIT_DISPATCH_PR_HEAD_MISMATCH');
    expect(runtime).toContain('ensureExactChildProofDispatch');
    expect(runtime).toContain("'workflow','run','ci.yml'");
    expect(runtime).toContain("'release_unit_proof=true'");
    expect(runtime).toContain('RELEASE_UNIT_CHILD_CI_');
    expect(runtime).toContain("if(proof.decision==='BLOCK')");
    expect(runtime).toContain("state:'STALE'");
  });

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
    expect(executor).toContain("permissions:\n  contents: read\n  actions: read");
    expect(executor).toContain("permissions:\n      contents: write\n      pull-requests: write\n      actions: write");
    expect(ci).not.toContain('actions: write');
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

  it('derives one deterministic superseding branch from fresh base and binding identity',()=>{
    const fresh={...structuredClone(manifest),targetBaseSha:'2'.repeat(40),childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),bindingDigest:'b'.repeat(64)}};
    const branch=materializationSupersedingBranch({baseBranch:'release-unit/dev-nocode-u01',manifest:fresh});
    expect(branch).toBe('release-unit/dev-nocode-u01-supersede-'+('2'.repeat(12))+'-'+('b'.repeat(16)));
    expect(materializationSupersedingBranch({baseBranch:'release-unit/dev-nocode-u01',manifest:fresh})).toBe(branch);
  });

  it('preserves an exact prior canonical branch and pushes fresh materialization only to its deterministic superseding branch',()=>{
    const oldBase='1'.repeat(40),freshBase='2'.repeat(40),oldRemote='3'.repeat(40),prepared='4'.repeat(40),oldTree='5'.repeat(40),freshTree='6'.repeat(40);
    const baseBranch='release-unit/dev-nocode-u01';
    const priorManifest={
      ...structuredClone(manifest),targetBaseSha:oldBase,manifestDigest:'old-manifest',
      sourceIdentity:{sourceCommit:'source',sealed:true},
      childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),planDigest:'old-plan',bindingDigest:'a'.repeat(64)},
    };
    const freshManifest={
      ...structuredClone(manifest),targetBaseSha:freshBase,manifestDigest:'fresh-manifest',
      sourceIdentity:{sourceCommit:'source',sealed:true},
      childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),planDigest:'fresh-plan',bindingDigest:'b'.repeat(64)},
    };
    const priorReceipt={
      contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:oldBase,
      commitSha:'7'.repeat(40),materializedHeadSha:'7'.repeat(40),treeSha:oldTree,manifestDigest:'old-manifest',bindingDigest:'a'.repeat(64),
      sourceCommit:'source',applied:[{operation:'modify',file:'scripts/already.mjs'}],alreadyApplied:[],
    };
    const freshReceipt={
      contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:freshBase,
      commitSha:prepared,materializedHeadSha:prepared,treeSha:freshTree,manifestDigest:'fresh-manifest',bindingDigest:'b'.repeat(64),
      sourceCommit:'source',applied:[{operation:'modify',file:'scripts/already.mjs'}],alreadyApplied:[],
    };
    const superseding=materializationSupersedingBranch({baseBranch,manifest:freshManifest});
    const calls=[];
    const run=(command,args)=>{
      calls.push([command,...args].join(' '));
      if(command!=='git')throw new Error('unexpected command');
      if(args[0]==='ls-remote'){
        const ref=args[2];
        if(ref==='refs/heads/'+baseBranch)return oldRemote+'\t'+ref;
        if(ref==='refs/heads/'+superseding)return '';
      }
      if(args[0]==='fetch')return '';
      if(args[0]==='rev-parse'&&args[1]==='FETCH_HEAD')return oldRemote;
      if(args[0]==='rev-list')return oldRemote+' '+oldBase;
      if(args[0]==='rev-parse'&&args[1]===oldRemote+'^{tree}')return oldTree;
      if(args[0]==='show')return releaseUnitCommitMessage(priorManifest);
      if(args[0]==='push')return '';
      throw new Error('unexpected git call: '+args.join(' '));
    };
    const result=reconcileMaterializationBranch({
      priorExecution:{manifest:priorManifest,executionTransaction:{branchRef:baseBranch}},
      manifest:freshManifest,receipt:freshReceipt,branch:baseBranch,sourceCommit:'source',run,
      materialize:({manifest:received,targetRef})=>{
        expect(received).toEqual(priorManifest);
        expect(targetRef).toBe(oldBase);
        return priorReceipt;
      },
    });
    expect(result.branch).toBe(superseding);
    expect(result.receipt.materializedHeadSha).toBe(prepared);
    expect(result.receipt.branchRef).toBe(superseding);
    expect(result.receipt.supersedes.branchRef).toBe(baseBranch);
    expect(result.receipt.supersedes.headSha).toBe(oldRemote);
    expect(calls.some(call=>call.includes('push --quiet origin '+prepared+':refs/heads/'+superseding))).toBe(true);
    expect(calls.some(call=>call.includes('--force'))).toBe(false);
    expect(calls.some(call=>call.includes(' --delete ')||/git push(?:\s+--quiet)?\s+origin\s+:refs\/heads\//.test(call))).toBe(false);
  });

  it('reuses an exact deterministic superseding branch on retry without pushing',()=>{
    const oldBase='1'.repeat(40),freshBase='2'.repeat(40),oldRemote='3'.repeat(40),freshRemote='4'.repeat(40),oldTree='5'.repeat(40),freshTree='6'.repeat(40);
    const baseBranch='release-unit/dev-nocode-u01';
    const priorManifest={
      ...structuredClone(manifest),targetBaseSha:oldBase,manifestDigest:'old-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},
      childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),planDigest:'old-plan',bindingDigest:'a'.repeat(64)},
    };
    const freshManifest={
      ...structuredClone(manifest),targetBaseSha:freshBase,manifestDigest:'fresh-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},
      childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),planDigest:'fresh-plan',bindingDigest:'b'.repeat(64)},
    };
    const priorReceipt={contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:oldBase,commitSha:'7'.repeat(40),materializedHeadSha:'7'.repeat(40),treeSha:oldTree,manifestDigest:'old-manifest',bindingDigest:'a'.repeat(64),sourceCommit:'source',applied:[],alreadyApplied:[]};
    const freshReceipt={contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:freshBase,commitSha:'8'.repeat(40),materializedHeadSha:'8'.repeat(40),treeSha:freshTree,manifestDigest:'fresh-manifest',bindingDigest:'b'.repeat(64),sourceCommit:'source',applied:[],alreadyApplied:[]};
    const superseding=materializationSupersedingBranch({baseBranch,manifest:freshManifest});
    let fetchHead=null;const calls=[];
    const run=(command,args)=>{
      calls.push([command,...args].join(' '));
      if(command!=='git')throw new Error('unexpected command');
      if(args[0]==='ls-remote'){
        const ref=args[2];
        if(ref==='refs/heads/'+baseBranch)return oldRemote+'\t'+ref;
        if(ref==='refs/heads/'+superseding)return freshRemote+'\t'+ref;
      }
      if(args[0]==='fetch'){fetchHead=args[3]==='refs/heads/'+baseBranch?oldRemote:freshRemote;return '';}
      if(args[0]==='rev-parse'&&args[1]==='FETCH_HEAD')return fetchHead;
      if(args[0]==='rev-list'&&args.at(-1)===oldRemote)return oldRemote+' '+oldBase;
      if(args[0]==='rev-list'&&args.at(-1)===freshRemote)return freshRemote+' '+freshBase;
      if(args[0]==='rev-parse'&&args[1]===oldRemote+'^{tree}')return oldTree;
      if(args[0]==='rev-parse'&&args[1]===freshRemote+'^{tree}')return freshTree;
      if(args[0]==='show'&&args.at(-1)===oldRemote)return releaseUnitCommitMessage(priorManifest);
      if(args[0]==='show'&&args.at(-1)===freshRemote)return releaseUnitCommitMessage(freshManifest);
      if(args[0]==='push')throw new Error('unexpected push');
      throw new Error('unexpected git call: '+args.join(' '));
    };
    const result=reconcileMaterializationBranch({
      priorExecution:{manifest:priorManifest,executionTransaction:{branchRef:baseBranch}},
      manifest:freshManifest,receipt:freshReceipt,branch:baseBranch,sourceCommit:'source',run,materialize:()=>priorReceipt,
    });
    expect(result.branch).toBe(superseding);
    expect(result.receipt.materializedHeadSha).toBe(freshRemote);
    expect(result.receipt.reusedRemote).toBe(true);
    expect(calls.some(call=>call.startsWith('git push '))).toBe(false);
  });

  it('fails closed when the occupied canonical branch is not the exact persisted prior materialization',()=>{
    const oldBase='1'.repeat(40),freshBase='2'.repeat(40),remote='3'.repeat(40),oldTree='5'.repeat(40),freshTree='6'.repeat(40),baseBranch='release-unit/dev-nocode-u01';
    const priorManifest={...structuredClone(manifest),targetBaseSha:oldBase,manifestDigest:'old-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),planDigest:'old-plan',bindingDigest:'a'.repeat(64)}};
    const freshManifest={...structuredClone(manifest),targetBaseSha:freshBase,manifestDigest:'fresh-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),planDigest:'fresh-plan',bindingDigest:'b'.repeat(64)}};
    const priorReceipt={contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:oldBase,commitSha:'7'.repeat(40),materializedHeadSha:'7'.repeat(40),treeSha:oldTree,manifestDigest:'old-manifest',bindingDigest:'a'.repeat(64),sourceCommit:'source',applied:[],alreadyApplied:[]};
    const freshReceipt={contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:freshBase,commitSha:'8'.repeat(40),materializedHeadSha:'8'.repeat(40),treeSha:freshTree,manifestDigest:'fresh-manifest',bindingDigest:'b'.repeat(64),sourceCommit:'source',applied:[],alreadyApplied:[]};
    const calls=[];
    const run=(command,args)=>{
      calls.push([command,...args].join(' '));
      if(args[0]==='ls-remote')return remote+'\trefs/heads/'+baseBranch;
      if(args[0]==='fetch')return '';
      if(args[0]==='rev-parse'&&args[1]==='FETCH_HEAD')return remote;
      if(args[0]==='rev-list')return remote+' '+oldBase;
      if(args[0]==='rev-parse'&&args[1]===remote+'^{tree}')return oldTree;
      if(args[0]==='show')return 'foreign materialization';
      if(args[0]==='push')throw new Error('push forbidden');
      throw new Error('unexpected git call: '+args.join(' '));
    };
    expect(()=>reconcileMaterializationBranch({
      priorExecution:{manifest:priorManifest,executionTransaction:{branchRef:baseBranch}},
      manifest:freshManifest,receipt:freshReceipt,branch:baseBranch,sourceCommit:'source',run,materialize:()=>priorReceipt,
    })).toThrow(/RELEASE_UNIT_PRIOR_REMOTE_BRANCH_NONCANONICAL/);
    expect(calls.some(call=>call.startsWith('git push '))).toBe(false);
  });

  it('resumes from a validated persisted superseding branch while deriving the next branch from the stable root',()=>{
    const priorBase='2'.repeat(40),freshBase='9'.repeat(40),priorRemote='3'.repeat(40),prepared='8'.repeat(40),priorTree='5'.repeat(40),freshTree='6'.repeat(40);
    const baseBranch='release-unit/dev-nocode-u01';
    const priorManifest={
      ...structuredClone(manifest),targetBaseSha:priorBase,manifestDigest:'prior-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},
      childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),planDigest:'prior-plan',bindingDigest:'b'.repeat(64)},
    };
    const freshManifest={
      ...structuredClone(manifest),targetBaseSha:freshBase,manifestDigest:'fresh-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},
      childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),planDigest:'fresh-plan',bindingDigest:'c'.repeat(64)},
    };
    const priorBranch=materializationSupersedingBranch({baseBranch,manifest:priorManifest});
    const nextBranch=materializationSupersedingBranch({baseBranch,manifest:freshManifest});
    expect(nextBranch).not.toContain(priorBranch+'-supersede-');
    const priorReceipt={contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:priorBase,commitSha:'7'.repeat(40),materializedHeadSha:'7'.repeat(40),treeSha:priorTree,manifestDigest:'prior-manifest',bindingDigest:'b'.repeat(64),sourceCommit:'source',applied:[],alreadyApplied:[]};
    const freshReceipt={contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:freshBase,commitSha:prepared,materializedHeadSha:prepared,treeSha:freshTree,manifestDigest:'fresh-manifest',bindingDigest:'c'.repeat(64),sourceCommit:'source',applied:[],alreadyApplied:[]};
    let fetched=null;const calls=[];
    const run=(command,args)=>{
      calls.push([command,...args].join(' '));
      if(command!=='git')throw new Error('unexpected command');
      if(args[0]==='ls-remote'){
        const ref=args[2];
        if(ref==='refs/heads/'+priorBranch)return priorRemote+'\t'+ref;
        if(ref==='refs/heads/'+nextBranch)return '';
        if(ref==='refs/heads/'+baseBranch)throw new Error('root branch must not replace persisted lineage validation');
      }
      if(args[0]==='fetch'){fetched=priorRemote;return '';}
      if(args[0]==='rev-parse'&&args[1]==='FETCH_HEAD')return fetched;
      if(args[0]==='rev-list'&&args.at(-1)===priorRemote)return priorRemote+' '+priorBase;
      if(args[0]==='rev-parse'&&args[1]===priorRemote+'^{tree}')return priorTree;
      if(args[0]==='show'&&args.at(-1)===priorRemote)return releaseUnitCommitMessage(priorManifest);
      if(args[0]==='push')return '';
      throw new Error('unexpected git call: '+args.join(' '));
    };
    const result=reconcileMaterializationBranch({
      priorExecution:{manifest:priorManifest,executionTransaction:{branchRef:priorBranch}},
      manifest:freshManifest,receipt:freshReceipt,branch:baseBranch,sourceCommit:'source',run,materialize:()=>priorReceipt,
    });
    expect(result.branch).toBe(nextBranch);
    expect(result.receipt.branchRef).toBe(nextBranch);
    expect(result.receipt.supersedes.branchRef).toBe(priorBranch);
    expect(result.receipt.supersedes.headSha).toBe(priorRemote);
    expect(calls.some(call=>call.includes('push --quiet origin '+prepared+':refs/heads/'+nextBranch))).toBe(true);
    expect(calls.some(call=>call.includes('--force'))).toBe(false);
  });

  it('fails closed when a persisted canonical prior superseding branch is missing remotely',()=>{
    const priorBase='2'.repeat(40),freshBase='9'.repeat(40),baseBranch='release-unit/dev-nocode-u01';
    const priorManifest={...structuredClone(manifest),targetBaseSha:priorBase,manifestDigest:'prior-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),bindingDigest:'b'.repeat(64)}};
    const freshManifest={...structuredClone(manifest),targetBaseSha:freshBase,manifestDigest:'fresh-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),bindingDigest:'c'.repeat(64)}};
    const priorBranch=materializationSupersedingBranch({baseBranch,manifest:priorManifest});
    const freshReceipt={contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:freshBase,commitSha:'8'.repeat(40),materializedHeadSha:'8'.repeat(40),treeSha:'6'.repeat(40),manifestDigest:'fresh-manifest',bindingDigest:'c'.repeat(64),sourceCommit:'source',applied:[],alreadyApplied:[]};
    const calls=[];
    const run=(command,args)=>{
      calls.push([command,...args].join(' '));
      if(command==='git'&&args[0]==='ls-remote'&&args[2]==='refs/heads/'+priorBranch)return '';
      throw new Error('unexpected call: '+command+' '+args.join(' '));
    };
    expect(()=>reconcileMaterializationBranch({
      priorExecution:{manifest:priorManifest,executionTransaction:{branchRef:priorBranch}},
      manifest:freshManifest,receipt:freshReceipt,branch:baseBranch,sourceCommit:'source',run,
      materialize:()=>{throw new Error('must not reconstruct a missing prior remote');},
    })).toThrow(/RELEASE_UNIT_PRIOR_REMOTE_BRANCH_MISSING/);
    expect(calls.some(call=>call.startsWith('git push '))).toBe(false);
  });

  it('rejects a persisted prior branch whose name is not canonical for the sealed prior manifest',()=>{
    const priorBase='2'.repeat(40),freshBase='9'.repeat(40),baseBranch='release-unit/dev-nocode-u01';
    const priorManifest={...structuredClone(manifest),targetBaseSha:priorBase,manifestDigest:'prior-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),bindingDigest:'b'.repeat(64)}};
    const freshManifest={...structuredClone(manifest),targetBaseSha:freshBase,manifestDigest:'fresh-manifest',sourceIdentity:{sourceCommit:'source',sealed:true},childDevelopmentTransaction:{...structuredClone(manifest.childDevelopmentTransaction),bindingDigest:'c'.repeat(64)}};
    const freshReceipt={contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:manifest.releaseUnitId,targetBaseSha:freshBase,commitSha:'8'.repeat(40),materializedHeadSha:'8'.repeat(40),treeSha:'6'.repeat(40),manifestDigest:'fresh-manifest',bindingDigest:'c'.repeat(64),sourceCommit:'source',applied:[],alreadyApplied:[]};
    const foreignBranch=baseBranch+'-supersede-foreign';
    expect(()=>reconcileMaterializationBranch({
      priorExecution:{manifest:priorManifest,executionTransaction:{branchRef:foreignBranch}},
      manifest:freshManifest,receipt:freshReceipt,branch:baseBranch,sourceCommit:'source',
      run:()=>{throw new Error('remote inspection must not occur for a noncanonical branch');},
    })).toThrow(/RELEASE_UNIT_PRIOR_MATERIALIZATION_BRANCH_NONCANONICAL/);
  });

  it('persists a selected superseding branchRef before MATERIALIZED and PR creation',()=>{
    const runtime=readFileSync('scripts/release-unit-github-runtime.mjs','utf8');
    const start=runtime.indexOf('export function prepareActiveUnit');
    const body=runtime.slice(start,runtime.indexOf('export function finishActiveUnit',start));
    const selection=body.indexOf('reconcileMaterializationBranch');
    const branchPersist=body.indexOf('branchRef:branch,supersedesBranchRef:canonicalBranch');
    const materialized=body.indexOf("type:'MATERIALIZED'");
    const pr=body.indexOf('ensureExactPullRequest');
    expect(selection).toBeGreaterThanOrEqual(0);
    expect(branchPersist).toBeGreaterThan(selection);
    expect(materialized).toBeGreaterThan(branchPersist);
    expect(pr).toBeGreaterThan(materialized);
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
      if(args[0]==='show')return releaseUnitCommitMessage(manifest);
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
    const reseal=body.indexOf('sealReleaseUnitManifest(refreshed,{sourceCommit,cwd})');
    const pass=body.indexOf("return{decision:'PASS',manifest:finalSealed");
    expect(projection).toBeGreaterThanOrEqual(0);
    expect(reprojection).toBeGreaterThan(projection);
    expect(strict).toBeGreaterThan(reprojection);
    expect(reseal).toBeGreaterThan(strict);
    expect(pass).toBeGreaterThan(reseal);
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

  it('derives critical child proof from current Known Failure regression tests without widening material scope',()=>{
    const plan=readFileSync('scripts/shoperation-plan-before-code.mjs','utf8');
    expect(plan).toContain('getAllFailures');
    expect(plan).toContain('regressionProofForFailureIds');
    expect(plan).toContain('canonicalProjectedProof');
    expect(plan).toContain('requiredEvidenceProofFiles:[...canonicalProjectedProof]');
    expect(plan).toContain('const unitProof=[...new Set(');
    expect(plan).toContain('regressionProofForFailureIds(unitFailureIds)');
    expect(plan).toContain('unit.requiredEvidence={...(unit.requiredEvidence??{}),proofFiles:[...unitProof]}');
    expect(plan).toContain('proof:[...unitProof]');
    expect(plan).not.toContain("quality/knowledge/rehearsal-fixtures/v1/fixture-01.json','tests/");
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

  it('proves trusted fast-forward main advance only after ancestry and successor-scope isolation',()=>{
    const calls=[];
    const safeManifest={...structuredClone(manifest),intendedFiles:['scripts/already.mjs'],requiredDependencyFiles:['scripts/dep.mjs']};
    const run=(command,args,options={})=>{
      calls.push({command,args,options});
      if(args[0]==='merge-base')return '';
      if(args[0]==='diff')return 'scripts/control-plane-only.mjs\nquality/development/active-plan.json\n';
      throw new Error('unexpected git command');
    };
    const result=proveTrustedMainAdvance({fromSha:A,toSha:B,manifest:safeManifest,run,cwd:'/repo'});
    expect(result.decision).toBe('PASS');
    expect(result.proof.contract).toBe('shoporation.release-unit-main-advance-proof.v1');
    expect(result.proof.fromSha).toBe(A);
    expect(result.proof.toSha).toBe(B);
    expect(result.proof.scopeFiles).toEqual(['scripts/already.mjs','scripts/dep.mjs']);
    expect(result.proof.overlapFiles).toEqual([]);
    expect(calls[0].args).toEqual(['merge-base','--is-ancestor',A,B]);
    expect(calls[1].args).toEqual(['diff','--name-only','--diff-filter=ACMRD',A,B]);
  });

  it('blocks trusted main advance on scope overlap or non-fast-forward history',()=>{
    const safeManifest={...structuredClone(manifest),intendedFiles:['scripts/already.mjs'],requiredDependencyFiles:[]};
    const overlap=proveTrustedMainAdvance({
      fromSha:A,toSha:B,manifest:safeManifest,cwd:'/repo',
      run:(command,args)=>args[0]==='merge-base'?'':'scripts/already.mjs\n',
    });
    expect(overlap.decision).toBe('BLOCK');
    expect(overlap.code).toBe('RELEASE_UNIT_MAIN_DRIFT');
    expect(overlap.error).toContain('RELEASE_UNIT_MAIN_ADVANCE_SCOPE_OVERLAP');
    const diverged=proveTrustedMainAdvance({
      fromSha:A,toSha:B,manifest:safeManifest,cwd:'/repo',
      run:(command,args)=>{if(args[0]==='merge-base')throw new Error('not ancestor');return '';},
    });
    expect(diverged.decision).toBe('BLOCK');
    expect(diverged.code).toBe('RELEASE_UNIT_MAIN_DRIFT');
    expect(diverged.error).toContain('RELEASE_UNIT_MAIN_ADVANCE_NON_FAST_FORWARD');
  });

  it('uses transaction-relative operation projection and establishes trusted freshness only after canonical reevaluation',()=>{
    const plan=readFileSync('scripts/shoperation-plan-before-code.mjs','utf8');
    expect(plan).toContain('materialTransactionChanges');
    expect(plan).toContain('transactionChanges:materialTransactionChanges');
    const runtime=readFileSync('scripts/release-unit-github-runtime.mjs','utf8');
    const start=runtime.indexOf('export function prepareActiveUnit');
    const end=runtime.indexOf('export function finishActiveUnit',start);
    const body=runtime.slice(start,end);
    const reevaluate=body.indexOf('reevaluateSuccessorManifest');
    const trust=body.indexOf('trustedFreshProjection=true');
    const mainAdvance=body.indexOf('trustedMainAdvance=reevaluated.trustedMainAdvance??null');
    const authorize=body.indexOf("type:'AUTHORIZE'");
    expect(body).toContain('let trustedFreshProjection=false');
    expect(body).toContain('let trustedMainAdvance=null');
    expect(reevaluate).toBeGreaterThanOrEqual(0);
    expect(trust).toBeGreaterThan(reevaluate);
    expect(mainAdvance).toBeGreaterThan(trust);
    expect(authorize).toBeGreaterThan(mainAdvance);
    expect(body).toContain('trustedFreshProjection');
    expect(body).toContain('trustedMainAdvance');
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
