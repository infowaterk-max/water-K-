import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {evaluateReleaseRiskFiles,globToRegExp} from './shoperation-development-runtime.mjs';

export const RELEASE_DECOMPOSITION_CONTRACT='shoporation.release-decomposition.v1';
export const RELEASE_UNIT_MANIFEST_CONTRACT='shoporation.release-unit-manifest.v1';
export const DEFAULT_MAX_FILES_PER_UNIT=12;
export const RELEASE_UNIT_CHILD_TRANSACTION_CONTRACT='shoporation.release-unit-child-transaction.v1';

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
export function strongDigest(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function childPlanDigestValue(plan){
  const next=structuredClone(plan??{});
  if(next.releaseUnitContext){
    delete next.releaseUnitContext.manifestDigest;
    delete next.releaseUnitContext.bindingDigest;
    delete next.releaseUnitContext.childPlanDigest;
    delete next.releaseUnitContext.materializedHeadSha;
  }
  return next;
}
export function releaseUnitChildPlanDigest(plan){return strongDigest(childPlanDigestValue(plan));}
export function releaseUnitContextBindingDigest({manifestDigest,childPlanDigest,operationDigest,releaseUnitId,parentTransactionId,targetBaseSha}={}){
  return strongDigest({manifestDigest,childPlanDigest,operationDigest,releaseUnitId,parentTransactionId,targetBaseSha});
}
export function refreshReleaseUnitIdentity(manifest){
  const next=structuredClone(manifest);
  if(next.childDevelopmentTransaction)next.childDevelopmentTransaction.bindingDigest=null;
  next.manifestDigest=null;
  next.manifestDigest=digest(next);
  const child=next.childDevelopmentTransaction;
  if(child){
    child.operationDigest=strongDigest(next.operations??[]);
    child.bindingDigest=releaseUnitContextBindingDigest({
      manifestDigest:next.manifestDigest,
      childPlanDigest:child.planDigest,
      operationDigest:child.operationDigest,
      releaseUnitId:next.releaseUnitId,
      parentTransactionId:next.transaction?.parentTransactionId??next.transaction?.id??null,
      targetBaseSha:next.targetBaseSha,
    });
  }
  return next;
}
export function bindReleaseUnitChildTransaction(manifest,{parentPlan,guardDigest,expectedSubsystems=[],expectedDomains=[],expectedAuthorities=[],expectedKnownFailureIds=[],acknowledgedPoInstructionIds=[],acknowledgedNegativeKnowledgeIds=[],semanticExecutionRoute={}}={}){
  if(manifest?.contract!==RELEASE_UNIT_MANIFEST_CONTRACT)throw new Error('RELEASE_UNIT_MANIFEST_CONTRACT_INVALID');
  if(!parentPlan?.taskId)throw new Error('RELEASE_UNIT_PARENT_PLAN_REQUIRED');
  const taskId=manifest.releaseUnitId+'-TX';
  const sourceRef=parentPlan.completionContract?.sourceRef??parentPlan.operationalIntelligence?.sourceRef??manifest.transaction?.sourceRef??null;
  const childPlan=structuredClone(parentPlan);
  delete childPlan.lifecycle;
  childPlan.taskId=taskId;
  childPlan.task='Execute canonical release unit '+manifest.releaseUnitId+' of '+parentPlan.taskId+' without widening the manifest-authorized scope.';
  childPlan.status='ready-for-implementation';
  childPlan.guardDigest=guardDigest;
  childPlan.changeBaseSha=manifest.targetBaseSha;
  childPlan.plannedFilePatterns=[...(manifest.intendedFiles??[])];
  childPlan.expectedSubsystems=[...expectedSubsystems];
  childPlan.expectedDomains=[...expectedDomains];
  childPlan.expectedAuthorities=[...expectedAuthorities];
  childPlan.expectedKnownFailureIds=[...expectedKnownFailureIds];
  childPlan.acknowledgedPoInstructionIds=[...acknowledgedPoInstructionIds];
  childPlan.acknowledgedNegativeKnowledgeIds=[...acknowledgedNegativeKnowledgeIds];
  childPlan.exceptions=(parentPlan.exceptions??[]).filter(item=>(manifest.intendedFiles??[]).includes(item?.file));
  childPlan.operationalIntelligence={
    ...structuredClone(parentPlan.operationalIntelligence??{}),
    sourceKind:'product-owner-request',
    sourceRef,
    problemStatement:'Execute release unit '+manifest.releaseUnitId+' as the exact manifest-authorized child transaction of '+parentPlan.taskId+' while preserving parent lifecycle separation and all canonical gate obligations.',
    observableOutcomes:[
      'The exact files and operations authorized by release unit '+manifest.releaseUnitId+' are the only material changes present in the child PR.',
      'All canonical child gate obligations pass on the exact materialized PR head before any merge receipt can be accepted.',
      'Child Truth and Lifecycle evidence remain bound to '+manifest.releaseUnitId+' and cannot close parent transaction '+(manifest.transaction?.parentTransactionId??parentPlan.taskId)+'.'
    ],
    unresolvedRisks:[
      'Repository or authority drift after predecessor merge can invalidate this child projection and must fail closed during fresh successor reconciliation.',
      'Mutable PR metadata is not authority; CI context must remain cryptographically bound to the exact materialized commit and child plan digest.',
      'A merge strategy may change resulting main identity, so successor base remains the explicit merged-main receipt rather than the PR source head.'
    ],
    semanticExecutionRoute:structuredClone(semanticExecutionRoute),
    executionAuthorized:true,
  };
  childPlan.completionContract={
    sourceKind:'product-owner-request',
    sourceRef,
    systemObligations:{derivation:'release-unit-manifest',requiredGuards:[...(manifest.requiredGates??[])],externalGuards:[...(manifest.requiredEvidence?.externalGateIds??[])],phase:'EXECUTE'},
    requirements:[
      {
        id:'REQ-RELEASE-UNIT-TRANSACTION-INTEGRITY',
        requirement:'Release unit '+manifest.releaseUnitId+' must implement only its manifest-authorized scope and pass exact-head child transaction verification without parent lifecycle conflation.',
        claimScope:{capability:'CAP-QUALITY',breadth:'release-unit-transaction-integrity',strength:2,dimensions:['scope','positive-state','forbidden-state','lifecycle','actual-subset-plan','required-subset-actual']},
        requiredCapabilities:['CAP-QUALITY'],
        evidence:{implementation:['GUARD-EDIT-TIME'],outcome:['GUARD-QUALITY-TESTS']},
        forbiddenRegressions:[{id:'NEG-RELEASE-UNIT-SCOPE-WIDEN',statement:'The child PR must not contain material changes outside the release-unit manifest scope or accept foreign parent or unit lifecycle evidence.',evidence:['GUARD-QUALITY-TESTS']}],
      },
      {
        id:'REQ-RELEASE-UNIT-RISK-INTEGRITY',
        requirement:'Release unit '+manifest.releaseUnitId+' must remain within the unchanged canonical Release Risk Budget on its exact target-base transaction.',
        claimScope:{capability:'CAP-RELEASE',breadth:'release-unit-risk-integrity',strength:2,dimensions:['risk','release-scope']},
        requiredCapabilities:['CAP-RELEASE'],
        evidence:{implementation:['GUARD-RELEASE-RISK'],outcome:['GUARD-RELEASE-RISK']},
        forbiddenRegressions:[{id:'NEG-RELEASE-UNIT-RISK-BYPASS',statement:'No child transaction may reinterpret a canonical Release Risk BLOCK as executable.',evidence:['GUARD-RELEASE-RISK']}],
      }
    ],
  };
  childPlan.releaseUnitContext={
    contract:RELEASE_UNIT_CHILD_TRANSACTION_CONTRACT,
    parentTransactionId:manifest.transaction?.parentTransactionId??parentPlan.taskId,
    releaseUnitId:manifest.releaseUnitId,
    order:manifest.order,
    targetBaseSha:manifest.targetBaseSha,
    planAuthority:'release-unit-manifest#childDevelopmentTransaction',
  };
  const planDigest=releaseUnitChildPlanDigest(childPlan);
  const next=structuredClone(manifest);
  next.childDevelopmentTransaction={contract:RELEASE_UNIT_CHILD_TRANSACTION_CONTRACT,taskId,planDigest,operationDigest:null,bindingDigest:null,plan:childPlan};
  return refreshReleaseUnitIdentity(next);
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
  for(let index=0;index<releaseUnits.length;index+=1)releaseUnits[index]=refreshReleaseUnitIdentity(releaseUnits[index]);
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
  if(next.childDevelopmentTransaction?.plan){
    next.childDevelopmentTransaction.plan.changeBaseSha=newBaseSha;
    next.childDevelopmentTransaction.plan.releaseUnitContext={...(next.childDevelopmentTransaction.plan.releaseUnitContext??{}),targetBaseSha:newBaseSha};
    next.childDevelopmentTransaction.planDigest=releaseUnitChildPlanDigest(next.childDevelopmentTransaction.plan);
  }
  return refreshReleaseUnitIdentity(next);
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
  return refreshReleaseUnitIdentity(sealed);
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
    if(tree===baseTree)return{contract:'shoporation.release-unit-materialization.v1',status:'ALREADY_APPLIED',releaseUnitId:sealed.releaseUnitId,targetBaseSha:sealed.targetBaseSha,commitSha:null,materializedHeadSha:sealed.targetBaseSha,manifestDigest:sealed.manifestDigest,bindingDigest:sealed.childDevelopmentTransaction?.bindingDigest??null,sourceCommit:sealed.sourceIdentity.sourceCommit,applied,alreadyApplied};
    const commitMessage=message??`Materialize ${sealed.releaseUnitId}`;
    const commit=git(cwd,['commit-tree',tree,'-p',sealed.targetBaseSha,'-m',commitMessage]);
    if(updateRef)git(cwd,['update-ref',targetRef,commit,sealed.targetBaseSha]);
    return{contract:'shoporation.release-unit-materialization.v1',status:updateRef?'APPLIED':'PREPARED',releaseUnitId:sealed.releaseUnitId,targetBaseSha:sealed.targetBaseSha,commitSha:commit,materializedHeadSha:commit,treeSha:tree,manifestDigest:sealed.manifestDigest,bindingDigest:sealed.childDevelopmentTransaction?.bindingDigest??null,sourceCommit:sealed.sourceIdentity.sourceCommit,applied,alreadyApplied};
  }finally{rmSync(temp,{recursive:true,force:true});}
}


