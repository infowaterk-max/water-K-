import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import type {StorefrontTemplateConstraintPlan} from '@/lib/builder/template-factory/constraint-planner';
import type {StorefrontTemplateMediaPlan} from '@/lib/builder/template-factory/media-planner';
import {
  validateStorefrontTemplateGenome,
  type StorefrontTemplateGenome,
} from '@/lib/builder/template-factory/template-genome';

export const STOREFRONT_TEMPLATE_PRODUCTION_LINEAGE_VERSION='shoporation.template-production-lineage.v1' as const;
export type StorefrontTemplateProductionLineageHash=`fnv1a32:${string}`;
export type StorefrontTemplatePackageFingerprint=`fnv1a32:${string}`;

export type StorefrontTemplateProductionLineage={
  contract:typeof STOREFRONT_TEMPLATE_PRODUCTION_LINEAGE_VERSION;
  identity:{
    category:string;
    templateKey:string;
    templateVersion:number;
  };
  compiler:{
    factoryVersion:string;
  };
  sources:{
    foundation:{
      category:string;
      templateKey:string;
      templateVersion:number;
    };
    visualAuthority:{
      contract:string;
      referenceKey:string;
    };
    genome:{
      contract:string;
      genomeVersion:number;
      hash:string;
    };
    templateType:{
      contract:string;
      typeId:string;
    };
    productOwnerIntent:{
      contract:string;
      intentId:string;
      intentVersion:number;
      emphasis:string;
    };
    constraintPlan:{
      contract:string;
      hash:string;
    };
    mediaPlan:{
      contract:string;
      hash:string;
    };
  };
  output:{
    packageFingerprint:StorefrontTemplatePackageFingerprint;
    manifestVersion:string;
    pageSchemaVersion:string;
    pageTypes:readonly string[];
    pageCount:number;
  };
  hash:StorefrontTemplateProductionLineageHash;
};

export type StorefrontTemplateProductionLineageIssue={
  code:string;
  path:string;
  message:string;
  severity:'error';
};

export type StorefrontTemplateProductionLineageResult={
  valid:boolean;
  lineage:StorefrontTemplateProductionLineage|null;
  issues:readonly StorefrontTemplateProductionLineageIssue[];
};

export type StorefrontTemplateProductionLineageInput={
  factoryVersion:string;
  foundation:{
    category:string;
    templateKey:string;
    templateVersion:number;
  };
  recipe:{
    category:string;
    templateKey:string;
    templateVersion:number;
    reference:{key:string};
    genome?:StorefrontTemplateGenome|null;
    productionIntent?:{
      contract:string;
      intentId:string;
      intentVersion:number;
      emphasis:string;
    }|null;
  };
  visualAuthority?:{
    contract:string;
    referenceKey:string;
    state:string;
  }|null;
  constraintPlan?:StorefrontTemplateConstraintPlan|null;
  mediaPlan?:StorefrontTemplateMediaPlan|null;
  package:StorefrontInstallableTemplatePackage;
};

const failure=(code:string,path:string,message:string):StorefrontTemplateProductionLineageIssue=>({
  code,path,message,severity:'error',
});

function canonical(value:unknown):string{
  if(value===undefined)return '"__undefined__"';
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value as Record<string,unknown>)
      .sort()
      .map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key]))
      .join(',')+'}';
  }
  return JSON.stringify(value);
}

