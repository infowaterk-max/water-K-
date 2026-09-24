import globalKnowledgeJson from '../../../quality/knowledge/shoperation-quality-knowledge.v1.json';
import intakeLedgerJson from '../../../quality/knowledge/failure-intake-ledger.v1.json';
import {TEMPLATE_FACTORY_AUTHORITY_GRAPH,TEMPLATE_FACTORY_KNOWN_FAILURES} from '@/lib/builder/template-factory/knowledge-registry';

export const SHOPERATION_QUALITY_KNOWLEDGE_VERSION='shoporation.quality-knowledge.v1' as const;
export type ShoperationFailureLifecycle='candidate'|'active'|'superseded'|'deprecated';
export type ShoperationRemediationPolicy='shared-root-cause-required'|'shared-invariant-preferred';
export type ShoperationFailureApplicability={mode:'always'|'subsystem';subsystems:readonly string[]};
export type ShoperationKnownFailure={id:string;provider:'global'|'template-factory';title:string;symptom:string;rootCause:string;occurrences:number;automatable:boolean;remediationPolicy:ShoperationRemediationPolicy;lifecycle:ShoperationFailureLifecycle;invariantIds:readonly string[];regressionTests:readonly string[];sourceRecords:readonly string[];applicability:ShoperationFailureApplicability;};

type GlobalKnowledgeShape={contract:string;version:number;authorityRules:readonly {id:string;subject:string;rule:string}[];globalBaselineFailureIds:readonly string[];knownFailures:readonly Omit<ShoperationKnownFailure,'provider'>[];templateFactoryFailureApplicability:Readonly<Record<string,readonly string[]>>;negativeKnowledge:readonly {id:string;rule:string;sourceRecords:readonly string[]}[];};
type IntakeLedgerShape={contract:string;records:readonly {candidateId:string;classificationStatus:string;disposition?:string|null}[];};
const GLOBAL_KNOWLEDGE=globalKnowledgeJson as unknown as GlobalKnowledgeShape;
const INTAKE_LEDGER=intakeLedgerJson as unknown as IntakeLedgerShape;

export const SHOPERATION_GLOBAL_AUTHORITY_GRAPH=Object.freeze([...GLOBAL_KNOWLEDGE.authorityRules]);
export const SHOPERATION_NEGATIVE_KNOWLEDGE=Object.freeze([...GLOBAL_KNOWLEDGE.negativeKnowledge]);
export const SHOPERATION_GLOBAL_BASELINE_FAILURE_IDS=Object.freeze([...GLOBAL_KNOWLEDGE.globalBaselineFailureIds]);
export const SHOPERATION_GLOBAL_KNOWN_FAILURES:readonly ShoperationKnownFailure[]=Object.freeze(GLOBAL_KNOWLEDGE.knownFailures.map(item=>Object.freeze({...item,provider:'global' as const})));
export const SHOPERATION_TEMPLATE_FACTORY_KNOWN_FAILURES:readonly ShoperationKnownFailure[]=Object.freeze(TEMPLATE_FACTORY_KNOWN_FAILURES.map(item=>Object.freeze({...item,provider:'template-factory' as const,lifecycle:'active' as const,sourceRecords:Object.freeze(['src/lib/builder/template-factory/knowledge-registry.ts']),applicability:Object.freeze({mode:'subsystem' as const,subsystems:Object.freeze([...(GLOBAL_KNOWLEDGE.templateFactoryFailureApplicability[item.id]??[])])})})));
export const SHOPERATION_KNOWN_FAILURES:readonly ShoperationKnownFailure[]=Object.freeze([...SHOPERATION_GLOBAL_KNOWN_FAILURES,...SHOPERATION_TEMPLATE_FACTORY_KNOWN_FAILURES]);

export function getShoperationKnownFailure(id:string){return SHOPERATION_KNOWN_FAILURES.find(item=>item.id===id)??null;}
export function getShoperationUnresolvedFailureIntake(){return Object.freeze(INTAKE_LEDGER.records.filter(item=>['candidate-new-failure','needs-review'].includes(item.classificationStatus)&&!item.disposition));}

export function evaluateShoperationKnowledgeIntegrity(){
  const issues:{code:string;path:string;message:string}[]=[];
  const authorityIds=new Set([...SHOPERATION_GLOBAL_AUTHORITY_GRAPH.map(item=>item.id),...TEMPLATE_FACTORY_AUTHORITY_GRAPH.map(item=>item.id)]);
  const failureIds=new Set<string>();
  for(const failure of SHOPERATION_KNOWN_FAILURES){
    if(failureIds.has(failure.id))issues.push({code:'SQ_KNOWLEDGE_DUPLICATE_FAILURE_ID',path:failure.id,message:'Known Failure IDs must be globally unique.'});
    failureIds.add(failure.id);
    if(!failure.invariantIds.length)issues.push({code:'SQ_KNOWLEDGE_INVARIANT_REQUIRED',path:failure.id,message:'Every learned failure needs an authority invariant.'});
    if(!failure.regressionTests.length)issues.push({code:'SQ_KNOWLEDGE_REGRESSION_REQUIRED',path:failure.id,message:'Every learned failure needs regression authority.'});
    for(const invariantId of failure.invariantIds)if(!authorityIds.has(invariantId))issues.push({code:'SQ_KNOWLEDGE_DANGLING_INVARIANT',path:`${failure.id}.${invariantId}`,message:'Failure references an unknown invariant.'});
    if(failure.applicability.mode==='subsystem'&&!failure.applicability.subsystems.length)issues.push({code:'SQ_KNOWLEDGE_APPLICABILITY_REQUIRED',path:failure.id,message:'Subsystem-scoped failures need at least one applicable subsystem.'});
    if(failure.occurrences>=2&&failure.remediationPolicy!=='shared-root-cause-required')issues.push({code:'SQ_KNOWLEDGE_RECURRING_SHARED_FIX_REQUIRED',path:failure.id,message:'Recurring failures require shared-root-cause remediation.'});
  }
  for(const id of SHOPERATION_GLOBAL_BASELINE_FAILURE_IDS)if(!failureIds.has(id))issues.push({code:'SQ_KNOWLEDGE_DANGLING_BASELINE_FAILURE',path:id,message:'Global baseline references an unknown failure.'});
  for(const rule of SHOPERATION_NEGATIVE_KNOWLEDGE)if(!rule.sourceRecords.length)issues.push({code:'SQ_NEGATIVE_KNOWLEDGE_SOURCE_REQUIRED',path:rule.id,message:'Negative knowledge must retain its evidence source.'});
  const unresolved=INTAKE_LEDGER.records.filter(item=>['candidate-new-failure','needs-review'].includes(item.classificationStatus)&&!item.disposition);
  return Object.freeze({contract:'shoporation.quality-knowledge-integrity.v1' as const,knowledgeVersion:SHOPERATION_QUALITY_KNOWLEDGE_VERSION,knownFailureIds:Object.freeze([...failureIds]),authorityRuleIds:Object.freeze([...authorityIds]),unresolvedCandidates:Object.freeze([...unresolved]),issues:Object.freeze(issues),ok:issues.length===0});
}
