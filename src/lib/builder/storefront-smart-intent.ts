import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {
  assertSafeStorefrontGlobalStylesDocument,
  getStorefrontGlobalStyleState,
  setStorefrontGlobalStyleState,
  STOREFRONT_GLOBAL_SPACING_SCALES,
  type StorefrontGlobalSpacingScale,
} from '@/lib/builder/storefront-global-styles';
import {
  setStorefrontNodeTypography,
} from '@/lib/builder/storefront-fidelity-builder-operations';
import {
  inspectStorefrontGridPlacement,
  setStorefrontResponsiveGridPlacement,
  type StorefrontGridPlacement,
} from '@/lib/builder/storefront-fidelity-layout';
import {
  sanitizeStorefrontTypographyValue,
  type StorefrontTypographyValue,
} from '@/lib/builder/storefront-fidelity-typography';
import {
  inspectStorefrontResponsiveContainerLayout,
  inspectStorefrontResponsiveInheritance,
  inspectStorefrontResponsiveLayoutDepth,
  resetStorefrontResponsiveLayoutDepth,
  setStorefrontResponsiveGridContainerLayout,
  setStorefrontResponsiveStackContainerLayout,
  setStorefrontResponsiveVisibility,
  STOREFRONT_RESPONSIVE_LAYOUT_SPACING,
  type StorefrontResponsiveLayoutSpacing,
} from '@/lib/builder/storefront-responsive-layout-depth';
import {
  canonicalizeStorefrontFingerprintJson,
  fingerprintStorefrontPageDocument,
} from '@/lib/builder/storefront-page-fingerprint';
import {
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontComponentRegistry,
  type StorefrontPageDocument,
  type StorefrontRuntimeCapabilityContext,
} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_SMART_INTENT_VERSION='shoporation.storefront-smart-intent.v1' as const;

export type StorefrontSmartIntentStatus='READY'|'BLOCK'|'UNKNOWN';
export type StorefrontSmartIntentFamily='layout-width'|'spacing'|'typography'|'visibility'|'responsive-reset';
export type StorefrontSmartIntentIssue={
  code:string;
  state:'BLOCK'|'UNKNOWN';
  reason:string;
};

type OperationBase={
  id:string;
  reason:string;
  nodeId:string|null;
  viewport:StorefrontViewport|null;
};

export type StorefrontSmartIntentOperation=
  |OperationBase&{
    kind:'grid-placement';
    authority:'storefront-fidelity-layout';
    nodeId:string;
    viewport:StorefrontViewport;
    value:StorefrontGridPlacement;
  }
  |OperationBase&{
    kind:'container-gap';
    authority:'storefront-responsive-layout-depth';
    nodeId:string;
    viewport:StorefrontViewport;
    containerKind:'grid'|'stack';
    gap:StorefrontResponsiveLayoutSpacing;
  }
  |OperationBase&{
    kind:'typography';
    authority:'storefront-fidelity-builder-operations';
    nodeId:string;
    viewport:StorefrontViewport;
    value:StorefrontTypographyValue;
  }
  |OperationBase&{
    kind:'visibility';
    authority:'storefront-responsive-layout-depth';
    nodeId:string;
    viewport:StorefrontViewport;
    hidden:boolean;
  }
  |OperationBase&{
    kind:'responsive-reset';
    authority:'storefront-responsive-layout-depth';
    nodeId:string;
    viewport:StorefrontViewport;
  }
  |OperationBase&{
    kind:'global-spacing';
    authority:'storefront-global-styles';
    value:StorefrontGlobalSpacingScale;
  };

export type StorefrontSmartIntentPlan={
  contract:typeof STOREFRONT_SMART_INTENT_VERSION;
  status:StorefrontSmartIntentStatus;
  family:StorefrontSmartIntentFamily|null;
  source:{
    pageKey:string;
    fingerprint:string;
    nodeId:string;
    viewport:StorefrontViewport;
    rawText:string;
    normalizedText:string;
  };
  summary:string;
  operations:readonly StorefrontSmartIntentOperation[];
  affectedNodeIds:readonly string[];
  authorities:readonly string[];
  issues:readonly StorefrontSmartIntentIssue[];
};

