import type {StorefrontTemplateVisualAuthorityManifest} from '@/lib/builder/template-factory/production-contracts';
import {
  validateStorefrontTemplateGenome,
  type StorefrontTemplateGenome,
} from '@/lib/builder/template-factory/template-genome';
import {
  STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,
  getStorefrontTemplateTypeDefinition,
  validateStorefrontTemplateTypeCompatibility,
  validateStorefrontTemplateTypeSystemCatalog,
  type StorefrontTemplateDensity,
  type StorefrontTemplateTypeDefinition,
} from '@/lib/builder/template-factory/template-type-system';
import type {StorefrontEngineId} from '@/lib/builder/template-factory/engine-functional-proof-registry';

export const STOREFRONT_TEMPLATE_PRODUCT_OWNER_INTENT_VERSION='shoporation.template-product-owner-intent.v1' as const;
export const STOREFRONT_TEMPLATE_CONSTRAINT_PLAN_VERSION='shoporation.template-constraint-plan.v1' as const;

export type StorefrontTemplateProductOwnerIntent={
  contract:typeof STOREFRONT_TEMPLATE_PRODUCT_OWNER_INTENT_VERSION;
  intentId:string;
  intentVersion:number;
  visualAuthorityReferenceKey:string;
  emphasis:'balanced'|'story-led'|'commerce-led'|'technical-led';
  densityPreference:'inherit'|Exclude<StorefrontTemplateDensity,'mixed'>;
  requiredArchetypes:readonly string[];
  requiredMediaRoles:readonly string[];
  preferredComponentFamilies:readonly string[];
  prioritizedEngines:readonly StorefrontEngineId[];
  note:string;
};

export type StorefrontTemplateConstraintPlanHash=`fnv1a32:${string}`;

export type StorefrontTemplateConstraintPlan={
  contract:typeof STOREFRONT_TEMPLATE_CONSTRAINT_PLAN_VERSION;
  identity:{
    category:string;
    templateKey:string;
    templateVersion:number;
  };
  sources:{
    visualAuthority:{
      contract:string;
      referenceKey:string;
    };
    genome:{
      hash:string;
      genomeVersion:number;
    };
    templateType:{
      contract:typeof STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION;
      typeId:string;
    };
    productOwnerIntent:{
      contract:typeof STOREFRONT_TEMPLATE_PRODUCT_OWNER_INTENT_VERSION;
      intentId:string;
      intentVersion:number;
      emphasis:StorefrontTemplateProductOwnerIntent['emphasis'];
    };
  };
  constraints:{
    composition:{
      allowedArchetypes:readonly string[];
      requiredArchetypes:readonly string[];
      density:Exclude<StorefrontTemplateDensity,'mixed'>|'mixed';
      sectionRhythm:string;
      genomeGrammar:string;
      genomeRules:readonly string[];
    };
    navigation:{
      model:string;
      requiredCapabilities:readonly string[];
      genomeStrategy:string;
      genomeRules:readonly string[];
    };
    interaction:{
      character:string;
      allowedPatterns:readonly string[];
      forbiddenPatterns:readonly string[];
      genomeMotion:string;
      genomeRules:readonly string[];
    };
    content:{
      hierarchy:readonly string[];
      voice:string;
      genomeHierarchy:string;
      genomeRules:readonly string[];
    };
    commerce:{
      journey:string;
      requirements:readonly string[];
      genomeCharacter:string;
      genomeRules:readonly string[];
    };
    media:{
      allowedSemanticRoles:readonly string[];
      requiredSemanticRoles:readonly string[];
      typeLanguage:string;
      genomeLanguage:string;
      genomeRules:readonly string[];
    };
    componentGrammar:{
      allowedFamilies:readonly string[];
      preferredFamilies:readonly string[];
      discouraged:readonly string[];
      typeRules:readonly string[];
      genomeRules:readonly string[];
    };
    engines:{
      required:readonly StorefrontEngineId[];
      priority:readonly StorefrontEngineId[];
    };
    responsive:{
      desktopAuthority:true;
      tabletStrategy:string;
      mobileStrategy:string;
      rules:readonly string[];
    };
    exclusions:{
      identities:readonly string[];
      similarities:readonly string[];
      rules:readonly string[];
    };
    visualAuthority:{
      requiredPageTypes:readonly string[];
      designChangePolicy:'product-owner-reapproval-required';
    };
  };
  hash:StorefrontTemplateConstraintPlanHash;
};

export type StorefrontTemplateConstraintPlannerIssue={
  code:string;
  path:string;
  message:string;
  severity:'error';
};

export type StorefrontTemplateConstraintPlannerResult={
  valid:boolean;
  plan:StorefrontTemplateConstraintPlan|null;
  issues:readonly StorefrontTemplateConstraintPlannerIssue[];
};

