import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS,type StorefrontBuilderPageType,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {fingerprintStorefrontPageDocument,sha256StorefrontCanonicalJson} from '@/lib/builder/storefront-page-fingerprint';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_VISUAL_DIFF_INTELLIGENCE_VERSION='shoporation.storefront-visual-diff-intelligence.v1' as const;
export const STOREFRONT_VISUAL_DIFF_EVIDENCE_CONTRACT='shoporation.template-factory-quality-evidence.v2' as const;
export const STOREFRONT_VISUAL_DIFF_RECONCILIATION_CONTRACT='shoporation.template-factory-page-evidence-reuse.v1' as const;

export type StorefrontVisualDiffState='exact-match'|'bounded-drift'|'blocking-drift'|'no-baseline';
export type StorefrontVisualDiffIssueSeverity='warning'|'error';

export type StorefrontVisualDiffIssue={
  code:
    |'VISUAL_DIFF_EVIDENCE_INVALID'
    |'VISUAL_DIFF_EVIDENCE_CHECKSUM_INVALID'
    |'VISUAL_DIFF_SOURCE_COMMIT_INVALID'
    |'VISUAL_DIFF_SOURCE_COMMIT_STALE'
    |'VISUAL_DIFF_CASE_MISSING'
    |'VISUAL_DIFF_CASE_DUPLICATE'
    |'VISUAL_DIFF_CASE_IDENTITY_DRIFT'
    |'VISUAL_DIFF_PAGE_FINGERPRINT_DRIFT'
    |'VISUAL_DIFF_CASE_FINGERPRINT_MISSING'
    |'VISUAL_DIFF_REUSE_PROOF_INVALID'
    |'VISUAL_DIFF_BASELINE_MISSING'
    |'VISUAL_DIFF_BLOCKING_DRIFT'
    |'VISUAL_DIFF_CASE_ERROR'
    |'VISUAL_DIFF_CASE_WARNING';
  severity:StorefrontVisualDiffIssueSeverity;
  viewport?:StorefrontViewport;
  message:string;
};

export type StorefrontVisualDiffViewportResult={
  viewport:StorefrontViewport;
  state:StorefrontVisualDiffState;
  evidenceExecution:'RERUN'|'REUSED';
  pageFingerprint:string;
  caseFingerprint:string;
  mismatchRatio:number|null;
  globalPassed:boolean|null;
  globalThreshold:number|null;
  localPassed:boolean|null;
  peakMismatchRatio:number|null;
  errors:readonly string[];
  warnings:readonly string[];
};

export type StorefrontVisualDiffIntelligenceResult={
  contract:typeof STOREFRONT_VISUAL_DIFF_INTELLIGENCE_VERSION;
  valid:boolean;
  exactSourceCommit:string;
  currentPageFingerprint:string;
  overall:'unverified'|StorefrontVisualDiffState;
  withinAcceptedBounds:false|boolean;
  viewports:Readonly<Record<StorefrontViewport,StorefrontVisualDiffViewportResult>>|null;
  issues:readonly StorefrontVisualDiffIssue[];
};

type EvidenceCase={
  templateKey:string;
  templateVersion:number;
  pageType:string;
  viewport:StorefrontViewport;
  sourceCommit:string;
  originSourceCommit?:string|null;
  evidenceExecution:'RERUN'|'REUSED';
  pageFingerprint:string;
  caseFingerprint:string;
  reuseProof?:{
    fingerprintEquivalent?:boolean;
    previousFingerprint?:string;
    currentFingerprint?:string;
    previousSourceCommit?:string;
  }|null;
  golden?:{
    status?:'pass'|'fail'|'missing'|'dimension-mismatch';
    mismatchRatio?:number|null;
    globalPassed?:boolean;
    globalThreshold?:number;
    actual?:{width?:number;height?:number}|null;
    baseline?:{width?:number;height?:number}|null;
    local?:{
      passed?:boolean;
      peakMismatchRatio?:number;
      peakMismatchPixels?:number;
      peakRegion?:{x?:number;y?:number;width?:number;height?:number}|null;
    }|null;
  }|null;
  errors:readonly string[];
  warnings:readonly string[];
};

const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const nonEmptyString=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
const exactCommit=(value:unknown):value is string=>nonEmptyString(value)&&value!=='HEAD'&&/^[0-9a-f]{40}$/i.test(value);
const stringArray=(value:unknown):string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string')?[...value]:[];
const finiteNumber=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)?value:null;

function issue(code:StorefrontVisualDiffIssue['code'],message:string,severity:StorefrontVisualDiffIssueSeverity='error',viewport?:StorefrontViewport):StorefrontVisualDiffIssue{
  return{code,severity,message,...(viewport?{viewport}:{})};
}

