// @ts-nocheck
import {describe,expect,it} from 'vitest';
import {applyReleaseUnitEvent,createReleaseParentExecution,recordReleaseParentClosure,reprojectReleaseUnitChildTransaction} from '../scripts/lib/shoperation-release-unit-runtime.mjs';

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
  it('2. blocks successor authorization when unrelated main drift follows predecessor merge',()=>{
    let p=parent();const [u1,u2]=p.units.map((x:any)=>x.manifest);p=complete(p,u1.releaseUnitId,u1,A,sha('1'),B,1);
    p=applyReleaseUnitEvent(p,{type:'AUTHORIZE',releaseUnitId:u2.releaseUnitId,freshManifest:fresh(u2,X,'x'),currentMainSha:X});
    expect(byId(p,u2.releaseUnitId).state).toBe('STALE');expect(byId(p,u2.releaseUnitId).blocker.code).toBe('RELEASE_UNIT_MAIN_DRIFT');
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

});
