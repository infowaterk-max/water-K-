import {execFileSync} from 'node:child_process';
import {appendFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {buildClosedDevelopmentPlan} from './lib/shoperation-operational-intelligence.mjs';

const PLAN_PATH='quality/development/active-plan.json';
const DEFAULT_TRUTH_PATH='artifacts/shoperation-development-guard/truth-gate.json';
const DEFAULT_CANDIDATE_PATH='artifacts/shoperation-development-guard/active-plan.closed.json';
const DEFAULT_REPORT_PATH='artifacts/shoperation-development-guard/lifecycle-transition.json';

const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const arg=name=>process.argv.includes(name);
const env=name=>String(process.env[name]??'').trim();

function writeOutput(name,value){
  const output=env('GITHUB_OUTPUT');
  if(output)appendFileSync(output,`${name}=${String(value)}\n`);
}

const plan=readJson(PLAN_PATH);
const currentHead=env('SHOPERATION_CLOSURE_HEAD')||env('GITHUB_SHA')||git(['rev-parse','HEAD']);
const truthPath=env('SHOPERATION_CLOSURE_TRUTH_REPORT')||DEFAULT_TRUTH_PATH;
const candidatePath=env('SHOPERATION_CLOSURE_CANDIDATE')||DEFAULT_CANDIDATE_PATH;
const reportPath=env('SHOPERATION_CLOSURE_REPORT')||DEFAULT_REPORT_PATH;
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});

let report;
if(plan.status==='closed'){
  report={
    contract:'shoporation.development-lifecycle-transition.v1',
    decision:'PASS',
    action:'already-closed',
    closureRequired:false,
    taskId:plan.taskId,
    currentHead,
    verifiedImplementationHead:plan.lifecycle?.verifiedImplementationHead??null,
    lifecycleState:plan.lifecycle?.state??null,
    candidatePath:null,
  };
}else{
  if(!existsSync(truthPath))throw new Error('DEV_LIFECYCLE_TRUTH_REPORT_REQUIRED');
  const truth=readJson(truthPath);
  if(truth.decision!=='PASS'||truth.truthStatus!=='VERIFIED'||truth.internalState!=='VERIFIED_DONE'){
    throw new Error(`DEV_LIFECYCLE_TRUTH_NOT_VERIFIED:${truth.truthStatus??'UNKNOWN'}:${truth.internalState??'UNKNOWN'}`);
  }
  if(truth.currentExactState?.head!==currentHead)throw new Error('DEV_LIFECYCLE_CLOSE_HEAD_MISMATCH');
  if(!truth.generatedAt)throw new Error('DEV_LIFECYCLE_CLOSE_TIMESTAMP_REQUIRED');
  const closedPlan=buildClosedDevelopmentPlan({
    plan,
    truthReport:truth,
    currentHead,
    closedAt:truth.generatedAt,
  });
  writeFileSync(candidatePath,JSON.stringify(closedPlan,null,2)+'\n');
  if(arg('--apply'))writeFileSync(PLAN_PATH,JSON.stringify(closedPlan,null,2)+'\n');
  report={
    contract:'shoporation.development-lifecycle-transition.v1',
    decision:'BLOCK_UNTIL_COMMITTED',
    action:arg('--apply')?'applied':'candidate-emitted',
    closureRequired:!arg('--apply'),
    taskId:plan.taskId,
    currentHead,
    verifiedImplementationHead:currentHead,
    lifecycleState:'LEARN',
    candidatePath,
    truthContract:truth.contract,
    truthRunId:truth.runId??null,
  };
}
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
writeOutput('closure_required',report.closureRequired?'true':'false');
writeOutput('candidate_path',report.candidatePath??'');
writeOutput('verified_head',report.verifiedImplementationHead??'');
console.log(`Development Lifecycle: ${report.action}; closureRequired=${report.closureRequired}; verifiedHead=${report.verifiedImplementationHead??'none'}.`);