function parseCase(value:unknown):EvidenceCase|null{
  if(!isRecord(value))return null;
  const viewport=value.viewport;
  if(!STOREFRONT_VIEWPORTS.includes(viewport as StorefrontViewport))return null;
  if(!nonEmptyString(value.templateKey)||!Number.isInteger(value.templateVersion)||!nonEmptyString(value.pageType))return null;
  if(!nonEmptyString(value.sourceCommit)||!nonEmptyString(value.pageFingerprint)||!nonEmptyString(value.caseFingerprint))return null;
  if(value.evidenceExecution!=='RERUN'&&value.evidenceExecution!=='REUSED')return null;
  return{
    templateKey:value.templateKey,
    templateVersion:value.templateVersion as number,
    pageType:value.pageType,
    viewport:viewport as StorefrontViewport,
    sourceCommit:value.sourceCommit,
    originSourceCommit:nonEmptyString(value.originSourceCommit)?value.originSourceCommit:null,
    evidenceExecution:value.evidenceExecution,
    pageFingerprint:value.pageFingerprint,
    caseFingerprint:value.caseFingerprint,
    reuseProof:isRecord(value.reuseProof)?value.reuseProof:null,
    golden:isRecord(value.golden)?value.golden:null,
    errors:stringArray(value.errors),
    warnings:stringArray(value.warnings),
  };
}

function classifyCase(row:EvidenceCase):{
  state:StorefrontVisualDiffState;
  globalPassed:boolean|null;
  globalThreshold:number|null;
  localPassed:boolean|null;
  peakMismatchRatio:number|null;
  mismatchRatio:number|null;
}{
  const golden=row.golden;
  const status=golden?.status;
  const mismatchRatio=finiteNumber(golden?.mismatchRatio);
  const globalPassed=typeof golden?.globalPassed==='boolean'?golden.globalPassed:null;
  const globalThreshold=finiteNumber(golden?.globalThreshold);
  const localPassed=typeof golden?.local?.passed==='boolean'?golden.local.passed:null;
  const peakMismatchRatio=finiteNumber(golden?.local?.peakMismatchRatio);

  if(status==='missing'||!golden)return{state:'no-baseline',globalPassed,globalThreshold,localPassed,peakMismatchRatio,mismatchRatio};
  if(status==='dimension-mismatch'||status==='fail'||globalPassed===false||localPassed===false||row.errors.length){
    return{state:'blocking-drift',globalPassed,globalThreshold,localPassed,peakMismatchRatio,mismatchRatio};
  }
  if(status!=='pass')return{state:'blocking-drift',globalPassed,globalThreshold,localPassed,peakMismatchRatio,mismatchRatio};
  return{
    state:mismatchRatio===0?'exact-match':'bounded-drift',
    globalPassed,
    globalThreshold,
    localPassed,
    peakMismatchRatio,
    mismatchRatio,
  };
}

function overallState(viewports:Readonly<Record<StorefrontViewport,StorefrontVisualDiffViewportResult>>):StorefrontVisualDiffState{
  const states=STOREFRONT_VIEWPORTS.map(viewport=>viewports[viewport].state);
  if(states.includes('blocking-drift'))return'blocking-drift';
  if(states.includes('no-baseline'))return'no-baseline';
  if(states.includes('bounded-drift'))return'bounded-drift';
  return'exact-match';
}

