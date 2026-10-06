import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
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
    classifierInputs:[...(contract.classifierInputs??[])],
    safetyFallbackRuntimePatterns:[...(contract.safetyFallbackRuntimePatterns??[])],
    files:[...visited].sort(),
    unresolvedImports,
  };
}


export function selectTemplateLiveRuntimeOrigin({
  baseSha='',
  currentHead='',
  runtimeFiles=[],
  classifierInputs=[],
  safetyFallbackRuntimePatterns=[],
  commitHistory=[],
}={}){
  const files=new Set(runtimeFiles??[]);
  const issues=[];
  if(!baseSha)issues.push({code:'TEMPLATE_LIVE_RUNTIME_BASE_SHA_MISSING'});
  if(!currentHead)issues.push({code:'TEMPLATE_LIVE_RUNTIME_HEAD_SHA_MISSING'});
  if(!files.size)issues.push({code:'TEMPLATE_LIVE_RUNTIME_FILE_CLOSURE_EMPTY'});
  if(issues.length)return{
    contract:'shoporation.template-factory-live-runtime-origin.v1',
    decision:'BLOCK',issues,runtimeSourceCommit:null,mode:'UNKNOWN',
    changedFilesSinceOrigin:[],affectedInputs:[],classifierChanged:false,safetyFallbackApplied:false,
  };
  const history=(commitHistory??[]).filter(item=>item?.sha);
  const classifierMatchers=(classifierInputs??[]).map(pattern=>globToRegExp(pattern));
  const fallbackMatchers=(safetyFallbackRuntimePatterns??[]).map(pattern=>globToRegExp(pattern));
  const classifierChanged=history.some(item=>(item.files??[]).some(file=>classifierMatchers.some(m=>m.test(file))));
  const isRuntimeFile=file=>files.has(file)||(classifierChanged&&fallbackMatchers.some(m=>m.test(file)));
  const latestIndex=history.findIndex(item=>(item.files??[]).some(isRuntimeFile));
  const latest=latestIndex>=0?history[latestIndex]:null;
  const runtimeSourceCommit=latest?.sha??baseSha;
  const commitsAfterOrigin=latestIndex>=0?history.slice(0,latestIndex):history;
  const changedFilesSinceOrigin=uniq(commitsAfterOrigin.flatMap(item=>item.files??[])).sort();
  const affectedInputs=changedFilesSinceOrigin.filter(isRuntimeFile).sort();
  if(affectedInputs.length)issues.push({code:'TEMPLATE_LIVE_RUNTIME_ORIGIN_NOT_LATEST',runtimeSourceCommit,affectedInputs});
  return{
    contract:'shoporation.template-factory-live-runtime-origin.v1',
    decision:issues.length?'BLOCK':'PASS',
    issues,
    runtimeSourceCommit,
    mode:runtimeSourceCommit===currentHead?'CURRENT_HEAD':runtimeSourceCommit===baseSha?'BASE_RUNTIME':'ANCESTOR_RUNTIME',
    changedFilesSinceOrigin,
    affectedInputs,
    classifierChanged,
    safetyFallbackApplied:classifierChanged,
    classifierInputs:[...(classifierInputs??[])],
    safetyFallbackRuntimePatterns:[...(safetyFallbackRuntimePatterns??[])],
    runtimeEquivalenceProven:issues.length===0,
    ancestorProven:runtimeSourceCommit!==currentHead,
    reason:runtimeSourceCommit===currentHead
      ?(classifierChanged?'runtime-changed-at-current-head-with-classifier-fallback':'runtime-changed-at-current-head')
      :runtimeSourceCommit===baseSha
        ?(classifierChanged?'runtime-equivalent-to-base-with-classifier-fallback':'runtime-equivalent-to-base')
        :(classifierChanged?'runtime-equivalent-to-latest-runtime-ancestor-with-classifier-fallback':'runtime-equivalent-to-latest-runtime-ancestor'),
  };
}

function gitTemplateLiveRuntimeHistory({baseSha,currentHead}={}){
  if(!baseSha||!currentHead||baseSha===currentHead)return[];
  const range=baseSha+'..'+currentHead;
  let raw='';
  try{
    raw=execFileSync('git',['log','--format=__COMMIT__%H','--name-only','--no-renames',range],{encoding:'utf8'});
  }catch{
    return[];
  }
  const out=[];let current=null;
  for(const line of raw.split(/\r?\n/)){
    if(line.startsWith('__COMMIT__')){
      if(current)out.push(current);
      current={sha:line.slice('__COMMIT__'.length).trim(),files:[]};
      continue;
    }
    if(current&&line.trim())current.files.push(line.trim());
  }
  if(current)out.push(current);
  return out.map(item=>({...item,files:uniq(item.files).sort()}));
}

