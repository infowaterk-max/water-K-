import {STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontTemplateConstraintPlan} from '@/lib/builder/template-factory/constraint-planner';
import type {
  StorefrontTemplateFactoryMediaAspectRatio,
  StorefrontTemplateFactoryMediaAsset,
  StorefrontTemplateFactoryMediaManifest,
  StorefrontTemplateFactoryMediaRole,
  StorefrontTemplateFactorySemanticMediaBinding,
} from '@/lib/builder/template-factory/scaffold';

export const STOREFRONT_TEMPLATE_MEDIA_PLAN_VERSION='shoporation.template-media-plan.v1' as const;
export type StorefrontTemplateMediaPlanHash=`fnv1a32:${string}`;

export type StorefrontTemplateMediaAssetBrief={
  semanticRole:string;
  technicalRole:StorefrontTemplateFactoryMediaRole;
  required:boolean;
  minCount:number;
  aspectRatio:StorefrontTemplateFactoryMediaAspectRatio;
  pageTypes:readonly StorefrontBuilderPageType[];
  representative:true;
  artDirection:{
    typeLanguage:string;
    genomeLanguage:string;
    genomeRules:readonly string[];
    forbiddenSimilarities:readonly string[];
    exclusionRules:readonly string[];
  };
  production:{
    sourcePolicy:'package-owned-or-internal-reference-before-po';
    stateFlow:'planned->internal-reference->ready';
    atomicPromotionRequired:true;
  };
};

export type StorefrontTemplateMediaPlan={
  contract:typeof STOREFRONT_TEMPLATE_MEDIA_PLAN_VERSION;
  identity:{category:string;templateKey:string;templateVersion:number};
  sources:{
    constraintPlanHash:string;
    genomeHash:string;
    visualAuthorityReferenceKey:string;
  };
  briefs:readonly StorefrontTemplateMediaAssetBrief[];
  hash:StorefrontTemplateMediaPlanHash;
};

export type StorefrontTemplateMediaPlannerIssue={code:string;path:string;message:string;severity:'error'};
export type StorefrontTemplateMediaRepairAction={
  action:'add-asset'|'promote-or-replace'|'fix-role'|'fix-aspect-ratio'|'fix-page-scope'|'bind-semantic-role';
  semanticRole:string;
  assetKey?:string;
  message:string;
};
export type StorefrontTemplateMediaFulfillment={
  semanticRole:string;
  required:boolean;
  technicalCount:number;
  readyCount:number;
  minCount:number;
  technicalFulfilled:boolean;
  readyFulfilled:boolean;
};
export type StorefrontTemplateMediaPlannerResult={
  valid:boolean;
  plan:StorefrontTemplateMediaPlan|null;
  technicalFulfilled:boolean;
  readyFulfilled:boolean;
  fulfillment:readonly StorefrontTemplateMediaFulfillment[];
  repairs:readonly StorefrontTemplateMediaRepairAction[];
  issues:readonly StorefrontTemplateMediaPlannerIssue[];
};

export type StorefrontTemplateMediaPromotionResult={
  valid:boolean;
  asset:StorefrontTemplateFactoryMediaAsset|null;
  issues:readonly StorefrontTemplateMediaPlannerIssue[];
};

const failure=(code:string,path:string,message:string):StorefrontTemplateMediaPlannerIssue=>({code,path,message,severity:'error'});

function canonical(value:unknown):string{
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value as Record<string,unknown>).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  }
  return JSON.stringify(value);
}
function digest(value:unknown):StorefrontTemplateMediaPlanHash{
  let hash=2166136261;
  const text=canonical(value);
  for(let index=0;index<text.length;index+=1){
    hash^=text.charCodeAt(index);
    hash=Math.imul(hash,16777619);
  }
  return `fnv1a32:${(hash>>>0).toString(16).padStart(8,'0')}`;
}
function deepFreeze<T>(value:T):T{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  return value;
}
const unique=<T extends string>(values:readonly T[]):T[]=>[...new Set(values)];
const subset=(left:readonly string[],right:readonly string[])=>{
  const set=new Set(right); return left.every(item=>set.has(item));
};
const localPath=(value:string)=>value.startsWith('/')&&!/^\/\//.test(value);
const https=(value:string|undefined)=>typeof value==='string'&&/^https:\/\//i.test(value);
const matchingAspect=(actual:StorefrontTemplateFactoryMediaAspectRatio|undefined,expected:StorefrontTemplateFactoryMediaAspectRatio)=>expected==='free'||actual===expected;

