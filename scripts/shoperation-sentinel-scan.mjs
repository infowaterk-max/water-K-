import{existsSync,mkdirSync,readFileSync,writeFileSync}from'node:fs';
const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const policy=readJson('quality/knowledge/sentinel-policy.v1.json');
const snapshotPath=process.env.SHOPERATION_SENTINEL_SNAPSHOT||'artifacts/shoperation-sentinel/source-snapshot.json';
const outputDir=process.env.SHOPERATION_SENTINEL_OUT_DIR||'artifacts/shoperation-sentinel';
if(policy.contract!=='shoporation.sentinel-policy.v1')throw new Error('SENTINEL_POLICY_CONTRACT_INVALID');
if(!existsSync(snapshotPath))throw new Error('SENTINEL_SOURCE_SNAPSHOT_MISSING');
const snapshot=readJson(snapshotPath);
if(snapshot.contract!=='shoporation.sentinel-source-snapshot.v1')throw new Error('SENTINEL_SOURCE_CONTRACT_INVALID');
const nowMs=Date.parse(snapshot.collectedAt);
if(!Number.isFinite(nowMs))throw new Error('SENTINEL_SOURCE_TIME_INVALID');
const DAY=24*60*60*1000;
const failureConclusions=new Set(policy.failureConclusions);
const excluded=new Set(policy.sources.excludeWorkflowNames||[]);
const runs=(snapshot.workflowRuns||[]).filter(run=>!excluded.has(run.name));
const ageDays=run=>(nowMs-Date.parse(run.createdAt))/DAY;
const inRange=(run,minExclusive,maxInclusive)=>{const age=ageDays(run);return Number.isFinite(age)&&age>minExclusive&&age<=maxInclusive;};
const failed=run=>failureConclusions.has(run.conclusion);
const summarize=list=>{
  const failures=list.filter(failed);
  const cancellations=list.filter(run=>run.conclusion==='cancelled');
  return{runs:list.length,failures:failures.length,cancellations:cancellations.length,failureRate:list.length?Number((failures.length/list.length).toFixed(4)):0};
};
const dailyRuns=runs.filter(run=>inRange(run,-1/86400,policy.windows.dailyHours/24));
const trendRuns=runs.filter(run=>inRange(run,-1/86400,policy.windows.trendDays));
const historyRuns=runs.filter(run=>inRange(run,-1/86400,policy.windows.historyDays));
const priorTrendRuns=runs.filter(run=>inRange(run,policy.windows.trendDays,policy.windows.trendDays+policy.windows.comparisonDays));
const byWorkflow=new Map();
for(const run of trendRuns.filter(failed)){
  const row=byWorkflow.get(run.name)||{workflow:run.name,count:0,runIds:[]};
  row.count+=1;row.runIds.push(run.id);byWorkflow.set(run.name,row);
}
const repeatedWorkflows=[...byWorkflow.values()].filter(row=>row.count>=policy.thresholds.actionSameWorkflowFailures7d).sort((a,b)=>b.count-a.count||a.workflow.localeCompare(b.workflow));
const openIssues=(snapshot.openIssues||[]).filter(issue=>!issue.pullRequest);
const failureIntakeIssues=openIssues.filter(issue=>(issue.body||'').includes('<!-- shoperation-failure-intake:'));
const deepAtlasIssues=openIssues.filter(issue=>(issue.body||'').includes('<!-- shoperation-deep-atlas-scan -->'));
const fingerprints=[...new Set(failureIntakeIssues.map(issue=>{const match=(issue.body||'').match(/<!-- shoperation-failure-intake:([^\s]+) -->/);return match?.[1]||null;}).filter(Boolean))].sort();
const signals=[];
const add=(code,severity,reason,evidence,recommendation)=>signals.push({code,severity,reason,evidence,recommendation});
if(deepAtlasIssues.length)add('SENTINEL_DEEP_ATLAS_ATTENTION','action','Deep Atlas has an open architecture-drift finding.',deepAtlasIssues.map(i=>({issue:i.number,title:i.title,updatedAt:i.updatedAt})),'Resolve the existing Deep Atlas finding before broadening architecture scope.');
if(dailyRuns.filter(failed).length>=policy.thresholds.actionFailures24h)add('SENTINEL_FAILURE_BURST_24H','action',`${dailyRuns.filter(failed).length} failing workflow runs were observed in the last 24 hours.`,dailyRuns.filter(failed).map(r=>({id:r.id,workflow:r.name,conclusion:r.conclusion,createdAt:r.createdAt})),'Freeze broad changes around the affected control path and isolate the first failing boundary.');
for(const row of repeatedWorkflows)add('SENTINEL_REPEATED_WORKFLOW_FAILURE','action',`${row.workflow} failed ${row.count} times in the last 7 days.`,row,'Inspect the repeated failure class and strengthen the earliest existing gate or regression test that can deterministically detect it.');
if(failureIntakeIssues.length)add('SENTINEL_OPEN_FAILURE_INTAKE','review',`${failureIntakeIssues.length} unresolved Failure Intake issue(s) remain open.`,{issues:failureIntakeIssues.map(i=>i.number),fingerprints},'Disposition each fingerprint explicitly: match, promote, scope, deduplicate or reject with evidence.');
const trendSummary=summarize(trendRuns),priorSummary=summarize(priorTrendRuns);
if(trendSummary.failures>=policy.thresholds.reviewFailures7d&&!repeatedWorkflows.length)add('SENTINEL_ELEVATED_FAILURE_TREND','review',`${trendSummary.failures} failing workflow runs were observed in the last 7 days.`,{current7d:trendSummary,previous7d:priorSummary},'Review whether failures share a common gate, subsystem or evidence boundary before changing controls.');
const status=signals.some(s=>s.severity==='action')?'ACTION_REQUIRED':signals.length?'REVIEW':'HEALTHY';
const delta=trendSummary.failures-priorSummary.failures;
const trend=delta>0?'worsening':delta<0?'improving':'stable';
const recommendations=[...new Set(signals.map(s=>s.recommendation))];
const report={
  contract:'shoporation.sentinel-report.v1',
  generatedAt:new Date(nowMs).toISOString(),
  repository:snapshot.repository||null,
  sourceCommit:snapshot.sourceCommit||null,
  status,
  blocking:false,
  authority:false,
  autoMutationAllowed:false,
  windows:{
    last24h:summarize(dailyRuns),
    last7d:trendSummary,
    previous7d:priorSummary,
    last30d:summarize(historyRuns)
  },
  trend:{direction:trend,failureDelta7d:delta},
  openEvidence:{failureIntakeIssues:failureIntakeIssues.length,fingerprints,deepAtlasAttentionIssues:deepAtlasIssues.length},
  repeatedWorkflows,
  signals,
  recommendations,
  operatorActionRequired:status==='ACTION_REQUIRED',
  decisionBasis:'Evidence-backed observation only; existing authorities remain canonical.'
};
mkdirSync(outputDir,{recursive:true});
writeFileSync(`${outputDir}/sentinel-report.json`,JSON.stringify(report,null,2)+'\n');
const md=[
  '# Shoperation Sentinel Report','',
  `Status: **${status}**`,
  `Generated: ${report.generatedAt}`,
  `Source commit: ${report.sourceCommit||'unknown'}`,
  `24h failures: ${report.windows.last24h.failures}/${report.windows.last24h.runs}`,
  `7d failures: ${report.windows.last7d.failures}/${report.windows.last7d.runs}`,
  `30d failures: ${report.windows.last30d.failures}/${report.windows.last30d.runs}`,
  `Open Failure Intake fingerprints: ${fingerprints.length}`,
  `Deep Atlas attention: ${deepAtlasIssues.length}`,
  '',
  '## Signals',
  ...(signals.length?signals.map(s=>`- [${s.severity.toUpperCase()}] ${s.code}: ${s.reason}`):['- none']),
  '',
  '## Recommendations',
  ...(recommendations.length?recommendations.map(x=>`- ${x}`):['- none']),
  '',
  'Sentinel does not modify code, change authority or bypass existing gates.'
];
writeFileSync(`${outputDir}/sentinel-report.md`,md.join('\n')+'\n');
console.log(`Shoperation Sentinel: ${status}; 24h failures=${report.windows.last24h.failures}; 7d failures=${report.windows.last7d.failures}; signals=${signals.length}.`);
