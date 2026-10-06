import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {evaluateReleaseRiskFiles,globToRegExp} from './shoperation-development-runtime.mjs';

export const RELEASE_DECOMPOSITION_CONTRACT='shoporation.release-decomposition.v1';
export const RELEASE_UNIT_MANIFEST_CONTRACT='shoporation.release-unit-manifest.v1';
export const DEFAULT_MAX_FILES_PER_UNIT=12;

const uniq=values=>[...new Set((values??[]).filter(Boolean))].sort();
const operationPaths=operation=>uniq([operation.file,operation.previousFile]);
const isTestFile=file=>/^tests\//.test(file)||/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
const fileForOperation=operation=>operation.file;
const normalizeRename=item=>typeof item==='string'?null:{from:String(item?.from??item?.previousFile??'').trim(),to:String(item?.to??item?.file??'').trim()};
const generatedByPath=items=>new Map((items??[]).filter(item=>item?.path).map(item=>[item.path,item]));

export function derivePlannedOperations({projectedFiles=[],atlas,plannedDeletions=[],plannedRenames=[],generatedArtifacts=[]}={}){
  const existing=new Set((atlas?.nodes??[]).map(node=>node.path));
  const deletions=new Set(plannedDeletions??[]);
  const generated=generatedByPath(generatedArtifacts);
  const renames=(plannedRenames??[]).map(normalizeRename).filter(item=>item?.from&&item?.to);
  const renamedFrom=new Set(renames.map(item=>item.from)),renamedTo=new Set(renames.map(item=>item.to));
  const operations=[];
  for(const rename of renames){
    operations.push({operation:'rename',previousFile:rename.from,file:rename.to,generated:generated.get(rename.to)??null});
  }
  for(const file of uniq([...projectedFiles,...deletions])){
    if(renamedFrom.has(file)||renamedTo.has(file))continue;
    if(deletions.has(file)){operations.push({operation:'delete',file});continue;}
    operations.push({operation:existing.has(file)?'modify':'create',file,generated:generated.get(file)??null});
  }
  return operations.sort((a,b)=>a.file.localeCompare(b.file)||a.operation.localeCompare(b.operation));
}

function dependencyEdgesFor(atlas,operations){
  const files=new Set(operations.map(fileForOperation)),edges=[];
  const nodeByPath=new Map((atlas?.nodes??[]).map(node=>[node.path,node]));
  for(const file of files){
    const node=nodeByPath.get(file);
    for(const dependency of node?.imports??[])if(files.has(dependency))edges.push({from:dependency,to:file,type:'repository-dependency'});
  }
  const reverse=atlas?.reverseImports??{};
  for(const source of files){
    if(isTestFile(source))continue;
    for(const consumer of reverse[source]??[])if(files.has(consumer)&&isTestFile(consumer)){
      edges.push({from:source,to:consumer,type:'proof-ownership'});
      edges.push({from:consumer,to:source,type:'proof-ownership'});
    }
  }
  for(const edge of atlas?.semanticGraph?.edges??[]){
    if(!edge?.fromFile||!edge?.toFile||!files.has(edge.fromFile)||!files.has(edge.toFile))continue;
    if(edge.type==='proves'){
      edges.push({from:edge.fromFile,to:edge.toFile,type:'proof-ownership'});
      edges.push({from:edge.toFile,to:edge.fromFile,type:'proof-ownership'});
    }
  }
  return [...new Map(edges.map(edge=>[`${edge.from}|${edge.to}|${edge.type}`,edge])).values()];
}

function stronglyConnectedComponents(files,edges){
  const adjacency=new Map(files.map(file=>[file,[]]));
  for(const edge of edges)if(adjacency.has(edge.from)&&adjacency.has(edge.to))adjacency.get(edge.from).push(edge.to);
  let index=0;const stack=[],onStack=new Set(),indices=new Map(),low=new Map(),components=[];
  const visit=node=>{
    indices.set(node,index);low.set(node,index);index+=1;stack.push(node);onStack.add(node);
    for(const next of adjacency.get(node)??[]){
      if(!indices.has(next)){visit(next);low.set(node,Math.min(low.get(node),low.get(next)));}
      else if(onStack.has(next))low.set(node,Math.min(low.get(node),indices.get(next)));
    }
    if(low.get(node)===indices.get(node)){
      const component=[];let current;
      do{current=stack.pop();onStack.delete(current);component.push(current);}while(current!==node);
      components.push(component.sort());
    }
  };
  for(const file of files)if(!indices.has(file))visit(file);
  return components;
}

