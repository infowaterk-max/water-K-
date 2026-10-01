const asArray=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'&&value.trim().length>0;
const uniq=values=>new Set(values).size===values.length;
const statusOf=value=>String(value??'').trim().toLowerCase().replaceAll(' ','_');
const PASS=new Set(['pass','passed','success','succeeded','ok','green']);
const FAIL=new Set(['fail','failed','failure','error']);
const BLOCKED=new Set(['block','blocked','cancelled','canceled','timed_out','action_required']);
const MISSING=new Set(['','missing','unknown','skipped','neutral','pending']);

export const COMPLETION_INTERNAL_STATES=Object.freeze(['VERIFIED_DONE','PARTIALLY_VERIFIED','NOT_DONE','BLOCKED','STALE_EVIDENCE']);
export const COMPLETION_PO_STATES=Object.freeze(['DONE','NOT_DONE','BLOCKED','STRESS_UNRELATED_STATE']);

function issue(issues,code,path,message,extra={}){issues.push({code,path,message,...extra});}

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
  const ceiling=oi.assuranceCeiling;
  if(!ceiling||!text(ceiling.level)||!text(ceiling.rationale))issue(issues,'DEV_PLAN_ASSURANCE_CEILING_REQUIRED','operationalIntelligence.assuranceCeiling','Assurance ceiling and rationale are required before execution.');
  if(profile){
    const selected=new Set(asArray(ceiling?.selectedTechniques));
    for(const technique of profile.requiredTechniques??[])if(!selected.has(technique))issue(issues,'DEV_PLAN_ASSURANCE_TECHNIQUE_MISSING','operationalIntelligence.assuranceCeiling.selectedTechniques',`Risk tier ${oi.riskTier} requires ${technique}.`,{technique});
  }
  const definition=oi.definition??{};
  for(const field of ['acceptanceCriteria','invariants','forbiddenStates'])if(!asArray(definition[field]).length||asArray(definition[field]).some(value=>!text(value)))issue(issues,'DEV_PLAN_DEFINITION_INCOMPLETE',`operationalIntelligence.definition.${field}`,`${field} must be explicit and non-empty.`);
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
  for(const [index,item] of alternatives.entries())if(!text(item?.id)||!text(item?.summary)||!text(item?.reason)||!['selected','rejected'].includes(item?.disposition))issue(issues,'DEV_PLAN_ALTERNATIVE_INCOMPLETE',`operationalIntelligence.alternatives.${index}`,'Each alternative requires id, summary, disposition and reason.');
  const challenges=asArray(oi.challenge);
  if(profile&&challenges.length<profile.minChallenges)issue(issues,'DEV_PLAN_CHALLENGE_INSUFFICIENT','operationalIntelligence.challenge','Adversarial challenge depth is below the risk profile.',{minimum:profile.minChallenges,actual:challenges.length});
  for(const [index,item] of challenges.entries())if(!text(item?.id)||!text(item?.scenario)||!text(item?.finding)||!text(item?.resolution)||item?.status!=='resolved')issue(issues,'DEV_PLAN_CHALLENGE_UNRESOLVED',`operationalIntelligence.challenge.${index}`,'Every recorded challenge must be explicitly resolved before execution.');
  const specialists=asArray(oi.specialistReviews);
  if(profile&&specialists.length<profile.minSpecialists)issue(issues,'DEV_PLAN_SPECIALIST_REVIEW_INSUFFICIENT','operationalIntelligence.specialistReviews','Relevant specialist review depth is below the risk profile.',{minimum:profile.minSpecialists,actual:specialists.length});
  const allowedRoles=new Set(cfg.specialistRoles??[]);
  for(const [index,item] of specialists.entries()){
    if(!allowedRoles.has(item?.role))issue(issues,'DEV_PLAN_SPECIALIST_ROLE_INVALID',`operationalIntelligence.specialistReviews.${index}.role`,'Specialist role is outside the canonical role set.',{actual:item?.role??null});
    if(!text(item?.finding)||!text(item?.resolution)||!['review','dissent'].includes(item?.mode)||!['pass','challenge-resolved'].includes(item?.verdict))issue(issues,'DEV_PLAN_SPECIALIST_REVIEW_UNRESOLVED',`operationalIntelligence.specialistReviews.${index}`,'Specialist review must contain a resolved finding.');
  }
  if(profile?.requireDissent&&!specialists.some(item=>item?.mode==='dissent'))issue(issues,'DEV_PLAN_DISSENT_REQUIRED','operationalIntelligence.specialistReviews','This risk tier requires at least one explicit dissent specialist.');
  if(!asArray(oi.proofPlan).length||asArray(oi.proofPlan).some(value=>!text(value)))issue(issues,'DEV_PLAN_PROOF_PLAN_REQUIRED','operationalIntelligence.proofPlan','Proof plan is required before execution.');
  if(oi.executionAuthorized!==true)issue(issues,'DEV_PLAN_EXECUTION_NOT_AUTHORIZED','operationalIntelligence.executionAuthorized','Execution remains denied until the challenged plan is explicitly authorized.');

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
    const equivalenceProven=Boolean(
      text(item.originSourceCommit)&&reuse&&reuse.fingerprintEquivalent===true&&
      text(reuse.previousFingerprint)&&reuse.previousFingerprint===reuse.currentFingerprint&&
      text(reuse.checkpointSourceCommit)
    );
    if(!equivalenceProven)return{state:'STALE',reason:'reused-evidence-equivalence-unproven'};
  }
  if(FAIL.has(normalized))return{state:'FAIL',reason:`evidence-status-${normalized}`};
  if(PASS.has(normalized))return{state:'PASS',reason:item.execution==='REUSED'?'reused-pass-equivalence-proven':'fresh-pass'};
  if(MISSING.has(normalized))return{state:'MISSING',reason:`evidence-status-${normalized||'missing'}`};
  return{state:'MISSING',reason:`evidence-status-unrecognized-${normalized}`};
}

