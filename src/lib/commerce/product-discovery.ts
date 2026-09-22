import {buildStructuredFacetIndex,buildStructuredSpecGroups,resolveStructuredSpecValue,type StructuredCompareItem,type StructuredProductSpecificationRegistry,type StructuredSpecAssignments,type StructuredSpecValue} from '@/lib/commerce/structured-product';

export const PRODUCT_DISCOVERY_ENGINE_VERSION='shoporation.product-discovery.v1' as const;

export type ProductDiscoveryEligibilityEvidence={
  productActive:boolean;
  variantActive:boolean;
  channelVisible:boolean;
  sellable:boolean;
  reasons?:readonly string[];
};
export type ProductDiscoveryCandidate={
  productId:string;
  variantId:string;
  label:string;
  href:string;
  categoryKeys?:readonly string[];
  searchTerms?:readonly string[];
  productValues:StructuredSpecAssignments;
  variantValues?:StructuredSpecAssignments;
  eligibility:ProductDiscoveryEligibilityEvidence;
  recommendationSignals?:readonly string[];
  contextAttributes?:Readonly<Record<string,unknown>>;
};
export type ProductDiscoveryBoost={signalKey:string;weight:number;reason:string};
export type ProductDiscoveryQuery={
  text?:string;
  categoryKeys?:readonly string[];
  facets?:Readonly<Record<string,readonly string[]|undefined>>;
  boosts?:readonly ProductDiscoveryBoost[];
  limit?:number;
};
export type ProductDiscoveryViolation={code:string;path:string;message:string};
export type ProductDiscoveryEvidence={kind:'query'|'category'|'facet'|'boost';key:string;scoreDelta:number;reason:string};
export type ProductDiscoveryExclusion={productId:string;variantId:string;reasons:string[]};
export type ProductDiscoveryResult={
  id:string;
  productId:string;
  variantId:string;
  label:string;
  href:string;
  score:number;
  evidence:ProductDiscoveryEvidence[];
  finderAttributes:Readonly<Record<string,string|number|boolean|readonly string[]|undefined>>;
  contextAttributes:Readonly<Record<string,unknown>>;
};
export type ProductDiscoveryRunResult={
  engineVersion:typeof PRODUCT_DISCOVERY_ENGINE_VERSION;
  totalCandidates:number;
  eligibleCandidates:number;
  matchedCandidates:number;
  results:ProductDiscoveryResult[];
  facets:ReturnType<typeof buildStructuredFacetIndex>;
  exclusions:ProductDiscoveryExclusion[];
  deterministic:true;
  explainable:true;
};

const KEY=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const safeHref=(value:string)=>value.startsWith('/')||value.startsWith('#')||value.startsWith('https://');
const unique=<T>(values:readonly T[])=>[...new Set(values)];
const issue=(out:ProductDiscoveryViolation[],code:string,path:string,message:string)=>out.push({code,path,message});
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const tokens=(value:string)=>unique(normalize(value).split(/\s+/).filter(Boolean));

export function validateProductDiscoveryQuery(query:ProductDiscoveryQuery):ProductDiscoveryViolation[]{
  const out:ProductDiscoveryViolation[]=[];
  if(query.text!==undefined&&query.text.trim().length>200)issue(out,'DISCOVERY_QUERY_TOO_LONG','text','Search text must be at most 200 characters.');
  if(query.limit!==undefined&&(!Number.isInteger(query.limit)||query.limit<1||query.limit>100))issue(out,'DISCOVERY_LIMIT_INVALID','limit','Result limit must be an integer between 1 and 100.');
  for(const[key,values]of Object.entries(query.facets??{})){
    if(!KEY.test(key))issue(out,'DISCOVERY_FACET_KEY_INVALID',`facets.${key}`,'Facet keys must be lowercase and key-safe.');
    if(values&&new Set(values).size!==values.length)issue(out,'DISCOVERY_FACET_VALUE_DUPLICATE',`facets.${key}`,'Facet selections must be unique.');
  }
  const categories=query.categoryKeys??[];
  if(categories.some(key=>!KEY.test(key))||new Set(categories).size!==categories.length)issue(out,'DISCOVERY_CATEGORY_INVALID','categoryKeys','Category keys must be unique and lowercase key-safe.');
  const boostKeys=new Set<string>();
  (query.boosts??[]).forEach((boost,index)=>{
    const path=`boosts.${index}`;
    if(!KEY.test(boost.signalKey)||boostKeys.has(boost.signalKey))issue(out,'DISCOVERY_BOOST_KEY_INVALID',`${path}.signalKey`,'Boost signal keys must be unique and lowercase key-safe.');
    boostKeys.add(boost.signalKey);
    if(!Number.isInteger(boost.weight)||boost.weight<1||boost.weight>100)issue(out,'DISCOVERY_BOOST_WEIGHT_INVALID',`${path}.weight`,'Boost weight must be an integer between 1 and 100.');
    if(!boost.reason.trim())issue(out,'DISCOVERY_BOOST_REASON_REQUIRED',`${path}.reason`,'Boost reason is required for explainability.');
  });
  return out;
}

