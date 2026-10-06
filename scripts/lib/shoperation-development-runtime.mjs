import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';

export const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
export const releasePolicy=readJson('deploy/release-risk-policy.json');
export const knowledge=readJson('quality/knowledge/shoperation-quality-knowledge.v1.json');
export const scopePolicy=readJson('quality/knowledge/knowledge-scope-policy.v1.json');
export const guardPolicy=readJson('quality/knowledge/development-guard-policy.v1.json');

export function stableDigest(value){
  let hash=2166136261;
  const text=typeof value==='string'?value:JSON.stringify(value);
  for(let i=0;i<text.length;i+=1){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16).padStart(8,'0');
}
export function globToRegExp(glob){
  let out='^';
  for(let i=0;i<glob.length;i+=1){
    const ch=glob[i];
    if(ch==='*'){
      if(glob[i+1]==='*'){i+=1;if(glob[i+1]==='/'){i+=1;out+='(?:.*/)?';}else out+='.*';}
      else out+='[^/]*';
    }else if(ch==='?')out+='[^/]';
    else if('\\.^$+{}()|[]'.includes(ch))out+=`\\${ch}`;
    else out+=ch;
  }
  return new RegExp(`${out}$`);
}
const neutralMatchers=releasePolicy.neutralPatterns.map(globToRegExp);
const subsystemMatchers=releasePolicy.subsystems.map(item=>({...item,matchers:item.patterns.map(globToRegExp)}));
const DEVELOPMENT_METADATA_FILES=new Set(['quality/development/active-plan.json']);
export function isNeutralFile(file){return neutralMatchers.some(matcher=>matcher.test(file));}
export function isDevelopmentMetadataFile(file){return DEVELOPMENT_METADATA_FILES.has(String(file??''));}
const BLOCKING_GATE_DECISIONS=new Set(['BLOCK','FAIL','FAILED','FAILURE','STALE','CONFLICT','UNRESOLVED','UNKNOWN']);
export function isBlockingGateDecision(value){return BLOCKING_GATE_DECISIONS.has(String(value??'').trim().toUpperCase());}
export function aggregateGateDecision({localBlocking=false,childDecisions=[]}={}){return localBlocking||childDecisions.some(isBlockingGateDecision)?'BLOCK':'PASS';}
export function guardFindingFingerprint(finding){return stableDigest({ruleId:finding?.ruleId??null,file:finding?.file??null,line:Number(finding?.line??0),code:finding?.code??'',message:finding?.message??''});}
export function matchGuardException(finding,exceptions=[]){const findingFingerprint=guardFindingFingerprint(finding);const exception=(exceptions??[]).find(item=>item?.ruleId===finding?.ruleId&&item?.file===finding?.file&&item?.findingFingerprint===findingFingerprint)??null;return{findingFingerprint,exception};}


