import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {RELEASE_PARENT_MAIN_ADVANCE_PROOF_CONTRACT,recordReleaseParentClosure,releaseParentProtectedFiles,releaseParentUnitCloseReceiptDigests} from './lib/shoperation-release-unit-runtime.mjs';

const text=value=>String(value??'').trim();
const parse=value=>JSON.parse(String(value??'null'));
const slug=value=>text(value).toLowerCase().replace(/[^a-z0-9._/-]+/g,'-');
const defaultRun=(command,args,{cwd=process.cwd(),input=null,env={}}={})=>execFileSync(command,args,{cwd,encoding:'utf8',input:input??undefined,stdio:['pipe','pipe','pipe'],env:{...process.env,...env}}).trim();
const repoName=(run,cwd)=>text(run('gh',['repo','view','--json','nameWithOwner','-q','.nameWithOwner'],{cwd}));
const ownerOf=repo=>repo.split('/')[0];
const ghApi=(run,cwd,args)=>parse(run('gh',['api',...args],{cwd}));
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

function runParentProof({state,sourceCommit,finalMain,run=defaultRun,cwd=process.cwd()}={}){
  const temp=mkdtempSync(path.join(os.tmpdir(),'shoperation-release-parent-close-'));
  const branch='release-execution/closure/'+slug(state.parentTransactionId);
  try{
    run('git',['worktree','add','--detach',temp,finalMain],{cwd});
    const plan=parse(run('git',['show',sourceCommit+':quality/development/active-plan.json'],{cwd}));
    if(plan.taskId!==state.parentTransactionId)throw new Error('RELEASE_PARENT_SOURCE_PLAN_TASK_MISMATCH');
    const external=plan.completionContract?.systemObligations?.externalGuards??[];
    if(external.length)throw new Error('RELEASE_PARENT_EXTERNAL_PROOF_REQUIRED:'+external.join(','));
    const artifactDir=path.join(temp,'artifacts','shoperation-development-guard');
    mkdirSync(artifactDir,{recursive:true});
    const planPath=path.join(artifactDir,'release-parent-active-plan.json');
    writeFileSync(planPath,JSON.stringify(plan,null,2)+'\n');
    const safeEnv={
      GH_TOKEN:'',GITHUB_TOKEN:'',
      SHOPERATION_ACTIVE_PLAN:planPath,
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
    return{temp,branch,truth,lifecyclePlan};
  }catch(error){
    try{run('git',['worktree','remove','--force',temp],{cwd});}catch{}
    try{rmSync(temp,{recursive:true,force:true});}catch{}
    throw error;
  }
}

function createClosurePullRequest({proof,state,finalMain,run=defaultRun,cwd=process.cwd()}={}){
  const {temp,branch,lifecyclePlan}=proof;
  try{
    writeFileSync(path.join(temp,'quality','development','active-plan.json'),JSON.stringify(lifecyclePlan,null,2)+'\n');
    run('git',['add','quality/development/active-plan.json'],{cwd:temp});
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
    if(pr&&pr.head?.sha!==headSha)pr=ghApi(run,cwd,['repos/'+repository+'/pulls/'+pr.number]);
    if(!pr){
      const closed=(list??[]).find(item=>item.state==='closed');
      if(closed)throw new Error('RELEASE_PARENT_CLOSURE_PR_CLOSED:'+closed.number);
      pr=ghApi(run,cwd,['-X','POST','repos/'+repository+'/pulls','-f','title=Close Development Transaction '+state.parentTransactionId,'-f','head='+branch,'-f','base=main','-f','body=Canonical parent Completion Truth/Lifecycle closure. Verified implementation main: '+finalMain]);
    }
    if(pr.state!=='open'||pr.head?.sha!==headSha||pr.head?.ref!==branch||pr.base?.ref!=='main'||pr.base?.sha!==finalMain)throw new Error('RELEASE_PARENT_CLOSURE_PR_IDENTITY_MISMATCH');
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
    const proof=runParentProof({state,sourceCommit,finalMain,run,cwd});
    let next=recordReleaseParentClosure(state,{truth:proof.truth,lifecyclePlan:proof.lifecyclePlan,currentMainSha:finalMain,trustedMainAdvance});
    next={...next,closurePersistence:createClosurePullRequest({proof,state:next,finalMain,run,cwd})};
    return{state:next,decision:'PENDING',reason:'PARENT_CLOSURE_PR_OPEN'};
  }catch(error){
    return{state,decision:'BLOCK',reason:'RELEASE_PARENT_PROOF_OR_PERSISTENCE_FAILED',error:String(error?.stderr??error?.message??error)};
  }
}

export function finishParentClosurePersistence({state,sourceCommit,run=defaultRun,cwd=process.cwd()}={}){
  const persistence=state?.closurePersistence;
  if(!state?.closureComplete||persistence?.state!=='PR_OPEN')return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_PERSISTENCE_NOT_OPEN'};
  const repository=repoName(run,cwd);
  let pr=ghApi(run,cwd,['repos/'+repository+'/pulls/'+persistence.prNumber]);
  if(pr.state!=='open'||pr.head?.sha!==persistence.headSha||pr.head?.ref!==persistence.branch||pr.base?.ref!=='main')return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_PR_DRIFT'};
  const reproject=currentMain=>{
    const incremental=proveParentMainAdvance({state,fromSha:persistence.baseSha,toSha:currentMain,run,cwd});
    if(incremental.decision!=='PASS')return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_MAIN_DRIFT',error:incremental.error??null,details:incremental.details??null};
    const lastChildMain=finalImplementationMain(state);
    const canonical=proveParentMainAdvance({state,fromSha:lastChildMain,toSha:currentMain,run,cwd});
    if(canonical.decision!=='PASS')return{state,decision:'BLOCK',reason:'RELEASE_PARENT_CLOSURE_MAIN_DRIFT',error:canonical.error??null,details:canonical.details??null};
    try{
      const proof=runParentProof({state,sourceCommit,finalMain:currentMain,run,cwd});
      let next=recordReleaseParentClosure(state,{truth:proof.truth,lifecyclePlan:proof.lifecyclePlan,currentMainSha:currentMain,trustedMainAdvance:canonical.proof});
      next={...next,closurePersistence:createClosurePullRequest({proof,state:next,finalMain:currentMain,run,cwd})};
      return{state:next,decision:'PENDING',reason:'PARENT_CLOSURE_REPROJECTED'};
    }catch(error){
      return{state,decision:'BLOCK',reason:'RELEASE_PARENT_PROOF_OR_PERSISTENCE_FAILED',error:String(error?.stderr??error?.message??error)};
    }
  };
  run('git',['fetch','--quiet','origin','main'],{cwd});
  let currentMain=run('git',['rev-parse','origin/main'],{cwd});
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
  return{state:{...structuredClone(state),closurePersistence:{...persistence,state:'MERGED',mergedMainSha:result.sha}},decision:'PARENT_CLOSED',mergedMainSha:result.sha};
}
