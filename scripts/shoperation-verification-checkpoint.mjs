import {appendFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {atomicWriteJson,checkpointChecksum,finalizeVerification,loadCheckpoint} from './lib/shoperation-verification-reuse.mjs';
import {completionEvidenceGuardIds,mergeExternalCompletionEvidence,EXTERNAL_PROOF_EVIDENCE_CONTRACT} from './shoperation-external-proof-handoff.mjs';

const planPath=process.env.SHOPERATION_REPLAY_PLAN||'artifacts/shoperation-development-guard/resumable-verification-plan.json';
const checkpointPath=process.env.SHOPERATION_REPLAY_CHECKPOINT||'artifacts/shoperation-verification-cache/checkpoint.json';
const manifestPath='artifacts/shoperation-development-guard/final-evidence-manifest.json';
const summaryPath='artifacts/shoperation-development-guard/resumable-verification-summary.md';
const activePlanPath=process.env.SHOPERATION_ACTIVE_PLAN||'quality/development/active-plan.json';
const externalEvidencePath=process.env.SHOPERATION_VERIFICATION_EXTERNAL_EVIDENCE||'artifacts/shoperation-development-guard/external-proof-evidence.json';
const env=name=>String(process.env[name]??'').trim();

const PRODUCER_ARTIFACTS={
  'GUARD-KNOWLEDGE-PREFLIGHT':{path:'artifacts/shoperation-quality/knowledge-preflight.json',headField:'sourceCommit'},
  'GUARD-PLAN-BEFORE-CODE':{path:'artifacts/shoperation-development-guard/plan-before-code.json',headField:'head'},
  'GUARD-EDIT-TIME':{path:'artifacts/shoperation-development-guard/edit-time-guard.json',headField:'head'},
  'GUARD-INCREMENTAL-REPLAY':{path:'artifacts/shoperation-development-guard/incremental-replay.json',headField:null},
  'GUARD-RELEASE-RISK':{path:'artifacts/release-risk-budget.json',headField:'head'},
};
const PASS_OUTCOMES=new Set(['success','pass','passed','succeeded','ok','green']);
const FAIL_OUTCOMES=new Set(['failure','failed','error','cancelled','canceled','timed_out','action_required']);
const normalize=value=>String(value??'').trim().toLowerCase().replaceAll(' ','_');
export function reconcileProducerDecisions({outcomes={},sourceRevision='',artifactRecords={}}={}){
  const reconciled={...outcomes},checks=[],mismatches=[];
  for(const [gateId,config] of Object.entries(PRODUCER_ARTIFACTS)){
    const workflowRaw=outcomes[gateId],workflow=normalize(workflowRaw),workflowPass=PASS_OUTCOMES.has(workflow),workflowFail=FAIL_OUTCOMES.has(workflow);
    const record=artifactRecords[gateId]??null,artifactDecision=String(record?.decision??'').trim().toUpperCase();
    const artifactPass=artifactDecision==='PASS',artifactBlock=artifactDecision==='BLOCK';
    const artifactHead=config.headField?String(record?.[config.headField]??'').trim():null;
    const exactHead=!config.headField||Boolean(artifactHead&&sourceRevision&&artifactHead===sourceRevision);
    const available=Boolean(record),decisionKnown=artifactPass||artifactBlock;
    let code=null;
    if(workflowPass&&!available)code='PRODUCER_ARTIFACT_MISSING';
    else if(workflowPass&&!decisionKnown)code='PRODUCER_ARTIFACT_DECISION_UNKNOWN';
    else if(workflowPass&&!artifactPass)code='PRODUCER_ARTIFACT_BLOCKED_WHILE_WORKFLOW_SUCCESS';
    else if(workflowPass&&!exactHead)code='PRODUCER_ARTIFACT_HEAD_MISMATCH';
    else if(workflowFail&&artifactPass)code='PRODUCER_ARTIFACT_PASS_WHILE_WORKFLOW_FAILED';
    const check={gateId,path:config.path,workflow:workflowRaw??null,artifactDecision:artifactDecision||null,artifactHead,sourceRevision,available,exactHead,decision:code?'BLOCK':'PASS',code};
    checks.push(check);
    if(code){mismatches.push(check);reconciled[gateId]='failure';}
  }
  return{outcomes:reconciled,checks,mismatches,decision:mismatches.length?'BLOCK':'PASS'};
}
function loadProducerArtifacts(){
  const records={};
  for(const [gateId,config] of Object.entries(PRODUCER_ARTIFACTS))if(existsSync(config.path))try{records[gateId]=JSON.parse(readFileSync(config.path,'utf8'));}catch{records[gateId]={decision:'UNREADABLE'};}
  return records;
}
if(process.argv.includes('--producer-decision-self-test')){
  const pass=reconcileProducerDecisions({outcomes:{'GUARD-EDIT-TIME':'success'},sourceRevision:'head-1',artifactRecords:{'GUARD-EDIT-TIME':{decision:'PASS',head:'head-1'}}});
  const blocked=reconcileProducerDecisions({outcomes:{'GUARD-EDIT-TIME':'success'},sourceRevision:'head-1',artifactRecords:{'GUARD-EDIT-TIME':{decision:'BLOCK',head:'head-1'}}});
  const stale=reconcileProducerDecisions({outcomes:{'GUARD-EDIT-TIME':'success'},sourceRevision:'head-1',artifactRecords:{'GUARD-EDIT-TIME':{decision:'PASS',head:'older'}}});
  const ok=pass.decision==='PASS'&&blocked.decision==='BLOCK'&&blocked.outcomes['GUARD-EDIT-TIME']==='failure'&&stale.mismatches.some(item=>item.code==='PRODUCER_ARTIFACT_HEAD_MISMATCH');
  console.log(`Producer decision self-test: ${ok?'PASS':'FAIL'}`);
  if(!ok)process.exitCode=1;
  process.exit();
}

if(!existsSync(planPath))throw new Error('RESUMABLE_VERIFICATION_PLAN_MISSING:'+planPath);
const plan=JSON.parse(readFileSync(planPath,'utf8'));
let outcomes={};
try{outcomes=JSON.parse(env('SHOPERATION_VERIFICATION_OUTCOMES_JSON')||'{}');}
catch(error){outcomes={};console.error('VERIFICATION_OUTCOMES_JSON_INVALID:'+String(error));}

const loaded=loadCheckpoint(checkpointPath);
const priorCheckpoint=loaded.checkpoint;
const runId=[env('GITHUB_RUN_ID'),env('GITHUB_RUN_ATTEMPT')].filter(Boolean).join('-')||'local';
const stateVersion=env('SHOPERATION_TRUTH_STATE_VERSION')||'shoporation-ci.v1';
const producerReconciliation=reconcileProducerDecisions({outcomes,sourceRevision:plan.sourceRevision,artifactRecords:loadProducerArtifacts()});
const final=finalizeVerification({plan,outcomes:producerReconciliation.outcomes,priorCheckpoint,runId,stateVersion});
const activePlan=existsSync(activePlanPath)?JSON.parse(readFileSync(activePlanPath,'utf8')):{status:'unknown',completionContract:{requirements:[]}};
let externalEnvelope=null,externalRecords=[];
if(existsSync(externalEvidencePath)){
  try{
    externalEnvelope=JSON.parse(readFileSync(externalEvidencePath,'utf8'));
    if(externalEnvelope?.contract===EXTERNAL_PROOF_EVIDENCE_CONTRACT&&Array.isArray(externalEnvelope?.evidence))externalRecords=externalEnvelope.evidence;
    else externalEnvelope={contract:externalEnvelope?.contract??null,decision:'BLOCK',issues:[{code:'EXTERNAL_EVIDENCE_ENVELOPE_INVALID'}],evidence:[]};
  }catch(error){externalEnvelope={contract:'unreadable',decision:'BLOCK',issues:[{code:'EXTERNAL_EVIDENCE_ENVELOPE_UNREADABLE',error:String(error)}],evidence:[]};}
}
const currentExactState={head:plan.sourceRevision,branch:plan.branch,stateVersion};
const externalMerge=mergeExternalCompletionEvidence({
  truthEvidence:final.manifest.truthEvidence,
  externalEvidence:externalRecords,
  requiredIds:completionEvidenceGuardIds(activePlan),
  currentExactState,
});
if(externalEnvelope?.decision==='BLOCK')externalMerge.issues.push(...(externalEnvelope.issues??[{code:'EXTERNAL_EVIDENCE_ENVELOPE_BLOCK'}]));
final.manifest.truthEvidence=externalMerge.truthEvidence;
final.manifest.externalCompletionEvidence={
  contract:EXTERNAL_PROOF_EVIDENCE_CONTRACT,
  decision:externalMerge.issues.length?'BLOCK':'PASS',
  requiredExternal:externalMerge.requiredExternal,
  sourcePath:existsSync(externalEvidencePath)?externalEvidencePath:null,
  records:externalRecords,
  issues:externalMerge.issues,
};
final.checkpoint.externalCompletionEvidence=final.manifest.externalCompletionEvidence;
if(externalMerge.issues.length){
  for(const issue of externalMerge.issues)final.manifest.comparison.discrepancies.push({gateId:issue.guardId??'EXTERNAL-PROOF',...issue});
  final.manifest.comparison.decision='BLOCK';
  final.manifest.finalConfidence='BLOCK';
  final.manifest.decision='BLOCK';
  final.checkpoint.complete=false;
  final.decision='BLOCK';
}
final.manifest.producerDecisionChecks=producerReconciliation.checks;
final.manifest.producerDecisionMismatches=producerReconciliation.mismatches;
final.checkpoint.producerDecisionMismatches=producerReconciliation.mismatches;
final.checkpoint.checksum=checkpointChecksum(final.checkpoint);


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
  '- Physically skipped gates: '+String(Object.values(final.manifest.gates??{}).filter(item=>item.execution==='REUSED').length),
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
  '- Producer decision mismatches: '+producerReconciliation.mismatches.length,
  '- External completion evidence: '+final.manifest.externalCompletionEvidence.decision+' ('+final.manifest.externalCompletionEvidence.requiredExternal.join(', ')+')',
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
