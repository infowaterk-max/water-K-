import {readFileSync} from 'node:fs';
import {RELEASE_PARENT_CLOSURE_CONTEXT_CONTRACT,buildReleaseParentClosureProofArtifactFromContext,releaseParentClosureProofArtifactPath,validateReleaseParentClosureProofPlan} from './shoperation-release-unit-runtime.mjs';

const asArray=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'&&value.trim().length>0;
const uniq=values=>new Set(values).size===values.length;
const statusOf=value=>String(value??'').trim().toLowerCase().replaceAll(' ','_');
const PASS=new Set(['pass','passed','success','succeeded','ok','green']);
const FAIL=new Set(['fail','failed','failure','error']);
const BLOCKED=new Set(['block','blocked','cancelled','canceled','timed_out','action_required']);
const MISSING=new Set(['','missing','unknown','skipped','neutral','pending']);

export const COMPLETION_INTERNAL_STATES=Object.freeze(['VERIFIED_DONE','PARTIALLY_VERIFIED','NOT_DONE','BLOCKED','STALE_EVIDENCE','OVERCLAIM','UNKNOWN']);
export const COMPLETION_PO_STATES=Object.freeze(['DONE','NOT_DONE','BLOCKED']);
export const PROOF_SEMANTIC_STATES=Object.freeze(['VERIFIED','PARTIAL','MISSING','STALE','FAILED','OVERCLAIM','UNKNOWN']);

function issue(issues,code,path,message,extra={}){issues.push({code,path,message,...extra});}
const VACUOUS=/^(?:x|xx+|todo|tbd|n\/a|na|none|unknown|placeholder|later|fixme|pass|ok|done)$/i;
function meaningful(value,{minChars=18,minWords=3}={}){
  if(!text(value))return false;
  const v=value.trim();
  if(VACUOUS.test(v)||/^(?:TODO|TBD|FIXME|PLACEHOLDER)\b\s*[:=-]?/i.test(v))return false;
  const words=v.split(/\s+/).filter(Boolean);
  if(v.length<minChars||words.length<minWords)return false;
  if(words.length>1&&new Set(words.map(word=>word.toLowerCase())).size===1)return false;
  return true;
}
function semanticListIssues(issues,values,path,label,options={}){
  for(const [index,value] of asArray(values).entries())if(!meaningful(value,options))issue(issues,'DEV_PLAN_SEMANTIC_CONTENT_VACUOUS',`${path}.${index}`,`${label} must carry falsifiable engineering meaning; placeholders, one-token claims and TODO text are forbidden.`,{actual:value??null});
}
function normalizedSemanticText(value){
  return String(value??'').toLowerCase().replace(/[^a-z0-9áéíóöőúüű]+/gi,' ').replace(/\s+/g,' ').trim();
}
function semanticallyTautological(a,b){
  const left=normalizedSemanticText(a),right=normalizedSemanticText(b);
  if(!left||!right)return false;
  if(left===right)return true;
  const min=Math.min(left.length,right.length),max=Math.max(left.length,right.length);
  return min>=30&&min/max>=0.85&&(left.includes(right)||right.includes(left));
}
const GUARD_REGISTRY=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const CAPABILITY_REGISTRY=JSON.parse(readFileSync('quality/knowledge/capability-registry.v1.json','utf8'));
const KNOWN_CAPABILITIES=new Set((CAPABILITY_REGISTRY.capabilities??[]).map(item=>item.id));
const CANONICAL_EVIDENCE_SEMANTICS=Object.freeze(Object.fromEntries(
  (GUARD_REGISTRY.guards??[])
    .filter(item=>item?.proofSemantics)
    .map(item=>{
      const semantic=item.proofSemantics;
      const capabilities=Array.isArray(semantic.capabilities)?semantic.capabilities:[];
      for(const capability of capabilities)if(capability!=='*'&&!KNOWN_CAPABILITIES.has(capability))throw new Error(`PROOF_SEMANTICS_UNKNOWN_CAPABILITY:${item.id}:${capability}`);
      if(!Number.isFinite(Number(semantic.scopeStrength))||Number(semantic.scopeStrength)<1)throw new Error(`PROOF_SEMANTICS_INVALID_SCOPE_STRENGTH:${item.id}`);
      if(!Array.isArray(semantic.dimensions)||!semantic.dimensions.length)throw new Error(`PROOF_SEMANTICS_DIMENSIONS_REQUIRED:${item.id}`);
      return[item.id,{
        producer:item.producer??'unknown',
        capabilities,
        scopeStrength:Number(semantic.scopeStrength),
        scope:String(semantic.scope??'unknown'),
        dimensions:[...semantic.dimensions],
      }];
    })
));
function claimStrength(req){
  const declared=Number(req?.claimScope?.strength);
  if(Number.isFinite(declared)&&declared>=1)return Math.min(4,Math.max(1,declared));
  const breadth=String(req?.claimScope?.breadth??'').toLowerCase();
  const prose=String(req?.requirement??'').toLowerCase();
  if(/repository|entire|every affected|every impacted|all affected|all impacted|teljes kódbázis|minden érintett/.test(breadth+' '+prose))return 4;
  if(/actual-domain-imports|architecture|cross-domain|whole-system|system-wide/.test(breadth))return 3;
  if(breadth)return 2;
  return 1;
}
function evidenceSemantics(item,id){
  const semantic=item?.semantics??item?.evidenceSemantics??null;
  const knownProducer=Boolean(CANONICAL_EVIDENCE_SEMANTICS[id]);
  const fallback=CANONICAL_EVIDENCE_SEMANTICS[id]??{producer:'unknown',capabilities:[],scopeStrength:0,scope:'unknown',dimensions:[]};
  if(!semantic)return{
    ...fallback,
    classification:item?.classification??(knownProducer?'integration':'legacy-derived'),
    structured:knownProducer,
    semanticSource:knownProducer?'canonical-producer-contract':'unstructured-evidence',
    whatItProves:knownProducer?`${fallback.producer} PASS within ${fallback.scope} on the recorded exact state.`:null,
    whatItDoesNotProve:[knownProducer?'Claims outside the producer scope or stronger than its declared scopeStrength.':'Evidence producer did not emit explicit semantic scope.'],
    confidence:knownProducer?0.9:0,
    negativeEvidence:[],
    dependencies:[],
  };
  const strength=Number(semantic.scopeStrength);
  return{
    producer:semantic.producer??fallback.producer,
    capabilities:Array.isArray(semantic.capabilities)?semantic.capabilities:fallback.capabilities,
    scopeStrength:Number.isFinite(strength)?strength:fallback.scopeStrength,
    scope:semantic.scope??fallback.scope,
    dimensions:Array.isArray(semantic.dimensions)?semantic.dimensions:fallback.dimensions,
    classification:semantic.classification??item?.classification??'unspecified',
    structured:true,
    semanticSource:'explicit-evidence',
    whatItProves:semantic.whatItProves??null,
    whatItDoesNotProve:Array.isArray(semantic.whatItDoesNotProve)?semantic.whatItDoesNotProve:[],
    confidence:Number.isFinite(Number(semantic.confidence))?Number(semantic.confidence):null,
    negativeEvidence:Array.isArray(semantic.negativeEvidence)?semantic.negativeEvidence:[],
    dependencies:Array.isArray(semantic.dependencies)?semantic.dependencies:[],
  };
}

