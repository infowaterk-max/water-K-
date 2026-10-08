import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {RELEASE_PARENT_MAIN_ADVANCE_PROOF_CONTRACT,buildReleaseParentClosureProofArtifactFromContext,buildReleaseParentClosureProofPlan,validateReleaseParentClosureProofPlan,recordReleaseParentClosureWithProofContext,releaseParentProtectedFiles,releaseParentUnitCloseReceiptDigests} from './lib/shoperation-release-unit-runtime.mjs';

const text=value=>String(value??'').trim();
const parse=value=>JSON.parse(String(value??'null'));
const slug=value=>text(value).toLowerCase().replace(/[^a-z0-9._/-]+/g,'-');
const defaultRun=(command,args,{cwd=process.cwd(),input=null,env={}}={})=>execFileSync(command,args,{cwd,encoding:'utf8',input:input??undefined,stdio:['pipe','pipe','pipe'],env:{...process.env,...env}}).trim();
const repoName=(run,cwd)=>text(run('gh',['repo','view','--json','nameWithOwner','-q','.nameWithOwner'],{cwd}));
const ownerOf=repo=>repo.split('/')[0];
const ghApi=(run,cwd,args)=>parse(run('gh',['api',...args],{cwd}));
const defaultWait=durationMs=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,durationMs);
// GitHub can briefly serve the previous PR head/base after a leased branch push.
// Only a fresh numbered PR GET with the entire exact identity may authorize
// a parent closure persistence transition; timeout remains fail-closed.
export function requireExactParentClosurePrIdentity({
  repository,prNumber,headSha,branch,finalMain,
  run=defaultRun,cwd=process.cwd(),maxReads=8,wait=defaultWait,
}={}){
  const expected={
    number:Number(prNumber),state:'open',headSha:text(headSha),
    headRef:text(branch),baseRef:'main',baseSha:text(finalMain),
  };
  if(!text(repository)||!Number.isSafeInteger(expected.number)||expected.number<1||
      !expected.headSha||!expected.headRef||!expected.baseSha)
    throw new Error('RELEASE_PARENT_CLOSURE_PR_IDENTITY_REQUIRED');
  const reads=Number.isSafeInteger(maxReads)?Math.min(8,Math.max(1,maxReads)):8;
  let observed=null;
  for(let attempt=1;attempt<=reads;attempt+=1){
    try{
      const pr=ghApi(run,cwd,['repos/'+repository+'/pulls/'+expected.number]);
      observed={
        number:Number(pr?.number??0),state:pr?.state??null,
        headSha:pr?.head?.sha??null,headRef:pr?.head?.ref??null,
        baseRef:pr?.base?.ref??null,baseSha:pr?.base?.sha??null,
      };
      if(Object.keys(expected).every(key=>observed[key]===expected[key]))return pr;
    }catch(error){
      observed={lookupError:String(error?.message??error)};
    }
    if(attempt<reads)wait(1000);
  }
  throw new Error('RELEASE_PARENT_CLOSURE_PR_IDENTITY_MISMATCH:'+JSON.stringify({expected,observed,reads}));
}
const exactSuccessfulCi=(runs,{headSha,headBranch}={})=>(runs??[]).find(item=>item?.headSha===headSha&&item?.headBranch===headBranch&&item?.status==='completed'&&item?.conclusion==='success')??null;
const uniq=values=>[...new Set((values??[]).filter(Boolean))].sort();
const finalImplementationMain=state=>[...(state.units??[])].sort((a,b)=>Number(a.order)-Number(b.order)).at(-1)?.merge?.mergedMainSha??null;

export function proveParentMainAdvance({state,fromSha,toSha,run=defaultRun,cwd=process.cwd()}={}){
  const from=text(fromSha),to=text(toSha);
  if(!from||!to)return{decision:'BLOCK',error:'RELEASE_PARENT_MAIN_ADVANCE_SHA_REQUIRED'};
  if(from===to)return{decision:'NO_ADVANCE',proof:null};
  if(!(state?.units??[]).length||(state.units??[]).some(item=>item?.state!=='CLOSED'||!item?.closeReceipt))return{decision:'BLOCK',error:'RELEASE_PARENT_MAIN_ADVANCE_CLOSED_RECEIPTS_REQUIRED'};
  try{run('git',['merge-base','--is-ancestor',from,to],{cwd});}
  catch{return{decision:'BLOCK',error:'RELEASE_PARENT_MAIN_ADVANCE_NON_FAST_FORWARD:'+from+':'+to};}
  let changedFiles;
  try{
    const raw=text(run('git',['diff','--name-only','--no-renames','--diff-filter=ACMRD',from,to],{cwd}));
    changedFiles=uniq(raw?raw.split(/\r?\n/).map(text).filter(Boolean):[]);
  }catch(error){
    return{decision:'BLOCK',error:'RELEASE_PARENT_MAIN_ADVANCE_DIFF_FAILED:'+String(error?.stderr??error?.message??error)};
  }
  const protectedFiles=releaseParentProtectedFiles(state);
  const overlapFiles=uniq(changedFiles.filter(file=>protectedFiles.includes(file)));
  if(overlapFiles.length)return{decision:'BLOCK',error:'RELEASE_PARENT_MAIN_ADVANCE_PROTECTED_SCOPE_OVERLAP:'+overlapFiles.join(','),details:{fromSha:from,toSha:to,changedFiles,protectedFiles,overlapFiles}};
  return{
    decision:'PASS',
    proof:{
      contract:RELEASE_PARENT_MAIN_ADVANCE_PROOF_CONTRACT,
      issuer:'release-unit-parent-close',
      decision:'PASS',
      relationship:'FAST_FORWARD',
      fromSha:from,
      toSha:to,
      changedFiles,
      protectedFiles,
      overlapFiles,
      unitCloseReceiptDigests:releaseParentUnitCloseReceiptDigests(state),
    },
  };
}

