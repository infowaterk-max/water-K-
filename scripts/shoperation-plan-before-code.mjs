import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {getChangedFiles,globToRegExp,guardPolicy,isNeutralFile,knowledge,resolveDevelopmentScope,scopePolicy,stableDigest} from './lib/shoperation-development-runtime.mjs';
import {applicablePoInstructions,buildCodebaseAtlas,buildExecutionRoute,validateCodebaseAtlas} from './lib/shoperation-codebase-atlas-runtime.mjs';
import {validateOperationalIntelligence} from './lib/shoperation-operational-intelligence.mjs';

const plan=JSON.parse(readFileSync('quality/development/active-plan.json','utf8'));
const guardRegistry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const diff=getChangedFiles({baseSha:plan.changeBaseSha});
const changedFiles=diff.files.filter(file=>file!=='quality/development/active-plan.json');
const issues=[];

if(plan.contract!=='shoporation.development-plan.v1')issues.push({code:'DEV_PLAN_CONTRACT_INVALID'});
if(!['ready-for-implementation','closed'].includes(plan.status))issues.push({code:'DEV_PLAN_NOT_READY'});
if(plan.status==='closed'&&(!plan.lifecycle||plan.lifecycle.state!=='LEARN'||plan.lifecycle.truthStatus!=='VERIFIED'||!plan.lifecycle.verifiedImplementationHead))issues.push({code:'DEV_PLAN_CLOSED_LIFECYCLE_INVALID'});
if(!plan.task?.trim())issues.push({code:'DEV_PLAN_TASK_REQUIRED'});
if(!Array.isArray(plan.plannedFilePatterns)||!plan.plannedFilePatterns.length)issues.push({code:'DEV_PLAN_FILES_REQUIRED'});

const planMatchers=(plan.plannedFilePatterns??[]).map(globToRegExp);
for(const file of changedFiles)if(!planMatchers.some(m=>m.test(file)))issues.push({code:'DEV_PLAN_UNPLANNED_FILE',file});

const atlas=buildCodebaseAtlas();
const atlasValidation=validateCodebaseAtlas(atlas);
const atlasNodes=new Map(atlas.nodes.map(node=>[node.path,node]));
if(!atlasValidation.ok)issues.push({code:'DEV_PLAN_ATLAS_INVALID',issues:atlasValidation.issues});

const projectedFiles=atlas.nodes
  .map(node=>node.path)
  .filter(file=>file!=='quality/development/active-plan.json'&&planMatchers.some(m=>m.test(file)))
  .sort();
if(!projectedFiles.length)issues.push({code:'DEV_PLAN_PROJECTION_EMPTY',plannedFilePatterns:plan.plannedFilePatterns});

const generatedExecutionRoute=buildExecutionRoute(atlas,plan.plannedFilePatterns??[]);
const declaredExecutionRoute=plan.operationalIntelligence?.semanticExecutionRoute??null;
if(plan.operationalIntelligence?.riskTier==='critical'){
  const declaredMustEdit=[...(declaredExecutionRoute?.mustEdit??[])];
  for(const file of declaredMustEdit)if(!generatedExecutionRoute.MUST_EDIT.includes(file))issues.push({code:'DEV_PLAN_SEMANTIC_MUST_EDIT_OUTSIDE_ROUTE',file});
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

const domainsFor=files=>[...new Set(files.flatMap(file=>atlasNodes.get(file)?.domains??[]))].sort();
const authoritiesFor=domains=>[...new Set(domains.map(id=>atlas.domainIndexDefinition?.[id]?.owner).filter(Boolean))].sort();
const unresolvedFor=files=>files.filter(file=>{
  if(scopePolicy.knowledgeInfrastructurePrefixes.some(prefix=>file.startsWith(prefix))||isNeutralFile(file))return false;
  return !(atlasNodes.get(file)?.domains?.length);
});

const actualDomains=domainsFor(changedFiles);
const actualAuthorities=authoritiesFor(actualDomains);
const projectedDomains=domainsFor(projectedFiles);
const projectedAuthorities=authoritiesFor(projectedDomains);
const actualUnresolved=unresolvedFor(changedFiles);
const projectedUnresolved=unresolvedFor(projectedFiles);

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

for(const exception of plan.exceptions??[])if(!exception.ruleId||!exception.reason?.trim())issues.push({code:'DEV_PLAN_EXCEPTION_INVALID',exception});

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
  projectedFiles,
  actualScope,
  projectedScope,
  architectureImpact:{
    actual:{directDomains:actualDomains,directAuthorities:actualAuthorities,unresolvedFiles:actualUnresolved},
    projected:{directDomains:projectedDomains,directAuthorities:projectedAuthorities,unresolvedFiles:projectedUnresolved},
    atlasContract:atlas.contract,
    semanticExecutionRoute:generatedExecutionRoute,
    applicablePoInstructionIds:expectedInstructionIds,
  },
  guardDigest:digest,
  operationalIntelligence:{riskTier:plan.operationalIntelligence?.riskTier??null,assuranceLevel:operationalValidation.profile?.assuranceLevel??null,sourceRef:plan.operationalIntelligence?.sourceRef??null,challengeCount:plan.operationalIntelligence?.challenge?.length??0,specialistCount:plan.operationalIntelligence?.specialistReviews?.length??0,completionRequirementIds:(plan.completionContract?.requirements??[]).map(item=>item.id)},
  issues,
  decision:issues.length?'BLOCK':'PASS',
};
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/plan-before-code.json',JSON.stringify(report,null,2)+'\n');
console.log(`Plan Before Code: ${report.decision}; mode=${report.evaluationMode}; changedFiles=${changedFiles.length}; projectedFiles=${projectedFiles.length}; failures=${projectedFailures.length}.`);
for(const issue of issues)console.error(JSON.stringify(issue));
if(report.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
