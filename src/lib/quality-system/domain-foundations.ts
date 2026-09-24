import domainRegistry from '../../../quality/knowledge/domain-foundations.v1.json';
import constitution from '../../../quality/knowledge/architecture-constitution.v1.json';

export type DomainFoundationRegistry=typeof domainRegistry;
export type DomainFoundation=DomainFoundationRegistry['domains'][number];

export const DOMAIN_FOUNDATION_REGISTRY=domainRegistry;

export function getDomainFoundation(id:string){
  return DOMAIN_FOUNDATION_REGISTRY.domains.find(domain=>domain.id===id)??null;
}

export function domainForTruth(truthKey:string){
  return DOMAIN_FOUNDATION_REGISTRY.domains.find(domain=>domain.truthOwnership.includes(truthKey as never))??null;
}

export function validateDomainFoundations(registry:DomainFoundationRegistry=DOMAIN_FOUNDATION_REGISTRY){
  const issues:string[]=[];
  const principleIds=new Set(constitution.principles.map(item=>item.id));
  const ids=registry.domains.map(domain=>domain.id);
  const idSet=new Set(ids);

  if(registry.contract!=='shoporation.domain-foundations.v1')issues.push('DOMAIN_CONTRACT_INVALID');
  if(registry.status!=='canonical')issues.push('DOMAIN_REGISTRY_NOT_CANONICAL');
  if(new Set(ids).size!==ids.length)issues.push('DOMAIN_ID_DUPLICATE');

  const truthOwners=new Map<string,string>();
  for(const domain of registry.domains){
    if(!domain.owner.trim())issues.push(`DOMAIN_OWNER_REQUIRED:${domain.id}`);
    if(!domain.purpose.trim())issues.push(`DOMAIN_PURPOSE_REQUIRED:${domain.id}`);
    if(!domain.truthOwnership.length)issues.push(`DOMAIN_TRUTH_OWNERSHIP_REQUIRED:${domain.id}`);
    if(!domain.responsibilities.length)issues.push(`DOMAIN_RESPONSIBILITY_REQUIRED:${domain.id}`);
    if(!domain.doesNotOwn.length)issues.push(`DOMAIN_NEGATIVE_BOUNDARY_REQUIRED:${domain.id}`);
    if(!domain.boundaryRules.length)issues.push(`DOMAIN_BOUNDARY_RULE_REQUIRED:${domain.id}`);
    if(!domain.canonicalPaths.length)issues.push(`DOMAIN_CANONICAL_PATH_REQUIRED:${domain.id}`);
    if(!domain.evidenceObligations.length)issues.push(`DOMAIN_EVIDENCE_REQUIRED:${domain.id}`);

    for(const truth of domain.truthOwnership){
      const prior=truthOwners.get(truth);
      if(prior)issues.push(`DOMAIN_TRUTH_OWNER_DUPLICATE:${truth}:${prior}:${domain.id}`);
      else truthOwners.set(truth,domain.id);
    }

    for(const dep of domain.dependsOn)if(!idSet.has(dep))issues.push(`DOMAIN_DEPENDENCY_UNKNOWN:${domain.id}:${dep}`);
    for(const principle of domain.principles)if(!principleIds.has(principle))issues.push(`DOMAIN_PRINCIPLE_UNKNOWN:${domain.id}:${principle}`);
  }

  const visiting=new Set<string>(),visited=new Set<string>();
  const byId=new Map(registry.domains.map(domain=>[domain.id,domain]));
  const visit=(id:string)=>{
    if(visiting.has(id)){issues.push(`DOMAIN_DEPENDENCY_CYCLE:${id}`);return;}
    if(visited.has(id))return;
    visiting.add(id);
    for(const dep of byId.get(id)?.dependsOn??[])visit(dep);
    visiting.delete(id);
    visited.add(id);
  };
  for(const id of ids)visit(id);

  return {ok:issues.length===0,issues,truthOwnerCount:truthOwners.size,domainCount:registry.domains.length};
}

export function dependencyClosure(domainId:string){
  const seen=new Set<string>();
  const walk=(id:string)=>{
    if(seen.has(id))return;
    seen.add(id);
    const domain=getDomainFoundation(id);
    for(const dep of domain?.dependsOn??[])walk(dep);
  };
  walk(domainId);
  seen.delete(domainId);
  return [...seen];
}