export function validateOperationalIntelligence({plan,policy,guardIds=[]}){
  const issues=[];
  const cfg=policy?.operationalIntelligence;
  const oi=plan?.operationalIntelligence;
  const contract=plan?.completionContract;
  const knownGuards=new Set(guardIds);
  if(!cfg){issue(issues,'DEV_PLAN_OPERATIONAL_POLICY_REQUIRED','policy.operationalIntelligence','Operational Intelligence policy is missing.');return{issues,profile:null};}
  if(!oi){issue(issues,'DEV_PLAN_OPERATIONAL_INTELLIGENCE_REQUIRED','operationalIntelligence','Operational Intelligence plan is required.');return{issues,profile:null};}
  const profile=cfg.riskProfiles?.[oi.riskTier]??null;
  if(!profile)issue(issues,'DEV_PLAN_RISK_TIER_INVALID','operationalIntelligence.riskTier','Risk tier is not defined by the canonical policy.',{actual:oi.riskTier??null});
  if(oi.sourceKind!=='product-owner-request'||!text(oi.sourceRef))issue(issues,'DEV_PLAN_PO_SOURCE_REQUIRED','operationalIntelligence','Operational planning must remain traceable to the Product Owner request.');
  if(oi.riskTier==='critical'){
    if(!meaningful(oi.problemStatement,{minChars:60,minWords:8}))issue(issues,'DEV_PLAN_PROBLEM_STATEMENT_VACUOUS','operationalIntelligence.problemStatement','Critical work requires a concrete problem statement with observable failure semantics.');
    semanticListIssues(issues,oi.observableOutcomes,'operationalIntelligence.observableOutcomes','Observable outcome',{minChars:30,minWords:5});
    if(!asArray(oi.observableOutcomes).length)issue(issues,'DEV_PLAN_OBSERVABLE_OUTCOME_REQUIRED','operationalIntelligence.observableOutcomes','Critical work requires observable outcomes.');
    semanticListIssues(issues,oi.unresolvedRisks,'operationalIntelligence.unresolvedRisks','Unresolved risk',{minChars:30,minWords:5});
    if(!asArray(oi.unresolvedRisks).length)issue(issues,'DEV_PLAN_UNRESOLVED_RISK_REQUIRED','operationalIntelligence.unresolvedRisks','Critical work must name residual uncertainty instead of implying certainty.');
    if(!asArray(oi.scope?.in).length||!asArray(oi.scope?.out).length)issue(issues,'DEV_PLAN_SCOPE_BOUNDARY_REQUIRED','operationalIntelligence.scope','Critical work requires explicit in-scope and out-of-scope boundaries.');
  }
  const ceiling=oi.assuranceCeiling;
  if(!ceiling||!text(ceiling.level)||!text(ceiling.rationale))issue(issues,'DEV_PLAN_ASSURANCE_CEILING_REQUIRED','operationalIntelligence.assuranceCeiling','Assurance ceiling and rationale are required before execution.');
  if(oi.riskTier==='critical'&&!meaningful(ceiling?.rationale,{minChars:80,minWords:12}))issue(issues,'DEV_PLAN_ASSURANCE_RATIONALE_VACUOUS','operationalIntelligence.assuranceCeiling.rationale','Critical assurance rationale must explain why the selected proof depth is necessary and where it stops.');
  if(profile){
    const selected=new Set(asArray(ceiling?.selectedTechniques));
    for(const technique of profile.requiredTechniques??[])if(!selected.has(technique))issue(issues,'DEV_PLAN_ASSURANCE_TECHNIQUE_MISSING','operationalIntelligence.assuranceCeiling.selectedTechniques',`Risk tier ${oi.riskTier} requires ${technique}.`,{technique});
  }
  const definition=oi.definition??{};
  for(const field of ['acceptanceCriteria','invariants','forbiddenStates'])if(!asArray(definition[field]).length||asArray(definition[field]).some(value=>!text(value)))issue(issues,'DEV_PLAN_DEFINITION_INCOMPLETE',`operationalIntelligence.definition.${field}`,`${field} must be explicit and non-empty.`);
  if(oi.riskTier==='critical'){
    semanticListIssues(issues,definition.acceptanceCriteria,'operationalIntelligence.definition.acceptanceCriteria','Acceptance criterion',{minChars:24,minWords:4});
    semanticListIssues(issues,definition.invariants,'operationalIntelligence.definition.invariants','Invariant',{minChars:20,minWords:4});
    semanticListIssues(issues,definition.forbiddenStates,'operationalIntelligence.definition.forbiddenStates','Forbidden state',{minChars:12,minWords:1});
  }
  const phases=asArray(oi.model?.phases);
  if(JSON.stringify(phases)!==JSON.stringify(cfg.phaseSequence??[]))issue(issues,'DEV_PLAN_PHASE_SEQUENCE_DRIFT','operationalIntelligence.model.phases','Operational phases must match the canonical OBSERVE-to-LEARN sequence.',{expected:cfg.phaseSequence??[],actual:phases});
  if(profile&&oi.riskTier!=='low'){
    if(!asArray(oi.model?.failureModes).length)issue(issues,'DEV_PLAN_FAILURE_MODEL_REQUIRED','operationalIntelligence.model.failureModes','Failure model is required for medium-or-higher assurance.');
    if(!asArray(oi.model?.edgeCases).length)issue(issues,'DEV_PLAN_EDGE_CASES_REQUIRED','operationalIntelligence.model.edgeCases','Edge cases are required for medium-or-higher assurance.');
  }
  const alternatives=asArray(oi.alternatives);
  if(profile&&alternatives.length<profile.minAlternatives)issue(issues,'DEV_PLAN_ALTERNATIVES_INSUFFICIENT','operationalIntelligence.alternatives','Risk tier requires more than the first implementation idea.',{minimum:profile.minAlternatives,actual:alternatives.length});
  const selectedAlternatives=alternatives.filter(item=>item?.disposition==='selected');
  if(selectedAlternatives.length!==1)issue(issues,'DEV_PLAN_SELECTED_ALTERNATIVE_INVALID','operationalIntelligence.alternatives','Exactly one challenged implementation alternative must be selected.',{actual:selectedAlternatives.length});
  for(const [index,item] of alternatives.entries()){
    if(!text(item?.id)||!text(item?.summary)||!text(item?.reason)||!['selected','rejected'].includes(item?.disposition))issue(issues,'DEV_PLAN_ALTERNATIVE_INCOMPLETE',`operationalIntelligence.alternatives.${index}`,'Each alternative requires id, summary, disposition and reason.');
    if(oi.riskTier==='critical'&&(!meaningful(item?.summary,{minChars:24,minWords:4})||!meaningful(item?.reason,{minChars:30,minWords:5})))issue(issues,'DEV_PLAN_ALTERNATIVE_VACUOUS',`operationalIntelligence.alternatives.${index}`,'Critical alternatives need materially distinct implementation choices and rejection/selection reasoning.');
  }
  if(oi.riskTier==='critical'){
    const summaries=alternatives.map(item=>normalizedSemanticText(item?.summary)).filter(Boolean);
    if(new Set(summaries).size!==summaries.length)issue(issues,'DEV_PLAN_ALTERNATIVES_TAUTOLOGICAL','operationalIntelligence.alternatives','Critical alternatives must be materially distinct choices, not duplicated prose under different IDs.');
  }
  const challenges=asArray(oi.challenge);
  if(profile&&challenges.length<profile.minChallenges)issue(issues,'DEV_PLAN_CHALLENGE_INSUFFICIENT','operationalIntelligence.challenge','Adversarial challenge depth is below the risk profile.',{minimum:profile.minChallenges,actual:challenges.length});
  for(const [index,item] of challenges.entries()){
    if(!text(item?.id)||!text(item?.scenario)||!text(item?.finding)||!text(item?.resolution)||item?.status!=='resolved')issue(issues,'DEV_PLAN_CHALLENGE_UNRESOLVED',`operationalIntelligence.challenge.${index}`,'Every recorded challenge must be explicitly resolved before execution.');
    if(oi.riskTier==='critical'&&(!meaningful(item?.scenario,{minChars:24,minWords:4})||!meaningful(item?.finding,{minChars:24,minWords:4})||!meaningful(item?.resolution,{minChars:24,minWords:4})))issue(issues,'DEV_PLAN_CHALLENGE_VACUOUS',`operationalIntelligence.challenge.${index}`,'Critical adversarial challenge must state a concrete scenario, failure finding and distinct resolution.');
    if(oi.riskTier==='critical'&&(semanticallyTautological(item?.scenario,item?.finding)||semanticallyTautological(item?.finding,item?.resolution)||semanticallyTautological(item?.scenario,item?.resolution)))issue(issues,'DEV_PLAN_CHALLENGE_TAUTOLOGICAL',`operationalIntelligence.challenge.${index}`,'Critical challenge scenario, finding and resolution must be semantically distinct; a self-confirming restatement is not adversarial review.');
  }
  const specialists=asArray(oi.specialistReviews);
  if(profile&&specialists.length<profile.minSpecialists)issue(issues,'DEV_PLAN_SPECIALIST_REVIEW_INSUFFICIENT','operationalIntelligence.specialistReviews','Relevant specialist review depth is below the risk profile.',{minimum:profile.minSpecialists,actual:specialists.length});
  const allowedRoles=new Set(cfg.specialistRoles??[]);
  for(const [index,item] of specialists.entries()){
    if(!allowedRoles.has(item?.role))issue(issues,'DEV_PLAN_SPECIALIST_ROLE_INVALID',`operationalIntelligence.specialistReviews.${index}.role`,'Specialist role is outside the canonical role set.',{actual:item?.role??null});
    if(!text(item?.finding)||!text(item?.resolution)||!['review','dissent'].includes(item?.mode)||!['pass','challenge-resolved'].includes(item?.verdict))issue(issues,'DEV_PLAN_SPECIALIST_REVIEW_UNRESOLVED',`operationalIntelligence.specialistReviews.${index}`,'Specialist review must contain a resolved finding.');
    if(oi.riskTier==='critical'&&(!meaningful(item?.finding,{minChars:24,minWords:4})||!meaningful(item?.resolution,{minChars:24,minWords:4})))issue(issues,'DEV_PLAN_SPECIALIST_REVIEW_VACUOUS',`operationalIntelligence.specialistReviews.${index}`,'Critical specialist findings must contain evidence-bearing engineering substance.');
    if(oi.riskTier==='critical'&&(!asArray(item?.evidence).length||asArray(item?.evidence).some(value=>!text(value))))issue(issues,'DEV_PLAN_SPECIALIST_EVIDENCE_REQUIRED',`operationalIntelligence.specialistReviews.${index}.evidence`,'Critical specialist verdicts require explicit source/evidence references; verdict presence alone is not proof.');
  }
  if(profile?.requireDissent&&!specialists.some(item=>item?.mode==='dissent'))issue(issues,'DEV_PLAN_DISSENT_REQUIRED','operationalIntelligence.specialistReviews','This risk tier requires at least one explicit dissent specialist.');
  if(!asArray(oi.proofPlan).length||asArray(oi.proofPlan).some(value=>!text(value)))issue(issues,'DEV_PLAN_PROOF_PLAN_REQUIRED','operationalIntelligence.proofPlan','Proof plan is required before execution.');
  if(oi.riskTier==='critical')semanticListIssues(issues,oi.proofPlan,'operationalIntelligence.proofPlan','Proof obligation',{minChars:28,minWords:5});
  if(oi.executionAuthorized!==true)issue(issues,'DEV_PLAN_EXECUTION_NOT_AUTHORIZED','operationalIntelligence.executionAuthorized','Execution remains denied until the challenged plan is explicitly authorized.');
  if(oi.riskTier==='critical'){
    const route=oi.semanticExecutionRoute;
    const childRoute=plan?.releaseUnitContext?.contract==='shoporation.release-unit-child-transaction.v1';
    const parentClosureRoute=plan?.parentClosureContext?.contract==='shoporation.release-parent-closure-proof-context.v1';
    const createTargetRoute=childRoute||parentClosureRoute;
    const routeTargets=asArray(route?.mustEdit).length+(createTargetRoute?asArray(route?.mustCreate).length:0);
    const routeAuthorityExplicit=Array.isArray(route?.authority)&&route.authority.every(value=>text(value));
    const normalizeAuthorities=values=>[...new Set(asArray(values).map(value=>text(value)).filter(Boolean))].sort();
    const routeAuthorities=routeAuthorityExplicit?normalizeAuthorities(route.authority):[];
    const expectedAuthorities=normalizeAuthorities(plan?.expectedAuthorities);
    if(!route||!routeTargets||!routeAuthorityExplicit||!asArray(route.proof).length||!Array.isArray(route.unknown))issue(issues,'DEV_PLAN_SEMANTIC_EXECUTION_ROUTE_REQUIRED','operationalIntelligence.semanticExecutionRoute',createTargetRoute?'Critical governed execution requires MUST_EDIT or canonical MUST_CREATE plus explicit AUTHORITY, PROOF and UNKNOWN semantic route categories.':'Critical execution requires explicit MUST_EDIT, AUTHORITY, PROOF and UNKNOWN semantic route categories.');
    else{
      if(JSON.stringify(routeAuthorities)!==JSON.stringify(expectedAuthorities))issue(issues,'DEV_PLAN_SEMANTIC_EXECUTION_AUTHORITY_DRIFT','operationalIntelligence.semanticExecutionRoute.authority','Semantic execution route authority must exactly match the canonical expectedAuthorities scope.',{expected:expectedAuthorities,actual:routeAuthorities});
      if(route.unknown.length)issue(issues,'DEV_PLAN_SEMANTIC_EXECUTION_UNKNOWN','operationalIntelligence.semanticExecutionRoute.unknown','UNKNOWN semantic relationships must be resolved before critical execution.',{unknown:route.unknown});
    }
  }


  if(!contract||contract.sourceKind!=='product-owner-request'||!text(contract.sourceRef))issue(issues,'DEV_PLAN_COMPLETION_CONTRACT_SOURCE_REQUIRED','completionContract','Completion Contract must be derived from and traceable to the Product Owner request.');
  if(contract&&text(oi.sourceRef)&&contract.sourceRef!==oi.sourceRef)issue(issues,'DEV_PLAN_COMPLETION_SOURCE_DRIFT','completionContract.sourceRef','Planning and completion must trace to the same Product Owner request.');
  const requirements=asArray(contract?.requirements);
  if(!requirements.length)issue(issues,'DEV_PLAN_COMPLETION_REQUIREMENTS_REQUIRED','completionContract.requirements','At least one PO-derived requirement is required.');
  const requirementIds=requirements.map(item=>item?.id).filter(Boolean);
  if(!uniq(requirementIds))issue(issues,'DEV_PLAN_COMPLETION_REQUIREMENT_DUPLICATE','completionContract.requirements','Completion requirement IDs must be unique.');
  const negativeIds=[];
  const circular=new Set(cfg.completionEvidence?.forbiddenCircularEvidenceIds??[]);
  const checkRefs=(refs,path)=>{
    if(!asArray(refs).length){issue(issues,'DEV_PLAN_COMPLETION_EVIDENCE_REQUIRED',path,'Completion claim requires explicit evidence references.');return;}
    for(const evidenceId of refs){
      if(!text(evidenceId))issue(issues,'DEV_PLAN_COMPLETION_EVIDENCE_INVALID',path,'Evidence IDs must be non-empty stable identifiers.');
      else if(circular.has(evidenceId))issue(issues,'DEV_PLAN_COMPLETION_EVIDENCE_CIRCULAR',path,'Truth Gate may not use its own verdict as evidence.',{evidenceId});
      else if(knownGuards.size&&!knownGuards.has(evidenceId))issue(issues,'DEV_PLAN_COMPLETION_EVIDENCE_UNKNOWN',path,'Completion Contract references an unknown guard.',{evidenceId});
    }
  };
  requirements.forEach((item,index)=>{
    const path=`completionContract.requirements.${index}`;
    if(!/^REQ-[A-Z0-9-]+$/.test(String(item?.id??''))||!text(item?.requirement))issue(issues,'DEV_PLAN_COMPLETION_REQUIREMENT_INVALID',path,'Requirement needs a stable REQ-* ID and non-empty PO requirement.');
    if(oi.riskTier==='critical'&&!meaningful(item?.requirement,{minChars:30,minWords:5}))issue(issues,'DEV_PLAN_COMPLETION_REQUIREMENT_VACUOUS',path,'Critical completion requirement must be observable and falsifiable.');
    if(oi.riskTier==='critical'&&(!item?.claimScope||!text(item.claimScope.capability)||!text(item.claimScope.breadth)||!asArray(item.claimScope.dimensions).length))issue(issues,'DEV_PLAN_CLAIM_SCOPE_REQUIRED',`${path}.claimScope`,'Critical completion claims require explicit capability, breadth and dimensions.');
    if(oi.riskTier==='critical'&&!asArray(item?.requiredCapabilities).length)issue(issues,'DEV_PLAN_REQUIRED_CAPABILITY_REQUIRED',`${path}.requiredCapabilities`,'Critical completion claims must name the capability that is responsible for proving them.');
    checkRefs(item?.evidence?.implementation,`${path}.evidence.implementation`);
    checkRefs(item?.evidence?.outcome,`${path}.evidence.outcome`);
    const negatives=asArray(item?.forbiddenRegressions);
    if(!negatives.length)issue(issues,'DEV_PLAN_NEGATIVE_VERIFICATION_REQUIRED',`${path}.forbiddenRegressions`,'Each completion requirement must name at least one forbidden regression.');
    negatives.forEach((negative,nIndex)=>{
      negativeIds.push(negative?.id);
      if(!/^NEG-[A-Z0-9-]+$/.test(String(negative?.id??''))||!text(negative?.statement))issue(issues,'DEV_PLAN_NEGATIVE_REQUIREMENT_INVALID',`${path}.forbiddenRegressions.${nIndex}`,'Negative verification needs a stable NEG-* ID and statement.');
      checkRefs(negative?.evidence,`${path}.forbiddenRegressions.${nIndex}.evidence`);
    });
  });
  if(!uniq(negativeIds.filter(Boolean)))issue(issues,'DEV_PLAN_NEGATIVE_REQUIREMENT_DUPLICATE','completionContract.requirements','Negative requirement IDs must be unique across the Completion Contract.');
  return{issues,profile};
}

