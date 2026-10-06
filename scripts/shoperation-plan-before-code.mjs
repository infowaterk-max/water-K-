import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {compileGateChain,decomposeReleaseScope,deriveImplementationSkeleton,evaluateReleaseRiskFiles,exactPlannedPaths,getChangedFiles,globToRegExp,guardPolicy,isNeutralFile,knowledge,resolveDevelopmentScope,scopePolicy,stableDigest} from './lib/shoperation-development-runtime.mjs';
import {applicablePoInstructions,buildCodebaseAtlas,buildExecutionRoute,classifyAtlasPath,resolveAtlasArchitectureForPath,validateCodebaseAtlas} from './lib/shoperation-codebase-atlas-runtime.mjs';
import {validateOperationalIntelligence} from './lib/shoperation-operational-intelligence.mjs';

const plan=JSON.parse(readFileSync('quality/development/active-plan.json','utf8'));
const guardRegistry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const diff=getChangedFiles({baseSha:plan.changeBaseSha});
const changedFiles=[...(diff.materialFiles??[])];
const deletedFiles=[...(diff.materialDeletedFiles??[])];
const issues=[];
if(diff.baseResolution==='UNRESOLVED'||!diff.base)issues.push({code:'DEV_PLAN_TRANSACTION_BASE_UNRESOLVED',requestedBase:diff.requestedBase??plan.changeBaseSha??null});
if(diff.headResolution==='UNRESOLVED_EXPLICIT'||!diff.head)issues.push({code:'DEV_PLAN_TRANSACTION_HEAD_UNRESOLVED',requestedHead:diff.requestedHead??null,headSource:diff.headSource??null});

if(plan.contract!=='shoporation.development-plan.v1')issues.push({code:'DEV_PLAN_CONTRACT_INVALID'});
if(!['ready-for-implementation','closed'].includes(plan.status))issues.push({code:'DEV_PLAN_NOT_READY'});
if(plan.status==='closed'&&(!plan.lifecycle||plan.lifecycle.state!=='LEARN'||plan.lifecycle.truthStatus!=='VERIFIED'||!plan.lifecycle.verifiedImplementationHead))issues.push({code:'DEV_PLAN_CLOSED_LIFECYCLE_INVALID'});
if(!plan.task?.trim())issues.push({code:'DEV_PLAN_TASK_REQUIRED'});
if(!Array.isArray(plan.plannedFilePatterns)||!plan.plannedFilePatterns.length)issues.push({code:'DEV_PLAN_FILES_REQUIRED'});

const planMatchers=(plan.plannedFilePatterns??[]).map(globToRegExp);
for(const file of changedFiles)if(!planMatchers.some(m=>m.test(file)))issues.push({code:'DEV_PLAN_UNPLANNED_FILE',file});

const upstreamAtlasPath='artifacts/shoperation-atlas/codebase-atlas.json';
const upstreamImpactPath='artifacts/shoperation-quality/change-impact.json';
let atlas=null,atlasProvenance={mode:'LOCAL_RECOMPUTE',sourceCommit:null,changeImpactSourceCommit:null};
if(existsSync(upstreamAtlasPath)&&existsSync(upstreamImpactPath)){
  const upstreamAtlas=JSON.parse(readFileSync(upstreamAtlasPath,'utf8'));
  const upstreamImpact=JSON.parse(readFileSync(upstreamImpactPath,'utf8'));
  const expectedHead=diff.head==='HEAD'?null:diff.head;
  if(upstreamAtlas.contract==='shoporation.codebase-atlas.v2'&&upstreamImpact.contract==='shoporation.change-impact.v1'&&upstreamImpact.decision==='PASS'&&expectedHead&&upstreamImpact.sourceCommit===expectedHead){
    atlas=upstreamAtlas;
    atlasProvenance={mode:'EXACT_HEAD_UPSTREAM',sourceCommit:expectedHead,changeImpactSourceCommit:upstreamImpact.sourceCommit};
  }else{
    issues.push({code:'DEV_PLAN_UPSTREAM_ATLAS_STALE_OR_INVALID',expectedHead,atlasContract:upstreamAtlas.contract??null,changeImpactContract:upstreamImpact.contract??null,changeImpactDecision:upstreamImpact.decision??null,changeImpactSourceCommit:upstreamImpact.sourceCommit??null});
    atlas=buildCodebaseAtlas();
    atlasProvenance={mode:'STALE_UPSTREAM_RECOMPUTED_FOR_DIAGNOSTICS',sourceCommit:expectedHead,changeImpactSourceCommit:upstreamImpact.sourceCommit??null};
  }
}else{
  atlas=buildCodebaseAtlas();
}
const atlasValidation=validateCodebaseAtlas(atlas);
const atlasNodes=new Map(atlas.nodes.map(node=>[node.path,node]));
if(!atlasValidation.ok)issues.push({code:'DEV_PLAN_ATLAS_INVALID',issues:atlasValidation.issues});

