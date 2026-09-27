import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const registry=readJson('quality/knowledge/guard-registry.v1.json');
const plan=readJson('quality/development/active-plan.json');

const args=process.argv.slice(2);
const arg=name=>{
  const i=args.indexOf(name);
  return i>=0?args[i+1]:null;
};
const profile=arg('--profile')||process.env.SHOPERATION_CONTROL_PLANE_PROFILE||(
  process.env.GITHUB_EVENT_NAME==='pull_request'?'pr':'post-merge'
);
const through=arg('--through')||process.env.SHOPERATION_CONTROL_PLANE_THROUGH||null;
const check=args.includes('--check');
const managed=(registry.guards??[]).filter(guard=>
  guard.blocking===true
  &&guard.execution?.mode==='control-plane-managed'
  &&(guard.execution.profiles??[]).includes(profile)
);

if(!managed.length)throw new Error(`CONTROL_PLANE_PROFILE_HAS_NO_MANAGED_GUARDS:${profile}`);

const byId=new Map((registry.guards??[]).map(guard=>[guard.id,guard]));
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

function topoSort(ids){
  const order=[];
  const visiting=new Set();
  const visited=new Set();
  const visit=id=>{
    if(visited.has(id))return;
    if(visiting.has(id))throw new Error(`CONTROL_PLANE_DEPENDENCY_CYCLE:${id}`);
    visiting.add(id);
    const guard=byId.get(id);
    for(const dependency of guard?.consumesEvidenceFrom??[]){
      if(ids.has(dependency))visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  };
  for(const id of ids)visit(id);
  return order;
}

const order=topoSort(selectedIds);
const activeList=order.join(',');
const runId=(process.env.GITHUB_RUN_ID??'local')+'-'+(process.env.GITHUB_RUN_ATTEMPT??'1');
const sourceHead=(process.env.DEVELOPMENT_HEAD_SHA??process.env.QUALITY_HEAD_SHA??process.env.RELEASE_HEAD_SHA??process.env.GITHUB_SHA??'').trim()||null;
const startedAt=new Date().toISOString();
const outcomes=[];
const contradictions=[];

const exactEvidencePath=value=>typeof value==='string'&&!value.includes('*')&&!value.includes('{')&&!value.includes('[')?value:null;
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
  const guard=byId.get(guardId);
  const execution=guard?.execution;
  if(!guard||execution?.mode!=='control-plane-managed'){
    contradictions.push({code:'CONTROL_PLANE_MANAGED_GUARD_INVALID',guardId});
    break;
  }
  const predecessorBlocks=(guard.consumesEvidenceFrom??[])
    .filter(id=>selectedIds.has(id))
    .filter(id=>outcomes.find(item=>item.guardId===id)?.decision!=='PASS');
  if(predecessorBlocks.length){
    outcomes.push({guardId,name:guard.name,decision:'BLOCK',exitCode:null,evidencePath:exactEvidencePath(guard.evidence),reason:'PREDECESSOR_BLOCK',predecessorBlocks});
    break;
  }

  let exitCode=0;
  let processError=null;
  try{
    execFileSync(execution.command,execution.args??[],{
      stdio:'inherit',
      env:{
        ...process.env,
        SHOPERATION_CONTROL_PLANE_ACTIVE_GUARDS:activeList,
        SHOPERATION_CONTROL_PLANE_PROFILE:profile,
        SHOPERATION_CONTROL_PLANE_RUN_ID:runId,
        SHOPERATION_CONTROL_PLANE_GUARD:guardId,
      },
    });
  }catch(error){
    exitCode=typeof error?.status==='number'?error.status:1;
    processError=error instanceof Error?error.message:String(error);
  }

  const {path:evidencePath,evidence}=readEvidence(guard);
  const evidenceDecision=evidence?.decision??null;
  const taskId=evidence?.taskId??null;
  const evidenceHead=evidence?.head??evidence?.sourceCommit??null;

  if(exitCode===0&&evidencePath&&!evidence){
    contradictions.push({code:'CONTROL_PLANE_EVIDENCE_MISSING_AFTER_SUCCESS',guardId,evidencePath});
  }
  if(exitCode===0&&evidence&&evidenceDecision!=='PASS'){
    contradictions.push({code:'CONTROL_PLANE_PROCESS_EVIDENCE_CONTRADICTION',guardId,processExitCode:exitCode,evidenceDecision});
  }
  if(exitCode!==0&&evidenceDecision==='PASS'){
    contradictions.push({code:'CONTROL_PLANE_PROCESS_EVIDENCE_CONTRADICTION',guardId,processExitCode:exitCode,evidenceDecision});
  }
  if(taskId&&taskId!==plan.taskId){
    contradictions.push({code:'CONTROL_PLANE_TASK_ID_DRIFT',guardId,expected:plan.taskId,actual:taskId});
  }
  if(sourceHead&&evidenceHead&&evidenceHead!=='HEAD'&&evidenceHead!==sourceHead){
    contradictions.push({code:'CONTROL_PLANE_HEAD_DRIFT',guardId,expected:sourceHead,actual:evidenceHead});
  }

  const decision=exitCode===0&&(!evidencePath||evidenceDecision==='PASS')?'PASS':'BLOCK';
  outcomes.push({
    guardId,
    name:guard.name,
    responsibilityKey:guard.responsibilityKey,
    authority:guard.authority,
    decision,
    exitCode,
    evidencePath,
    evidenceDecision,
    taskId,
    evidenceHead,
    processError,
  });
  if(decision!=='PASS')break;
}

