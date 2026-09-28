import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {emitInstantGuardFailure} from './lib/shoperation-control-plane-reporter.mjs';
import {runExternalSpecialists} from './lib/shoperation-external-orchestrator.mjs';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const registry=readJson('quality/knowledge/guard-registry.v1.json');
const plan=readJson('quality/development/active-plan.json');
const byId=new Map((registry.guards??[]).map(guard=>[guard.id,guard]));
const args=process.argv.slice(2);
const arg=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null};
const profile=arg('--profile')||process.env.SHOPERATION_CONTROL_PLANE_PROFILE||(process.env.GITHUB_EVENT_NAME==='pull_request'?'pr':'branch');
const through=arg('--through')||process.env.SHOPERATION_CONTROL_PLANE_THROUGH||null;
const check=args.includes('--check');
const runExternal=args.includes('--run-external');
const reconcile=args.includes('--reconcile-external')||runExternal;
const reportDir='artifacts/shoperation-control-plane';
const reportPath=`${reportDir}/control-plane.json`;
const exactEvidencePath=value=>typeof value==='string'&&!value.includes('*')&&!value.includes('{')&&!value.includes('[')?value:null;
const sourceHead=(process.env.DEVELOPMENT_HEAD_SHA??process.env.QUALITY_HEAD_SHA??process.env.RELEASE_HEAD_SHA??process.env.GITHUB_SHA??'').trim()||null;
const atPath=(value,path)=>String(path??'').split('.').filter(Boolean).reduce((current,key)=>current?.[key],value);
function diagnosticSourceRows(guard){
  const rows=[];
  for(const source of guard.diagnosticSources??[]){
    if(!source.file||!existsSync(source.file))continue;
    try{
      const data=readJson(source.file);
      const items=atPath(data,source.arrayPath);
      if(!Array.isArray(items))continue;
      for(const item of items){
        const raw=typeof item==='string'?item:String(item?.[source.codeField]??item?.code??item?.error??'');
        if(!raw)continue;
        const code=raw.includes(':')?raw.split(':')[0]:raw;
        const context=(source.contextFields??[]).map(field=>item?.[field]).filter(Boolean);
        rows.push({code,message:context.length?raw+' · '+context.join(' · '):raw,sourceFile:source.file});
      }
    }catch{}
  }
  if(rows.length&&rows.every(item=>item.code==='GOLDEN_DIFF'||item.code==='GOLDEN_BASELINE_MISSING')){
    return [{code:'GOLDEN_DIFF',message:rows.length+' golden-only visual differences. Human visual acceptance is required before baseline promotion.',count:rows.length,sourceFile:rows[0].sourceFile}];
  }
  return rows.slice(0,20);
}

function writeReport(report){
  mkdirSync(reportDir,{recursive:true});
  writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  writeFileSync(`${reportDir}/control-plane.md`,[
    '# Shoperation Control Plane','',
    `Profile: ${report.profile}`,
    `Task: ${report.taskId}`,
    `Stage: ${report.stage}`,
    `Decision: ${report.decision}`,'',
    ...(report.outcomes??[]).map(item=>`- ${item.guardId} — ${item.decision} — ${item.name??''}`),
    ...((report.contradictions??[]).length?['','## Contradictions',...(report.contradictions??[]).map(item=>`- ${item.code} — ${item.guardId??item.dependencyId??''}`)]:[]),
  ].join('\n')+'\n');
}

function finalDecision(outcomes,contradictions,requiredIds){
  const byOutcome=new Map(outcomes.map(item=>[item.guardId,item]));
  const missing=requiredIds.filter(id=>!byOutcome.has(id));
  const blocked=outcomes.find(item=>item.decision!=='PASS')??null;
  return {decision:!blocked&&!missing.length&&!contradictions.length?'PASS':'BLOCK',blocked,missing};
}

