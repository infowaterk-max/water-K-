import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {evaluateClosedDevelopmentPlan,evaluateCompletionTruth,validateCommittedParentClosureMetadata,validateOperationalIntelligence} from './lib/shoperation-operational-intelligence.mjs';
import {RELEASE_PARENT_MAIN_ADVANCE_PROOF_CONTRACT,releaseParentClosureProofArtifactPath,releaseParentProtectedFiles,releaseParentUnitCloseReceiptDigests,validateReleaseParentMainAdvanceProof} from './lib/shoperation-release-unit-runtime.mjs';
import {atomicWriteJson,sealCheckpointTruth} from './lib/shoperation-verification-reuse.mjs';
import {activeDevelopmentPlanPath} from './lib/shoperation-development-runtime.mjs';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const plan=readJson(activeDevelopmentPlanPath());
const policy=readJson('quality/knowledge/development-guard-policy.v1.json');
const registry=readJson('quality/knowledge/guard-registry.v1.json');
const env=value=>String(process.env[value]??'').trim();
const git=args=>{try{return execFileSync('git',args,{encoding:'utf8'}).trim();}catch{return'';}};
const currentExactState={
  head:env('SHOPERATION_TRUTH_HEAD')||env('GITHUB_SHA')||git(['rev-parse','HEAD']),
  branch:env('SHOPERATION_TRUTH_BRANCH')||env('GITHUB_HEAD_REF')||env('GITHUB_REF_NAME')||git(['rev-parse','--abbrev-ref','HEAD']),
  stateVersion:env('SHOPERATION_TRUTH_STATE_VERSION')||'shoporation-ci.v1',
};
let evidence=[];
try{evidence=JSON.parse(env('SHOPERATION_TRUTH_EVIDENCE_JSON')||'[]');}catch(error){
  evidence=[{id:'TRUTH_INPUT',status:'failure',sourceCommit:currentExactState.head,branch:currentExactState.branch,stateVersion:currentExactState.stateVersion,runId:env('GITHUB_RUN_ID')||'local',reason:String(error)}];
}
if(!Array.isArray(evidence))evidence=[];
const manifestPath=env('SHOPERATION_TRUTH_EVIDENCE_MANIFEST');
if(manifestPath&&existsSync(manifestPath)){
  try{
    const manifest=readJson(manifestPath);
    const exactMatch=manifest?.sourceCommit===currentExactState.head&&manifest?.branch===currentExactState.branch&&manifest?.stateVersion===currentExactState.stateVersion;
    if(manifest?.decision!=='PASS'||!exactMatch||!Array.isArray(manifest?.truthEvidence)){
      evidence=[{id:'TRUTH_MANIFEST',status:'failure',sourceCommit:currentExactState.head,branch:currentExactState.branch,stateVersion:currentExactState.stateVersion,runId:env('GITHUB_RUN_ID')||'local',reason:'resumable-verification-manifest-invalid-or-stale'}];
    }else evidence=manifest.truthEvidence;
  }catch(error){
    evidence=[{id:'TRUTH_MANIFEST',status:'failure',sourceCommit:currentExactState.head,branch:currentExactState.branch,stateVersion:currentExactState.stateVersion,runId:env('GITHUB_RUN_ID')||'local',reason:String(error)}];
  }
}
const guardIds=(registry.guards??[]).map(item=>item.id);
const validation=validateOperationalIntelligence({plan,policy,guardIds});
const isAncestor=(ancestor,descendant)=>{if(!ancestor||!descendant)return false;try{execFileSync('git',['merge-base','--is-ancestor',ancestor,descendant],{stdio:'ignore'});return true;}catch{return false;}};
let report;
let parentClosureProofEvidence=null;
if(plan.status==='closed'){
  const verifiedHead=String(plan.lifecycle?.verifiedImplementationHead??'').trim();
  let changedSinceVerified=[];
  if(verifiedHead){
    try{
      const output=execFileSync('git',['diff','--name-only','--diff-filter=ACMRD',verifiedHead,currentExactState.head,'--'],{encoding:'utf8'}).trim();
      changedSinceVerified=output?output.split(/\r?\n/).filter(Boolean):[];
    }catch{changedSinceVerified=['__UNRESOLVED_CLOSURE_DIFF__'];}
  }else changedSinceVerified=['__MISSING_VERIFIED_HEAD__'];
  let verifiedParentClosureProofPath=null;
  const closedPlanIssues=[...validation.issues];
  if(plan.parentClosureContext){
    try{
      const context=plan.parentClosureContext,parentId=String(plan.taskId??''),sourceCommit=String(context.sourceCommit??'');
      if(!/^[A-Za-z0-9._-]+$/.test(parentId)||!/^[0-9a-f]{40}$/i.test(sourceCommit)||!/^[0-9a-f]{40}$/i.test(verifiedHead)||!/^[0-9a-f]{40}$/i.test(currentExactState.head))throw new Error('PARENT_CLOSURE_TRUTH_IDENTITY_INVALID');
      const stateRef='refs/heads/control-plane/release-state/'+parentId.toLowerCase().replace(/[^a-z0-9._/-]+/g,'-');
      const stateCommit=String(execFileSync('git',['ls-remote','origin',stateRef],{encoding:'utf8'})).trim().split(/\s+/)[0];
      if(stateCommit)execFileSync('git',['fetch','--quiet','origin',stateRef],{encoding:'utf8'});
      const parent=stateCommit?JSON.parse(execFileSync('git',['show','FETCH_HEAD:state.json'],{encoding:'utf8'})):null;
      if(!parent||!stateCommit)throw new Error('PARENT_CLOSURE_TRUTH_CANONICAL_STATE_MISSING');
      const sourcePlan=JSON.parse(execFileSync('git',['show',sourceCommit+':quality/development/active-plan.json'],{encoding:'utf8'}));
      const ordered=[...(parent.units??[])].sort((a,b)=>Number(a.order)-Number(b.order));
      const lastChildMain=String(ordered.at(-1)?.merge?.mergedMainSha??'');
      if(!lastChildMain)throw new Error('PARENT_CLOSURE_TRUTH_LAST_CHILD_MAIN_MISSING');
      let trustedMainAdvance=null;
      if(lastChildMain!==verifiedHead){
        execFileSync('git',['merge-base','--is-ancestor',lastChildMain,verifiedHead],{stdio:'ignore'});
        const changed=String(execFileSync('git',['diff','--name-only','--no-renames','--diff-filter=ACMRD',lastChildMain,verifiedHead,'--'],{encoding:'utf8'})).trim();
        const changedFiles=[...new Set(changed?changed.split(/\r?\n/).filter(Boolean):[])].sort();
        const protectedFiles=releaseParentProtectedFiles(parent);
        const overlapFiles=changedFiles.filter(file=>protectedFiles.includes(file));
        const proof={contract:RELEASE_PARENT_MAIN_ADVANCE_PROOF_CONTRACT,issuer:'release-unit-parent-close',decision:'PASS',relationship:'FAST_FORWARD',fromSha:lastChildMain,toSha:verifiedHead,changedFiles,protectedFiles,overlapFiles,unitCloseReceiptDigests:releaseParentUnitCloseReceiptDigests(parent)};
        if(overlapFiles.length||!validateReleaseParentMainAdvanceProof(proof,{parent,fromSha:lastChildMain,toSha:verifiedHead}))throw new Error('PARENT_CLOSURE_TRUTH_MAIN_ADVANCE_INVALID');
        trustedMainAdvance=proof;
      }
      const proofPath=releaseParentClosureProofArtifactPath(parentId);
      const artifactContent=execFileSync('git',['show',currentExactState.head+':'+proofPath],{encoding:'utf8'});
      const metadataParents=git(['rev-list','--parents','-n','1',currentExactState.head]).split(/\s+/).filter(Boolean);
      const rawStatus=execFileSync('git',['diff','--name-status','--no-renames',verifiedHead,currentExactState.head,'--'],{encoding:'utf8'}).trim();
      const metadataChanges=rawStatus?rawStatus.split(/\r?\n/).filter(Boolean):[];
      parentClosureProofEvidence=validateCommittedParentClosureMetadata({
        plan,parent,sourcePlan,currentExactState,artifactContent,metadataParents,metadataChanges,trustedMainAdvance,
      });
      parentClosureProofEvidence.stateCommit=stateCommit;
      if(parentClosureProofEvidence.decision==='PASS')verifiedParentClosureProofPath=parentClosureProofEvidence.path;
      else closedPlanIssues.push(...parentClosureProofEvidence.issues);
    }catch(error){
      const failed={code:'DEV_LIFECYCLE_PARENT_PROOF_AUTHORITY_UNRESOLVED',error:String(error?.message??error)};
      closedPlanIssues.push(failed);
      parentClosureProofEvidence={decision:'BLOCK',path:null,issues:[failed]};
    }
  }
  report=evaluateClosedDevelopmentPlan({
    plan,
    currentExactState,
    changedSinceVerified,
    verifiedHeadIsAncestor:isAncestor(verifiedHead,currentExactState.head),
    planIssues:closedPlanIssues,
    verifiedParentClosureProofPath,
  });
  report.parentClosureProof=parentClosureProofEvidence;
}else{
  report=evaluateCompletionTruth({plan,evidence,currentExactState,planIssues:validation.issues});
}
report.releaseUnitContext=plan.releaseUnitContext??null;
report.generatedAt=new Date().toISOString();
report.runId=env('GITHUB_RUN_ID')||null;
report.runAttempt=env('GITHUB_RUN_ATTEMPT')||null;
report.readOnly=true;
report.authority='quality-knowledge-system';
report.releaseAuthority='release-infrastructure';
const checkpointPath=env('SHOPERATION_TRUTH_CHECKPOINT');
report.checkpointTruthSeal={status:'NOT_REQUESTED',path:checkpointPath||null};
if(checkpointPath){
  if(report.decision==='PASS'&&report.internalState==='VERIFIED_DONE'){
    try{
      const checkpoint=readJson(checkpointPath);
      const sealed=sealCheckpointTruth(checkpoint,{currentExactState,truthReport:report});
      atomicWriteJson(checkpointPath,sealed);
      report.checkpointTruthSeal={status:'PASS',path:checkpointPath,sourceCommit:sealed.sourceCommit,checksum:sealed.checksum};
    }catch(error){
      report.checkpointTruthSeal={status:'BLOCK',path:checkpointPath,error:String(error)};
      report.decision='BLOCK';
      report.internalState='BLOCKED';
      report.poStatus='NOT_DONE';
      report.next='Repair checkpoint truth seal and rerun exact-head verification.';
    }
  }else report.checkpointTruthSeal={status:'BLOCK',path:checkpointPath,error:'truth-gate-not-verified'};
}
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/truth-gate.json',JSON.stringify(report,null,2)+'\n');
const lines=[
  '# Shoperation Completion Truth Gate','',
  `Decision: **${report.decision}**`,
  `Truth status: **${report.truthStatus??'UNKNOWN'}**`,
  `Internal state: **${report.internalState}**`,
  `Product Owner status: **${report.poStatus}**`,
  `Exact head: \`${report.currentExactState.head||'unknown'}\``,
  `Branch: \`${report.currentExactState.branch||'unknown'}\``,
  `State version: \`${report.currentExactState.stateVersion||'unknown'}\``,
  '',
  '## Completion integrity',
  `- Requirement completeness: ${report.requirementCompleteness?'PASS':'NOT VERIFIED'}`,
  `- Implementation completeness: ${report.implementationCompleteness?'PASS':'NOT VERIFIED'}`,
  `- Outcome verification: ${report.outcomeVerification?'PASS':'NOT VERIFIED'}`,
  `- Negative verification: ${report.negativeVerification?'PASS':'NOT VERIFIED'}`,
  '',
  '## Evidence',
  `- PASS: ${report.evidenceSummary.pass}`,
  `- FAIL: ${report.evidenceSummary.fail}`,
  `- BLOCKED: ${report.evidenceSummary.blocked}`,
  `- STALE: ${report.evidenceSummary.stale}`,
  `- MISSING: ${report.evidenceSummary.missing}`,
  `- OVERCLAIM: ${report.evidenceSummary.overclaim??0}`,
  `- UNKNOWN: ${report.evidenceSummary.unknown??0}`,
  '',
  `NEXT: ${report.next??'none'}`,
];
writeFileSync('artifacts/shoperation-development-guard/truth-gate.md',lines.join('\n')+'\n');
console.log(`Completion Truth Gate: ${report.internalState}; PO=${report.poStatus}; pass=${report.evidenceSummary.pass}; stale=${report.evidenceSummary.stale}; missing=${report.evidenceSummary.missing}.`);
if(report.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