export function deriveTemplateLiveRuntimeOrigin({registry,atlas,baseSha='',currentHead=''}={}){
  const closure=deriveTemplateLiveRuntimeClosure({registry,atlas});
  if(closure.decision!=='PASS')return{
    contract:'shoporation.template-factory-live-runtime-origin.v1',
    decision:'BLOCK',
    issues:[{code:'TEMPLATE_LIVE_RUNTIME_CLOSURE_UNPROVEN',details:closure.issues}],
    runtimeSourceCommit:null,mode:'UNKNOWN',changedFilesSinceOrigin:[],affectedInputs:[],runtimeClosure:closure,
  };
  const commitHistory=gitTemplateLiveRuntimeHistory({baseSha,currentHead});
  const selected=selectTemplateLiveRuntimeOrigin({
    baseSha,currentHead,
    runtimeFiles:closure.files,
    classifierInputs:closure.classifierInputs,
    safetyFallbackRuntimePatterns:closure.safetyFallbackRuntimePatterns,
    commitHistory,
  });
  return{...selected,runtimeClosure:closure,commitHistory};
}

export function templatePreviewAnchorEquivalence({
  registry,
  runtimeSourceCommit='',
  candidateSourceCommit='',
  ancestorProven=false,
  changedFiles=[],
}={}){
  const contract=templateLiveRuntimeContract(registry);
  const patterns=[...(contract?.safetyFallbackRuntimePatterns??[])];
  const issues=[];
  if(!runtimeSourceCommit)issues.push({code:'TEMPLATE_PREVIEW_RUNTIME_SOURCE_MISSING'});
  if(!candidateSourceCommit)issues.push({code:'TEMPLATE_PREVIEW_DEPLOYMENT_SOURCE_MISSING'});
  if(!patterns.length)issues.push({code:'TEMPLATE_PREVIEW_EQUIVALENCE_SCOPE_MISSING'});
  if(candidateSourceCommit!==runtimeSourceCommit&&ancestorProven!==true)issues.push({code:'TEMPLATE_PREVIEW_ANCHOR_ANCESTRY_UNPROVEN'});
  const matchers=patterns.map(pattern=>globToRegExp(pattern));
  const affectedRuntimeFiles=uniq((changedFiles??[]).filter(Boolean).filter(file=>matchers.some(m=>m.test(file)))).sort();
  if(affectedRuntimeFiles.length)issues.push({code:'TEMPLATE_PREVIEW_ANCHOR_RUNTIME_DRIFT',affectedRuntimeFiles});
  return{
    contract:'shoporation.template-factory-preview-anchor-equivalence.v1',
    decision:issues.length?'BLOCK':'PASS',
    issues,
    runtimeSourceCommit:runtimeSourceCommit||null,
    deploymentSourceCommit:candidateSourceCommit||null,
    mode:candidateSourceCommit===runtimeSourceCommit?'EXACT_RUNTIME':'ANCESTOR_EQUIVALENT',
    ancestorProven:candidateSourceCommit===runtimeSourceCommit?true:Boolean(ancestorProven),
    equivalencePatterns:patterns,
    changedFiles:uniq(changedFiles??[]).sort(),
    affectedRuntimeFiles,
    runtimeEquivalenceProven:issues.length===0,
  };
}