function fnv1a32(value:unknown):`fnv1a32:${string}`{
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

const sameIdentity=(
  left:{category:string;templateKey:string;templateVersion:number},
  right:{category:string;templateKey:string;templateVersion:number},
)=>left.category===right.category&&left.templateKey===right.templateKey&&left.templateVersion===right.templateVersion;

function containsConcreteMediaSource(value:unknown):boolean{
  if(typeof value==='string'){
    const text=value.trim();
    return /^(?:https?:|data:|\/|\.\/|\.\.\/)/i.test(text)
      ||/\.(?:png|jpe?g|webp|svg|gif|avif)(?:$|[?#])/i.test(text);
  }
  if(Array.isArray(value))return value.some(containsConcreteMediaSource);
  if(value&&typeof value==='object')return Object.values(value as Record<string,unknown>).some(containsConcreteMediaSource);
  return false;
}

export function fingerprintStorefrontTemplatePackage(
  pkg:StorefrontInstallableTemplatePackage,
):StorefrontTemplatePackageFingerprint{
  return fnv1a32(pkg) as StorefrontTemplatePackageFingerprint;
}

function sourceIssues(input:StorefrontTemplateProductionLineageInput):StorefrontTemplateProductionLineageIssue[]{
  const issues:StorefrontTemplateProductionLineageIssue[]=[];
  const constraint=input.constraintPlan;
  const media=input.mediaPlan;
  const genome=input.recipe.genome;
  const intent=input.recipe.productionIntent;
  const visual=input.visualAuthority;
  const recipeIdentity={
    category:input.recipe.category,
    templateKey:input.recipe.templateKey,
    templateVersion:input.recipe.templateVersion,
  };

  if(!input.factoryVersion.trim())issues.push(failure('PRODUCTION_LINEAGE_FACTORY_VERSION_REQUIRED','factoryVersion','Production lineage requires the canonical Factory version.'));
  if(input.foundation.category!==input.recipe.category)issues.push(failure('PRODUCTION_LINEAGE_FOUNDATION_CATEGORY_DRIFT','foundation.category','Category foundation and recipe category must match.'));

  if(!visual){
    issues.push(failure('PRODUCTION_LINEAGE_VISUAL_AUTHORITY_REQUIRED','visualAuthority','Production lineage requires accepted Visual Authority evidence.'));
  }else{
    if(visual.state!=='accepted-reference')issues.push(failure('PRODUCTION_LINEAGE_VISUAL_AUTHORITY_NOT_ACCEPTED','visualAuthority.state','Production lineage requires an accepted Visual Authority reference.'));
    if(visual.referenceKey!==input.recipe.reference.key)issues.push(failure('PRODUCTION_LINEAGE_VISUAL_AUTHORITY_RECIPE_DRIFT','visualAuthority.referenceKey','Visual Authority reference must match the active Factory recipe.'));
  }

  if(!genome)issues.push(failure('PRODUCTION_LINEAGE_GENOME_REQUIRED','recipe.genome','Production lineage requires the canonical Template Genome.'));
  else{
    const genomeValidation=validateStorefrontTemplateGenome(genome,{
      category:input.recipe.category,
      templateKey:input.recipe.templateKey,
      templateVersion:input.recipe.templateVersion,
    });
    for(const row of genomeValidation.issues){
      issues.push(failure(`PRODUCTION_LINEAGE_${row.code}` ,`recipe.genome.${row.path}`,row.message));
    }
  }
  if(!intent)issues.push(failure('PRODUCTION_LINEAGE_PO_INTENT_REQUIRED','recipe.productionIntent','Production lineage requires bounded Product Owner production intent.'));
  if(!constraint)issues.push(failure('PRODUCTION_LINEAGE_CONSTRAINT_PLAN_REQUIRED','constraintPlan','Production lineage requires a valid Constraint Plan.'));
  if(!media)issues.push(failure('PRODUCTION_LINEAGE_MEDIA_PLAN_REQUIRED','mediaPlan','Production lineage requires a valid Media Plan.'));

  if(constraint){
    const{hash:constraintHash,...constraintWithoutHash}=constraint;
    if(fnv1a32(constraintWithoutHash)!==constraintHash)issues.push(failure('PRODUCTION_LINEAGE_CONSTRAINT_HASH_INVALID','constraintPlan.hash','Constraint Plan hash must match its canonical content.'));
    if(!sameIdentity(constraint.identity,recipeIdentity))issues.push(failure('PRODUCTION_LINEAGE_CONSTRAINT_IDENTITY_DRIFT','constraintPlan.identity','Constraint Plan identity must match the active Factory recipe.'));
    if(visual&&constraint.sources.visualAuthority.referenceKey!==visual.referenceKey)issues.push(failure('PRODUCTION_LINEAGE_VISUAL_AUTHORITY_CONSTRAINT_DRIFT','constraintPlan.sources.visualAuthority.referenceKey','Constraint Plan must bind the same accepted Visual Authority.'));
    if(genome&&constraint.sources.genome.hash!==genome.hash)issues.push(failure('PRODUCTION_LINEAGE_GENOME_HASH_DRIFT','constraintPlan.sources.genome.hash','Constraint Plan Genome hash must match the active recipe Genome.'));
    if(genome&&constraint.sources.genome.genomeVersion!==genome.identity.genomeVersion)issues.push(failure('PRODUCTION_LINEAGE_GENOME_VERSION_DRIFT','constraintPlan.sources.genome.genomeVersion','Constraint Plan Genome version must match the active recipe Genome.'));
    if(intent){
      const bound=constraint.sources.productOwnerIntent;
      if(bound.contract!==intent.contract||bound.intentId!==intent.intentId||bound.intentVersion!==intent.intentVersion||bound.emphasis!==intent.emphasis){
        issues.push(failure('PRODUCTION_LINEAGE_PO_INTENT_DRIFT','constraintPlan.sources.productOwnerIntent','Constraint Plan Product Owner intent binding must match the active recipe intent.'));
      }
    }
  }

  if(media&&constraint){
    const{hash:mediaHash,...mediaWithoutHash}=media;
    if(fnv1a32(mediaWithoutHash)!==mediaHash)issues.push(failure('PRODUCTION_LINEAGE_MEDIA_HASH_INVALID','mediaPlan.hash','Media Plan hash must match its canonical content.'));
    if(!sameIdentity(media.identity,constraint.identity))issues.push(failure('PRODUCTION_LINEAGE_MEDIA_IDENTITY_DRIFT','mediaPlan.identity','Media Plan identity must match the Constraint Plan identity.'));
    if(media.sources.constraintPlanHash!==constraint.hash)issues.push(failure('PRODUCTION_LINEAGE_MEDIA_CONSTRAINT_HASH_DRIFT','mediaPlan.sources.constraintPlanHash','Media Plan must bind the exact Constraint Plan hash.'));
    if(media.sources.genomeHash!==constraint.sources.genome.hash)issues.push(failure('PRODUCTION_LINEAGE_MEDIA_GENOME_HASH_DRIFT','mediaPlan.sources.genomeHash','Media Plan Genome hash must match the Constraint Plan Genome source.'));
    if(media.sources.visualAuthorityReferenceKey!==constraint.sources.visualAuthority.referenceKey)issues.push(failure('PRODUCTION_LINEAGE_MEDIA_VISUAL_AUTHORITY_DRIFT','mediaPlan.sources.visualAuthorityReferenceKey','Media Plan Visual Authority reference must match the Constraint Plan.'));
  }

  if(input.package.manifest.templateKey!==input.recipe.templateKey||input.package.manifest.templateVersion!==input.recipe.templateVersion){
    issues.push(failure('PRODUCTION_LINEAGE_PACKAGE_IDENTITY_DRIFT','package.manifest','Compiled package identity must match the active Factory recipe.'));
  }

  const expectedRecipeIdentity=`${input.recipe.templateKey}@${input.recipe.templateVersion}`;
  for(const[index,page]of input.package.pages.entries()){
    const raw=page.metadata?.templateFactory;
    const metadata=raw&&typeof raw==='object'?raw as Record<string,unknown>:null;
    const path=`package.pages[${index}].metadata.templateFactory`;
    if(!metadata){
      issues.push(failure('PRODUCTION_LINEAGE_PAGE_PROVENANCE_REQUIRED',path,'Compiled package pages must retain canonical Factory provenance.'));
      continue;
    }
    if(metadata.compileSource!=='template-factory')issues.push(failure('PRODUCTION_LINEAGE_COMPILE_SOURCE_DRIFT',`${path}.compileSource`,'Compiled page lineage must originate from template-factory.'));
    if(metadata.recipeIdentity!==expectedRecipeIdentity)issues.push(failure('PRODUCTION_LINEAGE_RECIPE_IDENTITY_DRIFT',`${path}.recipeIdentity`,'Compiled page recipe identity must match the active recipe.'));
    if(metadata.targetTemplateKey!==input.recipe.templateKey)issues.push(failure('PRODUCTION_LINEAGE_PAGE_TEMPLATE_KEY_DRIFT',`${path}.targetTemplateKey`,'Compiled page target template key must match the active recipe.'));
    if(metadata.targetTemplateVersion!==input.recipe.templateVersion)issues.push(failure('PRODUCTION_LINEAGE_PAGE_TEMPLATE_VERSION_DRIFT',`${path}.targetTemplateVersion`,'Compiled page target template version must match the active recipe.'));
    if(metadata.referenceKey!==input.recipe.reference.key)issues.push(failure('PRODUCTION_LINEAGE_PAGE_REFERENCE_DRIFT',`${path}.referenceKey`,'Compiled page Visual Authority reference must match the active recipe.'));
    if(metadata.category!==input.recipe.category)issues.push(failure('PRODUCTION_LINEAGE_PAGE_CATEGORY_DRIFT',`${path}.category`,'Compiled page category must match the active recipe.'));
    if(metadata.foundationTemplateKey!==input.foundation.templateKey)issues.push(failure('PRODUCTION_LINEAGE_FOUNDATION_KEY_DRIFT',`${path}.foundationTemplateKey`,'Compiled page foundation key must match the lineage foundation source.'));
    if(metadata.foundationTemplateVersion!==input.foundation.templateVersion)issues.push(failure('PRODUCTION_LINEAGE_FOUNDATION_VERSION_DRIFT',`${path}.foundationTemplateVersion`,'Compiled page foundation version must match the lineage foundation source.'));
  }

  return issues;
}

function buildLineage(input:StorefrontTemplateProductionLineageInput):StorefrontTemplateProductionLineage{
  const constraint=input.constraintPlan!;
  const media=input.mediaPlan!;
  const genome=input.recipe.genome!;
  const intent=input.recipe.productionIntent!;
  const visual=input.visualAuthority!;

  const withoutHash:Omit<StorefrontTemplateProductionLineage,'hash'>={
    contract:STOREFRONT_TEMPLATE_PRODUCTION_LINEAGE_VERSION,
    identity:{
      category:input.recipe.category,
      templateKey:input.recipe.templateKey,
      templateVersion:input.recipe.templateVersion,
    },
    compiler:{factoryVersion:input.factoryVersion},
    sources:{
      foundation:{
        category:input.foundation.category,
        templateKey:input.foundation.templateKey,
        templateVersion:input.foundation.templateVersion,
      },
      visualAuthority:{
        contract:visual.contract,
        referenceKey:visual.referenceKey,
      },
      genome:{
        contract:genome.contract,
        genomeVersion:genome.identity.genomeVersion,
        hash:genome.hash,
      },
      templateType:{
        contract:constraint.sources.templateType.contract,
        typeId:constraint.sources.templateType.typeId,
      },
      productOwnerIntent:{
        contract:intent.contract,
        intentId:intent.intentId,
        intentVersion:intent.intentVersion,
        emphasis:intent.emphasis,
      },
      constraintPlan:{
        contract:constraint.contract,
        hash:constraint.hash,
      },
      mediaPlan:{
        contract:media.contract,
        hash:media.hash,
      },
    },
    output:{
      packageFingerprint:fingerprintStorefrontTemplatePackage(input.package),
      manifestVersion:String(input.package.manifest.manifestVersion),
      pageSchemaVersion:String(input.package.manifest.pageSchemaVersion),
      pageTypes:Object.freeze([...input.package.manifest.pageTypes]),
      pageCount:input.package.pages.length,
    },
  };

  if(containsConcreteMediaSource(withoutHash)){
    throw new Error('PRODUCTION_LINEAGE_CONCRETE_MEDIA_SOURCE_FORBIDDEN');
  }
  return deepFreeze({...withoutHash,hash:fnv1a32(withoutHash) as StorefrontTemplateProductionLineageHash});
}

export function createStorefrontTemplateProductionLineage(
  input:StorefrontTemplateProductionLineageInput,
):StorefrontTemplateProductionLineageResult{
  const issues=sourceIssues(input);
  if(issues.length)return Object.freeze({valid:false,lineage:null,issues:Object.freeze(issues)});
  try{
    return Object.freeze({valid:true,lineage:buildLineage(input),issues:Object.freeze([])});
  }catch(error){
    return Object.freeze({
      valid:false,
      lineage:null,
      issues:Object.freeze([failure(
        'PRODUCTION_LINEAGE_PAYLOAD_INVALID',
        'lineage',
        error instanceof Error?error.message:String(error),
      )]),
    });
  }
}

export function validateStorefrontTemplateProductionLineage(input:
  StorefrontTemplateProductionLineageInput&{lineage?:StorefrontTemplateProductionLineage|null},
):StorefrontTemplateProductionLineageResult{
  const expected=createStorefrontTemplateProductionLineage(input);
  if(!expected.valid||!expected.lineage)return expected;
  const provided=input.lineage;
  if(!provided){
    return Object.freeze({
      valid:false,lineage:null,
      issues:Object.freeze([failure('PRODUCTION_LINEAGE_REQUIRED','lineage','Production lineage validation requires the lineage record to validate.')]),
    });
  }

  const issues:StorefrontTemplateProductionLineageIssue[]=[];
  if(provided.contract!==STOREFRONT_TEMPLATE_PRODUCTION_LINEAGE_VERSION){
    issues.push(failure('PRODUCTION_LINEAGE_CONTRACT_INVALID','lineage.contract','Production lineage contract version is unsupported.'));
  }
  if(provided.output.packageFingerprint!==expected.lineage.output.packageFingerprint){
    issues.push(failure('PRODUCTION_LINEAGE_PACKAGE_FINGERPRINT_MISMATCH','lineage.output.packageFingerprint','Compiled package fingerprint no longer matches the lineage output evidence.'));
  }
  if(provided.hash!==expected.lineage.hash){
    issues.push(failure('PRODUCTION_LINEAGE_HASH_MISMATCH','lineage.hash','Production lineage hash no longer matches the canonical source/output chain.'));
  }
  if(canonical(provided)!==canonical(expected.lineage)){
    issues.push(failure('PRODUCTION_LINEAGE_CONTENT_DRIFT','lineage','Production lineage content differs from the canonical chain recomputed from current evidence.'));
  }
  if(containsConcreteMediaSource(provided)){
    issues.push(failure('PRODUCTION_LINEAGE_CONCRETE_MEDIA_SOURCE_FORBIDDEN','lineage','Production lineage may store Media Plan identity only, never concrete media sources.'));
  }

  return Object.freeze({
    valid:issues.length===0,
    lineage:issues.length?null:provided,
    issues:Object.freeze(issues),
  });
}
