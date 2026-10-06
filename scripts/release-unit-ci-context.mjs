import {execFileSync} from 'node:child_process';
import {appendFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {RELEASE_UNIT_CHILD_TRANSACTION_CONTRACT,releaseUnitChildPlanDigest,releaseUnitContextBindingDigest} from './lib/shoperation-release-unit-runtime.mjs';

export const RELEASE_UNIT_CI_CONTEXT_CONTRACT='shoporation.release-unit-ci-context.v1';
const PREFIX='<!-- shoperation-release-unit-context:v1:';
const SUFFIX=' -->';
const text=value=>String(value??'').trim();

export function encodeReleaseUnitContextEnvelope(envelope){
  return PREFIX+Buffer.from(JSON.stringify(envelope)).toString('base64url')+SUFFIX;
}
export function decodeReleaseUnitContextEnvelope(body){
  const source=String(body??''),start=source.indexOf(PREFIX);
  if(start<0)return null;
  const end=source.indexOf(SUFFIX,start+PREFIX.length);
  if(end<0)throw new Error('RELEASE_UNIT_CI_CONTEXT_MARKER_MALFORMED');
  return JSON.parse(Buffer.from(source.slice(start+PREFIX.length,end).trim(),'base64url').toString('utf8'));
}
export function validateReleaseUnitCiContext({envelope,headSha,baseSha,commitMessage}={}){
  if(!envelope)return{decision:'ROOT',plan:null,envelope:null};
  if(envelope.contract!==RELEASE_UNIT_CI_CONTEXT_CONTRACT)throw new Error('RELEASE_UNIT_CI_CONTEXT_CONTRACT_INVALID');
  const plan=envelope.childPlan;
  if(plan?.releaseUnitContext?.contract!==RELEASE_UNIT_CHILD_TRANSACTION_CONTRACT)throw new Error('RELEASE_UNIT_CI_CHILD_PLAN_REQUIRED');
  const childPlanDigest=releaseUnitChildPlanDigest(plan);
  if(childPlanDigest!==envelope.childPlanDigest)throw new Error('RELEASE_UNIT_CI_CHILD_PLAN_DIGEST_MISMATCH');
  const bindingDigest=releaseUnitContextBindingDigest({
    manifestDigest:envelope.manifestDigest,
    childPlanDigest:envelope.childPlanDigest,
    operationDigest:envelope.operationDigest,
    releaseUnitId:envelope.releaseUnitId,
    parentTransactionId:envelope.parentTransactionId,
    targetBaseSha:envelope.targetBaseSha,
  });
  if(bindingDigest!==envelope.bindingDigest)throw new Error('RELEASE_UNIT_CI_BINDING_DIGEST_MISMATCH');
  if(text(baseSha)!==text(envelope.targetBaseSha))throw new Error('RELEASE_UNIT_CI_BASE_MISMATCH');
  const trailers=[
    'Shoperation-Release-Unit-Manifest: '+envelope.manifestDigest,
    'Shoperation-Release-Unit-Child-Plan: '+envelope.childPlanDigest,
    'Shoperation-Release-Unit-Binding: '+envelope.bindingDigest,
  ];
  for(const trailer of trailers)if(!String(commitMessage??'').includes(trailer))throw new Error('RELEASE_UNIT_CI_COMMIT_TRAILER_MISMATCH:'+trailer.split(':')[0]);
  const runtimePlan=structuredClone(plan);
  runtimePlan.releaseUnitContext={
    ...(runtimePlan.releaseUnitContext??{}),
    manifestDigest:envelope.manifestDigest,
    childPlanDigest:envelope.childPlanDigest,
    bindingDigest:envelope.bindingDigest,
    materializedHeadSha:text(headSha),
    targetBaseSha:envelope.targetBaseSha,
  };
  if(runtimePlan.taskId!==envelope.childTaskId)throw new Error('RELEASE_UNIT_CI_CHILD_TASK_MISMATCH');
  if(runtimePlan.releaseUnitContext.releaseUnitId!==envelope.releaseUnitId||runtimePlan.releaseUnitContext.parentTransactionId!==envelope.parentTransactionId)throw new Error('RELEASE_UNIT_CI_TRANSACTION_IDENTITY_MISMATCH');
  return{decision:'CHILD',plan:runtimePlan,envelope};
}
function appendEnv(name,value){
  const output=text(process.env.GITHUB_ENV);
  if(output)appendFileSync(output,name+'='+String(value)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const eventPath=text(process.env.GITHUB_EVENT_PATH);
  if(!eventPath){console.log('Release Unit CI Context: ROOT; no GitHub event.');process.exit(0);}
  const event=JSON.parse(readFileSync(eventPath,'utf8'));
  const envelope=decodeReleaseUnitContextEnvelope(event?.pull_request?.body??'');
  if(!envelope){console.log('Release Unit CI Context: ROOT; no release-unit marker.');process.exit(0);}
  const head=text(event?.pull_request?.head?.sha??process.env.GITHUB_SHA);
  const base=text(event?.pull_request?.base?.sha);
  const commitMessage=execFileSync('git',['show','-s','--format=%B',head],{encoding:'utf8'}).trim();
  const result=validateReleaseUnitCiContext({envelope,headSha:head,baseSha:base,commitMessage});
  mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
  const planPath='artifacts/shoperation-development-guard/release-unit-active-plan.json';
  writeFileSync(planPath,JSON.stringify(result.plan,null,2)+'\n');
  writeFileSync('artifacts/shoperation-development-guard/release-unit-ci-context.json',JSON.stringify({
    contract:RELEASE_UNIT_CI_CONTEXT_CONTRACT,
    decision:'PASS',
    releaseUnitId:envelope.releaseUnitId,
    parentTransactionId:envelope.parentTransactionId,
    manifestDigest:envelope.manifestDigest,
    childPlanDigest:envelope.childPlanDigest,
    bindingDigest:envelope.bindingDigest,
    headSha:head,
    baseSha:base,
  },null,2)+'\n');
  appendEnv('SHOPERATION_ACTIVE_PLAN',planPath);
  appendEnv('SHOPERATION_RELEASE_UNIT_CHILD','1');
  appendEnv('SHOPERATION_RELEASE_UNIT_ID',envelope.releaseUnitId);
  appendEnv('SHOPERATION_RELEASE_UNIT_MANIFEST_DIGEST',envelope.manifestDigest);
  appendEnv('SHOPERATION_RELEASE_UNIT_BINDING_DIGEST',envelope.bindingDigest);
  console.log('Release Unit CI Context: CHILD; unit='+envelope.releaseUnitId+'; task='+result.plan.taskId+'.');
}
