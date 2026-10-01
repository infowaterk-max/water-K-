import {appendFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
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
  'Execution mode: **'+plan.executionMode+'**',
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
  '- Verification wall time (shadow control): '+String(final.manifest.metrics.verificationRuntimeMs??'n/a')+' ms',
  '- Physical runtime saved: '+String(final.manifest.metrics.physicalRuntimeSavingMs??0)+' ms',
  '',
  '## Replay reason',
  ...(plan.reasons.length?plan.reasons.map(reason=>'- '+reason):['- fingerprint/dependency reconciliation']),
  '',
  '## Semantic impact',
  ...(plan.changeImpactSet?.proofScopes?.length?plan.changeImpactSet.proofScopes.map(scope=>'- '+scope.unitId+': '+scope.scope+' — '+(scope.reason??'semantic impact')):['- none / gate fingerprint only']),
  '',
  '## Explain',
  ...Object.values(plan.gates).map(gate=>'- '+gate.gateId+': '+gate.action+' — '+(gate.reasons.length?gate.reasons.join(', '):'semantic inputs equivalent')),
  '',
  '## Verification comparison',
  '- Compared gates: '+final.manifest.comparison.compared,
  '- Discrepancies: '+final.manifest.comparison.discrepancies.length,
  '- Decision: **'+final.manifest.comparison.decision+'**',
  '- Final confidence: **'+final.manifest.finalConfidence+'**',
  '',
  '## Promotion proof',
  '- Shadow PASS count: '+String(final.manifest.shadowStats?.passes??0),
  '- RESUMED shadow PASS count: '+String(final.manifest.shadowStats?.resumedPasses??0),
  '- False reuse count: '+String(final.manifest.shadowStats?.falseReuse??0),
  '- Promotion eligible: **'+String(final.manifest.shadowStats?.promotionEligible===true?'YES':'NO')+'**',
];
writeFileSync(summaryPath,lines.join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');

console.log('Resumable Verification: '+final.decision+'; mode='+plan.verificationMode+'; execution='+plan.executionMode+'; tier='+plan.replayTier+'; reusedCandidate='+plan.evidence.reused+'; rerun='+plan.evidence.rerun+'; discrepancies='+final.manifest.comparison.discrepancies.length+'; savedMs='+String(final.manifest.metrics.physicalRuntimeSavingMs??0)+'.');
for(const discrepancy of final.manifest.comparison.discrepancies)console.error(JSON.stringify(discrepancy));
if(final.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
