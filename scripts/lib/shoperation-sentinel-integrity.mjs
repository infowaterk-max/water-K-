const BLOCKING=new Set(['BLOCK','FAIL','FAILED','FAILURE','STALE','CONFLICT','UNRESOLVED','UNKNOWN']);
const SUCCESS=new Set(['PASS','SUCCESS','SUCCEEDED','COMPLETED']);
const asArray=value=>Array.isArray(value)?value:[];
const norm=value=>String(value??'').trim().toUpperCase();
const unique=value=>[...new Set(value)];
const requiredStrength=req=>Number(req?.claimScope?.strength??req?.claimScope?.scopeStrength??0)||0;
const add=(findings,code,category,severity,reason,evidence={})=>findings.push({code,category,severity,reason,evidence});

function graphFindings(guards,findings){
  const byId=new Map(guards.filter(g=>g?.id).map(g=>[g.id,g]));
  const responsibility=new Map();
  for(const guard of guards){
    if(!guard?.blocking||!guard?.responsibilityKey)continue;
    const list=responsibility.get(guard.responsibilityKey)||[];
    list.push(guard.id);
    responsibility.set(guard.responsibilityKey,list);
  }
  for(const [responsibilityKey,ids] of responsibility)if(ids.length>1)add(
    findings,'SENTINEL_INTEGRITY_DUPLICATE_BLOCKING_RESPONSIBILITY','authority','action',
    `Blocking responsibility ${responsibilityKey} has multiple owners.`,{responsibilityKey,guardIds:ids.sort()}
  );

  const adjacency=new Map();
  for(const guard of guards){
    if(!guard?.id)continue;
    const deps=asArray(guard.verification?.dependsOn).filter(Boolean);
    adjacency.set(guard.id,deps.filter(id=>byId.has(id)));
    for(const dependencyId of deps)if(!byId.has(dependencyId))add(
      findings,'SENTINEL_INTEGRITY_UNKNOWN_GUARD_DEPENDENCY','dependency','action',
      `${guard.id} depends on unknown guard ${dependencyId}.`,{guardId:guard.id,dependencyId}
    );
  }

  const state=new Map(),stack=[],emitted=new Set();
  const visit=id=>{
    const current=state.get(id)??0;
    if(current===2)return;
    if(current===1){
      const at=stack.indexOf(id),cycle=[...stack.slice(at),id];
      const key=cycle.slice(0,-1).sort().join('|');
      if(!emitted.has(key)){
        emitted.add(key);
        add(findings,'SENTINEL_INTEGRITY_GUARD_DEPENDENCY_CYCLE','dependency','action','Guard dependency graph contains a cycle.',{cycle});
      }
      return;
    }
    state.set(id,1);stack.push(id);
    for(const dep of adjacency.get(id)??[])visit(dep);
    stack.pop();state.set(id,2);
  };
  for(const id of adjacency.keys())visit(id);
}

function proofSemanticFindings(guards,plan,findings){
  const byId=new Map(guards.filter(g=>g?.id).map(g=>[g.id,g]));
  for(const requirement of asArray(plan?.completionContract?.requirements)){
    const refs=unique([
      ...asArray(requirement?.evidence?.implementation),
      ...asArray(requirement?.evidence?.outcome),
      ...asArray(requirement?.forbiddenRegressions).flatMap(item=>asArray(item?.evidence)),
    ].filter(Boolean));
    if(!refs.length){
      add(findings,'SENTINEL_INTEGRITY_COMPLETION_EVIDENCE_MISSING','proof-semantics','action',
        `${requirement?.id??'unknown requirement'} has no evidence references.`,{requirementId:requirement?.id??null});
      continue;
    }
    const semantics=[];
    for(const guardId of refs){
      const guard=byId.get(guardId);
      if(!guard){
        add(findings,'SENTINEL_INTEGRITY_COMPLETION_GUARD_UNKNOWN','proof-semantics','action',
          `${requirement?.id??'unknown requirement'} references unknown guard ${guardId}.`,{requirementId:requirement?.id??null,guardId});
        continue;
      }
      const semantic=guard.proofSemantics;
      if(!semantic){
        add(findings,'SENTINEL_INTEGRITY_PROOF_SEMANTICS_UNKNOWN','proof-semantics','review',
          `${guardId} is referenced by completion evidence but has no declared proof semantics.`,{requirementId:requirement?.id??null,guardId});
        continue;
      }
      semantics.push({guardId,...semantic});
      const capabilities=new Set(asArray(semantic.capabilities));
      const requiredCapabilities=asArray(requirement?.requiredCapabilities);
      if(requiredCapabilities.length&&!capabilities.has('*')&&!requiredCapabilities.every(cap=>capabilities.has(cap)))add(
        findings,'SENTINEL_INTEGRITY_PROOF_CAPABILITY_DRIFT','proof-semantics','action',
        `${guardId} no longer proves all capabilities required by ${requirement?.id??'the completion claim'}.`,
        {requirementId:requirement?.id??null,guardId,requiredCapabilities,actualCapabilities:[...capabilities]}
      );
    }
    const required=requiredStrength(requirement);
    const proven=Math.max(0,...semantics.map(item=>Number(item.scopeStrength??0)||0));
    if(required>proven)add(findings,'SENTINEL_INTEGRITY_PROOF_SCOPE_OVERCLAIM','proof-semantics','action',
      `${requirement?.id??'Completion claim'} requires scope strength ${required} but current referenced guards prove at most ${proven}.`,
      {requirementId:requirement?.id??null,requiredScopeStrength:required,provenScopeStrength:proven,guardIds:refs});
    const requiredDimensions=unique(asArray(requirement?.claimScope?.dimensions));
    const provenDimensions=new Set(semantics.flatMap(item=>asArray(item.dimensions)));
    const missingDimensions=requiredDimensions.filter(dimension=>!provenDimensions.has(dimension));
    if(missingDimensions.length)add(findings,'SENTINEL_INTEGRITY_PROOF_DIMENSION_DRIFT','proof-semantics','action',
      `${requirement?.id??'Completion claim'} has proof dimensions that are no longer covered by its evidence producers.`,
      {requirementId:requirement?.id??null,missingDimensions,provenDimensions:[...provenDimensions].sort(),guardIds:refs});
  }
}

