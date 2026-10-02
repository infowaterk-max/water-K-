import type {StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

export const STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION='shoporation.template-production-compiler.v1' as const;

export type StorefrontTemplateProductionCompilerHash=`fnv1a32:${string}`;

export type StorefrontTemplateProductionCompilerPageOperation={
  type:'materialize-page-preset';
  pageType:StorefrontBuilderPageType;
  presetId:string;
  sourcePageKey:string;
};

export type StorefrontTemplateProductionCompilerProgram={
  contract:typeof STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION;
  identity:{
    category:string;
    templateKey:string;
    templateVersion:number;
  };
  sources:{
    blueprintContract:string;
    blueprintIdentity:string;
    foundation:{category:string;templateKey:string;templateVersion:number};
    visualAuthorityReferenceKey:string;
    genomeHash:string;
    constraintPlanHash:string;
    mediaPlanHash:string;
    candidatePackageHash:StorefrontTemplateProductionCompilerHash;
  };
  operations:{
    pagePresets:readonly StorefrontTemplateProductionCompilerPageOperation[];
    inheritedPageTypes:readonly StorefrontBuilderPageType[];
    globalStyles:{sourcePageKey:string};
    shell:{sourcePageKey:string;headerNodeId:string;footerNodeId:string};
    demo:{namespace:string;fixtureCount:number};
  };
  hash:StorefrontTemplateProductionCompilerHash;
};

export type StorefrontTemplateProductionCompilerValidationIssue={
  code:string;
  path:string;
  message:string;
  severity:'error';
};

const failure=(code:string,path:string,message:string):StorefrontTemplateProductionCompilerValidationIssue=>({code,path,message,severity:'error'});

function canonical(value:unknown):string{
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value as Record<string,unknown>).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  }
  return JSON.stringify(value);
}

function digest(value:unknown):StorefrontTemplateProductionCompilerHash{
  let hash=2166136261;
  const text=canonical(value);
  for(let index=0;index<text.length;index+=1){
    hash^=text.charCodeAt(index);
    hash=Math.imul(hash,16777619);
  }
  return ('fnv1a32:'+(hash>>>0).toString(16).padStart(8,'0')) as StorefrontTemplateProductionCompilerHash;
}

function withoutTemplateFactoryMetadata(pkg:StorefrontInstallableTemplatePackage):StorefrontInstallableTemplatePackage{
  const next=structuredClone(pkg);
  next.pages=next.pages.map(page=>{
    if(!page.metadata||typeof page.metadata!=='object')return page;
    const metadata={...(page.metadata as Record<string,unknown>)};
    delete metadata.templateFactory;
    return{...page,metadata};
  });
  return next;
}

export function hashStorefrontTemplateProductionCompilerCandidate(
  pkg:StorefrontInstallableTemplatePackage,
):StorefrontTemplateProductionCompilerHash{
  return digest(withoutTemplateFactoryMetadata(pkg));
}

export function hashStorefrontTemplateProductionCompilerProgram(
  program:Omit<StorefrontTemplateProductionCompilerProgram,'hash'>,
):StorefrontTemplateProductionCompilerHash{
  return digest(program);
}

export function defineStorefrontTemplateProductionCompilerProgram(
  value:Omit<StorefrontTemplateProductionCompilerProgram,'hash'>,
):StorefrontTemplateProductionCompilerProgram{
  const program={
    ...structuredClone(value),
    hash:hashStorefrontTemplateProductionCompilerProgram(value),
  } as StorefrontTemplateProductionCompilerProgram;
  const freeze=<T>(input:T):T=>{
    if(!input||typeof input!=='object'||Object.isFrozen(input))return input;
    Object.freeze(input);
    for(const child of Object.values(input as Record<string,unknown>))freeze(child);
    return input;
  };
  return freeze(program);
}