export function ensureParentClosureCiDispatch({headSha,headBranch,repo=null,run=defaultRun,cwd=process.cwd()}={}){
  const repository=repo??repoName(run,cwd);
  if(!text(headSha)||!text(headBranch))throw new Error('RELEASE_PARENT_CLOSURE_CI_DISPATCH_IDENTITY_REQUIRED');
  const fields='databaseId,status,conclusion,headSha,headBranch,event';
  const existing=parse(run('gh',['run','list','--repo',repository,'--workflow','CI','--commit',headSha,'--event','workflow_dispatch','--json',fields,'--limit','30'],{cwd}));
  const exact=(existing??[]).filter(item=>item?.headSha===headSha&&item?.headBranch===headBranch);
  const reusable=exact.find(item=>item?.status!=='completed'||item?.conclusion==='success')??null;
  if(reusable)return{decision:'EXISTS',runId:reusable.databaseId??null,status:reusable.status,conclusion:reusable.conclusion??null};
  try{run('gh',['workflow','run','ci.yml','--repo',repository,'--ref',headBranch],{cwd});}
  catch(error){throw new Error('RELEASE_PARENT_CLOSURE_CI_DISPATCH_FAILED:'+String(error?.stderr??error?.message??error));}
  return{decision:'DISPATCHED'};
}