export async function inspectStorefrontVisualDiffIntelligence(input:{
  document:StorefrontPageDocument;
  exactSourceCommit:string;
  evidence:unknown;
}):Promise<StorefrontVisualDiffIntelligenceResult>{
  const currentPageFingerprint=await fingerprintStorefrontPageDocument(input.document);
  const base={
    contract:STOREFRONT_VISUAL_DIFF_INTELLIGENCE_VERSION,
    exactSourceCommit:input.exactSourceCommit,
    currentPageFingerprint,
  } as const;
  const fail=(issues:StorefrontVisualDiffIssue[]):StorefrontVisualDiffIntelligenceResult=>({
    ...base,valid:false,overall:'unverified',withinAcceptedBounds:false,viewports:null,issues:Object.freeze(issues),
  });

  if(!exactCommit(input.exactSourceCommit)){
    return fail([issue('VISUAL_DIFF_SOURCE_COMMIT_INVALID','Visual evidence requires an exact 40-character source commit.')]);
  }
  if(!isRecord(input.evidence)){
    return fail([issue('VISUAL_DIFF_EVIDENCE_INVALID','Visual evidence envelope must be an object.')]);
  }
  const evidence=input.evidence;
  if(evidence.contract!==STOREFRONT_VISUAL_DIFF_EVIDENCE_CONTRACT||evidence.reconciliationContract!==STOREFRONT_VISUAL_DIFF_RECONCILIATION_CONTRACT||evidence.complete!==true){
    return fail([issue('VISUAL_DIFF_EVIDENCE_INVALID','Visual evidence contract, reconciliation contract or completeness is invalid.')]);
  }
  if(!exactCommit(evidence.sourceCommit)){
    return fail([issue('VISUAL_DIFF_SOURCE_COMMIT_INVALID','Evidence sourceCommit is missing, HEAD, or not an exact commit.')]);
  }
  if(evidence.sourceCommit!==input.exactSourceCommit){
    return fail([issue('VISUAL_DIFF_SOURCE_COMMIT_STALE',`Visual evidence belongs to ${String(evidence.sourceCommit)}, not exact source ${input.exactSourceCommit}.`)]);
  }
  if(!nonEmptyString(evidence.checksum)){
    return fail([issue('VISUAL_DIFF_EVIDENCE_CHECKSUM_INVALID','Visual evidence checksum is missing.')]);
  }
  const checksumPayload:{[key:string]:unknown}={...evidence};
  delete checksumPayload.checksum;
  const expectedChecksum=await sha256StorefrontCanonicalJson(checksumPayload);
  if(evidence.checksum!==expectedChecksum){
    return fail([issue('VISUAL_DIFF_EVIDENCE_CHECKSUM_INVALID','Visual evidence checksum does not match its canonical payload.')]);
  }
  if(!Array.isArray(evidence.cases)){
    return fail([issue('VISUAL_DIFF_EVIDENCE_INVALID','Visual evidence cases are missing.')]);
  }

  const matchingRaw=evidence.cases.filter(value=>isRecord(value)
    &&value.templateKey===input.document.templateKey
    &&value.templateVersion===input.document.templateVersion
    &&value.pageType===input.document.pageType);
  const issues:StorefrontVisualDiffIssue[]=[];
  const resolved={} as Record<StorefrontViewport,StorefrontVisualDiffViewportResult>;

  for(const viewport of STOREFRONT_VIEWPORTS){
    const candidates=matchingRaw.filter(value=>isRecord(value)&&value.viewport===viewport);
    if(candidates.length===0){
      issues.push(issue('VISUAL_DIFF_CASE_MISSING',`No ${viewport} visual evidence exists for the current page.`,'error',viewport));
      continue;
    }
    if(candidates.length!==1){
      issues.push(issue('VISUAL_DIFF_CASE_DUPLICATE',`Expected exactly one ${viewport} visual evidence case, received ${candidates.length}.`,'error',viewport));
      continue;
    }
    const row=parseCase(candidates[0]);
    if(!row){
      issues.push(issue('VISUAL_DIFF_CASE_IDENTITY_DRIFT',`The ${viewport} evidence case has an invalid identity/provenance shape.`,'error',viewport));
      continue;
    }
    if(row.templateKey!==input.document.templateKey||row.templateVersion!==input.document.templateVersion||row.pageType!==input.document.pageType||row.sourceCommit!==input.exactSourceCommit){
      issues.push(issue('VISUAL_DIFF_CASE_IDENTITY_DRIFT',`The ${viewport} evidence case does not match current page/source identity.`,'error',viewport));
      continue;
    }
    if(row.pageFingerprint!==currentPageFingerprint){
      issues.push(issue('VISUAL_DIFF_PAGE_FINGERPRINT_DRIFT',`The ${viewport} evidence page fingerprint is stale for the current document.`,'error',viewport));
      continue;
    }
    if(!nonEmptyString(row.caseFingerprint)){
      issues.push(issue('VISUAL_DIFF_CASE_FINGERPRINT_MISSING',`The ${viewport} evidence case fingerprint is missing.`,'error',viewport));
      continue;
    }
    if(row.evidenceExecution==='REUSED'){
      const reuse=row.reuseProof;
      if(!reuse||reuse.fingerprintEquivalent!==true||reuse.currentFingerprint!==currentPageFingerprint||!nonEmptyString(reuse.previousFingerprint)||!exactCommit(reuse.previousSourceCommit)){
        issues.push(issue('VISUAL_DIFF_REUSE_PROOF_INVALID',`The ${viewport} reused evidence lacks a coherent fingerprint-equivalence chain.`,'error',viewport));
        continue;
      }
    }

    const classification=classifyCase(row);
    if(classification.state==='no-baseline')issues.push(issue('VISUAL_DIFF_BASELINE_MISSING',`The ${viewport} case has no golden baseline; visual equivalence is unproven.`,'warning',viewport));
    if(classification.state==='blocking-drift')issues.push(issue('VISUAL_DIFF_BLOCKING_DRIFT',`The ${viewport} case exceeds global/local visual bounds or contains browser errors.`,'error',viewport));
    row.errors.forEach(message=>issues.push(issue('VISUAL_DIFF_CASE_ERROR',message,'error',viewport)));
    row.warnings.forEach(message=>issues.push(issue('VISUAL_DIFF_CASE_WARNING',message,'warning',viewport)));

    resolved[viewport]=Object.freeze({
      viewport,
      state:classification.state,
      evidenceExecution:row.evidenceExecution,
      pageFingerprint:row.pageFingerprint,
      caseFingerprint:row.caseFingerprint,
      mismatchRatio:classification.mismatchRatio,
      globalPassed:classification.globalPassed,
      globalThreshold:classification.globalThreshold,
      localPassed:classification.localPassed,
      peakMismatchRatio:classification.peakMismatchRatio,
      errors:Object.freeze([...row.errors]),
      warnings:Object.freeze([...row.warnings]),
    });
  }

  if(STOREFRONT_VIEWPORTS.some(viewport=>!resolved[viewport])){
    return fail(issues);
  }
  const viewports=Object.freeze({
    desktop:resolved.desktop,
    tablet:resolved.tablet,
    mobile:resolved.mobile,
  });
  const overall=overallState(viewports);
  return Object.freeze({
    ...base,
    valid:true,
    overall,
    withinAcceptedBounds:overall==='exact-match'||overall==='bounded-drift',
    viewports,
    issues:Object.freeze(issues),
  });
}