function topologicalComponents(components,edges){
  const componentFor=new Map();components.forEach((items,index)=>items.forEach(file=>componentFor.set(file,index)));
  const outgoing=new Map(components.map((_,index)=>[index,new Set()])),indegree=new Map(components.map((_,index)=>[index,0]));
  for(const edge of edges){
    const from=componentFor.get(edge.from),to=componentFor.get(edge.to);
    if(from===undefined||to===undefined||from===to||outgoing.get(from).has(to))continue;
    outgoing.get(from).add(to);indegree.set(to,indegree.get(to)+1);
  }
  const queue=[...indegree.entries()].filter(([,degree])=>degree===0).map(([id])=>id).sort((a,b)=>components[a][0].localeCompare(components[b][0])),order=[];
  while(queue.length){
    const id=queue.shift();order.push(id);
    for(const next of [...outgoing.get(id)].sort((a,b)=>components[a][0].localeCompare(components[b][0]))){
      indegree.set(next,indegree.get(next)-1);
      if(indegree.get(next)===0){queue.push(next);queue.sort((a,b)=>components[a][0].localeCompare(components[b][0]));}
    }
  }
  return {order,outgoing,componentFor,cycle:order.length!==components.length};
}

function forbiddenHits(operations,patterns=[],readOnlyPaths=[]){
  const matchers=(patterns??[]).map(pattern=>({pattern,matcher:globToRegExp(pattern)}));
  const readOnly=new Set(readOnlyPaths??[]),hits=[];
  for(const operation of operations)for(const file of operationPaths(operation)){
    for(const {pattern,matcher} of matchers)if(matcher.test(file))hits.push({file,reason:'forbidden-pattern',pattern});
    if(readOnly.has(file))hits.push({file,reason:'read-only-path'});
  }
  return hits;
}

function authoritiesForFiles(atlas,files){
  const nodeByPath=new Map((atlas?.nodes??[]).map(node=>[node.path,node]));
  const definitions=atlas?.domainIndexDefinition??{};
  return uniq(files.flatMap(file=>{
    const node=nodeByPath.get(file),direct=node?.authorities??[];
    if(direct.length)return direct;
    return (node?.domains??[]).map(domain=>definitions[domain]?.owner).filter(Boolean);
  }));
}

function dependenciesForFiles(atlas,files){
  const nodeByPath=new Map((atlas?.nodes??[]).map(node=>[node.path,node]));
  return uniq(files.flatMap(file=>nodeByPath.get(file)?.imports??[]));
}

function digest(value){
  let hash=2166136261;const text=JSON.stringify(value);
  for(let i=0;i<text.length;i+=1){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16).padStart(8,'0');
}

export function validateReleaseUnitOrder(manifests=[]){
  const ids=new Set(manifests.map(unit=>unit.releaseUnitId)),edges=new Map(manifests.map(unit=>[unit.releaseUnitId,uniq(unit.predecessorUnits??[]).filter(id=>ids.has(id))]));
  const visiting=new Set(),visited=new Set(),cycles=[];
  const visit=id=>{
    if(visited.has(id))return;
    if(visiting.has(id)){cycles.push(id);return;}
    visiting.add(id);for(const predecessor of edges.get(id)??[])visit(predecessor);visiting.delete(id);visited.add(id);
  };
  for(const id of ids)visit(id);
  return{decision:cycles.length?'FAIL_CLOSED':'PASS',cycles:uniq(cycles)};
}