function hasGlobPattern(value){return /[*?\[\]{}]/.test(String(value??''));}
export function exactPlannedPaths(patterns=[]){return [...new Set((patterns??[]).map(value=>String(value??'').trim()).filter(value=>value&&!hasGlobPattern(value)))].sort();}
function patternsMayOverlap(left,right){
  const a=String(left??''),b=String(right??'');
  if(!a||!b)return false;
  if(!hasGlobPattern(a))return globToRegExp(b).test(a);
  if(!hasGlobPattern(b))return globToRegExp(a).test(b);
  const prefix=value=>value.slice(0,Math.min(...['*','?','[','{'].map(token=>{const index=value.indexOf(token);return index<0?value.length:index;})));
  const ap=prefix(a),bp=prefix(b);
  return !ap||!bp||ap.startsWith(bp)||bp.startsWith(ap);
}
export function evaluateReleaseRiskFiles(files,{policy=releasePolicy}={}){
  const unique=[...new Set((files??[]).map(value=>String(value??'').trim()).filter(Boolean))].sort();
  const neutral=(policy.neutralPatterns??[]).map(globToRegExp);
  const subsystems=(policy.subsystems??[]).map(item=>({...item,matchers:(item.patterns??[]).map(globToRegExp)}));
  const classified=unique.map(file=>{
    if(neutral.some(matcher=>matcher.test(file)))return{file,subsystem:'evidence-neutral',risk:'neutral',points:0};
    const match=subsystems.find(item=>item.matchers.some(matcher=>matcher.test(file)));
    const risk=match?.risk??policy.fallback?.risk??'medium';
    return{file,subsystem:match?.name??policy.fallback?.subsystem??'unclassified-change',risk,points:Number(policy.riskWeights?.[risk]??0)};
  });
  const scoredSubsystems=[...new Map(classified.filter(item=>item.points>0).map(item=>[item.subsystem,{subsystem:item.subsystem,risk:item.risk,points:item.points}])).values()];
  const score=scoredSubsystems.reduce((sum,item)=>sum+item.points,0),highRisk=scoredSubsystems.filter(item=>item.risk==='high'),violations=[];
  if(score>Number(policy.maxPoints??0))violations.push({code:'PROJECTED_RELEASE_RISK_POINTS_EXCEEDED',score,maxPoints:policy.maxPoints});
  if(scoredSubsystems.length>Number(policy.maxSubsystems??0))violations.push({code:'PROJECTED_RELEASE_RISK_SUBSYSTEMS_EXCEEDED',subsystemCount:scoredSubsystems.length,maxSubsystems:policy.maxSubsystems});
  if(highRisk.length>1)violations.push({code:'PROJECTED_RELEASE_RISK_MULTIPLE_HIGH',subsystems:highRisk.map(item=>item.subsystem)});
  if(highRisk.length===1&&scoredSubsystems.length>1)violations.push({code:'PROJECTED_RELEASE_RISK_HIGH_NOT_ISOLATED',subsystem:highRisk[0].subsystem});
  return{contract:'shoporation.projected-release-risk.v1',score,maxPoints:policy.maxPoints,subsystemCount:scoredSubsystems.length,maxSubsystems:policy.maxSubsystems,subsystems:scoredSubsystems,files:classified,violations,decision:violations.length?'BLOCK':'PASS'};
}
function normalizeReleasePath(value){return String(value??'').trim().replaceAll('\\','/');}
function releaseOperationFootprint(operation){
  const paths=[normalizeReleasePath(operation?.path)];
  if(operation?.type==='rename')paths.push(normalizeReleasePath(operation?.sourcePath));
  return [...new Set(paths.filter(Boolean))].sort();
}
function normalizeReleaseOperation(operation){
  const type=String(operation?.type??'').trim().toLowerCase();
  return{
    ...operation,
    type,
    path:normalizeReleasePath(operation?.path),
    ...(operation?.sourcePath?{sourcePath:normalizeReleasePath(operation.sourcePath)}:{}),
    ...(operation?.sourcePathAtSource?{sourcePathAtSource:normalizeReleasePath(operation.sourcePathAtSource)}:{}),
    dependsOnFiles:[...new Set((operation?.dependsOnFiles??[]).map(normalizeReleasePath).filter(Boolean))].sort(),
    atomicWith:[...new Set((operation?.atomicWith??[]).map(normalizeReleasePath).filter(Boolean))].sort(),
  };
}
function releasePathMatches(file,patterns=[]){return (patterns??[]).some(pattern=>globToRegExp(pattern).test(file));}
function releaseEdgeKey(from,to){return `${from}\u0000${to}`;}
function releasePairKey(left,right){return left<right?`${left}\u0000${right}`:`${right}\u0000${left}`;}
function releaseAtlasNodeMap(atlas){return new Map((atlas?.nodes??[]).map(node=>[node.path,node]));}
function releaseRequiredDependencies(atlas,unitFiles,allPlannedFiles){
  const unit=new Set(unitFiles),planned=new Set(allPlannedFiles),byPath=releaseAtlasNodeMap(atlas),out=new Set();
  for(const file of unitFiles)for(const dependency of byPath.get(file)?.imports??[])if(!unit.has(dependency))out.add(dependency);
  return [...out].sort().map(file=>({file,state:planned.has(file)?'planned-predecessor-or-peer':'existing-base-dependency'}));
}
function releaseProofFiles(atlas,unitFiles){
  const unit=new Set(unitFiles),byPath=releaseAtlasNodeMap(atlas),proof=new Set();
  for(const file of unitFiles)if(byPath.get(file)?.kind==='test')proof.add(file);
  for(const file of unitFiles)for(const consumer of atlas?.reverseImports?.[file]??[])if(byPath.get(consumer)?.kind==='test')proof.add(consumer);
  for(const edge of atlas?.semanticGraph?.edges??[]){
    const from=edge?.fromFile,to=edge?.toFile;
    if(!from||!to)continue;
    if(unit.has(from)&&byPath.get(to)?.kind==='test')proof.add(to);
    if(unit.has(to)&&byPath.get(from)?.kind==='test')proof.add(from);
  }
  return [...proof].sort();
}
function releaseAtomicEdges({atlas,files,operations,atomicEdges=[],proofEdges=[]}){
  const planned=new Set(files),edges=new Map(),add=(from,to,reason)=>{
    from=normalizeReleasePath(from);to=normalizeReleasePath(to);
    if(!from||!to||from===to||!planned.has(from)||!planned.has(to))return;
    const key=releasePairKey(from,to);if(!edges.has(key))edges.set(key,{from,to,reason});
  };
  for(const node of atlas?.nodes??[])if(planned.has(node.path))for(const dependency of node.imports??[])add(node.path,dependency,'atlas-import');
  for(const edge of atlas?.semanticGraph?.edges??[])if(edge?.fromFile&&edge?.toFile)add(edge.fromFile,edge.toFile,`semantic:${edge.type??'relationship'}`);
  for(const operation of operations??[])for(const other of operation.atomicWith??[])add(operation.path,other,'manifest-atomic-with');
  for(const edge of [...(atomicEdges??[]),...(proofEdges??[])])add(edge.from,edge.to,edge.reason??'explicit-atomic');
  return [...edges.values()].sort((a,b)=>releasePairKey(a.from,a.to).localeCompare(releasePairKey(b.from,b.to)));
}
function releaseComponents(files,edges){
  const parent=new Map(files.map(file=>[file,file]));
  const find=file=>{let root=file;while(parent.get(root)!==root)root=parent.get(root);let current=file;while(parent.get(current)!==current){const next=parent.get(current);parent.set(current,root);current=next;}return root;};
  const union=(a,b)=>{const ra=find(a),rb=find(b);if(ra===rb)return;const [small,large]=ra<rb?[ra,rb]:[rb,ra];parent.set(large,small);};
  for(const edge of edges)union(edge.from,edge.to);
  const grouped=new Map();
  for(const file of files){const root=find(file);if(!grouped.has(root))grouped.set(root,[]);grouped.get(root).push(file);}
  return [...grouped.values()].map(groupFiles=>groupFiles.sort()).sort((a,b)=>a[0].localeCompare(b[0])).map((groupFiles,index)=>({componentId:`RC-${String(index+1).padStart(2,'0')}-${stableDigest(groupFiles)}`,files:groupFiles}));
}
function releaseComponentOrder(components,componentByFile,prerequisiteEdges){
  const ids=components.map(item=>item.componentId),outgoing=new Map(ids.map(id=>[id,new Set()])),indegree=new Map(ids.map(id=>[id,0])),issues=[],edgeMap=new Map();
  const add=(dependency,dependent,reason)=>{
    dependency=normalizeReleasePath(dependency);dependent=normalizeReleasePath(dependent);
    const from=componentByFile.get(dependency),to=componentByFile.get(dependent);
    if(!from||!to||from===to)return;
    const key=releaseEdgeKey(from,to);if(edgeMap.has(key))return;
    edgeMap.set(key,{from,to,dependency,dependent,reason});
    outgoing.get(from).add(to);indegree.set(to,(indegree.get(to)??0)+1);
  };
  for(const edge of prerequisiteEdges??[])add(edge.from,edge.to,edge.reason??'explicit-prerequisite');
  const ready=ids.filter(id=>indegree.get(id)===0).sort(),ordered=[];
  while(ready.length){
    const id=ready.shift();ordered.push(id);
    for(const to of [...outgoing.get(id)].sort()){indegree.set(to,indegree.get(to)-1);if(indegree.get(to)===0){ready.push(to);ready.sort();}}
  }
  if(ordered.length!==ids.length)issues.push({code:'RELEASE_DECOMPOSITION_DEPENDENCY_CYCLE',componentIds:ids.filter(id=>!ordered.includes(id)).sort(),edges:[...edgeMap.values()]});
  return{ordered,edges:[...edgeMap.values()],issues};
}
export function validateReleaseUnitManifest(manifest){
  const issues=[];
  if(manifest?.contract!=='shoporation.release-unit-manifest.v1')issues.push({code:'RELEASE_UNIT_MANIFEST_CONTRACT_INVALID'});
  if(!manifest?.releaseUnitId)issues.push({code:'RELEASE_UNIT_ID_REQUIRED'});
  if(!Number.isInteger(manifest?.order)||manifest.order<1)issues.push({code:'RELEASE_UNIT_ORDER_INVALID'});
  if(!Array.isArray(manifest?.intendedFiles)||!manifest.intendedFiles.length)issues.push({code:'RELEASE_UNIT_FILES_REQUIRED'});
  if(!Array.isArray(manifest?.operations)||!manifest.operations.length)issues.push({code:'RELEASE_UNIT_OPERATIONS_REQUIRED'});
  if(manifest?.projectedRisk?.decision!=='PASS')issues.push({code:'RELEASE_UNIT_PROJECTED_RISK_NOT_PASS'});
  const lease=manifest?.targetBaseLease;
  if(!lease||!['EXACT','RECONCILE_AFTER_PREDECESSOR'].includes(lease.mode))issues.push({code:'RELEASE_UNIT_TARGET_BASE_LEASE_INVALID'});
  if(lease?.mode==='EXACT'&&!lease.sha)issues.push({code:'RELEASE_UNIT_TARGET_BASE_SHA_REQUIRED'});
  if(lease?.mode==='RECONCILE_AFTER_PREDECESSOR'&&!lease.predecessorUnitId)issues.push({code:'RELEASE_UNIT_PREDECESSOR_REQUIRED'});
  const intended=new Set(manifest?.intendedFiles??[]);
  for(const operation of manifest?.operations??[]){
    if(!['create','modify','rename','delete'].includes(operation.type))issues.push({code:'RELEASE_UNIT_OPERATION_INVALID',operation});
    if(!operation.path)issues.push({code:'RELEASE_UNIT_OPERATION_PATH_REQUIRED',operation});
    for(const file of releaseOperationFootprint(operation))if(!intended.has(file))issues.push({code:'RELEASE_UNIT_OPERATION_OUTSIDE_SCOPE',file});
    if(operation.type==='rename'&&!operation.sourcePath)issues.push({code:'RELEASE_UNIT_RENAME_SOURCE_REQUIRED',operation});
    if(operation.generatedArtifact&&!['regenerate','sealed'].includes(operation.generatedArtifact.mode))issues.push({code:'RELEASE_UNIT_GENERATED_SEMANTICS_INVALID',file:operation.path});
  }
  return{contract:'shoporation.release-unit-manifest-validation.v1',issues,decision:issues.length?'BLOCK':'PASS'};
}
export function sealReleaseUnitManifest(manifest,{sourceCommit}={}){
  const issues=[];
  if(!sourceCommit)issues.push({code:'RELEASE_UNIT_SOURCE_COMMIT_REQUIRED'});
  const validation=validateReleaseUnitManifest(manifest);issues.push(...validation.issues);
  if(issues.length)return{decision:'BLOCK',issues,manifest:null};
  const sealed=JSON.parse(JSON.stringify(manifest));
  sealed.operations=sealed.operations.map(operation=>{
    if(operation.type==='delete'||operation.generatedArtifact?.mode==='regenerate')return operation;
    const generated=operation.generatedArtifact?.mode==='sealed'?{...operation.generatedArtifact,sourceCommit:operation.generatedArtifact.sourceCommit??sourceCommit}:operation.generatedArtifact;
    return{...operation,sourceCommit:operation.sourceCommit??sourceCommit,...(generated?{generatedArtifact:generated}:{})};
  });
  sealed.materialization={...(sealed.materialization??{}),state:'SEALED',sourceCommit};
  return{decision:'PASS',issues:[],manifest:sealed};
}
export function reconcileReleaseUnitManifest(manifest,{newBaseSha,predecessorUnitId,recomputedUnit}={}){
  const issues=[],lease=manifest?.targetBaseLease??{};
  if(lease.mode!=='RECONCILE_AFTER_PREDECESSOR')issues.push({code:'RELEASE_UNIT_RECONCILIATION_NOT_REQUIRED',mode:lease.mode??null});
  if(!newBaseSha)issues.push({code:'RELEASE_UNIT_RECONCILIATION_BASE_REQUIRED'});
  if(!predecessorUnitId||predecessorUnitId!==lease.predecessorUnitId)issues.push({code:'RELEASE_UNIT_RECONCILIATION_PREDECESSOR_MISMATCH',expected:lease.predecessorUnitId??null,actual:predecessorUnitId??null});
  if(!recomputedUnit||recomputedUnit.projectedRisk?.decision!=='PASS'||recomputedUnit.requiredGates?.decision!=='PASS')issues.push({code:'RELEASE_UNIT_RECONCILIATION_RECOMPUTE_NOT_PASS'});
  if(issues.length)return{decision:'BLOCK',issues,manifest:null};
  const reconciled=JSON.parse(JSON.stringify(manifest));
  reconciled.targetBaseSha=newBaseSha;
  reconciled.targetBaseLease={contract:'shoporation.target-base-lease.v1',mode:'EXACT',sha:newBaseSha,reconciledFrom:{predecessorUnitId,previousMode:lease.mode}};
  reconciled.projectedRisk=recomputedUnit.projectedRisk;
  reconciled.requiredGates=recomputedUnit.requiredGates;
  reconciled.requiredEvidence=recomputedUnit.requiredEvidence;
  reconciled.requiredDependencyFiles=recomputedUnit.requiredDependencyFiles;
  reconciled.authorities=recomputedUnit.authorities;
  reconciled.subsystems=recomputedUnit.subsystems;
  reconciled.expectedPostUnitState=recomputedUnit.expectedPostUnitState;
  reconciled.reconciliationPolicy={...(reconciled.reconciliationPolicy??{}),mode:'EXACT_BASE_AFTER_RECONCILIATION',reconciledPredecessorUnitId:predecessorUnitId,recomputeRequired:true};
  return{decision:'PASS',issues:[],manifest:reconciled};
}
export function decomposeReleaseScope({
  transactionIdentity={},
  parentTransactionIdentity=null,
  baseSha=null,
  files=[],
  operations=[],
  atlas={},
  guardRegistry=null,
  explicitGuardIds=[],
  implementationSkeleton={},
  fileMetadata={},
  plannedDeletions=[],
  forbiddenPatterns=[],
  readOnlyPaths=[],
  atomicEdges=[],
  proofEdges=[],
  prerequisiteEdges=[],
  generatedArtifacts={},
}={}){
  const atlasPaths=new Set((atlas?.nodes??[]).map(node=>node.path)),deletions=new Set((plannedDeletions??[]).map(normalizeReleasePath));
  const explicit=(operations??[]).map(normalizeReleaseOperation),operationPaths=new Set(explicit.flatMap(releaseOperationFootprint));
  const allFiles=[...new Set([...(files??[]).map(normalizeReleasePath),...operationPaths].filter(Boolean))].sort();
  const normalizedOperations=[...explicit];
  for(const file of allFiles)if(!operationPaths.has(file))normalizedOperations.push(normalizeReleaseOperation({
    type:deletions.has(file)?'delete':atlasPaths.has(file)?'modify':'create',
    path:file,
    ...(generatedArtifacts?.[file]?{generatedArtifact:generatedArtifacts[file]}:{}),
  }));
  const forbidden=[...new Set([...(forbiddenPatterns??[]),...(implementationSkeleton?.forbidden??[])])];
  const readOnly=[...new Set(readOnlyPaths??implementationSkeleton?.impactedReadOnly??[])];
  const issues=[];
  for(const operation of normalizedOperations)for(const file of releaseOperationFootprint(operation)){
    if(releasePathMatches(file,forbidden))issues.push({code:'RELEASE_DECOMPOSITION_FORBIDDEN_OPERATION',file,operation:operation.type});
    if(releasePathMatches(file,readOnly))issues.push({code:'RELEASE_DECOMPOSITION_READ_ONLY_OPERATION',file,operation:operation.type});
  }
  if(!allFiles.length)issues.push({code:'RELEASE_DECOMPOSITION_SCOPE_EMPTY'});
  const overallRisk=evaluateReleaseRiskFiles(allFiles);
  const couplingEdges=releaseAtomicEdges({atlas,files:allFiles,operations:normalizedOperations,atomicEdges,proofEdges});
  const components=releaseComponents(allFiles,couplingEdges),componentByFile=new Map();
  for(const component of components)for(const file of component.files)componentByFile.set(file,component.componentId);
  const prereqs=[...(prerequisiteEdges??[])];
  for(const operation of normalizedOperations)for(const dependency of operation.dependsOnFiles??[])prereqs.push({from:dependency,to:operation.path,reason:'operation-dependency'});
  const ordering=releaseComponentOrder(components,componentByFile,prereqs);issues.push(...ordering.issues);
  const byComponent=new Map(components.map(component=>[component.componentId,{...component,projectedRisk:evaluateReleaseRiskFiles(component.files)}]));
  for(const component of byComponent.values())if(component.projectedRisk.decision!=='PASS')issues.push({code:'RELEASE_DECOMPOSITION_ATOMIC_COMPONENT_BLOCKED',componentId:component.componentId,files:component.files,violations:component.projectedRisk.violations});
  if(issues.length)return{contract:'shoporation.release-decomposition.v1',required:overallRisk.decision==='BLOCK',overallRisk,atomicEdges:couplingEdges,atomicComponents:[...byComponent.values()],issues,decision:'FAIL_CLOSED',unitCount:0,manifests:[]};

  const buckets=[];
  for(const componentId of ordering.ordered){
    const component=byComponent.get(componentId),current=buckets.at(-1);
    if(!current){buckets.push({componentIds:[componentId],files:[...component.files]});continue;}
    const candidateFiles=[...new Set([...current.files,...component.files])].sort(),candidateRisk=evaluateReleaseRiskFiles(candidateFiles);
    if(candidateRisk.decision==='PASS'){current.componentIds.push(componentId);current.files=candidateFiles;}
    else buckets.push({componentIds:[componentId],files:[...component.files]});
  }
  const componentUnit=new Map();buckets.forEach((bucket,index)=>bucket.componentIds.forEach(id=>componentUnit.set(id,index)));
  const unitPrerequisites=buckets.map(()=>new Set());
  for(const edge of ordering.edges){
    const from=componentUnit.get(edge.from),to=componentUnit.get(edge.to);
    if(from!==to)unitPrerequisites[to].add(from);
  }
  const atlasByPath=releaseAtlasNodeMap(atlas),taskId=transactionIdentity?.taskId??'DEVELOPMENT-TRANSACTION';
  const manifests=buckets.map((bucket,index)=>{
    const releaseUnitId=`${taskId}-RU-${String(index+1).padStart(2,'0')}`,prior=index>0?`${taskId}-RU-${String(index).padStart(2,'0')}`:null;
    const operationSet=normalizedOperations.filter(operation=>bucket.files.includes(operation.path)||(operation.sourcePath&&bucket.files.includes(operation.sourcePath)));
    const intendedFiles=[...new Set(operationSet.flatMap(releaseOperationFootprint))].sort();
    const projectedRisk=evaluateReleaseRiskFiles(intendedFiles);
    const requiredGates=guardRegistry?compileGateChain({guardRegistry,plannedFiles:intendedFiles,phase:'PLAN',explicitGuardIds}):{contract:'shoporation.gate-chain.v1',phase:'PLAN',orderedGateIds:[],externalGateIds:[],issues:[],decision:'PASS'};
    const dependencies=releaseRequiredDependencies(atlas,intendedFiles,allFiles);
    const proofFiles=releaseProofFiles(atlas,intendedFiles);
    const authorities=[...new Set(intendedFiles.flatMap(file=>fileMetadata?.[file]?.authorities??atlasByPath.get(file)?.authorities??[]))].sort();
    const semanticPrerequisites=[...unitPrerequisites[index]].map(unitIndex=>`${taskId}-RU-${String(unitIndex+1).padStart(2,'0')}`);
    const predecessorUnits=[...new Set([...(prior?[prior]:[]),...semanticPrerequisites])].sort();
    const targetBaseLease=index===0
      ?{contract:'shoporation.target-base-lease.v1',mode:'EXACT',sha:baseSha}
      :{contract:'shoporation.target-base-lease.v1',mode:'RECONCILE_AFTER_PREDECESSOR',sha:null,predecessorUnitId:prior};
    return{
      contract:'shoporation.release-unit-manifest.v1',
      transactionIdentity,
      parentTransactionIdentity:parentTransactionIdentity??transactionIdentity,
      releaseUnitId,
      order:index+1,
      targetBaseSha:index===0?baseSha:null,
      targetBaseLease,
      intendedFiles,
      operations:operationSet,
      requiredDependencyFiles:dependencies,
      authorities,
      subsystems:projectedRisk.subsystems.map(item=>item.subsystem),
      projectedRisk,
      requiredGates,
      requiredEvidence:{proofFiles,externalGuardIds:[...(requiredGates.externalGateIds??[])]},
      forbiddenPaths:forbidden,
      readOnlyPaths:readOnly,
      generatedArtifactSemantics:operationSet.filter(item=>item.generatedArtifact).map(item=>({path:item.path,...item.generatedArtifact})),
      prerequisites:predecessorUnits,
      predecessorUnits,
      materialization:{state:'UNSEALED',sourceCommit:null},
      expectedPostUnitState:{operationCount:operationSet.length,projectedRiskDecision:projectedRisk.decision,requiredGateDecision:requiredGates.decision,requiresSuccessorReconciliation:index<buckets.length-1},
      reconciliationPolicy:index===0
        ?{mode:'EXACT_BASE_REQUIRED',failOnMainDrift:true,recomputeRequired:false}
        :{mode:'RECONCILE_AFTER_PREDECESSOR',predecessorUnitId:prior,failOnMainDrift:true,recomputeRequired:true,recompute:['atlas','projected-risk','gate-chain','required-dependencies']},
    };
  });
  for(const manifest of manifests){
    const validation=validateReleaseUnitManifest(manifest);
    if(validation.decision!=='PASS')for(const issue of validation.issues)issues.push({...issue,releaseUnitId:manifest.releaseUnitId});
    if(manifest.requiredGates?.decision!=='PASS')issues.push({code:'RELEASE_DECOMPOSITION_UNIT_GATE_CHAIN_BLOCK',releaseUnitId:manifest.releaseUnitId,gateIssues:manifest.requiredGates.issues});
  }
  return{
    contract:'shoporation.release-decomposition.v1',
    required:overallRisk.decision==='BLOCK',
    reason:overallRisk.decision==='BLOCK'?'PROJECTED_RELEASE_RISK_BLOCK_DECOMPOSED':'SINGLE_OR_MULTI_UNIT_WITHIN_CANONICAL_BUDGET',
    transactionIdentity,
    parentTransactionIdentity:parentTransactionIdentity??transactionIdentity,
    baseSha,
    overallRisk,
    atomicEdges:couplingEdges,
    prerequisiteEdges:ordering.edges,
    atomicComponents:[...byComponent.values()],
    issues,
    decision:issues.length?'FAIL_CLOSED':'PASS',
    unitCount:issues.length?0:manifests.length,
    manifests:issues.length?[]:manifests,
  };
}