export type StorefrontVisualDiffEvidenceClass='runtime-structured'|'visual-unlocalized'|'evidence-integrity'|'unclassified';
export type StorefrontVisualDiffRepairability='structured-diagnostic'|'manual-review'|'none';

export type StorefrontVisualDiffManifestDiagnostic={
  code:string;
  severity:'error'|'warning';
  evidenceClass:StorefrontVisualDiffEvidenceClass;
  category:string;
  repairability:StorefrontVisualDiffRepairability;
  raw:string;
  structuredCause:boolean;
};

export type StorefrontVisualDiffManifestIssue={
  code:
    |'VISUAL_DIFF_MANIFEST_CONTRACT_INVALID'
    |'VISUAL_DIFF_MANIFEST_RECONCILIATION_INVALID'
    |'VISUAL_DIFF_MANIFEST_INCOMPLETE'
    |'VISUAL_DIFF_MANIFEST_CHECKSUM_INVALID'
    |'VISUAL_DIFF_MANIFEST_SOURCE_STALE'
    |'VISUAL_DIFF_TEMPLATE_FINGERPRINTS_MISSING'
    |'VISUAL_DIFF_TEMPLATE_FINGERPRINT_VERSION_DRIFT'
    |'VISUAL_DIFF_MANIFEST_PAGE_FINGERPRINT_MISSING'
    |'VISUAL_DIFF_MATRIX_CASE_MISSING'
    |'VISUAL_DIFF_MATRIX_CASE_DUPLICATE'
    |'VISUAL_DIFF_MATRIX_FOREIGN_VERSION'
    |'VISUAL_DIFF_MATRIX_CASE_INVALID'
    |'VISUAL_DIFF_MATRIX_CASE_SOURCE_STALE'
    |'VISUAL_DIFF_MATRIX_PAGE_FINGERPRINT_DRIFT'
    |'VISUAL_DIFF_MATRIX_REUSE_PROOF_INVALID'
    |'VISUAL_DIFF_MATRIX_RERUN_REUSE_PROOF_INVALID'
    |'VISUAL_DIFF_MATRIX_GOLDEN_EVIDENCE_MISSING';
  path:string;
  message:string;
  severity:'error';
};

export type StorefrontVisualDiffManifestCase={
  pageType:StorefrontBuilderPageType;
  viewport:StorefrontViewport;
  provenance:{
    evidenceExecution:'RERUN'|'REUSED';
    sourceCommit:string;
    originSourceCommit:string|null;
    pageFingerprint:string;
    caseFingerprint:string;
    fingerprintEquivalent:boolean;
  };
  visual:{
    goldenStatus:'pass'|'fail'|'missing'|'dimension-mismatch'|'unknown';
    state:StorefrontVisualDiffState|'unverified';
    mismatchRatio:number|null;
    globalPassed:boolean|null;
    localPassed:boolean|null;
    peakMismatchRatio:number|null;
    peakMismatchPixels:number|null;
    peakRegion:{x:number;y:number;width:number;height:number}|null;
    actualDimensions:{width:number;height:number}|null;
    baselineDimensions:{width:number;height:number}|null;
  };
  diagnostics:readonly StorefrontVisualDiffManifestDiagnostic[];
  clean:boolean;
};