export function decomposeReleaseScope({
  transaction,
  operations=[],
  atlas,
  gateChain={},
  projectedRisk=null,
  forbiddenPatterns=[],
  readOnlyPaths=[],
  maxFilesPerUnit=DEFAULT_MAX_FILES_PER_UNIT,
  targetBaseSha,
}={}){
  const normalizedOperations=[...operations].sort((a,b)=>a.file.localeCompare(b.file));
  const allFiles=uniq(normalizedOperations.map(operation=>operation.file));
  const originalRisk=projectedRisk??evaluateReleaseRiskFiles(allFiles);
  const forbidden=forbiddenHits(normalizedOperations,forbiddenPatterns,readOnlyPaths);
  if(forbidden.length)return{contract:RELEASE_DECOMPOSITION_CONTRACT,decision:'FAIL_CLOSED',reason:'FORBIDDEN_OR_READ_ONLY_PATH',originalRisk,forbidden,releaseUnits:[]};
  for(const operation of normalizedOperations){
    if(operation.generated&&!['sealed','regenerate'].includes(operation.generated.mode)){
      return{contract:RELEASE_DECOMPOSITION_CONTRACT,decision:'FAIL_CLOSED',reason:'GENERATED_ARTIFACT_SEMANTICS_REQUIRED',operation,originalRisk,releaseUnits:[]};
    }
  }
  const edges=dependencyEdgesFor(atlas,normalizedOperations);
  const components=stronglyConnectedComponents(allFiles,edges);
  const topo=topologicalComponents(components,edges);
  if(topo.cycle)return{contract:RELEASE_DECOMPOSITION_CONTRACT,decision:'FAIL_CLOSED',reason:'CYCLIC_COMPONENT_GRAPH',originalRisk,releaseUnits:[]};
  const componentsById=components.map((files,id)=>({id,files,risk:evaluateReleaseRiskFiles(files)}));
  for(const component of componentsById){
    if(component.files.length>maxFilesPerUnit)return{contract:RELEASE_DECOMPOSITION_CONTRACT,decision:'FAIL_CLOSED',reason:'INSEPARABLE_COMPONENT_FILE_LIMIT',component,originalRisk,releaseUnits:[]};
    if(component.risk.decision!=='PASS')return{contract:RELEASE_DECOMPOSITION_CONTRACT,decision:'FAIL_CLOSED',reason:'NO_SAFE_DECOMPOSITION',component,originalRisk,releaseUnits:[]};
  }
  const packed=[];let current=[];
  const finish=()=>{if(current.length){packed.push(current);current=[];}};
  for(const componentId of topo.order){
    const component=componentsById[componentId],candidate=uniq([...current,...component.files]);
    const risk=evaluateReleaseRiskFiles(candidate);
    if(current.length&&(candidate.length>maxFilesPerUnit||risk.decision!=='PASS')){finish();current=[...component.files];}
    else current=candidate;
  }
  finish();
  const fileToUnit=new Map();packed.forEach((files,index)=>files.forEach(file=>fileToUnit.set(file,index)));
  const taskId=String(transaction?.taskId??'DEV-RELEASE').replace(/[^A-Za-z0-9-]+/g,'-');
  const releaseUnits=packed.map((files,index)=>{
    const operationsForUnit=normalizedOperations.filter(operation=>files.includes(operation.file));
    const risk=evaluateReleaseRiskFiles(files);
    const dependencyFiles=dependenciesForFiles(atlas,files);
    const dependencyUnitIds=uniq(edges
      .filter(edge=>files.includes(edge.to)&&fileToUnit.get(edge.from)!==index)
      .map(edge=>`${taskId}-U${String((fileToUnit.get(edge.from)??0)+1).padStart(2,'0')}`));
    const sequentialPrevious=index>0?[`${taskId}-U${String(index).padStart(2,'0')}`]:[];
    const predecessorUnits=uniq([...dependencyUnitIds,...sequentialPrevious]);
    const generatedArtifacts=operationsForUnit.filter(operation=>operation.generated).map(operation=>({path:operation.file,...operation.generated}));
    const releaseUnitId=`${taskId}-U${String(index+1).padStart(2,'0')}`;
    const requiredGates=uniq(gateChain.orderedGateIds??[]);
    const requiredProof=uniq(files.filter(isTestFile));
    return{
      contract:RELEASE_UNIT_MANIFEST_CONTRACT,
      transaction:{
        id:transaction?.taskId??null,
        parentTransactionId:transaction?.parentTransactionId??transaction?.taskId??null,
        sourceRef:transaction?.sourceRef??null,
        developmentBaseSha:transaction?.changeBaseSha??targetBaseSha??null,
      },
      releaseUnitId,
      order:index+1,
      targetBaseSha:targetBaseSha??transaction?.changeBaseSha??null,
      lease:{expectedBaseSha:targetBaseSha??transaction?.changeBaseSha??null,failOnDrift:true,reconciled:index===0,reconciledFromSha:null},
      intendedFiles:[...files],
      operations:operationsForUnit,
      requiredDependencyFiles:dependencyFiles,
      authorities:authoritiesForFiles(atlas,files),
      subsystems:risk.subsystems.map(item=>item.subsystem),
      projectedRisk:risk,
      requiredGates,
      requiredEvidence:{gateIds:requiredGates,proofFiles:requiredProof,externalGateIds:uniq(gateChain.externalGateIds??[])},
      forbiddenPaths:[...forbiddenPatterns],
      readOnlyPaths:[...readOnlyPaths],
      generatedArtifactSemantics:generatedArtifacts,
      prerequisites:predecessorUnits,
      predecessorUnits,
      expectedPostUnitState:{filesPresent:operationsForUnit.filter(item=>item.operation!=='delete').map(item=>item.file),filesAbsent:operationsForUnit.flatMap(item=>item.operation==='delete'?[item.file]:item.operation==='rename'?[item.previousFile]:[])},
      reconciliationPolicy:{
        mode:'merged-main-sequential',
        requireExactMainLease:true,
        requirePredecessorReceipts:index>0,
        requiresReconciliationAfterPredecessor:index>0,
        failOnUnrelatedMainDrift:true,
      },
      sourceIdentity:{sourceCommit:null,sealed:false},
      manifestDigest:null,
      decision:'PASS',
    };
  });
  for(const unit of releaseUnits)unit.manifestDigest=digest({...unit,manifestDigest:null});
  const ordering=validateReleaseUnitOrder(releaseUnits);
  if(ordering.decision!=='PASS')return{contract:RELEASE_DECOMPOSITION_CONTRACT,decision:'FAIL_CLOSED',reason:'CYCLIC_RELEASE_UNIT_DEPENDENCY',originalRisk,releaseUnits:[],ordering};
  return{
    contract:RELEASE_DECOMPOSITION_CONTRACT,
    decision:'PASS',
    decompositionRequired:originalRisk.decision!=='PASS'||releaseUnits.length>1,
    originalRisk,
    maxFilesPerUnit,
    repositoryEdges:edges,
    atomicComponents:componentsById,
    releaseUnits,
    ordering,
  };
}