function eligibilityReasons(candidate:ProductDiscoveryCandidate):string[]{
  const reasons:string[]=[];
  if(!ID.test(candidate.productId)||!ID.test(candidate.variantId))reasons.push('invalid-identity');
  if(!candidate.label.trim())reasons.push('missing-label');
  if(!safeHref(candidate.href))reasons.push('unsafe-href');
  if(!candidate.eligibility.productActive)reasons.push('product-inactive');
  if(!candidate.eligibility.variantActive)reasons.push('variant-inactive');
  if(!candidate.eligibility.channelVisible)reasons.push('channel-hidden');
  if(!candidate.eligibility.sellable)reasons.push('not-sellable');
  return unique([...reasons,...(candidate.eligibility.reasons??[]).filter(Boolean)]);
}

function compareItem(candidate:ProductDiscoveryCandidate):StructuredCompareItem{return{id:`${candidate.productId}:${candidate.variantId}`,label:candidate.label,href:candidate.href,productValues:candidate.productValues,variantValues:candidate.variantValues};}

function finderValue(value:StructuredSpecValue|null):string|number|boolean|readonly string[]|undefined{
  if(!value)return undefined;
  if(value.type==='text'||value.type==='enum'||value.type==='date')return value.value;
  if(value.type==='number'||value.type==='measurement')return value.value;
  if(value.type==='boolean')return value.value;
  if(value.type==='multi-value')return value.value;
  if(value.type==='range')return value.min!==undefined&&value.max!==undefined&&value.min===value.max?value.min:undefined;
}

function finderAttributes(registry:StructuredProductSpecificationRegistry,candidate:ProductDiscoveryCandidate){
  const out:Record<string,string|number|boolean|readonly string[]|undefined>={};
  for(const spec of registry.listSpecs())out[spec.key]=finderValue(resolveStructuredSpecValue(spec,candidate.productValues,candidate.variantValues));
  return out;
}

function searchableText(registry:StructuredProductSpecificationRegistry,candidate:ProductDiscoveryCandidate){
  const specValues=buildStructuredSpecGroups({registry,productValues:candidate.productValues,variantValues:candidate.variantValues,includeMissing:false}).flatMap(group=>group.rows.map(row=>row.displayValue));
  return normalize([candidate.label,...(candidate.searchTerms??[]),...(candidate.categoryKeys??[]),...specValues].join(' '));
}

function matchesFacetSelections(registry:StructuredProductSpecificationRegistry,candidate:ProductDiscoveryCandidate,selections:ProductDiscoveryQuery['facets']){
  for(const[specKey,selected]of Object.entries(selections??{})){
    if(!selected?.length)continue;
    const facet=buildStructuredFacetIndex({registry,items:[compareItem(candidate)]}).find(item=>item.specKey===specKey);
    if(!facet||!facet.options.some(option=>selected.includes(option.key)))return false;
  }
  return true;
}