function classifyParentClosureCi({headSha,headBranch,repo=null,run=defaultRun,cwd=process.cwd()}={}){
  const repository=repo??repoName(run,cwd),fields='databaseId,status,conclusion,headSha,headBranch,event';
  const dispatch=parse(run('gh',['run','list','--repo',repository,'--workflow','CI','--commit',headSha,'--event','workflow_dispatch','--json',fields,'--limit','30'],{cwd}));
  const pullRequest=parse(run('gh',['run','list','--repo',repository,'--workflow','CI','--commit',headSha,'--event','pull_request','--json',fields,'--limit','30'],{cwd}));
  const exact=[...(dispatch??[]),...(pullRequest??[])].filter(item=>item?.headSha===headSha&&item?.headBranch===headBranch);
  const success=exactSuccessfulCi(exact,{headSha,headBranch});
  if(success)return{decision:'PASS',run:success};
  const pending=exact.find(item=>item?.status!=='completed')??null;
  if(pending)return{decision:'PENDING',reason:'PARENT_CLOSURE_CI_PENDING',run:pending};
  const terminal=exact.find(item=>item?.status==='completed')??null;
  if(terminal)return{decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_CI_FAILED',error:String(terminal.conclusion??'unknown'),run:terminal};
  return{decision:'PENDING',reason:'PARENT_CLOSURE_CI_NOT_STARTED',run:null};
}

function runParentProof({state,sourceCommit,finalMain,trustedMainAdvance=null,run=defaultRun,cwd=process.cwd()}={}){
  const temp=mkdtempSync(path.join(os.tmpdir(),'shoperation-release-parent-close-'));
  const branch='release-execution/closure/'+slug(state.parentTransactionId);
  try{
    run('git',['worktree','add','--detach',temp,finalMain],{cwd});
    const sourcePlan=parse(run('git',['show',sourceCommit+':quality/development/active-plan.json'],{cwd}));
    if(sourcePlan.taskId!==state.parentTransactionId)throw new Error('RELEASE_PARENT_SOURCE_PLAN_TASK_MISMATCH');
    const external=sourcePlan.completionContract?.systemObligations?.externalGuards??[];
    if(external.length)throw new Error('RELEASE_PARENT_EXTERNAL_PROOF_REQUIRED:'+external.join(','));
    const artifactDir=path.join(temp,'artifacts','shoperation-development-guard');
    mkdirSync(artifactDir,{recursive:true});
    const plan=buildReleaseParentClosureProofPlan({parent:state,sourcePlan,sourceCommit,finalMainSha:finalMain,trustedMainAdvance});
    const parentClosureProofArtifact=buildReleaseParentClosureProofArtifactFromContext(plan.parentClosureContext);
    const proofArtifactPath=path.join(temp,parentClosureProofArtifact.path);
    mkdirSync(path.dirname(proofArtifactPath),{recursive:true});
    writeFileSync(proofArtifactPath,parentClosureProofArtifact.content);
    const planPath=path.join(artifactDir,'release-parent-active-plan.json');
    writeFileSync(planPath,JSON.stringify(plan,null,2)+'\n');
    const safeEnv={
      GH_TOKEN:'',GITHUB_TOKEN:'',
      SHOPERATION_ACTIVE_PLAN:planPath,
      SHOPERATION_PARENT_CLOSURE_PROOF_ARTIFACT:parentClosureProofArtifact.path,
      DEVELOPMENT_HEAD_SHA:finalMain,QUALITY_HEAD_SHA:finalMain,RELEASE_HEAD_SHA:finalMain,
      SHOPERATION_REPLAY_HEAD:finalMain,SHOPERATION_REPLAY_BRANCH:branch,
      SHOPERATION_VERIFICATION_ENVIRONMENT:'ci',SHOPERATION_TOOLCHAIN_ID:'node24',
      SHOPERATION_TRUTH_STATE_VERSION:'shoporation-ci.v1',
      GITHUB_SHA:finalMain,GITHUB_HEAD_REF:branch,GITHUB_REF_NAME:branch,
    };
    run('npm',['ci','--no-audit','--no-fund'],{cwd:temp,env:safeEnv});
    run(process.execPath,['scripts/shoperation-knowledge-preflight.mjs'],{cwd:temp,env:safeEnv});
    run(process.execPath,['scripts/shoperation-plan-before-code.mjs','--check'],{cwd:temp,env:safeEnv});
    run(process.execPath,['scripts/shoperation-edit-time-guard.mjs','--check'],{cwd:temp,env:safeEnv});
    run(process.execPath,['scripts/shoperation-incremental-replay.mjs','--check'],{cwd:temp,env:safeEnv});
    run(process.execPath,['scripts/release-risk-budget.mjs'],{cwd:temp,env:safeEnv});
    run('npm',['run','db:customer:guard'],{cwd:temp,env:safeEnv});
    run('npm',['run','market-ready:gate'],{cwd:temp,env:safeEnv});
    run('npm',['test'],{cwd:temp,env:safeEnv});
    run('npm',['run','typecheck'],{cwd:temp,env:safeEnv});
    run('npm',['run','build'],{cwd:temp,env:safeEnv});
    const outcomes={
      'GUARD-KNOWLEDGE-PREFLIGHT':'success','GUARD-PLAN-BEFORE-CODE':'success','GUARD-EDIT-TIME':'success','GUARD-INCREMENTAL-REPLAY':'success','GUARD-RELEASE-RISK':'success',
      'GUARD-CUSTOMER-BASELINE':'success','GUARD-MARKET-READY':'success','GUARD-QUALITY-TESTS':'success','GUARD-TYPECHECK':'success','GUARD-PRODUCTION-BUILD':'success',
    };
    const verifyEnv={...safeEnv,SHOPERATION_REPLAY_PLAN:path.join(artifactDir,'resumable-verification-plan.json'),SHOPERATION_REPLAY_CHECKPOINT:path.join(temp,'artifacts','shoperation-verification-cache','checkpoint.json'),SHOPERATION_VERIFICATION_OUTCOMES_JSON:JSON.stringify(outcomes)};
    run(process.execPath,['scripts/shoperation-verification-checkpoint.mjs','--check'],{cwd:temp,env:verifyEnv});
    const truthEnv={...verifyEnv,SHOPERATION_TRUTH_HEAD:finalMain,SHOPERATION_TRUTH_BRANCH:branch,SHOPERATION_TRUTH_EVIDENCE_MANIFEST:path.join(artifactDir,'final-evidence-manifest.json'),SHOPERATION_TRUTH_CHECKPOINT:verifyEnv.SHOPERATION_REPLAY_CHECKPOINT};
    run(process.execPath,['scripts/shoperation-truth-gate.mjs','--check'],{cwd:temp,env:truthEnv});
    const truth=parse(readFileSync(path.join(artifactDir,'truth-gate.json'),'utf8'));
    run(process.execPath,['scripts/shoperation-close-development-plan.mjs','--emit'],{cwd:temp,env:{...truthEnv,SHOPERATION_CLOSURE_HEAD:finalMain,SHOPERATION_CLOSURE_TRUTH_REPORT:path.join(artifactDir,'truth-gate.json')}});
    const lifecyclePlan=parse(readFileSync(path.join(artifactDir,'active-plan.closed.json'),'utf8'));
    return{temp,branch,truth,lifecyclePlan,sourcePlan,closurePlan:plan,parentClosureProofArtifact};
  }catch(error){
    try{run('git',['worktree','remove','--force',temp],{cwd});}catch{}
    try{rmSync(temp,{recursive:true,force:true});}catch{}
    throw error;
  }
}

function createClosurePullRequest({proof,state,finalMain,run=defaultRun,cwd=process.cwd()}={}){
  const {temp,branch,lifecyclePlan,parentClosureProofArtifact}=proof;
  try{
    if(!parentClosureProofArtifact?.path||!parentClosureProofArtifact?.content)throw new Error('RELEASE_PARENT_CLOSURE_PROOF_ARTIFACT_REQUIRED');
    const proofArtifactPath=path.join(temp,parentClosureProofArtifact.path);
    if(readFileSync(proofArtifactPath,'utf8')!==parentClosureProofArtifact.content)throw new Error('RELEASE_PARENT_CLOSURE_PROOF_ARTIFACT_BYTES_DRIFT');
    writeFileSync(path.join(temp,'quality','development','active-plan.json'),JSON.stringify(lifecyclePlan,null,2)+'\n');
    run('git',['add','quality/development/active-plan.json',parentClosureProofArtifact.path],{cwd:temp});
    run('git',['-c','user.name=shoperation-release-executor','-c','user.email=shoperation-release-executor@users.noreply.github.com','commit','-m','Close development plan '+state.parentTransactionId],{cwd:temp});
    const headSha=run('git',['rev-parse','HEAD'],{cwd:temp});
    const remoteRef='refs/heads/'+branch;
    const remoteRaw=text(run('git',['ls-remote','--heads','origin',remoteRef],{cwd:temp}));
    const remoteHead=remoteRaw?remoteRaw.split(/\s+/)[0]:null;
    if(remoteHead&&remoteHead!==headSha)run('git',['push','--quiet','--force-with-lease='+remoteRef+':'+remoteHead,'origin',headSha+':'+remoteRef],{cwd:temp});
    else if(!remoteHead)run('git',['push','--quiet','origin',headSha+':'+remoteRef],{cwd:temp});
    const repository=repoName(run,cwd),owner=ownerOf(repository);
    const list=ghApi(run,cwd,['repos/'+repository+'/pulls?head='+encodeURIComponent(owner+':'+branch)+'&state=all&per_page=20']);
    let pr=(list??[]).find(item=>item.state==='open')??null;
    if(!pr){
      const closed=(list??[]).find(item=>item.state==='closed');
      if(closed)throw new Error('RELEASE_PARENT_CLOSURE_PR_CLOSED:'+closed.number);
      pr=ghApi(run,cwd,['-X','POST','repos/'+repository+'/pulls','-f','title=Close Development Transaction '+state.parentTransactionId,'-f','head='+branch,'-f','base=main','-f','body=Canonical parent Completion Truth/Lifecycle closure. Verified implementation main: '+finalMain]);
    }
    pr=requireExactParentClosurePrIdentity({repository,prNumber:pr.number,headSha,branch,finalMain,run,cwd});
    const ciDispatch=ensureParentClosureCiDispatch({headSha,headBranch:branch,repo:repository,run,cwd});
    return{contract:'shoporation.release-parent-closure-persistence.v1',state:'PR_OPEN',branch,prNumber:pr.number,headSha,baseSha:finalMain,url:pr.html_url??null,ciDispatch};
  }finally{
    try{run('git',['worktree','remove','--force',temp],{cwd});}catch{}
    try{rmSync(temp,{recursive:true,force:true});}catch{}
  }
}

export function closeParentReleaseExecution({state,sourceCommit,run=defaultRun,cwd=process.cwd()}={}){
  if(!state?.closureEligible||state.activeUnitId!==null||(state.units??[]).some(item=>item.state!=='CLOSED'))return{state,decision:'BLOCK',reason:'RELEASE_PARENT_NOT_CLOSURE_ELIGIBLE'};
  const lastChildMain=finalImplementationMain(state);
  run('git',['fetch','--quiet','origin','main'],{cwd});
  const currentMain=run('git',['rev-parse','origin/main'],{cwd});
  if(!lastChildMain)return{state,decision:'BLOCK',reason:'RELEASE_PARENT_FINAL_MAIN_DRIFT',error:'RELEASE_PARENT_FINAL_MAIN_MISSING'};
  let trustedMainAdvance=null;
  if(currentMain!==lastChildMain){
    const advance=proveParentMainAdvance({state,fromSha:lastChildMain,toSha:currentMain,run,cwd});
    if(advance.decision!=='PASS')return{state,decision:'BLOCK',reason:'RELEASE_PARENT_FINAL_MAIN_DRIFT',error:advance.error??null,details:advance.details??null};
    trustedMainAdvance=advance.proof;
  }
  const finalMain=currentMain;
  try{
    const proof=runParentProof({state,sourceCommit,finalMain,trustedMainAdvance,run,cwd});
    let next=recordReleaseParentClosureWithProofContext(state,{truth:proof.truth,lifecyclePlan:proof.lifecyclePlan,currentMainSha:finalMain,trustedMainAdvance,sourcePlan:proof.sourcePlan,sourceCommit,proofArtifact:proof.parentClosureProofArtifact});
    next={...next,closurePersistence:createClosurePullRequest({proof,state:next,finalMain,run,cwd})};
    return{state:next,decision:'PENDING',reason:'PARENT_CLOSURE_PR_OPEN'};
  }catch(error){
    return{state,decision:'BLOCK',reason:'RELEASE_PARENT_PROOF_OR_PERSISTENCE_FAILED',error:String(error?.stderr??error?.message??error)};
  }
}


/**
 * A preceding executor can push a metadata-only closure PR then lose its
 * canonical state CAS. Such a remote head is NEVER authoritative by itself:
 * prove that the committed previous projection was derived from the same
 * immutable source, CLOSED child receipts, final main and deterministic
 * proof artifact before allowing the current main to be reprojected.
 */
export function proveInterruptedParentClosureProjection({
  state,sourceCommit,pr,currentMain,repo=null,run=defaultRun,cwd=process.cwd(),
}={}){
  const persistence=state?.closurePersistence??{};
  const details={
    expectedPersistedHead:persistence.headSha??null,
    expectedPersistedBase:persistence.baseSha??null,
    observedHead:pr?.head?.sha??null,
    observedBase:pr?.base?.sha??null,
    currentMain:currentMain??null,
  };
  const block=(cause)=>({decision:'BLOCK',error:'RELEASE_PARENT_INTERRUPTED_REPROJECTION_INVALID:'+cause,details});
  const shaOk=value=>/^[0-9a-f]{40}$/i.test(text(value));
  const repository=repo??repoName(run,cwd);
  if(!state?.closureComplete||persistence.state!=='PR_OPEN'||!shaOk(sourceCommit)||
      state.executionSourceCommit!==sourceCommit)return block('SOURCE_OR_STATE_IDENTITY');
  if(pr?.number!==persistence.prNumber||pr?.state!=='open'||
      pr?.head?.ref!==persistence.branch||pr?.base?.ref!=='main'||
      pr?.head?.repo?.full_name!==repository||pr?.base?.repo?.full_name!==repository)
    return block('PR_REPOSITORY_OR_REF');
  const observedHead=text(pr.head.sha),observedBase=text(pr.base.sha);
  if(!shaOk(observedHead)||!shaOk(observedBase)||!shaOk(currentMain)||
      observedHead===persistence.headSha||observedBase===persistence.baseSha||
      currentMain===persistence.baseSha)return block('NO_PARTIAL_NEWER_PROJECTION');
  try{
    const stateAdvance=proveParentMainAdvance({state,fromSha:persistence.baseSha,toSha:currentMain,run,cwd});
    if(stateAdvance.decision!=='PASS')return block('TRUSTED_CURRENT_MAIN_ADVANCE');
    const previousAdvance=proveParentMainAdvance({state,fromSha:persistence.baseSha,toSha:observedBase,run,cwd});
    if(previousAdvance.decision!=='PASS')return block('PREVIOUS_PR_BASE_ADVANCE');
    const nextAdvance=proveParentMainAdvance({state,fromSha:observedBase,toSha:currentMain,run,cwd});
    if(!['PASS','NO_ADVANCE'].includes(nextAdvance.decision))return block('PR_BASE_NOT_TRUSTED_ANCESTOR');
    run('git',['fetch','--quiet','origin',observedHead],{cwd});
    const parents=text(run('git',['rev-list','--parents','-n','1',observedHead],{cwd})).split(/\s+/);
    if(parents.length!==2||parents[0]!==observedHead||parents[1]!==observedBase)
      return block('REMOTE_CLOSURE_DIRECT_PARENT_MISMATCH');
    const sourcePlan=parse(run('git',['show',sourceCommit+':quality/development/active-plan.json'],{cwd}));
    if(sourcePlan?.taskId!==state.parentTransactionId)return block('IMMUTABLE_PARENT_SOURCE_MISMATCH');
    const lastChildMain=finalImplementationMain(state);
    const proof=proveParentMainAdvance({state,fromSha:lastChildMain,toSha:observedBase,run,cwd});
    if(!['PASS','NO_ADVANCE'].includes(proof.decision))return block('PREVIOUS_PROOF_MAIN_ADVANCE');
    const expectedPlan=buildReleaseParentClosureProofPlan({
      parent:state,sourcePlan,sourceCommit,finalMainSha:observedBase,
      trustedMainAdvance:proof.decision==='PASS'?proof.proof:null,
    });
    const committedPlan=parse(run('git',['show',observedHead+':quality/development/active-plan.json'],{cwd}));
    if(!validateReleaseParentClosureProofPlan(committedPlan,{
      parent:state,sourcePlan,sourceCommit,finalMainSha:observedBase,
      trustedMainAdvance:proof.decision==='PASS'?proof.proof:null,
    }))return block('COMMITTED_PARENT_PROOF_PLAN_MISMATCH');
    const artifact=buildReleaseParentClosureProofArtifactFromContext(expectedPlan.parentClosureContext);
    const changes=text(run('git',['diff','--name-status','--no-renames',observedBase,observedHead],{cwd}))
      .split(/\r?\n/).filter(Boolean).sort();
    const expectedChanges=[
      'M\tquality/development/active-plan.json','A\t'+artifact.path,
    ].sort();
    if(JSON.stringify(changes)!==JSON.stringify(expectedChanges))return block('REMOTE_CLOSURE_METADATA_SCOPE_MISMATCH');
    // Compare git blob hashes, not trimmed stdout, so persisted bytes are exact.
    const actualBlob=text(run('git',['rev-parse',observedHead+':'+artifact.path],{cwd}));
    const expectedBlob=text(run('git',['hash-object','--stdin'],{cwd,input:artifact.content}));
    if(!shaOk(actualBlob)||actualBlob!==expectedBlob)return block('COMMITTED_PARENT_ARTIFACT_BYTES_MISMATCH');
    return{decision:'PASS',reason:'AUTHENTIC_INTERRUPTED_PARENT_PROJECTION',details};
  }catch(error){
    return block('PROOF_QUERY_FAILED:'+String(error?.message??error));
  }
}


const POST_MERGE_MAIN_CI_CONTRACT='shoporation.release-parent-post-merge-main-ci.v1';
const validSha=value=>/^[0-9a-f]{40}$/i.test(text(value));
const parentPostMergeNonce=(state,mergedMainSha)=>'parent-main-ci-'+createHash('sha256').update(JSON.stringify({
  contract:POST_MERGE_MAIN_CI_CONTRACT,parentId:state.parentTransactionId,
  sourceCommit:state.executionSourceCommit,mergedMainSha,
})).digest('hex').slice(0,32);
const blockParentPostMergeCi=(state,reason,details=null)=>({state,decision:'BLOCK',reason,details});
export function createPendingParentMainCiState({state,sourceCommit,mergedMainSha}={}){
  const p=state?.closurePersistence;
  if(!state?.closureComplete||p?.state!=='PR_OPEN'||p?.contract!=='shoporation.release-parent-closure-persistence.v1'||
      !validSha(sourceCommit)||state.executionSourceCommit!==sourceCommit||!validSha(mergedMainSha)||
      state.closedReceipt?.decision!=='PASS'||state.closedReceipt?.truthStatus!=='VERIFIED'||
      state.closedReceipt?.parentTransactionId!==state.parentTransactionId||
      !(state.units??[]).length||(state.units??[]).some(unit=>unit?.state!=='CLOSED'||unit?.closeReceipt?.decision!=='PASS'))
    throw new Error('RELEASE_PARENT_POST_MERGE_CLOSED_RECEIPTS_INVALID');
  return{...structuredClone(state),closurePersistence:{...structuredClone(p),state:'POST_MERGE_CI_PENDING',mergedMainSha,
    postMergeMainCi:{contract:POST_MERGE_MAIN_CI_CONTRACT,status:'INTENT_RECORDED',decision:'PENDING',runId:null,
      nonce:parentPostMergeNonce(state,mergedMainSha),parentTransactionId:state.parentTransactionId,sourceCommit,
      mergedMainSha,headBranch:'main'}}};
}
export function classifyParentPostMergeMainCiRun({state,ciRun,jobs=null,mergedAt=null}={}){
  const p=state?.closurePersistence,proof=p?.postMergeMainCi??{};
  const bad=code=>({decision:'BLOCK',reason:'RELEASE_PARENT_POST_MERGE_CI_'+code});
  if(p?.state!=='POST_MERGE_CI_PENDING'||proof?.contract!==POST_MERGE_MAIN_CI_CONTRACT||
    proof.parentTransactionId!==state.parentTransactionId||proof.sourceCommit!==state.executionSourceCommit||
    proof.mergedMainSha!==p.mergedMainSha||proof.headBranch!=='main'||proof.nonce!==parentPostMergeNonce(state,p.mergedMainSha))
    return bad('PERSISTED_IDENTITY_MISMATCH');
  if(!Number.isSafeInteger(ciRun?.id)||ciRun.id<1||
      (proof.runId!==null&&proof.runId!==ciRun.id)||ciRun.head_sha!==p.mergedMainSha||
      ciRun.head_branch!=='main'||ciRun.event!=='workflow_dispatch'||ciRun.name!==proof.nonce||
      text(ciRun.path).split('@')[0]!=='.github/workflows/ci.yml'||
      ciRun.display_title!==proof.nonce||ciRun.actor?.login!=='github-actions[bot]')
    return bad('RUN_IDENTITY_MISMATCH');
  if(mergedAt&&(!ciRun.created_at||!(Date.parse(ciRun.created_at)>=Date.parse(mergedAt))))
    return bad('PRE_MERGE_RUN_REJECTED');
  if(ciRun.status!=='completed')return{decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_PENDING',runId:ciRun.id,status:ciRun.status};
  if(ciRun.conclusion!=='success')return{decision:'BLOCK',reason:'RELEASE_PARENT_POST_MERGE_CI_FAILED',runId:ciRun.id,conclusion:ciRun.conclusion??null};
  if(!Array.isArray(jobs))return bad('JOB_PROOF_MISSING');
  const build=jobs.find(item=>item.name==='build'&&item.status==='completed'&&item.conclusion==='success');
  const security=jobs.find(item=>item.name==='security-audit'&&item.status==='completed'&&item.conclusion==='success');
  const steps=['Bind exact parent post-merge main CI','Knowledge Before Build preflight','Incremental Known Failure Replay','Quality tests','TypeScript check','Production build'];
  if(!build||!security||steps.some(name=>!build.steps?.some(step=>step.name===name&&step.status==='completed'&&step.conclusion==='success')))
    return bad('REQUIRED_JOBS_OR_STEPS_MISSING');
  return{decision:'PASS',receipt:{contract:POST_MERGE_MAIN_CI_CONTRACT,decision:'PASS',status:'COMPLETED',
    runId:ciRun.id,runAttempt:ciRun.run_attempt??1,event:'workflow_dispatch',workflow:'CI',
    actor:'github-actions[bot]',headBranch:'main',headSha:p.mergedMainSha,sourceCommit:state.executionSourceCommit,
    parentTransactionId:state.parentTransactionId,nonce:proof.nonce,conclusion:'success',
    completedAt:ciRun.updated_at??null,verifiedSteps:steps,securityAudit:'success'}};
}
export function advanceParentPostMergeMainCi({state,sourceCommit,run=defaultRun,cwd=process.cwd()}={}){
  const p=state?.closurePersistence,proof=p?.postMergeMainCi;
  if(!state?.closureComplete||p?.state!=='POST_MERGE_CI_PENDING'||proof?.contract!==POST_MERGE_MAIN_CI_CONTRACT||
      state.executionSourceCommit!==sourceCommit||!validSha(p.mergedMainSha)||
      proof.nonce!==parentPostMergeNonce(state,p.mergedMainSha)||proof.sourceCommit!==sourceCommit||
      proof.parentTransactionId!==state.parentTransactionId||proof.mergedMainSha!==p.mergedMainSha||
      state.closedReceipt?.decision!=='PASS'||state.closedReceipt?.truthStatus!=='VERIFIED'||
      !(state.units??[]).length||(state.units??[]).some(x=>x.state!=='CLOSED'||x.closeReceipt?.decision!=='PASS'))
    return blockParentPostMergeCi(state,'RELEASE_PARENT_POST_MERGE_SOURCE_OR_STATE_INVALID');
  const repository=repoName(run,cwd),pr=ghApi(run,cwd,['repos/'+repository+'/pulls/'+p.prNumber]);
  if(pr?.state!=='closed'||pr?.merged!==true||pr?.head?.sha!==p.headSha||pr?.head?.ref!==p.branch||
      pr?.base?.ref!=='main'||pr?.base?.sha!==p.baseSha||pr?.merge_commit_sha!==p.mergedMainSha||
      pr?.merged_by?.login!=='github-actions[bot]')
    return blockParentPostMergeCi(state,'RELEASE_PARENT_POST_MERGE_PR_IDENTITY_DRIFT');
  const rawMain=text(run('git',['ls-remote','origin','refs/heads/main'],{cwd})).split(/\s+/)[0];
  if(rawMain!==p.mergedMainSha)
    return blockParentPostMergeCi(state,'RELEASE_PARENT_POST_MERGE_MAIN_DRIFT',{expected:p.mergedMainSha,actual:rawMain});
  const update=fields=>({...structuredClone(state),closurePersistence:{...structuredClone(p),
    postMergeMainCi:{...structuredClone(proof),...fields}}});
  let runId=proof.runId;
  if(runId===null){
    const fields='databaseId,status,conclusion,headSha,headBranch,event,displayTitle,createdAt';
    const listed=parse(run('gh',['run','list','--repo',repository,'--workflow','CI','--commit',p.mergedMainSha,
      '--event','workflow_dispatch','--json',fields,'--limit','100'],{cwd}));
    const exact=(listed??[]).filter(item=>item.displayTitle===proof.nonce&&item.headSha===p.mergedMainSha&&
      item.headBranch==='main'&&item.event==='workflow_dispatch');
    if(exact.length>1)
      return blockParentPostMergeCi(state,'RELEASE_PARENT_POST_MERGE_DUPLICATE_RUNS',{ids:exact.map(x=>x.databaseId)});
    if(exact.length)runId=exact[0].databaseId;
    else if(proof.status==='INTENT_RECORDED'){
      // The caller must commit this one-shot authorization with CAS before any
      // external GitHub workflow_dispatch side effect is allowed.
      return{state:update({status:'DISPATCH_ARMED',runId:null}),
        decision:'DISPATCH_ARMED',reason:'PARENT_POST_MERGE_MAIN_CI_DISPATCH_RESERVED'};
    }else return{state,decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_DISPATCH_UNCERTAIN',
      details:{nonce:proof.nonce,status:proof.status,operatorReviewRequired:true}};
  }
  if(!Number.isSafeInteger(runId)||runId<1)return blockParentPostMergeCi(state,'RELEASE_PARENT_POST_MERGE_RUN_ID_INVALID',{runId});
  let ciRun;
  try{ciRun=ghApi(run,cwd,['repos/'+repository+'/actions/runs/'+runId]);}
  catch{return{state:update({status:'DISPATCH_REQUESTED',runId}),decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_RUN_NOT_VISIBLE'};}
  const jobs=ciRun.status==='completed'&&ciRun.conclusion==='success'?
    ghApi(run,cwd,['repos/'+repository+'/actions/runs/'+runId+'/jobs?per_page=100'])?.jobs??null:null;
  const verified=classifyParentPostMergeMainCiRun({state:update({runId}),ciRun,jobs,mergedAt:pr.merged_at});
  if(verified.decision==='PENDING')
    return{state:update({status:'OBSERVED',runId,observedStatus:ciRun.status}),decision:'PENDING',reason:verified.reason,details:{runId,status:ciRun.status}};
  if(verified.decision==='BLOCK'){
    if(verified.reason==='RELEASE_PARENT_POST_MERGE_CI_FAILED')
      return{state:update({status:'FAILED',runId,observedStatus:'completed',observedConclusion:ciRun.conclusion}),
        decision:'BLOCK',reason:verified.reason,details:{runId,conclusion:ciRun.conclusion}};
    return blockParentPostMergeCi(state,verified.reason,{runId});
  }
  return{state:{...structuredClone(state),closurePersistence:{...structuredClone(p),state:'MERGED',
    postMergeMainCi:{...structuredClone(proof),...verified.receipt,status:'COMPLETED',runId,decision:'PASS'}}},
    decision:'PARENT_CLOSED',mergedMainSha:p.mergedMainSha,postMergeMainCi:verified.receipt};
}

export function dispatchArmedParentMainCi({state,sourceCommit,run=defaultRun,cwd=process.cwd()}={}){
  const p=state?.closurePersistence,proof=p?.postMergeMainCi;
  if(p?.state!=='POST_MERGE_CI_PENDING'||proof?.status!=='DISPATCH_ARMED'||
      proof.runId!==null||proof?.contract!==POST_MERGE_MAIN_CI_CONTRACT||
      proof.sourceCommit!==sourceCommit||state.executionSourceCommit!==sourceCommit||
      proof.parentTransactionId!==state.parentTransactionId||
      proof.mergedMainSha!==p.mergedMainSha||proof.nonce!==parentPostMergeNonce(state,p.mergedMainSha))
    return blockParentPostMergeCi(state,'RELEASE_PARENT_POST_MERGE_DISPATCH_RESERVATION_INVALID');
  // Validate the PR, current main, source and any already-visible correlated
  // workflow again *after* the reservation has been durably persisted.
  // A resumed DISPATCH_ARMED state never calls this function automatically.
  const checked=advanceParentPostMergeMainCi({state,sourceCommit,run,cwd});
  if(checked.decision!=='PENDING'||checked.reason!=='PARENT_POST_MERGE_MAIN_CI_DISPATCH_UNCERTAIN')
    return checked;
  const repository=repoName(run,cwd);
  // Deliberately at-most-once: if this external action succeeds but the caller
  // crashes before the next CAS, recovery only searches by nonce. If the
  // dispatch was not accepted, automatic retries remain blocked and require
  // an explicit human-governed recovery, not a second blind network attempt.
  const response=run('gh',['workflow','run','ci.yml','--repo',repository,'--ref','main',
    '-f','parent_post_merge_id='+state.parentTransactionId,
    '-f','parent_post_merge_source_sha='+sourceCommit,
    '-f','parent_post_merge_sha='+p.mergedMainSha,
    '-f','parent_post_merge_nonce='+proof.nonce],{cwd});
  const found=Number(text(response).match(/\/actions\/runs\/([0-9]+)/)?.[1]??0);
  const next={...structuredClone(state),closurePersistence:{...structuredClone(p),
    postMergeMainCi:{...structuredClone(proof),status:'DISPATCH_REQUESTED',
      runId:Number.isSafeInteger(found)&&found>0?found:null}}};
  return{state:next,decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_DISPATCHED'};
}

export function finishParentClosurePersistence({state,sourceCommit,run=defaultRun,cwd=process.cwd()}={}){
  const persistence=state?.closurePersistence;
  if(!state?.closureComplete||persistence?.state!=='PR_OPEN')return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_PERSISTENCE_NOT_OPEN'};
  const repository=repoName(run,cwd);
  let pr=ghApi(run,cwd,['repos/'+repository+'/pulls/'+persistence.prNumber]);
  const persistedPrIdentityValid=pr.state==='open'&&pr.head?.sha===persistence.headSha&&pr.head?.ref===persistence.branch&&pr.base?.ref==='main'&&pr.number===persistence.prNumber;
  const reproject=currentMain=>{
    const incremental=proveParentMainAdvance({state,fromSha:persistence.baseSha,toSha:currentMain,run,cwd});
    if(incremental.decision!=='PASS')return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_MAIN_DRIFT',error:incremental.error??null,details:incremental.details??null};
    const lastChildMain=finalImplementationMain(state);
    const canonical=proveParentMainAdvance({state,fromSha:lastChildMain,toSha:currentMain,run,cwd});
    if(canonical.decision!=='PASS')return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_MAIN_DRIFT',error:canonical.error??null,details:canonical.details??null};
    try{
      const proof=runParentProof({state,sourceCommit,finalMain:currentMain,trustedMainAdvance:canonical.proof,run,cwd});
      let next=recordReleaseParentClosureWithProofContext(state,{truth:proof.truth,lifecyclePlan:proof.lifecyclePlan,currentMainSha:currentMain,trustedMainAdvance:canonical.proof,sourcePlan:proof.sourcePlan,sourceCommit,proofArtifact:proof.parentClosureProofArtifact});
      next={...next,closurePersistence:createClosurePullRequest({proof,state:next,finalMain:currentMain,run,cwd})};
      return{state:next,decision:'PENDING',reason:'PARENT_CLOSURE_REPROJECTED'};
    }catch(error){
      return{state,decision:'BLOCK',reason:'RELEASE_PARENT_PROOF_OR_PERSISTENCE_FAILED',error:String(error?.stderr??error?.message??error)};
    }
  };
  run('git',['fetch','--quiet','origin','main'],{cwd});
  let currentMain=run('git',['rev-parse','origin/main'],{cwd});
  if(pr.state==='closed'&&pr.merged===true){
    const eligible=state.executionSourceCommit===sourceCommit&&pr.number===persistence.prNumber&&
      pr.head?.sha===persistence.headSha&&pr.head?.ref===persistence.branch&&
      pr.base?.ref==='main'&&pr.base?.sha===persistence.baseSha&&
      pr.merged_by?.login==='github-actions[bot]'&&validSha(pr.merge_commit_sha)&&
      currentMain===pr.merge_commit_sha;
    if(!eligible)return{state,decision:'BLOCK',reason:'RELEASE_PARENT_INTERRUPTED_MERGE_IDENTITY_INVALID'};
    const parents=text(run('git',['rev-list','--parents','-n','1',pr.merge_commit_sha],{cwd})).split(/\s+/);
    if(parents.length!==2||parents[0]!==pr.merge_commit_sha||parents[1]!==persistence.baseSha)
      return{state,decision:'BLOCK',reason:'RELEASE_PARENT_INTERRUPTED_MERGE_ANCESTRY_INVALID'};
    const ci=classifyParentClosureCi({headSha:persistence.headSha,headBranch:persistence.branch,repo:repository,run,cwd});
    if(ci.decision!=='PASS')
      return{state,decision:'BLOCK',reason:'RELEASE_PARENT_INTERRUPTED_MERGE_PR_CI_NOT_PROVEN',details:{decision:ci.decision}};
    try{return{state:createPendingParentMainCiState({state,sourceCommit,mergedMainSha:pr.merge_commit_sha}),
      decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_RECOVERED'};}
    catch(error){return{state,decision:'BLOCK',reason:'RELEASE_PARENT_INTERRUPTED_MERGE_RECEIPT_INVALID',error:String(error?.message??error)};}
  }
  if(!persistedPrIdentityValid){
    const recovered=proveInterruptedParentClosureProjection({state,sourceCommit,pr,currentMain,repo:repository,run,cwd});
    if(recovered.decision!=='PASS')return{
      state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_PR_DRIFT',
      error:recovered.error+':'+JSON.stringify(recovered.details),details:recovered.details,
    };
    return reproject(currentMain);
  }
  if(currentMain!==persistence.baseSha)return reproject(currentMain);
  if(pr.base?.sha!==persistence.baseSha)return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_PR_DRIFT'};
  const ensured=ensureParentClosureCiDispatch({headSha:persistence.headSha,headBranch:persistence.branch,repo:repository,run,cwd});
  if(ensured.decision==='DISPATCHED')return{state,decision:'PENDING',reason:'PARENT_CLOSURE_CI_DISPATCHED'};
  const ci=classifyParentClosureCi({headSha:persistence.headSha,headBranch:persistence.branch,repo:repository,run,cwd});
  if(ci.decision==='PENDING')return{state,decision:'PENDING',reason:ci.reason,details:{runId:ci.run?.databaseId??null,event:ci.run?.event??null,status:ci.run?.status??null}};
  if(ci.decision==='BLOCK')return{state,decision:'BLOCK',reason:ci.reason,error:ci.error??null,details:{runId:ci.run?.databaseId??null,event:ci.run?.event??null,status:ci.run?.status??null,conclusion:ci.run?.conclusion??null}};
  run('git',['fetch','--quiet','origin','main'],{cwd});
  currentMain=run('git',['rev-parse','origin/main'],{cwd});
  if(currentMain!==persistence.baseSha)return reproject(currentMain);
  pr=ghApi(run,cwd,['repos/'+repository+'/pulls/'+persistence.prNumber]);
  if(pr.state!=='open'||pr.head?.sha!==persistence.headSha||pr.head?.ref!==persistence.branch||pr.base?.ref!=='main'||pr.base?.sha!==persistence.baseSha)return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_PR_DRIFT'};
  const result=ghApi(run,cwd,['-X','PUT','repos/'+repository+'/pulls/'+persistence.prNumber+'/merge','-f','merge_method=squash','-f','sha='+persistence.headSha]);
  if(result?.merged!==true||!result?.sha)return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_MERGE_FAILED'};
  return{state:createPendingParentMainCiState({state,sourceCommit,mergedMainSha:result.sha}),decision:'PENDING',reason:'PARENT_POST_MERGE_MAIN_CI_REQUIRED',mergedMainSha:result.sha};
}
