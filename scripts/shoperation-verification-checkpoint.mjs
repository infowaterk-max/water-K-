import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {atomicWriteJson,finalizeVerification,loadCheckpoint} from './lib/shoperation-verification-reuse.mjs';

const planPath=process.env.SHOPERATION_REPLAY_PLAN||'artifacts/shoperation-development-guard/resumable-verification-plan.json';
const checkpointPath=process.env.SHOPERATION_REPLAY_CHECKPOINT||'artifacts/shoperation-verification-cache/checkpoint.json';
const manifestPath='artifacts/shoperation-development-guard/final-evidence-manifest.json';
const summaryPath='artifacts/shoperation-development-guard/resumable-verification-summary.md';
const env=name=>String(process.env[name]??'').trim();

if(!existsSync(planPath))throw new Error('RESUMABLE_VERIFICATION_PLAN_MISSING:'+planPath);
const plan=JSON.parse(readFileSync(planPath,'utf8'));
let outcomes={};
try{outcomes=JSON.parse(env('SHOPERATION_VERIFICATION_OUTCOMES_JSON')||'{}');}
catch(error){outcomes={};console.error('VERIFICATION_OUTCOMES_JSON_INVALID:'+String(error));}

const loaded=loadCheckpoint(checkpointPath);
const priorCheckpoint=loaded.checkpoint;
const runId=[env('GITHUB_RUN_ID'),env('GITHUB_RUN_ATTEMPT')].filter(Boolean).join('-')||'local';
const stateVersion=env('SHOPERATION_TRUTH_STATE_VERSION')||'shoporation-ci.v1';
const final=finalizeVerification({plan,outcomes,priorCheckpoint,runId,stateVersion});

atomicWriteJson(manifestPath,final.manifest);
if(final.checkpoint.complete)atomicWriteJson(checkpointPath,final.checkpoint);

const lines=[
  '# Shoperation Resumable Verification',
  '',
  'Verification mode: **'+plan.verificationMode+'**',
  'Execution mode: **SHADOW**',
  'Replay tier: **'+plan.replayTier+' — '+plan.replayTierName+'**',
  'Current exact HEAD: '+plan.sourceRevision,
  'Resume checkpoint: '+(plan.checkpointSourceCommit||'none'),
  '',
  '## Evidence',
  '- Reused candidate: '+plan.evidence.reused,
  '- Rerun: '+plan.evidence.rerun,
  '- Invalidated: '+plan.evidence.invalidated,
  '- Unknown: '+plan.evidence.unknown,
  '- Cache hit rate: '+(plan.metrics.cacheHitRate*100).toFixed(1)+'%',
  '- Invalidation ratio: '+(plan.metrics.invalidationRatio*100).toFixed(1)+'%',
  '- Dependency resolution: '+String(plan.metrics.dependencyResolutionMs??plan.plannerDurationMs??0)+' ms',
  '',
  '## Replay reason',
  ...(plan.reasons.length?plan.reasons.map(reason=>'- '+reason):['- fingerprint/dependency reconciliation']),
  '',
  '## Explain',
  ...Object.values(plan.gates).map(gate=>'- '+gate.gateId+': '+gate.action+' — '+(gate.reasons.length?gate.reasons.join(', '):'semantic inputs equivalent')),
  '',
  '## Shadow comparison',
  '- Compared full gates: '+final.manifest.shadowComparison.compared,
  '- Discrepancies: '+final.manifest.shadowComparison.discrepancies.length,
  '- Decision: **'+final.manifest.shadowComparison.decision+'**',
  '- Final confidence: **'+final.manifest.finalConfidence+'**',
];
writeFileSync(summaryPath,lines.join('\n')+'\n');

console.log('Resumable Verification: '+final.decision+'; mode='+plan.verificationMode+'; tier='+plan.replayTier+'; reusedCandidate='+plan.evidence.reused+'; rerun='+plan.evidence.rerun+'; shadowDiscrepancies='+final.manifest.shadowComparison.discrepancies.length+'.');
for(const discrepancy of final.manifest.shadowComparison.discrepancies)console.error(JSON.stringify(discrepancy));
if(final.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
