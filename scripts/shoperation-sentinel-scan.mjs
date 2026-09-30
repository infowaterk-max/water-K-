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
const actionEvents=new Set(policy.sources.actionEligibleEvents||[]);
const runs=(snapshot.workflowRuns||[]).filter(run=>!excluded.has(run.name));
const ageDays=run=>(nowMs-Date.parse(run.createdAt))/DAY;
const inRange=(run,minExclusive,maxInclusive)=>{const age=ageDays(run);return Number.isFinite(age)&&age>minExclusive&&age<=maxInclusive;};
const failed=run=>failureConclusions.has(run.conclusion);
const summarize=list=>{
  const failures=list.filter(failed);
  const cancellations=list.filter(run=>run.conclusion==='cancelled');
  return{runs:list.length,failures:failures.length,cancellations:cancellations.length,failureRate:list.length?Number((failures.length/list.length).toFixed(4)):0};
};
const actionEligible=run=>actionEvents.has(run.event)&&run.headBranch===policy.sources.actionEligibleBranch;
const developmentEligible=run=>run.event===policy.sources.developmentEvent||(run.event==='push'&&Boolean(run.headBranch)&&run.headBranch!==policy.sources.actionEligibleBranch);
const systemRuns=runs.filter(actionEligible);
const developmentRuns=runs.filter(developmentEligible);
const system24=systemRuns.filter(run=>inRange(run,-1/86400,policy.windows.dailyHours/24));
const system7=systemRuns.filter(run=>inRange(run,-1/86400,policy.windows.trendDays));
const system30=systemRuns.filter(run=>inRange(run,-1/86400,policy.windows.historyDays));
const systemPrior7=systemRuns.filter(run=>inRange(run,policy.windows.trendDays,policy.windows.trendDays+policy.windows.comparisonDays));
const development7=developmentRuns.filter(run=>inRange(run,-1/86400,policy.windows.trendDays));
const development30=developmentRuns.filter(run=>inRange(run,-1/86400,policy.windows.historyDays));
const byWorkflow=new Map();
for(const run of system7.filter(failed)){
  const row=byWorkflow.get(run.name)||{workflow:run.name,count:0,runIds:[]};
  row.count+=1;row.runIds.push(run.id);byWorkflow.set(run.name,row);
}
const repeatedWorkflows=[...byWorkflow.values()].filter(row=>row.count>=policy.thresholds.actionSameWorkflowMainFailures7d).sort((a,b)=>b.count-a.count||a.workflow.localeCompare(b.workflow));
const openIssues=(snapshot.openIssues||[]).filter(issue=>!issue.pullRequest);
const failureIntakeIssues=openIssues.filter(issue=>(issue.body||'').includes('<!-- shoperation-failure-intake:'));
const deepAtlasIssues=openIssues.filter(issue=>(issue.body||'').includes('<!-- shoperation-deep-atlas-scan -->'));
const fingerprintOf=issue=>{const match=(issue.body||'').match(/<!-- shoperation-failure-intake:([^\s]+) -->/);return match?.[1]||null;};
const sourceCommitOf=issue=>{const match=(issue.body||'').match(/Source commit:\s*`([0-9a-f]{7,40})`/i);return match?.[1]||null;};
const runsByCommit=new Map();
for(const run of runs){if(!run.headSha)continue;const list=runsByCommit.get(run.headSha)||[];list.push(run);runsByCommit.set(run.headSha,list);}
const classifyFailureIntake=issue=>{
  const sourceCommit=sourceCommitOf(issue);
  const evidenceRuns=sourceCommit?(runsByCommit.get(sourceCommit)||[]):[];
  if(evidenceRuns.some(actionEligible))return'canonical';
  if(evidenceRuns.some(developmentEligible))return'development';
  return'unknown';
};
const intakeByScope={canonical:[],development:[],unknown:[]};
for(const issue of failureIntakeIssues)intakeByScope[classifyFailureIntake(issue)].push(issue);
const canonicalFailureIntakeIssues=intakeByScope.canonical;
const developmentFailureIntakeIssues=intakeByScope.development;
const unknownFailureIntakeIssues=intakeByScope.unknown;
const fingerprintsFor=issues=>[...new Set(issues.map(fingerprintOf).filter(Boolean))].sort();
const fingerprints=fingerprintsFor(canonicalFailureIntakeIssues);
const developmentFingerprints=fingerprintsFor(developmentFailureIntakeIssues);
const unknownFingerprints=fingerprintsFor(unknownFailureIntakeIssues);
const signals=[];
const add=(code,severity,reason,evidence,recommendation)=>signals.push({code,severity,reason,evidence,recommendation});
if(deepAtlasIssues.length)add('SENTINEL_DEEP_ATLAS_ATTENTION','action','Deep Atlas has an open architecture-drift finding.',deepAtlasIssues.map(i=>({issue:i.number,title:i.title,updatedAt:i.updatedAt})),'Resolve the existing Deep Atlas finding before broadening architecture scope.');
if(system24.filter(failed).length>=policy.thresholds.actionMainFailures24h)add('SENTINEL_MAIN_FAILURE_BURST_24H','action',`${system24.filter(failed).length} failing main/scheduled workflow runs were observed in the last 24 hours.`,system24.filter(failed).map(r=>({id:r.id,workflow:r.name,conclusion:r.conclusion,createdAt:r.createdAt})),'Freeze broad changes around the affected control path and isolate the first failing boundary.');
for(const row of repeatedWorkflows)add('SENTINEL_REPEATED_MAIN_WORKFLOW_FAILURE','action',`${row.workflow} failed ${row.count} times on main/scheduled evidence in the last 7 days.`,row,'Inspect the repeated failure class and strengthen the earliest existing gate or regression test that can deterministically detect it.');
if(canonicalFailureIntakeIssues.length)add('SENTINEL_OPEN_FAILURE_INTAKE','review',`${canonicalFailureIntakeIssues.length} canonical/main Failure Intake issue(s) remain open.`,{issues:canonicalFailureIntakeIssues.map(i=>i.number),fingerprints},'Disposition each canonical fingerprint explicitly: match, promote, scope, deduplicate or reject with evidence.');
if(unknownFailureIntakeIssues.length)add('SENTINEL_FAILURE_INTAKE_SCOPE_UNKNOWN','review',`${unknownFailureIntakeIssues.length} Failure Intake issue(s) cannot yet be classified as canonical or development evidence.`,{issues:unknownFailureIntakeIssues.map(i=>i.number),fingerprints:unknownFingerprints},'Resolve the evidence scope before treating these fingerprints as platform health signals.');
const system7Summary=summarize(system7),systemPrior7Summary=summarize(systemPrior7),development7Summary=summarize(development7);
if(system7Summary.failures>=policy.thresholds.reviewMainFailures7d&&!repeatedWorkflows.length)add('SENTINEL_ELEVATED_MAIN_FAILURE_TREND','review',`${system7Summary.failures} failing main/scheduled workflow runs were observed in the last 7 days.`,{current7d:system7Summary,previous7d:systemPrior7Summary},'Review whether the failures share a common gate, subsystem or evidence boundary before changing controls.');
if(development7Summary.failures>=policy.thresholds.reviewDevelopmentFailures7d)add('SENTINEL_DEVELOPMENT_FRICTION_TREND','review',`${development7Summary.failures} pull-request workflow failures were observed in the last 7 days; development noise is not promoted to ACTION_REQUIRED by itself.`,{development7d:development7Summary},'Review recurring PR failure classes for preventable development friction without treating iterative branch failures as production instability.');
const status=signals.some(s=>s.severity==='action')?'ACTION_REQUIRED':signals.length?'REVIEW':'HEALTHY';
const delta=system7Summary.failures-systemPrior7Summary.failures;
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
    system:{last24h:summarize(system24),last7d:system7Summary,previous7d:systemPrior7Summary,last30d:summarize(system30)},
    development:{last7d:development7Summary,last30d:summarize(development30)}
  },
  trend:{direction:trend,failureDelta7d:delta},
  openEvidence:{failureIntakeIssues:failureIntakeIssues.length,canonicalFailureIntakeIssues:canonicalFailureIntakeIssues.length,developmentFailureIntakeIssues:developmentFailureIntakeIssues.length,unknownFailureIntakeIssues:unknownFailureIntakeIssues.length,fingerprints,developmentFingerprints,unknownFingerprints,deepAtlasAttentionIssues:deepAtlasIssues.length},
  repeatedWorkflows,
  signals,
  recommendations,
  operatorActionRequired:status==='ACTION_REQUIRED',
  decisionBasis:'ACTION_REQUIRED is driven only by main/scheduled evidence or an existing authoritative Deep Atlas finding. Feature-branch push and pull-request failures are development evidence; they never become canonical Failure Intake health signals by themselves.'
};
mkdirSync(outputDir,{recursive:true});
writeFileSync(`${outputDir}/sentinel-report.json`,JSON.stringify(report,null,2)+'\n');
const md=[
  '# Shoperation Sentinel Report','',
  `Status: **${status}**`,
  `Generated: ${report.generatedAt}`,
  `Source commit: ${report.sourceCommit||'unknown'}`,
  `Main/scheduled 24h failures: ${report.windows.system.last24h.failures}/${report.windows.system.last24h.runs}`,
  `Main/scheduled 7d failures: ${report.windows.system.last7d.failures}/${report.windows.system.last7d.runs}`,
  `Main/scheduled 30d failures: ${report.windows.system.last30d.failures}/${report.windows.system.last30d.runs}`,
  `PR 7d failures: ${report.windows.development.last7d.failures}/${report.windows.development.last7d.runs}`,
  `Open canonical Failure Intake fingerprints: ${fingerprints.length}`,
  `Open development Failure Intake fingerprints: ${developmentFingerprints.length}`,
  `Open unknown-scope Failure Intake fingerprints: ${unknownFingerprints.length}`,
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
console.log(`Shoperation Sentinel: ${status}; main24h failures=${report.windows.system.last24h.failures}; main7d failures=${report.windows.system.last7d.failures}; pr7d failures=${report.windows.development.last7d.failures}; signals=${signals.length}.`);