export const RELEASE_UNIT_EXECUTION_CONTRACT='shoporation.release-unit-execution.v1';
export const RELEASE_PARENT_EXECUTION_CONTRACT='shoporation.release-parent-execution.v1';
export const RELEASE_UNIT_EXECUTION_STATES=Object.freeze(['PLANNED','BLOCKED','READY','MATERIALIZED','PR_OPEN','VERIFIED','MERGED','STALE','FAILED','CLOSED']);

const executionClone=value=>structuredClone(value);
const sameJson=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const requiredText=(value,code)=>{const normalized=String(value??'').trim();if(!normalized)throw new Error(code);return normalized;};
const executionError=(code,details={})=>{const error=new Error(code);error.code=code;error.details=details;throw error;};
const sortedObjects=(items=[])=>[...items].map(item=>executionClone(item)).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
const normalizedEvidence=value=>({
  gateIds:uniq(value?.gateIds??[]),
  proofFiles:uniq(value?.proofFiles??[]),
  externalGateIds:uniq(value?.externalGateIds??[]),
});
const normalizedExecutionObligations=manifest=>({
  releaseUnitId:manifest?.releaseUnitId??null,
  parentTransactionId:manifest?.transaction?.parentTransactionId??manifest?.transaction?.id??null,
  order:Number(manifest?.order??0),
  intendedFiles:uniq(manifest?.intendedFiles??[]),
  operations:sortedObjects(manifest?.operations??[]),
  requiredDependencyFiles:uniq(manifest?.requiredDependencyFiles??[]),
  authorities:uniq(manifest?.authorities??[]),
  subsystems:uniq(manifest?.subsystems??[]),
  requiredGates:uniq(manifest?.requiredGates??[]),
  requiredEvidence:normalizedEvidence(manifest?.requiredEvidence),
  forbiddenPaths:uniq(manifest?.forbiddenPaths??[]),
  readOnlyPaths:uniq(manifest?.readOnlyPaths??[]),
  generatedArtifactSemantics:sortedObjects(manifest?.generatedArtifactSemantics??[]),
  childPlanDigest:manifest?.childDevelopmentTransaction?.planDigest??null,
  childOperationDigest:manifest?.childDevelopmentTransaction?.operationDigest??null,
  predecessorUnits:uniq(manifest?.predecessorUnits??[]),
  projectedRiskDecision:manifest?.projectedRisk?.decision??null,
});
const obligationDrift=(before,after)=>{
  const a=normalizedExecutionObligations(before),b=normalizedExecutionObligations(after);
  return Object.keys(a).filter(key=>!sameJson(a[key],b[key])).map(key=>({field:key,before:a[key],after:b[key]}));
};
const unitBlock=(execution,state,code,details={})=>({
  ...executionClone(execution),
  state,
  blocker:{code,details},
  lastTransition:{to:state,code},
});