const VIEWPORTS=['desktop','tablet','mobile'] as const;
const SPACING_STEPS=[...STOREFRONT_RESPONSIVE_LAYOUT_SPACING];
const GLOBAL_SPACING_STEPS=[...STOREFRONT_GLOBAL_SPACING_SCALES];
const TYPOGRAPHY_COMPONENTS=new Set(['content.heading','content.text','content.button']);
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clone=<T>(value:T):T=>structuredClone(value);
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

function deepFreeze<T>(value:T):T{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  }
  return value;
}

function normalizeText(value:string){
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,' ').trim();
}
const includesAny=(text:string,terms:readonly string[])=>terms.some(term=>text.includes(term));

function findNodeWithParent(document:StorefrontPageDocument,nodeId:string):{node:StorefrontComponentNode;parent:StorefrontComponentNode|null}|null{
  const walk=(nodes:readonly StorefrontComponentNode[],parent:StorefrontComponentNode|null):{node:StorefrontComponentNode;parent:StorefrontComponentNode|null}|null=>{
    for(const node of nodes){
      if(node.id===nodeId)return{node,parent};
      const nested=walk(node.children??[],node);if(nested)return nested;
    }
    return null;
  };
  return walk(document.sections,null);
}

function explicitViewport(text:string):StorefrontViewport|undefined|'AMBIGUOUS'{
  const matches:StorefrontViewport[]=[];
  if(includesAny(text,['mobil','mobile','telefon']))matches.push('mobile');
  if(includesAny(text,['tablet','tablagep']))matches.push('tablet');
  if(includesAny(text,['desktop','asztali','nagykep']))matches.push('desktop');
  const unique=[...new Set(matches)];
  return unique.length>1?'AMBIGUOUS':unique[0];
}

function mediaLike(componentKey:string){
  return componentKey.includes('image')||componentKey.startsWith('media.')||componentKey.startsWith('visual.');
}

function classifyFamilies(text:string,node:StorefrontComponentNode):StorefrontSmartIntentFamily[]{
  const families=new Set<StorefrontSmartIntentFamily>();
  const genericSize=includesAny(text,['nagyobb','kisebb','bigger','larger','smaller']);
  const explicitWidth=includesAny(text,['szelesebb','keskenyebb','wider','narrower','nagyobb kep','kisebb kep','bigger image','larger image','smaller image','nagyobb blokk','kisebb blokk']);
  const typographyCue=includesAny(text,['cim','heading','title','szoveg','text','betu','font','tipografia','typography']);
  const spacingCue=includesAny(text,['tobb levego','kevesebb levego','szellosebb','kompaktabb','tobb hely','kevesebb hely','more whitespace','less whitespace','more space','less space','airier','tighter','larger gap','smaller gap','nagyobb gap','kisebb gap']);
  const hideCue=includesAny(text,['rejtsd el','elrejtes','elrejt','hide']);
  const showCue=includesAny(text,['mutasd','jelenitsd meg','show']);
  const resetCue=includesAny(text,['orokles','orokolje','inherit','reset','alapertek','default','visszaallit']);

  if(explicitWidth)families.add('layout-width');
  if(typographyCue&&genericSize)families.add('typography');
  if(spacingCue)families.add('spacing');
  if(hideCue||showCue)families.add('visibility');
  if(resetCue)families.add('responsive-reset');

  if(genericSize&&!explicitWidth&&!typographyCue){
    if(TYPOGRAPHY_COMPONENTS.has(node.componentKey))families.add('typography');
    else if(mediaLike(node.componentKey))families.add('layout-width');
  }
  return[...families];
}

