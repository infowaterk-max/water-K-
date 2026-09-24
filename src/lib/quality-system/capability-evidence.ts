import capabilitiesJson from '../../../quality/knowledge/capability-registry.v1.json';
import roadmapJson from '../../../quality/knowledge/living-roadmap.v1.json';
import evidenceJson from '../../../quality/knowledge/evidence-ledger.v1.json';
import domainsJson from '../../../quality/knowledge/domain-foundations.v1.json';

export const CAPABILITY_REGISTRY=capabilitiesJson;
export const LIVING_ROADMAP=roadmapJson;
export const EVIDENCE_LEDGER=evidenceJson;

export function validateCapabilityEvidenceFoundation(){
  const issues:string[]=[];
  const domainIds=new Set(domainsJson.domains.map(item=>item.id));
  const authorityByDomain=new Map(domainsJson.domains.map(item=>[item.id,item.owner]));
  const capabilityIds=new Set<string>();
  for(const capability of capabilitiesJson.capabilities){
    if(capabilityIds.has(capability.id))issues.push(`CAPABILITY_ID_DUPLICATE:${capability.id}`);
    capabilityIds.add(capability.id);
    if(!domainIds.has(capability.domain))issues.push(`CAPABILITY_DOMAIN_UNKNOWN:${capability.id}:${capability.domain}`);
    const expectedAuthority=authorityByDomain.get(capability.domain);
    if(expectedAuthority&&capability.authority!==expectedAuthority)issues.push(`CAPABILITY_AUTHORITY_MISMATCH:${capability.id}:${capability.authority}:${expectedAuthority}`);
    if(!capability.evidence.length)issues.push(`CAPABILITY_EVIDENCE_REQUIRED:${capability.id}`);
  }

  const evidenceIds=new Set<string>();
  for(const item of evidenceJson.evidence){
    if(evidenceIds.has(item.id))issues.push(`EVIDENCE_ID_DUPLICATE:${item.id}`);
    evidenceIds.add(item.id);
    if(item.state==='verified'&&!item.sourceSha)issues.push(`VERIFIED_EVIDENCE_SHA_REQUIRED:${item.id}`);
    if(item.state==='verified'&&!item.assertions.length)issues.push(`VERIFIED_EVIDENCE_ASSERTION_REQUIRED:${item.id}`);
  }

  const roadmapIds=new Set<string>();
  for(const item of roadmapJson.items){
    if(roadmapIds.has(item.id))issues.push(`ROADMAP_ID_DUPLICATE:${item.id}`);
    roadmapIds.add(item.id);
    for(const capability of item.capabilities)if(!capabilityIds.has(capability))issues.push(`ROADMAP_CAPABILITY_UNKNOWN:${item.id}:${capability}`);
    for(const evidenceRef of item.evidenceRefs)if(!evidenceIds.has(evidenceRef))issues.push(`ROADMAP_EVIDENCE_UNKNOWN:${item.id}:${evidenceRef}`);
    if(item.status==='done'&&roadmapJson.principles.completionRequiresEvidence&&!item.evidenceRefs.length)issues.push(`ROADMAP_DONE_WITHOUT_EVIDENCE:${item.id}`);
  }
  return {ok:issues.length===0,issues,capabilityCount:capabilitiesJson.capabilities.length,roadmapCount:roadmapJson.items.length,evidenceCount:evidenceJson.evidence.length};
}

export function capabilityById(id:string){
  return CAPABILITY_REGISTRY.capabilities.find(item=>item.id===id)??null;
}
export function roadmapItem(id:string){
  return LIVING_ROADMAP.items.find(item=>item.id===id)??null;
}
export function evidenceForSubject(subjectId:string){
  return EVIDENCE_LEDGER.evidence.filter(item=>item.subjectId===subjectId);
}