export function projectReleaseUnitTransaction(manifest){
  if(manifest?.contract!==RELEASE_UNIT_MANIFEST_CONTRACT)executionError('RELEASE_UNIT_MANIFEST_CONTRACT_INVALID');
  const releaseUnitId=requiredText(manifest.releaseUnitId,'RELEASE_UNIT_ID_REQUIRED');
  return{
    contract:'shoporation.release-unit-transaction-projection.v1',
    releaseUnitId,
    parentTransactionId:manifest.transaction?.parentTransactionId??manifest.transaction?.id??null,
    branchRef:'release-unit/'+releaseUnitId.toLowerCase().replace(/[^a-z0-9._/-]+/g,'-'),
    changeBaseSha:manifest.targetBaseSha??null,
    manifestDigest:manifest.manifestDigest??null,
    plannedFilePatterns:uniq(manifest.intendedFiles??[]),
    operations:executionClone(manifest.operations??[]),
    authorities:uniq(manifest.authorities??[]),
    subsystems:uniq(manifest.subsystems??[]),
    requiredGates:uniq(manifest.requiredGates??[]),
    requiredEvidence:normalizedEvidence(manifest.requiredEvidence),
    forbiddenPaths:uniq(manifest.forbiddenPaths??[]),
    readOnlyPaths:uniq(manifest.readOnlyPaths??[]),
    sourceIdentity:executionClone(manifest.sourceIdentity??null),
    childTaskId:manifest.childDevelopmentTransaction?.taskId??null,
    childPlanDigest:manifest.childDevelopmentTransaction?.planDigest??null,
    bindingDigest:manifest.childDevelopmentTransaction?.bindingDigest??null,
  };
}

