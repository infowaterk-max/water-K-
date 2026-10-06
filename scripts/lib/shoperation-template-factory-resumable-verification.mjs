import {createHash} from 'node:crypto';
import {globToRegExp} from './shoperation-development-runtime.mjs';
import {canonicalizeVerificationEngineInput,classifySemanticUnits,digestObject} from './shoperation-verification-reuse.mjs';

const uniq=values=>[...new Set(values)];


const canonicalJson=value=>Array.isArray(value)?'['+value.map(canonicalJson).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(value[key])).join(',')+'}':JSON.stringify(value);
export function templateFactoryEvidenceChecksum(manifest){
  const copy={...(manifest??{})};delete copy.checksum;
  return createHash('sha256').update(canonicalJson(copy)).digest('hex');
}

export function templateLiveProofInputPatterns(registry){
  const guard=(registry?.guards??[]).find(item=>item?.id==='GUARD-TEMPLATE-FACTORY');
  return uniq([
    ...(guard?.verification?.semanticInputs??[]),
    ...(guard?.verification?.configurationInputs??[]),
    ...(guard?.verification?.authorityInputs??[]),
    ...(registry?.verificationReuse?.globalAuthorityInputs??[]),
    ...(registry?.verificationReuse?.globalToolchainInputs??[]),
    ...(registry?.verificationReuse?.promotion?.engineInputs??[]),
  ].filter(Boolean)).sort();
}

export function templateLiveProofInputContractDigest(registry){return digestObject({contract:'shoporation.template-factory-live-proof-inputs.v1',patterns:templateLiveProofInputPatterns(registry)});}

export function deriveTemplateLiveProofDecision({
  registry,
  priorManifest=null,
  priorManifestChecksumValid=false,
  currentHead='',
  currentBranch='',
  ancestorProven=false,
  originWorkflowConclusion='',
  changedFilesSinceOrigin=[],
}={}){
  const inputPatterns=templateLiveProofInputPatterns(registry);
  const inputContractDigest=templateLiveProofInputContractDigest(registry);
  const changedFiles=uniq(changedFilesSinceOrigin.filter(Boolean)).sort();
  const affectedInputs=changedFiles.filter(file=>inputPatterns.some(pattern=>globToRegExp(pattern).test(file))).sort();
  const required=(reason,extra={})=>({
    contract:'shoporation.template-factory-live-proof-decision.v1',
    decision:'PASS',
    mode:'REQUIRED',
    reason,
    sourceCommit:currentHead||null,
    branch:currentBranch||null,
    originSourceCommit:priorManifest?.sourceCommit??null,
    originRunId:priorManifest?.runId??null,
    originWorkflowConclusion:originWorkflowConclusion||null,
    ancestorProven:Boolean(ancestorProven),
    inputEquivalenceProven:false,
    inputContractDigest,
    changedFilesSinceOrigin:changedFiles,
    affectedInputs,
    ...extra,
  });
  if(!priorManifest)return required('prior-live-proof-manifest-missing');
  if(priorManifest.contract!=='shoporation.template-factory-quality-evidence.v2')return required('prior-live-proof-contract-invalid');
  if(priorManifest.complete!==true||(priorManifest.errors??[]).length)return required('prior-live-proof-incomplete');
  if(!priorManifestChecksumValid)return required('prior-live-proof-checksum-invalid');
  if(!currentHead||!currentBranch)return required('current-live-proof-identity-missing');
  if(priorManifest.branch!==currentBranch)return required('prior-live-proof-branch-mismatch');
  if(!priorManifest.sourceCommit||priorManifest.sourceCommit===currentHead)return required('prior-live-proof-origin-not-ancestor');
  if(!ancestorProven)return required('prior-live-proof-ancestry-unproven');
  if(String(originWorkflowConclusion).toLowerCase()!=='success')return required('prior-live-proof-workflow-not-success');
  if(affectedInputs.length)return required('template-live-proof-input-changed');
  return{
    contract:'shoporation.template-factory-live-proof-decision.v1',
    decision:'PASS',
    mode:'REUSE',
    reason:'template-live-proof-inputs-equivalent',
    sourceCommit:currentHead,
    branch:currentBranch,
    originSourceCommit:priorManifest.sourceCommit,
    originRunId:String(priorManifest.runId??''),
    originWorkflowConclusion:'success',
    ancestorProven:true,
    inputEquivalenceProven:true,
    inputContractDigest,
    changedFilesSinceOrigin:changedFiles,
    affectedInputs:[],
  };
}

