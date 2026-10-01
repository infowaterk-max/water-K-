import {classifySemanticUnits,digestObject} from './shoperation-verification-reuse.mjs';

const uniq=values=>[...new Set(values)];

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
