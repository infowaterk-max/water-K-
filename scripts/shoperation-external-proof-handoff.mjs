import {appendFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileGateChain,exactPlannedPaths,globToRegExp} from './lib/shoperation-development-runtime.mjs';
import {deriveTemplateLiveRuntimeClosure,deriveTemplateLiveRuntimeOrigin,deriveTemplatePreviewAnchorCandidates,templateFactoryEvidenceChecksum,validateTemplateLiveProofRecord} from './lib/shoperation-template-factory-resumable-verification.mjs';

export const EXTERNAL_PROOF_EVIDENCE_CONTRACT='shoporation.external-proof-evidence.v1';
export const TEMPLATE_FACTORY_QUALITY_CONTRACT='shoporation.template-factory-quality-evidence.v2';
const PASS=new Set(['pass','passed','success','succeeded','ok','green']);
const normalize=value=>String(value??'').trim().toLowerCase().replaceAll(' ','_');
const uniq=values=>[...new Set(values.filter(Boolean))];
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const writeOutput=(key,value)=>{if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,key+'='+String(value)+'\n');};

export function completionEvidenceGuardIds(plan){
  if(plan?.status==='closed')return[];
  const refs=[];
  for(const requirement of plan?.completionContract?.requirements??[]){
    refs.push(...(requirement?.evidence?.implementation??[]),...(requirement?.evidence?.outcome??[]));
    for(const negative of requirement?.forbiddenRegressions??[])refs.push(...(negative?.evidence??[]));
  }
  return uniq(refs);
}

