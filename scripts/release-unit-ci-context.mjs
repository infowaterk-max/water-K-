import {execFileSync} from 'node:child_process';
import {appendFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {decodeReleaseUnitContextEnvelope,RELEASE_UNIT_CI_CONTEXT_CONTRACT,validateReleaseUnitCiContext} from './lib/shoperation-release-unit-runtime.mjs';
export {decodeReleaseUnitContextEnvelope,encodeReleaseUnitContextEnvelope,RELEASE_UNIT_CI_CONTEXT_CONTRACT,validateReleaseUnitCiContext} from './lib/shoperation-release-unit-runtime.mjs';

const text=value=>String(value??'').trim();
function appendEnv(name,value){
  const output=text(process.env.GITHUB_ENV);
  if(output)appendFileSync(output,name+'='+String(value)+'\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const eventPath=text(process.env.GITHUB_EVENT_PATH);
  if(!eventPath){
    console.log('Release Unit CI Context: ROOT; no GitHub event.');
    process.exit(0);
  }
  const event=JSON.parse(readFileSync(eventPath,'utf8'));
  const envelope=decodeReleaseUnitContextEnvelope(event?.pull_request?.body??'');
  if(!envelope){
    console.log('Release Unit CI Context: ROOT; no release-unit marker.');
    process.exit(0);
  }
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