export function createReleaseUnitExecution(manifest){
  if(manifest?.contract!==RELEASE_UNIT_MANIFEST_CONTRACT)executionError('RELEASE_UNIT_MANIFEST_CONTRACT_INVALID');
  if(manifest.decision!=='PASS')executionError('RELEASE_UNIT_MANIFEST_NOT_PASS');
  requiredText(manifest.releaseUnitId,'RELEASE_UNIT_ID_REQUIRED');
  requiredText(manifest.manifestDigest,'RELEASE_UNIT_MANIFEST_DIGEST_REQUIRED');
  return{
    contract:RELEASE_UNIT_EXECUTION_CONTRACT,
    releaseUnitId:manifest.releaseUnitId,
    parentTransactionId:manifest.transaction?.parentTransactionId??manifest.transaction?.id??null,
    order:Number(manifest.order??0),
    state:'PLANNED',
    manifest:executionClone(manifest),
    executionTransaction:projectReleaseUnitTransaction(manifest),
    authorization:null,
    materialization:null,
    pullRequest:null,
    verification:null,
    merge:null,
    closeReceipt:null,
    blocker:null,
    lastTransition:{to:'PLANNED',code:'RELEASE_UNIT_PLANNED'},
  };
}

export function createReleaseParentExecution(decomposition){
  if(decomposition?.contract!==RELEASE_DECOMPOSITION_CONTRACT)executionError('RELEASE_DECOMPOSITION_CONTRACT_INVALID');
  if(decomposition.decision!=='PASS')executionError('RELEASE_DECOMPOSITION_NOT_PASS');
  const manifests=[...(decomposition.releaseUnits??[])].sort((a,b)=>Number(a.order)-Number(b.order));
  if(!manifests.length)executionError('RELEASE_PARENT_UNITS_REQUIRED');
  const ordering=validateReleaseUnitOrder(manifests);
  if(ordering.decision!=='PASS')executionError('RELEASE_PARENT_UNIT_ORDER_INVALID',{ordering});
  const units=manifests.map(createReleaseUnitExecution);
  const parentTransactionId=units[0].parentTransactionId;
  if(!parentTransactionId||units.some(unit=>unit.parentTransactionId!==parentTransactionId))executionError('RELEASE_PARENT_TRANSACTION_ID_DRIFT');
  return{
    contract:RELEASE_PARENT_EXECUTION_CONTRACT,
    parentTransactionId,
    decompositionContract:decomposition.contract,
    manifestChainDigest:digest(manifests.map(item=>({id:item.releaseUnitId,digest:item.manifestDigest,order:item.order}))),
    lifecyclePhase:'EXECUTE',
    unitIds:units.map(unit=>unit.releaseUnitId),
    activeUnitId:units[0].releaseUnitId,
    units,
    blocker:null,
    closureEligible:false,
    closureComplete:false,
    closedReceipt:null,
  };
}

const unitById=(parent,id)=>{
  if(parent?.contract!==RELEASE_PARENT_EXECUTION_CONTRACT)executionError('RELEASE_PARENT_EXECUTION_CONTRACT_INVALID');
  const unit=(parent.units??[]).find(item=>item.releaseUnitId===id);
  if(!unit)executionError('RELEASE_PARENT_UNIT_UNKNOWN',{releaseUnitId:id});
  return unit;
};

export function synchronizeReleaseParentExecution(parent,nextUnit){
  const next=executionClone(parent);
  const index=(next.units??[]).findIndex(item=>item.releaseUnitId===nextUnit?.releaseUnitId);
  if(index<0)executionError('RELEASE_PARENT_UNIT_UNKNOWN',{releaseUnitId:nextUnit?.releaseUnitId});
  next.units[index]=executionClone(nextUnit);
  const terminalBlock=next.units.find(item=>['BLOCKED','STALE','FAILED'].includes(item.state));
  const firstOpen=next.units.find(item=>item.state!=='CLOSED');
  next.activeUnitId=firstOpen?.releaseUnitId??null;
  next.blocker=terminalBlock?{releaseUnitId:terminalBlock.releaseUnitId,...executionClone(terminalBlock.blocker)}:null;
  next.closureEligible=next.units.length>0&&next.units.every(item=>item.state==='CLOSED');
  next.lifecyclePhase=next.closureEligible?'TRUTH_GATE':'EXECUTE';
  if(!next.closureEligible)next.closureComplete=false;
  return next;
}

