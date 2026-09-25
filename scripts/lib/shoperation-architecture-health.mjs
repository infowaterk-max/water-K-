import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {buildCodebaseAtlas} from './shoperation-codebase-atlas-runtime.mjs';

const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const capabilities=readJson('quality/knowledge/capability-registry.v1.json');
const roadmap=readJson('quality/knowledge/living-roadmap.v1.json');
const evidence=readJson('quality/knowledge/evidence-ledger.v1.json');
const domains=readJson('quality/knowledge/domain-foundations.v1.json');
const guards=readJson('quality/knowledge/guard-registry.v1.json');

const domainById=new Map(domains.domains.map(item=>[item.id,item]));
const evidenceById=new Map(evidence.evidence.map(item=>[item.id,item]));
const roadmapById=new Map(roadmap.items.map(item=>[item.id,item]));

function git(args){
  return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
}
function sourceIsAncestor(sha){
  if(!sha)return false;
  try{execFileSync('git',['merge-base','--is-ancestor',sha,'HEAD'],{stdio:'ignore'});return true;}catch{return false;}
}
function level(score){
  if(score>=90)return 'proven';
  if(score>=75)return 'supported';
  if(score>=50)return 'declared';
  return 'insufficient';
}
export function buildArchitectureHealth(){
  const hardDrift=[],warnings=[];
  const capabilityIds=new Set();
  for(const item of capabilities.capabilities){
    if(capabilityIds.has(item.id))hardDrift.push({code:'CAPABILITY_ID_DUPLICATE',capabilityId:item.id});
    capabilityIds.add(item.id);
    const domain=domainById.get(item.domain);
    if(!domain)hardDrift.push({code:'CAPABILITY_DOMAIN_UNKNOWN',capabilityId:item.id,domain:item.domain});
    else if(domain.owner!==item.authority)hardDrift.push({code:'CAPABILITY_AUTHORITY_DRIFT',capabilityId:item.id,declared:item.authority,canonical:domain.owner});
    for(const ref of item.roadmapRefs??[])if(!roadmapById.has(ref))hardDrift.push({code:'CAPABILITY_ROADMAP_REF_UNKNOWN',capabilityId:item.id,roadmapRef:ref});
  }

  const blockingResponsibilities=new Map();
  const guardIds=new Set();
  for(const guard of guards.guards){
    if(guardIds.has(guard.id))hardDrift.push({code:'GUARD_ID_DUPLICATE',guardId:guard.id});
    guardIds.add(guard.id);
    if(guard.blocking){
      const prior=blockingResponsibilities.get(guard.responsibilityKey);
      if(prior)hardDrift.push({code:'GUARD_BLOCKING_RESPONSIBILITY_DUPLICATE',responsibilityKey:guard.responsibilityKey,guards:[prior,guard.id]});
      else blockingResponsibilities.set(guard.responsibilityKey,guard.id);
    }
  }

  const evidenceState=new Map();
  for(const item of evidence.evidence){
    const ancestry=item.state==='verified'?sourceIsAncestor(item.sourceSha):false;
    evidenceState.set(item.id,{...item,sourceIsAncestor:ancestry});
    if(item.state==='verified'&&!ancestry)hardDrift.push({code:'EVIDENCE_SOURCE_NOT_IN_HISTORY',evidenceId:item.id,sourceSha:item.sourceSha});
    if(item.expiresAt&&new Date(item.expiresAt).getTime()<Date.now())warnings.push({code:'EVIDENCE_EXPIRED',evidenceId:item.id,expiresAt:item.expiresAt});
  }

  const roadmapIds=new Set();
  for(const item of roadmap.items){
    if(roadmapIds.has(item.id))hardDrift.push({code:'ROADMAP_ID_DUPLICATE',roadmapId:item.id});
    roadmapIds.add(item.id);
    const refs=item.evidenceRefs??[];
    const missing=refs.filter(ref=>!evidenceById.has(ref));
    for(const ref of missing)hardDrift.push({code:'ROADMAP_EVIDENCE_MISSING',roadmapId:item.id,evidenceRef:ref});
    if(item.status==='done'){
      const verified=refs.map(ref=>evidenceState.get(ref)).filter(Boolean).filter(ref=>ref.state==='verified'&&ref.sourceIsAncestor);
      if(!verified.length)hardDrift.push({code:'ROADMAP_DONE_WITHOUT_VERIFIED_EVIDENCE',roadmapId:item.id});
    }
    for(const capability of item.capabilities??[])if(!capabilityIds.has(capability))hardDrift.push({code:'ROADMAP_CAPABILITY_UNKNOWN',roadmapId:item.id,capabilityId:capability});
    for(const dependency of item.dependsOn??[])if(!roadmapById.has(dependency))hardDrift.push({code:'ROADMAP_DEPENDENCY_UNKNOWN',roadmapId:item.id,dependency});
  }

  const atlas=buildCodebaseAtlas();
  const capabilityConfidence=capabilities.capabilities.map(item=>{
    const domain=domainById.get(item.domain);
    const linkedRoadmap=roadmap.items.filter(entry=>(entry.capabilities??[]).includes(item.id));
    const verifiedEvidence=[...new Set(linkedRoadmap.flatMap(entry=>entry.evidenceRefs??[]))]
      .map(ref=>evidenceState.get(ref)).filter(Boolean).filter(ref=>ref.state==='verified'&&ref.sourceIsAncestor);
    const atlasCoverage=atlas.summary.domainCounts?.[item.domain]??0;
    let score=0;
    if(domain)score+=20;
    if(domain?.owner===item.authority)score+=15;
    if((item.evidence??[]).length)score+=15;
    if(atlasCoverage>0)score+=20;
    if(linkedRoadmap.length)score+=10;
    if(verifiedEvidence.length)score+=20;
    if(item.maturity==='operational'&&!verifiedEvidence.length)warnings.push({code:'OPERATIONAL_CAPABILITY_WITHOUT_VERIFIED_ROADMAP_EVIDENCE',capabilityId:item.id});
    if(atlasCoverage===0)warnings.push({code:'CAPABILITY_DOMAIN_WITHOUT_ATLAS_COVERAGE',capabilityId:item.id,domain:item.domain});
    return {
      capabilityId:item.id,domain:item.domain,authority:item.authority,maturity:item.maturity,
      score,level:level(score),atlasCoverage,roadmapIds:linkedRoadmap.map(x=>x.id),verifiedEvidenceIds:verifiedEvidence.map(x=>x.id)
    };
  });

  const guardSummary={
    total:guards.guards.length,
    blocking:guards.guards.filter(x=>x.blocking).length,
    informational:guards.guards.filter(x=>!x.blocking).length,
    blockingResponsibilityCount:blockingResponsibilities.size
  };
  const averageConfidence=Math.round(capabilityConfidence.reduce((sum,item)=>sum+item.score,0)/Math.max(1,capabilityConfidence.length));
  return {
    contract:'shoporation.architecture-health.v1',
    generatedAt:new Date().toISOString(),
    head:git(['rev-parse','HEAD']),
    decision:hardDrift.length?'BLOCK':'PASS',
    hardDrift,warnings,
    confidence:{average:averageConfidence,capabilities:capabilityConfidence},
    guards:guardSummary,
    atlas:{contract:atlas.contract,domainCounts:atlas.summary.domainCounts,truthOwnerCount:atlas.architecture.truthOwnerCount}
  };
}

