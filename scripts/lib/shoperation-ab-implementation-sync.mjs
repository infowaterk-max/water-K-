const PRE_GATE_DONE=new Set(['UPDATED','REVALIDATED_NO_CHANGE']);
const SPECIALIST_STATES=new Set(['PENDING_SPECIALIST','REGENERATED','BLOCKED']);
const HUMAN_STATES=new Set(['AWAITING_PRODUCT_OWNER_ACCEPTANCE','DEFERRED_WITH_APPROVAL']);

function phaseFor(obligation){
  if(obligation.closurePhase)return obligation.closurePhase;
  if(obligation.mutationPolicy==='generated-evidence-only')return 'specialist';
  if(obligation.mutationPolicy==='forbidden-before-explicit-product-owner-acceptance')return 'human-approval';
  return 'pre-gate';
}
function defaultStatus(obligation){
  const phase=phaseFor(obligation);
  if(phase==='specialist')return 'PENDING_SPECIALIST';
  if(phase==='human-approval')return 'AWAITING_PRODUCT_OWNER_ACCEPTANCE';
  return 'UNRESOLVED';
}
export function seedChangeObligationClosure(changePlan){
  return (changePlan?.B?.policyObligations??[]).map(obligation=>({
    obligationId:obligation.id,phase:phaseFor(obligation),status:defaultStatus(obligation),evidenceFiles:[],
    note:phaseFor(obligation)==='pre-gate'?'':'Lifecycle status is intentionally deferred to its owning specialist or human authority.'
  }));
}
export function evaluateChangeObligationClosure({changePlan,closureEntries,approvals=[],changedFiles=[],enforcePreGate=true}){
  const entries=new Map((closureEntries??[]).map(item=>[item.obligationId,item])),issues=[];
  const items=(changePlan?.B?.policyObligations??[]).map(obligation=>{
    const phase=phaseFor(obligation),entry=entries.get(obligation.id)??{obligationId:obligation.id,phase,status:defaultStatus(obligation),evidenceFiles:[],note:''};
    const status=entry.status??defaultStatus(obligation),evidenceFiles=Array.isArray(entry.evidenceFiles)?entry.evidenceFiles:[],note=String(entry.note??'').trim();
    if(phase==='pre-gate'){
      if(enforcePreGate&&!PRE_GATE_DONE.has(status))issues.push({code:'DEV_PLAN_B_SYNC_UNRESOLVED',obligationId:obligation.id,status});
      if(status==='UPDATED'){
        if(!evidenceFiles.length)issues.push({code:'DEV_PLAN_B_SYNC_EVIDENCE_REQUIRED',obligationId:obligation.id,status});
        const staleEvidence=evidenceFiles.filter(file=>!changedFiles.includes(file));
        if(staleEvidence.length)issues.push({code:'DEV_PLAN_B_SYNC_EVIDENCE_NOT_IN_DIFF',obligationId:obligation.id,files:staleEvidence});
      }
      if(status==='REVALIDATED_NO_CHANGE'&&note.length<12)issues.push({code:'DEV_PLAN_B_SYNC_REVALIDATION_NOTE_REQUIRED',obligationId:obligation.id});
    }else if(phase==='specialist'){
      if(!SPECIALIST_STATES.has(status))issues.push({code:'DEV_PLAN_B_SYNC_SPECIALIST_STATUS_INVALID',obligationId:obligation.id,status});
    }else if(phase==='human-approval'){
      if(!HUMAN_STATES.has(status))issues.push({code:'DEV_PLAN_B_SYNC_HUMAN_STATUS_INVALID',obligationId:obligation.id,status});
      if(status==='DEFERRED_WITH_APPROVAL'){
        const approved=approvals.some(item=>item.obligationId===obligation.id&&item.approvedBy==='product-owner'&&String(item.evidence??'').trim());
        if(!approved)issues.push({code:'DEV_PLAN_B_SYNC_PO_APPROVAL_EVIDENCE_REQUIRED',obligationId:obligation.id});
      }
    }
    return {...entry,obligationId:obligation.id,phase,status,evidenceFiles,note,evidenceGuardId:obligation.closureEvidenceGuardId??null};
  });
  const preGateItems=items.filter(item=>item.phase==='pre-gate');
  const preGateReady=preGateItems.every(item=>PRE_GATE_DONE.has(item.status))&&!issues.some(item=>item.code.startsWith('DEV_PLAN_B_SYNC_'));
  const finalReady=items.every(item=>PRE_GATE_DONE.has(item.status)||item.status==='REGENERATED'||item.status==='DEFERRED_WITH_APPROVAL');
  return {contract:'shoporation.b-implementation-closure.v1',enforcePreGate,preGateReady,finalReady,items,issues};
}
export function reconcileChangeObligationClosure(closure,outcomes=[]){
  const outcomeById=new Map((outcomes??[]).map(item=>[item.guardId,item]));
  const items=(closure?.items??[]).map(item=>{
    if(item.phase!=='specialist'||!item.evidenceGuardId)return item;
    const outcome=outcomeById.get(item.evidenceGuardId); if(!outcome)return item;
    return {...item,status:outcome.decision==='PASS'?'REGENERATED':'BLOCKED'};
  });
  const preGateReady=items.filter(item=>item.phase==='pre-gate').every(item=>PRE_GATE_DONE.has(item.status));
  const finalReady=items.every(item=>PRE_GATE_DONE.has(item.status)||item.status==='REGENERATED'||item.status==='DEFERRED_WITH_APPROVAL');
  return {...closure,items,preGateReady,finalReady};
}