function evidenceState(item,current){
  if(!item)return{state:'MISSING',reason:'evidence-missing'};
  const normalized=statusOf(item.status);
  if(BLOCKED.has(normalized))return{state:'BLOCKED',reason:`evidence-status-${normalized}`};
  const metadataMissing=!text(item.sourceCommit)||!text(item.branch)||!text(item.stateVersion)||(!text(item.runId)&&!text(item.timestamp));
  if(metadataMissing)return{state:'MISSING',reason:'evidence-provenance-incomplete'};
  if(item.sourceCommit!==current.head||item.branch!==current.branch||item.stateVersion!==current.stateVersion)return{state:'STALE',reason:'evidence-exact-state-mismatch'};
  if(item.execution==='REUSED'){
    const reuse=item.reuseProof;
    const equivalenceProven=Boolean(text(item.originSourceCommit)&&reuse&&reuse.fingerprintEquivalent===true&&text(reuse.previousFingerprint)&&reuse.previousFingerprint===reuse.currentFingerprint&&text(reuse.checkpointSourceCommit));
    if(!equivalenceProven)return{state:'STALE',reason:'reused-evidence-equivalence-unproven'};
  }
  if(FAIL.has(normalized))return{state:'FAIL',reason:`evidence-status-${normalized}`};
  if(PASS.has(normalized))return{state:'PASS',reason:item.execution==='REUSED'?'reused-pass-equivalence-proven':'fresh-pass'};
  if(MISSING.has(normalized))return{state:'MISSING',reason:`evidence-status-${normalized||'missing'}`};
  return{state:'UNKNOWN',reason:`evidence-status-unrecognized-${normalized}`};
}