function predecessorResult(execution,{currentMainSha,predecessorExecutions=[]}={}){
  const required=uniq(execution.manifest?.predecessorUnits??[]);
  if(!required.length)return{decision:'PASS',sequence:null};
  const byId=new Map((predecessorExecutions??[]).map(item=>[item.releaseUnitId,item]));
  for(const id of required){
    const predecessor=byId.get(id);
    if(!predecessor)return{decision:'BLOCK',code:'RELEASE_UNIT_PREDECESSOR_RECEIPT_MISSING',details:{predecessor:id}};
    if(predecessor.state!=='CLOSED')return{decision:'BLOCK',code:'RELEASE_UNIT_PREDECESSOR_NOT_CLOSED',details:{predecessor:id,state:predecessor.state}};
    if(!predecessor.merge?.mergedMainSha||!predecessor.merge?.sourceHeadSha)return{decision:'BLOCK',code:'RELEASE_UNIT_PREDECESSOR_MERGE_RECEIPT_MISSING',details:{predecessor:id}};
    if(predecessor.verification?.truthStatus!=='VERIFIED'||predecessor.verification?.lifecycleState!=='LEARN')return{decision:'BLOCK',code:'RELEASE_UNIT_PREDECESSOR_PROOF_INCOMPLETE',details:{predecessor:id}};
  }
  const sequence=[...byId.values()].find(item=>required.includes(item.releaseUnitId)&&Number(item.order)===Number(execution.order)-1)??null;
  if(!sequence)return{decision:'BLOCK',code:'RELEASE_UNIT_SEQUENCE_PREDECESSOR_MISSING',details:{order:execution.order}};
  if(sequence.merge.mergedMainSha!==currentMainSha)return{decision:'STALE',code:'RELEASE_UNIT_MAIN_DRIFT',details:{expected:sequence.merge.mergedMainSha,actual:currentMainSha}};
  return{decision:'PASS',sequence};
}

export function reconcileSuccessorReleaseUnit({execution,freshManifest,currentMainSha,predecessorExecutions=[],allFreshManifests=[]}={}){
  if(execution?.contract!==RELEASE_UNIT_EXECUTION_CONTRACT)executionError('RELEASE_UNIT_EXECUTION_CONTRACT_INVALID');
  if(execution.state!=='PLANNED')executionError('RELEASE_UNIT_RECONCILIATION_STATE_INVALID',{state:execution.state});
  if(freshManifest?.contract!==RELEASE_UNIT_MANIFEST_CONTRACT)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_MANIFEST_REQUIRED',details:{}};
  if(freshManifest.releaseUnitId!==execution.releaseUnitId)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_MANIFEST_IDENTITY_MISMATCH',details:{expected:execution.releaseUnitId,actual:freshManifest.releaseUnitId}};
  if((freshManifest.transaction?.parentTransactionId??freshManifest.transaction?.id)!==execution.parentTransactionId)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_PARENT_IDENTITY_MISMATCH',details:{}};
  if(freshManifest.decision!=='PASS')return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_MANIFEST_NOT_PASS',details:{decision:freshManifest.decision,reason:freshManifest.reason??null}};
  if(freshManifest.projectedRisk?.decision!=='PASS')return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_RISK_BLOCK',details:{risk:freshManifest.projectedRisk??null}};
  if(!currentMainSha||freshManifest.targetBaseSha!==currentMainSha||freshManifest.lease?.expectedBaseSha!==currentMainSha)return{decision:'STALE',state:'STALE',code:'RELEASE_UNIT_FRESH_BASE_STALE',details:{currentMainSha,targetBaseSha:freshManifest.targetBaseSha,lease:freshManifest.lease??null}};
  const predecessor=predecessorResult(execution,{currentMainSha,predecessorExecutions});
  if(predecessor.decision!=='PASS')return{decision:predecessor.decision,state:predecessor.decision==='STALE'?'STALE':'BLOCKED',code:predecessor.code,details:predecessor.details};
  if((execution.manifest?.predecessorUnits??[]).length&&freshManifest.lease?.reconciled!==true)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_RECONCILIATION_REQUIRED',details:{lease:freshManifest.lease??null}};
  const blocked=forbiddenHits(freshManifest.operations??[],freshManifest.forbiddenPaths??[],freshManifest.readOnlyPaths??[]);
  if(blocked.length)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_FORBIDDEN_SCOPE',details:{blocked}};
  const manifests=allFreshManifests?.length?allFreshManifests:[freshManifest];
  if(manifests.length>1){
    const ordering=validateReleaseUnitOrder(manifests);
    if(ordering.decision!=='PASS')return{decision:'FAIL',state:'FAILED',code:'RELEASE_UNIT_RECONCILIATION_CYCLE',details:{ordering}};
  }
  const drift=obligationDrift(execution.manifest,freshManifest);
  if(drift.length)return{decision:'STALE',state:'STALE',code:'RELEASE_UNIT_EXECUTION_OBLIGATION_DRIFT',details:{drift}};
  return{decision:'PASS',state:'READY',code:'RELEASE_UNIT_RECONCILED',details:{currentMainSha},manifest:executionClone(freshManifest)};
}

