import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {activeDevelopmentPlanPath,aggregateGateDecision,getChangedFiles,globToRegExp,guardPolicy,matchGuardException} from './lib/shoperation-development-runtime.mjs';
import {evaluateReferenceSynchronization} from './lib/shoperation-reference-sync-runtime.mjs';
import {buildCodebaseAtlas,buildExecutionRoute,evaluatePoInstructionStates} from './lib/shoperation-codebase-atlas-runtime.mjs';
import {RELEASE_PARENT_CLOSURE_CONTEXT_CONTRACT,buildReleaseParentClosureProofArtifactFromContext,releaseParentClosureProofArtifactByteDigest} from './lib/shoperation-release-unit-runtime.mjs';
const plan=JSON.parse(readFileSync(activeDevelopmentPlanPath(),'utf8')),diff=getChangedFiles({baseSha:plan.changeBaseSha}),exceptionList=[...(plan.exceptions??[])],git=args=>execFileSync('git',args,{encoding:'utf8'});
let patch='';if(diff.base){try{patch=git(['diff','--unified=0','--no-color',diff.base,diff.head,'--']);}catch{}}if(!patch){try{patch=git(['diff','--unified=0','--no-color','--']);}catch{}}
const findings=[];let currentFile=null,newLine=0;
const parentClosureContext=plan?.parentClosureContext??null;
const parentClosureRoute=parentClosureContext?.contract===RELEASE_PARENT_CLOSURE_CONTEXT_CONTRACT;
const declaredSemanticRequired=[...(plan.operationalIntelligence?.semanticExecutionRoute?.mustEdit??[]),...(parentClosureRoute?(plan.operationalIntelligence?.semanticExecutionRoute?.mustCreate??[]):[])];
const planMatchers=(plan.plannedFilePatterns??[]).map(globToRegExp);
const noCodeReceiptPath=String(process.env.SHOPERATION_EDIT_TIME_ALREADY_APPLIED_RECEIPT??'').trim();
let noCodeEvidence={decision:'NOT_APPLICABLE',path:noCodeReceiptPath||null,files:[],issues:[]};
if(noCodeReceiptPath){
  if(!existsSync(noCodeReceiptPath))noCodeEvidence={...noCodeEvidence,decision:'BLOCK',issues:[{code:'EDIT_TIME_ALREADY_APPLIED_RECEIPT_MISSING'}]};
  else{
    try{
      const receipt=JSON.parse(readFileSync(noCodeReceiptPath,'utf8')),context=plan.releaseUnitContext??{};
      const expectedFiles=[...(plan.plannedFilePatterns??[])].sort();
      const actualFiles=[...(receipt.alreadyApplied??[])].map(item=>item.file).filter(Boolean).sort();
      const issues=[];
      if(context.contract!=='shoporation.release-unit-child-transaction.v1')issues.push({code:'EDIT_TIME_ALREADY_APPLIED_CHILD_CONTEXT_REQUIRED'});
      if(receipt.contract!=='shoporation.release-unit-materialization.v1'||receipt.status!=='ALREADY_APPLIED')issues.push({code:'EDIT_TIME_ALREADY_APPLIED_RECEIPT_INVALID'});
      if((receipt.applied??[]).length)issues.push({code:'EDIT_TIME_ALREADY_APPLIED_PARTIAL'});
      if(receipt.releaseUnitId!==context.releaseUnitId)issues.push({code:'EDIT_TIME_ALREADY_APPLIED_UNIT_MISMATCH'});
      if(receipt.manifestDigest!==context.manifestDigest||receipt.bindingDigest!==context.bindingDigest)issues.push({code:'EDIT_TIME_ALREADY_APPLIED_BINDING_MISMATCH'});
      if(!diff.head||receipt.targetBaseSha!==diff.head||receipt.materializedHeadSha!==diff.head)issues.push({code:'EDIT_TIME_ALREADY_APPLIED_HEAD_MISMATCH'});
      if(JSON.stringify(expectedFiles)!==JSON.stringify(actualFiles))issues.push({code:'EDIT_TIME_ALREADY_APPLIED_COVERAGE_MISMATCH',expectedFiles,actualFiles});
      noCodeEvidence={decision:issues.length?'BLOCK':'PASS',path:noCodeReceiptPath,files:actualFiles,issues,receipt:{releaseUnitId:receipt.releaseUnitId,manifestDigest:receipt.manifestDigest,bindingDigest:receipt.bindingDigest,targetBaseSha:receipt.targetBaseSha,materializedHeadSha:receipt.materializedHeadSha}};
    }catch(error){noCodeEvidence={...noCodeEvidence,decision:'BLOCK',issues:[{code:'EDIT_TIME_ALREADY_APPLIED_RECEIPT_UNREADABLE',error:String(error)}]};}
  }
}
const parentClosureProofPath=String(process.env.SHOPERATION_PARENT_CLOSURE_PROOF_ARTIFACT??'').trim();
let parentClosureProofEvidence={decision:'NOT_APPLICABLE',path:parentClosureProofPath||null,files:[],issues:[],digest:null};
if(parentClosureRoute){
  const issues=[];
  let expected=null,actualDigest=null;
  try{expected=buildReleaseParentClosureProofArtifactFromContext(parentClosureContext);}catch(error){issues.push({code:'EDIT_TIME_PARENT_CLOSURE_CONTEXT_INVALID',error:String(error)});}
  if(expected){
    const persistedClosureMetadata=plan.status==='closed';
    // Executor proof runs at final main with an explicit path. A CLOSED closure
    // PR runs on the metadata commit and must verify its committed artifact.
    const verifiedProofPath=parentClosureProofPath||(persistedClosureMetadata?expected.path:'');
    const route=plan.operationalIntelligence?.semanticExecutionRoute??{};
    const mustCreate=[...(route.mustCreate??[])].sort(),proof=[...(route.proof??[])].sort();
    if(JSON.stringify(mustCreate)!==JSON.stringify([expected.path]))issues.push({code:'EDIT_TIME_PARENT_CLOSURE_ROUTE_CREATE_MISMATCH',expected:expected.path,actual:mustCreate});
    if(!proof.includes(expected.path))issues.push({code:'EDIT_TIME_PARENT_CLOSURE_ROUTE_PROOF_MISSING',expected:expected.path});
    if(!(plan.plannedFilePatterns??[]).includes(expected.path))issues.push({code:'EDIT_TIME_PARENT_CLOSURE_PLAN_ARTIFACT_MISSING',expected:expected.path});
    if(verifiedProofPath!==expected.path)issues.push({code:'EDIT_TIME_PARENT_CLOSURE_ARTIFACT_PATH_MISMATCH',expected:expected.path,actual:parentClosureProofPath||null});
    else if(!existsSync(verifiedProofPath))issues.push({code:'EDIT_TIME_PARENT_CLOSURE_ARTIFACT_MISSING'});
    else{
      try{
        const content=readFileSync(verifiedProofPath,'utf8'),artifact=JSON.parse(content);
        actualDigest=releaseParentClosureProofArtifactByteDigest(content);
        if(content!==expected.content)issues.push({code:'EDIT_TIME_PARENT_CLOSURE_ARTIFACT_BYTES_MISMATCH'});
        if(actualDigest!==expected.digest)issues.push({code:'EDIT_TIME_PARENT_CLOSURE_ARTIFACT_DIGEST_MISMATCH',expected:expected.digest,actual:actualDigest});
        if(JSON.stringify(artifact)!==JSON.stringify(expected.artifact))issues.push({code:'EDIT_TIME_PARENT_CLOSURE_ARTIFACT_CONTEXT_MISMATCH'});
        if(persistedClosureMetadata){
          // The proof committed at the exact CI HEAD, not a transient worktree
          // file, must be byte-identical to the independently derived evidence.
          try{
            const committedContent=git(['show',`${diff.head}:${expected.path}`]);
            if(committedContent!==expected.content||committedContent!==content)issues.push({code:'EDIT_TIME_PARENT_CLOSURE_COMMITTED_ARTIFACT_BYTES_MISMATCH'});
          }catch(error){issues.push({code:'EDIT_TIME_PARENT_CLOSURE_COMMITTED_ARTIFACT_MISSING',error:String(error)});}
        }
      }catch(error){issues.push({code:'EDIT_TIME_PARENT_CLOSURE_ARTIFACT_UNREADABLE',error:String(error)});}
    }
    const finalMainSha=String(parentClosureContext?.finalMainSha??'').trim();
    if(persistedClosureMetadata){
      // The implementation final main is the closure commit's sole parent.
      // Its own head must remain the separate exact metadata CI identity.
      if(!finalMainSha||plan.changeBaseSha!==finalMainSha||diff.base!==finalMainSha)issues.push({code:'EDIT_TIME_PARENT_CLOSURE_FINAL_MAIN_MISMATCH',expected:finalMainSha||null,actual:{planBase:plan.changeBaseSha??null,verifiedBase:diff.base??null}});
      if(!diff.head||diff.head===finalMainSha)issues.push({code:'EDIT_TIME_PARENT_CLOSURE_METADATA_HEAD_INVALID',expectedParent:finalMainSha||null,actualHead:diff.head??null});
      else{
        try{
          const parents=git(['rev-list','--parents','-n','1',diff.head]).trim().split(/\s+/);
          if(parents.length!==2||parents[0]!==diff.head||parents[1]!==finalMainSha)issues.push({code:'EDIT_TIME_PARENT_CLOSURE_METADATA_PARENT_MISMATCH',expectedParent:finalMainSha,actualParents:parents.slice(1)});
        }catch(error){issues.push({code:'EDIT_TIME_PARENT_CLOSURE_METADATA_PARENT_UNRESOLVED',error:String(error)});}
      }
    }else if(diff.head&&finalMainSha!==diff.head)issues.push({code:'EDIT_TIME_PARENT_CLOSURE_FINAL_MAIN_MISMATCH',expected:finalMainSha||null,actual:diff.head});
  }
  parentClosureProofEvidence={decision:issues.length?'BLOCK':'PASS',path:(expected?.path??parentClosureProofPath)||null,files:issues.length||!expected?[]:[expected.path],issues,digest:actualDigest};
}
const effectiveActualFiles=[...new Set([...(diff.materialFiles??[]),...(noCodeEvidence.decision==='PASS'?noCodeEvidence.files:[]),...(parentClosureProofEvidence.decision==='PASS'?parentClosureProofEvidence.files:[])])];
const actualOutsidePlanned=effectiveActualFiles.filter(file=>!planMatchers.some(matcher=>matcher.test(file)));
const actualChanged=new Set(effectiveActualFiles);
if(diff.baseResolution==='UNRESOLVED'||!diff.base)findings.push({ruleId:'DEV-BLOCK-TRANSACTION-BASE-UNRESOLVED',severity:'block',title:'Development Transaction base is unresolved',file:'quality/development/active-plan.json',line:0,code:String(diff.requestedBase??plan.changeBaseSha??''),failureIds:['SQ-KF-022'],message:'Development Transaction: declared changeBaseSha cannot be resolved; silent fallback is forbidden.',exception:null});
if(diff.headResolution==='UNRESOLVED_EXPLICIT'||!diff.head)findings.push({ruleId:'DEV-BLOCK-TRANSACTION-HEAD-UNRESOLVED',severity:'block',title:'Development Transaction head is unresolved',file:'quality/development/active-plan.json',line:0,code:String(diff.requestedHead??''),failureIds:['SQ-KF-022'],message:'Development Transaction: explicit head identity cannot be resolved; fallback to another head is forbidden.',exception:null});

