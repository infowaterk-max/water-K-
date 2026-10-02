import {
  STOREFRONT_PAGE_TYPES,
  type StorefrontBuilderPageType,
} from '@/lib/builder/storefront-foundation';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_TEMPLATE_VISUAL_AUTHORITY_VERSION='shoporation.template-visual-authority.v0.1' as const;
export const STOREFRONT_TEMPLATE_FILE_OWNERSHIP_CONTRACT_VERSION='shoporation.template-file-ownership.v0.1' as const;
export const STOREFRONT_TEMPLATE_COMPONENT_USAGE_MANIFEST_VERSION='shoporation.template-component-usage.v0.1' as const;
export const STOREFRONT_TEMPLATE_PRODUCTION_CONTRACTS_VERSION='shoporation.template-production-contracts.v0.1' as const;

export type StorefrontTemplateVisualAuthorityManifest={
  contract:typeof STOREFRONT_TEMPLATE_VISUAL_AUTHORITY_VERSION;
  referenceKey:string;
  state:'accepted-reference';
  requiredPageTypes:readonly StorefrontBuilderPageType[];
  designChangePolicy:'product-owner-reapproval-required';
};

export type StorefrontTemplateFileOwnershipContract={
  contract:typeof STOREFRONT_TEMPLATE_FILE_OWNERSHIP_CONTRACT_VERSION;
  templateOwnedRoots:readonly string[];
  sharedAuthorityPolicy:'canonical-extension-review';
};

export type StorefrontTemplateProductionContractDeclaration={
  visualAuthority:StorefrontTemplateVisualAuthorityManifest;
  fileOwnership:StorefrontTemplateFileOwnershipContract;
};

export type StorefrontTemplateComponentUsageEntry={
  componentKey:string;
  nodeCount:number;
  pageTypes:readonly StorefrontBuilderPageType[];
};

export type StorefrontTemplateComponentUsageManifest={
  contract:typeof STOREFRONT_TEMPLATE_COMPONENT_USAGE_MANIFEST_VERSION;
  totalNodeCount:number;
  uniqueComponentCount:number;
  pageTypes:readonly StorefrontBuilderPageType[];
  entries:readonly StorefrontTemplateComponentUsageEntry[];
};

export type StorefrontTemplateProductionContractIssue={
  code:string;
  path:string;
  message:string;
  severity:'error';
};

export type StorefrontTemplateProductionContractsResult={
  contract:typeof STOREFRONT_TEMPLATE_PRODUCTION_CONTRACTS_VERSION;
  declared:boolean;
  ready:boolean;
  visualAuthority:StorefrontTemplateVisualAuthorityManifest|null;
  fileOwnership:StorefrontTemplateFileOwnershipContract|null;
  componentUsage:StorefrontTemplateComponentUsageManifest;
  issues:readonly StorefrontTemplateProductionContractIssue[];
};

export type StorefrontTemplateFileOwnershipChangeIssue={
  code:string;
  path:string;
  message:string;
  severity:'error'|'review';
};

export type StorefrontTemplateFileOwnershipChangeResult={
  ready:boolean;
  reviewRequired:boolean;
  classifications:readonly {
    path:string;
    ownership:'template-owned'|'shared-authority'|'outside-contract';
  }[];
  issues:readonly StorefrontTemplateFileOwnershipChangeIssue[];
};

type ProductionRecipeProjection={
  reference:{
    key:string;
    approved:boolean;
    requiredPageTypes:readonly StorefrontBuilderPageType[];
  };
};

const SHARED_AUTHORITY_PREFIXES=Object.freeze([
  'src/components/builder/',
  'src/lib/builder/storefront-',
  'src/lib/builder/template-factory/scaffold.ts',
  'src/lib/builder/template-factory/generator-readiness.ts',
  'src/lib/builder/template-factory/production-contracts.ts',
  'src/lib/builder/template-factory/template-genome.ts',
  'src/lib/builder/template-factory/template-type-system.ts',
  'src/lib/builder/template-factory/constraint-planner.ts',
  'src/lib/builder/template-factory/media-planner.ts',
  'src/lib/builder/template-factory/production-lineage.ts',
  'src/lib/builder/template-factory/template-distinctness.ts',
  'src/lib/builder/template-factory/recipe-registry.ts',
] as const);

const BROAD_TEMPLATE_ROOTS=new Set([
  '.','src','src/','src/lib','src/lib/','src/lib/builder','src/lib/builder/',
  'src/lib/builder/template-factory','src/lib/builder/template-factory/',
  'src/lib/builder/templates','src/lib/builder/templates/','public','public/',
]);