export function authorizeReleaseUnit(execution,context={}){
  const result=reconcileSuccessorReleaseUnit({execution,...context});
  if(result.decision!=='PASS')return unitBlock(execution,result.state,result.code,result.details);
  const next=executionClone(execution);
  next.manifest=result.manifest;
  next.executionTransaction=projectReleaseUnitTransaction(result.manifest);
  next.state='READY';
  next.authorization={
    manifestDigest:result.manifest.manifestDigest,
    targetBaseSha:result.manifest.targetBaseSha,
    currentMainSha:context.currentMainSha,
    predecessorUnitIds:uniq(result.manifest.predecessorUnits??[]),
  };
  next.blocker=null;
  next.lastTransition={to:'READY',code:'RELEASE_UNIT_AUTHORIZED'};
  return next;
}

export function recordReleaseUnitMaterialization(execution,receipt){
  if(execution?.contract!==RELEASE_UNIT_EXECUTION_CONTRACT)executionError('RELEASE_UNIT_EXECUTION_CONTRACT_INVALID');
  if(execution.state==='MATERIALIZED'){
    if(sameJson(execution.materialization,receipt))return executionClone(execution);
    executionError('RELEASE_UNIT_MATERIALIZATION_CONFLICT');
  }
  if(execution.state!=='READY')executionError('RELEASE_UNIT_MATERIALIZATION_STATE_INVALID',{state:execution.state});
  if(receipt?.contract!=='shoporation.release-unit-materialization.v1')executionError('RELEASE_UNIT_MATERIALIZATION_RECEIPT_INVALID');
  if(receipt.releaseUnitId!==execution.releaseUnitId)executionError('RELEASE_UNIT_MATERIALIZATION_UNIT_MISMATCH');
  if(receipt.targetBaseSha!==execution.manifest.targetBaseSha)executionError('RELEASE_UNIT_MATERIALIZATION_BASE_MISMATCH');
  if(receipt.manifestDigest!==execution.manifest.manifestDigest)executionError('RELEASE_UNIT_MATERIALIZATION_MANIFEST_MISMATCH');
  if(execution.manifest.childDevelopmentTransaction?.bindingDigest&&receipt.bindingDigest!==execution.manifest.childDevelopmentTransaction.bindingDigest)executionError('RELEASE_UNIT_MATERIALIZATION_BINDING_MISMATCH');
  if(!['PREPARED','APPLIED','ALREADY_APPLIED'].includes(receipt.status))executionError('RELEASE_UNIT_MATERIALIZATION_STATUS_INVALID');
  const materializedHeadSha=receipt.materializedHeadSha??receipt.commitSha??(receipt.status==='ALREADY_APPLIED'?receipt.targetBaseSha:null);
  requiredText(materializedHeadSha,'RELEASE_UNIT_MATERIALIZATION_HEAD_REQUIRED');
  requiredText(receipt.sourceCommit,'RELEASE_UNIT_MATERIALIZATION_SOURCE_REQUIRED');
  const next=executionClone(execution);
  next.state='MATERIALIZED';
  next.materialization={...executionClone(receipt),materializedHeadSha};
  next.lastTransition={to:'MATERIALIZED',code:'RELEASE_UNIT_MATERIALIZED'};
  return next;
}

export function recordReleaseUnitPullRequest(execution,receipt){
  if(execution.state!=='MATERIALIZED')executionError('RELEASE_UNIT_PR_STATE_INVALID',{state:execution.state});
  if(!Number.isInteger(Number(receipt?.number))||Number(receipt.number)<1)executionError('RELEASE_UNIT_PR_NUMBER_REQUIRED');
  if(receipt.headSha!==execution.materialization.materializedHeadSha)executionError('RELEASE_UNIT_PR_HEAD_MISMATCH',{expected:execution.materialization.materializedHeadSha,actual:receipt.headSha});
  if(receipt.baseSha!==execution.manifest.targetBaseSha)executionError('RELEASE_UNIT_PR_BASE_MISMATCH');
  if(receipt.manifestDigest!==execution.manifest.manifestDigest)executionError('RELEASE_UNIT_PR_MANIFEST_MISMATCH');
  if(execution.manifest.childDevelopmentTransaction?.bindingDigest&&receipt.bindingDigest!==execution.manifest.childDevelopmentTransaction.bindingDigest)executionError('RELEASE_UNIT_PR_BINDING_MISMATCH');
  if(receipt.sourceCommit!==execution.materialization.sourceCommit)executionError('RELEASE_UNIT_PR_SOURCE_IDENTITY_MISMATCH');
  const next=executionClone(execution);
  next.state='PR_OPEN';
  next.pullRequest=executionClone(receipt);
  next.lastTransition={to:'PR_OPEN',code:'RELEASE_UNIT_PR_OPEN'};
  return next;
}