const completedIds=new Set(outcomes.filter(item=>item.decision==='PASS').map(item=>item.guardId));
const missingSelected=order.filter(id=>!completedIds.has(id)&&!outcomes.some(item=>item.guardId===id));
const blocked=outcomes.find(item=>item.decision!=='PASS')??null;
const decision=!blocked&&!missingSelected.length&&!contradictions.length?'PASS':'BLOCK';

let authoritySummary=null;
if(existsSync('artifacts/shoperation-development-guard/guard-context.json')){
  try{
    const context=readJson('artifacts/shoperation-development-guard/guard-context.json');
    authoritySummary={
      globalRules:context.authorities?.global?.length??0,
      templateFactoryRules:context.authorities?.templateFactory?.length??0,
      domains:context.authorities?.domains?.length??0,
      instructionCount:context.instructions?.length??0,
    };
  }catch{}
}

const report={
  contract:'shoporation.control-plane.v1',
  profile,
  runId,
  taskId:plan.taskId,
  sourceHead,
  startedAt,
  finishedAt:new Date().toISOString(),
  selectedGuards:order,
  authoritySummary,
  outcomes,
  contradictions,
  blockedGuardId:blocked?.guardId??null,
  missingSelected,
  decision,
};
mkdirSync('artifacts/shoperation-control-plane',{recursive:true});
writeFileSync('artifacts/shoperation-control-plane/control-plane.json',JSON.stringify(report,null,2)+'\n');
writeFileSync('artifacts/shoperation-control-plane/control-plane.md',[
  '# Shoperation Control Plane',
  '',
  `Profile: ${profile}`,
  `Task: ${plan.taskId}`,
  `Decision: ${decision}`,
  '',
  ...outcomes.map(item=>`- ${item.guardId} — ${item.decision} — ${item.name}`),
  ...(contradictions.length?['','## Contradictions',...contradictions.map(item=>`- ${item.code} — ${item.guardId??''}`)]:[]),
].join('\n')+'\n');

console.log(`Shoperation Control Plane: ${decision}; profile=${profile}; guards=${outcomes.length}/${order.length}; blocked=${blocked?.guardId??'none'}; contradictions=${contradictions.length}.`);
if(check&&decision!=='PASS')process.exit(1);