function topoSort(ids){
  const order=[],visiting=new Set(),visited=new Set();
  const visit=id=>{
    if(visited.has(id))return;
    if(visiting.has(id))throw new Error(`CONTROL_PLANE_DEPENDENCY_CYCLE:${id}`);
    visiting.add(id);
    const guard=byId.get(id);
    if(!guard)throw new Error(`CONTROL_PLANE_UNKNOWN_GUARD:${id}`);
    for(const dependency of guard.consumesEvidenceFrom??[])if(ids.has(dependency))visit(dependency);
    visiting.delete(id);visited.add(id);order.push(id);
  };
  for(const id of ids)visit(id);
  return order;
}

topoSort(new Set((registry.guards??[]).filter(guard=>guard.blocking===true).map(guard=>guard.id)));

if(reconcile){
  if(!existsSync(reportPath))throw new Error('CONTROL_PLANE_MANAGED_REPORT_MISSING');
  const prior=readJson(reportPath);
  const contradictions=[...(prior.contradictions??[])];
  const outcomes=[...(prior.outcomes??[])];
  const expectedExternal=(registry.guards??[]).filter(guard=>{
    const profiles=guard?.execution?.profiles??[];
    return guard.blocking===true&&guard.execution?.mode==='external-specialist'&&profiles.includes(prior.profile);
  });
  if(!expectedExternal.length)throw new Error('CONTROL_PLANE_PROFILE_HAS_NO_EXTERNAL_SPECIALISTS:'+prior.profile);
  const expectedExternalIds=new Set(expectedExternal.map(guard=>guard.id));
  let externalResults={};
  if(runExternal){
    externalResults=runExternalSpecialists({profile:prior.profile}).results;
  }else{
    for(const guard of expectedExternal){
      const specialistPath=`${reportDir}/specialist-${guard.id.toLowerCase()}.json`;
      if(!existsSync(specialistPath)){externalResults[guard.id]='missing';continue;}
      const evidence=readJson(specialistPath);
      externalResults[guard.id]=evidence.decision==='PASS'?'success':'failure';
    }
  }
  const suppliedIds=Object.keys(externalResults);
  const unexpected=suppliedIds.filter(id=>!expectedExternalIds.has(id));
  if(unexpected.length)contradictions.push(...unexpected.map(guardId=>({code:'CONTROL_PLANE_EXTERNAL_GUARD_NOT_EXPECTED_FOR_PROFILE',guardId,profile:prior.profile})));
  const externalIds=topoSort(expectedExternalIds);
  const outcomeMap=new Map(outcomes.map(item=>[item.guardId,item]));

  for(const guardId of externalIds){
    const guard=byId.get(guardId);
    if(!guard){
      contradictions.push({code:'CONTROL_PLANE_EXTERNAL_GUARD_NOT_REGISTERED',guardId});
      continue;
    }
    if(guard.execution?.mode!=='external-specialist'){
      contradictions.push({code:'CONTROL_PLANE_EXTERNAL_GUARD_MODE_INVALID',guardId,mode:guard.execution?.mode??null});
      continue;
    }
    const raw=String(externalResults[guardId]??'').toLowerCase();
    let decision=raw==='success'?'PASS':'BLOCK';
    const dependencyBlocks=[];
    for(const dependencyId of guard.consumesEvidenceFrom??[]){
      const dependency=outcomeMap.get(dependencyId);
      if(!dependency||dependency.decision!=='PASS'){
        dependencyBlocks.push({dependencyId,decision:dependency?.decision??null});
        decision='BLOCK';
      }
    }
    const specialistPath=`${reportDir}/specialist-${guardId.toLowerCase()}.json`;
    const specialistEvidence=existsSync(specialistPath)?readJson(specialistPath):null;
    if(specialistEvidence&&specialistEvidence.decision!==decision){
      contradictions.push({code:'CONTROL_PLANE_SPECIALIST_EVIDENCE_CONTRADICTION',guardId,stepDecision:decision,specialistDecision:specialistEvidence.decision});
      decision='BLOCK';
    }
    const evidence={
      contract:'shoporation.control-plane.external-evidence.v1',
      guardId,
      name:guard.name,
      responsibilityKey:guard.responsibilityKey,
      authority:guard.authority,
      rawOutcome:raw||null,
      dependencyBlocks,
      diagnostics:[...(specialistEvidence?.diagnostics??[]),...diagnosticSourceRows(guard)],
      specialistEvidencePath:specialistEvidence?specialistPath:null,
      decision,
      taskId:plan.taskId,
      sourceHead,
    };
    const evidencePath=`${reportDir}/external-${guardId.toLowerCase()}.json`;
    writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
    const row={guardId,name:guard.name,responsibilityKey:guard.responsibilityKey,authority:guard.authority,decision,exitCode:specialistEvidence?.exitCode??null,evidencePath,evidenceDecision:decision,taskId:plan.taskId,evidenceHead:sourceHead,external:true,rawOutcome:raw,dependencyBlocks,diagnostics:evidence.diagnostics};
    const index=outcomes.findIndex(item=>item.guardId===guardId);
    if(index>=0)outcomes[index]=row;else outcomes.push(row);
    outcomeMap.set(guardId,row);
    if(raw!=='success'&&!specialistEvidence)emitInstantGuardFailure({guard,evidence,stage:'external-reconciliation'});
  }

  const requiredIds=[...(prior.selectedGuards??[]),...externalIds];
  const result=finalDecision(outcomes,contradictions,requiredIds);
  const report={...prior,stage:'final',finishedAt:new Date().toISOString(),externalGuardIds:externalIds,outcomes,contradictions,blockedGuardId:result.blocked?.guardId??prior.blockedGuardId??null,missingSelected:result.missing,decision:prior.decision==='PASS'&&result.decision==='PASS'?'PASS':'BLOCK'};
  writeReport(report);
  console.log(`Shoperation Control Plane final reconciliation: ${report.decision}; external=${externalIds.length}; blocked=${report.blockedGuardId??'none'}; contradictions=${contradictions.length}.`);
  if(check&&report.decision!=='PASS')process.exit(1);
}else{
  const managed=(registry.guards??[]).filter(guard=>guard.blocking===true&&guard.execution?.mode==='control-plane-managed'&&(guard.execution.profiles??[]).includes(profile));
  if(!managed.length)throw new Error(`CONTROL_PLANE_PROFILE_HAS_NO_MANAGED_GUARDS:${profile}`);
  const managedIds=new Set(managed.map(guard=>guard.id));

  function dependencyClosure(targetId){
    const selected=new Set();
    const visit=id=>{
      if(selected.has(id))return;
      const guard=byId.get(id);
      if(!guard)throw new Error(`CONTROL_PLANE_UNKNOWN_GUARD:${id}`);
      if(!managedIds.has(id))return;
      selected.add(id);
      for(const dependency of guard.consumesEvidenceFrom??[])visit(dependency);
    };
    visit(targetId);
    return selected;
  }
  const selectedIds=through?dependencyClosure(through):new Set(managedIds);
  if(through&&!selectedIds.has(through))throw new Error(`CONTROL_PLANE_THROUGH_NOT_MANAGED_IN_PROFILE:${through}:${profile}`);

  const order=topoSort(selectedIds);
  const activeList=order.join(',');
  const runId=(process.env.GITHUB_RUN_ID??'local')+'-'+(process.env.GITHUB_RUN_ATTEMPT??'1');
  const startedAt=new Date().toISOString();
  const outcomes=[],contradictions=[];

  const readEvidence=guard=>{
    const path=exactEvidencePath(guard.evidence);
    if(!path)return{path:null,evidence:null};
    if(!existsSync(path))return{path,evidence:null};
    try{return{path,evidence:readJson(path)}}catch(error){
      contradictions.push({code:'CONTROL_PLANE_EVIDENCE_UNREADABLE',guardId:guard.id,path,error:error instanceof Error?error.message:String(error)});
      return{path,evidence:null};
    }
  };

  for(const guardId of order){
    const guard=byId.get(guardId),execution=guard?.execution;
    if(!guard||execution?.mode!=='control-plane-managed'){
      contradictions.push({code:'CONTROL_PLANE_MANAGED_GUARD_INVALID',guardId});
      break;
    }
    const predecessorBlocks=(guard.consumesEvidenceFrom??[]).filter(id=>selectedIds.has(id)).filter(id=>outcomes.find(item=>item.guardId===id)?.decision!=='PASS');
    if(predecessorBlocks.length){
      outcomes.push({guardId,name:guard.name,decision:'BLOCK',exitCode:null,evidencePath:exactEvidencePath(guard.evidence),reason:'PREDECESSOR_BLOCK',predecessorBlocks});
      break;
    }

    let exitCode=0,processError=null;
    try{
      execFileSync(execution.command,execution.args??[],{stdio:'inherit',env:{...process.env,SHOPERATION_CONTROL_PLANE_ACTIVE_GUARDS:activeList,SHOPERATION_CONTROL_PLANE_PROFILE:profile,SHOPERATION_CONTROL_PLANE_RUN_ID:runId,SHOPERATION_CONTROL_PLANE_GUARD:guardId}});
    }catch(error){
      exitCode=typeof error?.status==='number'?error.status:1;
      processError=error instanceof Error?error.message:String(error);
    }

    const {path:evidencePath,evidence}=readEvidence(guard);
    const evidenceDecision=evidence?.decision??null,taskId=evidence?.taskId??null,evidenceHead=evidence?.head??evidence?.sourceCommit??null;
    if(exitCode===0&&evidencePath&&!evidence)contradictions.push({code:'CONTROL_PLANE_EVIDENCE_MISSING_AFTER_SUCCESS',guardId,evidencePath});
    if(exitCode===0&&evidence&&evidenceDecision!=='PASS')contradictions.push({code:'CONTROL_PLANE_PROCESS_EVIDENCE_CONTRADICTION',guardId,processExitCode:exitCode,evidenceDecision});
    if(exitCode!==0&&evidenceDecision==='PASS')contradictions.push({code:'CONTROL_PLANE_PROCESS_EVIDENCE_CONTRADICTION',guardId,processExitCode:exitCode,evidenceDecision});
    if(taskId&&taskId!==plan.taskId)contradictions.push({code:'CONTROL_PLANE_TASK_ID_DRIFT',guardId,expected:plan.taskId,actual:taskId});
    if(sourceHead&&evidenceHead&&evidenceHead!=='HEAD'&&evidenceHead!==sourceHead)contradictions.push({code:'CONTROL_PLANE_HEAD_DRIFT',guardId,expected:sourceHead,actual:evidenceHead});

    const decision=exitCode===0&&(!evidencePath||evidenceDecision==='PASS')?'PASS':'BLOCK';
    const row={guardId,name:guard.name,responsibilityKey:guard.responsibilityKey,authority:guard.authority,decision,exitCode,evidencePath,evidenceDecision,taskId,evidenceHead,processError};
    outcomes.push(row);
    if(decision!=='PASS'){
      emitInstantGuardFailure({guard,evidence,processError,stage:'managed'});
      break;
    }
  }

  let authoritySummary=null;
  if(existsSync('artifacts/shoperation-development-guard/guard-context.json')){
    try{
      const context=readJson('artifacts/shoperation-development-guard/guard-context.json');
      authoritySummary={globalRules:context.authorities?.global?.length??0,templateFactoryRules:context.authorities?.templateFactory?.length??0,domains:context.authorities?.domains?.length??0,instructionCount:context.instructions?.length??0};
    }catch{}
  }
  const result=finalDecision(outcomes,contradictions,order);
  const report={contract:'shoporation.control-plane.v1',profile,runId,stage:'managed',taskId:plan.taskId,sourceHead,startedAt,finishedAt:new Date().toISOString(),selectedGuards:order,authoritySummary,outcomes,contradictions,blockedGuardId:result.blocked?.guardId??null,missingSelected:result.missing,decision:result.decision};
  writeReport(report);
  console.log(`Shoperation Control Plane: ${report.decision}; profile=${profile}; guards=${outcomes.length}/${order.length}; blocked=${report.blockedGuardId??'none'}; contradictions=${contradictions.length}.`);
  if(check&&report.decision!=='PASS')process.exit(1);
}