export function recordReleaseUnitVerification(execution,{truth,lifecyclePlan}={}){
  if(execution.state!=='PR_OPEN')executionError('RELEASE_UNIT_VERIFICATION_STATE_INVALID',{state:execution.state});
  const head=execution.pullRequest.headSha;
  const child=execution.manifest?.childDevelopmentTransaction;
  if(!child?.taskId||!child?.planDigest||!child?.bindingDigest)executionError('RELEASE_UNIT_CHILD_TRANSACTION_REQUIRED');
  if(truth?.taskId!==child.taskId)executionError('RELEASE_UNIT_TRUTH_TASK_MISMATCH',{expected:child.taskId,actual:truth?.taskId??null});
  const truthContext=truth?.releaseUnitContext??{};
  if(truthContext.parentTransactionId!==execution.parentTransactionId||truthContext.releaseUnitId!==execution.releaseUnitId||truthContext.manifestDigest!==execution.manifest.manifestDigest||truthContext.childPlanDigest!==child.planDigest||truthContext.bindingDigest!==child.bindingDigest)executionError('RELEASE_UNIT_TRUTH_CONTEXT_MISMATCH');
  if(truth?.decision!=='PASS'||truth?.truthStatus!=='VERIFIED'||truth?.internalState!=='VERIFIED_DONE')executionError('RELEASE_UNIT_TRUTH_NOT_VERIFIED',{truthStatus:truth?.truthStatus,internalState:truth?.internalState});
  if(truth.currentExactState?.head!==head)executionError('RELEASE_UNIT_TRUTH_HEAD_MISMATCH',{expected:head,actual:truth.currentExactState?.head});
  if(lifecyclePlan?.status!=='closed'||lifecyclePlan?.lifecycle?.state!=='LEARN'||lifecyclePlan?.lifecycle?.truthStatus!=='VERIFIED')executionError('RELEASE_UNIT_LIFECYCLE_NOT_CLOSED');
  if(lifecyclePlan.taskId!==child.taskId)executionError('RELEASE_UNIT_LIFECYCLE_TASK_MISMATCH');
  const lifecycleContext=lifecyclePlan.releaseUnitContext??{};
  if(lifecycleContext.parentTransactionId!==execution.parentTransactionId||lifecycleContext.releaseUnitId!==execution.releaseUnitId||lifecycleContext.manifestDigest!==execution.manifest.manifestDigest||lifecycleContext.childPlanDigest!==child.planDigest||lifecycleContext.bindingDigest!==child.bindingDigest)executionError('RELEASE_UNIT_LIFECYCLE_CONTEXT_MISMATCH');
  if(lifecyclePlan.lifecycle.verifiedImplementationHead!==head)executionError('RELEASE_UNIT_LIFECYCLE_HEAD_MISMATCH',{expected:head,actual:lifecyclePlan.lifecycle.verifiedImplementationHead});
  const next=executionClone(execution);
  next.state='VERIFIED';
  next.verification={
    sourceHeadSha:head,
    truthContract:truth.contract??null,
    truthStatus:truth.truthStatus,
    internalState:truth.internalState,
    lifecycleState:lifecyclePlan.lifecycle.state,
    lifecycleTruthStatus:lifecyclePlan.lifecycle.truthStatus,
    verifiedImplementationHead:lifecyclePlan.lifecycle.verifiedImplementationHead,
    childTaskId:child.taskId,
    childPlanDigest:child.planDigest,
    bindingDigest:child.bindingDigest,
  };
  next.lastTransition={to:'VERIFIED',code:'RELEASE_UNIT_EXACT_HEAD_VERIFIED'};
  return next;
}

export function recordReleaseUnitMerge(execution,receipt){
  if(execution.state!=='VERIFIED')executionError('RELEASE_UNIT_MERGE_STATE_INVALID',{state:execution.state});
  if(receipt?.sourceHeadSha!==execution.verification.sourceHeadSha)executionError('RELEASE_UNIT_MERGE_SOURCE_HEAD_MISMATCH');
  if(Number(receipt?.prNumber)!==Number(execution.pullRequest?.number))executionError('RELEASE_UNIT_MERGE_PR_MISMATCH');
  requiredText(receipt?.mergedMainSha,'RELEASE_UNIT_MERGED_MAIN_SHA_REQUIRED');
  if(!['merge','squash','rebase'].includes(String(receipt?.mergeMethod??'')))executionError('RELEASE_UNIT_MERGE_METHOD_INVALID');
  const next=executionClone(execution);
  next.state='MERGED';
  next.merge=executionClone(receipt);
  next.lastTransition={to:'MERGED',code:'RELEASE_UNIT_MERGED'};
  return next;
}

export function closeReleaseUnitExecution(execution,{currentMainSha}={}){
  if(execution.state!=='MERGED')executionError('RELEASE_UNIT_CLOSE_STATE_INVALID',{state:execution.state});
  if(!currentMainSha||currentMainSha!==execution.merge.mergedMainSha)executionError('RELEASE_UNIT_POST_MERGE_MAIN_DRIFT',{expected:execution.merge.mergedMainSha,actual:currentMainSha??null});
  const next=executionClone(execution);
  next.state='CLOSED';
  next.closeReceipt={
    contract:'shoporation.release-unit-close-receipt.v1',
    releaseUnitId:execution.releaseUnitId,
    sourceHeadSha:execution.merge.sourceHeadSha,
    mergedMainSha:execution.merge.mergedMainSha,
    manifestDigest:execution.manifest.manifestDigest,
    truthStatus:execution.verification.truthStatus,
    lifecycleState:execution.verification.lifecycleState,
    childTaskId:execution.verification.childTaskId,
    childPlanDigest:execution.verification.childPlanDigest,
    bindingDigest:execution.verification.bindingDigest,
    decision:'PASS',
  };
  next.lastTransition={to:'CLOSED',code:'RELEASE_UNIT_CLOSED'};
  return next;
}