export function evaluateCompletionTruth({plan,evidence=[],currentExactState,planIssues=[]}){
  const requirements=asArray(plan?.completionContract?.requirements);
  const byId=new Map(asArray(evidence).map(item=>[item?.id,item]));
  const proofFor=(id,claimPath)=>{
    const item=byId.get(id);
    const state=evidenceState(item,currentExactState);
    return{id,claimPath,state:state.state,reason:state.reason,sourceCommit:item?.sourceCommit??null,branch:item?.branch??null,stateVersion:item?.stateVersion??null,runId:item?.runId??null,timestamp:item?.timestamp??null,status:item?.status??null};
  };
  const requirementResults=requirements.map(req=>{
    const implementation=asArray(req?.evidence?.implementation).map(id=>proofFor(id,`${req.id}:implementation`));
    const outcome=asArray(req?.evidence?.outcome).map(id=>proofFor(id,`${req.id}:outcome`));
    const negative=asArray(req?.forbiddenRegressions).map(neg=>({
      id:neg.id,
      statement:neg.statement,
      proofs:asArray(neg.evidence).map(id=>proofFor(id,`${req.id}:${neg.id}`)),
    }));
    return{id:req.id,requirement:req.requirement,implementation,outcome,negative};
  });
  const allProofs=requirementResults.flatMap(req=>[
    ...req.implementation,
    ...req.outcome,
    ...req.negative.flatMap(neg=>neg.proofs),
  ]);
  const states=new Set(allProofs.map(item=>item.state));
  let internalState='VERIFIED_DONE';
  if(planIssues.length||states.has('FAIL'))internalState='NOT_DONE';
  else if(states.has('BLOCKED'))internalState='BLOCKED';
  else if(states.has('STALE'))internalState='STALE_EVIDENCE';
  else if(states.has('MISSING'))internalState='PARTIALLY_VERIFIED';
  const poStatus=internalState==='VERIFIED_DONE'?'DONE':internalState==='BLOCKED'?'BLOCKED':'NOT DONE';
  const failedProof=allProofs.find(item=>item.state!=='PASS');
  const next=planIssues[0]?.message??(failedProof?`${failedProof.claimPath}: ${failedProof.state} (${failedProof.id})`:null);
  const everyPass=items=>items.length>0&&items.every(item=>item.state==='PASS');
  const result={
    contract:'shoporation.completion-truth.v1',
    taskId:plan?.taskId??null,
    sourceRef:plan?.completionContract?.sourceRef??null,
    currentExactState,
    planIssueCount:planIssues.length,
    planIssues,
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
    },
    internalState,
    poStatus,
    next,
    decision:internalState==='VERIFIED_DONE'?'PASS':'BLOCK',
  };
  result.issues=[
    ...planIssues.map(item=>({...item,expected:'valid pre-execution plan',actual:'invalid'})),
    ...allProofs.filter(item=>item.state!=='PASS').map(item=>({
      code:item.state==='STALE'?'TRUTH_EVIDENCE_STALE':item.state==='MISSING'?'TRUTH_EVIDENCE_MISSING':item.state==='BLOCKED'?'TRUTH_EVIDENCE_BLOCKED':'TRUTH_EVIDENCE_FAILED',
      path:item.claimPath,
      message:`${item.claimPath} is not freshly proven by ${item.id}: ${item.reason}`,
      expected:'fresh PASS evidence',
      actual:item.state,
      evidence:[item.id],
    })),
  ];
  return result;
}

if(process.argv.includes('--self-test')){
  const exact={head:'abc123',branch:'feature/test',stateVersion:'shoporation-ci.v1'};
  const plan={taskId:'SELF-TEST',completionContract:{sourceRef:'PO-SELF-TEST',requirements:[{
    id:'REQ-SELF',
    requirement:'Self test',
    evidence:{implementation:['G-IMPL'],outcome:['G-OUTCOME']},
    forbiddenRegressions:[{id:'NEG-SELF',statement:'No regression',evidence:['G-NEG']}],
  }]}};
  const fresh=(id,status='success')=>({id,status,sourceCommit:exact.head,branch:exact.branch,stateVersion:exact.stateVersion,runId:'run-1'});
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
  console.log(`Operational Intelligence self-test: PASS; exhaustiveTruthCases=${cases}`);
}