export type StorefrontVisualDiffManifestResult={
  contract:typeof STOREFRONT_VISUAL_DIFF_INTELLIGENCE_VERSION;
  evidenceContract:typeof STOREFRONT_VISUAL_DIFF_EVIDENCE_CONTRACT;
  target:{templateKey:string;templateVersion:number;sourceCommit:string};
  valid:boolean;
  clean:boolean;
  expectedCaseCount:number;
  observedCaseCount:number;
  auxiliaryCaseCount:number;
  cases:readonly StorefrontVisualDiffManifestCase[];
  issues:readonly StorefrontVisualDiffManifestIssue[];
  summary:{
    diagnostics:number;
    bySeverity:Readonly<Record<'error'|'warning',number>>;
    byEvidenceClass:Readonly<Record<StorefrontVisualDiffEvidenceClass,number>>;
    byRepairability:Readonly<Record<StorefrontVisualDiffRepairability,number>>;
    byVisualState:Readonly<Record<StorefrontVisualDiffManifestCase['visual']['state'],number>>;
  };
};

const manifestIssue=(code:StorefrontVisualDiffManifestIssue['code'],path:string,message:string):StorefrontVisualDiffManifestIssue=>({code,path,message,severity:'error'});

const knownRuntimeCategory:Readonly<Record<string,string>>=Object.freeze({
  HORIZONTAL_OVERFLOW:'layout-overflow',
  UNBOUNDED_PROTRUSION:'layout-protrusion',
  BROKEN_IMAGES:'media-broken',
  HEADER_CARDINALITY:'shell-cardinality',
  SHELL_SECTION_COUNT:'shell-cardinality',
  MOBILE_MENU_CARDINALITY:'mobile-navigation',
  MOBILE_DESKTOP_NAV_LEAK:'mobile-navigation',
  TOUCH_TARGET_MINIMUM:'touch-target',
  TOUCH_TARGET_RECOMMENDED:'touch-target',
  TEXT_CLIPPING_REVIEW:'text-clipping',
  SOCIAL_LINK_INTEGRITY:'social-integrity',
  COOKIE_SURFACE_CARDINALITY:'shell-cardinality',
  COOKIE_TEMPLATE_AUTHORITY:'shell-authority',
  COOKIE_TEMPLATE_PRESET_REQUIRED:'shell-authority',
  COOKIE_TEMPLATE_LAYOUT_REQUIRED:'shell-authority',
  COOKIE_SURFACE_NOT_VISIBLE:'shell-visibility',
});

const rawPrefix=(value:string)=>{
  const index=value.indexOf(':');
  return(index<0?value:value.slice(0,index)).trim();
};

function manifestRawDiagnostic(raw:string,severity:'error'|'warning'):StorefrontVisualDiffManifestDiagnostic|null{
  const prefix=rawPrefix(raw);
  if(prefix==='GOLDEN_DIFF'||prefix==='GOLDEN_BASELINE_MISSING')return null;
  const category=knownRuntimeCategory[prefix];
  if(category){
    return{
      code:prefix,
      severity,
      evidenceClass:'runtime-structured',
      category,
      repairability:'structured-diagnostic',
      raw,
      structuredCause:true,
    };
  }
  return{
    code:prefix||'UNKNOWN_GATE_EVIDENCE',
    severity,
    evidenceClass:'unclassified',
    category:'unclassified-gate-evidence',
    repairability:'none',
    raw,
    structuredCause:false,
  };
}

function manifestGoldenStatus(row:EvidenceCase):StorefrontVisualDiffManifestCase['visual']['goldenStatus']{
  const status=row.golden?.status;
  return status==='pass'||status==='fail'||status==='missing'||status==='dimension-mismatch'?status:'unknown';
}

function manifestVisualDiagnostic(row:EvidenceCase):StorefrontVisualDiffManifestDiagnostic|null{
  const status=manifestGoldenStatus(row);
  if(status==='pass')return null;
  if(status==='fail'){
    return{
      code:'VISUAL_PIXEL_DRIFT',
      severity:'error',
      evidenceClass:'visual-unlocalized',
      category:'visual-baseline-drift',
      repairability:'manual-review',
      raw:'GOLDEN_DIFF:'+String(finiteNumber(row.golden?.mismatchRatio)??'unknown'),
      structuredCause:false,
    };
  }
  if(status==='dimension-mismatch'){
    return{
      code:'VISUAL_DIMENSION_MISMATCH',
      severity:'error',
      evidenceClass:'visual-unlocalized',
      category:'visual-dimension-mismatch',
      repairability:'manual-review',
      raw:'GOLDEN_DIMENSION_MISMATCH',
      structuredCause:false,
    };
  }
  if(status==='missing'){
    return{
      code:'VISUAL_BASELINE_MISSING',
      severity:'warning',
      evidenceClass:'evidence-integrity',
      category:'visual-baseline-missing',
      repairability:'manual-review',
      raw:'GOLDEN_BASELINE_MISSING',
      structuredCause:false,
    };
  }
  return{
    code:'VISUAL_GOLDEN_EVIDENCE_UNKNOWN',
    severity:'error',
    evidenceClass:'evidence-integrity',
    category:'visual-golden-evidence-unknown',
    repairability:'none',
    raw:'GOLDEN_EVIDENCE_UNKNOWN',
    structuredCause:false,
  };
}

