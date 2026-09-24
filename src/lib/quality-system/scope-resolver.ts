import releaseRiskPolicyJson from '../../../deploy/release-risk-policy.json';
import {SHOPERATION_GLOBAL_BASELINE_FAILURE_IDS,SHOPERATION_KNOWN_FAILURES,type ShoperationKnownFailure} from '@/lib/quality-system/shoperation-knowledge';

type ReleaseRiskPolicy={neutralPatterns:readonly string[];subsystems:readonly {name:string;patterns:readonly string[]}[];fallback:{subsystem:string;risk:string};};
const policy=releaseRiskPolicyJson as unknown as ReleaseRiskPolicy;
const knowledgeInfrastructurePrefixes=['src/lib/quality-system/','quality/knowledge/','docs/support/','src/lib/builder/template-factory/knowledge-registry.ts','src/lib/builder/template-factory/procedural-memory.ts','scripts/shoperation-knowledge-','scripts/shoperation-failure-intake.mjs'];
const dependencies:Readonly<Record<string,readonly string[]>>=Object.freeze({'builder-template-system':['shared-storefront'],'storefront-launch-runtime':['auth-access-authority','shared-storefront'],'auth-access-authority':['customer-account'],'payment-checkout-order-authority':['customer-account'],'inventory-fulfillment-authority':['payment-checkout-order-authority']});
function globToRegExp(glob:string){let out='^';for(let i=0;i<glob.length;i+=1){const ch=glob[i]!;if(ch==='*'){const next=glob[i+1];if(next==='*'){i+=1;if(glob[i+1]==='/'){i+=1;out+='(?:.*/)?';}else out+='.*';}else out+='[^/]*';}else if(ch==='?')out+='[^/]';else if('\\.^$+{}()|[]'.includes(ch))out+=`\\${ch}`;else out+=ch;}return new RegExp(`${out}$`);}
const neutralMatchers=policy.neutralPatterns.map(globToRegExp);
const subsystemMatchers=policy.subsystems.map(item=>({...item,matchers:item.patterns.map(globToRegExp)}));
const isKnowledgeInfrastructure=(file:string)=>knowledgeInfrastructurePrefixes.some(prefix=>file.startsWith(prefix));
const isFailureApplicable=(failure:ShoperationKnownFailure,subsystems:Set<string>,full:boolean)=>full||failure.applicability.mode==='always'||failure.applicability.subsystems.some(item=>subsystems.has(item));

export function resolveShoperationKnowledgeScope(input:{changedFiles:readonly string[];forceFull?:boolean}){
  const direct=new Set<string>(),unresolvedFiles:string[]=[];let knowledgeInfrastructureChanged=false;
  for(const file of input.changedFiles){
    if(isKnowledgeInfrastructure(file)){knowledgeInfrastructureChanged=true;continue;}
    if(neutralMatchers.some(matcher=>matcher.test(file)))continue;
    const matches=subsystemMatchers.filter(item=>item.matchers.some(matcher=>matcher.test(file)));
    if(!matches.length)unresolvedFiles.push(file);
    for(const match of matches)direct.add(match.name);
  }
  const expanded=new Set(direct),queue=[...direct];
  while(queue.length){const current=queue.shift()!;for(const dependency of dependencies[current]??[])if(!expanded.has(dependency)){expanded.add(dependency);queue.push(dependency);}}
  const full=Boolean(input.forceFull||knowledgeInfrastructureChanged);
  const activeIds=new Set(SHOPERATION_KNOWN_FAILURES.filter(failure=>isFailureApplicable(failure,expanded,full)).map(item=>item.id));
  for(const id of SHOPERATION_GLOBAL_BASELINE_FAILURE_IDS)activeIds.add(id);
  const selection=SHOPERATION_KNOWN_FAILURES.map(failure=>{const selected=activeIds.has(failure.id),reasons:string[]=[];if(SHOPERATION_GLOBAL_BASELINE_FAILURE_IDS.includes(failure.id))reasons.push('global-baseline');if(full)reasons.push(input.forceFull?'forced-full-replay':'knowledge-infrastructure-changed');if(failure.applicability.mode==='subsystem'){const matched=failure.applicability.subsystems.filter(item=>expanded.has(item));if(matched.length)reasons.push(`subsystem:${matched.join(',')}`);}if(!selected)reasons.push('not-applicable-to-current-scope');return Object.freeze({failureId:failure.id,selected,reasons:Object.freeze(reasons)});});
  return Object.freeze({contract:'shoporation.quality-knowledge-scope.v1' as const,changedFiles:Object.freeze([...input.changedFiles]),directSubsystems:Object.freeze([...direct].sort()),impactedSubsystems:Object.freeze([...expanded].sort()),knowledgeInfrastructureChanged,fullReplay:full,unresolvedFiles:Object.freeze(unresolvedFiles),activeFailureIds:Object.freeze([...activeIds]),selection:Object.freeze(selection)});
}
