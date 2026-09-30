import{existsSync,mkdirSync,readFileSync,writeFileSync}from'node:fs';
const signatures=JSON.parse(readFileSync('quality/knowledge/failure-signatures.v1.json','utf8'));
const sentinel=JSON.parse(readFileSync('quality/knowledge/sentinel-policy.v1.json','utf8'));
const actionEvents=new Set(sentinel.sources.actionEligibleEvents||[]);
const mainBranch=sentinel.sources.actionEligibleBranch||'main';
const markerOf=issue=>(issue.body||'').match(/<!-- shoperation-failure-intake:([^\s]+) -->/)?.[1]||null;
const codeOf=issue=>{const title=String(issue.title||'');const m=title.match(/^\[Quality intake\]\s+[^:]+:\s+(.+)$/);return(m?.[1]||'').trim()||null;};
const scopeOf=(run,sourceScope)=>{if(sourceScope==='canonical'||sourceScope==='development')return sourceScope;if(!run)return'unknown';if(actionEvents.has(run.event)&&run.headBranch===mainBranch)return'canonical';if(run.event==='pull_request'||(run.event==='push'&&run.headBranch&&run.headBranch!==mainBranch))return'development';return'unknown';};
const matchRule=code=>signatures.rules.find(rule=>rule.match==='exact'?code===rule.pattern:rule.match==='prefix'?code?.startsWith(rule.pattern):code?.includes(rule.pattern))||null;
const rankScope=scope=>scope==='canonical'?3:scope==='unknown'?2:1;
export function buildFailureIntakeReconciliation(snapshot){
  if(snapshot?.contract!=='shoporation.failure-intake-reconciliation-source.v1')throw new Error('FAILURE_INTAKE_RECONCILIATION_SOURCE_INVALID');
  const rows=(snapshot.issues||[]).map(issue=>{const fingerprint=markerOf(issue),rawErrorCode=codeOf(issue),scope=scopeOf(issue.sourceRun,issue.sourceScope),rule=rawErrorCode?matchRule(rawErrorCode):null;return{issue,fingerprint,rawErrorCode,scope,knownFailureId:rule?.failureId||null};});
  const byFingerprint=new Map();for(const row of rows){if(!row.fingerprint)continue;const list=byFingerprint.get(row.fingerprint)||[];list.push(row);byFingerprint.set(row.fingerprint,list);}
  const duplicateIds=new Map();
  for(const [fingerprint,list] of byFingerprint){
    if(list.length<2)continue;
    const sorted=[...list].sort((a,b)=>rankScope(b.scope)-rankScope(a.scope)||(b.issue.number??0)-(a.issue.number??0));
    const keeper=sorted[0];
    for(const row of sorted.slice(1))duplicateIds.set(row.issue.number,{fingerprint,keeper:keeper.issue.number});
  }
  const actions=rows.map(row=>{
    const base={issueNumber:row.issue.number,fingerprint:row.fingerprint,rawErrorCode:row.rawErrorCode,scope:row.scope,sourceRunId:row.issue.sourceRun?.id??null,laterSuccessRunId:row.issue.laterSuccess?.id??null};
    const duplicate=duplicateIds.get(row.issue.number);
    if(duplicate)return{...base,action:'close',disposition:'duplicate',reason:`Duplicate fingerprint ${duplicate.fingerprint}; authoritative open issue #${duplicate.keeper} is retained.`,keeperIssue:duplicate.keeper};
    if(row.knownFailureId)return{...base,action:'close',disposition:'promoted-to-known-failure',knownFailureId:row.knownFailureId,reason:`Current failure-signature authority maps ${row.rawErrorCode} to ${row.knownFailureId}.`};
    if(row.rawErrorCode==='SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED'&&row.issue.location&&Array.isArray(snapshot.proofs?.atlasDomainResolvedFiles)&&snapshot.proofs.atlasDomainResolvedFiles.includes(row.issue.location))return{...base,action:'close',disposition:'resolved-by-current-atlas',reason:`Current canonical Atlas now maps ${row.issue.location} to an explicit domain.`};
    if(row.rawErrorCode==='TEST_FAILED'&&snapshot.proofs?.fullRegressionPassed)return{...base,action:'close',disposition:'resolved-by-full-regression',reason:'Current periodic Knowledge Full Replay completed the full regression suite successfully.'};
    if(row.rawErrorCode==='TYPECHECK_FAILED'&&snapshot.proofs?.typecheckPassed)return{...base,action:'close',disposition:'resolved-by-typecheck',reason:'Current periodic Knowledge Full Replay completed TypeScript validation successfully.'};
    if(row.issue.sourceRun&&row.issue.laterSuccess)return{...base,action:'close',disposition:'resolved-by-later-success',reason:`Later successful ${row.issue.sourceRun.name||'workflow'} run ${row.issue.laterSuccess.id} on ${row.issue.sourceRun.headBranch||'unknown branch'} proves the originating workflow recovered.`};
    if(row.scope==='unknown')return{...base,action:'keep-open',disposition:'scope-unknown',reason:'Source workflow scope cannot be proven; evidence remains open.'};
    return{...base,action:'keep-open',disposition:'still-active',reason:'No deterministic resolution evidence exists yet.'};
  });
  const counts=actions.reduce((acc,item)=>{acc[item.disposition]=(acc[item.disposition]||0)+1;return acc;},{});
  return{contract:'shoporation.failure-intake-reconciliation.v1',sourceCommit:snapshot.sourceCommit||null,generatedAt:snapshot.collectedAt||new Date().toISOString(),counts,actions,closeActions:actions.filter(x=>x.action==='close'),openActions:actions.filter(x=>x.action==='keep-open')};
}
const snapshotPath=process.env.SHOPERATION_FAILURE_RECONCILIATION_SNAPSHOT||'artifacts/shoperation-failure-intake-reconciliation/source-snapshot.json';
const outputDir=process.env.SHOPERATION_FAILURE_RECONCILIATION_OUT_DIR||'artifacts/shoperation-failure-intake-reconciliation';
if(process.argv[1]?.endsWith('shoperation-failure-intake-reconcile.mjs')){
  if(!existsSync(snapshotPath))throw new Error('FAILURE_INTAKE_RECONCILIATION_SNAPSHOT_MISSING');
  const report=buildFailureIntakeReconciliation(JSON.parse(readFileSync(snapshotPath,'utf8')));
  mkdirSync(outputDir,{recursive:true});
  writeFileSync(`${outputDir}/reconciliation.json`,JSON.stringify(report,null,2)+'\n');
  writeFileSync(`${outputDir}/reconciliation.md`,['# Failure Intake reconciliation','',`Close actions: ${report.closeActions.length}`,`Remain open: ${report.openActions.length}`,'',...report.actions.map(x=>`- #${x.issueNumber} — ${x.disposition} — ${x.reason}`)].join('\n')+'\n');
  console.log(`Failure Intake reconciliation: close=${report.closeActions.length}; open=${report.openActions.length}.`);
}