function validateBindings(plan:StorefrontTemplateConstraintPlan,manifest:StorefrontTemplateFactoryMediaManifest){
  const issues:StorefrontTemplateMediaPlannerIssue[]=[];
  const bindings=manifest.semanticBindings??[];
  const allowed=new Set(plan.constraints.media.allowedSemanticRoles);
  const required=new Set(plan.constraints.media.requiredSemanticRoles);
  const technicalRoles=new Set(manifest.requiredRoles);
  const seen=new Set<string>();

  for(const[index,binding]of bindings.entries()){
    const path=`media.semanticBindings[${index}]`;
    if(!binding.semanticRole.trim())issues.push(failure('MEDIA_PLANNER_SEMANTIC_ROLE_REQUIRED',`${path}.semanticRole`,'Semantic media binding requires a role.'));
    if(seen.has(binding.semanticRole))issues.push(failure('MEDIA_PLANNER_SEMANTIC_ROLE_DUPLICATE',`${path}.semanticRole`,'Semantic media roles must be unique.'));
    seen.add(binding.semanticRole);
    if(!allowed.has(binding.semanticRole))issues.push(failure('MEDIA_PLANNER_SEMANTIC_ROLE_OUT_OF_BOUNDS',`${path}.semanticRole`,'Semantic media role must be allowed by the Constraint Plan.'));
    if(!technicalRoles.has(binding.technicalRole))issues.push(failure('MEDIA_PLANNER_TECHNICAL_ROLE_OUT_OF_BOUNDS',`${path}.technicalRole`,'Semantic binding technical role must be declared by the Factory media manifest.'));
    if(!Number.isInteger(binding.minCount)||binding.minCount<1)issues.push(failure('MEDIA_PLANNER_MIN_COUNT_INVALID',`${path}.minCount`,'Semantic binding minCount must be a positive integer.'));
    if(!binding.pageTypes.length||!subset(binding.pageTypes,STOREFRONT_PAGE_TYPES))issues.push(failure('MEDIA_PLANNER_PAGE_SCOPE_INVALID',`${path}.pageTypes`,'Semantic binding page scope must use canonical storefront page types.'));
    const technicalRequirement=(manifest.requirements??[]).find(row=>row.role===binding.technicalRole&&row.aspectRatio===binding.aspectRatio);
    if(!technicalRequirement||technicalRequirement.minCount<binding.minCount){
      issues.push(failure('MEDIA_PLANNER_TECHNICAL_REQUIREMENT_MISSING',path,'Semantic binding must be backed by an equal-or-stronger technical manifest requirement.'));
    }
  }
  for(const semanticRole of required){
    if(!seen.has(semanticRole))issues.push(failure('MEDIA_PLANNER_REQUIRED_BINDING_MISSING',`media.semanticBindings.${semanticRole}`,'Every required Constraint Plan media role needs an explicit semantic binding.'));
  }
  return issues;
}