export function reconcileReleaseUnitManifest(manifest,{newBaseSha,predecessorReceipts=[]}={}){
  if(manifest?.contract!==RELEASE_UNIT_MANIFEST_CONTRACT)throw new Error('RELEASE_UNIT_MANIFEST_CONTRACT_INVALID');
  const required=uniq(manifest.predecessorUnits??[]);
  const byId=new Map((predecessorReceipts??[]).map(item=>[item.releaseUnitId,item]));
  for(const predecessor of required){
    const receipt=byId.get(predecessor);
    if(!receipt||receipt.status!=='MERGED'||!receipt.mergedMainSha)throw new Error(`RELEASE_UNIT_PREDECESSOR_NOT_MERGED:${predecessor}`);
  }
  if(required.length){
    const sequencePredecessor=required.includes(`${String(manifest.releaseUnitId).replace(/U\d+$/,'')}U${String(manifest.order-1).padStart(2,'0')}`)
      ?`${String(manifest.releaseUnitId).replace(/U\d+$/,'')}U${String(manifest.order-1).padStart(2,'0')}`
      :required.at(-1);
    const expected=byId.get(sequencePredecessor)?.mergedMainSha;
    if(expected&&expected!==newBaseSha)throw new Error(`RELEASE_UNIT_MAIN_DRIFT:${expected}:${newBaseSha}`);
  }
  const next=structuredClone(manifest);
  next.targetBaseSha=newBaseSha;
  next.lease={expectedBaseSha:newBaseSha,failOnDrift:true,reconciled:true,reconciledFromSha:manifest.targetBaseSha??null};
  next.reconciliationPolicy={...next.reconciliationPolicy,reconciledAtBaseSha:newBaseSha};
  next.manifestDigest=digest({...next,manifestDigest:null});
  return next;
}

function git(cwd,args,options={}){
  return execFileSync('git',args,{cwd,encoding:'utf8',stdio:options.stdio??['ignore','pipe','pipe'],env:{...process.env,...(options.env??{})}}).trim();
}
function blobAt(cwd,commit,file){
  try{return git(cwd,['rev-parse',`${commit}:${file}`]);}catch{return null;}
}
function modeAt(cwd,commit,file){
  try{return git(cwd,['ls-tree',commit,'--',file]).split(/\s+/)[0]||'100644';}catch{return'100644';}
}
function ensureCommit(cwd,commit){git(cwd,['cat-file','-e',`${commit}^{commit}`]);}

