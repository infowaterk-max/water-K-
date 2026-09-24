import {STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import type {
  StorefrontTemplateFactoryBuild,
  StorefrontTemplateFactoryIssue,
  StorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory/scaffold';
import {
  TEMPLATE_FACTORY_AUTHORITY_GRAPH,
  TEMPLATE_FACTORY_KNOWN_FAILURES,
  TEMPLATE_FACTORY_KNOWLEDGE_VERSION,
} from '@/lib/builder/template-factory/knowledge-registry';
import {evaluateShoperationKnowledgeIntegrity,SHOPERATION_QUALITY_KNOWLEDGE_VERSION} from '@/lib/quality-system/shoperation-knowledge';

export const TEMPLATE_FACTORY_PROCEDURAL_MEMORY_VERSION='shoporation.template-factory-procedural-memory.v2' as const;

export type TemplateFactoryMaturityStage=
  |'scaffold'
  |'compiled'
  |'technically-ready'
  |'visually-ready'
  |'journey-proven'
  |'product-owner-ready'
  |'accepted';

export type TemplateFactoryPreflightIssue={
  code:string;
  path:string;
  message:string;
};

export type TemplateFactoryFailureReplay={
  failureId:string;
  passed:boolean;
  evidence:readonly string[];
};

export type TemplateFactoryJourneyProof={
  sourceCommit:string|null;
  exactHeadBuildPassed:boolean;
  browserMatrixPassed:boolean;
  factoryPackageIdentityPassed:boolean;
  templateAwareAuthPassed:boolean;
  returnTargetPreserved:boolean;
  deploymentReady:boolean;
  handedOffUrlMatchesProvenance:boolean;
  navigationCompletenessPassed:boolean;
  routeConvergencePassed:boolean;
  presentationContinuityPassed:boolean;
  accountSurfacePassed:boolean;
  engineDemoIntegrationPassed:boolean;
  placeholderContentPassed:boolean;
};

export type TemplateFactoryAcceptanceProof={
  contract:'shoporation.template-factory-acceptance-proof.v2';
  knowledgeVersion:typeof TEMPLATE_FACTORY_KNOWLEDGE_VERSION;
  proceduralMemoryVersion:typeof TEMPLATE_FACTORY_PROCEDURAL_MEMORY_VERSION;
  provenance:{
    factoryVersion:string;
    templateKey:string;
    templateVersion:number;
    foundationTemplateKey:string;
    foundationTemplateVersion:number;
    referenceKey:string|null;
    sourceCommit:string|null;
  };
  maturity:{
    stage:TemplateFactoryMaturityStage;
    blockers:readonly string[];
  };
  failureReplays:readonly TemplateFactoryFailureReplay[];
  journey:TemplateFactoryJourneyProof;
  handoffReady:boolean;
  accepted:boolean;
};

const preflightIssue=(code:string,path:string,message:string):TemplateFactoryPreflightIssue=>({code,path,message});

export function evaluateTemplateFactoryPreflight(recipe:StorefrontTemplateFactoryRecipe){
  const issues:TemplateFactoryPreflightIssue[]=[];
  const globalKnowledge=evaluateShoperationKnowledgeIntegrity();
  for(const knowledgeIssue of globalKnowledge.issues)issues.push(preflightIssue('TF_PREFLIGHT_GLOBAL_KNOWLEDGE_INVALID',`globalKnowledge.${knowledgeIssue.path}`,`${knowledgeIssue.code}: ${knowledgeIssue.message}`));
  if(!recipe.shell.header||Object.keys(recipe.shell.header).length===0)issues.push(preflightIssue('TF_PREFLIGHT_TEMPLATE_HEADER_REQUIRED','shell.header','Factory recipes must provide a template-owned canonical header configuration.'));
    if(!recipe.pageOverrides?.account)issues.push(preflightIssue('TF_PREFLIGHT_ACCOUNT_OWNERSHIP_REQUIRED','pageOverrides.account','Account/auth presentation is template-owned and may not be inherited from the category foundation.'));
  for(const pageType of STOREFRONT_PAGE_TYPES){
    if(!recipe.pageOverrides?.[pageType])issues.push(preflightIssue('TF_PREFLIGHT_COMPLETE_STOREFRONT_OWNERSHIP_REQUIRED',`pageOverrides.${pageType}`,'Every canonical shopper Page Schema must be template-owned before a Factory candidate can enter Product Owner acceptance.'));
  }
  for(const pageType of recipe.reference.requiredPageTypes){
    if(!recipe.pageOverrides?.[pageType])issues.push(preflightIssue('TF_PREFLIGHT_REFERENCE_PAGE_OWNERSHIP_REQUIRED',`pageOverrides.${pageType}`,'Reference-critical pages must be explicitly owned before implementation proceeds.'));
  }
  if(recipe.media.minimumRepresentativeMedia<1)issues.push(preflightIssue('TF_PREFLIGHT_MEDIA_CONTRACT_REQUIRED','media.minimumRepresentativeMedia','Factory recipes must declare a non-zero representative media contract.'));
  if(!recipe.reference.approved)issues.push(preflightIssue('TF_PREFLIGHT_REFERENCE_AUTHORITY_REQUIRED','reference.approved','Factory production requires an approved visual reference authority.'));
  return{
    contract:'shoporation.template-factory-preflight.v1' as const,
    templateKey:recipe.templateKey,
    templateVersion:recipe.templateVersion,
    knownFailureIds:TEMPLATE_FACTORY_KNOWN_FAILURES.map(item=>item.id),
    authorityRuleIds:TEMPLATE_FACTORY_AUTHORITY_GRAPH.map(item=>item.id),
    globalKnowledgeVersion:SHOPERATION_QUALITY_KNOWLEDGE_VERSION,
    globalKnownFailureIds:globalKnowledge.knownFailureIds,
    unresolvedFailureIntake:globalKnowledge.unresolvedCandidates,
    issues:Object.freeze(issues),
    ok:issues.length===0,
  };
}

function issueCodes(build:StorefrontTemplateFactoryBuild){
  return new Set(build.report.issues.filter(item=>item.severity==='error').map(item=>item.code));
}

function accountPage(build:StorefrontTemplateFactoryBuild){
  return build.package.pages.find(page=>page.pageType==='account')??null;
}

function hasAuthPublic(page:StorefrontTemplateFactoryBuild['package']['pages'][number]|null){
  if(!page)return false;
  const walk=(nodes:readonly StorefrontComponentNode[]):boolean=>{
    for(const node of nodes){
      if((node.config as Record<string,unknown>).authPublic===true)return true;
      if(node.children&&walk(node.children))return true;
    }
    return false;
  };
  return walk(page.sections);
}

function pageFactoryMetadata(page:StorefrontTemplateFactoryBuild['package']['pages'][number]){
  const value=page.metadata?.templateFactory;
  return value&&typeof value==='object'?value as Record<string,unknown>:null;
}

export function replayTemplateFactoryKnownFailures(build:StorefrontTemplateFactoryBuild):readonly TemplateFactoryFailureReplay[]{
  const codes=issueCodes(build);
  const account=accountPage(build);
  const accountMeta=account?pageFactoryMetadata(account):null;
  const identityOk=build.package.manifest.templateKey===build.report.template.templateKey
    &&build.package.manifest.templateVersion===build.report.template.templateVersion
    &&build.package.pages.every(page=>page.templateKey===build.report.template.templateKey&&page.templateVersion===build.report.template.templateVersion);
  const provenanceOk=build.package.pages.every(page=>{
    const meta=pageFactoryMetadata(page);
    return meta?.compileSource==='template-factory'
      &&meta?.targetTemplateKey===build.report.template.templateKey
      &&meta?.targetTemplateVersion===build.report.template.templateVersion;
  });
  const noFoundationLeak=!codes.has('FACTORY_FOUNDATION_MEDIA_LEAK')&&!codes.has('FACTORY_FOUNDATION_BRAND_LEAK');
  const shellStable=!codes.has('FACTORY_CANONICAL_HEADER_DRIFT')&&!codes.has('FACTORY_CANONICAL_FOOTER_DRIFT');
  const responsiveStaticOk=!codes.has('FACTORY_PAGE_MISSING')&&!codes.has('FACTORY_PAGE_IDENTITY_MISMATCH')&&!codes.has('FACTORY_PAGE_CARDINALITY');
  const results:TemplateFactoryFailureReplay[]=[
    {failureId:'TF-KF-001',passed:identityOk&&provenanceOk,evidence:[`manifest=${build.package.manifest.templateKey}@${build.package.manifest.templateVersion}`,`report=${build.report.template.templateKey}@${build.report.template.templateVersion}`,`provenance=${provenanceOk?'pass':'fail'}`]},
    {failureId:'TF-KF-002',passed:Boolean(account&&accountMeta?.ownership==='template'&&hasAuthPublic(account)),evidence:[`accountOwnership=${String(accountMeta?.ownership??'missing')}`,`authPublic=${hasAuthPublic(account)}`]},
    {failureId:'TF-KF-003',passed:Boolean(account&&accountMeta?.ownership==='template'&&hasAuthPublic(account)),evidence:[`accountOverride=${build.report.overriddenPageTypes.includes('account')}`,`authPublic=${hasAuthPublic(account)}`]},
    {failureId:'TF-KF-004',passed:noFoundationLeak&&shellStable,evidence:[`foundationLeak=${noFoundationLeak?'none':'detected'}`,`shell=${shellStable?'stable':'drift'}`]},
    {failureId:'TF-KF-005',passed:identityOk&&provenanceOk,evidence:[`candidateIdentity=${identityOk?'pass':'fail'}`,`provenance=${provenanceOk?'pass':'fail'}`]},
    {failureId:'TF-KF-006',passed:responsiveStaticOk,evidence:[`pageCoverage=${responsiveStaticOk?'pass':'fail'}`]},
    {failureId:'TF-KF-016',passed:build.report.inheritedPageTypes.length===0&&!codes.has('SHOWROOM_NAVIGATION_INCOMPLETE'),evidence:[`inheritedPages=${build.report.inheritedPageTypes.length}`,`navigation=${codes.has('SHOWROOM_NAVIGATION_INCOMPLETE')?'fail':'pass'}`]},
    {failureId:'TF-KF-017',passed:!codes.has('SHOWROOM_ROUTE_PRESENTATION_UNMAPPED'),evidence:[`routeConvergence=${codes.has('SHOWROOM_ROUTE_PRESENTATION_UNMAPPED')?'fail':'pass'}`]},
    {failureId:'TF-KF-018',passed:!codes.has('SHOWROOM_PRESENTATION_AUTHORITY_MISMATCH')&&noFoundationLeak,evidence:[`presentation=${codes.has('SHOWROOM_PRESENTATION_AUTHORITY_MISMATCH')?'fail':'pass'}`,`foundationLeak=${noFoundationLeak?'none':'detected'}`]},
    {failureId:'TF-KF-019',passed:!codes.has('SHOWROOM_ROUTE_PRESENTATION_UNMAPPED')&&!codes.has('SHOWROOM_PRESENTATION_AUTHORITY_MISMATCH'),evidence:[`businessRoute=${codes.has('SHOWROOM_ROUTE_PRESENTATION_UNMAPPED')?'fail':'pass'}`,`presentation=${codes.has('SHOWROOM_PRESENTATION_AUTHORITY_MISMATCH')?'fail':'pass'}`]},
    {failureId:'TF-KF-020',passed:!codes.has('SHOWROOM_ACCOUNT_NAVIGATION_EMPTY')&&!codes.has('SHOWROOM_ACCOUNT_SURFACE_MISSING'),evidence:[`accountNavigation=${codes.has('SHOWROOM_ACCOUNT_NAVIGATION_EMPTY')?'empty':'present'}`,`accountSurfaces=${codes.has('SHOWROOM_ACCOUNT_SURFACE_MISSING')?'incomplete':'complete'}`]},
    {failureId:'TF-KF-021',passed:!codes.has('SHOWROOM_ENGINE_DEMO_MISSING'),evidence:[`engineDemo=${codes.has('SHOWROOM_ENGINE_DEMO_MISSING')?'fail':'pass'}`]},
    {failureId:'TF-KF-022',passed:!codes.has('SHOWROOM_ENGINE_DEMO_MISSING')&&!codes.has('SHOWROOM_PAGE_EMPTY'),evidence:[`capabilityDemo=${codes.has('SHOWROOM_ENGINE_DEMO_MISSING')||codes.has('SHOWROOM_PAGE_EMPTY')?'fail':'pass'}`]},
    {failureId:'TF-KF-023',passed:!codes.has('SHOWROOM_ROUTE_PRESENTATION_UNMAPPED')&&!codes.has('SHOWROOM_NAVIGATION_INCOMPLETE')&&!codes.has('SHOWROOM_PRESENTATION_AUTHORITY_MISMATCH'),evidence:[`journeyIdentity=${codes.has('SHOWROOM_ROUTE_PRESENTATION_UNMAPPED')||codes.has('SHOWROOM_NAVIGATION_INCOMPLETE')||codes.has('SHOWROOM_PRESENTATION_AUTHORITY_MISMATCH')?'fragmented':'continuous'}`]},
    {failureId:'TF-KF-024',passed:!codes.has('SHOWROOM_PLACEHOLDER_CONTENT'),evidence:[`placeholderContent=${codes.has('SHOWROOM_PLACEHOLDER_CONTENT')?'detected':'clean'}`]},
  ];
  return Object.freeze(results);
}

function buildStaticStage(build:StorefrontTemplateFactoryBuild):TemplateFactoryMaturityStage{
  const pageCoverage=build.package.pages.length===14;
  if(!pageCoverage)return'scaffold';
  if(build.report.issues.some(item=>item.severity==='error'))return'compiled';
  if(!build.report.productOwnerReady)return'technically-ready';
  return'visually-ready';
}

const journeyPassed=(journey:TemplateFactoryJourneyProof)=>journey.exactHeadBuildPassed
  &&journey.browserMatrixPassed
  &&journey.factoryPackageIdentityPassed
  &&journey.templateAwareAuthPassed
  &&journey.returnTargetPreserved
  &&journey.deploymentReady
  &&journey.handedOffUrlMatchesProvenance
  &&journey.navigationCompletenessPassed
  &&journey.routeConvergencePassed
  &&journey.presentationContinuityPassed
  &&journey.accountSurfacePassed
  &&journey.engineDemoIntegrationPassed
  &&journey.placeholderContentPassed;

export function createTemplateFactoryAcceptanceProof(input:{
  build:StorefrontTemplateFactoryBuild;
  referenceKey?:string|null;
  journey:TemplateFactoryJourneyProof;
  accepted?:boolean;
}):TemplateFactoryAcceptanceProof{
  const replays=replayTemplateFactoryKnownFailures(input.build);
  const replayFailures=replays.filter(item=>!item.passed).map(item=>`REPLAY:${item.failureId}`);
  const buildBlockers=input.build.report.issues.filter(item=>item.severity==='error').map(item=>`${item.code}:${item.path}`);
  const staticStage=buildStaticStage(input.build);
  const journeyOk=journeyPassed(input.journey)&&replayFailures.length===0;
  let stage:TemplateFactoryMaturityStage=staticStage;
  if(staticStage==='visually-ready'&&journeyOk)stage='journey-proven';
  if(stage==='journey-proven'&&input.build.report.productOwnerReady)stage='product-owner-ready';
  if(input.accepted&&stage==='product-owner-ready')stage='accepted';
  const blockers=[...buildBlockers,...replayFailures];
  if(staticStage==='visually-ready'&&!journeyOk)blockers.push('PRODUCT_OWNER_JOURNEY_NOT_PROVEN');
  return{
    contract:'shoporation.template-factory-acceptance-proof.v2',
    knowledgeVersion:TEMPLATE_FACTORY_KNOWLEDGE_VERSION,
    proceduralMemoryVersion:TEMPLATE_FACTORY_PROCEDURAL_MEMORY_VERSION,
    provenance:{
      factoryVersion:input.build.report.factoryVersion,
      templateKey:input.build.report.template.templateKey,
      templateVersion:input.build.report.template.templateVersion,
      foundationTemplateKey:input.build.report.foundation.templateKey,
      foundationTemplateVersion:input.build.report.foundation.templateVersion,
      referenceKey:input.referenceKey??null,
      sourceCommit:input.journey.sourceCommit,
    },
    maturity:{stage,blockers:Object.freeze([...new Set(blockers)])},
    failureReplays:replays,
    journey:input.journey,
    handoffReady:stage==='product-owner-ready'||stage==='accepted',
    accepted:stage==='accepted',
  };
}

export function classifyTemplateFactoryQualitySystemDefects(build:StorefrontTemplateFactoryBuild):readonly string[]{
  const failed=new Set(replayTemplateFactoryKnownFailures(build).filter(item=>!item.passed).map(item=>item.failureId));
  return Object.freeze(TEMPLATE_FACTORY_KNOWN_FAILURES.filter(item=>item.automatable&&failed.has(item.id)).map(item=>item.id));
}

export function assertTemplateFactoryProceduralMemory(build:StorefrontTemplateFactoryBuild):void{
  const failed=replayTemplateFactoryKnownFailures(build).find(item=>!item.passed);
  if(failed)throw new Error(`TEMPLATE_FACTORY_KNOWN_FAILURE_REPLAY:${failed.failureId}`);
}

export function requiredTemplateFactoryOwnedPages(_recipe:StorefrontTemplateFactoryRecipe):readonly StorefrontBuilderPageType[]{
  return Object.freeze([...STOREFRONT_PAGE_TYPES]);
}

export function isRecurringFailureSharedFixRequired(failureId:string){
  const failure=TEMPLATE_FACTORY_KNOWN_FAILURES.find(item=>item.id===failureId);
  return Boolean(failure&&failure.occurrences>=2&&failure.remediationPolicy==='shared-root-cause-required');
}

export function proceduralMemoryIssue(code:string,path:string,message:string):StorefrontTemplateFactoryIssue{
  return{code,path,message,severity:'error'};
}
