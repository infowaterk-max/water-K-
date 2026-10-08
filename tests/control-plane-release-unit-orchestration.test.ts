// @ts-nocheck
import {describe,expect,it} from 'vitest';
import {applyReleaseUnitEvent,buildReleaseParentClosureProofPlan,classifyReleaseUnitObligationDrift,createReleaseParentExecution,createReleaseUnitExecution,reconcileReleaseUnitManifest,reconcileSuccessorReleaseUnit,recordReleaseParentClosure,recordReleaseParentClosureWithProofContext,refreshReleaseUnitIdentity,releaseParentProtectedFiles,releaseParentUnitCloseReceiptDigests,reprojectReleaseUnitChildTransaction,strongDigest,validateReleaseParentClosureProofPlan,validateReleaseParentMainAdvanceProof} from '../scripts/lib/shoperation-release-unit-runtime.mjs';
import {selectSuccessorProjectedOperations} from '../scripts/release-unit-github-runtime.mjs';

const sha=char=>char.repeat(40);
const A=sha('a'),B=sha('b'),C=sha('c'),D=sha('d'),X=sha('e');
const unit=(order:number,file:string,predecessorUnits:string[]=[])=>{
  const id='DEV-ORCH-U'+String(order).padStart(2,'0');
  return{
    contract:'shoporation.release-unit-manifest.v1',decision:'PASS',releaseUnitId:id,order,
    transaction:{id:'DEV-ORCH',parentTransactionId:'DEV-ORCH',sourceRef:'PO-ORCH',developmentBaseSha:A},
    targetBaseSha:A,lease:{expectedBaseSha:A,failOnDrift:true,reconciled:order===1,reconciledFromSha:null},
    intendedFiles:[file],operations:[{operation:'modify',file}],requiredDependencyFiles:[],
    authorities:['release-infrastructure'],subsystems:['release-infrastructure'],
    projectedRisk:{decision:'PASS',score:2,maxPoints:5,subsystems:[{subsystem:'release-infrastructure'}],violations:[]},
    requiredGates:['GUARD-PLAN-BEFORE-CODE','GUARD-RELEASE-RISK','GUARD-QUALITY-TESTS'],
    requiredEvidence:{gateIds:['GUARD-PLAN-BEFORE-CODE','GUARD-RELEASE-RISK','GUARD-QUALITY-TESTS'],proofFiles:[],externalGateIds:[]},
    forbiddenPaths:[],readOnlyPaths:[],generatedArtifactSemantics:[],prerequisites:[...predecessorUnits],predecessorUnits:[...predecessorUnits],
    expectedPostUnitState:{filesPresent:[file],filesAbsent:[]},
    reconciliationPolicy:{mode:'merged-main-sequential',requireExactMainLease:true,requirePredecessorReceipts:order>1,requiresReconciliationAfterPredecessor:order>1,failOnUnrelatedMainDrift:true},
    sourceIdentity:{sourceCommit:null,sealed:false},manifestDigest:'digest-'+order+'-a',
    childDevelopmentTransaction:{
      contract:'shoporation.release-unit-child-transaction.v1',taskId:id+'-TX',planDigest:'plan-'+order,operationDigest:'operations-'+order,bindingDigest:'binding-'+order,
      plan:{taskId:id+'-TX',releaseUnitContext:{contract:'shoporation.release-unit-child-transaction.v1',parentTransactionId:'DEV-ORCH',releaseUnitId:id,order,targetBaseSha:A,planAuthority:'release-unit-manifest#childDevelopmentTransaction'}},
    },
  };
};
const manifests=()=>{const u1=unit(1,'scripts/unit-1.mjs');const u2=unit(2,'scripts/unit-2.mjs',[u1.releaseUnitId]);const u3=unit(3,'scripts/unit-3.mjs',[u2.releaseUnitId]);return[u1,u2,u3];};
const parent=()=>{const releaseUnits=manifests();return createReleaseParentExecution({contract:'shoporation.release-decomposition.v1',decision:'PASS',releaseUnits,ordering:{decision:'PASS'}});};
const fresh=(manifest:any,base:string,suffix=base[0])=>({...structuredClone(manifest),targetBaseSha:base,lease:{expectedBaseSha:base,failOnDrift:true,reconciled:true,reconciledFromSha:manifest.targetBaseSha},manifestDigest:manifest.releaseUnitId+'-'+suffix});
const context=(manifest:any)=>({parentTransactionId:'DEV-ORCH',releaseUnitId:manifest.releaseUnitId,manifestDigest:manifest.manifestDigest,childPlanDigest:manifest.childDevelopmentTransaction.planDigest,bindingDigest:manifest.childDevelopmentTransaction.bindingDigest});
const truth=(head:string,manifest:any,taskId=manifest.childDevelopmentTransaction.taskId)=>({contract:'shoporation.completion-truth.v2',taskId,decision:'PASS',truthStatus:'VERIFIED',internalState:'VERIFIED_DONE',releaseUnitContext:context(manifest),currentExactState:{head,branch:'feature/unit',stateVersion:'shoporation-ci.v1'}});
const lifecycle=(head:string,manifest:any)=>({taskId:manifest.childDevelopmentTransaction.taskId,status:'closed',releaseUnitContext:context(manifest),lifecycle:{state:'LEARN',truthStatus:'VERIFIED',verifiedImplementationHead:head}});
const parentTruth=(head:string)=>({contract:'shoporation.completion-truth.v2',taskId:'DEV-ORCH',decision:'PASS',truthStatus:'VERIFIED',internalState:'VERIFIED_DONE',currentExactState:{head}});
const parentLifecycle=(head:string)=>({status:'closed',lifecycle:{state:'LEARN',truthStatus:'VERIFIED',verifiedImplementationHead:head}});
const byId=(p:any,id:string)=>p.units.find((item:any)=>item.releaseUnitId===id);
function toPr(p:any,id:string,manifest:any,base:string,head:string,pr:number){
  p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:id,freshManifest:manifest,currentMainSha:base,allFreshManifests:p.units.map((x:any)=>x.manifest)});
  p=applyReleaseUnitEvent(p,{type:'MATERIALIZED',releaseUnitId:id,receipt:{contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:id,targetBaseSha:base,commitSha:head,materializedHeadSha:head,manifestDigest:manifest.manifestDigest,bindingDigest:manifest.childDevelopmentTransaction.bindingDigest,sourceCommit:'source-'+id,applied:[],alreadyApplied:[]}});
  p=applyReleaseUnitEvent(p,{type:'PR_OPEN',releaseUnitId:id,receipt:{number:pr,headSha:head,baseSha:base,manifestDigest:manifest.manifestDigest,bindingDigest:manifest.childDevelopmentTransaction.bindingDigest,sourceCommit:'source-'+id}});
  return p;
}
function complete(p:any,id:string,manifest:any,base:string,head:string,merged:string,pr:number){
  p=toPr(p,id,manifest,base,head,pr);
  p=applyReleaseUnitEvent(p,{type:'VERIFIED',releaseUnitId:id,truth:truth(head,manifest),lifecyclePlan:lifecycle(head,manifest)});
  p=applyReleaseUnitEvent(p,{type:'MERGED',releaseUnitId:id,receipt:{prNumber:pr,sourceHeadSha:head,mergedMainSha:merged,mergeMethod:'squash'}});
  p=applyReleaseUnitEvent(p,{type:'CLOSED',releaseUnitId:id,currentMainSha:merged});
  return p;
}

