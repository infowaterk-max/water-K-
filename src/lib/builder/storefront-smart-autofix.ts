import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {
  clearStorefrontResponsiveOrder,
  setStorefrontDesignGuardMode,
} from '@/lib/builder/storefront-fidelity-builder-operations';
import {readStorefrontFidelityMetadata} from '@/lib/builder/storefront-fidelity-engine';
import {
  resetStorefrontResponsiveGridPlacement,
} from '@/lib/builder/storefront-fidelity-layout';
import {
  inspectStorefrontResponsiveInheritance,
  resetStorefrontResponsiveContainerLayout,
  setStorefrontResponsiveVisibility,
  type StorefrontResponsiveInheritanceDimension,
} from '@/lib/builder/storefront-responsive-layout-depth';
import {
  canonicalizeStorefrontFingerprintJson,
  fingerprintStorefrontPageDocument,
} from '@/lib/builder/storefront-page-fingerprint';
import type {StorefrontPublishReadinessFinding} from '@/lib/builder/storefront-publish-readiness';
import {
  validateStorefrontPageDocument,
  type StorefrontComponentRegistry,
  type StorefrontPageDocument,
  type StorefrontRuntimeCapabilityContext,
} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_SMART_AUTOFIX_VERSION='shoporation.storefront-smart-autofix.v1' as const;

export type StorefrontSmartAutoFixStatus='READY'|'MANUAL'|'BLOCK'|'UNKNOWN';
export type StorefrontSmartAutoFixRepairKey='responsive-redundant-reset'|'design-guard-warn';

export type StorefrontSmartAutoFixOperation=
  |{
    id:string;
    kind:'reset-responsive-dimension';
    authority:'storefront-responsive-inheritance';
    nodeId:string;
    viewport:StorefrontViewport;
    dimension:StorefrontResponsiveInheritanceDimension;
    reason:string;
  }
  |{
    id:string;
    kind:'set-design-guard';
    authority:'storefront-fidelity-design-guard';
    mode:'warn';
    reason:string;
  };

export type StorefrontSmartAutoFixPlan={
  contract:typeof STOREFRONT_SMART_AUTOFIX_VERSION;
  status:StorefrontSmartAutoFixStatus;
  repairKey:StorefrontSmartAutoFixRepairKey|null;
  source:{
    pageKey:string;
    fingerprint:string;
    findingId:string;
    findingState:StorefrontPublishReadinessFinding['state'];
    code:string|null;
    evidenceSource:string;
    repairability:StorefrontPublishReadinessFinding['repairability'];
    location:{
      pageKey?:string;
      pageType?:string;
      viewport?:StorefrontViewport;
      nodeId?:string;
      path?:string;
    };
  };
  summary:string;
  operations:readonly StorefrontSmartAutoFixOperation[];
  authorities:readonly string[];
  issue:{
    code:string;
    reason:string;
  }|null;
  hash:string;
};

const clone=<T>(value:T):T=>structuredClone(value);

function deepFreeze<T>(value:T):T{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  }
  return value;
}

function digest(value:unknown){
  let hash=2166136261;
  const serialized=canonicalizeStorefrontFingerprintJson(value);
  for(let index=0;index<serialized.length;index+=1){
    hash^=serialized.charCodeAt(index);
    hash=Math.imul(hash,16777619);
  }
  return`fnv1a32:${(hash>>>0).toString(16).padStart(8,'0')}`;
}

function planHash(plan:Omit<StorefrontSmartAutoFixPlan,'hash'>){return digest(plan);}

function freezePlan(plan:Omit<StorefrontSmartAutoFixPlan,'hash'>):StorefrontSmartAutoFixPlan{
  return deepFreeze({...plan,hash:planHash(plan)});
}

function sourceSnapshot(document:StorefrontPageDocument,fingerprint:string,finding:StorefrontPublishReadinessFinding){
  return{
    pageKey:document.pageKey,
    fingerprint,
    findingId:finding.id,
    findingState:finding.state,
    code:finding.evidence.code??null,
    evidenceSource:finding.evidence.source,
    repairability:finding.repairability,
    location:{
      ...(finding.location.pageKey?{pageKey:finding.location.pageKey}:{}),
      ...(finding.location.pageType?{pageType:finding.location.pageType}:{}),
      ...(finding.location.viewport?{viewport:finding.location.viewport}:{}),
      ...(finding.location.nodeId?{nodeId:finding.location.nodeId}:{}),
      ...(finding.location.path?{path:finding.location.path}:{}),
    },
  };
}