function semanticProofFor(item,id,req){
  const semantics=evidenceSemantics(item,id),required=claimStrength(req);
  const capabilities=new Set(semantics.capabilities??[]);
  const requiredCapabilities=asArray(req?.requiredCapabilities);
  const capabilityMatch=!requiredCapabilities.length||capabilities.has('*')||requiredCapabilities.every(cap=>capabilities.has(cap));
  const scopeMatch=Number(semantics.scopeStrength??0)>=required;
  return{semantics,requiredStrength:required,capabilityMatch,scopeMatch,provenStrength:capabilityMatch?Number(semantics.scopeStrength??0):0};
}

export function evaluateCompletionTruth({plan,evidence=[],currentExactState,planIssues=[]}){
  const requirements=asArray(plan?.completionContract?.requirements);
  const byId=new Map(asArray(evidence).map(item=>[item?.id,item]));
  const proofFor=(id,req,claimPath)=>{
    const item=byId.get(id);
    const freshness=evidenceState(item,currentExactState);
    const semantic=semanticProofFor(item,id,req);
    let state=freshness.state,reason=freshness.reason;
    if(state==='PASS'&&!semantic.capabilityMatch){state='UNKNOWN';reason='evidence-capability-scope-mismatch';}
    if(state==='PASS'&&semantic.semantics.confidence!==null&&semantic.semantics.confidence<0.5){state='UNKNOWN';reason='evidence-semantic-confidence-insufficient';}
    return{id,claimPath,state,reason,sourceCommit:item?.sourceCommit??null,branch:item?.branch??null,stateVersion:item?.stateVersion??null,runId:item?.runId??null,timestamp:item?.timestamp??null,status:item?.status??null,claimScope:req?.claimScope??null,requiredCapabilities:req?.requiredCapabilities??[],evidenceSemantics:semantic.semantics,requiredScopeStrength:semantic.requiredStrength,provenScopeStrength:semantic.provenStrength};
  };
  const requirementResults=requirements.map(req=>{
    const implementation=asArray(req?.evidence?.implementation).map(id=>proofFor(id,req,`${req.id}:implementation`));
    const outcome=asArray(req?.evidence?.outcome).map(id=>proofFor(id,req,`${req.id}:outcome`));
    const negative=asArray(req?.forbiddenRegressions).map(neg=>({id:neg.id,statement:neg.statement,proofs:asArray(neg.evidence).map(id=>proofFor(id,{...req,claimScope:{...req.claimScope,breadth:'negative-regression',strength:Math.min(2,claimStrength(req))}},`${req.id}:${neg.id}`))}));
    const proofs=[...implementation,...outcome,...negative.flatMap(x=>x.proofs)];
    const good=proofs.filter(x=>x.state==='PASS');
    const required=claimStrength(req),maxProven=Math.max(0,...good.map(x=>x.provenScopeStrength??0));
    const requiredDimensions=[...new Set(asArray(req?.claimScope?.dimensions))];
    const provenDimensions=[...new Set(good.flatMap(x=>asArray(x.evidenceSemantics?.dimensions)))].sort();
    const missingDimensions=requiredDimensions.filter(dimension=>!provenDimensions.includes(dimension));
    let truthStatus='VERIFIED';
    const states=new Set(proofs.map(x=>x.state));
    if(states.has('FAIL'))truthStatus='FAILED';
    else if(states.has('BLOCKED'))truthStatus='FAILED';
    else if(states.has('STALE'))truthStatus='STALE';
    else if(states.has('UNKNOWN'))truthStatus='UNKNOWN';
    else if(states.has('MISSING'))truthStatus='MISSING';
    else if(states.has('OVERCLAIM')||maxProven<required||missingDimensions.length)truthStatus='OVERCLAIM';
    else if(!proofs.length||proofs.some(x=>x.state!=='PASS'))truthStatus='PARTIAL';
    return{id:req.id,requirement:req.requirement,claimScope:req.claimScope??null,requiredCapabilities:req.requiredCapabilities??[],requiredScopeStrength:required,provenScopeStrength:maxProven,requiredDimensions,provenDimensions,missingDimensions,truthStatus,implementation,outcome,negative};
  });
  const allProofs=requirementResults.flatMap(req=>[...req.implementation,...req.outcome,...req.negative.flatMap(neg=>neg.proofs)]);
  const statuses=new Set(requirementResults.map(x=>x.truthStatus));
  let truthStatus='VERIFIED';
  if(planIssues.length)truthStatus='FAILED';
  else if(statuses.has('FAILED'))truthStatus='FAILED';
  else if(statuses.has('STALE'))truthStatus='STALE';
  else if(statuses.has('OVERCLAIM'))truthStatus='OVERCLAIM';
  else if(statuses.has('UNKNOWN'))truthStatus='UNKNOWN';
  else if(statuses.has('MISSING'))truthStatus='MISSING';
  else if(statuses.has('PARTIAL'))truthStatus='PARTIAL';
  let internalState='VERIFIED_DONE';
  if(truthStatus==='FAILED'){
    if(allProofs.some(item=>item.state==='FAIL'))internalState='NOT_DONE';
    else if(allProofs.some(item=>item.state==='BLOCKED'))internalState='BLOCKED';
    else internalState='NOT_DONE';
  }else if(truthStatus==='STALE')internalState='STALE_EVIDENCE';
  else if(truthStatus==='OVERCLAIM')internalState='OVERCLAIM';
  else if(truthStatus==='UNKNOWN')internalState='UNKNOWN';
  else if(truthStatus==='MISSING'||truthStatus==='PARTIAL')internalState='PARTIALLY_VERIFIED';
  const poStatus=truthStatus==='VERIFIED'?'DONE':'NOT DONE';
  const failedRequirement=requirementResults.find(item=>item.truthStatus!=='VERIFIED');
  const failedProof=allProofs.find(item=>item.state!=='PASS');
  const next=planIssues[0]?.message??(failedRequirement?`${failedRequirement.id}: ${failedRequirement.truthStatus}`:(failedProof?`${failedProof.claimPath}: ${failedProof.state} (${failedProof.id})`:null));
  const everyPass=items=>items.length>0&&items.every(item=>item.state==='PASS');
  const result={
    contract:'shoporation.completion-truth.v2',
    taskId:plan?.taskId??null,sourceRef:plan?.completionContract?.sourceRef??null,currentExactState,planIssueCount:planIssues.length,planIssues,
    truthStatus,
    requirementCompleteness:requirements.length>0&&requirements.every(req=>text(req?.id)&&text(req?.requirement)),
    implementationCompleteness:requirementResults.every(req=>everyPass(req.implementation)),
    outcomeVerification:requirementResults.every(req=>everyPass(req.outcome)),
    negativeVerification:requirementResults.every(req=>req.negative.length>0&&req.negative.every(neg=>everyPass(neg.proofs))),
    requirementResults,
    evidenceSummary:{
      total:allProofs.length,
      pass:allProofs.filter(item=>item.state==='PASS').length,
      fail:allProofs.filter(item=>item.state==='FAIL').length,
      blocked:allProofs.filter(item=>item.state==='BLOCKED').length,
      stale:allProofs.filter(item=>item.state==='STALE').length,
      missing:allProofs.filter(item=>item.state==='MISSING').length,
      overclaim:allProofs.filter(item=>item.state==='OVERCLAIM').length,
      unknown:allProofs.filter(item=>item.state==='UNKNOWN').length,
    },
    internalState,poStatus,next,decision:truthStatus==='VERIFIED'?'PASS':'BLOCK',
  };
  result.issues=[
    ...planIssues.map(item=>({...item,expected:'valid pre-execution plan',actual:'invalid'})),
    ...allProofs.filter(item=>item.state!=='PASS').map(item=>({
      code:item.state==='STALE'?'TRUTH_EVIDENCE_STALE':item.state==='MISSING'?'TRUTH_EVIDENCE_MISSING':item.state==='BLOCKED'?'TRUTH_EVIDENCE_BLOCKED':item.state==='OVERCLAIM'?'TRUTH_EVIDENCE_OVERCLAIM':item.state==='UNKNOWN'?'TRUTH_EVIDENCE_UNKNOWN':'TRUTH_EVIDENCE_FAILED',
      path:item.claimPath,message:`${item.claimPath} is not semantically proven by ${item.id}: ${item.reason}`,expected:'fresh evidence with proven scope >= claim scope',actual:item.state,evidence:[item.id],
    })),
    ...requirementResults.filter(item=>item.truthStatus==='OVERCLAIM'&&!item.implementation.concat(item.outcome,item.negative.flatMap(n=>n.proofs)).some(p=>p.state==='OVERCLAIM')).map(item=>({code:'TRUTH_CLAIM_OVERCLAIM',path:item.id,message:`Claim is not fully proven: required strength=${item.requiredScopeStrength}, proven strength=${item.provenScopeStrength}, missing dimensions=${item.missingDimensions.join(',')||'none'}.`,expected:'PROVEN_SCOPE >= CLAIM_SCOPE and CLAIM_DIMENSIONS subset of PROVEN_DIMENSIONS',actual:`strength ${item.provenScopeStrength}/${item.requiredScopeStrength}; missing=${item.missingDimensions.join(',')||'none'}`,evidence:[]})),
  ];
  return result;
}


