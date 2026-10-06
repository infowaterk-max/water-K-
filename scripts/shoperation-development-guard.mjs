import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {compileGateChain,deriveImplementationSkeleton,evaluateReleaseRiskFiles,getAllFailures,guardPolicy,knowledge,resolveDevelopmentScope,stableDigest} from './lib/shoperation-development-runtime.mjs';
import {buildCodebaseAtlas,buildExecutionRoute,impactForAtlasPattern,writeCodebaseAtlasArtifacts} from './lib/shoperation-codebase-atlas-runtime.mjs';
import {buildClosedDevelopmentPlan} from './lib/shoperation-operational-intelligence.mjs';

const args=process.argv.slice(2),value=name=>{const i=args.indexOf(name);return i>=0?args[i+1]??'':null;},has=name=>args.includes(name);
if(has('--close-plan')){
  const planPath='quality/development/active-plan.json';
  const truthPath=value('--truth')??'artifacts/shoperation-development-guard/truth-gate.json';
  if(!existsSync(planPath))throw new Error('DEV_LIFECYCLE_PLAN_MISSING');
  if(!existsSync(truthPath))throw new Error('DEV_LIFECYCLE_TRUTH_REPORT_MISSING:'+truthPath);
  const currentPlan=JSON.parse(readFileSync(planPath,'utf8'));
  const truthReport=JSON.parse(readFileSync(truthPath,'utf8'));
  const currentHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const closed=buildClosedDevelopmentPlan({
    plan:currentPlan,
    truthReport,
    currentHead,
    closedAt:process.env.SHOPERATION_CLOSE_TIMESTAMP??new Date().toISOString(),
  });
  writeFileSync(planPath,JSON.stringify(closed,null,2)+'\n');
  console.log(`Development lifecycle: CLOSE -> LEARN; task=${closed.taskId}; verifiedImplementationHead=${currentHead}.`);
  process.exit(0);
}
const task=value('--task')??process.env.SHOPERATION_TASK??'',rawFiles=value('--files')??process.env.SHOPERATION_PLANNED_FILES??'',files=rawFiles.split(/[;,\n]/).map(x=>x.trim()).filter(Boolean);
const riskTier=(value('--risk')??process.env.SHOPERATION_RISK_TIER??'medium').trim(),sourceRef=(value('--source-ref')??process.env.SHOPERATION_PO_SOURCE_REF??'').trim();
const assuranceProfile=guardPolicy.operationalIntelligence?.riskProfiles?.[riskTier];
if(!assuranceProfile){console.error(`DEVELOPMENT_GUARD_RISK_TIER_INVALID: ${riskTier}`);process.exit(1);}
if(!task.trim()){console.error('DEVELOPMENT_GUARD_TASK_REQUIRED');process.exit(1);}
if(!files.length){console.error('DEVELOPMENT_GUARD_PLANNED_FILES_REQUIRED');process.exit(1);}
const atlas=buildCodebaseAtlas();writeCodebaseAtlasArtifacts(atlas);
const atlasContext=files.map(file=>impactForAtlasPattern(atlas,file));
const semanticRoute=buildExecutionRoute(atlas,files);
const guardRegistry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const implementationSkeleton=deriveImplementationSkeleton({plannedFilePatterns:files,atlasFiles:atlas.nodes.map(node=>node.path),executionRoute:semanticRoute});
const projectedFiles=[...new Set([...implementationSkeleton.mustEdit,...implementationSkeleton.mustCreate])].sort();
const projectedReleaseRisk=evaluateReleaseRiskFiles(projectedFiles);
const gateChain=compileGateChain({guardRegistry,plannedFiles:projectedFiles,phase:'PLAN'});
const expectedDomains=[...new Set(atlasContext.flatMap(item=>item.directDomains??[]))].sort();
const expectedAuthorities=[...new Set(atlasContext.flatMap(item=>item.authorities??[]))].sort();
const scope=resolveDevelopmentScope({files,task}),allFailures=getAllFailures(),failureById=new Map(allFailures.map(f=>[f.id,f]));
const activeFailures=scope.activeFailureIds.map(id=>failureById.get(id)).filter(Boolean).map(f=>({...f,directive:guardPolicy.directives[f.id]}));
const negativeKnowledge=knowledge.negativeKnowledge.filter(item=>{const applicable=guardPolicy.negativeKnowledgeApplicability[item.id]??[];return applicable.includes('*')||applicable.some(s=>scope.impactedSubsystems.includes(s));});
const requiredRegressionTests=[...new Set(activeFailures.flatMap(f=>f.regressionTests??[]))].sort(),activeAuthorities=[...new Set(activeFailures.flatMap(f=>f.invariantIds??[]))].sort();
const digest=stableDigest({failureIds:scope.activeFailureIds.slice().sort(),subsystems:scope.impactedSubsystems.slice().sort(),negativeKnowledgeIds:negativeKnowledge.map(x=>x.id).sort()});
const decision=scope.unresolvedFiles.length?'BLOCK':'PASS';
const manifest={contract:'shoporation.development-guard.v1',task,plannedFiles:files,projectedFiles,guardDigest:digest,scope,atlasContext,implementationSkeleton,projectedReleaseRisk,gateChain,activeAuthorities,activeFailureIds:scope.activeFailureIds,activeFailures,negativeKnowledge,requiredRegressionTests,generalRules:guardPolicy.generalRules,decision:decision==='PASS'&&projectedReleaseRisk.decision==='PASS'&&gateChain.decision==='PASS'?'PASS':'BLOCK'};
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/development-guard.json',JSON.stringify(manifest,null,2)+'\n');
writeFileSync('artifacts/shoperation-development-guard/development-guard.md',['# Shoperation Development Guard','',`Decision: **${decision}**`,`Task: ${task}`,`Guard digest: ${digest}`,'','## Impacted subsystems',...scope.impactedSubsystems.map(x=>`- ${x}`),'','## Codebase Atlas impact',...atlasContext.flatMap(item=>[\`### ${item.pattern}\`,\`- owners/subsystems: ${item.subsystems.join(', ')||'unclassified'}\`,\`- surfaces: ${item.surfaces.join(', ')||'unknown'}\`,\`- affected routes: ${item.routes.map(r=>r.path).join(', ')||'none discovered'}\`,\`- related tests: ${item.tests.join(', ')||'none discovered'}\`,\`- component/literal keys: ${item.componentKeys.join(', ')||'none'}\`,'']), '## Active Known Failures',...activeFailures.flatMap(f=>[`### ${f.id} — ${f.title}`,f.directive.preventiveDirective,...f.directive.forbiddenApproaches.map(x=>`- FORBIDDEN: ${x}`),'']),'## Negative knowledge',...negativeKnowledge.map(x=>`- ${x.id}: ${x.rule}`),'','## Required regression authority',...requiredRegressionTests.map(x=>`- ${x}`)].join('\n')+'\n');
if(has('--write-plan')){
  const phases=guardPolicy.operationalIntelligence?.phaseSequence??[];
  const changeBaseSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const plan={
    contract:'shoporation.development-plan.v1',
    taskId:`DEV-${digest.toUpperCase()}`,
    task,
    status:'draft',
    guardDigest:digest,
    changeBaseSha,
    plannedFilePatterns:files,
    expectedSubsystems:scope.impactedSubsystems,
    expectedDomains,
    expectedAuthorities,
    expectedKnownFailureIds:scope.activeFailureIds,
    acknowledgedPoInstructionIds:[...(semanticRoute.PO_INSTRUCTIONS??[])],
    acknowledgedNegativeKnowledgeIds:negativeKnowledge.map(x=>x.id),
    exceptions:[],
    operationalIntelligence:{
      sourceKind:'product-owner-request',
      sourceRef,
      riskTier,
      assuranceCeiling:{level:assuranceProfile.assuranceLevel,rationale:'',selectedTechniques:[...(assuranceProfile.requiredTechniques??[])],deferredTechniques:[]},
      definition:{acceptanceCriteria:[],invariants:[],forbiddenStates:[]},
      model:{phases,transitions:phases.slice(0,-1).map((phase,index)=>`${phase}->${phases[index+1]}`),failureModes:[],edgeCases:[]},
      alternatives:[],
      specialistReviews:[],
      challenge:[],
      proofPlan:[],
      semanticExecutionRoute:{
        request:sourceRef||task,
        authority:[...implementationSkeleton.authority],
        mustEdit:[...implementationSkeleton.mustEdit],
        mayEdit:[...implementationSkeleton.mayEdit],
        impactedReadOnly:[...implementationSkeleton.impactedReadOnly],
        mustCreate:[...implementationSkeleton.mustCreate],
        forbidden:[...implementationSkeleton.forbidden],
        proof:[...implementationSkeleton.proof],
        unknown:[...implementationSkeleton.unknown],
        plannedDeletions:[],
      },
      ecosystem:{
        contract:'shoporation.development-ecosystem.v1',
        phase:'PLAN',
        implementationSkeleton,
        projectedReleaseRisk,
        gateChain,
      },
      executionAuthorized:false,
    },
    completionContract:{sourceKind:'product-owner-request',sourceRef,requirements:[]},
    notes:'Complete the assurance ceiling, DEFINE/MODEL/PLAN/CHALLENGE evidence, specialist reviews and PO-derived Completion Contract. Only then set status to ready-for-implementation and executionAuthorized to true before running Plan Before Code.',
  };
  mkdirSync('quality/development',{recursive:true});
  writeFileSync('quality/development/active-plan.json',JSON.stringify(plan,null,2)+'\n');
}
console.log(`Development Guard: ${manifest.decision}; failures=${scope.activeFailureIds.length}; subsystems=${scope.impactedSubsystems.join(',')||'baseline-only'}; digest=${digest}; projectedRisk=${projectedReleaseRisk.score}/${projectedReleaseRisk.maxPoints}; gateChain=${gateChain.decision}`);
if(scope.unresolvedFiles.length)console.error(`SCOPE_UNRESOLVED: ${scope.unresolvedFiles.join(', ')}`);
if(manifest.decision!=='PASS'&&has('--check'))process.exit(1);