function nonReady(input:{
  status:Exclude<StorefrontSmartAutoFixStatus,'READY'>;
  source:StorefrontSmartAutoFixPlan['source'];
  code:string;
  reason:string;
}):StorefrontSmartAutoFixPlan{
  return freezePlan({
    contract:STOREFRONT_SMART_AUTOFIX_VERSION,
    status:input.status,
    repairKey:null,
    source:input.source,
    summary:input.reason,
    operations:[],
    authorities:[],
    issue:{code:input.code,reason:input.reason},
  });
}

function dimensionFromPath(path:string|undefined):StorefrontResponsiveInheritanceDimension|null{
  const match=/^responsive\.(visibility|grid-placement|container|child-order)$/.exec(path??'');
  return match?.[1] as StorefrontResponsiveInheritanceDimension|null;
}

function assertResponsiveDiagnosticCurrent(
  document:StorefrontPageDocument,
  source:StorefrontSmartAutoFixPlan['source'],
  expectedDimension?:StorefrontResponsiveInheritanceDimension,
){
  const nodeId=source.location.nodeId;
  const viewport=source.location.viewport;
  const dimension=expectedDimension??dimensionFromPath(source.location.path);
  if(!nodeId||!viewport||!dimension)throw new Error('SMART_AUTOFIX_LOCALIZATION_INVALID');
  const current=inspectStorefrontResponsiveInheritance(document,nodeId);
  const diagnostic=current.diagnostics.find(issue=>
    issue.code==='RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE'
    &&issue.nodeId===nodeId
    &&issue.viewport===viewport
    &&issue.dimension===dimension
    &&issue.safeReset===true
  );
  if(!diagnostic)throw new Error('SMART_AUTOFIX_SOURCE_STALE');
  return{nodeId,viewport,dimension};
}

function designGuardMode(document:StorefrontPageDocument){
  return readStorefrontFidelityMetadata(document)?.designGuard?.mode??'off';
}

function validateReadyPlanShape(plan:StorefrontSmartAutoFixPlan){
  if(plan.status!=='READY'||!plan.repairKey||!plan.operations.length)throw new Error('SMART_AUTOFIX_PLAN_NOT_READY');
  if(plan.repairKey==='responsive-redundant-reset'){
    if(plan.source.code!=='RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE'||plan.source.evidenceSource!=='storefront-responsive-inheritance')throw new Error('SMART_AUTOFIX_REGISTRY_BINDING_INVALID');
    if(plan.operations.length!==1||plan.operations[0].kind!=='reset-responsive-dimension')throw new Error('SMART_AUTOFIX_OPERATION_SHAPE_INVALID');
    const operation=plan.operations[0];
    if(
      operation.nodeId!==plan.source.location.nodeId
      ||operation.viewport!==plan.source.location.viewport
      ||operation.dimension!==dimensionFromPath(plan.source.location.path)
    )throw new Error('SMART_AUTOFIX_OPERATION_BINDING_INVALID');
    return;
  }
  if(plan.repairKey==='design-guard-warn'){
    if(plan.source.code!=='PUBLISH_READINESS_DESIGN_GUARD_OFF'||plan.source.evidenceSource!=='storefront-fidelity-design-guard')throw new Error('SMART_AUTOFIX_REGISTRY_BINDING_INVALID');
    if(plan.operations.length!==1||plan.operations[0].kind!=='set-design-guard'||plan.operations[0].mode!=='warn')throw new Error('SMART_AUTOFIX_OPERATION_SHAPE_INVALID');
    return;
  }
  throw new Error('SMART_AUTOFIX_REPAIR_KEY_UNSUPPORTED');
}