export function failReleaseUnitExecution(execution,{code='RELEASE_UNIT_EXECUTION_FAILED',details={}}={}){
  if(execution.state==='CLOSED')executionError('RELEASE_UNIT_CLOSED_CANNOT_FAIL');
  return unitBlock(execution,'FAILED',code,details);
}

export function authorizeParentReleaseUnit(parent,releaseUnitId,context={}){
  if(parent.activeUnitId!==releaseUnitId)executionError('RELEASE_PARENT_UNIT_SKIP_FORBIDDEN',{activeUnitId:parent.activeUnitId,requested:releaseUnitId});
  const current=unitById(parent,releaseUnitId);
  const predecessors=(parent.units??[]).filter(item=>(current.manifest.predecessorUnits??[]).includes(item.releaseUnitId));
  const nextUnit=authorizeReleaseUnit(current,{...context,predecessorExecutions:context.predecessorExecutions??predecessors});
  return synchronizeReleaseParentExecution(parent,nextUnit);
}

export function applyReleaseUnitEvent(parent,event){
  const releaseUnitId=requiredText(event?.releaseUnitId,'RELEASE_UNIT_EVENT_UNIT_REQUIRED');
  if(event.type==='AUTHORIZE')return authorizeParentReleaseUnit(parent,releaseUnitId,event);
  const current=unitById(parent,releaseUnitId);
  if(parent.activeUnitId!==releaseUnitId)executionError('RELEASE_PARENT_UNIT_SKIP_FORBIDDEN',{activeUnitId:parent.activeUnitId,requested:releaseUnitId});
  let nextUnit;
  if(event.type==='MATERIALIZED')nextUnit=recordReleaseUnitMaterialization(current,event.receipt);
  else if(event.type==='PR_OPEN')nextUnit=recordReleaseUnitPullRequest(current,event.receipt);
  else if(event.type==='VERIFIED')nextUnit=recordReleaseUnitVerification(current,{truth:event.truth,lifecyclePlan:event.lifecyclePlan});
  else if(event.type==='MERGED')nextUnit=recordReleaseUnitMerge(current,event.receipt);
  else if(event.type==='CLOSED')nextUnit=closeReleaseUnitExecution(current,{currentMainSha:event.currentMainSha});
  else if(event.type==='FAILED')nextUnit=failReleaseUnitExecution(current,{code:event.code,details:event.details});
  else executionError('RELEASE_UNIT_EVENT_TYPE_INVALID',{type:event.type});
  return synchronizeReleaseParentExecution(parent,nextUnit);
}

export function recordReleaseParentClosure(parent,{truth,lifecyclePlan,currentMainSha}={}){
  if(parent?.contract!==RELEASE_PARENT_EXECUTION_CONTRACT)executionError('RELEASE_PARENT_EXECUTION_CONTRACT_INVALID');
  if(!parent.closureEligible||parent.activeUnitId!==null||!parent.units?.every(item=>item.state==='CLOSED'))executionError('RELEASE_PARENT_NOT_CLOSURE_ELIGIBLE');
  const last=[...parent.units].sort((a,b)=>a.order-b.order).at(-1);
  const exact=currentMainSha??last?.merge?.mergedMainSha;
  if(!exact||last?.merge?.mergedMainSha!==exact)executionError('RELEASE_PARENT_FINAL_MAIN_MISMATCH');
  if(truth?.decision!=='PASS'||truth?.truthStatus!=='VERIFIED'||truth?.internalState!=='VERIFIED_DONE'||truth?.currentExactState?.head!==exact)executionError('RELEASE_PARENT_TRUTH_NOT_VERIFIED');
  if(lifecyclePlan?.status!=='closed'||lifecyclePlan?.lifecycle?.state!=='LEARN'||lifecyclePlan?.lifecycle?.truthStatus!=='VERIFIED'||lifecyclePlan?.lifecycle?.verifiedImplementationHead!==exact)executionError('RELEASE_PARENT_LIFECYCLE_NOT_CLOSED');
  if(truth.taskId&&truth.taskId!==parent.parentTransactionId)executionError('RELEASE_PARENT_TRUTH_TASK_MISMATCH');
  const next=executionClone(parent);
  next.lifecyclePhase='LEARN';
  next.closureComplete=true;
  next.closedReceipt={
    contract:'shoporation.release-parent-close-receipt.v1',
    parentTransactionId:parent.parentTransactionId,
    finalMainSha:exact,
    truthStatus:truth.truthStatus,
    lifecycleState:lifecyclePlan.lifecycle.state,
    unitCloseReceiptDigests:next.units.map(item=>digest(item.closeReceipt)),
    decision:'PASS',
  };
  return next;
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