export function compileStorefrontTemplateMediaPlan(input:{
  constraintPlan?:StorefrontTemplateConstraintPlan|null;
  manifest:StorefrontTemplateFactoryMediaManifest;
}):StorefrontTemplateMediaPlannerResult{
  const issues:StorefrontTemplateMediaPlannerIssue[]=[];
  const repairs:StorefrontTemplateMediaRepairAction[]=[];
  const fulfillment:StorefrontTemplateMediaFulfillment[]=[];
  const constraintPlan=input.constraintPlan;
  if(!constraintPlan){
    return Object.freeze({
      valid:false,plan:null,technicalFulfilled:false,readyFulfilled:false,
      fulfillment:Object.freeze([]),repairs:Object.freeze([]),
      issues:Object.freeze([failure('MEDIA_PLANNER_CONSTRAINT_PLAN_REQUIRED','constraintPlan','Media planning requires a valid canonical Constraint Plan.')]),
    });
  }
  issues.push(...validateBindings(constraintPlan,input.manifest));
  const bindings=input.manifest.semanticBindings??[];
  const bindingByRole=new Map(bindings.map(row=>[row.semanticRole,row] as const));
  const required=new Set(constraintPlan.constraints.media.requiredSemanticRoles);

  for(const[index,asset]of input.manifest.assets.entries()){
    if(!asset.semanticRole)continue;
    const binding=bindingByRole.get(asset.semanticRole);
    if(!binding){
      issues.push(failure('MEDIA_PLANNER_ASSET_BINDING_MISSING',`media.assets[${index}].semanticRole`,'Concrete semantic media asset must resolve to an explicit binding.'));
      repairs.push({action:'bind-semantic-role',semanticRole:asset.semanticRole,assetKey:asset.key,message:'Create or correct the semantic binding for this asset.'});
      continue;
    }
    if(asset.role!==binding.technicalRole){
      issues.push(failure('MEDIA_PLANNER_ASSET_ROLE_MISMATCH',`media.assets[${index}].role`,'Concrete asset technical role does not match its semantic brief.'));
      repairs.push({action:'fix-role',semanticRole:binding.semanticRole,assetKey:asset.key,message:`Use technical role ${binding.technicalRole}.`});
    }
    if(!matchingAspect(asset.aspectRatio,binding.aspectRatio)){
      issues.push(failure('MEDIA_PLANNER_ASSET_ASPECT_MISMATCH',`media.assets[${index}].aspectRatio`,'Concrete asset aspect ratio does not match its semantic brief.'));
      repairs.push({action:'fix-aspect-ratio',semanticRole:binding.semanticRole,assetKey:asset.key,message:`Use aspect ratio ${binding.aspectRatio}.`});
    }
    if(!subset(asset.pageTypes,binding.pageTypes)){
      issues.push(failure('MEDIA_PLANNER_ASSET_PAGE_SCOPE_MISMATCH',`media.assets[${index}].pageTypes`,'Concrete asset page scope exceeds its semantic brief.'));
      repairs.push({action:'fix-page-scope',semanticRole:binding.semanticRole,assetKey:asset.key,message:'Restrict the asset to the brief page scope.'});
    }
    if(binding.representative&&asset.representative!==true){
      issues.push(failure('MEDIA_PLANNER_ASSET_REPRESENTATIVE_REQUIRED',`media.assets[${index}].representative`,'Semantic brief requires representative media.'));
    }
  }

  const orderedBindings=[...bindings].sort((a,b)=>{
    const ai=constraintPlan.constraints.media.allowedSemanticRoles.indexOf(a.semanticRole);
    const bi=constraintPlan.constraints.media.allowedSemanticRoles.indexOf(b.semanticRole);
    const ax=ai<0?Number.MAX_SAFE_INTEGER:ai,bx=bi<0?Number.MAX_SAFE_INTEGER:bi;
    return ax-bx||a.semanticRole.localeCompare(b.semanticRole);
  });

  const briefs:StorefrontTemplateMediaAssetBrief[]=orderedBindings.map(binding=>deepFreeze({
    semanticRole:binding.semanticRole,
    technicalRole:binding.technicalRole,
    required:required.has(binding.semanticRole),
    minCount:binding.minCount,
    aspectRatio:binding.aspectRatio,
    pageTypes:Object.freeze([...binding.pageTypes]),
    representative:true,
    artDirection:{
      typeLanguage:constraintPlan.constraints.media.typeLanguage,
      genomeLanguage:constraintPlan.constraints.media.genomeLanguage,
      genomeRules:Object.freeze([...constraintPlan.constraints.media.genomeRules]),
      forbiddenSimilarities:Object.freeze([...constraintPlan.constraints.exclusions.similarities]),
      exclusionRules:Object.freeze([...constraintPlan.constraints.exclusions.rules]),
    },
    production:{
      sourcePolicy:'package-owned-or-internal-reference-before-po',
      stateFlow:'planned->internal-reference->ready',
      atomicPromotionRequired:true,
    },
  }));

  for(const brief of briefs){
    const assets=input.manifest.assets.filter(asset=>asset.semanticRole===brief.semanticRole);
    const validAssets=assets.filter(asset=>asset.role===brief.technicalRole&&matchingAspect(asset.aspectRatio,brief.aspectRatio)&&subset(asset.pageTypes,brief.pageTypes)&&asset.representative===true);
    const technicalCount=validAssets.filter(asset=>asset.state!=='planned').length;
    const readyCount=validAssets.filter(asset=>asset.state==='ready'&&localPath(asset.src)).length;
    const technicalFulfilled=technicalCount>=brief.minCount;
    const readyFulfilled=readyCount>=brief.minCount;
    fulfillment.push(Object.freeze({semanticRole:brief.semanticRole,required:brief.required,technicalCount,readyCount,minCount:brief.minCount,technicalFulfilled,readyFulfilled}));
    if(!technicalFulfilled)repairs.push({action:'add-asset',semanticRole:brief.semanticRole,message:`Add ${brief.minCount-technicalCount} technical media asset(s) matching the brief.`});
    else if(!readyFulfilled)repairs.push({action:'promote-or-replace',semanticRole:brief.semanticRole,message:`Promote or replace ${brief.minCount-readyCount} asset(s) with package-owned ready media.`});
  }

  const withoutHash:Omit<StorefrontTemplateMediaPlan,'hash'>={
    contract:STOREFRONT_TEMPLATE_MEDIA_PLAN_VERSION,
    identity:{...constraintPlan.identity},
    sources:{
      constraintPlanHash:constraintPlan.hash,
      genomeHash:constraintPlan.sources.genome.hash,
      visualAuthorityReferenceKey:constraintPlan.sources.visualAuthority.referenceKey,
    },
    briefs:Object.freeze(briefs),
  };
  const plan=deepFreeze({...withoutHash,hash:digest(withoutHash)} as StorefrontTemplateMediaPlan);
  const requiredFulfillment=fulfillment.filter(row=>row.required);
  return Object.freeze({
    valid:issues.length===0,
    plan,
    technicalFulfilled:requiredFulfillment.length>0&&requiredFulfillment.every(row=>row.technicalFulfilled),
    readyFulfilled:requiredFulfillment.length>0&&requiredFulfillment.every(row=>row.readyFulfilled),
    fulfillment:Object.freeze(fulfillment),
    repairs:Object.freeze(repairs),
    issues:Object.freeze(issues),
  });
}

