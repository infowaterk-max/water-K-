import {getStorefrontGlobalStyleState} from '@/lib/builder/storefront-global-styles';
import {STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {createStorefrontPresetBundle,materializeStorefrontPagePreset} from '@/lib/builder/storefront-presets';
import {getStorefrontTemplateFactoryCategoryFoundation} from '@/lib/builder/template-factory/category-foundations';
import type {StorefrontTemplateGeneratorBlueprint} from '@/lib/builder/template-factory/generator-readiness';
import type {StorefrontTemplateGenome} from '@/lib/builder/template-factory/template-genome';
import {
  planStorefrontTemplateConstraints,
  type StorefrontTemplateProductOwnerIntent,
} from '@/lib/builder/template-factory/constraint-planner';
import {compileStorefrontTemplateMediaPlan} from '@/lib/builder/template-factory/media-planner';
import {
  defineStorefrontTemplateProductionCompilerProgram,
  hashStorefrontTemplateProductionCompilerCandidate,
  type StorefrontTemplateProductionCompilerProgram,
} from '@/lib/builder/template-factory/production-compiler-contract';
import {
  compileStorefrontTemplateFactoryPackage,
  type StorefrontTemplateFactoryBuild,
  type StorefrontTemplateFactoryMediaManifest,
  type StorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory/scaffold';

export type StorefrontTemplateProductionCompilerIssue={
  code:string;
  path:string;
  message:string;
  severity:'error';
};

export type StorefrontTemplateProductionCompilerResult={
  valid:boolean;
  program:StorefrontTemplateProductionCompilerProgram|null;
  recipe:StorefrontTemplateFactoryRecipe|null;
  build:StorefrontTemplateFactoryBuild|null;
  issues:readonly StorefrontTemplateProductionCompilerIssue[];
};

const failure=(code:string,path:string,message:string):StorefrontTemplateProductionCompilerIssue=>({code,path,message,severity:'error'});
const clone=<T>(value:T):T=>structuredClone(value);
const sameSet=(left:readonly string[],right:readonly string[])=>JSON.stringify([...new Set(left)].sort())===JSON.stringify([...new Set(right)].sort());

function deepFreeze<T>(value:T):T{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  return value;
}

function walk(nodes:readonly StorefrontComponentNode[],visitor:(node:StorefrontComponentNode)=>void):void{
  for(const node of nodes){
    visitor(node);
    if(node.children?.length)walk(node.children,visitor);
  }
}

function compilerOwnedPageTypes(blueprint:StorefrontTemplateGeneratorBlueprint):StorefrontBuilderPageType[]{
  const owned=new Set(blueprint.composition.templateOwnedPageTypes);
  return STOREFRONT_PAGE_TYPES.filter(pageType=>owned.has(pageType));
}

function deriveCommerceReadiness(candidate:StorefrontInstallableTemplatePackage):StorefrontTemplateFactoryRecipe['commerceReadiness']{
  const pageTypes:StorefrontBuilderPageType[]=[];
  for(const page of candidate.pages){
    let purchasable=false;
    walk(page.sections,node=>{
      if(node.componentKey==='commerce.product-grid'&&node.config.showPurchaseActions===true)purchasable=true;
    });
    if(purchasable)pageTypes.push(page.pageType);
  }
  if(!pageTypes.length)return undefined;
  const purchaseActions=Object.freeze({pageTypes:Object.freeze(pageTypes)});
  return Object.freeze({productCardPurchaseActions:purchaseActions});
}

function validateCandidate(input:{
  blueprint:StorefrontTemplateGeneratorBlueprint;
  candidate:StorefrontInstallableTemplatePackage;
}):StorefrontTemplateProductionCompilerIssue[]{
  const{blueprint,candidate}=input;
  const issues:StorefrontTemplateProductionCompilerIssue[]=[];
  if(candidate.manifest.templateKey!==blueprint.template.templateKey)issues.push(failure('PRODUCTION_COMPILER_CANDIDATE_TEMPLATE_KEY_DRIFT','candidate.manifest.templateKey','Structured candidate template key must match the Generator Blueprint.'));
  if(candidate.manifest.templateVersion!==blueprint.template.templateVersion)issues.push(failure('PRODUCTION_COMPILER_CANDIDATE_TEMPLATE_VERSION_DRIFT','candidate.manifest.templateVersion','Structured candidate template version must match the Generator Blueprint.'));
  if(candidate.manifest.minPlan!==blueprint.template.minPlan)issues.push(failure('PRODUCTION_COMPILER_CANDIDATE_PLAN_DRIFT','candidate.manifest.minPlan','Structured candidate minimum plan must match the Generator Blueprint.'));
  if(!sameSet(candidate.manifest.requiredFeatures,blueprint.template.requiredFeatures))issues.push(failure('PRODUCTION_COMPILER_CANDIDATE_FEATURE_DRIFT','candidate.manifest.requiredFeatures','Structured candidate features must match the Generator Blueprint.'));
  if(!sameSet(candidate.manifest.pageTypes,blueprint.composition.pageTypes))issues.push(failure('PRODUCTION_COMPILER_CANDIDATE_PAGE_MANIFEST_DRIFT','candidate.manifest.pageTypes','Structured candidate page manifest must match the Generator Blueprint page matrix.'));

  const counts=new Map<StorefrontBuilderPageType,number>();
  for(const page of candidate.pages)counts.set(page.pageType,(counts.get(page.pageType)??0)+1);
  for(const pageType of blueprint.composition.pageTypes){
    const count=counts.get(pageType)??0;
    if(count!==1)issues.push(failure(
      count===0?'PRODUCTION_COMPILER_CANDIDATE_PAGE_MISSING':'PRODUCTION_COMPILER_CANDIDATE_PAGE_DUPLICATE',
      'candidate.pages.'+pageType,
      'Structured candidate must contain exactly one Page Schema document for every Blueprint page type.',
    ));
  }
  if(candidate.pages.length!==blueprint.composition.pageTypes.length)issues.push(failure('PRODUCTION_COMPILER_CANDIDATE_PAGE_CARDINALITY','candidate.pages','Structured candidate page cardinality must equal the Blueprint matrix.'));
  return issues;
}

export function compileStorefrontTemplateProductionCandidate(input:{
  blueprint:StorefrontTemplateGeneratorBlueprint;
  candidate:StorefrontInstallableTemplatePackage;
  genome:StorefrontTemplateGenome;
  productionIntent:StorefrontTemplateProductOwnerIntent;
  media:StorefrontTemplateFactoryMediaManifest;
  productOwnerReview:{internalVisualReviewPassed:boolean};
}):StorefrontTemplateProductionCompilerResult{
  const issues=validateCandidate({blueprint:input.blueprint,candidate:input.candidate});
  const blueprint=input.blueprint;
  const candidate=input.candidate;
  const foundation=getStorefrontTemplateFactoryCategoryFoundation(blueprint.template.category);
  if(foundation.category!==blueprint.template.category)issues.push(failure('PRODUCTION_COMPILER_FOUNDATION_CATEGORY_DRIFT','foundation.category','Category foundation must match Blueprint category.'));

  const constraintPlanning=planStorefrontTemplateConstraints({
    category:blueprint.template.category,
    templateKey:blueprint.template.templateKey,
    templateVersion:blueprint.template.templateVersion,
    visualAuthority:blueprint.productionContracts.visualAuthority,
    genome:input.genome,
    intent:input.productionIntent,
  });
  for(const row of constraintPlanning.issues)issues.push(failure(row.code,'constraintPlanning.'+row.path,row.message));
  const mediaPlanning=compileStorefrontTemplateMediaPlan({
    constraintPlan:constraintPlanning.plan,
    manifest:input.media,
  });
  for(const row of mediaPlanning.issues)issues.push(failure(row.code,'mediaPlanning.'+row.path,row.message));

  const ownedPageTypes=compilerOwnedPageTypes(blueprint);
  const inheritedPageTypes=STOREFRONT_PAGE_TYPES.filter(pageType=>!ownedPageTypes.includes(pageType));
  const presetBundle=createStorefrontPresetBundle(candidate);
  const pageOverrides:Partial<Record<StorefrontBuilderPageType,ReturnType<typeof materializeStorefrontPagePreset>>>={};
  const pageOperations:StorefrontTemplateProductionCompilerProgram['operations']['pagePresets'][number][]=[];

  for(const pageType of ownedPageTypes){
    const candidatePages=candidate.pages.filter(page=>page.pageType===pageType);
    if(candidatePages.length!==1)continue;
    const page=candidatePages[0]!;
    const presets=presetBundle.pagePresets.filter(preset=>preset.pageType===pageType&&preset.pageKey===page.pageKey);
    if(presets.length!==1){
      issues.push(failure('PRODUCTION_COMPILER_PAGE_PRESET_RESOLUTION_INVALID','candidate.pages.'+pageType,'Blueprint-owned candidate page must resolve to exactly one canonical Page Preset.'));
      continue;
    }
    const preset=presets[0]!;
    pageOverrides[pageType]=materializeStorefrontPagePreset(candidate,preset);
    pageOperations.push({
      type:'materialize-page-preset',
      pageType,
      presetId:preset.presetId,
      sourcePageKey:preset.pageKey,
    });
  }

  const home=candidate.pages.find(page=>page.pageType==='home');
  if(!home)issues.push(failure('PRODUCTION_COMPILER_HOME_REQUIRED','candidate.pages.home','Compiler requires one Home Page Preset for canonical shell and Global Styles derivation.'));
  const header=home?.sections[0];
  const footer=home?.sections.at(-1);
  if(!header||!footer)issues.push(failure('PRODUCTION_COMPILER_SHELL_REQUIRED','candidate.pages.home.sections','Compiler requires canonical Home header and footer source nodes.'));
  if(header&&header.componentKey!=='system.commerce-header')issues.push(failure('PRODUCTION_COMPILER_HEADER_INVALID','candidate.pages.home.sections[0]','Compiler Home shell source must begin with the canonical commerce header.'));

  if(issues.length||!constraintPlanning.plan||!mediaPlanning.plan||!home||!header||!footer){
    return deepFreeze({valid:false,program:null,recipe:null,build:null,issues});
  }

  const candidatePackageHash=hashStorefrontTemplateProductionCompilerCandidate(candidate);
  const program=defineStorefrontTemplateProductionCompilerProgram({
    contract:'shoporation.template-production-compiler.v1',
    identity:{
      category:blueprint.template.category,
      templateKey:blueprint.template.templateKey,
      templateVersion:blueprint.template.templateVersion,
    },
    sources:{
      blueprintContract:blueprint.contract,
      blueprintIdentity:blueprint.template.templateKey+'@'+blueprint.template.templateVersion,
      foundation:{
        category:foundation.category,
        templateKey:foundation.foundationTemplateKey,
        templateVersion:foundation.foundationTemplateVersion,
      },
      visualAuthorityReferenceKey:blueprint.productionContracts.visualAuthority.referenceKey,
      genomeHash:input.genome.hash,
      constraintPlanHash:constraintPlanning.plan.hash,
      mediaPlanHash:mediaPlanning.plan.hash,
      candidatePackageHash,
    },
    operations:{
      pagePresets:Object.freeze(pageOperations),
      inheritedPageTypes:Object.freeze(inheritedPageTypes),
      globalStyles:{sourcePageKey:home.pageKey},
      shell:{sourcePageKey:home.pageKey,headerNodeId:header.id,footerNodeId:footer.id},
      demo:{namespace:candidate.manifest.demoContent.namespace,fixtureCount:candidate.demoFixtures?.length??0},
    },
  });

  const recipe:StorefrontTemplateFactoryRecipe=deepFreeze({
    blueprint,
    compiler:program,
    genome:input.genome,
    productionIntent:input.productionIntent,
    category:blueprint.template.category,
    templateKey:blueprint.template.templateKey,
    displayName:blueprint.template.displayName,
    templateVersion:blueprint.template.templateVersion,
    minPlan:blueprint.template.minPlan,
    requiredFeatures:Object.freeze([...blueprint.template.requiredFeatures]),
    demoNamespace:candidate.manifest.demoContent.namespace,
    globalStyles:getStorefrontGlobalStyleState(home),
    shell:Object.freeze({
      header:clone(header.config),
      headerNode:clone(header),
      footerNode:clone(footer),
    }),
    pageOverrides:Object.freeze(pageOverrides),
    demoFixtures:Object.freeze(clone(candidate.demoFixtures??[])),
    media:input.media,
    reference:Object.freeze({
      key:blueprint.productionContracts.visualAuthority.referenceKey,
      approved:true,
      requiredPageTypes:Object.freeze([...blueprint.productionContracts.visualAuthority.requiredPageTypes]),
    }),
    commerceReadiness:deriveCommerceReadiness(candidate),
    productOwnerReview:Object.freeze({...input.productOwnerReview}),
  });

  const build=compileStorefrontTemplateFactoryPackage({foundation,recipe});
  const outputHash=hashStorefrontTemplateProductionCompilerCandidate(build.package);
  if(outputHash!==candidatePackageHash){
    issues.push(failure('PRODUCTION_COMPILER_OUTPUT_MISMATCH','build.package','Compiler materialization must reproduce the structured candidate package exactly apart from Factory provenance metadata.'));
  }
  if(!build.report.generatorReadiness.ready){
    for(const row of build.report.generatorReadiness.issues)issues.push(failure(row.code,'generatorReadiness.'+row.path,row.message));
  }
  if(build.report.generatorReadiness.productionLineage?.valid!==true)issues.push(failure('PRODUCTION_COMPILER_LINEAGE_REQUIRED','generatorReadiness.productionLineage','Compiler output requires valid deterministic Production Lineage.'));
  if(!build.report.generatorReadiness.distinctness.valid)issues.push(failure('PRODUCTION_COMPILER_DISTINCTNESS_REQUIRED','generatorReadiness.distinctness','Compiler output requires valid cross-template distinctness evidence.'));
  if(!build.report.technicalReady)issues.push(failure('PRODUCTION_COMPILER_FACTORY_TECHNICAL_READY_REQUIRED','build.report.technicalReady','Compiler output must satisfy the existing Factory technical readiness contract.'));

  return deepFreeze({
    valid:issues.length===0,
    program,
    recipe,
    build,
    issues,
  });
}
