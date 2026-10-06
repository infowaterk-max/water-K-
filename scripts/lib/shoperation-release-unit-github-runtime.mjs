import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readdirSync,readFileSync,rmSync,statSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applyReleaseUnitEvent,
  createReleaseParentExecution,
  materializeReleaseUnit,
  reconcileReleaseUnitManifest,
  refreshReleaseUnitIdentity,
  sealReleaseUnitManifest,
  synchronizeReleaseParentExecution,
  encodeReleaseUnitContextEnvelope,
  RELEASE_UNIT_CI_CONTEXT_CONTRACT,
} from './shoperation-release-unit-runtime.mjs';

const text=value=>String(value??'').trim();
const parse=value=>JSON.parse(String(value??'null'));
const defaultRun=(command,args,{cwd=process.cwd(),input=null,env={}}={})=>execFileSync(command,args,{cwd,encoding:'utf8',input:input??undefined,stdio:['pipe','pipe','pipe'],env:{...process.env,...env}}).trim();
const uniq=values=>[...new Set((values??[]).filter(Boolean))].sort();

export const stateRefFor=parentTransactionId=>'refs/heads/control-plane/release-state/'+text(parentTransactionId).toLowerCase().replace(/[^a-z0-9._/-]+/g,'-');

export function buildReleaseUnitCiEnvelope(manifest){
  const child=manifest?.childDevelopmentTransaction;
  if(!child?.plan||!child.planDigest||!child.bindingDigest)throw new Error('RELEASE_UNIT_CHILD_TRANSACTION_REQUIRED');
  return{
    contract:RELEASE_UNIT_CI_CONTEXT_CONTRACT,
    parentTransactionId:manifest.transaction?.parentTransactionId??manifest.transaction?.id??null,
    releaseUnitId:manifest.releaseUnitId,
    childTaskId:child.taskId,
    targetBaseSha:manifest.targetBaseSha,
    manifestDigest:manifest.manifestDigest,
    childPlanDigest:child.planDigest,
    operationDigest:child.operationDigest,
    bindingDigest:child.bindingDigest,
    childPlan:structuredClone(child.plan),
  };
}
export function releaseUnitCommitMessage(manifest){
  const child=manifest.childDevelopmentTransaction;
  return[
    'Materialize '+manifest.releaseUnitId,
    '',
    'Shoperation-Release-Unit-Manifest: '+manifest.manifestDigest,
    'Shoperation-Release-Unit-Child-Plan: '+child.planDigest,
    'Shoperation-Release-Unit-Binding: '+child.bindingDigest,
  ].join('\n');
}
export function releaseUnitPullRequestBody(manifest){
  return[
    'Canonical Shoperation Release Unit: '+manifest.releaseUnitId,
    '',
    'Machine-bound Unit 2 manifest and child Development Transaction. The context marker is evidence, not an operator-editable scope source.',
    '',
    encodeReleaseUnitContextEnvelope(buildReleaseUnitCiEnvelope(manifest)),
  ].join('\n');
}
export function selectExactSuccessfulCiRun(runs,{headSha,headBranch}={}){
  return (runs??[]).find(run=>run?.headSha===headSha&&run?.headBranch===headBranch&&run?.status==='completed'&&run?.conclusion==='success')??null;
}
export function validateExactPullRequest(pr,{headSha,baseSha,bindingDigest}={}){
  if(!pr||Number(pr.number)<1)throw new Error('RELEASE_UNIT_PR_REQUIRED');
  if(pr.head?.sha!==headSha)throw new Error('RELEASE_UNIT_PR_HEAD_MISMATCH');
  if(pr.base?.sha!==baseSha)throw new Error('RELEASE_UNIT_PR_BASE_MISMATCH');
  if(bindingDigest&&!String(pr.body??'').includes(bindingDigest))throw new Error('RELEASE_UNIT_PR_CONTEXT_MISMATCH');
  return pr;
}
function repoName(run,cwd){return text(run('gh',['repo','view','--json','nameWithOwner','-q','.nameWithOwner'],{cwd}));}
function ownerOf(repo){return repo.split('/')[0];}
function ghApi(run,cwd,args){return parse(run('gh',['api',...args],{cwd}));}
function findNamed(root,name){
  const queue=[root];
  while(queue.length){
    const current=queue.shift();
    for(const entry of readdirSync(current)){
      const full=path.join(current,entry),info=statSync(full);
      if(info.isDirectory())queue.push(full);else if(entry===name)return full;
    }
  }
  return null;
}

