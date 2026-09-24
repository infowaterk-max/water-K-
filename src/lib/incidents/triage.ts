import failureSignaturesJson from '../../../quality/knowledge/failure-signatures.v1.json';
import type{IncidentCategory,IncidentImpact}from'./contracts';

export type IncidentOwnership='merchant'|'platform'|'shared'|'undetermined';
export type IncidentSeverity='low'|'normal'|'high'|'critical';
export type IncidentTriageStatus='triaged'|'merchant_action'|'platform_investigation'|'auto_healing'|'repair_proposed'|'resolved'|'rejected';
export type IncidentTriageConfidence='low'|'medium'|'high'|'deterministic';

type SignatureRule={match:'exact'|'prefix';pattern:string;failureId:string};
const signatures=(failureSignaturesJson as {rules:SignatureRule[];genericCodes:string[]});
const genericCodes=new Set(signatures.genericCodes);

export type IncidentTriageInput={
  source:'customer'|'merchant'|'system'|'observability';
  category:IncidentCategory;
  impact?:IncidentImpact;
  errorCode?:string|null;
  knownFailureId?:string|null;
};

export type IncidentTriageDecision={
  ownership:IncidentOwnership;
  reasonCode:string;
  status:IncidentTriageStatus;
  severity:IncidentSeverity;
  confidence:IncidentTriageConfidence;
  knownFailureId:string|null;
  authorityHint:string;
};

export function matchKnownFailureSignature(raw?:string|null){
  const code=raw?.trim();
  if(!code)return null;
  for(const rule of signatures.rules){
    if(rule.match==='exact'&&code===rule.pattern)return rule.failureId;
    if(rule.match==='prefix'&&code.startsWith(rule.pattern))return rule.failureId;
  }
  return null;
}

const severityFor=(category:IncidentCategory,impact:IncidentImpact='single'):IncidentSeverity=>{
  if(impact==='security'||category==='security')return'high';
  if(impact==='all'||impact==='checkout_blocked')return'high';
  if(impact==='multiple')return'normal';
  if(category==='data'||category==='payment')return'normal';
  return category==='content'||category==='catalog'?'low':'normal';
};

export function triageIncident(input:IncidentTriageInput):IncidentTriageDecision{
  const matched=input.knownFailureId?.trim()||matchKnownFailureSignature(input.errorCode);
  const severity=severityFor(input.category,input.impact);
  if(matched)return{ownership:'platform',reasonCode:'KNOWN_FAILURE_MATCH',status:'platform_investigation',severity,confidence:'deterministic',knownFailureId:matched,authorityHint:'shoperation.known-failure'};

  const errorCode=input.errorCode?.trim();
  if(errorCode&&genericCodes.has(errorCode))return{ownership:'platform',reasonCode:'ENGINEERING_FAILURE_SIGNAL',status:'platform_investigation',severity,confidence:'high',knownFailureId:null,authorityHint:'shoperation.engineering-runtime'};

  if(input.category==='content')return{ownership:'merchant',reasonCode:'MERCHANT_CONTENT_AUTHORITY',status:'merchant_action',severity,confidence:'high',knownFailureId:null,authorityHint:'merchant.content'};
  if(input.category==='catalog')return{ownership:'merchant',reasonCode:'MERCHANT_CATALOG_AUTHORITY',status:'merchant_action',severity,confidence:'high',knownFailureId:null,authorityHint:'merchant.catalog'};
  if(input.category==='ui')return{ownership:'platform',reasonCode:'PLATFORM_UI_AUTHORITY',status:'platform_investigation',severity,confidence:'high',knownFailureId:null,authorityHint:'shoperation.storefront-ui'};
  if(input.category==='account')return{ownership:'platform',reasonCode:'PLATFORM_ACCOUNT_AUTHORITY',status:'platform_investigation',severity,confidence:'high',knownFailureId:null,authorityHint:'shoperation.customer-account'};
  if(input.category==='performance')return{ownership:'platform',reasonCode:'PLATFORM_RUNTIME_AUTHORITY',status:'platform_investigation',severity,confidence:'high',knownFailureId:null,authorityHint:'shoperation.runtime'};
  if(input.category==='security')return{ownership:'platform',reasonCode:'PLATFORM_SECURITY_AUTHORITY',status:'platform_investigation',severity:'high',confidence:'high',knownFailureId:null,authorityHint:'shoperation.security'};
  if(input.category==='data')return{ownership:'platform',reasonCode:'PLATFORM_DATA_AUTHORITY',status:'platform_investigation',severity,confidence:'high',knownFailureId:null,authorityHint:'shoperation.data'};
  if(['commerce','payment','shipping','integration'].includes(input.category))return{ownership:'shared',reasonCode:'SHARED_COMMERCE_OR_INTEGRATION_BOUNDARY',status:'triaged',severity,confidence:'medium',knownFailureId:null,authorityHint:'shared.commerce-integration'};
  return{ownership:'undetermined',reasonCode:'NEEDS_ENGINEERING_REVIEW',status:'triaged',severity,confidence:'low',knownFailureId:null,authorityHint:'unresolved'};
}
