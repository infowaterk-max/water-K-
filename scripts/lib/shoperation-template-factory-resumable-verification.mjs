import {canonicalizeVerificationEngineInput,classifySemanticUnits,digestObject} from './shoperation-verification-reuse.mjs';

const uniq=values=>[...new Set(values)];

export function evaluateGoldenMismatchHotspots({
  diffData,
  width,
  height,
  windowPx=96,
  maxLocalMismatchRatio=.08,
  minLocalMismatchedPixels=256,
}={}){
  const data=diffData;
  if(!data||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1){
    return{status:'invalid',exceeds:false,windowPx,maxLocalMismatchRatio,minLocalMismatchedPixels,best:null};
  }
  const size=Math.max(16,Math.min(512,Math.round(Number(windowPx)||96)));
  const shifts=[0,Math.floor(size/2)];
  const buckets=new Map();
  const add=(shift,x,y)=>{
    const bx=Math.floor((x+shift)/size),by=Math.floor((y+shift)/size),key=`${shift}:${bx}:${by}`;
    buckets.set(key,(buckets.get(key)??0)+1);
  };
  for(let y=0;y<height;y+=1){
    for(let x=0;x<width;x+=1){
      const at=(y*width+x)*4;
      if(data[at]===255&&data[at+1]===0&&data[at+2]===0&&data[at+3]===255){
        for(const shift of shifts)add(shift,x,y);
      }
    }
  }
  let best=null;
  for(const[key,count]of buckets){
    const[shiftRaw,bxRaw,byRaw]=key.split(':').map(Number),shift=shiftRaw,bx=bxRaw,by=byRaw;
    const x0=bx*size-shift,y0=by*size-shift,x1=Math.max(0,x0),y1=Math.max(0,y0),x2=Math.min(width,x0+size),y2=Math.min(height,y0+size);
    const area=Math.max(1,(x2-x1)*(y2-y1)),ratio=count/area;
    if(!best||ratio>best.mismatchRatio||(ratio===best.mismatchRatio&&count>best.mismatchedPixels))best={x:x1,y:y1,width:x2-x1,height:y2-y1,mismatchedPixels:count,totalPixels:area,mismatchRatio:ratio};
  }
  const exceeds=Boolean(best&&best.mismatchedPixels>=minLocalMismatchedPixels&&best.mismatchRatio>maxLocalMismatchRatio);
  return{status:'ok',exceeds,windowPx:size,maxLocalMismatchRatio,minLocalMismatchedPixels,best};
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
