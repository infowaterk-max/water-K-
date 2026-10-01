import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {getChangedFiles,globToRegExp,guardPolicy} from './lib/shoperation-development-runtime.mjs';
import {evaluateReferenceSynchronization} from './lib/shoperation-reference-sync-runtime.mjs';
import {buildCodebaseAtlas,evaluatePoInstructionStates} from './lib/shoperation-codebase-atlas-runtime.mjs';
const plan=JSON.parse(readFileSync('quality/development/active-plan.json','utf8')),diff=getChangedFiles({baseSha:plan.changeBaseSha}),exceptions=new Map((plan.exceptions??[]).map(x=>[x.ruleId,x])),git=args=>execFileSync('git',args,{encoding:'utf8'});
let patch='';if(diff.base){try{patch=git(['diff','--unified=0','--no-color',diff.base,diff.head,'--']);}catch{}}if(!patch){try{patch=git(['diff','--unified=0','--no-color','--']);}catch{}}
const findings=[];let currentFile=null,newLine=0;
const declaredSemanticRequired=[...(plan.operationalIntelligence?.semanticExecutionRoute?.mustEdit??[])];
const planMatchers=(plan.plannedFilePatterns??[]).map(globToRegExp);
const actualOutsidePlanned=(diff.files??[]).filter(file=>!planMatchers.some(matcher=>matcher.test(file)));
const actualChanged=new Set(diff.files??[]);

for(const line of patch.split(/\r?\n/)){if(line.startsWith('+++ b/')){currentFile=line.slice(6);continue;}const hunk=line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);if(hunk){newLine=Number(hunk[1]);continue;}if(!currentFile)continue;if(line.startsWith('+')&&!line.startsWith('+++')){const added=line.slice(1);for(const rule of guardPolicy.editRules){if(!rule.filePatterns.map(globToRegExp).some(m=>m.test(currentFile)))continue;if(new RegExp(rule.pattern).test(added))findings.push({ruleId:rule.id,severity:rule.severity,title:rule.title,file:currentFile,line:newLine,code:added.trim().slice(0,300),failureIds:rule.failureIds,message:rule.message,exception:exceptions.get(rule.id)??null});}newLine+=1;}else if(!line.startsWith('-'))newLine+=1;}
const referenceSync=evaluateReferenceSynchronization({base:diff.base,head:diff.head});
const atlas=buildCodebaseAtlas();
const poInstructionState=evaluatePoInstructionStates(atlas,diff.files??[]);
for(const violation of poInstructionState.violations??[])findings.push({
  ruleId:'DEV-BLOCK-PO-INSTRUCTION',
  severity:'block',
  title:'Active Product Owner instruction forbidden state remains in changed scope',
  file:violation.file,
  line:0,
  code:violation.forbiddenState,
  failureIds:['SQ-KF-022'],
  message:`PO Instruction ${violation.instructionId}: forbidden state "${violation.forbiddenState}" remains in ${violation.file}.`,
  exception:null,
});
for(const item of referenceSync.staleConsumers??[])findings.push({ruleId:'DEV-BLOCK-REFERENCE-SYNC',severity:'block',title:'Stale consumer survived a removed or changed contract',file:item.file,line:item.line,code:item.text?.trim().slice(0,300)??'',failureIds:['SQ-KF-022'],message:`Reference Sync: ${item.reference.kind} "${item.reference.value}" changed in ${item.reference.originFile}, but a stale machine consumer remains.`,exception:null});
for(const item of referenceSync.reviewConsumers??[])findings.push({ruleId:'DEV-REVIEW-REFERENCE-SYNC',severity:'review',title:'Changed contract still has an ambiguous consumer',file:item.file,line:item.line,code:item.text?.trim().slice(0,300)??'',failureIds:['SQ-KF-022'],message:`Reference Sync review: ${item.reference.kind} "${item.reference.value}" changed in ${item.reference.originFile}; confirm this remaining consumer is intentional.`,exception:exceptions.get('DEV-REVIEW-REFERENCE-SYNC')??null});
const referenceRequired=[...new Set((referenceSync.staleConsumers??[]).map(item=>item.file).filter(Boolean))];
const requiredChangeSet=[...new Set([...declaredSemanticRequired,...referenceRequired])].sort();
const missingRequired=requiredChangeSet.filter(file=>!actualChanged.has(file));
for(const file of missingRequired)findings.push({
  ruleId:'DEV-BLOCK-IMPLEMENTATION-SYNC-MISSING-REQUIRED',
  severity:'block',
  title:'Semantic required change was omitted',
  file,
  line:0,
  code:'',
  failureIds:['SQ-KF-022'],
  message:`Implementation Sync: required target "${file}" is absent from the actual verified change set. Sources: ${declaredSemanticRequired.includes(file)?'semantic-route':''}${declaredSemanticRequired.includes(file)&&referenceRequired.includes(file)?'+':''}${referenceRequired.includes(file)?'reference-sync':''}.`,
  exception:null,
});
const blocking=findings.filter(f=>f.severity==='block'||(f.severity==='review'&&!f.exception));
referenceSync.decision=blocking.some(f=>f.ruleId==='DEV-BLOCK-REFERENCE-SYNC'||f.ruleId==='DEV-REVIEW-REFERENCE-SYNC')?'BLOCK':'PASS';
const implementationSync={
  contract:'shoporation.implementation-sync.v2',
  plannedEnvelope:[...(plan.plannedFilePatterns??[])],
  declaredSemanticRequired,
  referenceRequired,
  requiredChangeSet,
  actualVerifiedChangeSet:[...(diff.files??[])].sort(),
  missingRequired,
  requiredSubsetActual:missingRequired.length===0,
  actualOutsidePlanned,
  actualSubsetPlanned:actualOutsidePlanned.length===0,
  decision:(missingRequired.length||actualOutsidePlanned.length)?'BLOCK':'PASS',
};
const report={contract:'shoporation.edit-time-known-failure-guard.v2',base:diff.base,head:diff.head,findings,blockingFindings:blocking,referenceSync,implementationSync,poInstructionState,decision:blocking.length?'BLOCK':'PASS'};
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/reference-sync.json',JSON.stringify(referenceSync,null,2)+'\n');
writeFileSync('artifacts/shoperation-development-guard/edit-time-guard.json',JSON.stringify(report,null,2)+'\n');
console.log(`Edit-Time Known Failure Guard: ${report.decision}; findings=${findings.length}; blocking=${blocking.length}; referenceSync=${referenceSync.decision}; implementationSync=${implementationSync.decision}; missingRequired=${missingRequired.length}; poInstructions=${poInstructionState.decision}; stale=${referenceSync.staleConsumers?.length??0}; review=${referenceSync.reviewConsumers?.length??0}; updated=${referenceSync.updatedConsumers?.length??0}.`);
for(const finding of blocking)console.error(`${finding.ruleId} ${finding.file}:${finding.line} — ${finding.message}`);
if(report.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