function strictRegion(value:unknown):{x:number;y:number;width:number;height:number}|null{
  if(!isRecord(value))return null;
  const x=finiteNumber(value.x),y=finiteNumber(value.y),width=finiteNumber(value.width),height=finiteNumber(value.height);
  return x===null||y===null||width===null||height===null?null:{x,y,width,height};
}

function strictDimensions(value:unknown):{width:number;height:number}|null{
  if(!isRecord(value))return null;
  const width=finiteNumber(value.width),height=finiteNumber(value.height);
  return width===null||height===null?null:{width,height};
}

function canonicalPageType(value:string):StorefrontBuilderPageType|null{
  return STOREFRONT_PAGE_TYPES.includes(value as StorefrontBuilderPageType)?value as StorefrontBuilderPageType:null;
}

function manifestCaseResult(row:EvidenceCase,pageType:StorefrontBuilderPageType,viewport:StorefrontViewport):StorefrontVisualDiffManifestCase{
  const diagnostics:StorefrontVisualDiffManifestDiagnostic[]=[];
  const visualDiagnostic=manifestVisualDiagnostic(row);
  if(visualDiagnostic)diagnostics.push(visualDiagnostic);
  for(const raw of row.errors){
    const diagnostic=manifestRawDiagnostic(raw,'error');
    if(diagnostic)diagnostics.push(diagnostic);
  }
  for(const raw of row.warnings){
    const diagnostic=manifestRawDiagnostic(raw,'warning');
    if(diagnostic)diagnostics.push(diagnostic);
  }
  const classification=classifyCase(row);
  const local=isRecord(row.golden?.local)?row.golden?.local:null;
  return Object.freeze({
    pageType,
    viewport,
    provenance:{
      evidenceExecution:row.evidenceExecution,
      sourceCommit:row.sourceCommit,
      originSourceCommit:row.originSourceCommit??null,
      pageFingerprint:row.pageFingerprint,
      caseFingerprint:row.caseFingerprint,
      fingerprintEquivalent:row.evidenceExecution==='REUSED'&&row.reuseProof?.fingerprintEquivalent===true,
    },
    visual:{
      goldenStatus:manifestGoldenStatus(row),
      state:row.golden?classification.state:'unverified',
      mismatchRatio:classification.mismatchRatio,
      globalPassed:classification.globalPassed,
      localPassed:classification.localPassed,
      peakMismatchRatio:classification.peakMismatchRatio,
      peakMismatchPixels:finiteNumber(local?.peakMismatchPixels),
      peakRegion:strictRegion(local?.peakRegion),
      actualDimensions:strictDimensions(row.golden?.actual),
      baselineDimensions:strictDimensions(row.golden?.baseline),
    },
    diagnostics:Object.freeze(diagnostics),
    clean:diagnostics.length===0,
  });
}

function emptyManifestSummary():StorefrontVisualDiffManifestResult['summary']{
  return{
    diagnostics:0,
    bySeverity:{error:0,warning:0},
    byEvidenceClass:{
      'runtime-structured':0,
      'visual-unlocalized':0,
      'evidence-integrity':0,
      unclassified:0,
    },
    byRepairability:{
      'structured-diagnostic':0,
      'manual-review':0,
      none:0,
    },
    byVisualState:{
      'exact-match':0,
      'bounded-drift':0,
      'blocking-drift':0,
      'no-baseline':0,
      unverified:0,
    },
  };
}