function applyOperation(document:StorefrontPageDocument,operation:StorefrontSmartAutoFixOperation):StorefrontPageDocument{
  if(operation.kind==='set-design-guard')return setStorefrontDesignGuardMode(document,operation.mode);
  if(operation.dimension==='visibility')return setStorefrontResponsiveVisibility(document,operation.nodeId,operation.viewport,null);
  if(operation.dimension==='grid-placement')return resetStorefrontResponsiveGridPlacement(document,operation.nodeId,operation.viewport);
  if(operation.dimension==='container')return resetStorefrontResponsiveContainerLayout(document,operation.nodeId,operation.viewport);
  return clearStorefrontResponsiveOrder(document,{viewport:operation.viewport,parentId:operation.nodeId});
}

function assertSourceCurrent(document:StorefrontPageDocument,plan:StorefrontSmartAutoFixPlan){
  if(plan.repairKey==='responsive-redundant-reset'){
    const operation=plan.operations[0];
    if(operation?.kind!=='reset-responsive-dimension')throw new Error('SMART_AUTOFIX_OPERATION_SHAPE_INVALID');
    assertResponsiveDiagnosticCurrent(document,plan.source,operation.dimension);
    return;
  }
  if(plan.repairKey==='design-guard-warn'){
    if(designGuardMode(document)!=='off')throw new Error('SMART_AUTOFIX_SOURCE_STALE');
    return;
  }
  throw new Error('SMART_AUTOFIX_REPAIR_KEY_UNSUPPORTED');
}

function assertPostcondition(document:StorefrontPageDocument,plan:StorefrontSmartAutoFixPlan){
  if(plan.repairKey==='responsive-redundant-reset'){
    const operation=plan.operations[0];
    if(operation?.kind!=='reset-responsive-dimension')throw new Error('SMART_AUTOFIX_OPERATION_SHAPE_INVALID');
    const current=inspectStorefrontResponsiveInheritance(document,operation.nodeId);
    if(current.diagnostics.some(issue=>
      issue.code==='RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE'
      &&issue.viewport===operation.viewport
      &&issue.dimension===operation.dimension
    ))throw new Error('SMART_AUTOFIX_POSTCONDITION_FAILED');
    return;
  }
  if(plan.repairKey==='design-guard-warn'&&designGuardMode(document)==='off')throw new Error('SMART_AUTOFIX_POSTCONDITION_FAILED');
}