export function deriveImplementationSkeleton({plannedFilePatterns=[],atlasFiles=[],executionRoute={},plannedDeletions=[],forbiddenPatterns=[]}={}){
  const atlasSet=new Set(atlasFiles??[]),deletions=new Set(plannedDeletions??[]);
  const mustCreate=exactPlannedPaths(plannedFilePatterns).filter(file=>!atlasSet.has(file)&&!deletions.has(file));
  const mustEdit=[...new Set([...(executionRoute?.MUST_EDIT??[]),...(executionRoute?.INSTRUCTION_REQUIRED??[])])].filter(file=>!mustCreate.includes(file)).sort();
  const mayEdit=[...new Set(executionRoute?.MAY_EDIT??[])].filter(file=>!mustEdit.includes(file)&&!mustCreate.includes(file)).sort();
  const impactedReadOnly=[...new Set(executionRoute?.IMPACTED_READ_ONLY??[])].filter(file=>!mustEdit.includes(file)&&!mayEdit.includes(file)&&!mustCreate.includes(file)).sort();
  const forbidden=[...new Set([...(executionRoute?.FORBIDDEN_ROUTE_TOMBSTONES??[]),...(executionRoute?.PLANNED_FORBIDDEN_ROUTE_DELETIONS??[]),...(forbiddenPatterns??[])])].sort();
  return{contract:'shoporation.implementation-skeleton.v1',mustEdit,mayEdit,impactedReadOnly,mustCreate,forbidden,proof:[...new Set(executionRoute?.PROOF??[])].sort(),authority:[...new Set(executionRoute?.AUTHORITY??[])].sort(),unknown:[...(executionRoute?.UNKNOWN??[])]};
}
function guardInputPatterns(guard){return [...new Set([...(guard?.verification?.semanticInputs??[]),...(guard?.verification?.configurationInputs??[]),...(guard?.verification?.authorityInputs??[])])];}
export function guardAppliesToFiles(guard,files=[]){
  if(guard?.chain?.alwaysApplicable===true)return true;
  const inputs=guardInputPatterns(guard);
  return (files??[]).some(file=>inputs.some(pattern=>patternsMayOverlap(file,pattern)));
}
export function compileGateChain({guardRegistry,plannedFiles=[],phase='PLAN',explicitGuardIds=[]}={}){
  const guards=(guardRegistry?.guards??[]).filter(item=>item?.blocking===true),byId=new Map(guards.map(item=>[item.id,item])),selected=new Set(),issues=[];
  const products=guardRegistry?.ecosystem?.dataProducts??{};
  const dependenciesFor=guard=>[...new Set([
    ...(guard?.verification?.dependsOn??[]),
    ...(guard?.chain?.consumes??[]).map(input=>products[input]?.producer).filter(producer=>byId.has(producer)&&producer!==guard?.id),
  ])];
  const explicit=new Set(explicitGuardIds??[]);
  for(const guard of guards)if(explicit.has(guard.id)||guardAppliesToFiles(guard,plannedFiles))selected.add(guard.id);
  const queue=[...selected];
  while(queue.length){
    const id=queue.shift(),guard=byId.get(id);
    if(!guard){issues.push({code:'GATE_CHAIN_GUARD_UNKNOWN',guardId:id});continue;}
    if(!guard.chain)issues.push({code:'GATE_CHAIN_CONTRACT_MISSING',guardId:id});
    for(const dep of dependenciesFor(guard)){
      if(!byId.has(dep)){issues.push({code:'GATE_CHAIN_DEPENDENCY_MISSING',guardId:id,dependency:dep});continue;}
      if(!selected.has(dep)){selected.add(dep);queue.push(dep);}
    }
  }
  const producerIssues=[];
  for(const id of selected){
    const guard=byId.get(id);if(!guard?.chain)continue;
    for(const input of guard.chain.consumes??[])if(!products[input]?.producer)producerIssues.push({code:'GATE_CHAIN_INPUT_PRODUCER_MISSING',guardId:id,input});
    for(const output of guard.chain.produces??[])if(products[output]?.producer&&products[output].producer!==id)producerIssues.push({code:'GATE_CHAIN_OUTPUT_PRODUCER_CONFLICT',guardId:id,output,declaredProducer:products[output].producer});
  }
  issues.push(...producerIssues);
  const ordered=[],visiting=new Set(),visited=new Set();
  const visit=id=>{
    if(visited.has(id))return;
    if(visiting.has(id)){issues.push({code:'GATE_CHAIN_DEPENDENCY_CYCLE',guardId:id});return;}
    visiting.add(id);
    const guard=byId.get(id);
    for(const dep of dependenciesFor(guard))if(selected.has(dep))visit(dep);
    visiting.delete(id);visited.add(id);ordered.push(id);
  };
  for(const id of [...selected].sort())visit(id);
  const currentPhaseGateIds=ordered.filter(id=>(byId.get(id)?.chain?.phases??[]).includes(phase));
  const futureGateIds=ordered.filter(id=>!currentPhaseGateIds.includes(id));
  const externalGateIds=ordered.filter(id=>byId.get(id)?.chain?.execution==='external');
  return{contract:'shoporation.gate-chain.v1',phase,orderedGateIds:ordered,currentPhaseGateIds,futureGateIds,externalGateIds,issues,decision:issues.length?'BLOCK':'PASS'};
}