export function loadRemoteExecutionState({stateRef,run=defaultRun,cwd=process.cwd()}={}){
  let stateCommit='';
  try{stateCommit=text(run('git',['ls-remote','origin',stateRef],{cwd}).split(/\s+/)[0]);}catch{}
  if(!stateCommit)return{state:null,stateCommit:null};
  run('git',['fetch','--quiet','origin',stateRef],{cwd});
  return{state:parse(run('git',['show','FETCH_HEAD:state.json'],{cwd})),stateCommit};
}
export function persistRemoteExecutionState({state,stateRef=stateRefFor(state?.parentTransactionId),expectedStateCommit=null,run=defaultRun,cwd=process.cwd()}={}){
  const blob=run('git',['hash-object','-w','--stdin'],{cwd,input:JSON.stringify(state,null,2)+'\n'});
  const tree=run('git',['mktree'],{cwd,input:'100644 blob '+blob+'\tstate.json\n'});
  const commitArgs=['commit-tree',tree,'-m','Release state '+state.parentTransactionId];
  if(expectedStateCommit)commitArgs.push('-p',expectedStateCommit);
  const stateCommit=run('git',commitArgs,{cwd});
  const pushArgs=expectedStateCommit
    ?['push','--quiet','--force-with-lease='+stateRef+':'+expectedStateCommit,'origin',stateCommit+':'+stateRef]
    :['push','--quiet','origin',stateCommit+':'+stateRef];
  run('git',pushArgs,{cwd});
  return{stateRef,stateCommit};
}
export function pushExactMaterializedCommit({commitSha,branch,expectedRemoteSha=null,run=defaultRun,cwd=process.cwd()}={}){
  const ref='refs/heads/'+branch;
  const args=expectedRemoteSha
    ?['push','--quiet','--force-with-lease='+ref+':'+expectedRemoteSha,'origin',commitSha+':'+ref]
    :['push','--quiet','origin',commitSha+':'+ref];
  run('git',args,{cwd});
  return{branch,commitSha};
}
export function ensureExactPullRequest({manifest,materializedHeadSha,branch,repo=null,run=defaultRun,cwd=process.cwd()}={}){
  const repository=repo??repoName(run,cwd),owner=ownerOf(repository);
  const list=ghApi(run,cwd,['repos/'+repository+'/pulls?head='+encodeURIComponent(owner+':'+branch)+'&state=all&per_page=20']);
  let pr=(list??[]).find(item=>item.head?.sha===materializedHeadSha)??null;
  if(!pr){
    pr=ghApi(run,cwd,['-X','POST','repos/'+repository+'/pulls','-f','title=Release Unit '+manifest.releaseUnitId,'-f','head='+branch,'-f','base=main','-f','body='+releaseUnitPullRequestBody(manifest),'-F','draft=true']);
  }
  validateExactPullRequest(pr,{headSha:materializedHeadSha,baseSha:manifest.targetBaseSha,bindingDigest:manifest.childDevelopmentTransaction.bindingDigest});
  return{
    number:pr.number,
    headSha:pr.head.sha,
    baseSha:pr.base.sha,
    manifestDigest:manifest.manifestDigest,
    bindingDigest:manifest.childDevelopmentTransaction.bindingDigest,
    sourceCommit:manifest.sourceIdentity?.sourceCommit,
    url:pr.html_url??null,
  };
}
export function importExactChildProof({headSha,headBranch,repo=null,run=defaultRun,cwd=process.cwd()}={}){
  const repository=repo??repoName(run,cwd);
  const runs=parse(run('gh',['run','list','--repo',repository,'--workflow','CI','--commit',headSha,'--event','pull_request','--json','databaseId,status,conclusion,headSha,headBranch','--limit','30'],{cwd}));
  const exact=selectExactSuccessfulCiRun(runs,{headSha,headBranch});
  if(!exact)return{decision:'PENDING',reason:'EXACT_CI_NOT_SUCCESS'};
  const temp=mkdtempSync(path.join(os.tmpdir(),'shoperation-release-unit-proof-'));
  try{
    run('gh',['run','download',String(exact.databaseId),'--repo',repository,'--name','shoperation-resumable-verification-'+headSha,'--dir',temp],{cwd});
    const truthPath=findNamed(temp,'truth-gate.json'),closedPath=findNamed(temp,'active-plan.closed.json');
    if(!truthPath||!closedPath)throw new Error('RELEASE_UNIT_CHILD_PROOF_ARTIFACT_MISSING');
    return{decision:'PASS',runId:exact.databaseId,truth:parse(readFileSync(truthPath,'utf8')),lifecyclePlan:parse(readFileSync(closedPath,'utf8'))};
  }finally{rmSync(temp,{recursive:true,force:true});}
}
export function mergeExactPullRequest({prNumber,sourceHeadSha,repo=null,run=defaultRun,cwd=process.cwd(),mergeMethod='squash'}={}){
  const repository=repo??repoName(run,cwd);
  run('gh',['pr','ready',String(prNumber),'--repo',repository],{cwd});
  const result=ghApi(run,cwd,['-X','PUT','repos/'+repository+'/pulls/'+prNumber+'/merge','-f','merge_method='+mergeMethod,'-f','sha='+sourceHeadSha]);
  if(result?.merged!==true||!result?.sha)throw new Error('RELEASE_UNIT_GITHUB_MERGE_FAILED:'+String(result?.message??'unknown'));
  run('git',['fetch','--quiet','origin','main'],{cwd});
  const main=run('git',['rev-parse','origin/main'],{cwd});
  if(main!==result.sha)throw new Error('RELEASE_UNIT_POST_MERGE_MAIN_DRIFT:'+result.sha+':'+main);
  return{prNumber,sourceHeadSha,mergedMainSha:main,mergeMethod};
}
export function reevaluateSuccessorManifest({state,execution,currentMainSha,sourceCommit,run=defaultRun,cwd=process.cwd()}={}){
  const predecessorReceipts=(state.units??[])
    .filter(item=>(execution.manifest.predecessorUnits??[]).includes(item.releaseUnitId))
    .map(item=>({releaseUnitId:item.releaseUnitId,status:item.state==='CLOSED'?'MERGED':item.state,mergedMainSha:item.merge?.mergedMainSha??null}));
  let reconciled=reconcileReleaseUnitManifest(execution.manifest,{newBaseSha:currentMainSha,predecessorReceipts});
  const sealed=sealReleaseUnitManifest(reconciled,{sourceCommit,cwd});
  const candidate=materializeReleaseUnit({manifest:sealed,targetRef:'refs/remotes/origin/main',cwd,updateRef:false,message:releaseUnitCommitMessage(sealed)});
  const candidateHead=candidate.materializedHeadSha;
  const worktree=mkdtempSync(path.join(os.tmpdir(),'shoperation-release-unit-reeval-'));
  try{
    run('git',['worktree','add','--detach',worktree,candidateHead],{cwd});
    const planPath=path.join(worktree,'artifacts','shoperation-development-guard','release-unit-reevaluation-plan.json');
    mkdirSync(path.dirname(planPath),{recursive:true});
    writeFileSync(planPath,JSON.stringify(sealed.childDevelopmentTransaction.plan,null,2)+'\n');
    try{
      run(process.execPath,['scripts/shoperation-plan-before-code.mjs','--check'],{
        cwd:worktree,
        env:{
          SHOPERATION_ACTIVE_PLAN:planPath,
          DEVELOPMENT_BASE_SHA:currentMainSha,
          QUALITY_BASE_SHA:currentMainSha,
          RELEASE_BASE_SHA:currentMainSha,
          DEVELOPMENT_HEAD_SHA:candidateHead,
          QUALITY_HEAD_SHA:candidateHead,
          RELEASE_HEAD_SHA:candidateHead,
          SHOPERATION_REPLAY_HEAD:candidateHead,
        },
      });
    }catch(error){
      return{decision:'BLOCK',code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK',error:String(error?.stderr??error?.message??error)};
    }
    const reportPath=path.join(worktree,'artifacts','shoperation-development-guard','plan-before-code.json');
    const report=parse(readFileSync(reportPath,'utf8'));
    if(report.decision!=='PASS')return{decision:'BLOCK',code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_BLOCK',report};
    const projected=(report.releaseDecomposition?.releaseUnits??[])[0];
    if(!projected)return{decision:'BLOCK',code:'RELEASE_UNIT_SUCCESSOR_REEVALUATION_MANIFEST_MISSING',report};
    const next=structuredClone(reconciled);
    next.operations=(projected.operations??next.operations??[]).map(operation=>{const copy={...operation};delete copy.source;return copy;});
    next.requiredDependencyFiles=[...(projected.requiredDependencyFiles??[])];
    next.authorities=[...(projected.authorities??[])];
    next.subsystems=[...(projected.subsystems??[])];
    next.projectedRisk=structuredClone(projected.projectedRisk??report.projectedReleaseRisk??next.projectedRisk);
    next.requiredGates=[...(report.gateChain?.orderedGateIds??projected.requiredGates??[])];
    next.requiredEvidence=structuredClone(projected.requiredEvidence??next.requiredEvidence);
    next.forbiddenPaths=[...(projected.forbiddenPaths??next.forbiddenPaths??[])];
    next.readOnlyPaths=[...(projected.readOnlyPaths??next.readOnlyPaths??[])];
    next.generatedArtifactSemantics=structuredClone(projected.generatedArtifactSemantics??next.generatedArtifactSemantics??[]);
    const dependencyUnits=(state.units??[])
      .filter(item=>item.releaseUnitId!==next.releaseUnitId&&(next.requiredDependencyFiles??[]).some(file=>(item.manifest?.intendedFiles??[]).includes(file)))
      .map(item=>item.releaseUnitId);
    next.predecessorUnits=uniq([...(execution.manifest.predecessorUnits??[]),...dependencyUnits]);
    next.prerequisites=[...next.predecessorUnits];
    next.sourceIdentity={sourceCommit:null,sealed:false};
    const refreshed=refreshReleaseUnitIdentity(next);
    return{decision:'PASS',manifest:refreshed,report,candidateHead};
  }finally{
    try{run('git',['worktree','remove','--force',worktree],{cwd});}catch{}
    try{rmSync(worktree,{recursive:true,force:true});}catch{}
  }
}

export function initializeExecutionState({decomposition,sourceCommit}={}){
  const state=createReleaseParentExecution(decomposition);
  state.executionSourceCommit=sourceCommit;
  return state;
}
export function prepareActiveUnit({state,currentMainSha,sourceCommit,run=defaultRun,cwd=process.cwd()}={}){
  const active=state.units.find(item=>item.releaseUnitId===state.activeUnitId);
  if(!active)throw new Error('RELEASE_UNIT_ACTIVE_REQUIRED');
  let freshManifest=active.manifest;
  if(Number(active.order)>1||freshManifest.targetBaseSha!==currentMainSha){
    const reevaluated=reevaluateSuccessorManifest({state,execution:active,currentMainSha,sourceCommit,run,cwd});
    if(reevaluated.decision!=='PASS'){
      const blocked={...active,state:'STALE',blocker:{code:reevaluated.code,details:{error:reevaluated.error??null}},lastTransition:{to:'STALE',code:reevaluated.code}};
      return{state:synchronizeReleaseParentExecution(state,blocked),decision:'BLOCK',reason:blocked.blocker};
    }
    freshManifest=reevaluated.manifest;
  }
  const allFreshManifests=state.units.map(item=>item.releaseUnitId===active.releaseUnitId?freshManifest:item.manifest);
  let next=applyReleaseUnitEvent(state,{type:'AUTHORIZE',releaseUnitId:active.releaseUnitId,freshManifest,currentMainSha,allFreshManifests});
  let execution=next.units.find(item=>item.releaseUnitId===active.releaseUnitId);
  if(execution.state!=='READY')return{state:next,decision:'BLOCK',reason:execution.blocker};
  const sealed=sealReleaseUnitManifest(execution.manifest,{sourceCommit,cwd});
  execution={...execution,manifest:sealed,executionTransaction:{...execution.executionTransaction,manifestDigest:sealed.manifestDigest,bindingDigest:sealed.childDevelopmentTransaction?.bindingDigest??null,sourceIdentity:sealed.sourceIdentity}};
  next={...next,units:next.units.map(item=>item.releaseUnitId===execution.releaseUnitId?execution:item)};
  const branch=execution.executionTransaction.branchRef;
  const receipt=materializeReleaseUnit({manifest:sealed,targetRef:'refs/remotes/origin/main',cwd,updateRef:false,message:releaseUnitCommitMessage(sealed)});
  next=applyReleaseUnitEvent(next,{type:'MATERIALIZED',releaseUnitId:execution.releaseUnitId,receipt});
  if(receipt.status==='ALREADY_APPLIED'){
    const blocked={...next.units.find(item=>item.releaseUnitId===execution.releaseUnitId),state:'STALE',blocker:{code:'RELEASE_UNIT_ALREADY_APPLIED_REQUIRES_PARENT_RECONCILIATION',details:{targetBaseSha:sealed.targetBaseSha}},lastTransition:{to:'STALE',code:'RELEASE_UNIT_ALREADY_APPLIED_REQUIRES_PARENT_RECONCILIATION'}};
    return{state:synchronizeReleaseParentExecution(next,blocked),decision:'BLOCK',reason:blocked.blocker,branch,manifest:sealed,receipt};
  }
  pushExactMaterializedCommit({commitSha:receipt.materializedHeadSha,branch,run,cwd});
  const pr=ensureExactPullRequest({manifest:sealed,materializedHeadSha:receipt.materializedHeadSha,branch,run,cwd});
  next=applyReleaseUnitEvent(next,{type:'PR_OPEN',releaseUnitId:execution.releaseUnitId,receipt:pr});
  return{state:next,decision:'PR_OPEN',branch,manifest:sealed,receipt:pr};
}
export function finishActiveUnit({state,run=defaultRun,cwd=process.cwd()}={}){
  const active=state.units.find(item=>item.releaseUnitId===state.activeUnitId);
  if(!active||active.state!=='PR_OPEN')throw new Error('RELEASE_UNIT_PR_OPEN_REQUIRED');
  const proof=importExactChildProof({headSha:active.pullRequest.headSha,headBranch:active.executionTransaction.branchRef,run,cwd});
  if(proof.decision!=='PASS')return{state,decision:'PENDING',reason:proof.reason};
  let next=applyReleaseUnitEvent(state,{type:'VERIFIED',releaseUnitId:active.releaseUnitId,truth:proof.truth,lifecyclePlan:proof.lifecyclePlan});
  const verified=next.units.find(item=>item.releaseUnitId===active.releaseUnitId);
  const merge=mergeExactPullRequest({prNumber:verified.pullRequest.number,sourceHeadSha:verified.pullRequest.headSha,run,cwd});
  next=applyReleaseUnitEvent(next,{type:'MERGED',releaseUnitId:active.releaseUnitId,receipt:merge});
  next=applyReleaseUnitEvent(next,{type:'CLOSED',releaseUnitId:active.releaseUnitId,currentMainSha:merge.mergedMainSha});
  return{state:next,decision:next.closureEligible?'PARENT_CLOSURE_ELIGIBLE':'UNIT_CLOSED',mergedMainSha:merge.mergedMainSha};
}