export function promoteStorefrontTemplateMediaAsset(input:{
  asset:StorefrontTemplateFactoryMediaAsset;
  targetState:'internal-reference'|'ready';
  referenceSrc?:string;
  src?:string;
}):StorefrontTemplateMediaPromotionResult{
  const issues:StorefrontTemplateMediaPlannerIssue[]=[];
  const current=input.asset.state;
  if(current==='planned'&&input.targetState==='internal-reference'){
    if(!https(input.referenceSrc))issues.push(failure('MEDIA_PROMOTION_REFERENCE_SOURCE_REQUIRED','referenceSrc','planned → internal-reference requires an explicit HTTPS reference source.'));
  }else if(current==='internal-reference'&&input.targetState==='ready'){
    const src=input.src??input.asset.src;
    if(!localPath(src))issues.push(failure('MEDIA_PROMOTION_READY_SOURCE_REQUIRED','src','internal-reference → ready requires a package-owned local source.'));
  }else{
    issues.push(failure('MEDIA_PROMOTION_TRANSITION_INVALID','targetState',`Illegal media promotion ${current} → ${input.targetState}.`));
  }
  if(issues.length)return Object.freeze({valid:false,asset:null,issues:Object.freeze(issues)});
  const next=structuredClone(input.asset);
  next.state=input.targetState;
  if(input.referenceSrc!==undefined)next.referenceSrc=input.referenceSrc;
  if(input.src!==undefined)next.src=input.src;
  return Object.freeze({valid:true,asset:deepFreeze(next),issues:Object.freeze([])});
}
