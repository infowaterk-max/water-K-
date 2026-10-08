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
export const RELEASE_UNIT_MAIN_ADVANCE_PROOF_CONTRACT='shoporation.release-unit-main-advance-proof.v1';
export const RELEASE_PARENT_MAIN_ADVANCE_PROOF_CONTRACT='shoporation.release-parent-main-advance-proof.v1';
export const RELEASE_PARENT_CLOSURE_PROOF_PLAN_CONTRACT='shoporation.release-parent-closure-proof-plan.v1';
export const RELEASE_PARENT_CLOSURE_CONTEXT_CONTRACT='shoporation.release-parent-closure-proof-context.v1';
export const RELEASE_PARENT_CLOSURE_PROOF_ARTIFACT_CONTRACT='shoporation.release-parent-closure-proof-artifact.v1';
export const RELEASE_UNIT_CONFLICT_RESOLUTION_CONTRACT='shoporation.release-unit-conflict-resolution.v1';

const uniq=values=>[...new Set((values??[]).filter(Boolean))].sort();
const operationPaths=operation=>uniq([operation.file,operation.previousFile]);
const isTestFile=file=>/^tests\//.test(file)||/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
const fileForOperation=operation=>operation.file;
const normalizeRename=item=>typeof item==='string'?null:{from:String(item?.from??item?.previousFile??'').trim(),to:String(item?.to??item?.file??'').trim()};
const generatedByPath=items=>new Map((items??[]).filter(item=>item?.path).map(item=>[item.path,item]));