export async function inspectStorefrontVisualDiffManifestIntelligence(input:{
  templateKey:string;
  templateVersion:number;
  exactSourceCommit:string;
  evidence:unknown;
}):Promise<StorefrontVisualDiffManifestResult>{
  const issues:StorefrontVisualDiffManifestIssue[]=[];
  const target={templateKey:input.templateKey,templateVersion:input.templateVersion,sourceCommit:input.exactSourceCommit};
  const failEnvelope=(code:StorefrontVisualDiffManifestIssue['code'],path:string,message:string):StorefrontVisualDiffManifestResult=>Object.freeze({
    contract:STOREFRONT_VISUAL_DIFF_INTELLIGENCE_VERSION,
    evidenceContract:STOREFRONT_VISUAL_DIFF_EVIDENCE_CONTRACT,
    target,
    valid:false,
    clean:false,
    expectedCaseCount:STOREFRONT_PAGE_TYPES.length*STOREFRONT_VIEWPORTS.length,
    observedCaseCount:0,
    auxiliaryCaseCount:0,
    cases:Object.freeze([]),
    issues:Object.freeze([manifestIssue(code,path,message)]),
    summary:Object.freeze(emptyManifestSummary()),
  });

  if(!exactCommit(input.exactSourceCommit)){
    return failEnvelope('VISUAL_DIFF_MANIFEST_SOURCE_STALE','exactSourceCommit','Visual Diff manifest analysis requires an exact 40-character source commit.');
  }
  if(!isRecord(input.evidence)){
    return failEnvelope('VISUAL_DIFF_MANIFEST_CONTRACT_INVALID','evidence','Visual Diff manifest evidence must be an object.');
  }
  const evidence=input.evidence;
  if(evidence.contract!==STOREFRONT_VISUAL_DIFF_EVIDENCE_CONTRACT){
    return failEnvelope('VISUAL_DIFF_MANIFEST_CONTRACT_INVALID','evidence.contract','Visual Diff Core requires the canonical Template Factory quality evidence contract.');
  }
  if(evidence.reconciliationContract!==STOREFRONT_VISUAL_DIFF_RECONCILIATION_CONTRACT){
    return failEnvelope('VISUAL_DIFF_MANIFEST_RECONCILIATION_INVALID','evidence.reconciliationContract','Visual Diff Core requires the canonical Template Factory reconciliation contract.');
  }
  if(evidence.complete!==true){
    return failEnvelope('VISUAL_DIFF_MANIFEST_INCOMPLETE','evidence.complete','Visual Diff evidence manifest must be complete.');
  }
  if(evidence.sourceCommit!==input.exactSourceCommit){
    return failEnvelope('VISUAL_DIFF_MANIFEST_SOURCE_STALE','evidence.sourceCommit','Visual Diff evidence manifest is stale for the requested exact source commit.');
  }
  if(!nonEmptyString(evidence.checksum)){
    return failEnvelope('VISUAL_DIFF_MANIFEST_CHECKSUM_INVALID','evidence.checksum','Visual Diff evidence checksum is missing.');
  }
  const checksumPayload:{[key:string]:unknown}={...evidence};
  delete checksumPayload.checksum;
  if(evidence.checksum!==await sha256StorefrontCanonicalJson(checksumPayload)){
    return failEnvelope('VISUAL_DIFF_MANIFEST_CHECKSUM_INVALID','evidence.checksum','Visual Diff evidence checksum does not match the canonical payload.');
  }
  if(!Array.isArray(evidence.cases)){
    return failEnvelope('VISUAL_DIFF_MANIFEST_CONTRACT_INVALID','evidence.cases','Visual Diff evidence cases are missing.');
  }

  const fingerprints=isRecord(evidence.templatePageFingerprints)?evidence.templatePageFingerprints:null;
  const targetFingerprintEntry=fingerprints&&isRecord(fingerprints[input.templateKey])?fingerprints[input.templateKey]:null;
  if(!targetFingerprintEntry){
    issues.push(manifestIssue('VISUAL_DIFF_TEMPLATE_FINGERPRINTS_MISSING','evidence.templatePageFingerprints','Target template page fingerprints are required.'));
  }else if(targetFingerprintEntry.templateVersion!==input.templateVersion){
    issues.push(manifestIssue('VISUAL_DIFF_TEMPLATE_FINGERPRINT_VERSION_DRIFT','evidence.templatePageFingerprints.'+input.templateKey+'.templateVersion','Target template fingerprint version is stale.'));
  }
  const pageFingerprints=targetFingerprintEntry&&isRecord(targetFingerprintEntry.pages)?targetFingerprintEntry.pages:null;

  const matrix=new Map<string,{raw:unknown;index:number}[]>();
  let auxiliaryCaseCount=0;
  for(const[index,raw]of evidence.cases.entries()){
    if(!isRecord(raw))continue;
    if(raw.templateKey===input.templateKey&&Number.isInteger(raw.templateVersion)&&raw.templateVersion!==input.templateVersion&&canonicalPageType(String(raw.pageType??''))&&STOREFRONT_VIEWPORTS.includes(raw.viewport as StorefrontViewport)){
      issues.push(manifestIssue('VISUAL_DIFF_MATRIX_FOREIGN_VERSION','evidence.cases['+index+'].templateVersion','Target template evidence contains a foreign template version.'));
    }
    if(raw.templateKey!==input.templateKey||raw.templateVersion!==input.templateVersion)continue;
    const pageType=canonicalPageType(String(raw.pageType??''));
    const viewport=STOREFRONT_VIEWPORTS.includes(raw.viewport as StorefrontViewport)?raw.viewport as StorefrontViewport:null;
    if(!pageType||!viewport){
      auxiliaryCaseCount+=1;
      continue;
    }
    const key=pageType+':'+viewport;
    const bucket=matrix.get(key)??[];
    bucket.push({raw,index});
    matrix.set(key,bucket);
  }

  const cases:StorefrontVisualDiffManifestCase[]=[];
  for(const pageType of STOREFRONT_PAGE_TYPES){
    const currentPageFingerprint=pageFingerprints&&nonEmptyString(pageFingerprints[pageType])?pageFingerprints[pageType]:null;
    if(!currentPageFingerprint){
      issues.push(manifestIssue('VISUAL_DIFF_MANIFEST_PAGE_FINGERPRINT_MISSING','evidence.templatePageFingerprints.'+input.templateKey+'.pages.'+pageType,'Every canonical page requires a current page fingerprint.'));
    }
    for(const viewport of STOREFRONT_VIEWPORTS){
      const key=pageType+':'+viewport;
      const bucket=matrix.get(key)??[];
      if(bucket.length===0){
        issues.push(manifestIssue('VISUAL_DIFF_MATRIX_CASE_MISSING','evidence.cases.'+key,'Canonical page×viewport evidence case is missing.'));
        continue;
      }
      if(bucket.length!==1){
        issues.push(manifestIssue('VISUAL_DIFF_MATRIX_CASE_DUPLICATE','evidence.cases.'+key,'Canonical page×viewport evidence case must exist exactly once.'));
        continue;
      }
      const entry=bucket[0]!;
      const row=parseCase(entry.raw);
      if(!row){
        issues.push(manifestIssue('VISUAL_DIFF_MATRIX_CASE_INVALID','evidence.cases['+entry.index+']','Canonical matrix case has an invalid evidence shape.'));
        continue;
      }
      if(row.sourceCommit!==input.exactSourceCommit){
        issues.push(manifestIssue('VISUAL_DIFF_MATRIX_CASE_SOURCE_STALE','evidence.cases['+entry.index+'].sourceCommit','Case source identity is stale.'));
      }
      if(!currentPageFingerprint||row.pageFingerprint!==currentPageFingerprint){
        issues.push(manifestIssue('VISUAL_DIFF_MATRIX_PAGE_FINGERPRINT_DRIFT','evidence.cases['+entry.index+'].pageFingerprint','Case page fingerprint does not match current manifest provenance.'));
      }
      if(row.evidenceExecution==='REUSED'){
        const reuse=row.reuseProof;
        if(!reuse||reuse.fingerprintEquivalent!==true||reuse.currentFingerprint!==row.pageFingerprint||!nonEmptyString(reuse.previousFingerprint)||!exactCommit(reuse.previousSourceCommit)){
          issues.push(manifestIssue('VISUAL_DIFF_MATRIX_REUSE_PROOF_INVALID','evidence.cases['+entry.index+'].reuseProof','REUSED evidence requires a coherent fingerprint-equivalence chain.'));
        }
      }else if(row.reuseProof){
        issues.push(manifestIssue('VISUAL_DIFF_MATRIX_RERUN_REUSE_PROOF_INVALID','evidence.cases['+entry.index+'].reuseProof','RERUN evidence cannot masquerade as reused evidence.'));
      }
      if(!row.golden){
        issues.push(manifestIssue('VISUAL_DIFF_MATRIX_GOLDEN_EVIDENCE_MISSING','evidence.cases['+entry.index+'].golden','Canonical matrix case requires golden evidence.'));
      }
      cases.push(manifestCaseResult(row,pageType,viewport));
    }
  }

  const summary=emptyManifestSummary();
  for(const row of cases){
    summary.byVisualState[row.visual.state]+=1;
    for(const diagnostic of row.diagnostics){
      summary.diagnostics+=1;
      summary.bySeverity[diagnostic.severity]+=1;
      summary.byEvidenceClass[diagnostic.evidenceClass]+=1;
      summary.byRepairability[diagnostic.repairability]+=1;
    }
  }
  const expectedCaseCount=STOREFRONT_PAGE_TYPES.length*STOREFRONT_VIEWPORTS.length;
  const valid=issues.length===0&&cases.length===expectedCaseCount;
  const clean=valid&&cases.every(row=>row.clean);
  return deepFreeze({
    contract:STOREFRONT_VISUAL_DIFF_INTELLIGENCE_VERSION,
    evidenceContract:STOREFRONT_VISUAL_DIFF_EVIDENCE_CONTRACT,
    target,
    valid,
    clean,
    expectedCaseCount,
    observedCaseCount:cases.length,
    auxiliaryCaseCount,
    cases:Object.freeze(cases),
    issues:Object.freeze(issues),
    summary:Object.freeze(summary),
  });
}