describe('Control Plane release-unit orchestration',()=>{
  it('0a. binds canonical fallback proof to route and required evidence without widening material scope',()=>{
    const before=manifests()[0];
    const intended=structuredClone(before.intendedFiles),operations=structuredClone(before.operations);
    const proof=['tests/control-plane-known-failure-a.test.ts','tests/control-plane-known-failure-b.test.ts'];
    const projection={
      contract:'shoporation.release-unit-child-plan-projection.v1',
      guardDigest:'fresh-guard',
      expectedSubsystems:['release-infrastructure'],
      expectedDomains:['DOMAIN-RELEASE'],
      expectedAuthorities:['release-infrastructure'],
      expectedKnownFailureIds:['SQ-KF-001'],
      acknowledgedPoInstructionIds:[],
      acknowledgedNegativeKnowledgeIds:[],
      requiredEvidenceProofFiles:proof,
      requiredGates:['GUARD-PLAN-BEFORE-CODE','GUARD-QUALITY-TESTS'],
      externalGateIds:[],
      semanticExecutionRoute:{
        request:'PO-ORCH',authority:['release-infrastructure'],mustEdit:['scripts/unit-1.mjs'],mayEdit:[],impactedReadOnly:[],
        mustCreate:[],forbidden:[],proof,unknown:[],plannedDeletions:[],plannedRenames:[],generatedArtifacts:[],
      },
    };
    const after=reprojectReleaseUnitChildTransaction(before,projection);
    expect(after.requiredEvidence.proofFiles).toEqual(proof);
    expect(after.childDevelopmentTransaction.plan.operationalIntelligence.semanticExecutionRoute.proof).toEqual(proof);
    expect(after.intendedFiles).toEqual(intended);
    expect(after.operations).toEqual(operations);
    expect(after.childDevelopmentTransaction.planDigest).not.toBe(before.childDevelopmentTransaction.planDigest);
    expect(after.childDevelopmentTransaction.bindingDigest).not.toBe(before.childDevelopmentTransaction.bindingDigest);
  });

  it('0b. fails closed when projected route proof and manifest proof identity disagree',()=>{
    const before=manifests()[0];
    const projection={
      contract:'shoporation.release-unit-child-plan-projection.v1',
      guardDigest:'fresh-guard',
      expectedSubsystems:['release-infrastructure'],
      expectedDomains:['DOMAIN-RELEASE'],
      expectedAuthorities:['release-infrastructure'],
      expectedKnownFailureIds:['SQ-KF-001'],
      acknowledgedPoInstructionIds:[],
      acknowledgedNegativeKnowledgeIds:[],
      requiredEvidenceProofFiles:['tests/a.test.ts'],
      requiredGates:['GUARD-QUALITY-TESTS'],
      externalGateIds:[],
      semanticExecutionRoute:{
        request:'PO-ORCH',authority:['release-infrastructure'],mustEdit:['scripts/unit-1.mjs'],mayEdit:[],impactedReadOnly:[],
        mustCreate:[],forbidden:[],proof:['tests/b.test.ts'],unknown:[],plannedDeletions:[],plannedRenames:[],generatedArtifacts:[],
      },
    };
    expect(()=>reprojectReleaseUnitChildTransaction(before,projection)).toThrow(/PROJECTION_PROOF_DRIFT/);
  });

  it('1. executes three release units in order and closes the parent only through existing Truth/Lifecycle receipts',()=>{
    let p=parent();const [u1,u2,u3]=p.units.map((x:any)=>x.manifest);
    p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);expect(p.activeUnitId).toBe(u2.releaseUnitId);expect(p.closureEligible).toBe(false);
    const f2=fresh(u2,B,'b');p=complete(p,u2.releaseUnitId,f2,B,sha('2'),C,2);
    const f3=fresh(u3,C,'c');p=complete(p,u3.releaseUnitId,f3,C,sha('3'),D,3);
    expect(p.activeUnitId).toBeNull();expect(p.closureEligible).toBe(true);expect(p.closureComplete).toBe(false);expect(p.lifecyclePhase).toBe('TRUTH_GATE');
    p=recordReleaseParentClosure(p,{truth:parentTruth(D),lifecyclePlan:parentLifecycle(D),currentMainSha:D});
    expect(p.closureComplete).toBe(true);expect(p.lifecyclePhase).toBe('LEARN');
  });
  it('binds parent closure to a trusted fast-forward proof across all CLOSED child material',()=>{
    let p=parent();const [u1,u2,u3]=p.units.map((x:any)=>x.manifest);
    p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);
    const f2=fresh(u2,B,'b');p=complete(p,u2.releaseUnitId,f2,B,sha('2'),C,2);
    const f3=fresh(u3,C,'c');p=complete(p,u3.releaseUnitId,f3,C,sha('3'),D,3);
    const protectedFiles=releaseParentProtectedFiles(p),unitCloseReceiptDigests=releaseParentUnitCloseReceiptDigests(p);
    const proof={contract:'shoporation.release-parent-main-advance-proof.v1',issuer:'release-unit-parent-close',decision:'PASS',relationship:'FAST_FORWARD',fromSha:D,toSha:X,changedFiles:['scripts/release-unit-execute.mjs'],protectedFiles,overlapFiles:[],unitCloseReceiptDigests};
    expect(validateReleaseParentMainAdvanceProof(proof,{parent:p,fromSha:D,toSha:X})).toBe(true);
    const closed=recordReleaseParentClosure(p,{truth:parentTruth(X),lifecyclePlan:parentLifecycle(X),currentMainSha:X,trustedMainAdvance:proof});
    expect(closed.closedReceipt.finalMainSha).toBe(X);
    expect(closed.closedReceipt.lastChildMainSha).toBe(D);
    expect(closed.closedReceipt.mainAdvanceProof).toMatchObject({fromSha:D,toSha:X,decision:'PASS'});
    expect(()=>recordReleaseParentClosure(p,{truth:parentTruth(X),lifecyclePlan:parentLifecycle(X),currentMainSha:X})).toThrow(/RELEASE_PARENT_MAIN_ADVANCE_PROOF_INVALID/);
    for(const bad of [
      {...proof,fromSha:C},
      {...proof,toSha:D},
      {...proof,relationship:'DIVERGED'},
      {...proof,unitCloseReceiptDigests:[...unitCloseReceiptDigests.slice(0,-1),'forged']},
      {...proof,changedFiles:[u1.intendedFiles[0]],overlapFiles:[u1.intendedFiles[0]]},
    ])expect(validateReleaseParentMainAdvanceProof(bad,{parent:p,fromSha:D,toSha:X})).toBe(false);
  });

  it('2. blocks successor authorization when unrelated main drift follows predecessor merge',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:fresh(u2,X,'x'),currentMainSha:X});
    expect(byId(p,u2.releaseUnitId).state).toBe('STALE');expect(byId(p,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_MAIN_DRIFT');
  });
  it('accepts exact trusted fast-forward main advance while preserving the no-proof MAIN_DRIFT guard',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);
    const freshManifest=fresh(u2,C,'c');
    const scopeFiles=[...new Set([...(freshManifest.intendedFiles??[]),...(freshManifest.requiredDependencyFiles??[])])].sort();
    const proof={contract:'shoporation.release-unit-main-advance-proof.v1',issuer:'release-unit-github-runtime',decision:'PASS',relationship:'FAST_FORWARD',fromSha:B,toSha:C,changedFiles:['scripts/control-plane-only.mjs'],scopeFiles,overlapFiles:[]};
    const accepted=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest,currentMainSha:C,trustedFreshProjection:true,trustedMainAdvance:proof});
    expect(byId(accepted,u2.releaseUnitId).state).toBe('READY');
    const noProof=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest,currentMainSha:C,trustedFreshProjection:true});
    expect(byId(noProof,u2.releaseUnitId).state).toBe('STALE');
    expect(byId(noProof,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_MAIN_DRIFT');
  });

  it('rejects forged or scope-overlapping trusted main advance proofs',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);
    const freshManifest=fresh(u2,C,'c');
    const scopeFiles=[...new Set([...(freshManifest.intendedFiles??[]),...(freshManifest.requiredDependencyFiles??[])])].sort();
    const baseProof={contract:'shoporation.release-unit-main-advance-proof.v1',issuer:'release-unit-github-runtime',decision:'PASS',relationship:'FAST_FORWARD',fromSha:B,toSha:C,changedFiles:['scripts/control-plane-only.mjs'],scopeFiles,overlapFiles:[]};
    for(const proof of [
      {...baseProof,fromSha:A},
      {...baseProof,toSha:D},
      {...baseProof,relationship:'DIVERGED'},
      {...baseProof,changedFiles:[freshManifest.intendedFiles[0]],overlapFiles:[freshManifest.intendedFiles[0]]},
    ]){
      const next=applyReleaseUnitEvent(structuredClone(p),{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest,currentMainSha:C,trustedFreshProjection:true,trustedMainAdvance:proof});
      expect(byId(next,u2.releaseUnitId).state).toBe('STALE');
      expect(byId(next,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_MAIN_DRIFT');
    }
  });

  it('allows manifest base reconciliation only with a proof bound to the immutable predecessor receipt',()=>{
    const [,u2]=manifests();
    const scopeFiles=[...new Set([...(u2.intendedFiles??[]),...(u2.requiredDependencyFiles??[])])].sort();
    const proof={contract:'shoporation.release-unit-main-advance-proof.v1',issuer:'release-unit-github-runtime',decision:'PASS',relationship:'FAST_FORWARD',fromSha:B,toSha:C,changedFiles:['scripts/control-plane-only.mjs'],scopeFiles,overlapFiles:[]};
    const receipts=[{releaseUnitId:'DEV-ORCH-U01',status:'MERGED',mergedMainSha:B}];
    expect(()=>reconcileReleaseUnitManifest(u2,{newBaseSha:C,predecessorReceipts:receipts})).toThrow(/RELEASE_UNIT_MAIN_DRIFT/);
    const reconciled=reconcileReleaseUnitManifest(u2,{newBaseSha:C,predecessorReceipts:receipts,trustedMainAdvance:proof});
    expect(reconciled.targetBaseSha).toBe(C);
    expect(reconciled.lease.reconciled).toBe(true);
    expect(()=>reconcileReleaseUnitManifest(u2,{newBaseSha:C,predecessorReceipts:receipts,trustedMainAdvance:{...proof,fromSha:A}})).toThrow(/RELEASE_UNIT_MAIN_DRIFT/);
  });

  it('3. marks a successor stale when fresh Atlas-derived dependency obligations change',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);
    const f2={...fresh(u2,B,'b'),requiredDependencyFiles:['scripts/new-dependency.mjs']};p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:f2,currentMainSha:B});
    expect(byId(p,u2.releaseUnitId).state).toBe('STALE');expect(byId(p,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_EXECUTION_OBLIGATION_DRIFT');
  });
  it('4. blocks a successor whose freshly authoritative Release Risk is BLOCK without changing RRB policy',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);
    const f2={...fresh(u2,B,'b'),projectedRisk:{...u2.projectedRisk,decision:'BLOCK',violations:[{code:'PROJECTED_RELEASE_RISK_BLOCK'}]}};p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:f2,currentMainSha:B});
    expect(byId(p,u2.releaseUnitId).state).toBe('BLOCKED');expect(byId(p,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_FRESH_RISK_BLOCK');
  });
  it('5. refuses VERIFIED when the PR is green but Completion Truth is not VERIFIED',()=>{
    let p=parent();const u1=p.units[0].manifest;p=toPr(p,u1.releaseUnitId,u1,A,sha('1'),1);
    expect(()=>applyReleaseUnitEvent(p,{type:'VERIFIED',releaseUnitId:u1.releaseUnitId,truth:{...truth(sha('1'),u1),truthStatus:'MISSING',decision:'BLOCK'},lifecyclePlan:lifecycle(sha('1'),u1)})).toThrow(/RELEASE_UNIT_TRUTH_NOT_VERIFIED/);
  });
  it('6. refuses VERIFIED when Truth passes but canonical Development Lifecycle is not CLOSED',()=>{
    let p=parent();const u1=p.units[0].manifest;p=toPr(p,u1.releaseUnitId,u1,A,sha('1'),1);
    expect(()=>applyReleaseUnitEvent(p,{type:'VERIFIED',releaseUnitId:u1.releaseUnitId,truth:truth(sha('1'),u1),lifecyclePlan:{status:'ready-for-implementation',lifecycle:{state:'VERIFY'}}})).toThrow(/RELEASE_UNIT_LIFECYCLE_NOT_CLOSED/);
  });
  it('7. refuses a successor when predecessor close state lacks a canonical merge receipt',()=>{
    let p=parent();const u2=p.units[1].manifest;const broken={...p.units[0],state:'CLOSED',verification:{truthStatus:'VERIFIED',lifecycleState:'LEARN'},merge:null};p={...p,units:[broken,...p.units.slice(1)],activeUnitId:u2.releaseUnitId};
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:fresh(u2,B,'b'),currentMainSha:B});
    expect(byId(p,u2.releaseUnitId).state).toBe('BLOCKED');expect(byId(p,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_PREDECESSOR_MERGE_RECEIPT_MISSING');
  });
  it('8. treats exact duplicate materialization as idempotent and rejects a conflicting second identity',()=>{
    let p=parent();const u1=p.units[0].manifest;p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u1.releaseUnitId,freshManifest:u1,currentMainSha:A});
    const receipt={contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:u1.releaseUnitId,targetBaseSha:A,commitSha:sha('1'),materializedHeadSha:sha('1'),manifestDigest:u1.manifestDigest,bindingDigest:u1.childDevelopmentTransaction.bindingDigest,sourceCommit:'source-u1',applied:[],alreadyApplied:[]};
    p=applyReleaseUnitEvent(p,{type:'MATERIALIZED',releaseUnitId:u1.releaseUnitId,receipt});const same=applyReleaseUnitEvent(p,{type:'MATERIALIZED',releaseUnitId:u1.releaseUnitId,receipt});expect(byId(same,u1.releaseUnitId).state).toBe('MATERIALIZED');
    expect(()=>applyReleaseUnitEvent(p,{type:'MATERIALIZED',releaseUnitId:u1.releaseUnitId,receipt:{...receipt,materializedHeadSha:sha('9'),commitSha:sha('9')}})).toThrow(/RELEASE_UNIT_MATERIALIZATION_CONFLICT/);
  });
  it('9. accepts one atomic materialization receipt that reports both applied and already-applied operations without inferring partial success itself',()=>{
    let p=parent();const u1=p.units[0].manifest;p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u1.releaseUnitId,freshManifest:u1,currentMainSha:A});
    p=applyReleaseUnitEvent(p,{type:'MATERIALIZED',releaseUnitId:u1.releaseUnitId,receipt:{contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:u1.releaseUnitId,targetBaseSha:A,commitSha:sha('1'),materializedHeadSha:sha('1'),manifestDigest:u1.manifestDigest,bindingDigest:u1.childDevelopmentTransaction.bindingDigest,sourceCommit:'source-u1',applied:[{file:'a'}],alreadyApplied:[{file:'b'}]}});
    expect(byId(p,u1.releaseUnitId).state).toBe('MATERIALIZED');
  });
  it('10. detects stale successor operation paths after a predecessor rename',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);const f2=fresh(u2,B,'b');f2.intendedFiles=['scripts/unit-2-renamed.mjs'];f2.operations=[{operation:'modify',file:'scripts/unit-2-renamed.mjs'}];
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:f2,currentMainSha:B});expect(byId(p,u2.releaseUnitId).state).toBe('STALE');
  });
  it('11. detects generated-artifact source semantics drift across units',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);u2.generatedArtifactSemantics=[{path:'scripts/unit-2.mjs',mode:'sealed',sourceDigest:'old'}];p.units[1].manifest=structuredClone(u2);
    p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);const f2=fresh(u2,B,'b');f2.generatedArtifactSemantics=[{path:'scripts/unit-2.mjs',mode:'sealed',sourceDigest:'new'}];
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:f2,currentMainSha:B});expect(byId(p,u2.releaseUnitId).state).toBe('STALE');
  });
  it('12. detects proof-ownership / required-evidence drift before successor authorization',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);const f2=fresh(u2,B,'b');f2.requiredEvidence={...f2.requiredEvidence,proofFiles:['tests/new-proof.test.ts']};
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:f2,currentMainSha:B});expect(byId(p,u2.releaseUnitId).state).toBe('STALE');
  });
  it('13. blocks a fresh successor when newly authoritative forbidden/read-only scope captures an operation',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);const f2=fresh(u2,B,'b');f2.forbiddenPaths=['scripts/unit-2.mjs'];
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:f2,currentMainSha:B});expect(byId(p,u2.releaseUnitId).state).toBe('BLOCKED');expect(byId(p,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_FRESH_FORBIDDEN_SCOPE');
  });
  it('14. rejects a PR receipt that is not bound to the manifest materialization source identity',()=>{
    let p=parent();const u1=p.units[0].manifest;p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u1.releaseUnitId,freshManifest:u1,currentMainSha:A});p=applyReleaseUnitEvent(p,{type:'MATERIALIZED',releaseUnitId:u1.releaseUnitId,receipt:{contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:u1.releaseUnitId,targetBaseSha:A,commitSha:sha('1'),materializedHeadSha:sha('1'),manifestDigest:u1.manifestDigest,bindingDigest:u1.childDevelopmentTransaction.bindingDigest,sourceCommit:'source-u1',applied:[],alreadyApplied:[]}});
    expect(()=>applyReleaseUnitEvent(p,{type:'PR_OPEN',releaseUnitId:u1.releaseUnitId,receipt:{number:1,headSha:sha('1'),baseSha:A,manifestDigest:u1.manifestDigest,bindingDigest:u1.childDevelopmentTransaction.bindingDigest,sourceCommit:'different-source'}})).toThrow(/RELEASE_UNIT_PR_SOURCE_IDENTITY_MISMATCH/);
  });
  it('15. rejects a PR whose exact HEAD differs from the atomic materialized commit identity',()=>{
    let p=parent();const u1=p.units[0].manifest;p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u1.releaseUnitId,freshManifest:u1,currentMainSha:A});p=applyReleaseUnitEvent(p,{type:'MATERIALIZED',releaseUnitId:u1.releaseUnitId,receipt:{contract:'shoporation.release-unit-materialization.v1',status:'PREPARED',releaseUnitId:u1.releaseUnitId,targetBaseSha:A,commitSha:sha('1'),materializedHeadSha:sha('1'),manifestDigest:u1.manifestDigest,bindingDigest:u1.childDevelopmentTransaction.bindingDigest,sourceCommit:'source-u1',applied:[],alreadyApplied:[]}});
    expect(()=>applyReleaseUnitEvent(p,{type:'PR_OPEN',releaseUnitId:u1.releaseUnitId,receipt:{number:1,headSha:sha('9'),baseSha:A,manifestDigest:u1.manifestDigest,bindingDigest:u1.childDevelopmentTransaction.bindingDigest,sourceCommit:'source-u1'}})).toThrow(/RELEASE_UNIT_PR_HEAD_MISMATCH/);
  });
  it('16. supports squash/rebase merge identity by rebinding successor base to merged main rather than PR head',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);expect(byId(p,u1.releaseUnitId).merge.sourceHeadSha).toBe(sha('1'));expect(byId(p,u1.releaseUnitId).merge.mergedMainSha).toBe(B);
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:fresh(u2,B,'b'),currentMainSha:B});expect(byId(p,u2.releaseUnitId).state).toBe('READY');expect(byId(p,u2.releaseUnitId).executionTransaction.changeBaseSha).toBe(B);
  });
  it('17. fails closed when a release-unit dependency cycle appears only during fresh reconciliation',()=>{
    let p=parent();const [u1,u2,u3]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);const f2=fresh(u2,B,'b'),f3=fresh(u3,B,'b');f2.predecessorUnits=[u1.releaseUnitId,u3.releaseUnitId];f3.predecessorUnits=[u2.releaseUnitId];
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:f2,currentMainSha:B,allFreshManifests:[fresh(u1,B,'b'),f2,f3]});expect(byId(p,u2.releaseUnitId).state).toBe('FAILED');expect(byId(p,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_RECONCILIATION_CYCLE');
  });
  it('18. keeps the parent open when one release unit fails',()=>{
    let p=parent();const u1=p.units[0].manifest;p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);const u2=p.units[1];p=applyReleaseUnitEvent(p,{type:'FAILED',releaseUnitId:u2.releaseUnitId,code:'TEST_FAILURE'});
    expect(p.closureEligible).toBe(false);expect(p.closureComplete).toBe(false);expect(p.blocker.releaseUnitId).toBe(u2.releaseUnitId);expect(()=>recordReleaseParentClosure(p,{truth:parentTruth(B),lifecyclePlan:parentLifecycle(B),currentMainSha:B})).toThrow(/RELEASE_PARENT_NOT_CLOSURE_ELIGIBLE/);
  });
  it('19. fails closed when fresh successor planning reports no safe manifest/decomposition',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);const f2={...fresh(u2,B,'b'),decision:'FAIL_CLOSED',reason:'NO_SAFE_DECOMPOSITION'};
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:f2,currentMainSha:B});expect(byId(p,u2.releaseUnitId).state).toBe('BLOCKED');expect(byId(p,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_FRESH_MANIFEST_NOT_PASS');
  });
  it('20. prevents an operator from skipping the active successor unit',()=>{
    let p=parent();const [u1,,u3]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);expect(p.activeUnitId).toBe('DEV-ORCH-U02');
    expect(()=>applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u3.releaseUnitId,freshManifest:fresh(u3,B,'b'),currentMainSha:B})).toThrow(/RELEASE_PARENT_UNIT_SKIP_FORBIDDEN/);
  });
  it('accepts canonical governance and evidence refresh only with trusted fresh projection provenance',()=>{
    let p=parent();
    const current=p.units[0].manifest;
    p.units[0].state='STALE';
    p.units[0].blocker={code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK',details:{}};
    p.units[0].lastTransition={to:'STALE',code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK'};
    const freshManifest=fresh(current,A,'g');
    freshManifest.authorities=['quality-knowledge-system'];
    freshManifest.requiredGates=[...current.requiredGates,'GUARD-INCREMENTAL-REPLAY'];
    freshManifest.requiredEvidence={gateIds:[...freshManifest.requiredGates],proofFiles:['tests/current-proof.test.ts'],externalGateIds:[]};
    freshManifest.childDevelopmentTransaction={...structuredClone(current.childDevelopmentTransaction),planDigest:'fresh-current-plan',bindingDigest:'fresh-current-binding'};
    const blocked=applyReleaseUnitEvent(structuredClone(p),{
      type:'AUTHORIZE',releaseUnitId:current.releaseUnitId,freshManifest,currentMainSha:A,
      allFreshManifests:[freshManifest,...p.units.slice(1).map((x:any)=>x.manifest)],
    });
    expect(blocked.units[0].state).toBe('STALE');
    expect(blocked.units[0].blocker.code).toBe('RELEASE_UNIT_EXECUTION_OBLIGATION_DRIFT');
    const accepted=applyReleaseUnitEvent(p,{
      type:'AUTHORIZE',releaseUnitId:current.releaseUnitId,freshManifest,currentMainSha:A,
      allFreshManifests:[freshManifest,...p.units.slice(1).map((x:any)=>x.manifest)],
      trustedFreshProjection:true,
    });
    expect(accepted.units[0].state).toBe('READY');
    expect(accepted.units[0].manifest.authorities).toEqual(['quality-knowledge-system']);
    expect(accepted.units[0].manifest.requiredEvidence.proofFiles).toEqual(['tests/current-proof.test.ts']);
    expect(accepted.units[0].manifest.childDevelopmentTransaction.planDigest).toBe('fresh-current-plan');
  });

  it('classifies canonical first sealing provenance and its derived operation digest as reprojectable',()=>{
    const sourceCommit=sha('f');
    const before=refreshReleaseUnitIdentity(structuredClone(manifests()[0]));
    const afterDraft=structuredClone(before);
    afterDraft.operations=before.operations.map((operation:any)=>({...operation,source:{mode:'sealed',commit:sourceCommit,blobSha:sha('c'),fileMode:'100644'}}));
    afterDraft.sourceIdentity={sourceCommit,sealed:true};
    const after=refreshReleaseUnitIdentity(afterDraft);
    const drift=classifyReleaseUnitObligationDrift(before,after);
    expect(drift.material.map((item:any)=>item.field)).not.toContain('operations');
    expect(drift.material.map((item:any)=>item.field)).not.toContain('childOperationDigest');
    expect(drift.reprojectable.map((item:any)=>item.field)).toEqual(expect.arrayContaining(['operations','childOperationDigest']));
    expect(before.childDevelopmentTransaction.operationDigest).toBe(strongDigest(before.operations));
    expect(after.childDevelopmentTransaction.operationDigest).toBe(strongDigest(after.operations));
  });

  it('requires trusted fresh projection before accepting canonical first sealing enrichment',()=>{
    const sourceCommit=sha('f');
    const before=refreshReleaseUnitIdentity(structuredClone(manifests()[0]));
    const afterDraft=structuredClone(before);
    afterDraft.operations=before.operations.map((operation:any)=>({...operation,source:{mode:'sealed',commit:sourceCommit,blobSha:sha('c'),fileMode:'100644'}}));
    afterDraft.sourceIdentity={sourceCommit,sealed:true};
    const after=refreshReleaseUnitIdentity(afterDraft);
    const execution=createReleaseUnitExecution(before);
    execution.state='STALE';
    execution.lastTransition={to:'STALE',code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK'};
    const blocked=reconcileSuccessorReleaseUnit({execution,freshManifest:after,currentMainSha:A,allFreshManifests:[after]});
    expect(blocked.decision).toBe('STALE');
    expect(blocked.code).toBe('RELEASE_UNIT_EXECUTION_OBLIGATION_DRIFT');
    const accepted=reconcileSuccessorReleaseUnit({execution,freshManifest:after,currentMainSha:A,allFreshManifests:[after],trustedFreshProjection:true});
    expect(accepted.decision).toBe('PASS');
    expect(accepted.details.reprojectedFields).toEqual(expect.arrayContaining(['operations','childOperationDigest']));
  });

  it('accepts the canonical first-sealing source shapes for delete and regenerate operations',()=>{
    const sourceCommit=sha('f');
    const draft=structuredClone(manifests()[0]);
    draft.operations=[
      {operation:'modify',file:'scripts/unit-1.mjs'},
      {operation:'delete',file:'scripts/old-unit.mjs'},
      {operation:'create',file:'scripts/generated-unit.mjs',generated:{mode:'regenerate',command:'node scripts/generate-unit.mjs'}},
    ];
    const before=refreshReleaseUnitIdentity(draft);
    const afterDraft=structuredClone(before);
    afterDraft.operations=[
      {...before.operations[0],source:{mode:'sealed',commit:sourceCommit,blobSha:sha('c'),fileMode:'100644'}},
      {...before.operations[1],source:null},
      {...before.operations[2],source:{mode:'regenerate',commit:sourceCommit,blobSha:null}},
    ];
    afterDraft.sourceIdentity={sourceCommit,sealed:true};
    const after=refreshReleaseUnitIdentity(afterDraft);
    const drift=classifyReleaseUnitObligationDrift(before,after);
    expect(drift.material.map((item:any)=>item.field)).not.toContain('operations');
    expect(drift.reprojectable.map((item:any)=>item.field)).toEqual(expect.arrayContaining(['operations','childOperationDigest']));
  });

  it('keeps resealing, semantic mutation and forged operation digest as material drift',()=>{
    const sourceCommit=sha('f');
    const before=refreshReleaseUnitIdentity(structuredClone(manifests()[0]));
    const sealedDraft=structuredClone(before);
    sealedDraft.operations=before.operations.map((operation:any)=>({...operation,source:{mode:'sealed',commit:sourceCommit,blobSha:sha('c'),fileMode:'100644'}}));
    sealedDraft.sourceIdentity={sourceCommit,sealed:true};
    const sealed=refreshReleaseUnitIdentity(sealedDraft);

    const resealedDraft=structuredClone(sealed);
    resealedDraft.operations[0].source={...resealedDraft.operations[0].source,blobSha:sha('d')};
    const resealed=refreshReleaseUnitIdentity(resealedDraft);
    expect(classifyReleaseUnitObligationDrift(sealed,resealed).material.map((item:any)=>item.field)).toContain('operations');

    const mutatedDraft=structuredClone(before);
    mutatedDraft.operations=[{...before.operations[0],operation:'create',source:{mode:'sealed',commit:sourceCommit,blobSha:sha('c'),fileMode:'100644'}}];
    mutatedDraft.sourceIdentity={sourceCommit,sealed:true};
    const mutated=refreshReleaseUnitIdentity(mutatedDraft);
    expect(classifyReleaseUnitObligationDrift(before,mutated).material.map((item:any)=>item.field)).toContain('operations');

    const forged=structuredClone(sealed);
    forged.childDevelopmentTransaction.operationDigest='forged-operation-digest';
    const forgedFields=classifyReleaseUnitObligationDrift(before,forged).material.map((item:any)=>item.field);
    expect(forgedFields).toContain('operations');
    expect(forgedFields).toContain('childOperationDigest');
  });

  it('keeps material operation drift fail-closed even with trusted fresh projection provenance',()=>{
    let p=parent();
    const current=p.units[0].manifest;
    p.units[0].state='STALE';
    p.units[0].lastTransition={to:'STALE',code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK'};
    const freshManifest=fresh(current,A,'m');
    freshManifest.operations=[{operation:'create',file:current.intendedFiles[0]}];
    const next=applyReleaseUnitEvent(p,{
      type:'AUTHORIZE',releaseUnitId:current.releaseUnitId,freshManifest,currentMainSha:A,
      allFreshManifests:[freshManifest,...p.units.slice(1).map((x:any)=>x.manifest)],
      trustedFreshProjection:true,
    });
    expect(next.units[0].state).toBe('STALE');
    expect(next.units[0].blocker.code).toBe('RELEASE_UNIT_EXECUTION_OBLIGATION_DRIFT');
    expect(next.units[0].blocker.details.drift.map((item:any)=>item.field)).toContain('operations');
  });

  it('accepts monotonic dependency and read-only enrichment only with trusted fresh projection',()=>{
    const before=refreshReleaseUnitIdentity(structuredClone(manifests()[0]));
    before.requiredDependencyFiles=['scripts/base-dependency.mjs'];
    before.readOnlyPaths=['scripts/base-readonly.mjs'];
    const freshManifest=fresh(before,A,'a');
    freshManifest.requiredDependencyFiles=['scripts/base-dependency.mjs','scripts/new-dependency.mjs'];
    freshManifest.readOnlyPaths=['scripts/base-readonly.mjs','scripts/new-readonly.mjs'];
    const execution=createReleaseUnitExecution(before);
    execution.state='STALE';
    execution.lastTransition={to:'STALE',code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK'};
    const untrusted=reconcileSuccessorReleaseUnit({execution,freshManifest,currentMainSha:A,allFreshManifests:[freshManifest]});
    expect(untrusted.decision).toBe('STALE');
    expect(untrusted.code).toBe('RELEASE_UNIT_EXECUTION_OBLIGATION_DRIFT');
    const trusted=reconcileSuccessorReleaseUnit({execution,freshManifest,currentMainSha:A,allFreshManifests:[freshManifest],trustedFreshProjection:true});
    expect(trusted.decision).toBe('PASS');
    expect(trusted.details.reprojectedFields).toEqual(expect.arrayContaining(['requiredDependencyFiles','readOnlyPaths']));
  });

  it('keeps dependency and read-only subtraction material even with trusted fresh projection',()=>{
    const before=refreshReleaseUnitIdentity(structuredClone(manifests()[0]));
    before.requiredDependencyFiles=['scripts/base-dependency.mjs','scripts/removable-dependency.mjs'];
    before.readOnlyPaths=['scripts/base-readonly.mjs','scripts/removable-readonly.mjs'];
    const freshManifest=fresh(before,A,'a');
    freshManifest.requiredDependencyFiles=['scripts/base-dependency.mjs'];
    freshManifest.readOnlyPaths=['scripts/base-readonly.mjs'];
    const execution=createReleaseUnitExecution(before);
    execution.state='STALE';
    execution.lastTransition={to:'STALE',code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK'};
    const result=reconcileSuccessorReleaseUnit({execution,freshManifest,currentMainSha:A,allFreshManifests:[freshManifest],trustedFreshProjection:true});
    expect(result.decision).toBe('STALE');
    expect(result.code).toBe('RELEASE_UNIT_EXECUTION_OBLIGATION_DRIFT');
    expect(result.details.drift.map((item:any)=>item.field)).toEqual(expect.arrayContaining(['requiredDependencyFiles','readOnlyPaths']));
  });

  it('preserves immutable operation semantics when a successor candidate is fully already applied',()=>{
    const fixture='quality/knowledge/rehearsal-fixtures/v1/fixture-25.json',testFile='tests/control-plane-release-unit-production-surface.test.ts';
    const reconciled={operations:[
      {operation:'create',file:fixture,generated:null,source:{mode:'sealed',commit:A,blobSha:B,fileMode:'100644'}},
      {operation:'modify',file:testFile,generated:null,source:{mode:'sealed',commit:A,blobSha:B,fileMode:'100644'}},
    ]};
    const projected={operations:[
      {operation:'modify',file:fixture,generated:null},
      {operation:'modify',file:testFile,generated:null},
    ]};
    const candidate={status:'ALREADY_APPLIED',applied:[],alreadyApplied:[
      {operation:'create',file:fixture},
      {operation:'modify',file:testFile},
    ]};
    expect(selectSuccessorProjectedOperations({reconciled,projected,candidate})).toEqual([
      {operation:'create',file:fixture,generated:null},
      {operation:'modify',file:testFile,generated:null},
    ]);
  });

  it('does not preserve immutable operations for partial or mismatched already-applied coverage',()=>{
    const file='quality/knowledge/rehearsal-fixtures/v1/fixture-25.json';
    const reconciled={operations:[{operation:'create',file,generated:null,source:{mode:'sealed',commit:A,blobSha:B,fileMode:'100644'}}]};
    const projected={operations:[{operation:'modify',file,generated:null}]};
    expect(selectSuccessorProjectedOperations({
      reconciled,projected,candidate:{status:'PREPARED',applied:[{operation:'create',file}],alreadyApplied:[]},
    })).toEqual(projected.operations);
    expect(selectSuccessorProjectedOperations({
      reconciled,projected,candidate:{status:'ALREADY_APPLIED',applied:[],alreadyApplied:[{operation:'modify',file}]},
    })).toEqual(projected.operations);
  });


  it('derives a closure-only parent proof plan without mutating immutable source intent',()=>{
    let p=parent();const [u1,u2,u3]=p.units.map((x:any)=>x.manifest);
    p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);
    p=complete(p,u2.releaseUnitId,fresh(u2,B,'b'),B,sha('2'),C,2);
    p=complete(p,u3.releaseUnitId,fresh(u3,C,'c'),C,sha('3'),D,3);
    const sourcePlan:any={
      contract:'shoporation.development-plan.v1',taskId:'DEV-ORCH',task:'Create inert fixture corpus.',status:'ready-for-implementation',guardDigest:'source-guard',changeBaseSha:A,
      plannedFilePatterns:['tests/control-plane-release-unit-production-surface.test.ts','quality/knowledge/rehearsal-fixtures/v1/*.json'],expectedSubsystems:[],expectedDomains:['DOMAIN-QUALITY'],expectedAuthorities:['quality-knowledge-system'],expectedKnownFailureIds:[],acknowledgedNegativeKnowledgeIds:[],acknowledgedPoInstructionIds:[],exceptions:[],
      operationalIntelligence:{sourceKind:'product-owner-request',sourceRef:'PO-ORCH',riskTier:'critical',observableOutcomes:['historical'],unresolvedRisks:['historical'],scope:{in:['historical'],out:['runtime']},assuranceCeiling:{level:'critical-practical',rationale:'historical',selectedTechniques:['explicit-specification'],deferredTechniques:[]},definition:{acceptanceCriteria:['historical'],invariants:['historical'],forbiddenStates:['historical']},model:{phases:['PLAN'],transitions:[],failureModes:['historical'],edgeCases:['historical']},alternatives:[{id:'A',summary:'historical',disposition:'selected',reason:'historical'}],specialistReviews:[{role:'Architecture',mode:'review',verdict:'pass',finding:'historical',resolution:'historical',evidence:['historical']}],challenge:[{id:'C',scenario:'historical',finding:'historical',resolution:'historical',status:'resolved'}],proofPlan:['historical proof'],semanticExecutionRoute:{request:'PO-ORCH',authority:['quality-knowledge-system'],mustEdit:['tests/control-plane-release-unit-production-surface.test.ts'],mayEdit:[],impactedReadOnly:[],mustCreate:['quality/knowledge/rehearsal-fixtures/v1/fixture-01.json'],forbidden:['src/**'],proof:['tests/control-plane-release-unit-production-surface.test.ts'],unknown:[],plannedDeletions:[],plannedRenames:[],generatedArtifacts:[]},executionAuthorized:true},
      completionContract:{sourceKind:'product-owner-request',sourceRef:'PO-ORCH',systemObligations:{derivation:'canonical-gate-chain',requiredGuards:['GUARD-QUALITY-TESTS'],externalGuards:[],phase:'PLAN'},requirements:[{id:'REQ-PARENT',requirement:'close parent',claimScope:{capability:'CAP-QUALITY',breadth:'parent',strength:1,dimensions:['status']},requiredCapabilities:['CAP-QUALITY'],evidence:{implementation:['GUARD-QUALITY-TESTS'],outcome:['GUARD-QUALITY-TESTS']},forbiddenRegressions:[]}]},
    };
    const sourceBefore=structuredClone(sourcePlan);
    const protectedFiles=releaseParentProtectedFiles(p),unitCloseReceiptDigests=releaseParentUnitCloseReceiptDigests(p);
    const advance:any={contract:'shoporation.release-parent-main-advance-proof.v1',issuer:'release-unit-parent-close',decision:'PASS',relationship:'FAST_FORWARD',fromSha:D,toSha:X,changedFiles:['scripts/release-unit-execute.mjs'],protectedFiles,overlapFiles:[],unitCloseReceiptDigests};
    const derived=buildReleaseParentClosureProofPlan({parent:p,sourcePlan,sourceCommit:A,finalMainSha:X,trustedMainAdvance:advance});
    expect(sourcePlan).toEqual(sourceBefore);
    expect(derived.taskId).toBe(sourcePlan.taskId);
    expect(derived.task).toBe(sourcePlan.task);
    expect(derived.changeBaseSha).toBe(X);
    expect(derived.plannedFilePatterns).toEqual(['quality/development/active-plan.json']);
    expect(derived.completionContract).toEqual(sourcePlan.completionContract);
    expect(derived.expectedSubsystems).toEqual([]);
    expect(derived.expectedDomains).toEqual([]);
    expect(derived.expectedAuthorities).toEqual([]);
    expect(derived.expectedKnownFailureIds).toEqual(['SQ-KF-013','SQ-KF-014','SQ-KF-022']);
    expect(derived.acknowledgedNegativeKnowledgeIds).toEqual(['SQ-NK-012']);
    expect(derived.acknowledgedPoInstructionIds).toEqual([]);
    expect(derived.guardDigest).toBe('430b0bba');
    expect(derived.operationalIntelligence.semanticExecutionRoute).toMatchObject({authority:[],mustEdit:[],mustCreate:[],mayEdit:['quality/development/active-plan.json'],proof:['quality/development/active-plan.json']});
    expect(derived.parentClosureContext).toMatchObject({parentTransactionId:'DEV-ORCH',sourceCommit:A,finalMainSha:X,lastChildMainSha:D,unitCloseReceiptDigests});
    expect(derived.parentClosureContext.trustedMainAdvanceDigest).toBe(strongDigest(advance));
    expect(validateReleaseParentClosureProofPlan(derived,{parent:p,sourcePlan,sourceCommit:A,finalMainSha:X,trustedMainAdvance:advance})).toBe(true);
    for(const bad of [
      {...structuredClone(derived),parentClosureContext:{...derived.parentClosureContext,sourcePlanDigest:'forged'}},
      {...structuredClone(derived),parentClosureContext:{...derived.parentClosureContext,finalMainSha:D}},
      {...structuredClone(derived),completionContract:{...derived.completionContract,sourceRef:'FORGED'}},
    ])expect(validateReleaseParentClosureProofPlan(bad,{parent:p,sourcePlan,sourceCommit:A,finalMainSha:X,trustedMainAdvance:advance})).toBe(false);
    const closedPlan={...structuredClone(derived),status:'closed',lifecycle:{state:'LEARN',truthStatus:'VERIFIED',verifiedImplementationHead:X}};
    const verified=recordReleaseParentClosureWithProofContext(p,{truth:{...parentTruth(X),sourceRef:'PO-ORCH'},lifecyclePlan:closedPlan,currentMainSha:X,trustedMainAdvance:advance,sourcePlan,sourceCommit:A});
    expect(verified.closedReceipt.parentClosureContext).toEqual(closedPlan.parentClosureContext);
    expect(()=>recordReleaseParentClosureWithProofContext(p,{truth:{...parentTruth(X),sourceRef:'PO-ORCH'},lifecyclePlan:{...closedPlan,parentClosureContext:{...closedPlan.parentClosureContext,unitCloseReceiptDigests:['forged']}},currentMainSha:X,trustedMainAdvance:advance,sourcePlan,sourceCommit:A})).toThrow(/RELEASE_PARENT_CLOSURE_PROOF_CONTEXT_INVALID/);
  });

  it('derives canonical null trusted-main binding when parent closes exactly at last child main',()=>{
    let p=parent();const [u1,u2,u3]=p.units.map((x:any)=>x.manifest);
    p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);
    p=complete(p,u2.releaseUnitId,fresh(u2,B,'b'),B,sha('2'),C,2);
    p=complete(p,u3.releaseUnitId,fresh(u3,C,'c'),C,sha('3'),D,3);
    const sourcePlan:any={contract:'shoporation.development-plan.v1',taskId:'DEV-ORCH',task:'Create inert fixture corpus.',status:'ready-for-implementation',guardDigest:'g',changeBaseSha:A,plannedFilePatterns:['quality/a.json'],expectedSubsystems:[],expectedDomains:['DOMAIN-QUALITY'],expectedAuthorities:['quality-knowledge-system'],operationalIntelligence:{semanticExecutionRoute:{request:'PO-ORCH',authority:['quality-knowledge-system'],mustEdit:[],mayEdit:[],impactedReadOnly:[],mustCreate:[],forbidden:[],proof:[],unknown:[],plannedDeletions:[],plannedRenames:[],generatedArtifacts:[]}},completionContract:{sourceKind:'product-owner-request',sourceRef:'PO-ORCH',systemObligations:{derivation:'canonical-gate-chain',requiredGuards:[],externalGuards:[],phase:'PLAN'},requirements:[]}};
    const derived=buildReleaseParentClosureProofPlan({parent:p,sourcePlan,sourceCommit:A,finalMainSha:D,trustedMainAdvance:null});
    expect(derived.parentClosureContext.trustedMainAdvanceDigest).toBeNull();
    expect(validateReleaseParentClosureProofPlan(derived,{parent:p,sourcePlan,sourceCommit:A,finalMainSha:D,trustedMainAdvance:null})).toBe(true);
  });

});
