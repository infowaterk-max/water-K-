import capabilityRegistry from '../../../quality/knowledge/capability-registry.v1.json';
import livingRoadmap from '../../../quality/knowledge/living-roadmap.v1.json';
import evidenceLedger from '../../../quality/knowledge/evidence-ledger.v1.json';
import domainRegistry from '../../../quality/knowledge/domain-foundations.v1.json';

export const CAPABILITY_REGISTRY=capabilityRegistry;
export const LIVING_ROADMAP=livingRoadmap;
export const EVIDENCE_LEDGER=evidenceLedger;

const lifecycleIndex=new Map(livingRoadmap.lifecycle.map((state,index)=>[state,index]));

export function validateCapabilityEvidenceFoundation(){
  const issues:string[]=[];
  const domainIds=new Set(domainRegistry.domains.map(domain=>domain.id));
  const capabilityIds=capabilityRegistry.capabilities.map(capability=>capability.id);
  const capabilitySet=new Set(capabilityIds);
  if(new Set(capabilityIds).size!==capabilityIds.length)issues.push('CAPABILITY_ID_DUPLICATE');

  for(const capability of capabilityRegistry.capabilities){
    if(!capability.canonicalAuthority.trim())issues.push(`CAPABILITY_AUTHORITY_REQUIRED:${capability.id}`);
    for(const domainId of capability.domainIds)if(!domainIds.has(domainId))issues.push(`CAPABILITY_DOMAIN_UNKNOWN:${capability.id}:${domainId}`);
    for(const dependency of capability.dependsOn)if(!capabilitySet.has(dependency))issues.push(`CAPABILITY_DEPENDENCY_UNKNOWN:${capability.id}:${dependency}`);
    if(!capability.implementation.length)issues.push(`CAPABILITY_IMPLEMENTATION_REQUIRED:${capability.id}`);
    if(!capability.tests.length)issues.push(`CAPABILITY_TEST_REQUIRED:${capability.id}`);
  }

  const evidenceIds=evidenceLedger.records.map(record=>record.id);
  if(new Set(evidenceIds).size!==evidenceIds.length)issues.push('EVIDENCE_ID_DUPLICATE');
  const evidenceSet=new Set(evidenceIds);
  const evidenceById=new Map(evidenceLedger.records.map(record=>[record.id,record]));

  for(const record of evidenceLedger.records){
    if(!capabilitySet.has(record.capabilityId))issues.push(`EVIDENCE_CAPABILITY_UNKNOWN:${record.id}`);
    if(!lifecycleIndex.has(record.stateProved))issues.push(`EVIDENCE_STATE_UNKNOWN:${record.id}`);
    if(!record.sourceSha.trim())issues.push(`EVIDENCE_SOURCE_SHA_REQUIRED:${record.id}`);
    if(!record.evidence.length)issues.push(`EVIDENCE_PROOF_REQUIRED:${record.id}`);
  }

  for(const entry of livingRoadmap.capabilities){
    if(!capabilitySet.has(entry.capabilityId))issues.push(`ROADMAP_CAPABILITY_UNKNOWN:${entry.capabilityId}`);
    if(!lifecycleIndex.has(entry.state))issues.push(`ROADMAP_STATE_UNKNOWN:${entry.capabilityId}`);
    for(const id of entry.evidenceIds){
      if(!evidenceSet.has(id)){issues.push(`ROADMAP_EVIDENCE_UNKNOWN:${entry.capabilityId}:${id}`);continue;}
      const evidence=evidenceById.get(id);
      if(evidence?.capabilityId!==entry.capabilityId)issues.push(`ROADMAP_EVIDENCE_CAPABILITY_MISMATCH:${entry.capabilityId}:${id}`);
      if((lifecycleIndex.get(evidence?.stateProved??'')??-1)<(lifecycleIndex.get(entry.state)??0))issues.push(`ROADMAP_STATE_UNPROVEN:${entry.capabilityId}:${id}`);
    }
  }

  return {ok:issues.length===0,issues,capabilityCount:capabilityRegistry.capabilities.length,evidenceCount:evidenceLedger.records.length};
}

export function capabilityById(id:string){
  return CAPABILITY_REGISTRY.capabilities.find(capability=>capability.id===id)??null;
}

export function capabilityRoadmapState(id:string){
  return LIVING_ROADMAP.capabilities.find(entry=>entry.capabilityId===id)??null;
}

export function capabilityEvidence(id:string){
  return EVIDENCE_LEDGER.records.filter(record=>record.capabilityId===id);
}