const projectedFiles=[...new Set([
  ...atlas.nodes
    .map(node=>node.path)
    .filter(file=>file!=='quality/development/active-plan.json'&&planMatchers.some(m=>m.test(file))),
  ...exactPlannedPaths(plan.plannedFilePatterns??[]).filter(file=>file!=='quality/development/active-plan.json'),
  ...deletedFiles.filter(file=>planMatchers.some(m=>m.test(file))),
])].sort();
if(!projectedFiles.length)issues.push({code:'DEV_PLAN_PROJECTION_EMPTY',plannedFilePatterns:plan.plannedFilePatterns});

const declaredExecutionRoute=plan.operationalIntelligence?.semanticExecutionRoute??null;
const declaredPlannedDeletions=[...new Set(declaredExecutionRoute?.plannedDeletions??[])].sort();
for(const file of declaredPlannedDeletions)if(!planMatchers.some(m=>m.test(file)))issues.push({code:'DEV_PLAN_PLANNED_DELETION_OUTSIDE_PLAN',file});
const actualExecutionRoute=buildExecutionRoute(atlas,plan.plannedFilePatterns??[],{tombstones:deletedFiles});
const generatedExecutionRoute=buildExecutionRoute(atlas,plan.plannedFilePatterns??[],{tombstones:deletedFiles,plannedDeletions:declaredPlannedDeletions});
const implementationSkeleton=deriveImplementationSkeleton({
  plannedFilePatterns:plan.plannedFilePatterns??[],
  atlasFiles:atlas.nodes.map(node=>node.path),
  executionRoute:generatedExecutionRoute,
  plannedDeletions:declaredPlannedDeletions,
  forbiddenPatterns:declaredExecutionRoute?.forbidden??[],
});
const projectedReleaseRisk=evaluateReleaseRiskFiles(projectedFiles);
const completionGuardIds=[...new Set((plan.completionContract?.requirements??[]).flatMap(requirement=>[
  ...(requirement?.evidence?.implementation??[]),
  ...(requirement?.evidence?.outcome??[]),
  ...(requirement?.forbiddenRegressions??[]).flatMap(negative=>negative?.evidence??[]),
]))];
const gateChain=compileGateChain({guardRegistry,plannedFiles:projectedFiles,phase:'PLAN',explicitGuardIds:completionGuardIds});
for(const chainIssue of gateChain.issues)issues.push({code:'DEV_PLAN_GATE_CHAIN_INVALID',chainIssue});
const releaseFileMetadata=Object.fromEntries(projectedFiles.map(file=>[file,classifyAtlasPath(file)]));
const releaseDecomposition=decomposeReleaseScope({
  transactionIdentity:{taskId:plan.taskId??null,sourceRef:plan.operationalIntelligence?.sourceRef??null,changeBaseSha:plan.changeBaseSha,plannedHead:diff.head??null},
  parentTransactionIdentity:{taskId:plan.taskId??null,sourceRef:plan.operationalIntelligence?.sourceRef??null,changeBaseSha:plan.changeBaseSha},
  baseSha:plan.changeBaseSha,
  files:projectedFiles,
  operations:plan.operationalIntelligence?.releaseDecomposition?.operations??[],
  atlas,
  guardRegistry,
  explicitGuardIds:completionGuardIds,
  implementationSkeleton,
  fileMetadata:releaseFileMetadata,
  plannedDeletions:declaredPlannedDeletions,
  forbiddenPatterns:implementationSkeleton.forbidden,
  readOnlyPaths:implementationSkeleton.impactedReadOnly,
  atomicEdges:plan.operationalIntelligence?.releaseDecomposition?.atomicEdges??[],
  proofEdges:plan.operationalIntelligence?.releaseDecomposition?.proofEdges??[],
  prerequisiteEdges:plan.operationalIntelligence?.releaseDecomposition?.prerequisiteEdges??[],
  generatedArtifacts:plan.operationalIntelligence?.releaseDecomposition?.generatedArtifacts??{},
});
if(releaseDecomposition.decision!=='PASS')issues.push({code:'DEV_PLAN_RELEASE_DECOMPOSITION_BLOCK',required:releaseDecomposition.required,releaseIssues:releaseDecomposition.issues,overallRisk:projectedReleaseRisk});
if(projectedReleaseRisk.decision!=='PASS'&&releaseDecomposition.decision==='PASS'&&!releaseDecomposition.required)issues.push({code:'DEV_PLAN_RELEASE_DECOMPOSITION_REQUIRED_FLAG_MISSING'});
const unauthorizedPlannedDeletions=declaredPlannedDeletions.filter(file=>!(generatedExecutionRoute.PLANNED_FORBIDDEN_ROUTE_DELETIONS??[]).includes(file)&&!deletedFiles.includes(file));
if(unauthorizedPlannedDeletions.length)issues.push({code:'DEV_PLAN_PLANNED_DELETION_UNAUTHORIZED',files:unauthorizedPlannedDeletions});
if(plan.operationalIntelligence?.riskTier==='critical'){
  const declaredMustEdit=[...(declaredExecutionRoute?.mustEdit??[])];
  for(const file of declaredMustEdit)if(!implementationSkeleton.mustEdit.includes(file))issues.push({code:'DEV_PLAN_SEMANTIC_MUST_EDIT_OUTSIDE_ROUTE',file});
  const declaredMustCreate=[...(declaredExecutionRoute?.mustCreate??[])].sort();
  const generatedMustCreate=[...implementationSkeleton.mustCreate].sort();
  const actuallyAdded=new Set((diff.changes??[]).filter(change=>change.status==='A').map(change=>change.file));
  const fulfilledMustCreate=declaredMustCreate.filter(file=>actuallyAdded.has(file)).sort();
  const expectedMustCreateDeclaration=[...new Set([...generatedMustCreate,...fulfilledMustCreate])].sort();
  implementationSkeleton.mustCreateObligations=declaredMustCreate;
  implementationSkeleton.fulfilledMustCreate=fulfilledMustCreate;
  if(JSON.stringify(declaredMustCreate)!==JSON.stringify(expectedMustCreateDeclaration))issues.push({code:'DEV_PLAN_SEMANTIC_MUST_CREATE_DRIFT',expected:expectedMustCreateDeclaration,actual:declaredMustCreate,fulfilled:fulfilledMustCreate});
  const missingInstructionRequired=generatedExecutionRoute.INSTRUCTION_REQUIRED.filter(file=>!declaredMustEdit.includes(file));
  if(missingInstructionRequired.length)issues.push({code:'DEV_PLAN_PO_INSTRUCTION_REQUIRED_CHANGE_UNDECLARED',files:missingInstructionRequired,instructionIds:generatedExecutionRoute.PO_INSTRUCTIONS});
  if(generatedExecutionRoute.UNKNOWN.length)issues.push({code:'DEV_PLAN_SEMANTIC_EXECUTION_UNKNOWN',unknown:generatedExecutionRoute.UNKNOWN});
}
const applicableInstructions=applicablePoInstructions(atlas,projectedFiles);
const expectedInstructionIds=applicableInstructions.map(item=>item.id).sort();
const acknowledgedInstructionIds=[...(plan.acknowledgedPoInstructionIds??[])].sort();
const missingInstructionIds=expectedInstructionIds.filter(id=>!acknowledgedInstructionIds.includes(id));
if(missingInstructionIds.length)issues.push({code:'DEV_PLAN_PO_INSTRUCTION_UNACKNOWLEDGED',instructionIds:missingInstructionIds});