export function buildClosedDevelopmentPlan({plan,truthReport,currentHead,closedAt}){
  if(!plan||!truthReport)throw new Error('DEV_LIFECYCLE_CLOSE_INPUT_REQUIRED');
  if(truthReport.taskId!==plan.taskId)throw new Error('DEV_LIFECYCLE_CLOSE_TASK_MISMATCH');
  if(truthReport.sourceRef!==plan.completionContract?.sourceRef)throw new Error('DEV_LIFECYCLE_CLOSE_SOURCE_MISMATCH');
  if(truthReport.decision!=='PASS'||truthReport.truthStatus!=='VERIFIED'||truthReport.internalState!=='VERIFIED_DONE')throw new Error('DEV_LIFECYCLE_CLOSE_TRUTH_NOT_VERIFIED');
  if(truthReport.currentExactState?.head!==currentHead)throw new Error('DEV_LIFECYCLE_CLOSE_HEAD_MISMATCH');
  if(!text(closedAt))throw new Error('DEV_LIFECYCLE_CLOSE_TIMESTAMP_REQUIRED');
  return{
    ...plan,
    status:'closed',
    lifecycle:{
      state:'LEARN',
      truthStatus:'VERIFIED',
      verifiedImplementationHead:currentHead,
      closedAt,
      truthContract:truthReport.contract,
      sourceRef:truthReport.sourceRef,
      learning:{
        state:'review-ready',
        knownFailurePromotion:'human-governed',
        missedThinkingReview:'required-only-when-failure-intake-or-new-missing-edge-exists',
      },
    },
  };
}
export function validateCommittedParentClosureMetadata({plan,parent,sourcePlan,currentExactState,artifactContent,metadataParents=[],metadataChanges=[],trustedMainAdvance=null}={}){
  const issues=[],issueCode=(code,details={})=>issues.push({code,...details});
  const context=plan?.parentClosureContext??null,sourceCommit=String(context?.sourceCommit??'');
  const implementationHead=String(plan?.lifecycle?.verifiedImplementationHead??''),metadataHead=String(currentExactState?.head??'');
  const branch=String(currentExactState?.branch??''),persistence=parent?.closurePersistence??null;
  const sha=value=>/^[0-9a-f]{40}$/i.test(String(value??''));
  if(context?.contract!==RELEASE_PARENT_CLOSURE_CONTEXT_CONTRACT)issueCode('DEV_LIFECYCLE_PARENT_PROOF_CONTEXT_REQUIRED');
  if(plan?.status!=='closed'||plan?.lifecycle?.state!=='LEARN'||plan?.lifecycle?.truthStatus!=='VERIFIED')issueCode('DEV_LIFECYCLE_PARENT_PROOF_CLOSED_PLAN_REQUIRED');
  if(!sha(metadataHead)||!sha(implementationHead)||!sha(sourceCommit))issueCode('DEV_LIFECYCLE_PARENT_PROOF_SHA_INVALID');
  if(plan?.changeBaseSha!==implementationHead||context?.finalMainSha!==implementationHead)issueCode('DEV_LIFECYCLE_PARENT_PROOF_FINAL_MAIN_MISMATCH');
  if(parent?.contract!=='shoporation.release-parent-execution.v1'||parent?.closureComplete!==true||parent?.parentTransactionId!==plan?.taskId)issueCode('DEV_LIFECYCLE_PARENT_PROOF_EXECUTION_IDENTITY_MISMATCH');
  if(parent?.executionSourceCommit!==sourceCommit||sourcePlan?.taskId!==plan?.taskId)issueCode('DEV_LIFECYCLE_PARENT_PROOF_SOURCE_IDENTITY_MISMATCH');
  if(!Array.isArray(parent?.units)||!parent.units.length||!parent.units.every(item=>item?.state==='CLOSED'&&item?.closeReceipt))issueCode('DEV_LIFECYCLE_PARENT_PROOF_CHILD_RECEIPTS_MISSING');
  if(persistence?.contract!=='shoporation.release-parent-closure-persistence.v1'||persistence?.state!=='PR_OPEN'||persistence?.headSha!==metadataHead||persistence?.baseSha!==implementationHead||persistence?.branch!==branch)issueCode('DEV_LIFECYCLE_PARENT_PROOF_PERSISTENCE_MISMATCH');
  if(!Array.isArray(metadataParents)||metadataParents.length!==2||metadataParents[0]!==metadataHead||metadataParents[1]!==implementationHead)issueCode('DEV_LIFECYCLE_PARENT_PROOF_METADATA_ANCESTRY_MISMATCH');
  let expected=null;
  try{
    const args={parent,sourcePlan,sourceCommit,finalMainSha:implementationHead,trustedMainAdvance};
    if(!validateReleaseParentClosureProofPlan(plan,args))issueCode('DEV_LIFECYCLE_PARENT_PROOF_PLAN_BINDING_MISMATCH');
    expected=buildReleaseParentClosureProofArtifactFromContext(context);
    if(artifactContent!==expected.content)issueCode('DEV_LIFECYCLE_PARENT_PROOF_COMMITTED_BYTES_MISMATCH');
    if(parent?.closedReceipt?.proofArtifactPath!==expected.path||parent?.closedReceipt?.proofArtifactDigest!==expected.digest||JSON.stringify(parent?.closedReceipt?.parentClosureContext)!==JSON.stringify(context))issueCode('DEV_LIFECYCLE_PARENT_PROOF_CLOSED_RECEIPT_BINDING_MISMATCH');
    if(expected.path!==releaseParentClosureProofArtifactPath(plan?.taskId))issueCode('DEV_LIFECYCLE_PARENT_PROOF_PATH_MISMATCH');
    const expectedChanges=['M\tquality/development/active-plan.json','A\t'+expected.path].sort();
    if(!Array.isArray(metadataChanges)||JSON.stringify([...metadataChanges].sort())!==JSON.stringify(expectedChanges))issueCode('DEV_LIFECYCLE_PARENT_PROOF_METADATA_SCOPE_MISMATCH',{expected:expectedChanges,actual:metadataChanges});
  }catch(error){issueCode('DEV_LIFECYCLE_PARENT_PROOF_RECONSTRUCTION_FAILED',{error:String(error?.message??error)});}
  return{decision:issues.length?'BLOCK':'PASS',path:issues.length?null:expected.path,issues};
}

