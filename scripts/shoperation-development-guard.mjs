import {mkdirSync,writeFileSync} from 'node:fs';
import {getAllFailures,guardPolicy,knowledge,resolveDevelopmentScope,stableDigest} from './lib/shoperation-development-runtime.mjs';

const args=process.argv.slice(2),value=name=>{const i=args.indexOf(name);return i>=0?args[i+1]??'':null;},has=name=>args.includes(name);
const task=value('--task')??process.env.SHOPERATION_TASK??'',rawFiles=value('--files')??process.env.SHOPERATION_PLANNED_FILES??'',files=rawFiles.split(/[;,\n]/).map(x=>x.trim()).filter(Boolean);
if(!task.trim()){console.error('DEVELOPMENT_GUARD_TASK_REQUIRED');process.exit(1);}
if(!files.length){console.error('DEVELOPMENT_GUARD_PLANNED_FILES_REQUIRED');process.exit(1);}
const scope=resolveDevelopmentScope({files,task}),allFailures=getAllFailures(),failureById=new Map(allFailures.map(f=>[f.id,f]));
const activeFailures=scope.activeFailureIds.map(id=>failureById.get(id)).filter(Boolean).map(f=>({...f,directive:guardPolicy.directives[f.id]}));
const negativeKnowledge=knowledge.negativeKnowledge.filter(item=>{const applicable=guardPolicy.negativeKnowledgeApplicability[item.id]??[];return applicable.includes('*')||applicable.some(s=>scope.impactedSubsystems.includes(s));});
const requiredRegressionTests=[...new Set(activeFailures.flatMap(f=>f.regressionTests??[]))].sort(),activeAuthorities=[...new Set(activeFailures.flatMap(f=>f.invariantIds??[]))].sort();
const digest=stableDigest({failureIds:scope.activeFailureIds.slice().sort(),subsystems:scope.impactedSubsystems.slice().sort(),negativeKnowledgeIds:negativeKnowledge.map(x=>x.id).sort()});
const decision=scope.unresolvedFiles.length?'BLOCK':'PASS';
const manifest={contract:'shoporation.development-guard.v1',task,plannedFiles:files,guardDigest:digest,scope,activeAuthorities,activeFailureIds:scope.activeFailureIds,activeFailures,negativeKnowledge,requiredRegressionTests,generalRules:guardPolicy.generalRules,decision};
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/development-guard.json',JSON.stringify(manifest,null,2)+'\n');
writeFileSync('artifacts/shoperation-development-guard/development-guard.md',['# Shoperation Development Guard','',`Decision: **${decision}**`,`Task: ${task}`,`Guard digest: ${digest}`,'','## Impacted subsystems',...scope.impactedSubsystems.map(x=>`- ${x}`),'','## Active Known Failures',...activeFailures.flatMap(f=>[`### ${f.id} — ${f.title}`,f.directive.preventiveDirective,...f.directive.forbiddenApproaches.map(x=>`- FORBIDDEN: ${x}`),'']),'## Negative knowledge',...negativeKnowledge.map(x=>`- ${x.id}: ${x.rule}`),'','## Required regression authority',...requiredRegressionTests.map(x=>`- ${x}`)].join('\n')+'\n');
if(has('--write-plan')){const plan={contract:'shoporation.development-plan.v1',taskId:`DEV-${digest.toUpperCase()}`,task,status:'draft',guardDigest:digest,plannedFilePatterns:files,expectedSubsystems:scope.impactedSubsystems,expectedKnownFailureIds:scope.activeFailureIds,acknowledgedNegativeKnowledgeIds:negativeKnowledge.map(x=>x.id),exceptions:[],notes:'Read artifacts/shoperation-development-guard/development-guard.md, then set status to ready-for-implementation before running the Plan Before Code gate.'};mkdirSync('quality/development',{recursive:true});writeFileSync('quality/development/active-plan.json',JSON.stringify(plan,null,2)+'\n');}
console.log(`Development Guard: ${decision}; failures=${scope.activeFailureIds.length}; subsystems=${scope.impactedSubsystems.join(',')||'baseline-only'}; digest=${digest}`);
if(scope.unresolvedFiles.length)console.error(`SCOPE_UNRESOLVED: ${scope.unresolvedFiles.join(', ')}`);
if(decision!=='PASS'&&has('--check'))process.exit(1);