for(const line of patch.split(/\r?\n/)){if(line.startsWith('+++ b/')){currentFile=line.slice(6);continue;}const hunk=line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);if(hunk){newLine=Number(hunk[1]);continue;}if(!currentFile)continue;if(line.startsWith('+')&&!line.startsWith('+++')){const added=line.slice(1);for(const rule of guardPolicy.editRules){if(!rule.filePatterns.map(globToRegExp).some(m=>m.test(currentFile)))continue;if(new RegExp(rule.pattern).test(added))findings.push({ruleId:rule.id,severity:rule.severity,title:rule.title,file:currentFile,line:newLine,code:added.trim().slice(0,300),failureIds:rule.failureIds,message:rule.message,exception:null});}newLine+=1;}else if(!line.startsWith('-'))newLine+=1;}
const referenceSync=evaluateReferenceSynchronization({base:diff.base,head:diff.head});
const atlas=buildCodebaseAtlas();
const currentExecutionRoute=buildExecutionRoute(atlas,plan.plannedFilePatterns??[],{tombstones:diff.materialDeletedFiles??[]});
const instructionRequired=[...(currentExecutionRoute.INSTRUCTION_REQUIRED??[])];
const instructionEvaluationFiles=[...new Set([...(diff.materialFiles??[]),...instructionRequired])];
const poInstructionState=evaluatePoInstructionStates(atlas,instructionEvaluationFiles);
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
for(const issue of noCodeEvidence.issues??[])findings.push({ruleId:'DEV-BLOCK-ALREADY-APPLIED-EVIDENCE',severity:'block',title:'ALREADY_APPLIED implementation evidence is invalid',file:noCodeReceiptPath||'quality/development/active-plan.json',line:0,code:issue.code,failureIds:['SQ-KF-022'],message:`Implementation Sync no-code evidence: ${issue.code}.`,exception:null});
for(const issue of parentClosureProofEvidence.issues??[])findings.push({ruleId:'DEV-BLOCK-PARENT-CLOSURE-PROOF-ARTIFACT',severity:'block',title:'Parent closure proof artifact is invalid',file:parentClosureProofPath||'quality/development/active-plan.json',line:0,code:issue.code,failureIds:['SQ-KF-022'],message:`Implementation Sync parent closure proof: ${issue.code}.`,exception:null});
for(const item of referenceSync.reviewConsumers??[])findings.push({ruleId:'DEV-REVIEW-REFERENCE-SYNC',severity:'review',title:'Changed contract still has an ambiguous consumer',file:item.file,line:item.line,code:item.text?.trim().slice(0,300)??'',failureIds:['SQ-KF-022'],message:`Reference Sync review: ${item.reference.kind} "${item.reference.value}" changed in ${item.reference.originFile}; confirm this remaining consumer is intentional.`,exception:null});
const referenceRequired=[...new Set((referenceSync.staleConsumers??[]).map(item=>item.file).filter(Boolean))];
const requiredChangeSet=[...new Set([...declaredSemanticRequired,...instructionRequired,...referenceRequired])].sort();
const missingRequired=requiredChangeSet.filter(file=>!actualChanged.has(file));
for(const file of actualOutsidePlanned)findings.push({ruleId:'DEV-BLOCK-IMPLEMENTATION-SYNC-OUTSIDE-PLAN',severity:'block',title:'Actual implementation change is outside the declared plan envelope',file,line:0,code:'',failureIds:['SQ-KF-022'],message:`Implementation Sync: actual material change "${file}" is outside plannedFilePatterns.`,exception:null});
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
for(const finding of findings){const matched=matchGuardException(finding,exceptionList);finding.findingFingerprint=matched.findingFingerprint;finding.exception=matched.exception;}
const blocking=findings.filter(f=>f.severity==='block'||(f.severity==='review'&&!f.exception));
const referenceFindingDecision=blocking.some(f=>f.ruleId==='DEV-BLOCK-REFERENCE-SYNC'||f.ruleId==='DEV-REVIEW-REFERENCE-SYNC')?'BLOCK':'PASS';
referenceSync.decision=aggregateGateDecision({childDecisions:[referenceSync.decision,referenceFindingDecision]});
const implementationSync={
  contract:'shoporation.implementation-sync.v2',
  parentClosureProofEvidence,
  plannedEnvelope:[...(plan.plannedFilePatterns??[])],
  declaredSemanticRequired,
  instructionRequired,
  referenceRequired,
  requiredChangeSet,
  actualVerifiedChangeSet:[...effectiveActualFiles].sort(),
  noCodeEvidence,
  deletedVerifiedChangeSet:[...(diff.materialDeletedFiles??[])].sort(),
  missingRequired,
  requiredSubsetActual:missingRequired.length===0,
  actualOutsidePlanned,
  actualSubsetPlanned:actualOutsidePlanned.length===0,
  decision:(missingRequired.length||actualOutsidePlanned.length)?'BLOCK':'PASS',
};
const childDecisions={referenceSync:referenceSync.decision,implementationSync:implementationSync.decision,poInstructionState:poInstructionState.decision};
const reportDecision=aggregateGateDecision({localBlocking:blocking.length>0,childDecisions:Object.values(childDecisions)});
const report={contract:'shoporation.edit-time-known-failure-guard.v2',noCodeEvidence,parentClosureProofEvidence,base:diff.base,head:diff.head,baseResolution:diff.baseResolution,headResolution:diff.headResolution,requestedHead:diff.requestedHead??null,materialFiles:[...(diff.materialFiles??[])],metadataFiles:[...(diff.metadataFiles??[])],deletedFiles:[...(diff.materialDeletedFiles??[])],transactionChanges:[...(diff.changes??[])],findings,blockingFindings:blocking,referenceSync,implementationSync,poInstructionState,childDecisions,decision:reportDecision};
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/reference-sync.json',JSON.stringify(referenceSync,null,2)+'\n');
writeFileSync('artifacts/shoperation-development-guard/edit-time-guard.json',JSON.stringify(report,null,2)+'\n');
console.log(`Edit-Time Known Failure Guard: ${report.decision}; findings=${findings.length}; blocking=${blocking.length}; referenceSync=${referenceSync.decision}; implementationSync=${implementationSync.decision}; missingRequired=${missingRequired.length}; poInstructions=${poInstructionState.decision}; stale=${referenceSync.staleConsumers?.length??0}; review=${referenceSync.reviewConsumers?.length??0}; updated=${referenceSync.updatedConsumers?.length??0}.`);
for(const finding of blocking)console.error(`${finding.ruleId} ${finding.file}:${finding.line} — ${finding.message}`);
if(report.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
