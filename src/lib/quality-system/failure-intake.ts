import signaturesJson from '../../../../quality/knowledge/failure-signatures.v1.json';
import ledgerJson from '../../../../quality/knowledge/failure-intake-ledger.v1.json';
import {getShoperationKnownFailure} from '@/lib/quality-system/shoperation-knowledge';

export type ShoperationFailureClassification='matched-known-failure'|'candidate-new-failure'|'template-specific'|'duplicate'|'rejected'|'needs-review';
export type ShoperationFailureSignal={sourceCommit:string|null;failureSource:string;rawErrorCode:string;symptom:string;evidence:readonly string[];templateKey?:string|null;templateVersion?:number|null;foundationTemplate?:string|null;page?:string|null;route?:string|null;viewport?:string|null;rootCauseArea?:string|null;};
export type ShoperationFailureIntakeRecord=ShoperationFailureSignal&{contract:'shoporation.failure-intake.v1';candidateId:string;knownFailureId:string|null;authorityInvariantIds:readonly string[];classificationStatus:ShoperationFailureClassification;};
type SignatureContract={rules:readonly {match:'exact'|'prefix'|'contains';pattern:string;failureId:string}[];genericCodes:readonly string[];};
const signatures=signaturesJson as unknown as SignatureContract;
const ledger=ledgerJson as unknown as {records:readonly {candidateId:string;classificationStatus:string;disposition?:string|null}[]};
const normalize=(value:string)=>value.trim().replace(/\s+/g,' ').slice(0,600);
const fingerprint=(value:string)=>{let hash=2166136261;for(let i=0;i<value.length;i+=1){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');};
const matchingRule=(raw:string)=>signatures.rules.find(rule=>rule.match==='exact'?raw===rule.pattern:rule.match==='prefix'?raw.startsWith(rule.pattern):raw.includes(rule.pattern));

export function classifyShoperationFailureSignal(signal:ShoperationFailureSignal):ShoperationFailureIntakeRecord{
  const rawErrorCode=normalize(signal.rawErrorCode),rule=matchingRule(rawErrorCode),known=rule?getShoperationKnownFailure(rule.failureId):null,generic=signatures.genericCodes.includes(rawErrorCode);
  const classificationStatus:ShoperationFailureClassification=known?'matched-known-failure':generic?'needs-review':'candidate-new-failure';
  const key=[signal.failureSource,rawErrorCode,signal.templateKey??'',signal.page??'',signal.viewport??''].join('|');
  return Object.freeze({...signal,contract:'shoporation.failure-intake.v1',rawErrorCode,symptom:normalize(signal.symptom),evidence:Object.freeze(signal.evidence.map(normalize)),candidateId:`SQ-CAND-${fingerprint(key)}`,knownFailureId:known?.id??null,authorityInvariantIds:Object.freeze([...(known?.invariantIds??[])]),classificationStatus});
}
export function isUnresolvedFailureIntake(record:{classificationStatus:string;disposition?:string|null}){return ['candidate-new-failure','needs-review'].includes(record.classificationStatus)&&!record.disposition;}
export function getCommittedUnresolvedFailureIntake(){return Object.freeze(ledger.records.filter(isUnresolvedFailureIntake));}