export function parseTemplateFactoryFailures(){
  const source=readFileSync('src/lib/builder/template-factory/knowledge-registry.ts','utf8');
  const matches=[...source.matchAll(/id:'(TF-KF-\d+)'/g)],items=[];
  for(let i=0;i<matches.length;i++){
    const start=matches[i].index,end=i+1<matches.length?matches[i+1].index:source.indexOf(']);',start);
    const s=source.slice(start,end);
    const field=name=>{
      const marker=`${name}:'`,at=s.indexOf(marker);if(at<0)return '';
      let out='',j=at+marker.length;
      for(;j<s.length;j++){const ch=s[j];if(ch==="'"&&s[j-1]!=="\\")break;out+=ch;}
      return out.replaceAll("\\'","'");
    };
    const arr=name=>{const m=s.match(new RegExp(`${name}:\\[([^\\]]*)\\]`));return m?[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]):[];};
    items.push({id:matches[i][1],title:field('title'),symptom:field('symptom'),rootCause:field('rootCause'),invariantIds:arr('invariantIds'),regressionTests:arr('regressionTests')});
  }
  return items;
}
export function getAllFailures(){
  const global=knowledge.knownFailures.map(item=>({...item,provider:'global'}));
  const tf=parseTemplateFactoryFailures().map(item=>({...item,provider:'template-factory',applicability:{mode:'subsystem',subsystems:knowledge.templateFactoryFailureApplicability[item.id]??[]}}));
  return [...global,...tf];
}
export function resolveDevelopmentScope({files=[],task='',forceFull=false}){
  const direct=new Set(),unresolvedFiles=[],intentSubsystems=new Set();let knowledgeInfrastructureChanged=false;
  for(const file of files){
    if(scopePolicy.knowledgeInfrastructurePrefixes.some(prefix=>file.startsWith(prefix))){knowledgeInfrastructureChanged=true;continue;}
    if(isNeutralFile(file))continue;
    const hits=subsystemMatchers.filter(item=>item.matchers.some(matcher=>matcher.test(file)));
    if(!hits.length)unresolvedFiles.push(file);
    for(const hit of hits)direct.add(hit.name);
  }
  const normalizedTask=String(task).toLowerCase();
  for(const matcher of guardPolicy.intentMatchers)if(new RegExp(matcher.pattern,'i').test(normalizedTask))for(const subsystem of matcher.subsystems){intentSubsystems.add(subsystem);direct.add(subsystem);}
  const impacted=new Set(direct),queue=[...direct];
  while(queue.length){const current=queue.shift();for(const dependency of scopePolicy.dependencies[current]??[])if(!impacted.has(dependency)){impacted.add(dependency);queue.push(dependency);}}
  const fullReplay=Boolean(forceFull||knowledgeInfrastructureChanged);
  const globalIds=knowledge.knownFailures.filter(f=>fullReplay||f.applicability.mode==='always'||f.applicability.subsystems.some(s=>impacted.has(s))).map(f=>f.id);
  const tfIds=parseTemplateFactoryFailures().filter(f=>fullReplay||(knowledge.templateFactoryFailureApplicability[f.id]??[]).some(s=>impacted.has(s))).map(f=>f.id);
  const activeFailureIds=[...new Set([...knowledge.globalBaselineFailureIds,...globalIds,...tfIds])];
  return {directSubsystems:[...direct].sort(),intentSubsystems:[...intentSubsystems].sort(),impactedSubsystems:[...impacted].sort(),knowledgeInfrastructureChanged,fullReplay,unresolvedFiles,activeFailureIds};
}
export function resolveDevelopmentBase({changeBaseSha=null}={}){
  const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
  const declared=String(changeBaseSha??'').trim();
  if(declared){
    if(/^0+$/.test(declared))return null;
    try{git(['cat-file','-e',`${declared}^{commit}`]);return declared;}catch{return null;}
  }
  const candidates=[process.env.DEVELOPMENT_BASE_SHA,process.env.QUALITY_BASE_SHA,process.env.RELEASE_BASE_SHA].map(value=>String(value??'').trim()).filter(Boolean);
  for(const candidate of candidates)if(!/^0+$/.test(candidate)){try{git(['cat-file','-e',`${candidate}^{commit}`]);return candidate;}catch{}}
  for(const candidate of ['origin/main','main','HEAD^']){try{git(['cat-file','-e',`${candidate}^{commit}`]);return candidate;}catch{}}
  return null;
}