const failure=(code:string,path:string,message:string):StorefrontTemplateConstraintPlannerIssue=>({code,path,message,severity:'error'});

function canonical(value:unknown):string{
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value as Record<string,unknown>).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  }
  return JSON.stringify(value);
}

function digest(value:unknown):StorefrontTemplateConstraintPlanHash{
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

const unique=(values:readonly string[])=>[...new Set(values)];
const subset=(selected:readonly string[],allowed:readonly string[])=>{
  const set=new Set(allowed);
  return selected.every(value=>set.has(value));
};
const intersect=(left:readonly string[],right:readonly string[])=>{
  const wanted=new Set(right);
  return unique(left.filter(value=>wanted.has(value)));
};
const orderedSelection=(selected:readonly string[],canonicalOrder:readonly string[])=>{
  const wanted=new Set(selected);
  return canonicalOrder.filter(value=>wanted.has(value));
};

function validateIntent(
  intent:StorefrontTemplateProductOwnerIntent|undefined|null,
  visualAuthority:StorefrontTemplateVisualAuthorityManifest|undefined|null,
  definition:StorefrontTemplateTypeDefinition|null,
  genome:StorefrontTemplateGenome|undefined|null,
):StorefrontTemplateConstraintPlannerIssue[]{
  const issues:StorefrontTemplateConstraintPlannerIssue[]=[];
  if(!intent){
    issues.push(failure('CONSTRAINT_PLANNER_INTENT_REQUIRED','intent','Constraint planning requires explicit bounded Product Owner production intent.'));
    return issues;
  }
  if(intent.contract!==STOREFRONT_TEMPLATE_PRODUCT_OWNER_INTENT_VERSION)issues.push(failure('CONSTRAINT_PLANNER_INTENT_CONTRACT_INVALID','intent.contract','Product Owner production intent contract version is unsupported.'));
  if(!intent.intentId.trim())issues.push(failure('CONSTRAINT_PLANNER_INTENT_ID_REQUIRED','intent.intentId','Product Owner production intent requires a stable intent id.'));
  if(!Number.isInteger(intent.intentVersion)||intent.intentVersion<1)issues.push(failure('CONSTRAINT_PLANNER_INTENT_VERSION_INVALID','intent.intentVersion','Product Owner production intent version must be a positive integer.'));
  if(!intent.note.trim())issues.push(failure('CONSTRAINT_PLANNER_INTENT_NOTE_REQUIRED','intent.note','Product Owner production intent must explain the selected emphasis.'));
  if(!visualAuthority){
    issues.push(failure('CONSTRAINT_PLANNER_VISUAL_AUTHORITY_REQUIRED','visualAuthority','Constraint planning requires the accepted Visual Authority manifest.'));
  }else if(intent.visualAuthorityReferenceKey!==visualAuthority.referenceKey){
    issues.push(failure('CONSTRAINT_PLANNER_VISUAL_AUTHORITY_DRIFT','intent.visualAuthorityReferenceKey','Product Owner intent must bind to the exact accepted Visual Authority reference.'));
  }
  if(!definition||!genome)return issues;

  const allowedArchetypes=intersect(definition.layout.archetypes,genome.dimensions.composition.archetypes);
  const allowedMedia=intersect(definition.media.roles,genome.dimensions.image.roles);
  const allowedComponents=intersect(definition.componentGrammar.families,genome.dimensions.componentGrammar.preferred);
  const allowedEngines=unique([...definition.engineExpectations.required,...definition.engineExpectations.priority]);

  if(!intent.requiredArchetypes.length)issues.push(failure('CONSTRAINT_PLANNER_ARCHETYPE_SELECTION_REQUIRED','intent.requiredArchetypes','Product Owner intent must select at least one bounded composition archetype.'));
  if(!intent.requiredMediaRoles.length)issues.push(failure('CONSTRAINT_PLANNER_MEDIA_SELECTION_REQUIRED','intent.requiredMediaRoles','Product Owner intent must select at least one semantic media role.'));
  if(!intent.preferredComponentFamilies.length)issues.push(failure('CONSTRAINT_PLANNER_COMPONENT_SELECTION_REQUIRED','intent.preferredComponentFamilies','Product Owner intent must select at least one preferred component family.'));
  if(!subset(unique(intent.requiredArchetypes),allowedArchetypes))issues.push(failure('CONSTRAINT_PLANNER_ARCHETYPE_OUT_OF_BOUNDS','intent.requiredArchetypes','Requested archetypes must be inside the Template Type / Genome semantic intersection.'));
  if(!subset(unique(intent.requiredMediaRoles),allowedMedia))issues.push(failure('CONSTRAINT_PLANNER_MEDIA_ROLE_OUT_OF_BOUNDS','intent.requiredMediaRoles','Requested media roles must be inside the Template Type / Genome semantic intersection.'));
  if(!subset(unique(intent.preferredComponentFamilies),allowedComponents))issues.push(failure('CONSTRAINT_PLANNER_COMPONENT_FAMILY_OUT_OF_BOUNDS','intent.preferredComponentFamilies','Preferred component families must be inside the Template Type / Genome semantic intersection.'));
  if(!subset(unique(intent.prioritizedEngines),allowedEngines))issues.push(failure('CONSTRAINT_PLANNER_ENGINE_OUT_OF_BOUNDS','intent.prioritizedEngines','Prioritized engines must already be expected by the selected Template Type.'));

  if(definition.layout.density!=='mixed'
    &&intent.densityPreference!=='inherit'
    &&intent.densityPreference!==definition.layout.density
  ){
    issues.push(failure('CONSTRAINT_PLANNER_DENSITY_CONFLICT','intent.densityPreference','Fixed-density Template Types cannot be contradicted by Product Owner intent.'));
  }
  return issues;
}

function hasConcreteMediaSource(value:unknown):boolean{
  if(typeof value==='string'){
    const text=value.trim();
    return /^(?:https?:|data:|\/|\.\/|\.\.\/)/i.test(text)||/\.(?:png|jpe?g|webp|svg|gif|avif)(?:$|[?#])/i.test(text);
  }
  if(Array.isArray(value))return value.some(hasConcreteMediaSource);
  if(value&&typeof value==='object')return Object.values(value as Record<string,unknown>).some(hasConcreteMediaSource);
  return false;
}

export function planStorefrontTemplateConstraints(input:{
  category:string;
  templateKey:string;
  templateVersion:number;
  visualAuthority?:StorefrontTemplateVisualAuthorityManifest|null;
  genome?:StorefrontTemplateGenome|null;
  intent?:StorefrontTemplateProductOwnerIntent|null;
}):StorefrontTemplateConstraintPlannerResult{
  const issues:StorefrontTemplateConstraintPlannerIssue[]=[];
  const definition=getStorefrontTemplateTypeDefinition(input.category);
  const typeSystem=validateStorefrontTemplateTypeSystemCatalog();
  for(const row of typeSystem.issues)issues.push(failure(row.code,row.path,row.message));

  const genomeValidation=validateStorefrontTemplateGenome(input.genome,{
    category:input.category,
    templateKey:input.templateKey,
    templateVersion:input.templateVersion,
  });
  for(const row of genomeValidation.issues)issues.push(failure(row.code,row.path,row.message));

  const compatibility=validateStorefrontTemplateTypeCompatibility({category:input.category,genome:input.genome});
  for(const row of compatibility.issues)issues.push(failure(row.code,row.path,row.message));

  if(!input.visualAuthority)issues.push(failure('CONSTRAINT_PLANNER_VISUAL_AUTHORITY_REQUIRED','visualAuthority','Constraint planning requires accepted Visual Authority.'));
  else if(input.visualAuthority.state!=='accepted-reference')issues.push(failure('CONSTRAINT_PLANNER_VISUAL_AUTHORITY_NOT_ACCEPTED','visualAuthority.state','Visual Authority must be an accepted reference.'));
  if(!definition)issues.push(failure('CONSTRAINT_PLANNER_TEMPLATE_TYPE_REQUIRED','category','Constraint planning requires a supported Template Type.'));

  issues.push(...validateIntent(input.intent,input.visualAuthority,definition,input.genome));
  if(issues.length||!definition||!input.genome||!input.visualAuthority||!input.intent){
    return Object.freeze({valid:false,plan:null,issues:Object.freeze(issues)});
  }

  const allowedArchetypes=intersect(definition.layout.archetypes,input.genome.dimensions.composition.archetypes);
  const allowedMediaRoles=intersect(definition.media.roles,input.genome.dimensions.image.roles);
  const allowedComponentFamilies=intersect(definition.componentGrammar.families,input.genome.dimensions.componentGrammar.preferred);
  const requiredArchetypes=orderedSelection(unique(input.intent.requiredArchetypes),allowedArchetypes);
  const requiredMediaRoles=orderedSelection(unique(input.intent.requiredMediaRoles),allowedMediaRoles);
  const preferredComponentFamilies=orderedSelection(unique(input.intent.preferredComponentFamilies),allowedComponentFamilies);
  const canonicalEngineOrder=unique([...definition.engineExpectations.required,...definition.engineExpectations.priority]);
  const selectedEngines=orderedSelection(unique(input.intent.prioritizedEngines),canonicalEngineOrder);
  const priorityEngines=unique([...selectedEngines,...definition.engineExpectations.priority]);
  const density=definition.layout.density==='mixed'&&input.intent.densityPreference!=='inherit'
    ?input.intent.densityPreference
    :definition.layout.density;

  const withoutHash:Omit<StorefrontTemplateConstraintPlan,'hash'>={
    contract:STOREFRONT_TEMPLATE_CONSTRAINT_PLAN_VERSION,
    identity:{
      category:input.category,
      templateKey:input.templateKey,
      templateVersion:input.templateVersion,
    },
    sources:{
      visualAuthority:{
        contract:input.visualAuthority.contract,
        referenceKey:input.visualAuthority.referenceKey,
      },
      genome:{
        hash:input.genome.hash,
        genomeVersion:input.genome.identity.genomeVersion,
      },
      templateType:{
        contract:STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,
        typeId:definition.typeId,
      },
      productOwnerIntent:{
        contract:STOREFRONT_TEMPLATE_PRODUCT_OWNER_INTENT_VERSION,
        intentId:input.intent.intentId,
        intentVersion:input.intent.intentVersion,
        emphasis:input.intent.emphasis,
      },
    },
    constraints:{
      composition:{
        allowedArchetypes:Object.freeze(allowedArchetypes),
        requiredArchetypes:Object.freeze(requiredArchetypes),
        density,
        sectionRhythm:definition.layout.sectionRhythm,
        genomeGrammar:input.genome.dimensions.composition.grammar,
        genomeRules:Object.freeze([...input.genome.dimensions.composition.rules]),
      },
      navigation:{
        model:definition.navigation.model,
        requiredCapabilities:Object.freeze([...definition.navigation.requiredCapabilities]),
        genomeStrategy:input.genome.dimensions.shell.navigation,
        genomeRules:Object.freeze([...input.genome.dimensions.shell.rules]),
      },
      interaction:{
        character:definition.interaction.character,
        allowedPatterns:Object.freeze([...definition.interaction.patterns]),
        forbiddenPatterns:Object.freeze([...definition.interaction.forbidden]),
        genomeMotion:input.genome.dimensions.motion.character,
        genomeRules:Object.freeze([...input.genome.dimensions.motion.rules]),
      },
      content:{
        hierarchy:Object.freeze([...definition.content.hierarchy]),
        voice:definition.content.voice,
        genomeHierarchy:input.genome.dimensions.content.hierarchy,
        genomeRules:Object.freeze([...input.genome.dimensions.content.rules]),
      },
      commerce:{
        journey:definition.commerce.journey,
        requirements:Object.freeze([...definition.commerce.requirements]),
        genomeCharacter:input.genome.dimensions.commerce.character,
        genomeRules:Object.freeze([...input.genome.dimensions.commerce.rules]),
      },
      media:{
        allowedSemanticRoles:Object.freeze(allowedMediaRoles),
        requiredSemanticRoles:Object.freeze(requiredMediaRoles),
        typeLanguage:definition.media.language,
        genomeLanguage:input.genome.dimensions.image.language,
        genomeRules:Object.freeze([...input.genome.dimensions.image.rules]),
      },
      componentGrammar:{
        allowedFamilies:Object.freeze(allowedComponentFamilies),
        preferredFamilies:Object.freeze(preferredComponentFamilies),
        discouraged:Object.freeze([...input.genome.dimensions.componentGrammar.discouraged]),
        typeRules:Object.freeze([...definition.componentGrammar.rules]),
        genomeRules:Object.freeze([...input.genome.dimensions.componentGrammar.rules]),
      },
      engines:{
        required:Object.freeze([...definition.engineExpectations.required]),
        priority:Object.freeze(priorityEngines),
      },
      responsive:{
        desktopAuthority:true,
        tabletStrategy:input.genome.dimensions.responsive.tabletStrategy,
        mobileStrategy:input.genome.dimensions.responsive.mobileStrategy,
        rules:Object.freeze([...input.genome.dimensions.responsive.rules]),
      },
      exclusions:{
        identities:Object.freeze([...input.genome.dimensions.exclusion.identities]),
        similarities:Object.freeze([...input.genome.dimensions.exclusion.similarities]),
        rules:Object.freeze([...input.genome.dimensions.exclusion.rules]),
      },
      visualAuthority:{
        requiredPageTypes:Object.freeze([...input.visualAuthority.requiredPageTypes]),
        designChangePolicy:input.visualAuthority.designChangePolicy,
      },
    },
  };

  if(hasConcreteMediaSource(withoutHash.constraints.media)){
    issues.push(failure('CONSTRAINT_PLANNER_CONCRETE_MEDIA_FORBIDDEN','constraints.media','Constraint Plan may carry semantic media language and roles only, never concrete media sources.'));
    return Object.freeze({valid:false,plan:null,issues:Object.freeze(issues)});
  }

  const plan=deepFreeze({...withoutHash,hash:digest(withoutHash)} as StorefrontTemplateConstraintPlan);
  return Object.freeze({valid:true,plan,issues:Object.freeze([])});
}
