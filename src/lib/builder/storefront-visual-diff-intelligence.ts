import {STOREFRONT_VIEWPORTS,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
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
    local?:{
      passed?:boolean;
      peakMismatchRatio?:number;
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