// Producer path filters are independent from broad registry semantic-input globs.
// Independence is provable only with a complete runtime closure and exact trigger parity.
export function templateFactoryProducerPaths(workflowSource){
  if(typeof workflowSource!=='string'||!workflowSource.startsWith('name: Template Factory Quality Gate v2\n'))return null;
  const patterns={push:[],pull_request:[]};
  let event=null,withinOn=false;
  for(const line of workflowSource.split('\n')){
    if(line==='on:'){withinOn=true;continue;}
    if(withinOn&&/^[^\s#]/.test(line)){withinOn=false;event=null;}
    if(!withinOn)continue;
    const eventMatch=line.match(/^  (push|pull_request|workflow_dispatch):/);
    if(eventMatch){event=eventMatch[1];continue;}
    const pathMatch=line.match(/^      - '([^']+)'$/);
    if(pathMatch&&(event==='push'||event==='pull_request'))patterns[event].push(pathMatch[1]);
  }
  const push=[...new Set(patterns.push)].sort(),pr=[...new Set(patterns.pull_request)].sort();
  if(!push.length||JSON.stringify(push)!==JSON.stringify(pr))return null;
  return push;
}

export function templateFactoryIndependenceProof({registry,plannedFiles=[],explicitGuardIds=[],gateChain,liveClosure,workflowSource}={}){
  const tfId='GUARD-TEMPLATE-FACTORY';
  if(explicitGuardIds.includes(tfId))return{independent:false,reason:'explicit-proof-authority'};
  if(!plannedFiles.length)return{independent:false,reason:'missing-file-scope'};
  const guard=(registry?.guards??[]).find(item=>item.id===tfId);
  if(!guard||!guard.chain?.liveRuntime)return{independent:false,reason:'runtime-contract-unavailable'};
  const selected=gateChain?.orderedGateIds??[],byId=new Map((registry?.guards??[]).map(g=>[g.id,g]));
  if(selected.some(id=>id!==tfId&&(byId.get(id)?.verification?.dependsOn??[]).includes(tfId)))
    return{independent:false,reason:'transitive-proof-dependency'};
  const workflowFile=guard.producer;
  if(!workflowFile||!existsSync(workflowFile))return{independent:false,reason:'producer-workflow-missing'};
  const workflow=workflowSource??readFileSync(workflowFile,'utf8');
  const triggerPaths=templateFactoryProducerPaths(workflow);
  if(!triggerPaths)return{independent:false,reason:'producer-trigger-unknown'};
  const declared=[
    ...(guard.chain.liveRuntime.classifierInputs??[]),
    ...(guard.chain.liveRuntime.globalRuntimeInputs??[]),
    ...(guard.chain.liveRuntime.entrypoints??[]),
  ];
  const triggerMatchers=triggerPaths.map(globToRegExp);
  const uncovered=declared.filter(path=>!triggerPaths.includes(path)&&!triggerMatchers.some(re=>re.test(path)));
  if(uncovered.length)return{independent:false,reason:'producer-trigger-coverage-gap',uncovered};
  const atlasPath='artifacts/shoperation-atlas/codebase-atlas.json';
  const atlas=existsSync(atlasPath)?readJson(atlasPath):null;
  const closure=liveClosure??(atlas?deriveTemplateLiveRuntimeClosure({registry,atlas}):{decision:'UNKNOWN',files:[]});
  if(closure?.decision!=='PASS'||!Array.isArray(closure.files)||!closure.files.length)
    return{independent:false,reason:'runtime-closure-unproven'};
  const closureFiles=new Set(closure.files);
  const broad=new Set(['src/app/**','src/components/**']);
  const scoped=[...(guard.verification?.semanticInputs??[]).filter(p=>!broad.has(p)),
    ...(guard.verification?.configurationInputs??[]),
    ...(guard.verification?.authorityInputs??[]),...triggerPaths];
  const matchers=scoped.map(globToRegExp);
  const relevantFiles=plannedFiles.filter(file=>closureFiles.has(file)||matchers.some(re=>re.test(file)));
  return relevantFiles.length
    ?{independent:false,reason:'runtime-or-producer-input-affected',relevantFiles}
    :{independent:true,reason:'complete-runtime-and-producer-independence',runtimeFileCount:closureFiles.size,checkedFiles:plannedFiles};
}

export function requiredExternalCompletionGuards({activePlan,verificationPlan,guardRegistry,liveClosure}={}){
  if(activePlan?.status==='closed')return[];
  const explicit=completionEvidenceGuardIds(activePlan);
  const local=new Set(Object.keys(verificationPlan?.gates??{}));
  const declaredRoute=activePlan?.operationalIntelligence?.semanticExecutionRoute??{};
  const plannedFiles=[...new Set([
    ...exactPlannedPaths(activePlan?.plannedFilePatterns??[]),
    ...(declaredRoute.mustEdit??[]),
    ...(declaredRoute.mustCreate??[]),
  ])].filter(file=>file!=='quality/development/active-plan.json').sort();
  const registry=guardRegistry??readJson('quality/knowledge/guard-registry.v1.json');
  const chain=compileGateChain({guardRegistry:registry,plannedFiles,phase:'VERIFY',explicitGuardIds:explicit});
  if(chain.decision!=='PASS')return [...new Set([...explicit.filter(id=>!local.has(id)),...chain.externalGateIds])];
  const required=[...new Set([...explicit.filter(id=>!local.has(id)),...chain.externalGateIds.filter(id=>!local.has(id))])];
  if(required.includes('GUARD-TEMPLATE-FACTORY')){
    const independence=templateFactoryIndependenceProof({registry,plannedFiles,explicitGuardIds:explicit,gateChain:chain,liveClosure});
    if(independence.independent)return required.filter(id=>id!=='GUARD-TEMPLATE-FACTORY').sort();
  }
  return required.sort();
}

export function validateTemplateFactoryExternalProof({
  manifest,
  expectedHead,
  expectedBranch,
  stateVersion='shoporation-ci.v1',
  runId,
  workflowName='Template Factory Quality Gate v2',
  workflowConclusion='success',
  guardRegistry,
  runtimeOrigin,
  previewAnchorCandidates,
  runtimeClosure,
}={}){
  const issues=[];
  if(workflowName!=='Template Factory Quality Gate v2')issues.push({code:'EXTERNAL_PROOF_WORKFLOW_IDENTITY_MISMATCH',expected:'Template Factory Quality Gate v2',actual:workflowName});
  if(!PASS.has(normalize(workflowConclusion)))issues.push({code:'EXTERNAL_PROOF_WORKFLOW_NOT_SUCCESS',actual:workflowConclusion});
  if(!manifest||manifest.contract!==TEMPLATE_FACTORY_QUALITY_CONTRACT)issues.push({code:'EXTERNAL_PROOF_CONTRACT_INVALID',actual:manifest?.contract??null});
  if(manifest?.sourceCommit!==expectedHead)issues.push({code:'EXTERNAL_PROOF_HEAD_MISMATCH',expected:expectedHead,actual:manifest?.sourceCommit??null});
  if(manifest?.branch!==expectedBranch)issues.push({code:'EXTERNAL_PROOF_BRANCH_MISMATCH',expected:expectedBranch,actual:manifest?.branch??null});
  if(manifest?.complete!==true)issues.push({code:'EXTERNAL_PROOF_MANIFEST_INCOMPLETE',actual:manifest?.complete??null});
  if((manifest?.errors??[]).length)issues.push({code:'EXTERNAL_PROOF_MANIFEST_ERRORS',count:manifest.errors.length});
  const proofs=Array.isArray(manifest?.acceptanceProofs)?manifest.acceptanceProofs:[];
  if(!proofs.length)issues.push({code:'EXTERNAL_PROOF_ACCEPTANCE_PROOF_MISSING'});
  const incomplete=proofs.filter(item=>item?.browserMatrixPassed!==true||item?.browserMatrixComplete!==true);
  if(incomplete.length)issues.push({code:'EXTERNAL_PROOF_BROWSER_MATRIX_INCOMPLETE',templates:incomplete.map(item=>item?.templateKey??'unknown')});
  if(manifest?.checksum){
    const actual=templateFactoryEvidenceChecksum(manifest);
    if(actual!==manifest.checksum)issues.push({code:'EXTERNAL_PROOF_CHECKSUM_INVALID',expected:manifest.checksum,actual});
  }else issues.push({code:'EXTERNAL_PROOF_CHECKSUM_MISSING'});
  let verifiedRuntimeOrigin=null;
  if(manifest&&manifest.contract===TEMPLATE_FACTORY_QUALITY_CONTRACT){
    const registry=guardRegistry??readJson('quality/knowledge/guard-registry.v1.json');
    const atlasPath='artifacts/shoperation-atlas/codebase-atlas.json';
    const atlasSnapshot=existsSync(atlasPath)?readJson(atlasPath):undefined;
    const resolvedRuntimeClosure=runtimeClosure??deriveTemplateLiveRuntimeClosure({registry,atlas:atlasSnapshot});
    const liveValidation=validateTemplateLiveProofRecord(manifest.liveProof,{currentHead:expectedHead,currentBranch:expectedBranch,currentRunId:String(runId??''),registry,runtimeClosure:resolvedRuntimeClosure});
    for(const liveIssue of liveValidation.issues)issues.push({code:liveIssue.code,scope:'template-live-proof',...liveIssue});
    verifiedRuntimeOrigin=runtimeOrigin??deriveTemplateLiveRuntimeOrigin({registry,atlas:atlasSnapshot,baseSha:String(manifest.baseSha??'').trim(),currentHead:expectedHead});
    if(verifiedRuntimeOrigin?.decision!=='PASS')issues.push({code:'EXTERNAL_PROOF_RUNTIME_ORIGIN_UNPROVEN',issues:verifiedRuntimeOrigin?.issues??[]});
    else{
      if(manifest.liveProof?.runtimeSourceCommit!==verifiedRuntimeOrigin.runtimeSourceCommit)issues.push({code:'EXTERNAL_PROOF_RUNTIME_SOURCE_MISMATCH',expected:verifiedRuntimeOrigin.runtimeSourceCommit,actual:manifest.liveProof?.runtimeSourceCommit??null});
      if(manifest.liveProof?.runtimeOriginMode!==verifiedRuntimeOrigin.mode)issues.push({code:'EXTERNAL_PROOF_RUNTIME_MODE_MISMATCH',expected:verifiedRuntimeOrigin.mode,actual:manifest.liveProof?.runtimeOriginMode??null});
      const expectedChanged=JSON.stringify(verifiedRuntimeOrigin.changedFilesSinceOrigin??[]);
      const actualChanged=JSON.stringify(manifest.liveProof?.changedFilesSinceOrigin??[]);
      if(expectedChanged!==actualChanged)issues.push({code:'EXTERNAL_PROOF_RUNTIME_CHANGED_FILES_MISMATCH',expected:verifiedRuntimeOrigin.changedFilesSinceOrigin??[],actual:manifest.liveProof?.changedFilesSinceOrigin??[]});
      const expectedAffected=JSON.stringify(verifiedRuntimeOrigin.affectedInputs??[]);
      const actualAffected=JSON.stringify(manifest.liveProof?.affectedInputs??[]);
      if(expectedAffected!==actualAffected)issues.push({code:'EXTERNAL_PROOF_RUNTIME_AFFECTED_INPUTS_MISMATCH',expected:verifiedRuntimeOrigin.affectedInputs??[],actual:manifest.liveProof?.affectedInputs??[]});
      if(Boolean(manifest.liveProof?.runtimeClassifierChanged)!==Boolean(verifiedRuntimeOrigin.classifierChanged))issues.push({code:'EXTERNAL_PROOF_RUNTIME_CLASSIFIER_CHANGE_MISMATCH',expected:Boolean(verifiedRuntimeOrigin.classifierChanged),actual:Boolean(manifest.liveProof?.runtimeClassifierChanged)});
      if(Boolean(manifest.liveProof?.runtimeSafetyFallbackApplied)!==Boolean(verifiedRuntimeOrigin.safetyFallbackApplied))issues.push({code:'EXTERNAL_PROOF_RUNTIME_FALLBACK_MISMATCH',expected:Boolean(verifiedRuntimeOrigin.safetyFallbackApplied),actual:Boolean(manifest.liveProof?.runtimeSafetyFallbackApplied)});
      const expectedClassifierInputs=JSON.stringify(verifiedRuntimeOrigin.classifierInputs??[]);
      const actualClassifierInputs=JSON.stringify(manifest.liveProof?.runtimeClassifierInputs??[]);
      if(expectedClassifierInputs!==actualClassifierInputs)issues.push({code:'EXTERNAL_PROOF_RUNTIME_CLASSIFIER_INPUTS_MISMATCH',expected:verifiedRuntimeOrigin.classifierInputs??[],actual:manifest.liveProof?.runtimeClassifierInputs??[]});
      const expectedFallbackPatterns=JSON.stringify(verifiedRuntimeOrigin.safetyFallbackRuntimePatterns??[]);
      const actualFallbackPatterns=JSON.stringify(manifest.liveProof?.runtimeSafetyFallbackPatterns??[]);
      if(expectedFallbackPatterns!==actualFallbackPatterns)issues.push({code:'EXTERNAL_PROOF_RUNTIME_FALLBACK_PATTERNS_MISMATCH',expected:verifiedRuntimeOrigin.safetyFallbackRuntimePatterns??[],actual:manifest.liveProof?.runtimeSafetyFallbackPatterns??[]});
      const verifiedAnchors=previewAnchorCandidates??deriveTemplatePreviewAnchorCandidates({
        registry,
        runtimeSourceCommit:verifiedRuntimeOrigin.runtimeSourceCommit,
        maxCandidates:40,
      });
      if(verifiedAnchors?.decision!=='PASS'){
        issues.push({code:'EXTERNAL_PROOF_PREVIEW_ANCHOR_CANDIDATES_UNPROVEN',issues:verifiedAnchors?.issues??[]});
      }else{
        const deploymentSourceCommit=manifest.liveProof?.deploymentSourceCommit??null;
        const matchedAnchor=(verifiedAnchors.candidates??[]).find(item=>item.deploymentSourceCommit===deploymentSourceCommit);
        if(!matchedAnchor){
          issues.push({code:'EXTERNAL_PROOF_PREVIEW_ANCHOR_NOT_EQUIVALENT',runtimeSourceCommit:verifiedRuntimeOrigin.runtimeSourceCommit,deploymentSourceCommit});
        }else{
          if(manifest.liveProof?.deploymentAnchorMode!==matchedAnchor.mode)issues.push({code:'EXTERNAL_PROOF_PREVIEW_ANCHOR_MODE_MISMATCH',expected:matchedAnchor.mode,actual:manifest.liveProof?.deploymentAnchorMode??null});
          if(manifest.liveProof?.deploymentRuntimeEquivalenceProven!==true||matchedAnchor.runtimeEquivalenceProven!==true)issues.push({code:'EXTERNAL_PROOF_PREVIEW_ANCHOR_EQUIVALENCE_UNPROVEN'});
        }
      }
    }
  }
  if(!String(runId??'').trim())issues.push({code:'EXTERNAL_PROOF_RUN_ID_MISSING'});
  const ok=issues.length===0;
  return{
    ok,
    issues,
    evidence:ok?{
      id:'GUARD-TEMPLATE-FACTORY',
      status:'PASS',
      sourceCommit:expectedHead,
      originSourceCommit:manifest.liveProof?.originSourceCommit??manifest.sourceCommit,
      branch:expectedBranch,
      stateVersion,
      runId:String(runId),
      execution:'EXTERNAL',
      externalProof:{
        workflow:workflowName,
        artifactContract:manifest.contract,
        artifactChecksum:manifest.checksum,
        browserMatrixCount:proofs.reduce((sum,item)=>sum+Number(item?.browserMatrixCaseCount??0),0),
        acceptanceProofCount:proofs.length,
        liveProofMode:manifest.liveProof?.mode??null,
        liveProofOriginSourceCommit:manifest.liveProof?.originSourceCommit??null,
        liveProofOriginRunId:manifest.liveProof?.originRunId??null,
        liveProofInputContractDigest:manifest.liveProof?.inputContractDigest??null,
        runtimeSourceCommit:manifest.liveProof?.runtimeSourceCommit??null,
        runtimeOriginMode:manifest.liveProof?.runtimeOriginMode??null,
        runtimeEquivalenceProven:manifest.liveProof?.runtimeEquivalenceProven===true,
        runtimeOriginDecision:verifiedRuntimeOrigin?.decision??null,
        runtimeClassifierChanged:manifest.liveProof?.runtimeClassifierChanged===true,
        runtimeSafetyFallbackApplied:manifest.liveProof?.runtimeSafetyFallbackApplied===true,
        deploymentSourceCommit:manifest.liveProof?.deploymentSourceCommit??null,
        deploymentAnchorMode:manifest.liveProof?.deploymentAnchorMode??null,
        deploymentRuntimeEquivalenceProven:manifest.liveProof?.deploymentRuntimeEquivalenceProven===true,
        deploymentEnvironment:manifest.liveProof?.deploymentEnvironment??null,
        deploymentId:manifest.liveProof?.deploymentId??null,
      },
    }:null,
  };
}

export function mergeExternalCompletionEvidence({truthEvidence=[],externalEvidence=[],requiredIds=[],currentExactState}={}){
  const issues=[],merged=[...truthEvidence];
  const existing=new Set(merged.map(item=>item?.id).filter(Boolean));
  const requiredExternal=requiredIds.filter(id=>!existing.has(id));
  const byId=new Map();
  for(const record of externalEvidence??[]){
    if(!record?.id){issues.push({code:'EXTERNAL_EVIDENCE_ID_MISSING'});continue;}
    if(byId.has(record.id)){issues.push({code:'EXTERNAL_EVIDENCE_DUPLICATE',guardId:record.id});continue;}
    byId.set(record.id,record);
  }
  for(const guardId of requiredExternal){
    const record=byId.get(guardId);
    if(!record){issues.push({code:'EXTERNAL_REQUIRED_EVIDENCE_MISSING',guardId});continue;}
    if(!PASS.has(normalize(record.status))){issues.push({code:'EXTERNAL_EVIDENCE_NOT_PASS',guardId,status:record.status??null});continue;}
    if(record.sourceCommit!==currentExactState?.head){issues.push({code:'EXTERNAL_EVIDENCE_HEAD_MISMATCH',guardId,expected:currentExactState?.head??null,actual:record.sourceCommit??null});continue;}
    if(record.branch!==currentExactState?.branch){issues.push({code:'EXTERNAL_EVIDENCE_BRANCH_MISMATCH',guardId,expected:currentExactState?.branch??null,actual:record.branch??null});continue;}
    if(record.stateVersion!==currentExactState?.stateVersion){issues.push({code:'EXTERNAL_EVIDENCE_STATE_VERSION_MISMATCH',guardId,expected:currentExactState?.stateVersion??null,actual:record.stateVersion??null});continue;}
    if(!String(record.runId??'').trim()){issues.push({code:'EXTERNAL_EVIDENCE_RUN_ID_MISSING',guardId});continue;}
    merged.push(record);existing.add(guardId);
  }
  for(const record of externalEvidence??[])if(record?.id&&!requiredExternal.includes(record.id)&&!existing.has(record.id))issues.push({code:'EXTERNAL_EVIDENCE_UNREQUESTED',guardId:record.id});
  return{decision:issues.length?'BLOCK':'PASS',issues,truthEvidence:merged,requiredExternal};
}

function loadEnvelope(path){
  if(!path||!existsSync(path))return null;
  try{return readJson(path);}catch(error){return{contract:'invalid',evidence:[],parseError:String(error)};}
}

function requirementsCli(){
  const activePlan=readJson(process.env.SHOPERATION_ACTIVE_PLAN||'quality/development/active-plan.json');
  const verificationPath=process.env.SHOPERATION_REPLAY_PLAN||'artifacts/shoperation-development-guard/resumable-verification-plan.json';
  const verificationPlan=existsSync(verificationPath)?readJson(verificationPath):{gates:{}};
  const guardRegistry=readJson('quality/knowledge/guard-registry.v1.json');
  const required=requiredExternalCompletionGuards({activePlan,verificationPlan,guardRegistry});
  const unsupported=required.filter(id=>id!=='GUARD-TEMPLATE-FACTORY');
  const templateFactory=required.includes('GUARD-TEMPLATE-FACTORY');
  writeOutput('required',required.length?'true':'false');
  writeOutput('template_factory_required',templateFactory?'true':'false');
  writeOutput('guard_ids',required.join(','));
  console.log('External completion proof requirements: '+(required.join(',')||'none')+'.');
  if(unsupported.length){
    console.error('EXTERNAL_PROOF_HANDLER_UNSUPPORTED:'+unsupported.join(','));
    if(process.argv.includes('--check'))process.exitCode=1;
  }
}

function validateTemplateFactoryCli(){
  const manifestPath=process.env.SHOPERATION_EXTERNAL_PROOF_MANIFEST||'artifacts/external-template-factory/manifest.json';
  const output=process.env.SHOPERATION_EXTERNAL_PROOF_OUTPUT||'artifacts/shoperation-development-guard/external-proof-evidence.json';
  let manifest=null,readError=null;
  try{manifest=readJson(manifestPath);}catch(error){readError=String(error);}
  const result=validateTemplateFactoryExternalProof({
    manifest,
    expectedHead:String(process.env.SHOPERATION_EXTERNAL_PROOF_HEAD??'').trim(),
    expectedBranch:String(process.env.SHOPERATION_EXTERNAL_PROOF_BRANCH??'').trim(),
    stateVersion:String(process.env.SHOPERATION_TRUTH_STATE_VERSION??'shoporation-ci.v1').trim(),
    runId:String(process.env.SHOPERATION_EXTERNAL_PROOF_RUN_ID??'').trim(),
    workflowName:String(process.env.SHOPERATION_EXTERNAL_PROOF_WORKFLOW??'Template Factory Quality Gate v2').trim(),
    workflowConclusion:String(process.env.SHOPERATION_EXTERNAL_PROOF_CONCLUSION??'').trim(),
  });
  if(readError)result.issues.unshift({code:'EXTERNAL_PROOF_ARTIFACT_UNREADABLE',error:readError});
  result.ok=result.issues.length===0;
  if(!result.ok)result.evidence=null;
  const envelope={
    contract:EXTERNAL_PROOF_EVIDENCE_CONTRACT,
    generatedAt:new Date().toISOString(),
    decision:result.ok?'PASS':'BLOCK',
    evidence:result.evidence?[result.evidence]:[],
    issues:result.issues,
    artifactPath:manifestPath,
  };
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(envelope,null,2)+'\n');
  writeOutput('status',result.ok?'success':'failure');
  writeOutput('evidence_path',output);
  console.log('External Template Factory proof handoff: '+(result.ok?'PASS':'BLOCK')+'; issues='+result.issues.length+'.');
  for(const issue of result.issues)console.error(JSON.stringify(issue));
  if(!result.ok&&process.argv.includes('--check'))process.exitCode=1;
}

const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct){
  if(process.argv.includes('--requirements'))requirementsCli();
  else if(process.argv.includes('--validate-template-factory'))validateTemplateFactoryCli();
  else throw new Error('EXTERNAL_PROOF_HANDOFF_MODE_REQUIRED');
}
