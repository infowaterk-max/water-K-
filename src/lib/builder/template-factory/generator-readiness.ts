import {
  STOREFRONT_PAGE_TYPES,
  STOREFRONT_VIEWPORTS,
  type StorefrontBuilderPageType,
  type StorefrontViewport,
} from '@/lib/builder/storefront-foundation';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import type {FeatureCode,PlanCode} from '@/lib/plans/catalog';
import {evaluateStorefrontTemplateProductionMaturity,type StorefrontTemplateProductionMaturityResult} from '@/lib/builder/template-factory/production-maturity';
import {
  evaluateStorefrontTemplateProductionContracts,
  type StorefrontTemplateProductionContractDeclaration,
  type StorefrontTemplateProductionContractsResult,
} from '@/lib/builder/template-factory/production-contracts';

export const STOREFRONT_TEMPLATE_GENERATOR_BLUEPRINT_VERSION='shoporation.template-generator-blueprint.v0.1' as const;
export const STOREFRONT_TEMPLATE_GENERATOR_READINESS_VERSION='shoporation.template-generator-readiness.v0.1' as const;

export type StorefrontTemplateGeneratorBlueprint={
  contract:typeof STOREFRONT_TEMPLATE_GENERATOR_BLUEPRINT_VERSION;
  template:{
    category:string;
    templateKey:string;
    displayName:string;
    templateVersion:number;
    minPlan:PlanCode;
    requiredFeatures:readonly FeatureCode[];
  };
  composition:{
    pageTypes:readonly StorefrontBuilderPageType[];
    viewports:readonly StorefrontViewport[];
    templateOwnedPageTypes:readonly StorefrontBuilderPageType[];
  };
  authorities:{
    pageSchema:'canonical-page-schema';
    components:'shared-component-registry';
    runtime:'shared-storefront-runtime';
    builder:'visual-builder-page-schema';
    responsive:'canonical-responsive-authority';
  };
  productionContracts:StorefrontTemplateProductionContractDeclaration;
  generator:{
    implementation:'deferred';
    target:'template-compiler';
  };
};

export type StorefrontTemplateGeneratorReadinessIssue={
  code:string;
  path:string;
  message:string;
  severity:'error';
};

export type StorefrontTemplateGeneratorReadinessResult={
  contract:typeof STOREFRONT_TEMPLATE_GENERATOR_READINESS_VERSION;
  declared:boolean;
  ready:boolean;
  blueprintIdentity:string|null;
  productionContracts:StorefrontTemplateProductionContractsResult;
  productionMaturity:StorefrontTemplateProductionMaturityResult;
  template3AuthoringReady:boolean;
  issues:readonly StorefrontTemplateGeneratorReadinessIssue[];
};

type GeneratorRecipeProjection={
  category:string;
  templateKey:string;
  displayName:string;
  templateVersion:number;
  minPlan:PlanCode;
  requiredFeatures:readonly FeatureCode[];
  reference:{key:string;approved:boolean;requiredPageTypes:readonly StorefrontBuilderPageType[]};
  pageOverrides?:Partial<Record<StorefrontBuilderPageType,unknown>>;
};

const failure=(code:string,path:string,message:string):StorefrontTemplateGeneratorReadinessIssue=>({code,path,message,severity:'error'});
const sameSet=(left:readonly string[],right:readonly string[])=>JSON.stringify([...new Set(left)].sort())===JSON.stringify([...new Set(right)].sort());
const exactList=(left:readonly string[],right:readonly string[])=>left.length===right.length&&left.every((item,index)=>item===right[index]);
const duplicate=(items:readonly string[])=>new Set(items).size!==items.length;

