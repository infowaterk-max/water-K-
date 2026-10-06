// @ts-nocheck
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {applyReleaseUnitEvent,createReleaseParentExecution,recordReleaseParentClosure} from '../scripts/lib/shoperation-release-unit-runtime.mjs';

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
    expect(executor).toContain('shoperation-plan-before-code.mjs --check');
    expect(executor).toContain('release-risk-budget.mjs');
    expect(executor).toContain('release-unit-execute.mjs');
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