export function evaluateClosedDevelopmentPlan({plan,currentExactState,changedSinceVerified=[],verifiedHeadIsAncestor=true,planIssues=[],verifiedParentClosureProofPath=null}){
  const lifecycle=plan?.lifecycle??{},issues=[...asArray(planIssues)];
  if(plan?.status!=='closed')issues.push({code:'DEV_LIFECYCLE_STATUS_NOT_CLOSED'});
  if(lifecycle.state!=='LEARN')issues.push({code:'DEV_LIFECYCLE_LEARN_STATE_REQUIRED'});
  if(lifecycle.truthStatus!=='VERIFIED')issues.push({code:'DEV_LIFECYCLE_TRUTH_NOT_VERIFIED'});
  if(!text(lifecycle.verifiedImplementationHead))issues.push({code:'DEV_LIFECYCLE_VERIFIED_HEAD_REQUIRED'});
  if(!verifiedHeadIsAncestor)issues.push({code:'DEV_LIFECYCLE_VERIFIED_HEAD_NOT_ANCESTOR'});
  const canonicalProofPath=plan?.parentClosureContext?.contract===RELEASE_PARENT_CLOSURE_CONTEXT_CONTRACT?releaseParentClosureProofArtifactPath(plan.taskId):null;
  const acceptedProofPath=verifiedParentClosureProofPath&&verifiedParentClosureProofPath===canonicalProofPath?verifiedParentClosureProofPath:null;
  const materialChanges=asArray(changedSinceVerified).filter(file=>file!=='quality/development/active-plan.json'&&file!==acceptedProofPath);
  if(materialChanges.length)issues.push({code:'DEV_LIFECYCLE_POST_VERIFICATION_MATERIAL_CHANGE',files:materialChanges});
  const verified=issues.length===0;
  return{
    contract:'shoporation.completion-truth.v2',
    taskId:plan?.taskId??null,
    sourceRef:plan?.completionContract?.sourceRef??null,
    currentExactState,
    truthStatus:verified?'VERIFIED':'FAILED',
    internalState:verified?'VERIFIED_DONE':'NOT_DONE',
    poStatus:verified?'DONE':'NOT DONE',
    lifecycleState:lifecycle.state??null,
    verifiedImplementationHead:lifecycle.verifiedImplementationHead??null,
    closureFiles:[...asArray(changedSinceVerified)],
    requirementCompleteness:verified,
    implementationCompleteness:verified,
    outcomeVerification:verified,
    negativeVerification:verified,
    requirementResults:[],
    evidenceSummary:{total:1,pass:verified?1:0,fail:verified?0:1,blocked:0,stale:0,missing:0,overclaim:0,unknown:0},
    planIssueCount:issues.length,
    planIssues:issues,
    issues,
    next:verified?null:'Repair lifecycle closure or re-run exact-head verification after material changes.',
    decision:verified?'PASS':'BLOCK',
  };
}