const failure=(code:string,path:string,message:string):StorefrontTemplateProductionContractIssue=>({code,path,message,severity:'error'});
const duplicate=(items:readonly string[])=>new Set(items).size!==items.length;
const sameSet=(left:readonly string[],right:readonly string[])=>JSON.stringify([...new Set(left)].sort())===JSON.stringify([...new Set(right)].sort());
const normalizePath=(value:string)=>value.replaceAll('\\','/').replace(/^\.\//,'');
const rootMatches=(path:string,root:string)=>root.endsWith('/')?path.startsWith(root):path===root;
const isSharedAuthorityPath=(path:string)=>SHARED_AUTHORITY_PREFIXES.some(prefix=>path.startsWith(prefix));

function walk(nodes:readonly StorefrontComponentNode[],visit:(node:StorefrontComponentNode)=>void):void{
  for(const node of nodes){
    visit(node);
    if(node.children?.length)walk(node.children,visit);
  }
}

export function createStorefrontTemplateComponentUsageManifest(pkg:StorefrontInstallableTemplatePackage):StorefrontTemplateComponentUsageManifest{
  const usage=new Map<string,{nodeCount:number;pageTypes:Set<StorefrontBuilderPageType>}>();
  const usedPages=new Set<StorefrontBuilderPageType>();
  let totalNodeCount=0;
  for(const page of pkg.pages){
    walk(page.sections,node=>{
      totalNodeCount+=1;
      usedPages.add(page.pageType);
      const current=usage.get(node.componentKey)??{nodeCount:0,pageTypes:new Set<StorefrontBuilderPageType>()};
      current.nodeCount+=1;
      current.pageTypes.add(page.pageType);
      usage.set(node.componentKey,current);
    });
  }
  const entries=[...usage.entries()]
    .sort(([left],[right])=>left.localeCompare(right))
    .map(([componentKey,value])=>Object.freeze({
      componentKey,
      nodeCount:value.nodeCount,
      pageTypes:Object.freeze(STOREFRONT_PAGE_TYPES.filter(pageType=>value.pageTypes.has(pageType))),
    }));
  return Object.freeze({
    contract:STOREFRONT_TEMPLATE_COMPONENT_USAGE_MANIFEST_VERSION,
    totalNodeCount,
    uniqueComponentCount:entries.length,
    pageTypes:Object.freeze(STOREFRONT_PAGE_TYPES.filter(pageType=>usedPages.has(pageType))),
    entries:Object.freeze(entries),
  });
}

function validateFileOwnershipContract(contract:StorefrontTemplateFileOwnershipContract):StorefrontTemplateProductionContractIssue[]{
  const issues:StorefrontTemplateProductionContractIssue[]=[];
  if(contract.contract!==STOREFRONT_TEMPLATE_FILE_OWNERSHIP_CONTRACT_VERSION)issues.push(failure('TEMPLATE_FILE_OWNERSHIP_CONTRACT_INVALID','fileOwnership.contract','Template file ownership contract version is unsupported.'));
  if(contract.sharedAuthorityPolicy!=='canonical-extension-review')issues.push(failure('TEMPLATE_SHARED_AUTHORITY_POLICY_INVALID','fileOwnership.sharedAuthorityPolicy','Shared authority changes must remain canonical extensions that require review.'));
  if(!contract.templateOwnedRoots.length)issues.push(failure('TEMPLATE_FILE_OWNERSHIP_ROOT_REQUIRED','fileOwnership.templateOwnedRoots','Template-specific ownership requires at least one narrow repository root.'));
  if(duplicate(contract.templateOwnedRoots))issues.push(failure('TEMPLATE_FILE_OWNERSHIP_ROOT_DUPLICATE','fileOwnership.templateOwnedRoots','Template-specific ownership roots must be unique.'));
  for(const[index,rawRoot]of contract.templateOwnedRoots.entries()){
    const root=normalizePath(rawRoot);
    if(root!==rawRoot||!root||root.startsWith('/')||root.split('/').includes('..'))issues.push(failure('TEMPLATE_FILE_OWNERSHIP_ROOT_INVALID',`fileOwnership.templateOwnedRoots[${index}]`,'Template-specific ownership roots must be normalized repository-relative paths.'));
    if(BROAD_TEMPLATE_ROOTS.has(root))issues.push(failure('TEMPLATE_FILE_OWNERSHIP_ROOT_TOO_BROAD',`fileOwnership.templateOwnedRoots[${index}]`,'Template-specific ownership may not claim a shared repository root.'));
    if(isSharedAuthorityPath(root))issues.push(failure('TEMPLATE_FILE_OWNERSHIP_SHARED_AUTHORITY_CLAIM',`fileOwnership.templateOwnedRoots[${index}]`,'Template-specific ownership may not claim canonical shared Runtime, Builder, Factory or component authority.'));
  }
  return issues;
}

export function evaluateStorefrontTemplateFileOwnershipChanges(input:{
  contract:StorefrontTemplateFileOwnershipContract;
  changedFiles:readonly string[];
}):StorefrontTemplateFileOwnershipChangeResult{
  const issues:StorefrontTemplateFileOwnershipChangeIssue[]=[];
  const classifications=input.changedFiles.map(rawPath=>{
    const path=normalizePath(rawPath);
    const owned=input.contract.templateOwnedRoots.some(root=>rootMatches(path,normalizePath(root)));
    if(owned)return{path,ownership:'template-owned' as const};
    if(isSharedAuthorityPath(path)){
      issues.push({
        code:'TEMPLATE_SHARED_AUTHORITY_CHANGE_REVIEW_REQUIRED',
        path,
        message:'Shared authority changes are allowed only as reviewed canonical extensions, never as template-local ownership.',
        severity:'review',
      });
      return{path,ownership:'shared-authority' as const};
    }
    issues.push({
      code:'TEMPLATE_FILE_OUTSIDE_OWNERSHIP_CONTRACT',
      path,
      message:'Template-specific change falls outside the declared template-owned roots and known shared authority surfaces.',
      severity:'error',
    });
    return{path,ownership:'outside-contract' as const};
  });
  return Object.freeze({
    ready:issues.every(item=>item.severity!=='error'),
    reviewRequired:issues.some(item=>item.severity==='review'),
    classifications:Object.freeze(classifications),
    issues:Object.freeze(issues),
  });
}

export function evaluateStorefrontTemplateProductionContracts(input:{
  declaration?:StorefrontTemplateProductionContractDeclaration;
  recipe:ProductionRecipeProjection;
  package:StorefrontInstallableTemplatePackage;
}):StorefrontTemplateProductionContractsResult{
  const componentUsage=createStorefrontTemplateComponentUsageManifest(input.package);
  const issues:StorefrontTemplateProductionContractIssue[]=[];
  const declaration=input.declaration;
  if(!declaration){
    return Object.freeze({
      contract:STOREFRONT_TEMPLATE_PRODUCTION_CONTRACTS_VERSION,
      declared:false,
      ready:false,
      visualAuthority:null,
      fileOwnership:null,
      componentUsage,
      issues:Object.freeze(issues),
    });
  }

  const visual=declaration.visualAuthority;
  if(visual.contract!==STOREFRONT_TEMPLATE_VISUAL_AUTHORITY_VERSION)issues.push(failure('TEMPLATE_VISUAL_AUTHORITY_CONTRACT_INVALID','visualAuthority.contract','Visual Authority Manifest contract version is unsupported.'));
  if(visual.state!=='accepted-reference')issues.push(failure('TEMPLATE_VISUAL_AUTHORITY_STATE_INVALID','visualAuthority.state','Generator-ready visual authority must point to an accepted reference, not invent a replacement design.'));
  if(visual.designChangePolicy!=='product-owner-reapproval-required')issues.push(failure('TEMPLATE_VISUAL_AUTHORITY_REAPPROVAL_POLICY_INVALID','visualAuthority.designChangePolicy','A visual authority change must require Product Owner reapproval.'));
  if(visual.referenceKey!==input.recipe.reference.key)issues.push(failure('TEMPLATE_VISUAL_AUTHORITY_REFERENCE_DRIFT','visualAuthority.referenceKey','Visual Authority Manifest reference must match the active Factory recipe reference.'));
  if(input.recipe.reference.approved!==true)issues.push(failure('TEMPLATE_VISUAL_AUTHORITY_RECIPE_NOT_APPROVED','recipe.reference.approved','Factory recipe must retain its approved visual-reference flag.'));
  if(duplicate(visual.requiredPageTypes))issues.push(failure('TEMPLATE_VISUAL_AUTHORITY_PAGE_DUPLICATE','visualAuthority.requiredPageTypes','Visual Authority page declarations must be unique.'));
  if(!sameSet(visual.requiredPageTypes,input.recipe.reference.requiredPageTypes))issues.push(failure('TEMPLATE_VISUAL_AUTHORITY_PAGE_DRIFT','visualAuthority.requiredPageTypes','Visual Authority page scope must match the Factory reference-critical page scope.'));
  const packagePages=new Set(input.package.pages.map(page=>page.pageType));
  for(const pageType of visual.requiredPageTypes){
    if(!packagePages.has(pageType))issues.push(failure('TEMPLATE_VISUAL_AUTHORITY_PAGE_MISSING',`visualAuthority.requiredPageTypes.${pageType}`,'Visual Authority references a page that is missing from the compiled canonical package.'));
  }

  issues.push(...validateFileOwnershipContract(declaration.fileOwnership));
  if(componentUsage.uniqueComponentCount===0||componentUsage.totalNodeCount===0)issues.push(failure('TEMPLATE_COMPONENT_USAGE_EMPTY','componentUsage','Compiled template must produce component usage evidence.'));
  if(!sameSet(componentUsage.pageTypes,input.package.manifest.pageTypes))issues.push(failure('TEMPLATE_COMPONENT_USAGE_PAGE_COVERAGE_DRIFT','componentUsage.pageTypes','Component Usage Manifest must cover every compiled canonical page.'));

  return Object.freeze({
    contract:STOREFRONT_TEMPLATE_PRODUCTION_CONTRACTS_VERSION,
    declared:true,
    ready:issues.length===0,
    visualAuthority:visual,
    fileOwnership:declaration.fileOwnership,
    componentUsage,
    issues:Object.freeze(issues),
  });
}
