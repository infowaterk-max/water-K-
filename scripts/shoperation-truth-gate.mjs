import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {evaluateCompletionTruth,validateOperationalIntelligence} from './lib/shoperation-operational-intelligence.mjs';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const plan=readJson('quality/development/active-plan.json');
const policy=readJson('quality/knowledge/development-guard-policy.v1.json');
const registry=readJson('quality/knowledge/guard-registry.v1.json');
const env=value=>String(process.env[value]??'').trim();
const git=args=>{try{return execFileSync('git',args,{encoding:'utf8'}).trim();}catch{return'';}};
const currentExactState={
  head:env('SHOPERATION_TRUTH_HEAD')||env('GITHUB_SHA')||git(['rev-parse','HEAD']),
  branch:env('SHOPERATION_TRUTH_BRANCH')||env('GITHUB_HEAD_REF')||env('GITHUB_REF_NAME')||git(['rev-parse','--abbrev-ref','HEAD']),
  stateVersion:env('SHOPERATION_TRUTH_STATE_VERSION')||'shoporation-ci.v1',
};
let evidence=[];
try{evidence=JSON.parse(env('SHOPERATION_TRUTH_EVIDENCE_JSON')||'[]');}catch(error){
  evidence=[{id:'TRUTH_INPUT',status:'failure',sourceCommit:currentExactState.head,branch:currentExactState.branch,stateVersion:currentExactState.stateVersion,runId:env('GITHUB_RUN_ID')||'local',reason:String(error)}];
}
if(!Array.isArray(evidence))evidence=[];
const guardIds=(registry.guards??[]).map(item=>item.id);
const validation=validateOperationalIntelligence({plan,policy,guardIds});
const report=evaluateCompletionTruth({plan,evidence,currentExactState,planIssues:validation.issues});
report.generatedAt=new Date().toISOString();
report.runId=env('GITHUB_RUN_ID')||null;
report.runAttempt=env('GITHUB_RUN_ATTEMPT')||null;
report.readOnly=true;
report.authority='quality-knowledge-system';
report.releaseAuthority='release-infrastructure';
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/truth-gate.json',JSON.stringify(report,null,2)+'\n');
const lines=[
  '# Shoperation Completion Truth Gate','',
  `Decision: **${report.decision}**`,
  `Internal state: **${report.internalState}**`,
  `Product Owner status: **${report.poStatus}**`,
  `Exact head: \`${report.currentExactState.head||'unknown'}\``,
  `Branch: \`${report.currentExactState.branch||'unknown'}\``,
  `State version: \`${report.currentExactState.stateVersion||'unknown'}\``,
  '',
  '## Completion integrity',
  `- Requirement completeness: ${report.requirementCompleteness?'PASS':'NOT VERIFIED'}`,
  `- Implementation completeness: ${report.implementationCompleteness?'PASS':'NOT VERIFIED'}`,
  `- Outcome verification: ${report.outcomeVerification?'PASS':'NOT VERIFIED'}`,
  `- Negative verification: ${report.negativeVerification?'PASS':'NOT VERIFIED'}`,
  '',
  '## Evidence',
  `- PASS: ${report.evidenceSummary.pass}`,
  `- FAIL: ${report.evidenceSummary.fail}`,
  `- BLOCKED: ${report.evidenceSummary.blocked}`,
  `- STALE: ${report.evidenceSummary.stale}`,
  `- MISSING: ${report.evidenceSummary.missing}`,
  '',
  `NEXT: ${report.next??'none'}`,
];
writeFileSync('artifacts/shoperation-development-guard/truth-gate.md',lines.join('\n')+'\n');
console.log(`Completion Truth Gate: ${report.internalState}; PO=${report.poStatus}; pass=${report.evidenceSummary.pass}; stale=${report.evidenceSummary.stale}; missing=${report.evidenceSummary.missing}.`);
if(report.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