function direction(text:string,family:StorefrontSmartIntentFamily):'increase'|'decrease'|'AMBIGUOUS'|null{
  const larger=family==='layout-width'
    ?['szelesebb','nagyobb','wider','bigger','larger']
    :family==='typography'
      ?['nagyobb','hangsulyosabb','bigger','larger','emphasize','emphasise']
      :['tobb levego','szellosebb','tobb hely','more whitespace','more space','airier','larger gap','nagyobb gap'];
  const smaller=family==='layout-width'
    ?['keskenyebb','kisebb','narrower','smaller']
    :family==='typography'
      ?['kisebb','visszafogottabb','smaller','less prominent']
      :['kevesebb levego','kompaktabb','kevesebb hely','less whitespace','less space','tighter','smaller gap','kisebb gap'];
  const up=includesAny(text,larger),down=includesAny(text,smaller);
  if(up&&down)return'AMBIGUOUS';
  return up?'increase':down?'decrease':null;
}

function typographySlots(node:StorefrontComponentNode,viewport:StorefrontViewport){
  const raw=node.config.typography;
  if(!isRecord(raw))return{direct:{} as StorefrontTypographyValue,effective:{} as StorefrontTypographyValue};
  const responsive=['base','desktop','tablet','mobile'].some(key=>Object.prototype.hasOwnProperty.call(raw,key));
  if(!responsive){
    const base=sanitizeStorefrontTypographyValue(raw);
    return{direct:{},effective:base};
  }
  const base=sanitizeStorefrontTypographyValue(raw.base);
  const direct=sanitizeStorefrontTypographyValue(raw[viewport]);
  return{direct,effective:{...base,...direct}};
}

function stepValue<T extends string>(steps:readonly T[],current:T,directionValue:'increase'|'decrease'):T|null{
  const index=steps.indexOf(current);
  const target=index+(directionValue==='increase'?1:-1);
  return target>=0&&target<steps.length?steps[target]:null;
}

function cleanPlacement(value:StorefrontGridPlacement,span:number):StorefrontGridPlacement{
  const next:{span:number;start?:number;end?:number;order?:number;alignSelf?:StorefrontGridPlacement['alignSelf'];justifySelf?:StorefrontGridPlacement['justifySelf']}={...value,span};
  if(next.start!==undefined&&next.end!==undefined)delete next.end;
  return next;
}

function operationId(index:number){return`smart-intent-${String(index+1).padStart(2,'0')}`;}

function frozenPlan(input:Omit<StorefrontSmartIntentPlan,'contract'>):StorefrontSmartIntentPlan{
  return deepFreeze({contract:STOREFRONT_SMART_INTENT_VERSION,...input});
}

function failedPlan(input:{
  status:'BLOCK'|'UNKNOWN';
  family:StorefrontSmartIntentFamily|null;
  source:StorefrontSmartIntentPlan['source'];
  code:string;
  reason:string;
}){
  return frozenPlan({
    status:input.status,
    family:input.family,
    source:input.source,
    summary:input.reason,
    operations:[],
    affectedNodeIds:[],
    authorities:[],
    issues:[{code:input.code,state:input.status,reason:input.reason}],
  });
}

function applyOperation(document:StorefrontPageDocument,operation:StorefrontSmartIntentOperation):StorefrontPageDocument{
  if(operation.kind==='grid-placement')return setStorefrontResponsiveGridPlacement(document,operation.nodeId,operation.viewport,operation.value);
  if(operation.kind==='container-gap'){
    return operation.containerKind==='grid'
      ?setStorefrontResponsiveGridContainerLayout(document,operation.nodeId,operation.viewport,{gap:operation.gap})
      :setStorefrontResponsiveStackContainerLayout(document,operation.nodeId,operation.viewport,{gap:operation.gap});
  }
  if(operation.kind==='typography')return setStorefrontNodeTypography(document,operation.nodeId,operation.viewport,operation.value);
  if(operation.kind==='visibility')return setStorefrontResponsiveVisibility(document,operation.nodeId,operation.viewport,operation.hidden);
  if(operation.kind==='responsive-reset')return resetStorefrontResponsiveLayoutDepth(document,operation.nodeId,operation.viewport);
  const current=getStorefrontGlobalStyleState(document);
  return setStorefrontGlobalStyleState(document,{...current,tokens:{...current.tokens,spacingScale:operation.value}});
}

