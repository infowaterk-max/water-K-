import {createHash} from 'node:crypto';
import {appendFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

export const EXTERNAL_PROOF_EVIDENCE_CONTRACT='shoporation.external-proof-evidence.v1';
export const TEMPLATE_FACTORY_QUALITY_CONTRACT='shoporation.template-factory-quality-evidence.v2';
const PASS=new Set(['pass','passed','success','succeeded','ok','green']);
const normalize=value=>String(value??'').trim().toLowerCase().replaceAll(' ','_');
const uniq=values=>[...new Set(values.filter(Boolean))];
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const canonicalJson=value=>Array.isArray(value)?'['+value.map(canonicalJson).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(value[key])).join(',')+'}':JSON.stringify(value);
const sha256=value=>createHash('sha256').update(String(value)).digest('hex');
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

export function requiredExternalCompletionGuards({activePlan,verificationPlan}={}){
  const required=completionEvidenceGuardIds(activePlan);
  const local=new Set(Object.keys(verificationPlan?.gates??{}));
  return required.filter(id=>!local.has(id));
}

export function validateTemplateFactoryExternalProof({
  manifest,
  expectedHead,
  expectedBranch,
  stateVersion='shoporation-ci.v1',
  runId,
  workflowName='Template Factory Quality Gate v2',
  workflowConclusion='success',
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
    const copy={...manifest};delete copy.checksum;
    const actual=sha256(canonicalJson(copy));
    if(actual!==manifest.checksum)issues.push({code:'EXTERNAL_PROOF_CHECKSUM_INVALID',expected:manifest.checksum,actual});
  }else issues.push({code:'EXTERNAL_PROOF_CHECKSUM_MISSING'});
  if(!String(runId??'').trim())issues.push({code:'EXTERNAL_PROOF_RUN_ID_MISSING'});
  const ok=issues.length===0;
  return{
    ok,
    issues,
    evidence:ok?{
      id:'GUARD-TEMPLATE-FACTORY',
      status:'PASS',
      sourceCommit:expectedHead,
      originSourceCommit:manifest.sourceCommit,
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
  const required=requiredExternalCompletionGuards({activePlan,verificationPlan});
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