export function deriveTemplatePreviewAnchorCandidates({
  registry,
  runtimeSourceCommit='',
  maxCandidates=40,
}={}){
  const issues=[];
  if(!runtimeSourceCommit)return{
    contract:'shoporation.template-factory-preview-anchor-candidates.v1',
    decision:'BLOCK',
    issues:[{code:'TEMPLATE_PREVIEW_RUNTIME_SOURCE_MISSING'}],
    runtimeSourceCommit:null,
    candidates:[],
    rejected:[],
  };
  let history=[];
  try{
    const limit=Math.max(1,Math.floor(Number(maxCandidates)||40));
    const queue=[runtimeSourceCommit],seen=new Set();
    while(queue.length&&history.length<limit){
      const commit=queue.shift();
      if(!commit||seen.has(commit))continue;
      seen.add(commit);history.push(commit);
      const parents=execFileSync('git',['show','-s','--format=%P',commit],{encoding:'utf8'})
        .trim().split(/\s+/).map(value=>value.trim()).filter(Boolean);
      for(const parent of parents)if(!seen.has(parent)&&!queue.includes(parent))queue.push(parent);
    }
  }catch(error){
    return{
      contract:'shoporation.template-factory-preview-anchor-candidates.v1',
      decision:'BLOCK',
      issues:[{code:'TEMPLATE_PREVIEW_ANCESTRY_ENUMERATION_FAILED',error:String(error)}],
      runtimeSourceCommit,
      candidates:[],
      rejected:[],
    };
  }
  const candidates=[],rejected=[];
  for(const candidateSourceCommit of history){
    let ancestorProven=candidateSourceCommit===runtimeSourceCommit;
    if(!ancestorProven){
      try{
        execFileSync('git',['merge-base','--is-ancestor',candidateSourceCommit,runtimeSourceCommit],{stdio:'ignore'});
        ancestorProven=true;
      }catch{}
    }
    let changedFiles=[];
    if(candidateSourceCommit!==runtimeSourceCommit){
      try{
        const raw=execFileSync('git',['diff','--name-only','--diff-filter=ACMRD',candidateSourceCommit,runtimeSourceCommit,'--'],{encoding:'utf8'}).trim();
        changedFiles=raw?raw.split(/\r?\n/).filter(Boolean):[];
      }catch(error){
        rejected.push({candidateSourceCommit,reason:'diff-unavailable',error:String(error)});
        continue;
      }
    }
    const equivalence=templatePreviewAnchorEquivalence({
      registry,runtimeSourceCommit,candidateSourceCommit,ancestorProven,changedFiles,
    });
    if(equivalence.decision==='PASS')candidates.push(equivalence);
    else rejected.push({candidateSourceCommit,issues:equivalence.issues,affectedRuntimeFiles:equivalence.affectedRuntimeFiles});
  }
  if(!candidates.length)issues.push({code:'TEMPLATE_PREVIEW_EQUIVALENT_ANCESTOR_MISSING'});
  return{
    contract:'shoporation.template-factory-preview-anchor-candidates.v1',
    decision:issues.length?'BLOCK':'PASS',
    issues,
    runtimeSourceCommit,
    ancestryEnumeration:'breadth-first-parent-distance',
    candidateBudget:Math.max(1,Math.floor(Number(maxCandidates)||40)),
    candidates,
    rejected:rejected.slice(0,40),
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
      classifierInputs:closure.classifierInputs??[],
      safetyFallbackRuntimePatterns:closure.safetyFallbackRuntimePatterns??[],
      files:closure.files??[],
    },
  });
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
    if(!String(record?.runtimeSourceCommit??'').trim())issues.push({code:'TEMPLATE_LIVE_PROOF_RUNTIME_SOURCE_MISSING'});
    if(!String(record?.runtimeOriginMode??'').trim())issues.push({code:'TEMPLATE_LIVE_PROOF_RUNTIME_MODE_MISSING'});
    if(!String(record?.deploymentSourceCommit??'').trim())issues.push({code:'TEMPLATE_LIVE_PROOF_DEPLOYMENT_SOURCE_MISSING'});
    if(!String(record?.deploymentAnchorMode??'').trim())issues.push({code:'TEMPLATE_LIVE_PROOF_DEPLOYMENT_ANCHOR_MODE_MISSING'});
    if(record?.deploymentRuntimeEquivalenceProven!==true)issues.push({code:'TEMPLATE_LIVE_PROOF_DEPLOYMENT_EQUIVALENCE_UNPROVEN'});
    if(String(record?.deploymentEnvironment??'').trim().toLowerCase()!=='preview')issues.push({code:'TEMPLATE_LIVE_PROOF_DEPLOYMENT_NOT_PREVIEW',actual:record?.deploymentEnvironment??null});
    if(!String(record?.deploymentId??'').trim())issues.push({code:'TEMPLATE_LIVE_PROOF_DEPLOYMENT_ID_MISSING'});
    if(record?.deploymentSourceCommit&&record?.runtimeSourceCommit){
      const expectedAnchorMode=record.deploymentSourceCommit===record.runtimeSourceCommit?'EXACT_RUNTIME':'ANCESTOR_EQUIVALENT';
      if(record.deploymentAnchorMode!==expectedAnchorMode)issues.push({code:'TEMPLATE_LIVE_PROOF_DEPLOYMENT_ANCHOR_MODE_MISMATCH',expected:expectedAnchorMode,actual:record.deploymentAnchorMode??null});
    }
    if(record?.runtimeSourceCommit&&record.runtimeSourceCommit!==currentHead&&record?.runtimeEquivalenceProven!==true)issues.push({code:'TEMPLATE_LIVE_PROOF_RUNTIME_EQUIVALENCE_UNPROVEN'});
    if(Array.isArray(record?.affectedInputs)&&record.affectedInputs.length)issues.push({code:'TEMPLATE_LIVE_PROOF_RUNTIME_AFFECTED_INPUTS_PRESENT',affectedInputs:record.affectedInputs});
  }else if(mode==='REUSED'){
    issues.push({code:'TEMPLATE_LIVE_PROOF_RESULT_REUSE_NOT_AUTHORIZED'});
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
