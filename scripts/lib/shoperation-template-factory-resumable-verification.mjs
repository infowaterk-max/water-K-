import {canonicalizeVerificationEngineInput,classifySemanticUnits,digestObject} from './shoperation-verification-reuse.mjs';
import {globToRegExp} from './shoperation-development-runtime.mjs';

const uniq=values=>[...new Set(values)];

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


export function deriveTemplateFactoryLiveProofDecision({
  registry,
  changedFiles=[],
  priorManifest=null,
  currentBranch='',
  currentHead='',
  priorHeadIsAncestor=false,
  priorManifestChecksumValid=false,
  originWorkflow=null,
}={}){
  const guard=(registry?.guards??[]).find(item=>item?.id==='GUARD-TEMPLATE-FACTORY');
  const inputs=[...(guard?.chain?.liveProofInputs??[])];
  const base={
    contract:'shoporation.template-factory-live-proof-decision.v1',
    currentSourceCommit:currentHead||null,
    branch:currentBranch||null,
    liveProofInputs:inputs,
    changedFiles:[...new Set(changedFiles??[])].sort(),
  };
  const live=(reason,extra={})=>({
    ...base,
    mode:'LIVE_REQUIRED',
    reason,
    affectedLiveProofInputs:[],
    equivalenceProven:false,
    passed:false,
    ...extra,
  });
  if(!guard?.chain?.liveProofReuse)return live('reuse-contract-missing');
  if(!inputs.length)return live('live-proof-inputs-missing');
  if(!priorManifest)return live('prior-manifest-missing');
  if(priorManifest.contract!=='shoporation.template-factory-quality-evidence.v2')return live('prior-manifest-contract-invalid');
  if(priorManifest.complete!==true||(priorManifest.errors??[]).length)return live('prior-manifest-incomplete');
  if(!priorManifestChecksumValid)return live('prior-manifest-checksum-invalid');
  if(!currentBranch||priorManifest.branch!==currentBranch)return live('prior-manifest-branch-mismatch',{originSourceCommit:priorManifest.sourceCommit??null});
  if(!priorManifest.sourceCommit||!priorHeadIsAncestor)return live('prior-manifest-not-ancestor',{originSourceCommit:priorManifest.sourceCommit??null});
  if(!String(priorManifest.runId??'').trim())return live('prior-workflow-run-missing',{originSourceCommit:priorManifest.sourceCommit});
  const affected=[...new Set((changedFiles??[]).filter(file=>inputs.some(pattern=>globToRegExp(pattern).test(file))))].sort();
  if(affected.length)return live('live-proof-input-changed',{originSourceCommit:priorManifest.sourceCommit,affectedLiveProofInputs:affected});
  const workflowOk=originWorkflow
    &&originWorkflow.name==='Template Factory Quality Gate v2'
    &&String(originWorkflow.conclusion??'').toLowerCase()==='success'
    &&originWorkflow.headSha===priorManifest.sourceCommit
    &&String(originWorkflow.runId??'')===String(priorManifest.runId??'');
  if(!workflowOk)return live('origin-workflow-not-proven',{
    originSourceCommit:priorManifest.sourceCommit,
    originRunId:String(priorManifest.runId??'')||null,
    originWorkflow:originWorkflow??null,
  });
  const equivalenceDigest=digestObject({
    contract:'shoporation.template-factory-live-proof-equivalence.v1',
    originSourceCommit:priorManifest.sourceCommit,
    currentSourceCommit:currentHead,
    branch:currentBranch,
    changedFiles:base.changedFiles,
    affectedLiveProofInputs:affected,
    liveProofInputs:inputs,
    originRunId:String(priorManifest.runId),
  });
  return{
    ...base,
    mode:'REUSED',
    reason:'same-branch-ancestor-live-runtime-inputs-equivalent',
    passed:true,
    originSourceCommit:priorManifest.sourceCommit,
    originRunId:String(priorManifest.runId),
    originWorkflowName:originWorkflow.name,
    originWorkflowConclusion:'success',
    originHeadIsAncestor:true,
    priorManifestChecksumValid:true,
    affectedLiveProofInputs:affected,
    equivalenceProven:true,
    equivalenceDigest,
  };
}
