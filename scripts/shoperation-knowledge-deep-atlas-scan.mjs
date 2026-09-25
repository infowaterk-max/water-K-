import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {buildCodebaseAtlas,validateCodebaseAtlas,writeCodebaseAtlasArtifacts} from './lib/shoperation-codebase-atlas-runtime.mjs';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const policy=readJson('quality/knowledge/deep-atlas-scan-policy.v1.json');
const roadmap=readJson('quality/knowledge/living-roadmap.v1.json');

const atlas=buildCodebaseAtlas();
const atlasValidation=validateCodebaseAtlas(atlas);
writeCodebaseAtlasArtifacts(atlas);

let architectureExecutionFailed=false;
try{
  execFileSync(process.execPath,['scripts/lib/shoperation-architecture-health.mjs','--check'],{stdio:'inherit',env:process.env});
}catch{
  architectureExecutionFailed=true;
}
const healthPath='artifacts/shoperation-architecture/architecture-health.json';
const health=existsSync(healthPath)?readJson(healthPath):null;

const hardFindings=[];
for(const issue of atlasValidation.issues??[])hardFindings.push({source:'atlas-validation',...issue});
for(const issue of health?.hardDrift??[])hardFindings.push({source:'architecture-hard-drift',...issue});
if(architectureExecutionFailed&&!(health?.hardDrift?.length))hardFindings.push({source:'architecture-hard-drift',code:'ARCHITECTURE_HEALTH_EXECUTION_FAILED'});
if(!health)hardFindings.push({source:'architecture-hard-drift',code:'ARCHITECTURE_HEALTH_ARTIFACT_MISSING'});
if(policy.contract!=='shoporation.deep-atlas-scan-policy.v1')hardFindings.push({source:'atlas-validation',code:'DEEP_ATLAS_POLICY_CONTRACT_INVALID'});

const warnings=[];
for(const item of health?.warnings??[])warnings.push({source:'architecture-warning',...item});
if((atlas.summary.unresolvedInternalImports??0)>0)warnings.push({
  source:'unresolved-internal-imports',
  code:'ATLAS_UNRESOLVED_INTERNAL_IMPORTS',
  count:atlas.summary.unresolvedInternalImports,
  sample:(atlas.unresolvedInternalImports??[]).slice(0,20)
});
if((atlas.summary.duplicateRoutes??0)>0)warnings.push({
  source:'duplicate-routes',
  code:'ATLAS_DUPLICATE_ROUTES',
  count:atlas.summary.duplicateRoutes,
  sample:(atlas.duplicateRoutes??[]).slice(0,20)
});
const zeroDomainCoverage=Object.entries(atlas.summary.domainCounts??{}).filter(([,count])=>count===0).map(([domainId])=>domainId);
if(zeroDomainCoverage.length)warnings.push({source:'zero-domain-coverage',code:'ATLAS_ZERO_DOMAIN_COVERAGE',domains:zeroDomainCoverage});
const confidenceThreshold=policy.behavior.warningThresholds.capabilityConfidenceBelow;
const lowConfidence=(health?.confidence?.capabilities??[]).filter(item=>item.score<confidenceThreshold);
if(lowConfidence.length)warnings.push({
  source:'low-capability-confidence',
  code:'ARCHITECTURE_LOW_CAPABILITY_CONFIDENCE',
  threshold:confidenceThreshold,
  capabilities:lowConfidence.map(item=>({capabilityId:item.capabilityId,score:item.score,level:item.level}))
});

const roadmapSummary=roadmap.items.reduce((acc,item)=>{
  acc[item.status]=(acc[item.status]??0)+1;
  return acc;
},{});
const report={
  contract:'shoporation.deep-atlas-scan.v1',
  generatedAt:new Date().toISOString(),
  head:git(['rev-parse','HEAD']),
  decision:hardFindings.length?'BLOCK':'PASS',
  policy:policy.contract,
  atlas:{
    contract:atlas.contract,
    validation:atlasValidation.ok?'PASS':'BLOCK',
    summary:atlas.summary
  },
  architectureHealth:health?{
    contract:health.contract,
    decision:health.decision,
    confidenceAverage:health.confidence?.average??null,
    guardSummary:health.guards??null
  }:null,
  roadmapSummary,
  hardFindings,
  warnings
};

mkdirSync('artifacts/shoperation-deep-atlas',{recursive:true});
writeFileSync('artifacts/shoperation-deep-atlas/deep-atlas-scan.json',JSON.stringify(report,null,2)+'\n');
const md=[
  '# Shoperation Daily Deep Atlas Scan','',
  `Decision: ${report.decision}`,
  `HEAD: ${report.head}`,
  `Atlas validation: ${report.atlas.validation}`,
  `Architecture confidence: ${report.architectureHealth?.confidenceAverage??'n/a'}/100`,
  `Hard findings: ${hardFindings.length}`,
  `Warnings: ${warnings.length}`,
  '',
  '## Hard findings',
  ...(hardFindings.length?hardFindings.map(item=>`- ${item.code??item.source}: ${JSON.stringify(item)}`):['- none']),
  '',
  '## Warnings',
  ...(warnings.length?warnings.map(item=>`- ${item.code??item.source}: ${JSON.stringify(item)}`):['- none'])
];
writeFileSync('artifacts/shoperation-deep-atlas/deep-atlas-scan.md',md.join('\n')+'\n');

console.log(`Deep Atlas Scan: ${report.decision}; hard=${hardFindings.length}; warnings=${warnings.length}; confidence=${report.architectureHealth?.confidenceAverage??'n/a'}.`);
if(process.argv.includes('--check')&&report.decision!=='PASS')process.exit(1);
