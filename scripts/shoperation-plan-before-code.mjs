import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {activeDevelopmentPlanPath,compileGateChain,deriveImplementationSkeleton,evaluateReleaseRiskFiles,exactPlannedPaths,getAllFailures,getChangedFiles,globToRegExp,guardPolicy,isNeutralFile,knowledge,resolveDevelopmentScope,scopePolicy,stableDigest} from './lib/shoperation-development-runtime.mjs';
import {applicablePoInstructions,buildCodebaseAtlas,buildExecutionRoute,classifyAtlasPath,resolveAtlasArchitectureForPath,validateCodebaseAtlas} from './lib/shoperation-codebase-atlas-runtime.mjs';
import {validateOperationalIntelligence} from './lib/shoperation-operational-intelligence.mjs';
import {bindReleaseUnitChildTransaction,decomposeReleaseScope,derivePlannedOperations} from './lib/shoperation-release-unit-runtime.mjs';

const plan=JSON.parse(readFileSync(activeDevelopmentPlanPath(),'utf8'));
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

let atlas=null,atlasSource={mode:'REBUILT_FALLBACK',sourceCommit:null,changeImpactContract:null};
const upstreamAtlasPath='artifacts/shoperation-atlas/codebase-atlas.json';
const upstreamImpactPath='artifacts/shoperation-quality/change-impact.json';
if(existsSync(upstreamAtlasPath)&&existsSync(upstreamImpactPath)){
  try{
    const candidate=JSON.parse(readFileSync(upstreamAtlasPath,'utf8'));
    const impact=JSON.parse(readFileSync(upstreamImpactPath,'utf8'));
    const exactHead=diff.head==='HEAD'?null:diff.head;
    if(exactHead&&candidate.contract==='shoporation.codebase-atlas.v2'&&impact.contract==='shoporation.change-impact.v1'&&impact.decision==='PASS'&&impact.sourceCommit===exactHead){
      atlas=candidate;
      atlasSource={mode:'UPSTREAM_EXACT_HEAD',sourceCommit:impact.sourceCommit,changeImpactContract:impact.contract};
    }
  }catch{}
}
const rebuildAtlas=()=>{
  const atlas=buildCodebaseAtlas();
  return atlas;
};
if(!atlas)atlas=rebuildAtlas();
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
const plannedRenames=[...(declaredExecutionRoute?.plannedRenames??[])];
const plannedGeneratedArtifacts=[...(declaredExecutionRoute?.generatedArtifacts??[])];
const releaseOperations=derivePlannedOperations({
  projectedFiles,
  atlas,
  plannedDeletions:declaredPlannedDeletions,
  plannedRenames,
  generatedArtifacts:plannedGeneratedArtifacts,
});
const releaseDecomposition=decomposeReleaseScope({
  transaction:{taskId:plan.releaseUnitContext?.releaseUnitId??plan.taskId,parentTransactionId:plan.releaseUnitContext?.parentTransactionId??plan.taskId,sourceRef:plan.operationalIntelligence?.sourceRef,changeBaseSha:plan.changeBaseSha},
  operations:releaseOperations,
  atlas,
  gateChain,
  projectedRisk:projectedReleaseRisk,
  forbiddenPatterns:declaredExecutionRoute?.forbidden??[],
  readOnlyPaths:implementationSkeleton.impactedReadOnly,
  maxFilesPerUnit:Number(guardRegistry.ecosystem?.releaseDecomposition?.maxFilesPerUnit??12),
  targetBaseSha:plan.changeBaseSha,
});
if(projectedReleaseRisk.decision!=='PASS')issues.push({
  code:'DEV_PLAN_PROJECTED_RELEASE_RISK_BLOCK',
  releaseDisposition:releaseDecomposition.decision==='PASS'?'DECOMPOSITION_REQUIRED':'NO_SAFE_DECOMPOSITION',
  violations:projectedReleaseRisk.violations,
  score:projectedReleaseRisk.score,
  maxPoints:projectedReleaseRisk.maxPoints,
  subsystems:projectedReleaseRisk.subsystems,
  decompositionDecision:releaseDecomposition.decision,
  decompositionReason:releaseDecomposition.reason??null,
  releaseUnitIds:(releaseDecomposition.releaseUnits??[]).map(unit=>unit.releaseUnitId),
});
for(const chainIssue of gateChain.issues)issues.push({code:'DEV_PLAN_GATE_CHAIN_INVALID',chainIssue});
const unauthorizedPlannedDeletions=declaredPlannedDeletions.filter(file=>!(generatedExecutionRoute.PLANNED_FORBIDDEN_ROUTE_DELETIONS??[]).includes(file)&&!deletedFiles.includes(file));
if(unauthorizedPlannedDeletions.length)issues.push({code:'DEV_PLAN_PLANNED_DELETION_UNAUTHORIZED',files:unauthorizedPlannedDeletions});
let canonicalMustCreateDeclaration=[...(implementationSkeleton.mustCreate??[])].sort();
if(plan.operationalIntelligence?.riskTier==='critical'){
  const declaredMustEdit=[...(declaredExecutionRoute?.mustEdit??[])];
  for(const file of declaredMustEdit)if(!implementationSkeleton.mustEdit.includes(file))issues.push({code:'DEV_PLAN_SEMANTIC_MUST_EDIT_OUTSIDE_ROUTE',file});
  const declaredMustCreate=[...(declaredExecutionRoute?.mustCreate??[])].sort();
  const generatedMustCreate=[...implementationSkeleton.mustCreate].sort();
  const actuallyAdded=new Set((diff.changes??[]).filter(change=>change.status==='A').map(change=>change.file));
  const fulfilledMustCreate=declaredMustCreate.filter(file=>actuallyAdded.has(file)).sort();
  const expectedMustCreateDeclaration=[...new Set([...generatedMustCreate,...fulfilledMustCreate])].sort();
  canonicalMustCreateDeclaration=expectedMustCreateDeclaration;
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
const knownFailureById=new Map(getAllFailures().map(failure=>[failure.id,failure]));
const regressionProofForFailureIds=failureIds=>[...new Set((failureIds??[]).flatMap(id=>knownFailureById.get(id)?.regressionTests??[]))].sort();
const projectedRegressionProof=regressionProofForFailureIds(projectedFailures);
const canonicalProjectedProof=[...new Set([...(implementationSkeleton.proof??[]),...projectedRegressionProof])].sort();

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

const childPlanProjection={
  contract:'shoporation.release-unit-child-plan-projection.v1',
  guardDigest:digest,
  expectedSubsystems:[...projectedSubsystems],
  expectedDomains:[...projectedDomains],
  expectedAuthorities:[...projectedAuthorities],
  expectedKnownFailureIds:[...projectedFailures],
  acknowledgedPoInstructionIds:[...expectedInstructionIds],
  acknowledgedNegativeKnowledgeIds:[...projectedNegative],
  requiredEvidenceProofFiles:[...canonicalProjectedProof],
  requiredGates:[...(gateChain.orderedGateIds??[])],
  externalGateIds:[...(gateChain.externalGateIds??[])],
  semanticExecutionRoute:{
    request:declaredExecutionRoute?.request??plan.operationalIntelligence?.sourceRef??null,
    authority:[...projectedAuthorities],
    mustEdit:[...(implementationSkeleton.mustEdit??[])].sort(),
    mayEdit:[...(implementationSkeleton.mayEdit??[])].sort(),
    impactedReadOnly:[...(implementationSkeleton.impactedReadOnly??[])].sort(),
    mustCreate:[...canonicalMustCreateDeclaration],
    forbidden:[...(implementationSkeleton.forbidden??[])].sort(),
    proof:[...canonicalProjectedProof],
    unknown:[...(implementationSkeleton.unknown??[])].sort(),
    plannedDeletions:[...declaredPlannedDeletions],
    plannedRenames:[...plannedRenames],
    generatedArtifacts:[...plannedGeneratedArtifacts],
  },
};

if(!plan.releaseUnitContext&&releaseDecomposition.decision==='PASS'){
  releaseDecomposition.releaseUnits=(releaseDecomposition.releaseUnits??[]).map(unit=>{
    const unitFiles=[...(unit.intendedFiles??[])];
    const unitDeletes=(unit.operations??[]).filter(item=>item.operation==='delete').map(item=>item.file);
    const unitRenames=(unit.operations??[]).filter(item=>item.operation==='rename').map(item=>({from:item.previousFile,to:item.file}));
    const unitGenerated=(unit.generatedArtifactSemantics??[]).map(item=>({...item}));
    const unitRoute=buildExecutionRoute(atlas,unitFiles,{plannedDeletions:unitDeletes});
    const unitSkeleton=deriveImplementationSkeleton({plannedFilePatterns:unitFiles,atlasFiles:atlas.nodes.map(node=>node.path),executionRoute:unitRoute,plannedDeletions:unitDeletes,forbiddenPatterns:unit.forbiddenPaths??[]});
    const unitArchitectureFor=file=>resolveAtlasArchitectureForPath(atlas,file,{plannedDeletions:unitDeletes,executionRoute:unitRoute});
    const unitDomains=domainsFor(unitFiles,unitArchitectureFor);
    const unitAuthorities=authoritiesFor(unitDomains);
    const unitScope=resolveDevelopmentScope({files:unitFiles,task:plan.task});
    const unitNegative=negativeFor(unitScope);
    const unitInstructions=applicablePoInstructions(atlas,unitFiles).map(item=>item.id).sort();
    const unitFailureIds=[...unitScope.activeFailureIds].sort();
    const unitGuardDigest=stableDigest({failureIds:unitFailureIds,subsystems:[...unitScope.impactedSubsystems].sort(),negativeKnowledgeIds:unitNegative});
    const unitProof=[...new Set([...(unitSkeleton.proof??[]),...(unit.requiredEvidence?.proofFiles??[]),...regressionProofForFailureIds(unitFailureIds)])].sort();
    unit.requiredEvidence={...(unit.requiredEvidence??{}),proofFiles:[...unitProof]};
    const semanticExecutionRoute={
      request:declaredExecutionRoute?.request??plan.operationalIntelligence?.sourceRef,
      authority:unitAuthorities,
      mustEdit:[...unitSkeleton.mustEdit],
      mayEdit:[...unitSkeleton.mayEdit],
      impactedReadOnly:[...unitSkeleton.impactedReadOnly],
      mustCreate:[...unitSkeleton.mustCreate],
      forbidden:[...unitSkeleton.forbidden],
      proof:[...unitProof],
      unknown:[...(unitSkeleton.unknown??[])],
      plannedDeletions:unitDeletes,
      plannedRenames:unitRenames,
      generatedArtifacts:unitGenerated,
    };
    return bindReleaseUnitChildTransaction(unit,{
      parentPlan:plan,
      guardDigest:unitGuardDigest,
      expectedSubsystems:[...unitScope.impactedSubsystems].sort(),
      expectedDomains:unitDomains,
      expectedAuthorities:unitAuthorities,
      expectedKnownFailureIds:unitFailureIds,
      acknowledgedPoInstructionIds:unitInstructions,
      acknowledgedNegativeKnowledgeIds:unitNegative,
      semanticExecutionRoute,
    });
  });
}

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
  atlasSource,
  gateChain,
  architectureImpact:{
    actual:{directDomains:actualDomains,directAuthorities:actualAuthorities,unresolvedFiles:actualUnresolved},
    projected:{directDomains:projectedDomains,directAuthorities:projectedAuthorities,unresolvedFiles:projectedUnresolved},
    atlasContract:atlas.contract,
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
  childPlanProjection,
  operationalIntelligence:{riskTier:plan.operationalIntelligence?.riskTier??null,assuranceLevel:operationalValidation.profile?.assuranceLevel??null,sourceRef:plan.operationalIntelligence?.sourceRef??null,challengeCount:plan.operationalIntelligence?.challenge?.length??0,specialistCount:plan.operationalIntelligence?.specialistReviews?.length??0,completionRequirementIds:(plan.completionContract?.requirements??[]).map(item=>item.id)},
  issues,
  decision:issues.length?'BLOCK':'PASS',
};
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/plan-before-code.json',JSON.stringify(report,null,2)+'\n');
mkdirSync('artifacts/shoperation-development-guard/release-units',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/release-decomposition.json',JSON.stringify(releaseDecomposition,null,2)+'\n');
for(const unit of releaseDecomposition.releaseUnits??[]){
  writeFileSync(`artifacts/shoperation-development-guard/release-units/${String(unit.order).padStart(2,'0')}-${unit.releaseUnitId}.json`,JSON.stringify(unit,null,2)+'\n');
}
console.log(`Plan Before Code: ${report.decision}; mode=${report.evaluationMode}; changedFiles=${changedFiles.length}; projectedFiles=${projectedFiles.length}; failures=${projectedFailures.length}; projectedRisk=${projectedReleaseRisk.score}/${projectedReleaseRisk.maxPoints}; gateChain=${gateChain.decision}.`);
for(const issue of issues)console.error(JSON.stringify(issue));
if(report.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