if(process.argv.includes('--self-test')){
  const exact={head:'abc123',branch:'feature/test',stateVersion:'shoporation-ci.v1'};
  const plan={taskId:'SELF-TEST',completionContract:{sourceRef:'PO-SELF-TEST',requirements:[{
    id:'REQ-SELF',
    requirement:'Self test',
    evidence:{implementation:['G-IMPL'],outcome:['G-OUTCOME']},
    forbiddenRegressions:[{id:'NEG-SELF',statement:'No regression',evidence:['G-NEG']}],
  }]}};
  const fresh=(id,status='success')=>({id,status,sourceCommit:exact.head,branch:exact.branch,stateVersion:exact.stateVersion,runId:'run-1',semantics:{producer:'self-test',capabilities:['*'],scopeStrength:4,scope:'self-test',dimensions:['state'],classification:'unit',confidence:1,whatItProves:'self-test state transition',whatItDoesNotProve:[]}});
  const variant=(id,state)=>{
    if(state==='PASS')return fresh(id,'success');
    if(state==='FAIL')return fresh(id,'failure');
    if(state==='BLOCKED')return fresh(id,'cancelled');
    if(state==='STALE')return{...fresh(id,'success'),sourceCommit:'older'};
    return null;
  };
  const states=['PASS','FAIL','BLOCKED','STALE','MISSING'];
  let cases=0;
  for(const a of states)for(const b of states)for(const d of states){
    const evidence=[variant('G-IMPL',a),variant('G-OUTCOME',b),variant('G-NEG',d)].filter(Boolean);
    const report=evaluateCompletionTruth({plan,evidence,currentExactState:exact});
    const set=new Set([a,b,d]);
    const expected=set.has('FAIL')?'NOT_DONE':set.has('BLOCKED')?'BLOCKED':set.has('STALE')?'STALE_EVIDENCE':set.has('MISSING')?'PARTIALLY_VERIFIED':'VERIFIED_DONE';
    if(report.internalState!==expected)throw new Error(`TRUTH_SELF_TEST_STATE_MISMATCH:${a}:${b}:${d}:${report.internalState}:${expected}`);
    if((report.poStatus==='DONE')!==(expected==='VERIFIED_DONE'))throw new Error('TRUTH_SELF_TEST_PO_DONE_MISMATCH');
    cases+=1;
  }
  const staleBranch=evaluateCompletionTruth({plan,evidence:[fresh('G-IMPL'),{...fresh('G-OUTCOME'),branch:'other'},fresh('G-NEG')],currentExactState:exact});
  if(staleBranch.internalState!=='STALE_EVIDENCE')throw new Error('TRUTH_SELF_TEST_BRANCH_FRESHNESS_FAILED');
  const incomplete=evaluateCompletionTruth({plan,evidence:[fresh('G-IMPL'),fresh('G-NEG')],currentExactState:exact});
  if(incomplete.internalState!=='PARTIALLY_VERIFIED'||incomplete.poStatus!=='NOT DONE')throw new Error('TRUTH_SELF_TEST_MISSING_EVIDENCE_FAILED');
  const overclaimPlan={taskId:'OVERCLAIM',completionContract:{sourceRef:'PO-OVERCLAIM',requirements:[{id:'REQ-ALL',requirement:'Atlas identifies every impacted implementation point in the entire codebase.',claimScope:{capability:'CAP-ATLAS',breadth:'repository-complete',dimensions:['all-implementation-points']},requiredCapabilities:['CAP-ATLAS'],evidence:{implementation:['GUARD-QUALITY-TESTS'],outcome:['GUARD-QUALITY-TESTS']},forbiddenRegressions:[{id:'NEG-ALL',statement:'No omission',evidence:['GUARD-QUALITY-TESTS']}]}]}};
  const generic=fresh('GUARD-QUALITY-TESTS');
  delete generic.semantics;
  const overclaim=evaluateCompletionTruth({plan:overclaimPlan,evidence:[generic],currentExactState:exact});
  if(overclaim.truthStatus!=='OVERCLAIM'||overclaim.poStatus==='DONE')throw new Error('TRUTH_SELF_TEST_OVERCLAIM_FAILED');
  console.log(`Operational Intelligence self-test: PASS; exhaustiveTruthCases=${cases}; overclaim=BLOCK`);
}