const actualScope=resolveDevelopmentScope({files:changedFiles,task:plan.task});
const projectedScope=resolveDevelopmentScope({files:projectedFiles,task:plan.task});
const expectedFailures=[...(plan.expectedKnownFailureIds??[])].sort();
const projectedFailures=[...projectedScope.activeFailureIds].sort();

const actualArchitectureFor=file=>resolveAtlasArchitectureForPath(atlas,file,{tombstones:deletedFiles,executionRoute:actualExecutionRoute});
const projectedArchitectureFor=file=>resolveAtlasArchitectureForPath(atlas,file,{tombstones:deletedFiles,plannedDeletions:declaredPlannedDeletions,executionRoute:generatedExecutionRoute});
const domainsFor=(files,resolver)=>[...new Set(files.flatMap(file=>resolver(file).pathDerived.domains))].sort();
const authoritiesFor=domains=>[...new Set(domains.map(id=>atlas.domainIndexDefinition?.[id]?.owner).filter(Boolean))].sort();
const unresolvedFor=(files,resolver)=>files.filter(file=>{
  if(scopePolicy.knowledgeInfrastructurePrefixes.some(prefix=>file.startsWith(prefix))||isNeutralFile(file))return false;
  return !resolver(file).resolved;
});

const actualDomains=domainsFor(changedFiles,actualArchitectureFor);
const actualAuthorities=authoritiesFor(actualDomains);
const projectedDomains=domainsFor(projectedFiles,projectedArchitectureFor);
const projectedAuthorities=authoritiesFor(projectedDomains);
const actualUnresolved=unresolvedFor(changedFiles,actualArchitectureFor);
const projectedUnresolved=unresolvedFor(projectedFiles,projectedArchitectureFor);