function operationAuthorities(operations:readonly StorefrontSmartIntentOperation[]){
  return [...new Set(operations.map(operation=>operation.authority))].sort();
}

function affectedNodes(operations:readonly StorefrontSmartIntentOperation[]){
  return [...new Set(operations.flatMap(operation=>operation.nodeId?[operation.nodeId]:[]))].sort();
}

export async function planStorefrontSmartIntent(input:{
  document:StorefrontPageDocument;
  rawText:string;
  nodeId:string;
  viewport:StorefrontViewport;
  registry:StorefrontComponentRegistry;
  capability:StorefrontRuntimeCapabilityContext;
}):Promise<StorefrontSmartIntentPlan>{
  const rawText=input.rawText.trim();
  const normalizedText=normalizeText(rawText);
  const fingerprint=await fingerprintStorefrontPageDocument(input.document);
  const source={pageKey:input.document.pageKey,fingerprint,nodeId:input.nodeId,viewport:input.viewport,rawText,normalizedText};
  if(!rawText)return failedPlan({status:'UNKNOWN',family:null,source,code:'SMART_INTENT_TEXT_REQUIRED',reason:'Adj meg egy szerkesztési szándékot.'});

  const located=findNodeWithParent(input.document,input.nodeId);
  if(!located)return failedPlan({status:'BLOCK',family:null,source,code:'SMART_INTENT_NODE_NOT_FOUND',reason:'A kijelölt elem már nem található az oldalon.'});

  const mentionedViewport=explicitViewport(normalizedText);
  if(mentionedViewport==='AMBIGUOUS')return failedPlan({status:'UNKNOWN',family:null,source,code:'SMART_INTENT_VIEWPORT_AMBIGUOUS',reason:'Egyszerre több viewport szerepel a kérésben; adj meg pontosan egyet.'});
  const viewport=mentionedViewport??input.viewport;
  const contextualSource={...source,viewport};

  const families=classifyFamilies(normalizedText,located.node);
  if(families.length!==1){
    return failedPlan({
      status:'UNKNOWN',family:null,source:contextualSource,
      code:families.length?'SMART_INTENT_MULTIPLE_FAMILIES':'SMART_INTENT_UNRECOGNIZED',
      reason:families.length?'Egy kérésben több külön szerkesztési szándék szerepel. Bontsd külön lépésekre.':'A kérés nem illeszkedik a biztonságosan támogatott Smart Intent műveletekhez.',
    });
  }
  const family=families[0];
  const operations:StorefrontSmartIntentOperation[]=[];
  let summary='';

  if(family==='layout-width'){
    const dir=direction(normalizedText,family);
    if(dir==='AMBIGUOUS'||dir===null)return failedPlan({status:'UNKNOWN',family,source:contextualSource,code:'SMART_INTENT_DIRECTION_AMBIGUOUS',reason:'Nem egyértelmű, hogy szélesebb vagy keskenyebb elemet szeretnél.'});
    if(located.parent?.componentKey!=='layout.grid')return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_GRID_PARENT_REQUIRED',reason:'Szélesség-intent csak 12 oszlopos grid közvetlen gyermekén alkalmazható.'});
    const state=inspectStorefrontResponsiveLayoutDepth(input.document,input.nodeId,viewport);
    const current=state.effectiveGridSpan;
    const target=clamp(current+(dir==='increase'?2:-2),1,12);
    if(target===current)return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_WIDTH_BOUNDARY',reason:'Az elem ezen a viewporton már elérte a biztonságos szélességi határt.'});
    operations.push({
      id:operationId(operations.length),kind:'grid-placement',authority:'storefront-fidelity-layout',
      nodeId:input.nodeId,viewport,value:cleanPlacement(inspectStorefrontGridPlacement(input.document,input.nodeId,viewport).direct,target),
      reason:`A kijelölt elem szélessége ${current}/12 → ${target}/12.`,
    });

    const siblings=located.parent.children??[];
    if(siblings.length===2){
      const sibling=siblings.find(node=>node.id!==input.nodeId);
      if(sibling){
        const siblingSpan=inspectStorefrontResponsiveLayoutDepth(input.document,sibling.id,viewport).effectiveGridSpan;
        if(current+siblingSpan===12){
          const companion=12-target;
          if(companion<1)return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_GRID_COMPANION_BOUNDARY',reason:'A társ elem nem csökkenthető tovább a 12 oszlopos kompozíció megtartása mellett.'});
          operations.push({
            id:operationId(operations.length),kind:'grid-placement',authority:'storefront-fidelity-layout',
            nodeId:sibling.id,viewport,value:cleanPlacement(inspectStorefrontGridPlacement(input.document,sibling.id,viewport).direct,companion),
            reason:`A társ elem komplementer szélessége ${siblingSpan}/12 → ${companion}/12, így a pár összesen 12 oszlop marad.`,
          });
        }
      }
    }
    summary=operations.length===2
      ?`A 12 oszlopos pár aránya biztonságosan módosul: ${operations[0].reason} ${operations[1].reason}`
      :operations[0].reason;
  }

  if(family==='spacing'){
    const dir=direction(normalizedText,family);
    if(dir==='AMBIGUOUS'||dir===null)return failedPlan({status:'UNKNOWN',family,source:contextualSource,code:'SMART_INTENT_DIRECTION_AMBIGUOUS',reason:'Nem egyértelmű, hogy több vagy kevesebb térközt szeretnél.'});
    const global=includesAny(normalizedText,['globalis','egesz oldal','mindenhol','global','whole page','everywhere']);
    if(global){
      const state=getStorefrontGlobalStyleState(input.document);
      const current=state.tokens.spacingScale??'comfortable';
      const next=stepValue(GLOBAL_SPACING_STEPS,current,dir);
      if(!next)return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_GLOBAL_SPACING_BOUNDARY',reason:'A globális térköz már elérte a támogatott határt.'});
      operations.push({
        id:operationId(0),kind:'global-spacing',authority:'storefront-global-styles',nodeId:null,viewport:null,value:next,
        reason:`Globális spacingScale: ${current} → ${next}.`,
      });
      summary=operations[0].reason;
    }else{
      const target=located.node.componentKey==='layout.grid'||located.node.componentKey==='layout.stack'
        ?located.node
        :located.parent?.componentKey==='layout.grid'||located.parent?.componentKey==='layout.stack'
          ?located.parent
          :null;
      if(!target)return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_SPACING_CONTAINER_REQUIRED',reason:'A kijelöléshez nem tartozik közvetlen grid/stack térköz-authority.'});
      const inspection=inspectStorefrontResponsiveContainerLayout(input.document,target.id,viewport);
      if(!inspection.kind)return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_SPACING_CONTAINER_REQUIRED',reason:'A kijelölt elem nem támogat strukturált grid/stack térközt.'});
      const current=(typeof inspection.effective.gap==='string'&&SPACING_STEPS.includes(inspection.effective.gap as StorefrontResponsiveLayoutSpacing))
        ?inspection.effective.gap as StorefrontResponsiveLayoutSpacing
        :'m';
      const next=stepValue(SPACING_STEPS,current,dir);
      if(!next)return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_SPACING_BOUNDARY',reason:'A lokális térköz már elérte a támogatott tokenhatárt.'});
      operations.push({
        id:operationId(0),kind:'container-gap',authority:'storefront-responsive-layout-depth',
        nodeId:target.id,viewport,containerKind:inspection.kind,gap:next,
        reason:`A konténer gap tokenje ${current} → ${next}.`,
      });
      summary=operations[0].reason;
    }
  }

  if(family==='typography'){
    const dir=direction(normalizedText,family);
    if(dir==='AMBIGUOUS'||dir===null)return failedPlan({status:'UNKNOWN',family,source:contextualSource,code:'SMART_INTENT_DIRECTION_AMBIGUOUS',reason:'Nem egyértelmű, hogy nagyobb vagy kisebb tipográfiát szeretnél.'});
    if(!TYPOGRAPHY_COMPONENTS.has(located.node.componentKey))return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_TYPOGRAPHY_UNSUPPORTED',reason:'A kijelölt komponens nem a canonical tipográfia-authority része.'});
    const slots=typographySlots(located.node,viewport);
    const value:StorefrontTypographyValue={...slots.direct};
    if(slots.effective.fluidSize){
      const factor=dir==='increase'?1.125:1/1.125;
      const fluid={
        minRem:Number((slots.effective.fluidSize.minRem*factor).toFixed(3)),
        maxRem:Number((slots.effective.fluidSize.maxRem*factor).toFixed(3)),
        preferredVw:slots.effective.fluidSize.preferredVw,
      };
      delete value.fontSizeRem;
      value.fluidSize=fluid;
    }else{
      const fallback=located.node.componentKey==='content.heading'?2:1;
      const current=slots.effective.fontSizeRem??fallback;
      const next=Number((current*(dir==='increase'?1.125:1/1.125)).toFixed(3));
      delete value.fluidSize;
      value.fontSizeRem=next;
    }
    const sanitized=sanitizeStorefrontTypographyValue(value);
    if(canonicalizeStorefrontFingerprintJson(sanitized)===canonicalizeStorefrontFingerprintJson(slots.direct)){
      return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_TYPOGRAPHY_BOUNDARY',reason:'A tipográfia ezen az irányon már elérte a támogatott határt.'});
    }
    operations.push({
      id:operationId(0),kind:'typography',authority:'storefront-fidelity-builder-operations',
      nodeId:input.nodeId,viewport,value:sanitized,
      reason:`A kijelölt ${located.node.componentKey} tipográfiája ${dir==='increase'?'hangsúlyosabb':'visszafogottabb'} lesz ezen a viewporton.`,
    });
    summary=operations[0].reason;
  }

  if(family==='visibility'){
    const hide=includesAny(normalizedText,['rejtsd el','elrejtes','elrejt','hide']);
    const show=includesAny(normalizedText,['mutasd','jelenitsd meg','show']);
    if(hide===show)return failedPlan({status:'UNKNOWN',family,source:contextualSource,code:'SMART_INTENT_VISIBILITY_AMBIGUOUS',reason:'Nem egyértelmű, hogy elrejteni vagy megjeleníteni szeretnéd az elemet.'});
    const hidden=hide;
    const current=inspectStorefrontResponsiveLayoutDepth(input.document,input.nodeId,viewport).visibility.effective;
    if(current===hidden)return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_VISIBILITY_NOOP',reason:'Az elem már a kért láthatósági állapotban van ezen a viewporton.'});
    operations.push({
      id:operationId(0),kind:'visibility',authority:'storefront-responsive-layout-depth',
      nodeId:input.nodeId,viewport,hidden,
      reason:`A kijelölt elem ${hidden?'rejtett':'látható'} lesz ${viewport} viewporton.`,
    });
    summary=operations[0].reason;
  }

  if(family==='responsive-reset'){
    const inheritance=inspectStorefrontResponsiveInheritance(input.document,input.nodeId).viewports[viewport];
    const hasDirectOverride=
      inheritance.visibility.direct!==null
      ||Object.keys(inheritance.gridPlacement.direct).length>0
      ||Object.keys(inheritance.container.direct).length>0
      ||inheritance.childOrder.direct!==null;
    if(!hasDirectOverride)return failedPlan({
      status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_RESET_NOOP',
      reason:'Ezen a viewporton nincs visszaállítható explicit layout override.',
    });
    operations.push({
      id:operationId(0),kind:'responsive-reset',authority:'storefront-responsive-layout-depth',
      nodeId:input.nodeId,viewport,
      reason:`A kijelölt elem ${viewport} layout override-jai visszaállnak az örökölt/alap állapotra.`,
    });
    summary=operations[0].reason;
  }

  if(!operations.length)return failedPlan({status:'UNKNOWN',family,source:contextualSource,code:'SMART_INTENT_NO_OPERATION',reason:'A kéréshez nem állt elő végrehajtható canonical művelet.'});

  let preview=clone(input.document);
  try{
    for(const operation of operations)preview=applyOperation(preview,operation);
    assertSafeStorefrontGlobalStylesDocument(preview);
  }catch(error){
    return failedPlan({
      status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_CANONICAL_OPERATION_REJECTED',
      reason:error instanceof Error?error.message:'A canonical Builder-authority elutasította a műveletet.',
    });
  }
  if(canonicalizeStorefrontFingerprintJson(preview)===canonicalizeStorefrontFingerprintJson(input.document)){
    return failedPlan({status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_NOOP',reason:'A kérés nem változtatná meg ténylegesen az oldalt.'});
  }
  const validation=validateStorefrontPageDocument(preview,input.registry,input.capability);
  const fatal=validation.violations.filter(issue=>issue.severity==='error');
  if(fatal.length){
    return failedPlan({
      status:'BLOCK',family,source:contextualSource,code:'SMART_INTENT_PREVIEW_INVALID',
      reason:`A tervezett módosítás sértené a Page Schema contractot: ${fatal.map(issue=>issue.code).join(', ')}.`,
    });
  }

  return frozenPlan({
    status:'READY',
    family,
    source:contextualSource,
    summary,
    operations,
    affectedNodeIds:affectedNodes(operations),
    authorities:operationAuthorities(operations),
    issues:[],
  });
}

export async function applyStorefrontSmartIntentPlan(input:{
  document:StorefrontPageDocument;
  plan:StorefrontSmartIntentPlan;
  registry:StorefrontComponentRegistry;
  capability:StorefrontRuntimeCapabilityContext;
}):Promise<{document:StorefrontPageDocument;appliedOperationIds:readonly string[]}>{
  if(input.plan.contract!==STOREFRONT_SMART_INTENT_VERSION)throw new Error('SMART_INTENT_PLAN_VERSION_INVALID');
  if(input.plan.status!=='READY'||!input.plan.operations.length)throw new Error('SMART_INTENT_PLAN_NOT_READY');
  const fingerprint=await fingerprintStorefrontPageDocument(input.document);
  if(fingerprint!==input.plan.source.fingerprint)throw new Error('SMART_INTENT_PLAN_STALE');
  if(input.document.pageKey!==input.plan.source.pageKey)throw new Error('SMART_INTENT_PLAN_PAGE_MISMATCH');

  let next=clone(input.document);
  for(const operation of input.plan.operations)next=applyOperation(next,operation);
  assertSafeStorefrontGlobalStylesDocument(next);
  const validation=validateStorefrontPageDocument(next,input.registry,input.capability);
  const fatal=validation.violations.filter(issue=>issue.severity==='error');
  if(fatal.length)throw new Error(`SMART_INTENT_RESULT_INVALID:${fatal.map(issue=>issue.code).join(',')}`);
  return deepFreeze({document:next,appliedOperationIds:input.plan.operations.map(operation=>operation.id)});
}