function gitCommitExists(sha){
  try{execFileSync('git',['cat-file','-e',`${sha}^{commit}`],{stdio:'ignore'});return true;}catch{return false;}
}
function gitIsAncestor(base,head){
  try{execFileSync('git',['merge-base','--is-ancestor',base,head],{stdio:'ignore'});return true;}catch{return false;}
}
export function resolveCanonicalDevelopmentTransactionIdentity({
  plan,
  eventBaseSha='',
  eventHeadSha='',
  commitExists=gitCommitExists,
  isAncestor=gitIsAncestor,
}={}){
  const base=String(plan?.changeBaseSha??'').trim(),eventBase=String(eventBaseSha??'').trim(),head=String(eventHeadSha??'').trim();
  if(!base)return{decision:'BLOCK',code:'CI_TRANSACTION_BASE_REQUIRED',base:null,head:head||null};
  if(!head)return{decision:'BLOCK',code:'CI_TRANSACTION_HEAD_REQUIRED',base,head:null};
  if(eventBase&&eventBase!==base)return{decision:'BLOCK',code:'CI_TRANSACTION_BASE_MISMATCH',base,head,eventBase};
  if(!commitExists(base))return{decision:'BLOCK',code:'CI_TRANSACTION_BASE_UNRESOLVED',base,head,eventBase:eventBase||null};
  if(!commitExists(head))return{decision:'BLOCK',code:'CI_TRANSACTION_HEAD_UNRESOLVED',base,head,eventBase:eventBase||null};
  if(!isAncestor(base,head))return{decision:'BLOCK',code:'CI_TRANSACTION_ANCESTRY_INVALID',base,head,eventBase:eventBase||null};
  return{decision:'PASS',code:null,base,head,eventBase:eventBase||null,authority:'quality/development/active-plan.json#changeBaseSha'};
}