export async function planStorefrontSmartAutoFix(input:{
  document:StorefrontPageDocument;
  finding:StorefrontPublishReadinessFinding;
}):Promise<StorefrontSmartAutoFixPlan>{
  const fingerprint=await fingerprintStorefrontPageDocument(input.document);
  const source=sourceSnapshot(input.document,fingerprint,input.finding);

  if(source.location.pageKey&&source.location.pageKey!==input.document.pageKey){
    return nonReady({status:'MANUAL',source,code:'SMART_AUTOFIX_CROSS_PAGE_MANUAL',reason:'A diagnosztika másik oldalhoz tartozik; az aktív oldal nem módosítható helyette.'});
  }
  if(input.finding.state==='UNKNOWN'){
    return nonReady({status:'UNKNOWN',source,code:'SMART_AUTOFIX_EVIDENCE_UNKNOWN',reason:'Nem igazolt diagnosztikából nem készül automatikus javítás.'});
  }
  if(
    input.finding.repairability==='manual-review'
    ||input.finding.evidence.source==='storefront-visual-diff-intelligence'
    ||input.finding.evidence.provenance?.structuredCause===false
  ){
    return nonReady({status:'MANUAL',source,code:'SMART_AUTOFIX_MANUAL_EVIDENCE',reason:'A diagnosztika manuális értelmezést igényel; vizuális/pixel bizonyítékból nem következtetünk schema-javításra.'});
  }
  if(input.finding.repairability!=='structured-diagnostic'){
    return nonReady({status:'MANUAL',source,code:'SMART_AUTOFIX_NOT_STRUCTURED',reason:'Ehhez a findinghoz nincs strukturált, bizonyítható automatikus javítási út.'});
  }

  if(source.code==='RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE'&&source.evidenceSource==='storefront-responsive-inheritance'){
    const dimension=dimensionFromPath(source.location.path);
    if(!dimension||!source.location.nodeId||!source.location.viewport){
      return nonReady({status:'BLOCK',source,code:'SMART_AUTOFIX_LOCALIZATION_INVALID',reason:'A redundant override finding nem tartalmaz teljes node/viewport/dimension lokalizációt.'});
    }
    try{assertResponsiveDiagnosticCurrent(input.document,source,dimension)}
    catch{
      return nonReady({status:'BLOCK',source,code:'SMART_AUTOFIX_SOURCE_STALE',reason:'A redundant responsive override már nem igazolható a jelenlegi dokumentumban.'});
    }
    const operation:StorefrontSmartAutoFixOperation={
      id:'smart-autofix-01',
      kind:'reset-responsive-dimension',
      authority:'storefront-responsive-inheritance',
      nodeId:source.location.nodeId,
      viewport:source.location.viewport,
      dimension,
      reason:`A(z) ${dimension} explicit ${source.location.viewport} override bizonyítottan redundáns; csak ezt a dimenziót állítjuk vissza.`,
    };
    return freezePlan({
      contract:STOREFRONT_SMART_AUTOFIX_VERSION,
      status:'READY',
      repairKey:'responsive-redundant-reset',
      source,
      summary:operation.reason,
      operations:[operation],
      authorities:[operation.authority],
      issue:null,
    });
  }

  if(source.code==='PUBLISH_READINESS_DESIGN_GUARD_OFF'&&source.evidenceSource==='storefront-fidelity-design-guard'){
    if(designGuardMode(input.document)!=='off'){
      return nonReady({status:'BLOCK',source,code:'SMART_AUTOFIX_SOURCE_STALE',reason:'A Design Guard már nincs kikapcsolva; a previewelt javítás elavult.'});
    }
    const operation:StorefrontSmartAutoFixOperation={
      id:'smart-autofix-01',
      kind:'set-design-guard',
      authority:'storefront-fidelity-design-guard',
      mode:'warn',
      reason:'A Design Guard kikapcsolt állapotáról canonical warn módra vált; a meglévő guard metaadatok megmaradnak.',
    };
    return freezePlan({
      contract:STOREFRONT_SMART_AUTOFIX_VERSION,
      status:'READY',
      repairKey:'design-guard-warn',
      source,
      summary:operation.reason,
      operations:[operation],
      authorities:[operation.authority],
      issue:null,
    });
  }

  return nonReady({
    status:'MANUAL',
    source,
    code:'SMART_AUTOFIX_NO_SAFE_REGISTRY_RULE',
    reason:'A finding strukturált, de nincs hozzá explicit bizonyított safe-repair registry szabály; automatikus művelet nem készül.',
  });
}

export async function applyStorefrontSmartAutoFixPlan(input:{
  document:StorefrontPageDocument;
  plan:StorefrontSmartAutoFixPlan;
  registry:StorefrontComponentRegistry;
  capability:StorefrontRuntimeCapabilityContext;
}):Promise<{document:StorefrontPageDocument;appliedOperationIds:readonly string[]}>{
  if(input.plan.contract!==STOREFRONT_SMART_AUTOFIX_VERSION)throw new Error('SMART_AUTOFIX_PLAN_VERSION_INVALID');
  const{hash,...withoutHash}=input.plan;
  if(hash!==planHash(withoutHash))throw new Error('SMART_AUTOFIX_PLAN_HASH_INVALID');
  validateReadyPlanShape(input.plan);
  if(input.document.pageKey!==input.plan.source.pageKey)throw new Error('SMART_AUTOFIX_PLAN_PAGE_MISMATCH');
  const fingerprint=await fingerprintStorefrontPageDocument(input.document);
  if(fingerprint!==input.plan.source.fingerprint)throw new Error('SMART_AUTOFIX_PLAN_STALE');
  assertSourceCurrent(input.document,input.plan);

  let next=clone(input.document);
  for(const operation of input.plan.operations)next=applyOperation(next,operation);
  const validation=validateStorefrontPageDocument(next,input.registry,input.capability);
  const fatal=validation.violations.filter(issue=>issue.severity==='error');
  if(fatal.length)throw new Error(`SMART_AUTOFIX_RESULT_INVALID:${fatal.map(issue=>issue.code).join(',')}`);
  assertPostcondition(next,input.plan);
  return deepFreeze({document:next,appliedOperationIds:input.plan.operations.map(operation=>operation.id)});
}