const report=buildArchitectureHealth();
mkdirSync('artifacts/shoperation-architecture',{recursive:true});
writeFileSync('artifacts/shoperation-architecture/architecture-health.json',JSON.stringify(report,null,2)+'\n');
const md=[
 '# Shoperation Architecture Health','',
 `Decision: ${report.decision}`,
 `HEAD: ${report.head}`,
 `Average confidence: ${report.confidence.average}/100`,
 `Hard drift: ${report.hardDrift.length}`,
 `Warnings: ${report.warnings.length}`,
 `Blocking guards: ${report.guards.blocking} / responsibilities: ${report.guards.blockingResponsibilityCount}`,
 '','## Capability confidence',
 ...report.confidence.capabilities.map(item=>`- ${item.capabilityId}: ${item.score}/100 (${item.level}), Atlas files=${item.atlasCoverage}, verified evidence=${item.verifiedEvidenceIds.length}`),
 '','## Hard drift',...(report.hardDrift.length?report.hardDrift.map(item=>`- ${item.code}: ${JSON.stringify(item)}`):['- none']),
 '','## Warnings',...(report.warnings.length?report.warnings.map(item=>`- ${item.code}: ${JSON.stringify(item)}`):['- none'])
];
writeFileSync('artifacts/shoperation-architecture/architecture-health.md',md.join('\n')+'\n');
console.log(`Architecture Health: ${report.decision}; confidence=${report.confidence.average}; hardDrift=${report.hardDrift.length}; warnings=${report.warnings.length}.`);
if(process.argv.includes('--check')&&report.decision!=='PASS')process.exit(1);