export function parseChangedFileStatus(output){
  const changes=[];
  for(const line of String(output??'').split(/\r?\n/).filter(Boolean)){
    const parts=line.split('\t'),rawStatus=parts[0]??'',status=rawStatus[0]??'';
    if(!['A','C','M','R','D'].includes(status))continue;
    if((status==='R'||status==='C')&&parts.length>=3){
      changes.push({status,rawStatus,previousFile:parts[1],file:parts[2]});
    }else if(parts[1]){
      changes.push({status,rawStatus,file:parts[1]});
    }
  }
  const files=[...new Set(changes.map(change=>change.file))];
  const deletedFiles=[...new Set(changes.filter(change=>change.status==='D').map(change=>change.file))];
  return{changes,files,deletedFiles};
}
export function resolveDevelopmentHead(){
  const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
  const explicitSources=[
    ['DEVELOPMENT_HEAD_SHA',process.env.DEVELOPMENT_HEAD_SHA],
    ['QUALITY_HEAD_SHA',process.env.QUALITY_HEAD_SHA],
    ['SHOPERATION_REPLAY_HEAD',process.env.SHOPERATION_REPLAY_HEAD],
  ];
  const declared=explicitSources.map(([source,value])=>({source,value:String(value??'').trim()})).find(item=>item.value);
  if(declared){
    if(/^0+$/.test(declared.value))return{head:null,resolution:'UNRESOLVED_EXPLICIT',requestedHead:declared.value,source:declared.source};
    try{git(['cat-file','-e',`${declared.value}^{commit}`]);return{head:declared.value,resolution:'EXPLICIT',requestedHead:declared.value,source:declared.source};}
    catch{return{head:null,resolution:'UNRESOLVED_EXPLICIT',requestedHead:declared.value,source:declared.source};}
  }
  const eventPath=String(process.env.GITHUB_EVENT_PATH??'').trim();
  if(eventPath&&existsSync(eventPath))try{
    const event=JSON.parse(readFileSync(eventPath,'utf8')),candidate=String(event?.pull_request?.head?.sha??'').trim();
    if(candidate&&!/^0+$/.test(candidate)){git(['cat-file','-e',`${candidate}^{commit}`]);return{head:candidate,resolution:'PULL_REQUEST_HEAD',requestedHead:candidate,source:'GITHUB_EVENT_PATH'};}
  }catch{}
  const github=String(process.env.GITHUB_SHA??'').trim();
  if(github&&!/^0+$/.test(github)){try{git(['cat-file','-e',`${github}^{commit}`]);return{head:github,resolution:'GITHUB_SHA',requestedHead:github,source:'GITHUB_SHA'};}catch{}}
  return{head:'HEAD',resolution:'LOCAL_HEAD',requestedHead:null,source:'git'};
}
export function getChangedFiles({baseSha=null}={}){
  const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
  const requestedBase=String(baseSha??'').trim();
  const base=resolveDevelopmentBase({changeBaseSha:requestedBase||null});
  const headIdentity=resolveDevelopmentHead();
  const head=headIdentity.head;
  const baseResolution=requestedBase?(base===requestedBase?'DECLARED':'UNRESOLVED'):(base?'FALLBACK':'UNRESOLVED');
  if(!base||!head)return {base:base??null,requestedBase:requestedBase||null,baseResolution,head:head??null,requestedHead:headIdentity.requestedHead??null,headResolution:headIdentity.resolution,headSource:headIdentity.source??null,files:[],deletedFiles:[],materialFiles:[],materialDeletedFiles:[],metadataFiles:[],changes:[]};
  const output=git(['diff','--name-status','--diff-filter=ACMRD',base,head]);
  const parsed=parseChangedFileStatus(output);
  const metadataFiles=parsed.files.filter(isDevelopmentMetadataFile);
  const materialFiles=parsed.files.filter(file=>!isDevelopmentMetadataFile(file));
  const materialDeletedFiles=parsed.deletedFiles.filter(file=>!isDevelopmentMetadataFile(file));
  return {base,requestedBase:requestedBase||null,baseResolution,head,requestedHead:headIdentity.requestedHead??null,headResolution:headIdentity.resolution,headSource:headIdentity.source??null,...parsed,materialFiles,materialDeletedFiles,metadataFiles};
}
export function runVitest(files){
  if(!files.length)return {status:0,stdout:'',stderr:''};
  const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['vitest','run',...files],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return {status:result.status??1,stdout:result.stdout??'',stderr:result.stderr??''};
}
export function ensureFile(file){if(!existsSync(file))throw new Error(`Required file missing: ${file}`);}