export function sealReleaseUnitManifest(manifest,{sourceCommit,cwd=process.cwd()}={}){
  if(!sourceCommit)throw new Error('RELEASE_UNIT_SOURCE_COMMIT_REQUIRED');
  ensureCommit(cwd,sourceCommit);
  const sealed=structuredClone(manifest);
  sealed.operations=(sealed.operations??[]).map(operation=>{
    if(operation.operation==='delete')return{...operation,source:null};
    if(operation.generated?.mode==='regenerate')return{...operation,source:{mode:'regenerate',commit:sourceCommit,blobSha:null}};
    const blobSha=blobAt(cwd,sourceCommit,operation.file);
    if(!blobSha)throw new Error(`RELEASE_UNIT_SOURCE_BLOB_MISSING:${operation.file}`);
    return{...operation,source:{mode:'sealed',commit:sourceCommit,blobSha,fileMode:modeAt(cwd,sourceCommit,operation.file)}};
  });
  sealed.sourceIdentity={sourceCommit,sealed:true};
  sealed.manifestDigest=digest({...sealed,manifestDigest:null});
  return sealed;
}

function validateMaterializationManifest(manifest){
  if(manifest?.contract!==RELEASE_UNIT_MANIFEST_CONTRACT)throw new Error('RELEASE_UNIT_MANIFEST_CONTRACT_INVALID');
  if(manifest.decision!=='PASS')throw new Error('RELEASE_UNIT_MANIFEST_NOT_PASS');
  if(!manifest.targetBaseSha||manifest.lease?.expectedBaseSha!==manifest.targetBaseSha)throw new Error('RELEASE_UNIT_TARGET_BASE_LEASE_INVALID');
  if(manifest.reconciliationPolicy?.requiresReconciliationAfterPredecessor&&!manifest.lease?.reconciled)throw new Error('RELEASE_UNIT_RECONCILIATION_REQUIRED');
  const allowed=new Set(manifest.intendedFiles??[]);
  for(const operation of manifest.operations??[])if(!allowed.has(operation.file))throw new Error(`RELEASE_UNIT_OPERATION_OUTSIDE_SCOPE:${operation.file}`);
  const blocked=forbiddenHits(manifest.operations??[],manifest.forbiddenPaths??[],manifest.readOnlyPaths??[]);
  if(blocked.length)throw new Error(`RELEASE_UNIT_FORBIDDEN_SCOPE:${blocked.map(item=>item.file).join(',')}`);
}

function regeneratedBlob({cwd,sourceCommit,operation}){
  const command=String(operation.generated?.command??'').trim();
  if(!command)throw new Error(`RELEASE_UNIT_REGENERATE_COMMAND_REQUIRED:${operation.file}`);
  const worktree=mkdtempSync(path.join(os.tmpdir(),'shoperation-release-unit-worktree-'));
  try{
    git(cwd,['worktree','add','--detach',worktree,sourceCommit]);
    const result=spawnSync(command,{cwd:worktree,shell:true,encoding:'utf8'});
    if(result.status!==0)throw new Error(`RELEASE_UNIT_REGENERATE_FAILED:${operation.file}:${result.stderr||result.stdout}`);
    const filePath=path.join(worktree,operation.file);
    return {blobSha:git(cwd,['hash-object','-w',filePath]),fileMode:'100644'};
  }finally{
    try{git(cwd,['worktree','remove','--force',worktree]);}catch{}
    try{rmSync(worktree,{recursive:true,force:true});}catch{}
  }
}