function queryEvidence(registry:StructuredProductSpecificationRegistry,candidate:ProductDiscoveryCandidate,query:ProductDiscoveryQuery):{matched:boolean;score:number;evidence:ProductDiscoveryEvidence[]}{
  const evidence:ProductDiscoveryEvidence[]=[];let score=0;
  const queryText=query.text?.trim()??'';
  if(queryText){
    const normalizedQuery=normalize(queryText),candidateText=searchableText(registry,candidate),queryTokens=tokens(queryText);
    if(queryTokens.some(token=>!candidateText.includes(token)))return{matched:false,score:0,evidence:[]};
    const label=normalize(candidate.label);
    let delta=10*queryTokens.filter(token=>label.includes(token)).length+3*queryTokens.filter(token=>candidateText.includes(token)).length;
    if(label===normalizedQuery)delta+=100;else if(label.startsWith(normalizedQuery))delta+=50;else if(label.includes(normalizedQuery))delta+=25;
    score+=delta;evidence.push({kind:'query',key:'text',scoreDelta:delta,reason:`Keresési egyezés: ${queryText}`});
  }
  const categories=query.categoryKeys??[];
  if(categories.length){
    const matched=categories.filter(key=>(candidate.categoryKeys??[]).includes(key));
    if(!matched.length)return{matched:false,score:0,evidence:[]};
    const delta=matched.length*5;score+=delta;evidence.push({kind:'category',key:matched.join(','),scoreDelta:delta,reason:'Kategóriaegyezés.'});
  }
  if(!matchesFacetSelections(registry,candidate,query.facets))return{matched:false,score:0,evidence:[]};
  for(const[specKey,selected]of Object.entries(query.facets??{}))if(selected?.length)evidence.push({kind:'facet',key:specKey,scoreDelta:0,reason:'Strukturált terméktulajdonság-szűrő egyezett.'});
  const signals=new Set(candidate.recommendationSignals??[]);
  for(const boost of query.boosts??[])if(signals.has(boost.signalKey)){score+=boost.weight;evidence.push({kind:'boost',key:boost.signalKey,scoreDelta:boost.weight,reason:boost.reason});}
  return{matched:true,score,evidence};
}

export function runProductDiscovery(input:{registry:StructuredProductSpecificationRegistry;query:ProductDiscoveryQuery;candidates:readonly ProductDiscoveryCandidate[]}):ProductDiscoveryRunResult|null{
  if(validateProductDiscoveryQuery(input.query).length)return null;
  const exclusions:ProductDiscoveryExclusion[]=[];
  const eligible=input.candidates.filter(candidate=>{
    const reasons=eligibilityReasons(candidate);
    if(reasons.length){exclusions.push({productId:candidate.productId,variantId:candidate.variantId,reasons});return false;}
    return true;
  });
  const baseForFacets=eligible.filter(candidate=>{
    const withoutFacets={...input.query,facets:{}};
    return queryEvidence(input.registry,candidate,withoutFacets).matched;
  });
  const facets=buildStructuredFacetIndex({registry:input.registry,items:baseForFacets.map(compareItem)});
  const ranked=eligible.flatMap(candidate=>{
    const match=queryEvidence(input.registry,candidate,input.query);if(!match.matched)return[];
    return[{id:`${candidate.productId}:${candidate.variantId}`,productId:candidate.productId,variantId:candidate.variantId,label:candidate.label,href:candidate.href,score:match.score,evidence:match.evidence,finderAttributes:finderAttributes(input.registry,candidate),contextAttributes:{...(candidate.contextAttributes??{})}} satisfies ProductDiscoveryResult];
  }).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label,'hu')||a.productId.localeCompare(b.productId)||a.variantId.localeCompare(b.variantId));
  return{engineVersion:PRODUCT_DISCOVERY_ENGINE_VERSION,totalCandidates:input.candidates.length,eligibleCandidates:eligible.length,matchedCandidates:ranked.length,results:ranked.slice(0,input.query.limit??24),facets,exclusions,deterministic:true,explainable:true};
}

export const PRODUCT_DISCOVERY_AUTHORITY_CONTRACT=Object.freeze({catalogMutation:false,pricingAuthority:false,inventoryMutation:false,customerMutation:false,orderMutation:false,eligibilityInputAuthoritative:true,structuredSpecAuthority:'shoporation.compare-spec-engine.v1',contextMode:'soft-ranking',builderReadyReadModel:true} as const);
export const PRODUCT_DISCOVERY_TEMPLATE_SWITCH_MUTATION_BOUNDARY=Object.freeze({storefrontPageDrafts:true,discoveryConfiguration:false,products:false,variants:false,pricing:false,inventory:false,customers:false,orders:false} as const);
