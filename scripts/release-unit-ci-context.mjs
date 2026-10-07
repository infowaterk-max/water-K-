import {execFileSync} from 'node:child_process';
import {appendFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {decodeReleaseUnitContextEnvelope,RELEASE_UNIT_CI_CONTEXT_CONTRACT,validateReleaseUnitCiContext} from './lib/shoperation-release-unit-runtime.mjs';
export {decodeReleaseUnitContextEnvelope,encodeReleaseUnitContextEnvelope,RELEASE_UNIT_CI_CONTEXT_CONTRACT,validateReleaseUnitCiContext} from './lib/shoperation-release-unit-runtime.mjs';

const text=value=>String(value??'').trim();

const truthy=value=>String(value??'').toLowerCase()==='true';

export function resolveReleaseUnitCiPullRequest({event,repository,fetchPullRequest}={}){
  if(event?.pull_request)return{mode:'pull_request',pullRequest:event.pull_request};
  const inputs=event?.inputs??{};
  if(!truthy(inputs.release_unit_proof))return null;
  const repo=text(repository);
  if(!repo)throw new Error('RELEASE_UNIT_DISPATCH_REPOSITORY_REQUIRED');
  const prNumber=Number(inputs.release_unit_pr_number);
  if(!Number.isInteger(prNumber)||prNumber<1)throw new Error('RELEASE_UNIT_DISPATCH_PR_NUMBER_REQUIRED');
  if(typeof fetchPullRequest!=='function')throw new Error('RELEASE_UNIT_DISPATCH_PR_FETCH_REQUIRED');
  const pr=fetchPullRequest(prNumber);
  if(!pr||pr.state!=='open')throw new Error('RELEASE_UNIT_DISPATCH_PR_STATE_INVALID');
  if(text(pr.head?.repo?.full_name)!==repo)throw new Error('RELEASE_UNIT_DISPATCH_PR_REPOSITORY_MISMATCH');
  if(text(pr.head?.sha)!==text(inputs.release_unit_head_sha))throw new Error('RELEASE_UNIT_DISPATCH_PR_HEAD_MISMATCH');
  if(text(pr.base?.sha)!==text(inputs.release_unit_base_sha))throw new Error('RELEASE_UNIT_DISPATCH_PR_BASE_MISMATCH');
  if(text(pr.head?.ref)!==text(inputs.release_unit_head_ref))throw new Error('RELEASE_UNIT_DISPATCH_PR_REF_MISMATCH');
  return{mode:'workflow_dispatch',pullRequest:pr};
}
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
  const repository=text(process.env.GITHUB_REPOSITORY);
  const resolved=resolveReleaseUnitCiPullRequest({
    event,
    repository,
    fetchPullRequest:prNumber=>{
      const token=text(process.env.GH_TOKEN||process.env.GITHUB_TOKEN);
      const env=token?{...process.env,GH_TOKEN:token}:{...process.env};
      return JSON.parse(execFileSync('gh',['api','repos/'+repository+'/pulls/'+String(prNumber)],{encoding:'utf8',env}));
    },
  });
  if(!resolved){
    console.log('Release Unit CI Context: ROOT; no release-unit proof context.');
    process.exit(0);
  }
  const pr=resolved.pullRequest;
  const envelope=decodeReleaseUnitContextEnvelope(pr?.body??'');
  if(!envelope){
    console.log('Release Unit CI Context: ROOT; no release-unit marker.');
    process.exit(0);
  }
  const head=text(pr?.head?.sha??process.env.GITHUB_SHA);
  const base=text(pr?.base?.sha);
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
    mode:resolved.mode,
    prNumber:Number(pr.number),
    headRef:text(pr.head?.ref),
    headSha:head,
    baseSha:base,
  },null,2)+'\n');
  appendEnv('SHOPERATION_ACTIVE_PLAN',planPath);
  appendEnv('SHOPERATION_RELEASE_UNIT_CHILD','1');
  appendEnv('SHOPERATION_RELEASE_UNIT_ID',envelope.releaseUnitId);
  appendEnv('SHOPERATION_RELEASE_UNIT_MANIFEST_DIGEST',envelope.manifestDigest);
  appendEnv('SHOPERATION_RELEASE_UNIT_BINDING_DIGEST',envelope.bindingDigest);
  console.log('Release Unit CI Context: CHILD; mode='+resolved.mode+'; pr='+String(pr.number)+'; unit='+envelope.releaseUnitId+'; task='+result.plan.taskId+'.');
}