export function evaluateStorefrontTemplateGeneratorReadiness(input:{
  blueprint?:StorefrontTemplateGeneratorBlueprint;
  recipe:GeneratorRecipeProjection;
  package:StorefrontInstallableTemplatePackage;
  productionContracts?:StorefrontTemplateProductionContractsResult;
  productionMaturity?:StorefrontTemplateProductionMaturityResult;
}):StorefrontTemplateGeneratorReadinessResult{
  const{blueprint,recipe}=input,pkg=input.package;
  const productionMaturity=input.productionMaturity??evaluateStorefrontTemplateProductionMaturity();
  const productionContracts=input.productionContracts??evaluateStorefrontTemplateProductionContracts({
    declaration:blueprint?.productionContracts,
    recipe,
    package:pkg,
  });
  const issues:StorefrontTemplateGeneratorReadinessIssue[]=[];
  if(!blueprint){
    issues.push(failure('GENERATOR_BLUEPRINT_REQUIRED','blueprint','Generator readiness requires an explicit versioned Template Blueprint.'));
    return{
      contract:STOREFRONT_TEMPLATE_GENERATOR_READINESS_VERSION,
      declared:false,
      ready:false,
      blueprintIdentity:null,
      productionContracts,
      productionMaturity,
      template3AuthoringReady:false,
      issues:Object.freeze(issues),
    };
  }

  const identity=`${blueprint.template.templateKey}@${blueprint.template.templateVersion}`;
  if(blueprint.contract!==STOREFRONT_TEMPLATE_GENERATOR_BLUEPRINT_VERSION)issues.push(failure('GENERATOR_BLUEPRINT_CONTRACT_INVALID','blueprint.contract','Template Blueprint contract version is unsupported.'));
  if(blueprint.generator.implementation!=='deferred'||blueprint.generator.target!=='template-compiler')issues.push(failure('GENERATOR_IMPLEMENTATION_BOUNDARY_INVALID','blueprint.generator','Blueprint v0.1 must describe future compiler input without activating a generator runtime.'));

  const expectedAuthorities:StorefrontTemplateGeneratorBlueprint['authorities']={
    pageSchema:'canonical-page-schema',
    components:'shared-component-registry',
    runtime:'shared-storefront-runtime',
    builder:'visual-builder-page-schema',
    responsive:'canonical-responsive-authority',
  };
  for(const[key,value]of Object.entries(expectedAuthorities)){
    if(blueprint.authorities[key as keyof typeof expectedAuthorities]!==value)issues.push(failure('GENERATOR_AUTHORITY_DRIFT',`blueprint.authorities.${key}`,`Generator-ready templates must retain the canonical authority: ${value}.`));
  }
  if(!productionContracts.declared)issues.push(failure('GENERATOR_PRODUCTION_CONTRACTS_REQUIRED','blueprint.productionContracts','Generator-ready templates require explicit production contracts for visual authority and template file ownership.'));
  for(const contractIssue of productionContracts.issues)issues.push(failure(contractIssue.code,`blueprint.productionContracts.${contractIssue.path}`,contractIssue.message));

  const identityChecks=[
    ['category',blueprint.template.category,recipe.category],
    ['templateKey',blueprint.template.templateKey,recipe.templateKey],
    ['displayName',blueprint.template.displayName,recipe.displayName],
    ['templateVersion',blueprint.template.templateVersion,recipe.templateVersion],
    ['minPlan',blueprint.template.minPlan,recipe.minPlan],
  ] as const;
  for(const[field,actual,expected]of identityChecks){
    if(actual!==expected)issues.push(failure('GENERATOR_RECIPE_IDENTITY_DRIFT',`blueprint.template.${field}`,`Blueprint ${field} must match the active Factory recipe.`));
  }
  if(!sameSet(blueprint.template.requiredFeatures,recipe.requiredFeatures))issues.push(failure('GENERATOR_RECIPE_FEATURE_DRIFT','blueprint.template.requiredFeatures','Blueprint required features must match the active Factory recipe.'));

  if(pkg.manifest.templateKey!==blueprint.template.templateKey||pkg.manifest.templateVersion!==blueprint.template.templateVersion)issues.push(failure('GENERATOR_PACKAGE_IDENTITY_DRIFT','package.manifest','Compiled package identity must match the Template Blueprint.'));
  if(pkg.manifest.minPlan!==blueprint.template.minPlan||!sameSet(pkg.manifest.requiredFeatures,blueprint.template.requiredFeatures))issues.push(failure('GENERATOR_PACKAGE_CAPABILITY_DRIFT','package.manifest','Compiled package capability requirements must match the Template Blueprint.'));

  if(duplicate(blueprint.composition.pageTypes))issues.push(failure('GENERATOR_PAGE_TYPE_DUPLICATE','blueprint.composition.pageTypes','Blueprint page types must be unique.'));
  if(!exactList(blueprint.composition.pageTypes,STOREFRONT_PAGE_TYPES))issues.push(failure('GENERATOR_CANONICAL_PAGE_MATRIX_REQUIRED','blueprint.composition.pageTypes','Generator-ready templates must declare the canonical 14-page matrix in canonical order.'));
  if(!exactList(pkg.manifest.pageTypes,STOREFRONT_PAGE_TYPES)||pkg.pages.length!==STOREFRONT_PAGE_TYPES.length)issues.push(failure('GENERATOR_PACKAGE_PAGE_MATRIX_DRIFT','package.pages','Compiled package must materialize the canonical 14-page matrix.'));

  if(duplicate(blueprint.composition.viewports))issues.push(failure('GENERATOR_VIEWPORT_DUPLICATE','blueprint.composition.viewports','Blueprint viewport declarations must be unique.'));
  if(!exactList(blueprint.composition.viewports,STOREFRONT_VIEWPORTS))issues.push(failure('GENERATOR_CANONICAL_VIEWPORT_MATRIX_REQUIRED','blueprint.composition.viewports','Generator-ready templates must use the canonical Desktop/Tablet/Mobile viewport authority.'));
  if(pkg.manifest.responsive.desktop!==true||pkg.manifest.responsive.tablet!==true||pkg.manifest.responsive.mobile!==true)issues.push(failure('GENERATOR_PACKAGE_RESPONSIVE_AUTHORITY_DRIFT','package.manifest.responsive','Compiled package must retain all three canonical responsive authorities.'));

  const recipeOwned=Object.keys(recipe.pageOverrides??{}).filter((value):value is StorefrontBuilderPageType=>(STOREFRONT_PAGE_TYPES as readonly string[]).includes(value));
  if(duplicate(blueprint.composition.templateOwnedPageTypes))issues.push(failure('GENERATOR_PAGE_OWNERSHIP_DUPLICATE','blueprint.composition.templateOwnedPageTypes','Template-owned page declarations must be unique.'));
  if(!sameSet(blueprint.composition.templateOwnedPageTypes,recipeOwned))issues.push(failure('GENERATOR_PAGE_OWNERSHIP_DRIFT','blueprint.composition.templateOwnedPageTypes','Blueprint page ownership must match explicit Factory recipe ownership.'));

  return{
    contract:STOREFRONT_TEMPLATE_GENERATOR_READINESS_VERSION,
    declared:true,
    ready:issues.length===0,
    blueprintIdentity:identity,
    productionContracts,
    productionMaturity,
    template3AuthoringReady:issues.length===0&&productionMaturity.valid&&productionMaturity.template3AuthoringReady,
    issues:Object.freeze(issues),
  };
}

export function assertStorefrontTemplateGeneratorReady(result:StorefrontTemplateGeneratorReadinessResult):void{
  if(result.ready)return;
  const blocker=result.issues[0];
  throw new Error(`TEMPLATE_GENERATOR_NOT_READY:${blocker?.code??'UNKNOWN'}:${blocker?.path??'unknown'}`);
}
