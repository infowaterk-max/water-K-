import constitutionJson from '../../../quality/knowledge/architecture-constitution.v1.json';
import domainsJson from '../../../quality/knowledge/domain-foundations.v1.json';

export type ArchitecturePrinciple={id:string;title:string;rule:string;enforcement:string[]};
export type ArchitectureConstitution=typeof constitutionJson;
export type DomainFoundationRegistry=typeof domainsJson;

export const ARCHITECTURE_CONSTITUTION=constitutionJson;
export const DOMAIN_FOUNDATIONS=domainsJson;

export function validateArchitectureConstitution(
  constitution:ArchitectureConstitution=ARCHITECTURE_CONSTITUTION,
  domains:DomainFoundationRegistry=DOMAIN_FOUNDATIONS,
){
  const issues:string[]=[];
  if(constitution.contract!=='shoporation.architecture-constitution.v1')issues.push('CONSTITUTION_CONTRACT_INVALID');
  if(domains.contract!=='shoporation.domain-foundations.v1')issues.push('DOMAIN_FOUNDATIONS_CONTRACT_INVALID');

  const principleIds=constitution.principles.map(item=>item.id);
  if(new Set(principleIds).size!==principleIds.length)issues.push('CONSTITUTION_PRINCIPLE_ID_DUPLICATE');
  const principleSet=new Set(principleIds);
  for(const id of domains.globalPrinciples)if(!principleSet.has(id))issues.push(`DOMAIN_GLOBAL_PRINCIPLE_UNKNOWN:${id}`);

  const domainIds=domains.domains.map(item=>item.id);
  if(new Set(domainIds).size!==domainIds.length)issues.push('DOMAIN_ID_DUPLICATE');
  const domainSet=new Set(domainIds);
  for(const domain of domains.domains){
    if(!domain.owner?.trim())issues.push(`DOMAIN_OWNER_REQUIRED:${domain.id}`);
    if(!domain.canonicalPaths.length)issues.push(`DOMAIN_CANONICAL_PATH_REQUIRED:${domain.id}`);
    for(const id of domain.principles)if(!principleSet.has(id))issues.push(`DOMAIN_PRINCIPLE_UNKNOWN:${domain.id}:${id}`);
    for(const dependency of domain.dependsOn)if(!domainSet.has(dependency))issues.push(`DOMAIN_DEPENDENCY_UNKNOWN:${domain.id}:${dependency}`);
  }

  const visiting=new Set<string>(),visited=new Set<string>(),byId=new Map(domains.domains.map(item=>[item.id,item]));
  const walk=(id:string)=>{
    if(visiting.has(id)){issues.push(`DOMAIN_DEPENDENCY_CYCLE:${id}`);return;}
    if(visited.has(id))return;
    visiting.add(id);
    for(const dep of byId.get(id)?.dependsOn??[])walk(dep);
    visiting.delete(id);visited.add(id);
  };
  for(const id of domainIds)walk(id);

  if(constitution.authorityOrder[0]!=='architecture-constitution')issues.push('CONSTITUTION_NOT_TOP_AUTHORITY');
  if(!constitution.amendmentPolicy.requiresVersionBump||!constitution.amendmentPolicy.forbidsSilentOverride)issues.push('CONSTITUTION_AMENDMENT_POLICY_WEAK');

  return {ok:issues.length===0,issues};
}

export function domainFoundation(id:string){
  return DOMAIN_FOUNDATIONS.domains.find(domain=>domain.id===id)??null;
}