export function validateStorefrontTemplateProductionCompilerProgram(input:{
  program?:StorefrontTemplateProductionCompilerProgram|null;
  expected:{
    category:string;
    templateKey:string;
    templateVersion:number;
    blueprintContract:string;
    blueprintIdentity:string;
    foundation:{category:string;templateKey:string;templateVersion:number};
    visualAuthorityReferenceKey:string;
    genomeHash:string;
    constraintPlanHash:string;
    mediaPlanHash:string;
    ownedPageTypes:readonly StorefrontBuilderPageType[];
  };
  package:StorefrontInstallableTemplatePackage;
}):readonly StorefrontTemplateProductionCompilerValidationIssue[]{
  const issues:StorefrontTemplateProductionCompilerValidationIssue[]=[];
  const program=input.program;
  if(!program){
    return Object.freeze([failure('PRODUCTION_COMPILER_PROVENANCE_REQUIRED','compiler','Dynamic compiler Blueprint requires recomputable compiler provenance.')]);
  }
  if(program.contract!==STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION)issues.push(failure('PRODUCTION_COMPILER_CONTRACT_INVALID','compiler.contract','Compiler contract version is unsupported.'));
  const expectedHash=hashStorefrontTemplateProductionCompilerProgram((({hash:_hash,...rest})=>rest)(program));
  if(program.hash!==expectedHash)issues.push(failure('PRODUCTION_COMPILER_HASH_INVALID','compiler.hash','Compiler program hash does not match canonical program content.'));

  const checks:[string,unknown,unknown,string][]=[
    ['identity.category',program.identity.category,input.expected.category,'Compiler category must match active recipe.'],
    ['identity.templateKey',program.identity.templateKey,input.expected.templateKey,'Compiler template key must match active recipe.'],
    ['identity.templateVersion',program.identity.templateVersion,input.expected.templateVersion,'Compiler template version must match active recipe.'],
    ['sources.blueprintContract',program.sources.blueprintContract,input.expected.blueprintContract,'Compiler Blueprint contract must match active Blueprint.'],
    ['sources.blueprintIdentity',program.sources.blueprintIdentity,input.expected.blueprintIdentity,'Compiler Blueprint identity must match active Blueprint.'],
    ['sources.foundation.category',program.sources.foundation.category,input.expected.foundation.category,'Compiler foundation category must match active Factory foundation.'],
    ['sources.foundation.templateKey',program.sources.foundation.templateKey,input.expected.foundation.templateKey,'Compiler foundation key must match active Factory foundation.'],
    ['sources.foundation.templateVersion',program.sources.foundation.templateVersion,input.expected.foundation.templateVersion,'Compiler foundation version must match active Factory foundation.'],
    ['sources.visualAuthorityReferenceKey',program.sources.visualAuthorityReferenceKey,input.expected.visualAuthorityReferenceKey,'Compiler Visual Authority must match active accepted reference.'],
    ['sources.genomeHash',program.sources.genomeHash,input.expected.genomeHash,'Compiler Genome hash must match active Genome.'],
    ['sources.constraintPlanHash',program.sources.constraintPlanHash,input.expected.constraintPlanHash,'Compiler Constraint Plan hash must match active plan.'],
    ['sources.mediaPlanHash',program.sources.mediaPlanHash,input.expected.mediaPlanHash,'Compiler Media Plan hash must match active plan.'],
  ];
  for(const[path,actual,expected,message]of checks){
    if(actual!==expected)issues.push(failure('PRODUCTION_COMPILER_SOURCE_DRIFT','compiler.'+path,message));
  }

  const operationTypes=program.operations.pagePresets.map(row=>row.pageType);
  if(new Set(operationTypes).size!==operationTypes.length)issues.push(failure('PRODUCTION_COMPILER_PAGE_OPERATION_DUPLICATE','compiler.operations.pagePresets','Compiler page operations must be unique by page type.'));
  const expectedOwned=[...input.expected.ownedPageTypes];
  const actualOwned=[...operationTypes];
  if(JSON.stringify(actualOwned)!==JSON.stringify(expectedOwned)){
    issues.push(failure('PRODUCTION_COMPILER_PAGE_OPERATION_COVERAGE_DRIFT','compiler.operations.pagePresets','Compiler Page Preset operations must exactly match Blueprint-owned page types in canonical order.'));
  }
  for(const[index,row]of program.operations.pagePresets.entries()){
    if(row.type!=='materialize-page-preset'||!row.presetId.trim()||!row.sourcePageKey.trim()){
      issues.push(failure('PRODUCTION_COMPILER_PAGE_OPERATION_INVALID','compiler.operations.pagePresets['+index+']','Compiler page operation must reference one concrete canonical Page Preset.'));
    }
  }

  const expectedCandidateHash=hashStorefrontTemplateProductionCompilerCandidate(input.package);
  if(program.sources.candidatePackageHash!==expectedCandidateHash){
    issues.push(failure('PRODUCTION_COMPILER_OUTPUT_FINGERPRINT_DRIFT','compiler.sources.candidatePackageHash','Compiler output no longer matches the structured candidate package fingerprint.'));
  }
  return Object.freeze(issues);
}