if(actualUnresolved.length)issues.push({code:'DEV_PLAN_ARCHITECTURE_SCOPE_UNRESOLVED',files:actualUnresolved,mode:'actual-diff'});
if(projectedUnresolved.length)issues.push({code:'DEV_PLAN_ARCHITECTURE_SCOPE_UNRESOLVED',files:projectedUnresolved,mode:'planned-projection'});

const expectedDomains=[...(plan.expectedDomains??[])].sort();
const expectedAuthorities=[...(plan.expectedAuthorities??[])].sort();
if(!expectedDomains.length)issues.push({code:'DEV_PLAN_EXPECTED_DOMAINS_REQUIRED'});
if(!expectedAuthorities.length)issues.push({code:'DEV_PLAN_EXPECTED_AUTHORITIES_REQUIRED'});

if(JSON.stringify(projectedDomains)!==JSON.stringify(expectedDomains))issues.push({code:'DEV_PLAN_DOMAIN_SCOPE_DRIFT',expected:expectedDomains,actual:projectedDomains,mode:'planned-projection'});
if(JSON.stringify(projectedAuthorities)!==JSON.stringify(expectedAuthorities))issues.push({code:'DEV_PLAN_AUTHORITY_SCOPE_DRIFT',expected:expectedAuthorities,actual:projectedAuthorities,mode:'planned-projection'});
if(JSON.stringify(projectedFailures)!==JSON.stringify(expectedFailures))issues.push({code:'DEV_PLAN_FAILURE_SCOPE_DRIFT',expected:expectedFailures,actual:projectedFailures,mode:'planned-projection'});

const outside=(actual,expected)=>actual.filter(value=>!expected.includes(value));
const outsideDomains=outside(actualDomains,expectedDomains);
const outsideAuthorities=outside(actualAuthorities,expectedAuthorities);
const outsideFailures=outside([...actualScope.activeFailureIds].sort(),expectedFailures);
if(outsideDomains.length)issues.push({code:'DEV_PLAN_DOMAIN_SCOPE_EXPANDED',outside:outsideDomains,expected:expectedDomains,actual:actualDomains});
if(outsideAuthorities.length)issues.push({code:'DEV_PLAN_AUTHORITY_SCOPE_EXPANDED',outside:outsideAuthorities,expected:expectedAuthorities,actual:actualAuthorities});
if(outsideFailures.length)issues.push({code:'DEV_PLAN_FAILURE_SCOPE_EXPANDED',outside:outsideFailures});

const expectedSubsystems=[...(plan.expectedSubsystems??[])].sort();
const projectedSubsystems=[...projectedScope.impactedSubsystems].sort();
if(JSON.stringify(projectedSubsystems)!==JSON.stringify(expectedSubsystems))issues.push({code:'DEV_PLAN_SUBSYSTEM_SCOPE_DRIFT',expected:expectedSubsystems,actual:projectedSubsystems,mode:'planned-projection'});
const outsideSubsystems=outside([...actualScope.impactedSubsystems].sort(),expectedSubsystems);
if(outsideSubsystems.length)issues.push({code:'DEV_PLAN_SUBSYSTEM_SCOPE_EXPANDED',outside:outsideSubsystems});

if(actualScope.unresolvedFiles.length)issues.push({code:'DEV_PLAN_UNRESOLVED_SCOPE',files:actualScope.unresolvedFiles,mode:'actual-diff'});
if(projectedScope.unresolvedFiles.length)issues.push({code:'DEV_PLAN_UNRESOLVED_SCOPE',files:projectedScope.unresolvedFiles,mode:'planned-projection'});

const negativeFor=scope=>knowledge.negativeKnowledge.filter(item=>{
  const applicable=guardPolicy.negativeKnowledgeApplicability[item.id]??[];
  return applicable.includes('*')||applicable.some(s=>scope.impactedSubsystems.includes(s));
}).map(x=>x.id).sort();
const projectedNegative=negativeFor(projectedScope);
const acknowledged=[...(plan.acknowledgedNegativeKnowledgeIds??[])].sort();
if(JSON.stringify(projectedNegative)!==JSON.stringify(acknowledged))issues.push({code:'DEV_PLAN_NEGATIVE_KNOWLEDGE_DRIFT',expected:projectedNegative,actual:acknowledged});