function evidenceFindings(records,findings){
  for(const record of asArray(records)){
    const id=record?.id??'unnamed-evidence';
    const parent=norm(record?.parentDecision??record?.decision);
    const children=asArray(record?.childDecisions).map(norm).filter(Boolean);
    const blockingChildren=children.filter(value=>BLOCKING.has(value));
    if(SUCCESS.has(parent)&&blockingChildren.length)add(findings,'SENTINEL_INTEGRITY_STATUS_LAUNDERING','decision','action',
      `${id} reports ${parent} while child evidence is blocking.`,{id,parentDecision:parent,blockingChildDecisions:blockingChildren});

    const workflow=norm(record?.workflowOutcome),artifact=norm(record?.artifactDecision);
    if(SUCCESS.has(workflow)&&BLOCKING.has(artifact))add(findings,'SENTINEL_INTEGRITY_PRODUCER_WORKFLOW_MISMATCH','decision','action',
      `${id} has successful workflow outcome but blocking producer artifact.`,{id,workflowOutcome:workflow,artifactDecision:artifact});

    const transaction=record?.transaction??{};
    const declaredBase=transaction.declaredBase??record?.declaredBase??null,evaluatedBase=transaction.evaluatedBase??record?.evaluatedBase??null;
    const declaredHead=transaction.declaredHead??record?.declaredHead??null,evaluatedHead=transaction.evaluatedHead??record?.evaluatedHead??null;
    const baseResolution=norm(transaction.baseResolution??record?.baseResolution),headResolution=norm(transaction.headResolution??record?.headResolution);
    const unresolved=baseResolution.includes('UNRESOLVED')||headResolution.includes('UNRESOLVED');
    const mismatch=Boolean((declaredBase&&evaluatedBase&&declaredBase!==evaluatedBase)||(declaredHead&&evaluatedHead&&declaredHead!==evaluatedHead));
    if(unresolved||mismatch)add(findings,'SENTINEL_INTEGRITY_TRANSACTION_IDENTITY_DRIFT','provenance','action',
      `${id} evidence does not resolve to its declared development transaction identity.`,
      {id,declaredBase,evaluatedBase,declaredHead,evaluatedHead,baseResolution:baseResolution||null,headResolution:headResolution||null});

    const deleted=unique(asArray(record?.deletedFiles)),observed=new Set(asArray(record?.observedFiles));
    const missingDeleted=deleted.filter(file=>!observed.has(file));
    if(missingDeleted.length)add(findings,'SENTINEL_INTEGRITY_DELETION_VISIBILITY_DRIFT','coverage','action',
      `${id} omits declared deletions from observed material change coverage.`,{id,missingDeleted});

    const coverage=record?.coverage??{},expected=Number(coverage.expected??record?.expectedCoverage),observedCount=Number(coverage.observed??record?.observedCoverage);
    const truncated=coverage.truncated===true||record?.truncated===true;
    if(truncated||(Number.isFinite(expected)&&Number.isFinite(observedCount)&&observedCount<expected))add(
      findings,'SENTINEL_INTEGRITY_COVERAGE_INCOMPLETE','coverage','action',
      `${id} reports incomplete or truncated evidence coverage.`,
      {id,expected:Number.isFinite(expected)?expected:null,observed:Number.isFinite(observedCount)?observedCount:null,truncated}
    );

    const state=norm(record?.state);
    if(state==='UNKNOWN'||state==='MISSING'||state==='UNAVAILABLE')add(findings,'SENTINEL_INTEGRITY_EVIDENCE_UNKNOWN','freshness','review',
      `${id} integrity evidence is ${state} and cannot be treated as clean.`,{id,state});
  }
}

export function evaluateSentinelIntegrity({sourceCommit=null,guardRegistry,plan,evidenceRecords=[]}={}){
  const findings=[];
  if(guardRegistry?.contract!=='shoporation.guard-registry.v1')add(findings,'SENTINEL_INTEGRITY_GUARD_REGISTRY_INVALID','authority','action',
    'Guard Registry contract is missing or invalid.',{actual:guardRegistry?.contract??null});
  if(plan?.contract!=='shoporation.development-plan.v1')add(findings,'SENTINEL_INTEGRITY_DEVELOPMENT_PLAN_INVALID','proof-semantics','review',
    'Active Development Plan contract is missing or invalid.',{actual:plan?.contract??null});
  const guards=asArray(guardRegistry?.guards);
  graphFindings(guards,findings);
  proofSemanticFindings(guards,plan,findings);
  evidenceFindings(evidenceRecords,findings);
  const actionCount=findings.filter(item=>item.severity==='action').length,reviewCount=findings.filter(item=>item.severity==='review').length;
  const decision=actionCount?'BLOCK':reviewCount?'REVIEW':'PASS';
  return{
    contract:'shoporation.sentinel-integrity-report.v1',sourceCommit,generatedAt:new Date().toISOString(),decision,
    authority:false,blocking:false,autoMutationAllowed:false,
    counts:{findings:findings.length,action:actionCount,review:reviewCount},
    categories:[...new Set(findings.map(item=>item.category))].sort(),findings,
  };
}