if(process.argv.includes('--ci-transaction-self-test')){
  const commitExists=sha=>sha==='base'||sha==='head',isAncestor=(base,head)=>base==='base'&&head==='head';
  const pass=resolveCanonicalDevelopmentTransactionIdentity({plan:{changeBaseSha:'base'},eventBaseSha:'base',eventHeadSha:'head',commitExists,isAncestor});
  const mismatch=resolveCanonicalDevelopmentTransactionIdentity({plan:{changeBaseSha:'base'},eventBaseSha:'other',eventHeadSha:'head',commitExists,isAncestor});
  const ancestry=resolveCanonicalDevelopmentTransactionIdentity({plan:{changeBaseSha:'base'},eventHeadSha:'head',commitExists,isAncestor:()=>false});
  const ok=pass.decision==='PASS'&&mismatch.code==='CI_TRANSACTION_BASE_MISMATCH'&&ancestry.code==='CI_TRANSACTION_ANCESTRY_INVALID';
  console.log(`Development CI transaction self-test: ${ok?'PASS':'FAIL'}`);
  if(!ok)process.exitCode=1;
}

if(process.argv.includes('--ci-transaction-env')){
  const activePlan=readJson('quality/development/active-plan.json');
  const identity=resolveCanonicalDevelopmentTransactionIdentity({
    plan:activePlan,
    eventBaseSha:process.env.CI_EVENT_BASE_SHA,
    eventHeadSha:process.env.CI_EVENT_HEAD_SHA??process.env.GITHUB_SHA,
  });
  if(identity.decision!=='PASS'){
    console.error(`${identity.code}: canonical Development Transaction identity is invalid; planBase=${identity.base??'null'} eventBase=${identity.eventBase??'null'} head=${identity.head??'null'}`);
    process.exit(1);
  }
  for(const name of ['QUALITY_BASE_SHA','DEVELOPMENT_BASE_SHA','RELEASE_BASE_SHA'])console.log(`${name}=${identity.base}`);
  for(const name of ['QUALITY_HEAD_SHA','DEVELOPMENT_HEAD_SHA','RELEASE_HEAD_SHA','SHOPERATION_REPLAY_HEAD'])console.log(`${name}=${identity.head}`);
  console.log(`SHOPERATION_CANONICAL_BASE_SHA=${identity.base}`);
  console.log(`SHOPERATION_CANONICAL_HEAD_SHA=${identity.head}`);
  process.exit(0);
}