export function derivePlannedOperations({projectedFiles=[],atlas,plannedDeletions=[],plannedRenames=[],generatedArtifacts=[],transactionChanges=[]}={}){
  const existing=new Set((atlas?.nodes??[]).map(node=>node.path));
  const deletions=new Set(plannedDeletions??[]);
  const generated=generatedByPath(generatedArtifacts);
  const transactionByFile=new Map((transactionChanges??[]).filter(change=>change?.file).map(change=>[change.file,change]));
  const declaredRenames=(plannedRenames??[]).map(normalizeRename).filter(item=>item?.from&&item?.to);
  const transactionRenames=(transactionChanges??[])
    .filter(change=>change?.status==='R'&&change?.previousFile&&change?.file)
    .map(change=>({from:String(change.previousFile),to:String(change.file)}));
  const renames=[...new Map([...declaredRenames,...transactionRenames].map(item=>[`${item.from}->${item.to}`,item])).values()];
  const renamedFrom=new Set(renames.map(item=>item.from)),renamedTo=new Set(renames.map(item=>item.to));
  const operations=[];
  for(const rename of renames){
    operations.push({operation:'rename',previousFile:rename.from,file:rename.to,generated:generated.get(rename.to)??null});
  }
  for(const file of uniq([...projectedFiles,...deletions])){
    if(renamedFrom.has(file)||renamedTo.has(file))continue;
    const transaction=transactionByFile.get(file);
    if(deletions.has(file)||transaction?.status==='D'){operations.push({operation:'delete',file});continue;}
    const operation=transaction?.status==='A'||transaction?.status==='C'
      ?'create'
      :transaction?.status==='M'
        ?'modify'
        :existing.has(file)?'modify':'create';
    operations.push({operation,file,generated:generated.get(file)??null});
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
export const RELEASE_UNIT_CI_CONTEXT_CONTRACT='shoporation.release-unit-ci-context.v1';
const RELEASE_UNIT_CI_CONTEXT_PREFIX='<!-- shoperation-release-unit-context:v1:';
const RELEASE_UNIT_CI_CONTEXT_SUFFIX=' -->';
const releaseUnitText=value=>String(value??'').trim();
export function encodeReleaseUnitContextEnvelope(envelope){return RELEASE_UNIT_CI_CONTEXT_PREFIX+Buffer.from(JSON.stringify(envelope)).toString('base64url')+RELEASE_UNIT_CI_CONTEXT_SUFFIX;}
export function decodeReleaseUnitContextEnvelope(body){
  const source=String(body??''),start=source.indexOf(RELEASE_UNIT_CI_CONTEXT_PREFIX);if(start<0)return null;
  const end=source.indexOf(RELEASE_UNIT_CI_CONTEXT_SUFFIX,start+RELEASE_UNIT_CI_CONTEXT_PREFIX.length);if(end<0)throw new Error('RELEASE_UNIT_CI_CONTEXT_MARKER_MALFORMED');
  return JSON.parse(Buffer.from(source.slice(start+RELEASE_UNIT_CI_CONTEXT_PREFIX.length,end).trim(),'base64url').toString('utf8'));
}
export function validateReleaseUnitCiContext({envelope,headSha,baseSha,commitMessage}={}){
  if(!envelope)return{decision:'ROOT',plan:null,envelope:null};
  if(envelope.contract!==RELEASE_UNIT_CI_CONTEXT_CONTRACT)throw new Error('RELEASE_UNIT_CI_CONTEXT_CONTRACT_INVALID');
  const plan=envelope.childPlan;if(plan?.releaseUnitContext?.contract!==RELEASE_UNIT_CHILD_TRANSACTION_CONTRACT)throw new Error('RELEASE_UNIT_CI_CHILD_PLAN_REQUIRED');
  const childPlanDigest=releaseUnitChildPlanDigest(plan);if(childPlanDigest!==envelope.childPlanDigest)throw new Error('RELEASE_UNIT_CI_CHILD_PLAN_DIGEST_MISMATCH');
  const bindingDigest=releaseUnitContextBindingDigest({manifestDigest:envelope.manifestDigest,childPlanDigest:envelope.childPlanDigest,operationDigest:envelope.operationDigest,releaseUnitId:envelope.releaseUnitId,parentTransactionId:envelope.parentTransactionId,targetBaseSha:envelope.targetBaseSha});
  if(bindingDigest!==envelope.bindingDigest)throw new Error('RELEASE_UNIT_CI_BINDING_DIGEST_MISMATCH');
  if(releaseUnitText(baseSha)!==releaseUnitText(envelope.targetBaseSha))throw new Error('RELEASE_UNIT_CI_BASE_MISMATCH');
  for(const trailer of ['Shoperation-Release-Unit-Manifest: '+envelope.manifestDigest,'Shoperation-Release-Unit-Child-Plan: '+envelope.childPlanDigest,'Shoperation-Release-Unit-Binding: '+envelope.bindingDigest])if(!String(commitMessage??'').includes(trailer))throw new Error('RELEASE_UNIT_CI_COMMIT_TRAILER_MISMATCH:'+trailer.split(':')[0]);
  const runtimePlan=structuredClone(plan);runtimePlan.releaseUnitContext={...(runtimePlan.releaseUnitContext??{}),manifestDigest:envelope.manifestDigest,childPlanDigest:envelope.childPlanDigest,bindingDigest:envelope.bindingDigest,materializedHeadSha:releaseUnitText(headSha),targetBaseSha:envelope.targetBaseSha};
  if(runtimePlan.taskId!==envelope.childTaskId)throw new Error('RELEASE_UNIT_CI_CHILD_TASK_MISMATCH');
  if(runtimePlan.releaseUnitContext.releaseUnitId!==envelope.releaseUnitId||runtimePlan.releaseUnitContext.parentTransactionId!==envelope.parentTransactionId)throw new Error('RELEASE_UNIT_CI_TRANSACTION_IDENTITY_MISMATCH');
  return{decision:'CHILD',plan:runtimePlan,envelope};
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
export function releaseUnitChildTask(manifest,parentPlan){
  return 'Execute canonical release unit '+manifest.releaseUnitId+' of '+parentPlan.taskId+' without widening the manifest-authorized scope.';
}
export function bindReleaseUnitChildTransaction(manifest,{parentPlan,guardDigest,expectedSubsystems=[],expectedDomains=[],expectedAuthorities=[],expectedKnownFailureIds=[],acknowledgedPoInstructionIds=[],acknowledgedNegativeKnowledgeIds=[],semanticExecutionRoute={}}={}){
  if(manifest?.contract!==RELEASE_UNIT_MANIFEST_CONTRACT)throw new Error('RELEASE_UNIT_MANIFEST_CONTRACT_INVALID');
  if(!parentPlan?.taskId)throw new Error('RELEASE_UNIT_PARENT_PLAN_REQUIRED');
  const taskId=manifest.releaseUnitId+'-TX';
  const sourceRef=parentPlan.completionContract?.sourceRef??parentPlan.operationalIntelligence?.sourceRef??manifest.transaction?.sourceRef??null;
  const childPlan=structuredClone(parentPlan);
  delete childPlan.lifecycle;
  childPlan.taskId=taskId;
  childPlan.task=releaseUnitChildTask(manifest,parentPlan);
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

export const RELEASE_UNIT_CHILD_PLAN_PROJECTION_CONTRACT='shoporation.release-unit-child-plan-projection.v1';

export function reprojectReleaseUnitChildTransaction(manifest,projection){
  if(manifest?.contract!==RELEASE_UNIT_MANIFEST_CONTRACT)throw new Error('RELEASE_UNIT_MANIFEST_CONTRACT_INVALID');
  const child=manifest.childDevelopmentTransaction;
  if(child?.contract!==RELEASE_UNIT_CHILD_TRANSACTION_CONTRACT||!child.plan)throw new Error('RELEASE_UNIT_CHILD_TRANSACTION_REQUIRED');
  if(projection?.contract!==RELEASE_UNIT_CHILD_PLAN_PROJECTION_CONTRACT)throw new Error('RELEASE_UNIT_CHILD_PLAN_PROJECTION_CONTRACT_INVALID');
  if(!String(projection.guardDigest??'').trim())throw new Error('RELEASE_UNIT_CHILD_PLAN_PROJECTION_GUARD_DIGEST_REQUIRED');
  for(const field of ['expectedSubsystems','expectedDomains','expectedAuthorities','expectedKnownFailureIds','acknowledgedPoInstructionIds','acknowledgedNegativeKnowledgeIds','requiredGates','externalGateIds']){
    if(!Array.isArray(projection[field]))throw new Error('RELEASE_UNIT_CHILD_PLAN_PROJECTION_FIELD_REQUIRED:'+field);
  }
  const route=projection.semanticExecutionRoute;
  if(!route||!Array.isArray(route.authority)||!Array.isArray(route.mustEdit)||!Array.isArray(route.mayEdit)||!Array.isArray(route.impactedReadOnly)||!Array.isArray(route.mustCreate)||!Array.isArray(route.forbidden)||!Array.isArray(route.proof)||!Array.isArray(route.unknown)||!Array.isArray(route.plannedDeletions)||!Array.isArray(route.plannedRenames)||!Array.isArray(route.generatedArtifacts)){
    throw new Error('RELEASE_UNIT_CHILD_PLAN_PROJECTION_ROUTE_INVALID');
  }
  const proofFiles=uniq(projection.requiredEvidenceProofFiles??route.proof);
  if(Array.isArray(projection.requiredEvidenceProofFiles)&&JSON.stringify(uniq(route.proof))!==JSON.stringify(proofFiles))throw new Error('RELEASE_UNIT_CHILD_PLAN_PROJECTION_PROOF_DRIFT');
  const next=structuredClone(manifest);
  next.requiredEvidence={...(next.requiredEvidence??{}),proofFiles:[...proofFiles]};
  const plan=structuredClone(next.childDevelopmentTransaction.plan);
  if(plan.releaseUnitContext?.releaseUnitId!==next.releaseUnitId)throw new Error('RELEASE_UNIT_CHILD_PLAN_REPROJECTION_UNIT_MISMATCH');
  const parentTransactionId=next.transaction?.parentTransactionId??next.transaction?.id??null;
  if(plan.releaseUnitContext?.parentTransactionId!==parentTransactionId)throw new Error('RELEASE_UNIT_CHILD_PLAN_REPROJECTION_PARENT_MISMATCH');
  delete plan.lifecycle;
  plan.status='ready-for-implementation';
  plan.changeBaseSha=next.targetBaseSha;
  plan.plannedFilePatterns=[...(next.intendedFiles??[])];
  plan.guardDigest=projection.guardDigest;
  plan.expectedSubsystems=uniq(projection.expectedSubsystems);
  plan.expectedDomains=uniq(projection.expectedDomains);
  plan.expectedAuthorities=uniq(projection.expectedAuthorities);
  plan.expectedKnownFailureIds=uniq(projection.expectedKnownFailureIds);
  plan.acknowledgedPoInstructionIds=uniq(projection.acknowledgedPoInstructionIds);
  plan.acknowledgedNegativeKnowledgeIds=uniq(projection.acknowledgedNegativeKnowledgeIds);
  plan.operationalIntelligence={
    ...structuredClone(plan.operationalIntelligence??{}),
    semanticExecutionRoute:structuredClone(route),
    executionAuthorized:true,
  };
  if(plan.completionContract?.systemObligations){
    plan.completionContract.systemObligations={
      ...plan.completionContract.systemObligations,
      derivation:'release-unit-manifest',
      requiredGuards:uniq(projection.requiredGates),
      externalGuards:uniq(projection.externalGateIds),
      phase:'EXECUTE',
    };
  }
  plan.releaseUnitContext={
    ...(plan.releaseUnitContext??{}),
    targetBaseSha:next.targetBaseSha,
    planAuthority:'release-unit-manifest#childDevelopmentTransaction',
  };
  next.childDevelopmentTransaction.plan=plan;
  next.childDevelopmentTransaction.planDigest=releaseUnitChildPlanDigest(plan);
  next.childDevelopmentTransaction.bindingDigest=null;
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

export function reconcileReleaseUnitManifest(manifest,{newBaseSha,predecessorReceipts=[],trustedMainAdvance=null}={}){
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
    if(expected&&expected!==newBaseSha&&!validateReleaseUnitMainAdvanceProof(trustedMainAdvance,{fromSha:expected,toSha:newBaseSha,manifest})){
      throw new Error(`RELEASE_UNIT_MAIN_DRIFT:${expected}:${newBaseSha}`);
    }
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
    const result=spawnSync(command,{cwd:worktree,shell:true,encoding:'utf8',env:{...process.env,GH_TOKEN:'',GITHUB_TOKEN:''}});
    if(result.status!==0)throw new Error(`RELEASE_UNIT_REGENERATE_FAILED:${operation.file}:${result.stderr||result.stdout}`);
    const filePath=path.join(worktree,operation.file);
    return {blobSha:git(cwd,['hash-object','-w',filePath]),fileMode:'100644'};
  }finally{
    try{git(cwd,['worktree','remove','--force',worktree]);}catch{}
    try{rmSync(worktree,{recursive:true,force:true});}catch{}
  }
}

function releaseUnitModifySourceParent({cwd,sourceCommit,operation}){
  const lineage=git(cwd,['rev-list','--parents','-n','1',sourceCommit]).split(/\s+/).filter(Boolean);
  const parents=lineage.slice(1);
  if(parents.length!==1)throw new Error(`RELEASE_UNIT_MODIFY_SOURCE_PARENT_INVALID:${operation.file}:${parents.length}`);
  return parents[0];
}
function releaseUnitStageEntry(cwd,file){
  const line=git(cwd,['ls-files','--stage','--',file]);
  const [fileMode,blobSha,stage]=line.split(/\s+/);
  if(!fileMode||!blobSha||stage!=='0')throw new Error(`RELEASE_UNIT_MODIFY_STAGE_INVALID:${file}`);
  return{blobSha,fileMode};
}
const releaseUnitSlug=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'release-unit';
const releaseUnitPatchDigest=patch=>createHash('sha256').update(patch).digest('hex');
const structuredReleaseUnitError=(code,details,message=null)=>{
  const error=new Error(message??code);
  error.code=code;
  error.details=structuredClone(details??{});
  return error;
};
export function releaseUnitConflictResolutionPath({releaseUnitId,file,sourceParent,sourceCommit,sourcePatchDigest}={}){
  const identity={releaseUnitId:String(releaseUnitId??''),file:String(file??''),sourceParent:String(sourceParent??''),sourceCommit:String(sourceCommit??''),sourcePatchDigest:String(sourcePatchDigest??'')};
  return `quality/development/release-unit-conflict-resolutions/${releaseUnitSlug(identity.releaseUnitId)}/${strongDigest(identity)}.json`;
}
function releaseUnitModifyPatchContext({cwd,releaseUnitId,targetBaseSha,sourceCommit,operation}){
  const file=operation.file;
  const sourceParent=releaseUnitModifySourceParent({cwd,sourceCommit,operation});
  const parentBlob=blobAt(cwd,sourceParent,file);
  const sourceBlob=blobAt(cwd,sourceCommit,file);
  const targetBlob=blobAt(cwd,targetBaseSha,file);
  const targetFileMode=modeAt(cwd,targetBaseSha,file);
  if(!parentBlob)throw new Error(`RELEASE_UNIT_MODIFY_SOURCE_PARENT_BLOB_MISSING:${file}`);
  if(!sourceBlob)throw new Error(`RELEASE_UNIT_MODIFY_SOURCE_BLOB_MISSING:${file}`);
  if(!targetBlob)throw new Error(`RELEASE_UNIT_MODIFY_TARGET_BLOB_MISSING:${file}`);
  if(operation.source?.mode!=='sealed'||operation.source?.commit!==sourceCommit||operation.source?.blobSha!==sourceBlob)throw new Error(`RELEASE_UNIT_MODIFY_SOURCE_IDENTITY_MISMATCH:${file}`);
  const patch=execFileSync('git',['diff','--binary','--full-index',sourceParent,sourceCommit,'--',file],{cwd,stdio:['ignore','pipe','pipe']});
  if(!patch?.length)throw new Error(`RELEASE_UNIT_MODIFY_SOURCE_DELTA_EMPTY:${file}`);
  const sourcePatchDigest=releaseUnitPatchDigest(patch);
  const resolutionRecordPath=releaseUnitConflictResolutionPath({releaseUnitId,file,sourceParent,sourceCommit,sourcePatchDigest});
  return{releaseUnitId,file,sourceParent,sourceCommit,sourcePatchDigest,targetBaseSha,targetBlobSha:targetBlob,targetFileMode,resolutionRecordPath,patch};
}
export function releaseUnitModifyConflictIdentity({cwd=process.cwd(),releaseUnitId,targetBaseSha,sourceCommit,operation}={}){
  const {patch,...identity}=releaseUnitModifyPatchContext({cwd,releaseUnitId,targetBaseSha,sourceCommit,operation});
  return identity;
}
function releaseUnitResolutionRecordAt({cwd,targetBaseSha,resolutionRecordPath,identity}){
  let raw;
  try{raw=git(cwd,['show',`${targetBaseSha}:${resolutionRecordPath}`]);}
  catch{return{status:'MISSING',record:null};}
  let record;
  try{record=JSON.parse(raw);}
  catch(error){throw structuredReleaseUnitError('RELEASE_UNIT_CONFLICT_RESOLUTION_INVALID',{...identity,reason:'MALFORMED_JSON',parseError:String(error?.message??error)},`RELEASE_UNIT_CONFLICT_RESOLUTION_INVALID:${identity.file}:MALFORMED_JSON`);}
  return{status:'FOUND',record};
}
function validateReleaseUnitConflictResolution({cwd,targetBaseSha,identity,record}){
  const mismatches=[];
  const exact={
    contract:RELEASE_UNIT_CONFLICT_RESOLUTION_CONTRACT,
    releaseUnitId:identity.releaseUnitId,
    file:identity.file,
    sourceParent:identity.sourceParent,
    sourceCommit:identity.sourceCommit,
    sourcePatchDigest:identity.sourcePatchDigest,
  };
  for(const [field,expected] of Object.entries(exact))if(record?.[field]!==expected)mismatches.push({field,expected,actual:record?.[field]??null});
  if(!String(record?.resolutionPlanTaskId??'').trim())mismatches.push({field:'resolutionPlanTaskId',expected:'non-empty',actual:record?.resolutionPlanTaskId??null});
  if(!/^[0-9a-f]{40}$/i.test(String(record?.resolutionBaseSha??'')))mismatches.push({field:'resolutionBaseSha',expected:'40-hex ancestor',actual:record?.resolutionBaseSha??null});
  else{
    const ancestor=spawnSync('git',['merge-base','--is-ancestor',record.resolutionBaseSha,targetBaseSha],{cwd,encoding:'utf8',env:{...process.env,GH_TOKEN:'',GITHUB_TOKEN:''}});
    if(ancestor.status!==0)mismatches.push({field:'resolutionBaseSha',expected:`ancestor-of:${targetBaseSha}`,actual:record.resolutionBaseSha});
  }
  if(record?.resolvedBlobSha!==identity.targetBlobSha)mismatches.push({field:'resolvedBlobSha',expected:identity.targetBlobSha,actual:record?.resolvedBlobSha??null});
  if(record?.resolvedFileMode!==identity.targetFileMode)mismatches.push({field:'resolvedFileMode',expected:identity.targetFileMode,actual:record?.resolvedFileMode??null});
  if(mismatches.length)throw structuredReleaseUnitError('RELEASE_UNIT_CONFLICT_RESOLUTION_INVALID',{...identity,mismatches},`RELEASE_UNIT_CONFLICT_RESOLUTION_INVALID:${identity.file}`);
  return{
    contract:RELEASE_UNIT_CONFLICT_RESOLUTION_CONTRACT,
    resolutionRecordPath:identity.resolutionRecordPath,
    resolutionPlanTaskId:record.resolutionPlanTaskId,
    resolutionBaseSha:record.resolutionBaseSha,
    resolvedBlobSha:record.resolvedBlobSha,
    resolvedFileMode:record.resolvedFileMode,
    sourcePatchDigest:identity.sourcePatchDigest,
  };
}
function modifiedBlob({cwd,releaseUnitId,targetBaseSha,sourceCommit,operation}){
  const context=releaseUnitModifyPatchContext({cwd,releaseUnitId,targetBaseSha,sourceCommit,operation});
  const worktree=mkdtempSync(path.join(os.tmpdir(),'shoperation-release-unit-modify-'));
  try{
    git(cwd,['worktree','add','--detach',worktree,targetBaseSha]);
    const applied=spawnSync('git',['apply','--3way','--index','--binary','-'],{
      cwd:worktree,input:context.patch,encoding:'utf8',env:{...process.env,GH_TOKEN:'',GITHUB_TOKEN:''},
    });
    if(applied.status!==0){
      const {status,record}=releaseUnitResolutionRecordAt({cwd,targetBaseSha,resolutionRecordPath:context.resolutionRecordPath,identity:context});
      if(status==='MISSING')throw structuredReleaseUnitError('RELEASE_UNIT_MODIFY_PATCH_CONFLICT',{...context,patch:undefined,gitApplyError:String(applied.stderr||applied.stdout||'').trim()},`RELEASE_UNIT_MODIFY_PATCH_CONFLICT:${context.file}`);
      const resolution=validateReleaseUnitConflictResolution({cwd,targetBaseSha,identity:context,record});
      return{blobSha:context.targetBlobSha,fileMode:context.targetFileMode,resolution};
    }
    const staged=git(worktree,['diff','--cached','--name-only','--']).split('\n').filter(Boolean);
    if(staged.some(item=>item!==context.file))throw new Error(`RELEASE_UNIT_MODIFY_PATCH_SCOPE_DRIFT:${context.file}:${staged.join(',')}`);
    return releaseUnitStageEntry(worktree,context.file);
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
      let desired;
      if(operation.operation==='modify'&&operation.generated?.mode!=='regenerate'){
        if(targetBlob===operation.source?.blobSha){alreadyApplied.push({file:operation.file,operation:'modify'});continue;}
        desired=modifiedBlob({cwd,releaseUnitId:sealed.releaseUnitId,targetBaseSha:sealed.targetBaseSha,sourceCommit:sealed.sourceIdentity.sourceCommit,operation});
      }else{
        desired=operation.generated?.mode==='regenerate'?regeneratedBlob({cwd,sourceCommit:sealed.sourceIdentity.sourceCommit,operation}):{blobSha:operation.source?.blobSha,fileMode:operation.source?.fileMode??'100644'};
      }
      if(!desired.blobSha)throw new Error(`RELEASE_UNIT_SOURCE_IDENTITY_MISSING:${operation.file}`);
      if(desired.resolution){alreadyApplied.push({file:operation.file,operation:operation.operation,resolution:desired.resolution});continue;}
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
const validGitBlobSha=value=>/^[0-9a-f]{40}$/i.test(String(value??''));
const validGitFileMode=value=>/^[0-7]{6}$/.test(String(value??''));
export function releaseUnitExactCreateSourceIdentity(manifest,file){
  const normalizedFile=String(file??'').trim();
  const sourceCommit=String(manifest?.sourceIdentity?.sourceCommit??'').trim();
  if(!normalizedFile||manifest?.sourceIdentity?.sealed!==true||!validGitBlobSha(sourceCommit))return null;
  const declared=(manifest?.operations??[]).filter(operation=>String(operation?.file??'').trim()===normalizedFile);
  if(declared.length!==1)return null;
  const operation=declared[0],source=operation?.source;
  if(operation?.operation!=='create'||operation?.generated!=null)return null;
  if(source?.mode!=='sealed'||source?.commit!==sourceCommit||!validGitBlobSha(source?.blobSha)||!validGitFileMode(source?.fileMode))return null;
  return{file:normalizedFile,sourceBlobSha:String(source.blobSha),sourceFileMode:String(source.fileMode)};
}
const classifyReleaseUnitMainAdvanceOverlap=(manifest,changedFiles,exactCreateFiles=[])=>{
  const intendedFiles=uniq(manifest?.intendedFiles??[]);
  const requiredDependencyFiles=uniq(manifest?.requiredDependencyFiles??[]);
  const scopeFiles=uniq([...intendedFiles,...requiredDependencyFiles]);
  const overlapFiles=uniq(changedFiles).filter(file=>scopeFiles.includes(file));
  const intended=new Set(intendedFiles),dependencies=new Set(requiredDependencyFiles),exactCreates=new Set(uniq(exactCreateFiles));
  const operations=manifest?.operations??[];
  const dependencyOverlapFiles=[],modifyOverlapFiles=[],exactCreateOverlapFiles=[],unsafeOverlapFiles=[];
  for(const file of overlapFiles){
    if(intended.has(file)){
      const declared=operations.filter(operation=>String(operation?.file??'').trim()===file);
      if(declared.length===1&&declared[0]?.operation==='modify')modifyOverlapFiles.push(file);
      else if(exactCreates.has(file)&&releaseUnitExactCreateSourceIdentity(manifest,file))exactCreateOverlapFiles.push(file);
      else unsafeOverlapFiles.push(file);
      continue;
    }
    if(dependencies.has(file))dependencyOverlapFiles.push(file);
    else unsafeOverlapFiles.push(file);
  }
  return{
    scopeFiles,
    overlapFiles:uniq(overlapFiles),
    dependencyOverlapFiles:uniq(dependencyOverlapFiles),
    modifyOverlapFiles:uniq(modifyOverlapFiles),
    exactCreateOverlapFiles:uniq(exactCreateOverlapFiles),
    unsafeOverlapFiles:uniq(unsafeOverlapFiles),
  };
};
const normalizedExactCreateIdentity=value=>({
  file:String(value?.file??'').trim(),
  sourceBlobSha:String(value?.sourceBlobSha??'').trim(),
  sourceFileMode:String(value?.sourceFileMode??'').trim(),
  targetBlobSha:String(value?.targetBlobSha??'').trim(),
  targetFileMode:String(value?.targetFileMode??'').trim(),
});
export function validateReleaseUnitMainAdvanceProof(proof,{fromSha,toSha,manifest}={}){
  const changedFiles=uniq(proof?.changedFiles??[]);
  const hasExactCreateProof=Array.isArray(proof?.exactCreateOverlapFiles)&&Array.isArray(proof?.exactCreateOverlapIdentities);
  const identities=hasExactCreateProof
    ?proof.exactCreateOverlapIdentities.map(normalizedExactCreateIdentity).sort((a,b)=>a.file.localeCompare(b.file))
    :null;
  const identityFiles=identities?identities.map(item=>item.file):[];
  const identitiesValid=identities!==null
    &&identityFiles.length===uniq(identityFiles).length
    &&identities.every(identity=>{
      const source=releaseUnitExactCreateSourceIdentity(manifest,identity.file);
      return source
        &&sameJson({file:identity.file,sourceBlobSha:identity.sourceBlobSha,sourceFileMode:identity.sourceFileMode},source)
        &&validGitBlobSha(identity.targetBlobSha)
        &&validGitFileMode(identity.targetFileMode)
        &&identity.targetBlobSha===source.sourceBlobSha
        &&identity.targetFileMode===source.sourceFileMode;
    });
  const exactCreateFiles=identitiesValid?uniq(identityFiles):[];
  const expected=classifyReleaseUnitMainAdvanceOverlap(manifest,changedFiles,exactCreateFiles);
  const legacyExpected=classifyReleaseUnitMainAdvanceOverlap(manifest,changedFiles,[]);
  const legacyCategorized=Array.isArray(proof?.dependencyOverlapFiles)
    &&Array.isArray(proof?.modifyOverlapFiles)
    &&Array.isArray(proof?.unsafeOverlapFiles);
  const exactCategoryMatch=hasExactCreateProof&&legacyCategorized&&identitiesValid
    &&sameJson(uniq(proof.dependencyOverlapFiles),expected.dependencyOverlapFiles)
    &&sameJson(uniq(proof.modifyOverlapFiles),expected.modifyOverlapFiles)
    &&sameJson(uniq(proof.exactCreateOverlapFiles),expected.exactCreateOverlapFiles)
    &&sameJson(uniq(proof.exactCreateOverlapFiles),exactCreateFiles)
    &&sameJson(uniq(proof.unsafeOverlapFiles),expected.unsafeOverlapFiles);
  const legacyCategoryMatch=!hasExactCreateProof&&(
    legacyCategorized
      ?sameJson(uniq(proof.dependencyOverlapFiles),legacyExpected.dependencyOverlapFiles)
        &&sameJson(uniq(proof.modifyOverlapFiles),legacyExpected.modifyOverlapFiles)
        &&sameJson(uniq(proof.unsafeOverlapFiles),legacyExpected.unsafeOverlapFiles)
        &&legacyExpected.unsafeOverlapFiles.length===0
      :legacyExpected.overlapFiles.length===0
  );
  const categoryMatch=exactCategoryMatch||legacyCategoryMatch;
  const effectiveExpected=hasExactCreateProof?expected:legacyExpected;
  return proof?.contract===RELEASE_UNIT_MAIN_ADVANCE_PROOF_CONTRACT
    &&proof?.issuer==='release-unit-github-runtime'
    &&proof?.decision==='PASS'
    &&proof?.relationship==='FAST_FORWARD'
    &&String(proof?.fromSha??'')===String(fromSha??'')
    &&String(proof?.toSha??'')===String(toSha??'')
    &&Array.isArray(proof?.changedFiles)
    &&Array.isArray(proof?.scopeFiles)
    &&Array.isArray(proof?.overlapFiles)
    &&sameJson(uniq(proof.scopeFiles),effectiveExpected.scopeFiles)
    &&sameJson(uniq(proof.overlapFiles),effectiveExpected.overlapFiles)
    &&categoryMatch
    &&effectiveExpected.unsafeOverlapFiles.length===0;
}
export function releaseParentProtectedFiles(parent){
  return uniq((parent?.units??[]).flatMap(item=>[
    ...(item?.manifest?.intendedFiles??[]),
    ...(item?.manifest?.operations??[]).flatMap(operation=>operationPaths(operation)),
  ]));
}
export function releaseParentUnitCloseReceiptDigests(parent){
  return [...(parent?.units??[])].sort((a,b)=>Number(a?.order??0)-Number(b?.order??0)).map(item=>item?.closeReceipt?digest(item.closeReceipt):null);
}
export function validateReleaseParentMainAdvanceProof(proof,{parent,fromSha,toSha}={}){
  if(!Array.isArray(parent?.units)||!parent.units.length||!parent.units.every(item=>item?.state==='CLOSED'&&item?.closeReceipt))return false;
  const protectedFiles=releaseParentProtectedFiles(parent);
  const changedFiles=uniq(proof?.changedFiles??[]);
  const overlapFiles=uniq(changedFiles.filter(file=>protectedFiles.includes(file)));
  const receiptDigests=releaseParentUnitCloseReceiptDigests(parent);
  return proof?.contract===RELEASE_PARENT_MAIN_ADVANCE_PROOF_CONTRACT
    &&proof?.issuer==='release-unit-parent-close'
    &&proof?.decision==='PASS'
    &&proof?.relationship==='FAST_FORWARD'
    &&String(proof?.fromSha??'')===String(fromSha??'')
    &&String(proof?.toSha??'')===String(toSha??'')
    &&Array.isArray(proof?.changedFiles)
    &&Array.isArray(proof?.protectedFiles)
    &&Array.isArray(proof?.overlapFiles)
    &&Array.isArray(proof?.unitCloseReceiptDigests)
    &&sameJson(uniq(proof.protectedFiles),protectedFiles)
    &&sameJson(uniq(proof.overlapFiles),overlapFiles)
    &&overlapFiles.length===0
    &&sameJson(proof.unitCloseReceiptDigests,receiptDigests);
}
export function buildReleaseParentClosureProofContext({parent,sourcePlan,sourceCommit,finalMainSha,trustedMainAdvance=null}={}){
  if(parent?.contract!==RELEASE_PARENT_EXECUTION_CONTRACT)throw new Error('RELEASE_PARENT_EXECUTION_CONTRACT_INVALID');
  if(!Array.isArray(parent?.units)||!parent.units.length||!parent.units.every(item=>item?.state==='CLOSED'&&item?.closeReceipt))throw new Error('RELEASE_PARENT_CLOSURE_CONTEXT_CLOSED_UNITS_REQUIRED');
  if(sourcePlan?.contract!=='shoporation.development-plan.v1'||sourcePlan?.taskId!==parent.parentTransactionId)throw new Error('RELEASE_PARENT_CLOSURE_SOURCE_PLAN_INVALID');
  if(!sourcePlan?.completionContract)throw new Error('RELEASE_PARENT_CLOSURE_COMPLETION_CONTRACT_REQUIRED');
  const source=String(sourceCommit??'').trim(),finalMain=String(finalMainSha??'').trim();
  if(!/^[0-9a-f]{40}$/i.test(source)||!/^[0-9a-f]{40}$/i.test(finalMain))throw new Error('RELEASE_PARENT_CLOSURE_IDENTITY_REQUIRED');
  const last=[...parent.units].sort((a,b)=>Number(a.order)-Number(b.order)).at(-1);
  const lastChildMain=String(last?.merge?.mergedMainSha??'').trim();
  if(!lastChildMain)throw new Error('RELEASE_PARENT_CLOSURE_LAST_CHILD_MAIN_REQUIRED');
  let trustedDigest=null;
  if(finalMain!==lastChildMain){
    if(!validateReleaseParentMainAdvanceProof(trustedMainAdvance,{parent,fromSha:lastChildMain,toSha:finalMain}))throw new Error('RELEASE_PARENT_CLOSURE_TRUSTED_MAIN_ADVANCE_INVALID');
    trustedDigest=strongDigest(trustedMainAdvance);
  }else if(trustedMainAdvance!=null)throw new Error('RELEASE_PARENT_CLOSURE_TRUSTED_MAIN_ADVANCE_UNEXPECTED');
  return{
    contract:RELEASE_PARENT_CLOSURE_CONTEXT_CONTRACT,
    proofPlanContract:RELEASE_PARENT_CLOSURE_PROOF_PLAN_CONTRACT,
    parentTransactionId:parent.parentTransactionId,
    sourceCommit:source,
    sourcePlanDigest:strongDigest(sourcePlan),
    completionContractDigest:strongDigest(sourcePlan.completionContract),
    lastChildMainSha:lastChildMain,
    finalMainSha:finalMain,
    unitCloseReceiptDigests:releaseParentUnitCloseReceiptDigests(parent),
    trustedMainAdvanceDigest:trustedDigest,
  };
}

const releaseParentProofSlug=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'release-parent';
export function releaseParentClosureProofArtifactPath(parentTransactionId){
  return `quality/knowledge/release-parent-closure-proofs/${releaseParentProofSlug(parentTransactionId)}.json`;
}
export function releaseParentClosureProofArtifactByteDigest(content){return createHash('sha256').update(String(content??'')).digest('hex');}
export function buildReleaseParentClosureProofArtifactFromContext(context={}){
  if(context?.contract!==RELEASE_PARENT_CLOSURE_CONTEXT_CONTRACT)throw new Error('RELEASE_PARENT_CLOSURE_ARTIFACT_CONTEXT_INVALID');
  const artifact={
    contract:RELEASE_PARENT_CLOSURE_PROOF_ARTIFACT_CONTRACT,
    parentTransactionId:context.parentTransactionId,
    sourceCommit:context.sourceCommit,
    sourcePlanDigest:context.sourcePlanDigest,
    completionContractDigest:context.completionContractDigest,
    finalMainSha:context.finalMainSha,
    unitCloseReceiptDigests:[...(context.unitCloseReceiptDigests??[])],
    trustedMainAdvanceDigest:context.trustedMainAdvanceDigest??null,
    parentClosureContextDigest:strongDigest(context),
  };
  const content=JSON.stringify(artifact,null,2)+'\n';
  return{path:releaseParentClosureProofArtifactPath(context.parentTransactionId),artifact,content,digest:releaseParentClosureProofArtifactByteDigest(content)};
}
export function buildReleaseParentClosureProofArtifact({parent,sourcePlan,sourceCommit,finalMainSha,trustedMainAdvance=null}={}){
  return buildReleaseParentClosureProofArtifactFromContext(buildReleaseParentClosureProofContext({parent,sourcePlan,sourceCommit,finalMainSha,trustedMainAdvance}));
}
export function validateReleaseParentClosureProofArtifact(candidate,{context}={}){
  try{
    const expected=buildReleaseParentClosureProofArtifactFromContext(context);
    return candidate?.path===expected.path
      &&candidate?.content===expected.content
      &&candidate?.digest===expected.digest
      &&sameJson(candidate?.artifact,expected.artifact);
  }catch{return false;}
}

export function buildReleaseParentClosureProofPlan({parent,sourcePlan,sourceCommit,finalMainSha,trustedMainAdvance=null}={}){
  const context=buildReleaseParentClosureProofContext({parent,sourcePlan,sourceCommit,finalMainSha,trustedMainAdvance});
  const plan=structuredClone(sourcePlan);
  const closureFile='quality/development/active-plan.json';
  const proofArtifact=buildReleaseParentClosureProofArtifactFromContext(context);
  plan.status='ready-for-implementation';
  delete plan.lifecycle;
  delete plan.releaseUnitContext;
  plan.changeBaseSha=context.finalMainSha;
  plan.plannedFilePatterns=[closureFile,proofArtifact.path];
  plan.parentClosureContext=context;
  const sourceRoute=sourcePlan?.operationalIntelligence?.semanticExecutionRoute??{};
  plan.operationalIntelligence={
    ...structuredClone(sourcePlan.operationalIntelligence??{}),
    semanticExecutionRoute:{
      request:sourceRoute.request??sourcePlan?.completionContract?.sourceRef??null,
      authority:uniq(sourcePlan?.expectedAuthorities??sourceRoute.authority??[]),
      mustEdit:[],
      mayEdit:[closureFile],
      impactedReadOnly:[],
      mustCreate:[proofArtifact.path],
      forbidden:uniq(sourceRoute.forbidden??[]),
      proof:[proofArtifact.path],
      unknown:[],
      plannedDeletions:[],
      plannedRenames:[],
      generatedArtifacts:[],
    },
  };
  plan.notes=[String(sourcePlan?.notes??'').trim(),'Executor-derived parent closure proof plan. Historical implementation remains authoritative through CLOSED child receipts and trusted-main evidence; this plan scopes only lifecycle metadata closure.'].filter(Boolean).join(' ');
  return plan;
}

export function validateReleaseParentClosureProofPlan(plan,{parent,sourcePlan,sourceCommit,finalMainSha,trustedMainAdvance=null}={}){
  try{
    const expected=buildReleaseParentClosureProofPlan({parent,sourcePlan,sourceCommit,finalMainSha,trustedMainAdvance});
    if(plan?.contract!=='shoporation.development-plan.v1'||!['ready-for-implementation','closed'].includes(plan?.status))return false;
    if(plan.taskId!==expected.taskId||plan.changeBaseSha!==expected.changeBaseSha)return false;
    if(!sameJson(plan.plannedFilePatterns,expected.plannedFilePatterns))return false;
    if(!sameJson(plan.completionContract,expected.completionContract))return false;
    if(!sameJson(plan.parentClosureContext,expected.parentClosureContext))return false;
    if(!sameJson(plan.operationalIntelligence?.semanticExecutionRoute,expected.operationalIntelligence?.semanticExecutionRoute))return false;
    if(!sameJson(plan.expectedSubsystems??[],expected.expectedSubsystems??[]))return false;
    if(!sameJson(plan.expectedDomains??[],expected.expectedDomains??[]))return false;
    if(!sameJson(plan.expectedAuthorities??[],expected.expectedAuthorities??[]))return false;
    if(plan.status==='closed'&&(plan.lifecycle?.state!=='LEARN'||plan.lifecycle?.truthStatus!=='VERIFIED'||plan.lifecycle?.verifiedImplementationHead!==String(finalMainSha??'')))return false;
    return true;
  }catch{return false;}
}

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
const REPROJECTABLE_OBLIGATION_FIELDS=new Set(['authorities','subsystems','requiredGates','requiredEvidence','childPlanDigest']);
const operationWithoutSource=operation=>{
  const next=executionClone(operation??{});
  delete next.source;
  return next;
};
const normalizedSemanticOperations=manifest=>sortedObjects((manifest?.operations??[]).map(operationWithoutSource));
const monotonicStringSetEnrichment=(before=[],after=[])=>{
  const previous=uniq(before??[]),fresh=uniq(after??[]);
  return fresh.length>previous.length&&previous.every(item=>fresh.includes(item));
};
const canonicalSourceShape=(operation,sourceCommit)=>{
  const source=operation?.source;
  if(operation?.operation==='delete')return source===null;
  if(operation?.generated?.mode==='regenerate')return source?.mode==='regenerate'&&source?.commit===sourceCommit&&source?.blobSha===null;
  return source?.mode==='sealed'
    &&source?.commit===sourceCommit
    &&/^[0-9a-f]{40}$/i.test(String(source?.blobSha??''))
    &&/^[0-7]{6}$/.test(String(source?.fileMode??''));
};
const canonicalFirstSealingEnrichment=(before,after)=>{
  const sourceCommit=String(after?.sourceIdentity?.sourceCommit??'').trim();
  const beforeOperations=before?.operations??[],afterOperations=after?.operations??[];
  if(before?.sourceIdentity?.sealed===true||after?.sourceIdentity?.sealed!==true)return false;
  if(String(before?.sourceIdentity?.sourceCommit??'').trim())return false;
  if(!/^[0-9a-f]{40}$/i.test(sourceCommit))return false;
  if(!beforeOperations.every(operation=>!Object.prototype.hasOwnProperty.call(operation??{},'source')||operation?.source==null))return false;
  if(!sameJson(normalizedSemanticOperations(before),normalizedSemanticOperations(after)))return false;
  if(!afterOperations.every(operation=>canonicalSourceShape(operation,sourceCommit)))return false;
  const beforeDigest=before?.childDevelopmentTransaction?.operationDigest??null;
  const afterDigest=after?.childDevelopmentTransaction?.operationDigest??null;
  return beforeDigest===strongDigest(beforeOperations)&&afterDigest===strongDigest(afterOperations);
};
export const classifyReleaseUnitObligationDrift=(before,after)=>{
  const a=normalizedExecutionObligations(before),b=normalizedExecutionObligations(after);
  const all=Object.keys(a).filter(key=>!sameJson(a[key],b[key])).map(key=>({field:key,before:a[key],after:b[key]}));
  const reprojectableFields=new Set(REPROJECTABLE_OBLIGATION_FIELDS);
  if(canonicalFirstSealingEnrichment(before,after)){
    reprojectableFields.add('operations');
    reprojectableFields.add('childOperationDigest');
  }
  if(monotonicStringSetEnrichment(a.requiredDependencyFiles,b.requiredDependencyFiles))reprojectableFields.add('requiredDependencyFiles');
  if(monotonicStringSetEnrichment(a.readOnlyPaths,b.readOnlyPaths))reprojectableFields.add('readOnlyPaths');
  return{
    all,
    material:all.filter(item=>!reprojectableFields.has(item.field)),
    reprojectable:all.filter(item=>reprojectableFields.has(item.field)),
  };
};
const obligationDrift=(before,after)=>classifyReleaseUnitObligationDrift(before,after).all;
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

function predecessorResult(execution,{currentMainSha,predecessorExecutions=[],trustedMainAdvance=null,scopeManifest=null}={}){
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
  if(sequence.merge.mergedMainSha!==currentMainSha&&!validateReleaseUnitMainAdvanceProof(trustedMainAdvance,{fromSha:sequence.merge.mergedMainSha,toSha:currentMainSha,manifest:scopeManifest??execution.manifest})){
    return{decision:'STALE',code:'RELEASE_UNIT_MAIN_DRIFT',details:{expected:sequence.merge.mergedMainSha,actual:currentMainSha}};
  }
  return{decision:'PASS',sequence};
}

export function reconcileSuccessorReleaseUnit({execution,freshManifest,currentMainSha,predecessorExecutions=[],allFreshManifests=[],trustedFreshProjection=false,trustedMainAdvance=null}={}){
  if(execution?.contract!==RELEASE_UNIT_EXECUTION_CONTRACT)executionError('RELEASE_UNIT_EXECUTION_CONTRACT_INVALID');
  if(!['PLANNED','STALE'].includes(execution.state))executionError('RELEASE_UNIT_RECONCILIATION_STATE_INVALID',{state:execution.state});
  if(freshManifest?.contract!==RELEASE_UNIT_MANIFEST_CONTRACT)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_MANIFEST_REQUIRED',details:{}};
  if(freshManifest.releaseUnitId!==execution.releaseUnitId)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_MANIFEST_IDENTITY_MISMATCH',details:{expected:execution.releaseUnitId,actual:freshManifest.releaseUnitId}};
  if((freshManifest.transaction?.parentTransactionId??freshManifest.transaction?.id)!==execution.parentTransactionId)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_PARENT_IDENTITY_MISMATCH',details:{}};
  if(freshManifest.decision!=='PASS')return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_MANIFEST_NOT_PASS',details:{decision:freshManifest.decision,reason:freshManifest.reason??null}};
  if(freshManifest.projectedRisk?.decision!=='PASS')return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_RISK_BLOCK',details:{risk:freshManifest.projectedRisk??null}};
  if(!currentMainSha||freshManifest.targetBaseSha!==currentMainSha||freshManifest.lease?.expectedBaseSha!==currentMainSha)return{decision:'STALE',state:'STALE',code:'RELEASE_UNIT_FRESH_BASE_STALE',details:{currentMainSha,targetBaseSha:freshManifest.targetBaseSha,lease:freshManifest.lease??null}};
  const predecessor=predecessorResult(execution,{currentMainSha,predecessorExecutions,trustedMainAdvance,scopeManifest:freshManifest});
  if(predecessor.decision!=='PASS')return{decision:predecessor.decision,state:predecessor.decision==='STALE'?'STALE':'BLOCKED',code:predecessor.code,details:predecessor.details};
  if((execution.manifest?.predecessorUnits??[]).length&&freshManifest.lease?.reconciled!==true)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_RECONCILIATION_REQUIRED',details:{lease:freshManifest.lease??null}};
  const blocked=forbiddenHits(freshManifest.operations??[],freshManifest.forbiddenPaths??[],freshManifest.readOnlyPaths??[]);
  if(blocked.length)return{decision:'BLOCK',state:'BLOCKED',code:'RELEASE_UNIT_FRESH_FORBIDDEN_SCOPE',details:{blocked}};
  const manifests=allFreshManifests?.length?allFreshManifests:[freshManifest];
  if(manifests.length>1){
    const ordering=validateReleaseUnitOrder(manifests);
    if(ordering.decision!=='PASS')return{decision:'FAIL',state:'FAILED',code:'RELEASE_UNIT_RECONCILIATION_CYCLE',details:{ordering}};
  }
  const drift=classifyReleaseUnitObligationDrift(execution.manifest,freshManifest);
  if(drift.material.length)return{decision:'STALE',state:'STALE',code:'RELEASE_UNIT_EXECUTION_OBLIGATION_DRIFT',details:{drift:drift.material,reprojectableDrift:drift.reprojectable}};
  if(drift.reprojectable.length&&trustedFreshProjection!==true)return{decision:'STALE',state:'STALE',code:'RELEASE_UNIT_EXECUTION_OBLIGATION_DRIFT',details:{drift:drift.reprojectable}};
  return{decision:'PASS',state:'READY',code:'RELEASE_UNIT_RECONCILED',details:{currentMainSha,reprojectedFields:drift.reprojectable.map(item=>item.field)},manifest:executionClone(freshManifest)};
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

export function recordReleaseUnitAlreadyApplied(execution,{truth,lifecyclePlan,currentMainSha}={}){
  if(execution?.contract!==RELEASE_UNIT_EXECUTION_CONTRACT)executionError('RELEASE_UNIT_EXECUTION_CONTRACT_INVALID');
  if(execution.state!=='MATERIALIZED')executionError('RELEASE_UNIT_ALREADY_APPLIED_STATE_INVALID',{state:execution.state});
  const receipt=execution.materialization;
  if(receipt?.status!=='ALREADY_APPLIED')executionError('RELEASE_UNIT_ALREADY_APPLIED_RECEIPT_REQUIRED');
  const head=requiredText(currentMainSha,'RELEASE_UNIT_ALREADY_APPLIED_MAIN_REQUIRED');
  if(head!==execution.manifest.targetBaseSha||receipt.targetBaseSha!==head||receipt.materializedHeadSha!==head)executionError('RELEASE_UNIT_ALREADY_APPLIED_MAIN_MISMATCH');
  if((receipt.applied??[]).length)executionError('RELEASE_UNIT_ALREADY_APPLIED_PARTIAL_APPLICATION');
  if((execution.manifest.operations??[]).some(operation=>operation.generated))executionError('RELEASE_UNIT_ALREADY_APPLIED_GENERATED_UNSUPPORTED');
  const expected=(execution.manifest.operations??[]).map(item=>String(item.operation)+':'+String(item.file)).sort();
  const actual=(receipt.alreadyApplied??[]).map(item=>String(item.operation)+':'+String(item.file)).sort();
  if(!expected.length||!sameJson(expected,actual))executionError('RELEASE_UNIT_ALREADY_APPLIED_COVERAGE_MISMATCH',{expected,actual});
  const child=execution.manifest?.childDevelopmentTransaction;
  if(!child?.taskId||!child?.planDigest||!child?.bindingDigest)executionError('RELEASE_UNIT_CHILD_TRANSACTION_REQUIRED');
  if(truth?.taskId!==child.taskId)executionError('RELEASE_UNIT_TRUTH_TASK_MISMATCH',{expected:child.taskId,actual:truth?.taskId??null});
  const truthContext=truth?.releaseUnitContext??{};
  if(truthContext.parentTransactionId!==execution.parentTransactionId||truthContext.releaseUnitId!==execution.releaseUnitId||truthContext.manifestDigest!==execution.manifest.manifestDigest||truthContext.childPlanDigest!==child.planDigest||truthContext.bindingDigest!==child.bindingDigest)executionError('RELEASE_UNIT_TRUTH_CONTEXT_MISMATCH');
  if(truth?.decision!=='PASS'||truth?.truthStatus!=='VERIFIED'||truth?.internalState!=='VERIFIED_DONE'||truth.currentExactState?.head!==head)executionError('RELEASE_UNIT_TRUTH_NOT_VERIFIED');
  if(lifecyclePlan?.status!=='closed'||lifecyclePlan?.lifecycle?.state!=='LEARN'||lifecyclePlan?.lifecycle?.truthStatus!=='VERIFIED'||lifecyclePlan.lifecycle.verifiedImplementationHead!==head)executionError('RELEASE_UNIT_LIFECYCLE_NOT_CLOSED');
  if(lifecyclePlan.taskId!==child.taskId)executionError('RELEASE_UNIT_LIFECYCLE_TASK_MISMATCH');
  const lifecycleContext=lifecyclePlan.releaseUnitContext??{};
  if(lifecycleContext.parentTransactionId!==execution.parentTransactionId||lifecycleContext.releaseUnitId!==execution.releaseUnitId||lifecycleContext.manifestDigest!==execution.manifest.manifestDigest||lifecycleContext.childPlanDigest!==child.planDigest||lifecycleContext.bindingDigest!==child.bindingDigest)executionError('RELEASE_UNIT_LIFECYCLE_CONTEXT_MISMATCH');
  const next=executionClone(execution);
  next.state='CLOSED';
  next.verification={sourceHeadSha:head,truthContract:truth.contract??null,truthStatus:truth.truthStatus,internalState:truth.internalState,lifecycleState:lifecyclePlan.lifecycle.state,lifecycleTruthStatus:lifecyclePlan.lifecycle.truthStatus,verifiedImplementationHead:head,childTaskId:child.taskId,childPlanDigest:child.planDigest,bindingDigest:child.bindingDigest,noCode:true};
  next.merge={contract:'shoporation.release-unit-no-code-main-receipt.v1',prNumber:null,sourceHeadSha:head,mergedMainSha:head,mergeMethod:'already-applied',noCode:true};
  next.closeReceipt={contract:'shoporation.release-unit-close-receipt.v1',releaseUnitId:execution.releaseUnitId,sourceHeadSha:head,mergedMainSha:head,manifestDigest:execution.manifest.manifestDigest,truthStatus:truth.truthStatus,lifecycleState:lifecyclePlan.lifecycle.state,childTaskId:child.taskId,childPlanDigest:child.planDigest,bindingDigest:child.bindingDigest,noCode:true,decision:'PASS'};
  next.lastTransition={to:'CLOSED',code:'RELEASE_UNIT_ALREADY_APPLIED_CLOSED'};
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
  else if(event.type==='ALREADY_APPLIED_VERIFIED')nextUnit=recordReleaseUnitAlreadyApplied(current,{truth:event.truth,lifecyclePlan:event.lifecyclePlan,currentMainSha:event.currentMainSha});
  else if(event.type==='MERGED')nextUnit=recordReleaseUnitMerge(current,event.receipt);
  else if(event.type==='CLOSED')nextUnit=closeReleaseUnitExecution(current,{currentMainSha:event.currentMainSha});
  else if(event.type==='FAILED')nextUnit=failReleaseUnitExecution(current,{code:event.code,details:event.details});
  else executionError('RELEASE_UNIT_EVENT_TYPE_INVALID',{type:event.type});
  return synchronizeReleaseParentExecution(parent,nextUnit);
}

export function recordReleaseParentClosureWithProofContext(parent,{truth,lifecyclePlan,currentMainSha,trustedMainAdvance=null,sourcePlan,sourceCommit,proofArtifact}={}){
  const exact=String(currentMainSha??'').trim();
  if(!validateReleaseParentClosureProofPlan(lifecyclePlan,{parent,sourcePlan,sourceCommit,finalMainSha:exact,trustedMainAdvance}))executionError('RELEASE_PARENT_CLOSURE_PROOF_CONTEXT_INVALID');
  if(!validateReleaseParentClosureProofArtifact(proofArtifact,{context:lifecyclePlan.parentClosureContext}))executionError('RELEASE_PARENT_CLOSURE_PROOF_ARTIFACT_INVALID');
  if(truth?.taskId!==parent?.parentTransactionId)executionError('RELEASE_PARENT_TRUTH_TASK_MISMATCH');
  if(truth?.sourceRef!==sourcePlan?.completionContract?.sourceRef)executionError('RELEASE_PARENT_TRUTH_SOURCE_MISMATCH');
  const next=recordReleaseParentClosure(parent,{truth,lifecyclePlan,currentMainSha:exact,trustedMainAdvance});
  next.closedReceipt={...next.closedReceipt,parentClosureContext:executionClone(lifecyclePlan.parentClosureContext),proofArtifactPath:proofArtifact.path,proofArtifactDigest:proofArtifact.digest};
  return next;
}

export function recordReleaseParentClosure(parent,{truth,lifecyclePlan,currentMainSha,trustedMainAdvance=null}={}){
  if(parent?.contract!==RELEASE_PARENT_EXECUTION_CONTRACT)executionError('RELEASE_PARENT_EXECUTION_CONTRACT_INVALID');
  if(!parent.closureEligible||parent.activeUnitId!==null||!parent.units?.every(item=>item.state==='CLOSED'))executionError('RELEASE_PARENT_NOT_CLOSURE_ELIGIBLE');
  const last=[...parent.units].sort((a,b)=>a.order-b.order).at(-1);
  const lastChildMain=last?.merge?.mergedMainSha??null;
  const exact=currentMainSha??lastChildMain;
  if(!exact||!lastChildMain)executionError('RELEASE_PARENT_FINAL_MAIN_MISMATCH');
  let acceptedMainAdvance=null;
  if(exact!==lastChildMain){
    if(!validateReleaseParentMainAdvanceProof(trustedMainAdvance,{parent,fromSha:lastChildMain,toSha:exact}))executionError('RELEASE_PARENT_MAIN_ADVANCE_PROOF_INVALID',{fromSha:lastChildMain,toSha:exact});
    acceptedMainAdvance=executionClone(trustedMainAdvance);
  }else if(trustedMainAdvance!=null){
    executionError('RELEASE_PARENT_MAIN_ADVANCE_PROOF_UNEXPECTED',{finalMainSha:exact});
  }
  if(truth?.decision!=='PASS'||truth?.truthStatus!=='VERIFIED'||truth?.internalState!=='VERIFIED_DONE'||truth?.currentExactState?.head!==exact)executionError('RELEASE_PARENT_TRUTH_NOT_VERIFIED');
  if(lifecyclePlan?.status!=='closed'||lifecyclePlan?.lifecycle?.state!=='LEARN'||lifecyclePlan?.lifecycle?.truthStatus!=='VERIFIED'||lifecyclePlan?.lifecycle?.verifiedImplementationHead!==exact)executionError('RELEASE_PARENT_LIFECYCLE_NOT_CLOSED');
  if(truth.taskId&&truth.taskId!==parent.parentTransactionId)executionError('RELEASE_PARENT_TRUTH_TASK_MISMATCH');
  const next=executionClone(parent);
  next.lifecyclePhase='LEARN';
  next.closureComplete=true;
  next.closedReceipt={
    contract:'shoporation.release-parent-close-receipt.v1',
    parentTransactionId:parent.parentTransactionId,
    lastChildMainSha:lastChildMain,
    finalMainSha:exact,
    mainAdvanceProof:acceptedMainAdvance,
    truthStatus:truth.truthStatus,
    lifecycleState:lifecyclePlan.lifecycle.state,
    unitCloseReceiptDigests:releaseParentUnitCloseReceiptDigests(next),
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