export function materializeReleaseUnit({manifest,sourceCommit=null,targetRef='refs/heads/main',cwd=process.cwd(),updateRef=false,message=null}={}){
  validateMaterializationManifest(manifest);
  const sealed=manifest.sourceIdentity?.sealed?manifest:sealReleaseUnitManifest(manifest,{sourceCommit,cwd});
  const actualBase=git(cwd,['rev-parse',targetRef]);
  if(actualBase!==sealed.targetBaseSha)throw new Error(`RELEASE_UNIT_TARGET_BASE_DRIFT:${sealed.targetBaseSha}:${actualBase}`);
  const temp=mkdtempSync(path.join(os.tmpdir(),'shoperation-release-unit-index-')),indexFile=path.join(temp,'index');
  const env={GIT_INDEX_FILE:indexFile};const applied=[],alreadyApplied=[];
  try{
    git(cwd,['read-tree',sealed.targetBaseSha],{env});
    for(const operation of sealed.operations??[]){
      const targetBlob=blobAt(cwd,sealed.targetBaseSha,operation.file);
      if(operation.operation==='delete'){
        if(!targetBlob){alreadyApplied.push({file:operation.file,operation:'delete'});continue;}
        git(cwd,['update-index','--force-remove','--',operation.file],{env});applied.push(operation);continue;
      }
      if(operation.operation==='rename'){
        const oldBlob=blobAt(cwd,sealed.targetBaseSha,operation.previousFile);
        const desired=operation.generated?.mode==='regenerate'?regeneratedBlob({cwd,sourceCommit:sealed.sourceIdentity.sourceCommit,operation}):{blobSha:operation.source?.blobSha,fileMode:operation.source?.fileMode??'100644'};
        if(targetBlob===desired.blobSha&&!oldBlob){alreadyApplied.push({file:operation.file,operation:'rename'});continue;}
        if(!oldBlob)throw new Error(`RELEASE_UNIT_RENAME_SOURCE_MISSING:${operation.previousFile}`);
        git(cwd,['update-index','--force-remove','--',operation.previousFile],{env});
        git(cwd,['update-index','--add','--cacheinfo',`${desired.fileMode},${desired.blobSha},${operation.file}`],{env});applied.push(operation);continue;
      }
      const desired=operation.generated?.mode==='regenerate'?regeneratedBlob({cwd,sourceCommit:sealed.sourceIdentity.sourceCommit,operation}):{blobSha:operation.source?.blobSha,fileMode:operation.source?.fileMode??'100644'};
      if(!desired.blobSha)throw new Error(`RELEASE_UNIT_SOURCE_IDENTITY_MISSING:${operation.file}`);
      if(targetBlob===desired.blobSha){alreadyApplied.push({file:operation.file,operation:operation.operation});continue;}
      git(cwd,['update-index','--add','--cacheinfo',`${desired.fileMode},${desired.blobSha},${operation.file}`],{env});applied.push(operation);
    }
    const tree=git(cwd,['write-tree'],{env}),baseTree=git(cwd,['rev-parse',`${sealed.targetBaseSha}^{tree}`]);
    if(tree===baseTree)return{contract:'shoporation.release-unit-materialization.v1',status:'ALREADY_APPLIED',releaseUnitId:sealed.releaseUnitId,targetBaseSha:sealed.targetBaseSha,commitSha:null,applied,alreadyApplied};
    const commitMessage=message??`Materialize ${sealed.releaseUnitId}`;
    const commit=git(cwd,['commit-tree',tree,'-p',sealed.targetBaseSha,'-m',commitMessage]);
    if(updateRef)git(cwd,['update-ref',targetRef,commit,sealed.targetBaseSha]);
    return{contract:'shoporation.release-unit-materialization.v1',status:updateRef?'APPLIED':'PREPARED',releaseUnitId:sealed.releaseUnitId,targetBaseSha:sealed.targetBaseSha,commitSha:commit,treeSha:tree,applied,alreadyApplied};
  }finally{rmSync(temp,{recursive:true,force:true});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2),value=name=>{const index=args.indexOf(name);return index>=0?args[index+1]??null:null;},has=name=>args.includes(name);
  const manifestPath=value('--manifest');
  if(!manifestPath)throw new Error('RELEASE_UNIT_MANIFEST_PATH_REQUIRED');
  let manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  const sourceCommit=value('--source');
  if(has('--seal')){
    manifest=sealReleaseUnitManifest(manifest,{sourceCommit,cwd:process.cwd()});
    const output=value('--output')??manifestPath;writeFileSync(output,JSON.stringify(manifest,null,2)+'\n','utf8');
    console.log(`Release unit manifest sealed: ${output}`);
  }else{
    const result=materializeReleaseUnit({manifest,sourceCommit,targetRef:value('--target-ref')??'refs/heads/main',cwd:process.cwd(),updateRef:has('--apply-ref'),message:value('--message')});
    console.log(JSON.stringify(result,null,2));
  }
}