if(process.argv.includes('--exception-self-test')){
  const first={ruleId:'DEV-REVIEW-X',file:'src/a.ts',line:1,code:'x',message:'review'};
  const second={...first,file:'src/b.ts'};
  const fp=guardFindingFingerprint(first);
  const exact=matchGuardException(first,[{ruleId:first.ruleId,file:first.file,findingFingerprint:fp,reason:'intentional'}]);
  const unrelated=matchGuardException(second,[{ruleId:first.ruleId,file:first.file,findingFingerprint:fp,reason:'intentional'}]);
  const ok=exact.exception?.reason==='intentional'&&unrelated.exception===null&&exact.findingFingerprint!==unrelated.findingFingerprint;
  console.log(`Development exception self-test: ${ok?'PASS':'FAIL'}`);
  if(!ok)process.exitCode=1;
}

if(process.argv.includes('--decision-self-test')){
  const ok=aggregateGateDecision({childDecisions:['PASS','PASS']})==='PASS'
    &&aggregateGateDecision({childDecisions:['PASS','BLOCK']})==='BLOCK'
    &&aggregateGateDecision({localBlocking:true,childDecisions:['PASS']})==='BLOCK'
    &&aggregateGateDecision({childDecisions:['UNKNOWN']})==='BLOCK';
  console.log(`Development decision self-test: ${ok?'PASS':'FAIL'}`);
  if(!ok)process.exitCode=1;
}

if(process.argv.includes('--change-status-self-test')){
  const parsed=parseChangedFileStatus([
    'M\tsrc/modified.ts',
    'D\tsrc/deleted.ts',
    'R100\tsrc/old.ts\tsrc/new.ts',
    'A\tsrc/added.ts',
  ].join('\n'));
  const ok=JSON.stringify(parsed.files)===JSON.stringify(['src/modified.ts','src/deleted.ts','src/new.ts','src/added.ts'])
    &&JSON.stringify(parsed.deletedFiles)===JSON.stringify(['src/deleted.ts'])
    &&parsed.changes.find(item=>item.status==='R')?.previousFile==='src/old.ts';
  console.log(`Development change-status self-test: ${ok?'PASS':'FAIL'}`);
  if(!ok)process.exitCode=1;
}
