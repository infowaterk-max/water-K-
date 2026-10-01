import {appendFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {getAllFailures,runVitest} from './lib/shoperation-development-runtime.mjs';
import {createReplayPlan,explainGate} from './lib/shoperation-verification-reuse.mjs';

const preflight=JSON.parse(readFileSync('artifacts/shoperation-quality/knowledge-preflight.json','utf8'));
const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const all=new Map(getAllFailures().map(failure=>[failure.id,failure]));
const active=(preflight.activeFailureIds??[]).map(id=>all.get(id)).filter(Boolean);
const tests=[...new Set(active.flatMap(failure=>failure.regressionTests??[]))].sort();
const checkpointPath=process.env.SHOPERATION_REPLAY_CHECKPOINT||'artifacts/shoperation-verification-cache/checkpoint.json';
const startedAt=new Date().toISOString();
const planner=createReplayPlan({registry,checkpointPath,activeFailureIds:active.map(failure=>failure.id)});

mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/resumable-verification-plan.json',JSON.stringify(planner.plan,null,2)+'\n');

const result=runVitest(tests);
const report={
  contract:'shoporation.incremental-known-failure-replay.v2',
  startedAt,
  activeFailureIds:active.map(failure=>failure.id),
  regressionTests:tests,
  testCount:tests.length,
  exitCode:result.status,
  verification:{
    mode:planner.plan.verificationMode,
    executionMode:planner.plan.executionMode,
    replayTier:planner.plan.replayTier,
    replayTierName:planner.plan.replayTierName,
    checkpointSourceCommit:planner.plan.checkpointSourceCommit,
    reusableEvidenceSet:planner.plan.reusableEvidenceSet,
    invalidatedEvidenceSet:planner.plan.invalidatedEvidenceSet,
    uncertainEvidenceSet:planner.plan.uncertainEvidenceSet,
    rerunSet:planner.plan.rerunSet,
    reasons:planner.plan.reasons,
    changeImpactSet:planner.plan.changeImpactSet,
    metrics:planner.plan.metrics,
  },
  decision:result.status===0?'PASS':'BLOCK',
};
writeFileSync('artifacts/shoperation-development-guard/incremental-replay.json',JSON.stringify(report,null,2)+'\n');

const explainArg=process.argv.find(arg=>arg.startsWith('--explain='));
if(explainArg){
  const gateId=explainArg.slice('--explain='.length);
  const explanation=explainGate(planner.plan,gateId);
  console.log(explanation?JSON.stringify(explanation,null,2):'Unknown gate: '+gateId);
}
if(process.env.GITHUB_OUTPUT){
  appendFileSync(process.env.GITHUB_OUTPUT,'verification_mode='+planner.plan.verificationMode+'\n');
  appendFileSync(process.env.GITHUB_OUTPUT,'replay_tier='+planner.plan.replayTier+'\n');
  appendFileSync(process.env.GITHUB_OUTPUT,'reused='+planner.plan.evidence.reused+'\n');
  appendFileSync(process.env.GITHUB_OUTPUT,'rerun='+planner.plan.evidence.rerun+'\n');
  appendFileSync(process.env.GITHUB_OUTPUT,'invalidated='+planner.plan.evidence.invalidated+'\n');
  appendFileSync(process.env.GITHUB_OUTPUT,'unknown='+planner.plan.evidence.unknown+'\n');
  appendFileSync(process.env.GITHUB_OUTPUT,'execution_mode='+planner.plan.executionMode+'\n');
  for(const [gateId,gate] of Object.entries(planner.plan.gates??{})){
    const key=gateId.toLowerCase().replace(/^guard-/,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    appendFileSync(process.env.GITHUB_OUTPUT,'reuse_'+key+'='+(gate.action==='REUSE'?'true':'false')+'\n');
  }
}
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
console.log('Incremental Known Failure Replay: '+report.decision+'; failures='+active.length+'; regressionFiles='+tests.length+'; verification='+planner.plan.verificationMode+'; execution='+planner.plan.executionMode+'; tier='+planner.plan.replayTier+'; reuse='+planner.plan.evidence.reused+'; rerun='+planner.plan.evidence.rerun+'.');
if(result.status!==0&&process.argv.includes('--check'))process.exit(result.status||1);
