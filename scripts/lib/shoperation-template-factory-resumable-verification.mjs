import {createHash} from 'node:crypto';
import {globToRegExp} from './shoperation-development-runtime.mjs';
import {buildCodebaseAtlas} from './shoperation-codebase-atlas-runtime.mjs';
import {canonicalizeVerificationEngineInput,classifySemanticUnits,digestObject} from './shoperation-verification-reuse.mjs';

const uniq=values=>[...new Set(values)];


const canonicalJson=value=>Array.isArray(value)?'['+value.map(canonicalJson).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(value[key])).join(',')+'}':JSON.stringify(value);
export function templateFactoryEvidenceChecksum(manifest){
  const copy={...(manifest??{})};delete copy.checksum;
  return createHash('sha256').update(canonicalJson(copy)).digest('hex');
}

export function templateLiveRuntimeContract(registry){
  const guard=(registry?.guards??[]).find(item=>item?.id==='GUARD-TEMPLATE-FACTORY');
  return guard?.chain?.liveRuntime??null;
}

function ancestorLayoutCandidates(file){
  if(!String(file).startsWith('src/app/'))return[];
  const parts=String(file).split('/').slice(0,-1),out=[];
  while(parts.length>=2){
    const dir=parts.join('/');
    for(const name of ['layout.tsx','layout.ts','layout.jsx','layout.js'])out.push(dir+'/'+name);
    if(dir==='src/app')break;
    parts.pop();
  }
  return out;
}

export function deriveTemplateLiveRuntimeClosure({registry,atlas}={}){
  const contract=templateLiveRuntimeContract(registry);
  const runtimeAtlas=atlas??buildCodebaseAtlas();
  const byPath=new Map((runtimeAtlas?.nodes??[]).map(node=>[node.path,node]));
  if(!contract)return{
    contract:'shoporation.template-factory-live-runtime-closure.v1',
    decision:'BLOCK',issues:[{code:'TEMPLATE_LIVE_RUNTIME_CONTRACT_MISSING'}],
    entrypoints:[],ancestorLayouts:[],dependencyFiles:[],globalFiles:[],files:[],unresolvedImports:[],
  };
  const entrypoints=uniq(contract.entrypoints??[]).sort();
  const missingEntrypoints=entrypoints.filter(file=>!byPath.has(file));
  const start=entrypoints.filter(file=>byPath.has(file));
  const ancestorLayouts=contract.includeAncestorLayouts===true
    ?uniq(start.flatMap(ancestorLayoutCandidates).filter(file=>byPath.has(file))).sort()
    :[];
  const queue=[...new Set([...start,...ancestorLayouts])],visited=new Set(queue);
  while(queue.length){
    const current=queue.shift(),node=byPath.get(current);
    for(const target of node?.imports??[]){
      if(visited.has(target))continue;
      visited.add(target);queue.push(target);
    }
  }
  const globalMatchers=(contract.globalRuntimeInputs??[]).map(pattern=>({pattern,matcher:globToRegExp(pattern)}));
  const globalFiles=(runtimeAtlas?.nodes??[])
    .map(node=>node.path)
    .filter(file=>globalMatchers.some(item=>item.matcher.test(file)))
    .sort();
  for(const file of globalFiles)visited.add(file);
  const unresolvedImports=(runtimeAtlas?.unresolvedInternalImports??[]).filter(item=>visited.has(item.from));
  const issues=[
    ...missingEntrypoints.map(file=>({code:'TEMPLATE_LIVE_RUNTIME_ENTRYPOINT_MISSING',file})),
    ...unresolvedImports.map(item=>({code:'TEMPLATE_LIVE_RUNTIME_IMPORT_UNRESOLVED',from:item.from,specifier:item.specifier})),
  ];
  const dependencyFiles=[...visited].filter(file=>!entrypoints.includes(file)&&!ancestorLayouts.includes(file)&&!globalFiles.includes(file)).sort();
  return{
    contract:'shoporation.template-factory-live-runtime-closure.v1',
    authority:contract.dependencyAuthority??'codebase-atlas.forward-import-closure',
    decision:issues.length?'BLOCK':'PASS',
    issues,
    entrypoints,
    ancestorLayouts,
    dependencyFiles,
    globalPatterns:[...(contract.globalRuntimeInputs??[])],
    globalFiles,
    files:[...visited].sort(),
    unresolvedImports,
  };
}

export function templateLiveProofInputPatterns(registry){
  const contract=templateLiveRuntimeContract(registry);
  return uniq([...(contract?.entrypoints??[]),...(contract?.globalRuntimeInputs??[])]).sort();
}