for(const exception of plan.exceptions??[]){
  if(!exception.ruleId||!exception.reason?.trim()||!exception.file||!exception.findingFingerprint)issues.push({code:'DEV_PLAN_EXCEPTION_INVALID',exception,required:['ruleId','file','findingFingerprint','reason']});
}

const digest=stableDigest({failureIds:projectedFailures,subsystems:projectedSubsystems,negativeKnowledgeIds:projectedNegative});
if(plan.guardDigest!==digest)issues.push({code:'DEV_PLAN_GUARD_DIGEST_DRIFT',expected:plan.guardDigest,actual:digest});

const operationalValidation=validateOperationalIntelligence({plan,policy:guardPolicy,guardIds:(guardRegistry.guards??[]).map(item=>item.id)});
issues.push(...operationalValidation.issues);

const report={
  contract:'shoporation.plan-before-code-gate.v1',
  taskId:plan.taskId??null,
  base:diff.base,
  head:diff.head,
  evaluationMode:changedFiles.length?'actual-diff-with-plan-envelope':'planned-projection',
  changedFiles,
  deletedFiles,
  transactionChanges:diff.changes??[],
  transactionIdentity:{requestedBase:diff.requestedBase??plan.changeBaseSha??null,baseResolution:diff.baseResolution??null,requestedHead:diff.requestedHead??null,headResolution:diff.headResolution??null,headSource:diff.headSource??null,metadataFiles:[...(diff.metadataFiles??[])]},
  projectedFiles,
  actualScope,
  projectedScope,
  implementationSkeleton,
  projectedReleaseRisk,
  releaseDecomposition,
  gateChain,
  architectureImpact:{
    actual:{directDomains:actualDomains,directAuthorities:actualAuthorities,unresolvedFiles:actualUnresolved},
    projected:{directDomains:projectedDomains,directAuthorities:projectedAuthorities,unresolvedFiles:projectedUnresolved},
    atlasContract:atlas.contract,
    atlasProvenance,
    semanticExecutionRoute:generatedExecutionRoute,
    actualExecutionRoute,
    plannedDeletions:declaredPlannedDeletions,
    tombstoneArchitecture:{
      actual:changedFiles.filter(file=>deletedFiles.includes(file)).map(file=>actualArchitectureFor(file)),
      projected:projectedFiles.filter(file=>deletedFiles.includes(file)||declaredPlannedDeletions.includes(file)).map(file=>projectedArchitectureFor(file)),
    },
    applicablePoInstructionIds:expectedInstructionIds,
  },
  guardDigest:digest,
  operationalIntelligence:{riskTier:plan.operationalIntelligence?.riskTier??null,assuranceLevel:operationalValidation.profile?.assuranceLevel??null,sourceRef:plan.operationalIntelligence?.sourceRef??null,challengeCount:plan.operationalIntelligence?.challenge?.length??0,specialistCount:plan.operationalIntelligence?.specialistReviews?.length??0,completionRequirementIds:(plan.completionContract?.requirements??[]).map(item=>item.id)},
  issues,
  decision:issues.length?'BLOCK':'PASS',
};
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/plan-before-code.json',JSON.stringify(report,null,2)+'\n');
writeFileSync('artifacts/shoperation-development-guard/release-unit-manifests.json',JSON.stringify(releaseDecomposition,null,2)+'\n');
mkdirSync('artifacts/shoperation-development-guard/release-units',{recursive:true});
for(const manifest of releaseDecomposition.manifests??[])writeFileSync(`artifacts/shoperation-development-guard/release-units/${String(manifest.order).padStart(2,'0')}-${manifest.releaseUnitId.replace(/[^A-Za-z0-9._-]+/g,'_')}.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(`Plan Before Code: ${report.decision}; mode=${report.evaluationMode}; changedFiles=${changedFiles.length}; projectedFiles=${projectedFiles.length}; failures=${projectedFailures.length}; projectedRisk=${projectedReleaseRisk.score}/${projectedReleaseRisk.maxPoints}; decomposition=${releaseDecomposition.decision}/${releaseDecomposition.unitCount}; gateChain=${gateChain.decision}.`);
for(const issue of issues)console.error(JSON.stringify(issue));
if(report.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