export function validateTemplateLiveProofRecord(record,{currentHead='',currentBranch='',currentRunId='',registry}={}){
  const issues=[];
  const mode=String(record?.mode??'').toUpperCase();
  const expectedDigest=templateLiveProofInputContractDigest(registry);
  if(record?.contract!=='shoporation.template-factory-live-proof.v1')issues.push({code:'TEMPLATE_LIVE_PROOF_CONTRACT_INVALID'});
  if(record?.decision!=='PASS')issues.push({code:'TEMPLATE_LIVE_PROOF_DECISION_NOT_PASS'});
  if(record?.sourceCommit!==currentHead)issues.push({code:'TEMPLATE_LIVE_PROOF_HEAD_MISMATCH',expected:currentHead,actual:record?.sourceCommit??null});
  if(record?.branch!==currentBranch)issues.push({code:'TEMPLATE_LIVE_PROOF_BRANCH_MISMATCH',expected:currentBranch,actual:record?.branch??null});
  if(record?.inputContractDigest!==expectedDigest)issues.push({code:'TEMPLATE_LIVE_PROOF_INPUT_CONTRACT_STALE'});
  if(mode==='LIVE'){
    if(record?.originSourceCommit!==currentHead)issues.push({code:'TEMPLATE_LIVE_PROOF_LIVE_ORIGIN_MISMATCH'});
    if(!String(record?.originRunId??'').trim())issues.push({code:'TEMPLATE_LIVE_PROOF_LIVE_RUN_MISSING'});
    else if(currentRunId&&String(record.originRunId)!==String(currentRunId))issues.push({code:'TEMPLATE_LIVE_PROOF_LIVE_RUN_MISMATCH',expected:String(currentRunId),actual:String(record.originRunId)});
  }else if(mode==='REUSED'){
    if(!String(record?.originSourceCommit??'').trim()||record.originSourceCommit===currentHead)issues.push({code:'TEMPLATE_LIVE_PROOF_REUSE_ORIGIN_INVALID'});
    if(!String(record?.originRunId??'').trim())issues.push({code:'TEMPLATE_LIVE_PROOF_REUSE_RUN_MISSING'});
    if(record?.originWorkflowConclusion!=='success')issues.push({code:'TEMPLATE_LIVE_PROOF_REUSE_WORKFLOW_NOT_SUCCESS'});
    if(record?.ancestorProven!==true)issues.push({code:'TEMPLATE_LIVE_PROOF_REUSE_ANCESTRY_UNPROVEN'});
    if(record?.inputEquivalenceProven!==true)issues.push({code:'TEMPLATE_LIVE_PROOF_REUSE_INPUT_EQUIVALENCE_UNPROVEN'});
    if(!Array.isArray(record?.affectedInputs)||record.affectedInputs.length)issues.push({code:'TEMPLATE_LIVE_PROOF_REUSE_AFFECTED_INPUTS_PRESENT',affectedInputs:record?.affectedInputs??null});
  }else{
    issues.push({code:'TEMPLATE_LIVE_PROOF_MODE_INVALID',actual:record?.mode??null});
  }
  return{ok:issues.length===0,issues,mode};
}

export function canonicalizeTemplateFactoryInfrastructureInput(file,raw){
  return canonicalizeVerificationEngineInput(file,raw);
}

export function templateFactoryInfrastructureSemanticallyEquivalent(file,before,after){
  return canonicalizeTemplateFactoryInfrastructureInput(file,before)===canonicalizeTemplateFactoryInfrastructureInput(file,after);
}

export function deriveTemplateReplayDecision({
  registry,
  changedFiles=[],
  diffByFile={},
  pageTypes=[],
  currentPageFingerprints={},
  previousPageFingerprints={},
  priorComplete=false,
}={}){
  if(!priorComplete)return{mode:'full',pages:[...pageTypes],reason:'template-source-changed-no-reusable-proof',semanticImpact:[]};
  const semanticImpact=classifySemanticUnits({registry,changedFiles,diffByFile});
  if(!semanticImpact.length)return{mode:'full',pages:[...pageTypes],reason:'template-semantic-impact-unknown',semanticImpact};
  const wide=semanticImpact.some(unit=>
    unit.id==='TEMPLATE.LOCAL'
    ||unit.kind==='template-wide'
    ||Number(unit.impactTier??0)>=3
    ||['changed-template-all-pages-viewports','all-templates-all-pages-viewports','full-verification'].includes(String(unit.scope??''))
  );
  if(wide)return{mode:'full',pages:[...pageTypes],reason:'template-wide-semantic-impact',semanticImpact};

  const semanticPages=semanticImpact.filter(unit=>unit.kind==='page'&&unit.pageType).map(unit=>unit.pageType);
  if(!semanticPages.length)return{mode:'full',pages:[...pageTypes],reason:'template-page-impact-not-provable',semanticImpact};

  const fingerprintChanged=pageTypes.filter(pageType=>previousPageFingerprints?.[pageType]!==currentPageFingerprints?.[pageType]);
  const pages=uniq([...semanticPages,...fingerprintChanged]).filter(pageType=>pageTypes.includes(pageType));
  if(pages.length===pageTypes.length)return{mode:'full',pages:[...pageTypes],reason:'template-all-page-fingerprints-changed',semanticImpact};
  if(!pages.length)return{mode:'reuse',pages:[],reason:'template-browser-input-fingerprints-equivalent',semanticImpact};
  return{mode:'partial',pages,reason:'template-semantic-page-impact',semanticImpact};
}

export function templateBrowserCaseFingerprint({
  templateKey,
  templateVersion,
  pageType,
  viewport,
  pageFingerprint,
  browser,
  golden,
  viewportProfile,
  baselineHash,
  factoryEngineHash,
  toolchainHash,
  candidateMode,
}={}){
  return digestObject({
    contract:'shoporation.template-factory-browser-case-fingerprint.v1',
    templateKey,templateVersion,pageType,viewport,pageFingerprint,
    browser,golden,viewportProfile,baselineHash,factoryEngineHash,toolchainHash,candidateMode,
  });
}

export function reusableTemplateBrowserCase({priorCase,currentCaseFingerprint}={}){
  if(!priorCase||typeof priorCase!=='object')return{reusable:false,reason:'prior-case-missing'};
  if((priorCase.errors??[]).length)return{reusable:false,reason:'prior-case-failed'};
  if(!priorCase.caseFingerprint)return{reusable:false,reason:'prior-case-fingerprint-missing'};
  if(priorCase.caseFingerprint!==currentCaseFingerprint)return{reusable:false,reason:'case-context-fingerprint-changed'};
  return{reusable:true,reason:'case-context-fingerprint-equivalent'};
}