export function templateLiveProofInputContractDigest(registry,runtimeClosure){
  const closure=runtimeClosure??deriveTemplateLiveRuntimeClosure({registry});
  return digestObject({
    contract:'shoporation.template-factory-live-proof-inputs.v2',
    runtimeContract:templateLiveRuntimeContract(registry),
    closure:{
      authority:closure.authority??null,
      entrypoints:closure.entrypoints??[],
      ancestorLayouts:closure.ancestorLayouts??[],
      dependencyFiles:closure.dependencyFiles??[],
      globalPatterns:closure.globalPatterns??[],
      globalFiles:closure.globalFiles??[],
      files:closure.files??[],
    },
  });
}

export function deriveTemplateLiveProofDecision({
  registry,
  runtimeClosure,
  priorManifest=null,
  priorManifestChecksumValid=false,
  currentHead='',
  currentBranch='',
  ancestorProven=false,
  originWorkflowConclusion='',
  changedFilesSinceOrigin=[],
}={}){
  const closure=runtimeClosure??deriveTemplateLiveRuntimeClosure({registry});
  const inputContractDigest=templateLiveProofInputContractDigest(registry,closure);
  const changedFiles=uniq(changedFilesSinceOrigin.filter(Boolean)).sort();
  const runtimeFiles=new Set(closure.files??[]);
  const affectedInputs=changedFiles.filter(file=>runtimeFiles.has(file)).sort();
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
    runtimeClosureDecision:closure.decision,
    runtimeEntrypoints:closure.entrypoints??[],
    runtimeAncestorLayouts:closure.ancestorLayouts??[],
    runtimeDependencyFiles:closure.dependencyFiles??[],
    runtimeGlobalFiles:closure.globalFiles??[],
    runtimeUnknowns:closure.issues??[],
    changedFilesSinceOrigin:changedFiles,
    affectedInputs,
    ...extra,
  });
  if(closure.decision!=='PASS')return required('template-live-runtime-closure-unproven');
  if(!priorManifest)return required('prior-live-proof-manifest-missing');
  if(priorManifest.contract!=='shoporation.template-factory-quality-evidence.v2')return required('prior-live-proof-contract-invalid');
  if(priorManifest.complete!==true||(priorManifest.errors??[]).length)return required('prior-live-proof-incomplete');
  if(!priorManifestChecksumValid)return required('prior-live-proof-checksum-invalid');
  if(!currentHead||!currentBranch)return required('current-live-proof-identity-missing');
  if(priorManifest.branch!==currentBranch)return required('prior-live-proof-branch-mismatch');
  if(!priorManifest.sourceCommit||priorManifest.sourceCommit===currentHead)return required('prior-live-proof-origin-not-ancestor');
  if(!ancestorProven)return required('prior-live-proof-ancestry-unproven');
  if(String(originWorkflowConclusion).toLowerCase()!=='success')return required('prior-live-proof-workflow-not-success');
  if(affectedInputs.length)return required('template-live-runtime-input-changed');
  return{
    contract:'shoporation.template-factory-live-proof-decision.v1',
    decision:'PASS',
    mode:'REUSE',
    reason:'template-live-runtime-inputs-equivalent',
    sourceCommit:currentHead,
    branch:currentBranch,
    originSourceCommit:priorManifest.sourceCommit,
    originRunId:String(priorManifest.runId??''),
    originWorkflowConclusion:'success',
    ancestorProven:true,
    inputEquivalenceProven:true,
    inputContractDigest,
    runtimeClosureDecision:closure.decision,
    runtimeEntrypoints:closure.entrypoints??[],
    runtimeAncestorLayouts:closure.ancestorLayouts??[],
    runtimeDependencyFiles:closure.dependencyFiles??[],
    runtimeGlobalFiles:closure.globalFiles??[],
    runtimeUnknowns:[],
    changedFilesSinceOrigin:changedFiles,
    affectedInputs:[],
  };
}

export function validateTemplateLiveProofRecord(record,{currentHead='',currentBranch='',currentRunId='',registry,runtimeClosure}={}){
  const issues=[];
  const mode=String(record?.mode??'').toUpperCase();
  const closure=runtimeClosure??deriveTemplateLiveRuntimeClosure({registry});
  const expectedDigest=templateLiveProofInputContractDigest(registry,closure);
  if(closure.decision!=='PASS')issues.push({code:'TEMPLATE_LIVE_RUNTIME_CLOSURE_UNPROVEN',issues:closure.issues});
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
    if(record?.runtimeClosureDecision!=='PASS')issues.push({code:'TEMPLATE_LIVE_PROOF_REUSE_RUNTIME_CLOSURE_UNPROVEN',actual:record?.runtimeClosureDecision??null});
    if(!Array.isArray(record?.runtimeEntrypoints)||!record.runtimeEntrypoints.length)issues.push({code:'TEMPLATE_LIVE_PROOF_RUNTIME_ENTRYPOINTS_MISSING'});
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
