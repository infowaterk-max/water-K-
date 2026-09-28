import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const registry=readJson('quality/knowledge/guard-registry.v1.json');
const byId=new Map((registry.guards??[]).map(guard=>[guard.id,guard]));
const reportPath='artifacts/shoperation-control-plane/control-plane.json';
const specialistPath=id=>'artifacts/shoperation-control-plane/specialist-'+id.toLowerCase()+'.json';
const inProfile=(guard,profile)=>{const profiles=guard?.execution?.profiles??[];return !profiles.length||profiles.includes(profile)};

function topoSort(ids){
  const order=[],visiting=new Set(),visited=new Set();
  const visit=id=>{
    if(visited.has(id))return;
    if(visiting.has(id))throw new Error('CONTROL_PLANE_DEPENDENCY_CYCLE:'+id);
    visiting.add(id);
    const guard=byId.get(id);
    for(const dependencyId of guard?.consumesEvidenceFrom??[])if(ids.has(dependencyId))visit(dependencyId);
    visiting.delete(id);visited.add(id);order.push(id);
  };
  for(const id of ids)visit(id);
  return order;
}

export function runExternalSpecialists({profile}){
  if(!existsSync(reportPath))throw new Error('CONTROL_PLANE_MANAGED_REPORT_MISSING');
  const prior=readJson(reportPath);
  if(prior.stage!=='managed')throw new Error('CONTROL_PLANE_MANAGED_STAGE_REQUIRED');
  if(prior.profile!==profile)throw new Error('CONTROL_PLANE_PROFILE_DRIFT:'+prior.profile+':'+profile);
  if(prior.decision!=='PASS')throw new Error('CONTROL_PLANE_MANAGED_NOT_PASS');
  const selected=(registry.guards??[]).filter(guard=>guard.blocking===true&&guard.execution?.mode==='external-specialist'&&inProfile(guard,profile));
  const selectedIds=new Set(selected.map(guard=>guard.id));
  const order=topoSort(selectedIds);
  const results={};
  const outcomes=[];
  for(const guardId of order){
    let outcome='success';
    try{
      execFileSync(process.execPath,['scripts/shoperation-specialist-runner.mjs','--guard',guardId],{stdio:'inherit',env:{...process.env,SHOPERATION_CONTROL_PLANE_PROFILE:profile}});
    }catch{outcome='failure'}
    results[guardId]=outcome;
    const path=specialistPath(guardId);
    const evidence=existsSync(path)?readJson(path):null;
    outcomes.push({guardId,outcome,decision:evidence?.decision??(outcome==='success'?'PASS':'BLOCK'),evidencePath:path,evidencePresent:Boolean(evidence)});
  }
  const decision=outcomes.every(item=>item.decision==='PASS')?'PASS':'BLOCK';
  const report={contract:'shoporation.control-plane.external-run.v1',profile,order,results,outcomes,decision,finishedAt:new Date().toISOString()};
  mkdirSync('artifacts/shoperation-control-plane',{recursive:true});
  writeFileSync('artifacts/shoperation-control-plane/external-run.json',JSON.stringify(report,null,2)+'\n');
  return report;
}
