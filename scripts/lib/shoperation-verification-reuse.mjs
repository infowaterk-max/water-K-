import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {globToRegExp} from './shoperation-development-runtime.mjs';

const CHECKPOINT_CONTRACT='shoporation.verification-checkpoint.v1';
const PLAN_CONTRACT='shoporation.resumable-verification-plan.v1';
const MANIFEST_CONTRACT='shoporation.exact-head-evidence-manifest.v1';
const ENGINE_SCHEMA_VERSION='shoporation.verification-reuse.v1';
const PASS_STATES=new Set(['pass','passed','success','succeeded','ok','green']);
const normalizeStatus=value=>String(value??'').trim().toLowerCase().replaceAll(' ','_');
const uniq=values=>[...new Set(values)];
const sorted=values=>[...values].sort();

export function canonicalJson(value){
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
export function sha256(value){return createHash('sha256').update(Buffer.isBuffer(value)?value:String(value)).digest('hex');}
export function digestObject(value){return sha256(canonicalJson(value));}

function git(args,{allowFailure=false}={}){
  try{return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
  catch(error){if(allowFailure)return '';throw error;}
}
function currentHead(){return process.env.SHOPERATION_REPLAY_HEAD?.trim()||process.env.GITHUB_SHA?.trim()||git(['rev-parse','HEAD']);}
function currentBranch(){return process.env.SHOPERATION_REPLAY_BRANCH?.trim()||process.env.GITHUB_HEAD_REF?.trim()||process.env.GITHUB_REF_NAME?.trim()||git(['rev-parse','--abbrev-ref','HEAD']);}
export function trackedWorkspaceDirty(){return Boolean(git(['status','--porcelain','--untracked-files=no'],{allowFailure:true}));}
function trackedFiles(){const out=git(['ls-files','-z']);return out?out.split('\0').filter(Boolean):[];}
function isAncestor(ancestor,head){if(!ancestor||!head)return false;try{execFileSync('git',['merge-base','--is-ancestor',ancestor,head],{stdio:'ignore'});return true;}catch{return false;}}
function changedFilesBetween(base,head){if(!base||!head)return [];const out=git(['diff','--name-only','--diff-filter=ACMRD',base,head],{allowFailure:true});return out?out.split(/\r?\n/).filter(Boolean):[];}
function diffTextBetween(base,head,file){if(!base||!head||!file)return '';return git(['diff','--unified=0',base,head,'--',file],{allowFailure:true});}

export function classifySemanticUnits({registry,changedFiles=[],base=null,head=null,diffByFile={}}={}){
  const units=registry?.verificationReuse?.semanticUnits??[],parents=units.filter(unit=>Array.isArray(unit.filePatterns)&&unit.filePatterns.length&&unit.kind!=='page'&&unit.kind!=='template-wide');
  const children=units.filter(unit=>unit.parent&&unit.diffPattern),results=[];
  for(const file of changedFiles){
    const matchedParents=parents.filter(unit=>matchPatterns(file,unit.filePatterns));
    for(const parent of matchedParents){
      if(parent.allowPageNarrowing){
        const diff=String(diffByFile[file]??(base&&head?diffTextBetween(base,head,file):''));
        const childMatches=children.filter(unit=>unit.parent===parent.id&&new RegExp(unit.diffPattern,'i').test(diff));
        const wide=childMatches.filter(unit=>unit.kind==='template-wide');
        const pages=childMatches.filter(unit=>unit.kind==='page');
        if(wide.length){for(const unit of wide)results.push({...unit,file,parentId:parent.id,narrowed:true});continue;}
        if(pages.length===1){results.push({...pages[0],file,parentId:parent.id,narrowed:true});continue;}
      }
      results.push({...parent,file,narrowed:false});
    }
  }
  const byId=new Map();
  for(const item of results){const prior=byId.get(item.id);if(prior)prior.files=uniq([...prior.files,item.file]);else byId.set(item.id,{id:item.id,kind:item.kind,scope:item.scope,impactTier:Number(item.impactTier??2),reason:item.reason??null,pageType:item.pageType??null,parentId:item.parentId??null,narrowed:item.narrowed===true,files:[item.file]});}
  return [...byId.values()].sort((a,b)=>a.id.localeCompare(b.id));
}

export function matchPatterns(file,patterns=[]){return patterns.some(pattern=>globToRegExp(pattern).test(file));}
export function hashMatchedFiles(patterns=[],files=trackedFiles()){
  const matched=sorted(files.filter(file=>matchPatterns(file,patterns)&&existsSync(file)));
  const hash=createHash('sha256');
  for(const file of matched){hash.update(file);hash.update('\0');hash.update(readFileSync(file));hash.update('\0');}
  return{hash:hash.digest('hex'),files:matched};
}
function producerFile(producer){const value=String(producer??'').trim();return value.includes('/')&&existsSync(value)?[value]:[];}
function environmentFingerprint(keys=[]){
  const values={};
  for(const key of sorted(keys))values[key]=String(process.env[key]??'');
  return digestObject(values);
}
function componentReasons(previous,current){
  const reasons=[];
  const pairs=[
    ['gate-version-change','gateVersionHash'],['semantic-input-change','semanticInputHash'],
    ['implementation-change','implementationHash'],['authority-change','authorityHash'],
    ['config-change','configurationHash'],['toolchain-change','toolchainHash'],
    ['environment-change','environmentHash'],['context-change','contextHash'],
    ['dependency-change','dependencyFingerprint'],
  ];
  for(const pair of pairs)if(previous?.[pair[1]]!==current?.[pair[1]])reasons.push(pair[0]);
  return reasons;
}
function verificationConfig(registry,gate){
  const root=registry.verificationReuse??{},local=gate.verification??{};
  return{
    reusePolicy:local.reusePolicy??'safe',
    dependsOn:uniq(local.dependsOn??[]),
    semanticInputs:uniq(local.semanticInputs??[]),
    implementationInputs:uniq([...(local.implementationInputs??[]),...producerFile(gate.producer)]),
    authorityInputs:uniq([...(root.globalAuthorityInputs??[]),...(local.authorityInputs??[])]),
    configurationInputs:uniq(local.configurationInputs??[]),
    toolchainInputs:uniq([...(root.globalToolchainInputs??[]),...(local.toolchainInputs??[])]),
    environmentKeys:uniq([...(root.globalEnvironmentKeys??[]),...(local.environmentKeys??[])]),
    context:local.context??{},
    impactTier:Number(local.impactTier??2),
    shadowComparable:local.shadowComparable!==false,
    knownFailureConsumer:local.knownFailureConsumer===true,
  };
}

export function validateVerificationGraph(registry){
  const issues=[],gates=(registry.guards??[]).filter(g=>g.blocking!==false),ids=new Set(gates.map(g=>g.id));
  const visiting=new Set(),visited=new Set(),byId=new Map(gates.map(g=>[g.id,g]));
  const visit=id=>{
    if(visited.has(id))return;
    if(visiting.has(id)){issues.push({code:'VERIFICATION_GRAPH_CYCLE',gateId:id});return;}
    visiting.add(id);
    const gate=byId.get(id);
    if(gate){
      for(const dep of verificationConfig(registry,gate).dependsOn){
        if(!ids.has(dep))issues.push({code:'VERIFICATION_GRAPH_UNKNOWN_DEPENDENCY',gateId:id,dependency:dep});
        else visit(dep);
      }
    }
    visiting.delete(id);visited.add(id);
  };
  for(const gate of gates){if(!gate.verification)issues.push({code:'VERIFICATION_METADATA_MISSING',gateId:gate.id});visit(gate.id);}
  return{ok:issues.length===0,issues};
}

export function buildRepositorySnapshot({registry,head=currentHead(),branch=currentBranch(),files=trackedFiles(),gateScope=[]}={}){
  const graphValidation=validateVerificationGraph(registry),root=registry.verificationReuse??{};
  const scopedIds=Array.isArray(gateScope)&&gateScope.length?new Set(gateScope):null;
  const gateMap=new Map((registry.guards??[]).filter(g=>g.blocking!==false&&(!scopedIds||scopedIds.has(g.id))).map(g=>[g.id,g])),direct=new Map();
  for(const [id,gate] of gateMap){
    const cfg=verificationConfig(registry,gate);
    const semantic=hashMatchedFiles(cfg.semanticInputs,files),implementation=hashMatchedFiles(cfg.implementationInputs,files);
    const authority=hashMatchedFiles(cfg.authorityInputs,files),configuration=hashMatchedFiles(cfg.configurationInputs,files);
    const toolchain=hashMatchedFiles(cfg.toolchainInputs,files);
    direct.set(id,{
      gateId:id,reusePolicy:cfg.reusePolicy,dependsOn:cfg.dependsOn,impactTier:cfg.impactTier,
      shadowComparable:cfg.shadowComparable,knownFailureConsumer:cfg.knownFailureConsumer,
      gateVersionHash:digestObject({id:gate.id,producer:gate.producer,responsibilityKey:gate.responsibilityKey,verification:gate.verification}),
      semanticInputHash:semantic.hash,implementationHash:implementation.hash,authorityHash:authority.hash,
      configurationHash:configuration.hash,toolchainHash:toolchain.hash,environmentHash:environmentFingerprint(cfg.environmentKeys),
      contextHash:digestObject(cfg.context),
      matchedFiles:{semantic:semantic.files,implementation:implementation.files,authority:authority.files,configuration:configuration.files,toolchain:toolchain.files},
    });
  }
  const memo=new Map(),resolving=new Set();
  const resolve=id=>{
    if(memo.has(id))return memo.get(id);
    const item=direct.get(id);if(!item)return null;
    if(resolving.has(id)){
      const dependencyFingerprint=digestObject({invalidGraph:true,gateId:id});
      return{...item,dependencyFingerprint,fingerprint:digestObject({schemaVersion:root.schemaVersion??ENGINE_SCHEMA_VERSION,gateId:id,invalidGraph:true,dependencyFingerprint})};
    }
    resolving.add(id);
    const deps=graphValidation.ok?item.dependsOn.map(dep=>resolve(dep)).filter(Boolean).map(dep=>({gateId:dep.gateId,fingerprint:dep.fingerprint})).sort((a,b)=>a.gateId.localeCompare(b.gateId)):[];
    resolving.delete(id);
    const dependencyFingerprint=graphValidation.ok?digestObject(deps):digestObject({invalidGraph:true,issues:graphValidation.issues});
    const fingerprint=digestObject({
      schemaVersion:root.schemaVersion??ENGINE_SCHEMA_VERSION,gateId:item.gateId,reusePolicy:item.reusePolicy,
      gateVersionHash:item.gateVersionHash,semanticInputHash:item.semanticInputHash,implementationHash:item.implementationHash,
      authorityHash:item.authorityHash,configurationHash:item.configurationHash,toolchainHash:item.toolchainHash,
      environmentHash:item.environmentHash,contextHash:item.contextHash,dependencyFingerprint,
    });
    const out={...item,dependencyFingerprint,fingerprint};memo.set(id,out);return out;
  };
  const gates={};for(const id of gateMap.keys())gates[id]=resolve(id);
  const coveredPatterns=[];
  for(const gate of gateMap.values()){
    const cfg=verificationConfig(registry,gate);
    coveredPatterns.push(...cfg.semanticInputs,...cfg.implementationInputs,...cfg.authorityInputs,...cfg.configurationInputs,...cfg.toolchainInputs);
  }
  return{schemaVersion:root.schemaVersion??ENGINE_SCHEMA_VERSION,head,branch,graphValid:graphValidation.ok,graphIssues:graphValidation.issues,gates,coveredPatterns:uniq(coveredPatterns),nonSemanticPatterns:uniq(root.nonSemanticPatterns??[]),promotionPolicy:root.promotion??{},executionMode:String(root.mode??'shadow').toUpperCase()};
}

export function checkpointPayload(checkpoint){const copy={...checkpoint};delete copy.checksum;return copy;}
export function checkpointChecksum(checkpoint){return digestObject(checkpointPayload(checkpoint));}
export function validateCheckpoint(checkpoint,{branch,head,requireAncestor=true}={}){
  const issues=[];
  if(!checkpoint||typeof checkpoint!=='object')issues.push({code:'CHECKPOINT_MISSING'});
  else{
    if(checkpoint.contract!==CHECKPOINT_CONTRACT)issues.push({code:'CHECKPOINT_CONTRACT_INVALID'});
    if(checkpoint.complete!==true)issues.push({code:'CHECKPOINT_INCOMPLETE'});
    if(!checkpoint.checksum||checkpoint.checksum!==checkpointChecksum(checkpoint))issues.push({code:'CHECKPOINT_CHECKSUM_INVALID'});
    if(branch&&checkpoint.branch!==branch)issues.push({code:'CHECKPOINT_BRANCH_MISMATCH',expected:branch,actual:checkpoint.branch});
    if(requireAncestor&&checkpoint.sourceCommit&&head&&!isAncestor(checkpoint.sourceCommit,head))issues.push({code:'CHECKPOINT_NOT_ANCESTOR',sourceCommit:checkpoint.sourceCommit,head});
  }
  return{ok:issues.length===0,issues};
}
export function loadCheckpoint(path){
  if(!path||!existsSync(path))return{checkpoint:null,validation:{ok:false,issues:[{code:'CHECKPOINT_MISSING'}]}};
  try{return{checkpoint:JSON.parse(readFileSync(path,'utf8')),validation:null};}
  catch(error){return{checkpoint:null,validation:{ok:false,issues:[{code:'CHECKPOINT_CORRUPTED',message:String(error)}]}};}
}

export function planFromSnapshots({current,previousCheckpoint=null,checkpointValidation={ok:false,issues:[{code:'CHECKPOINT_MISSING'}]},changedFiles=[],dirty=false,activeFailureIds=[],forceFullRequested=false,semanticImpact=[]}){
  const reasons=[],gates={};let forceFull=false;
  if(forceFullRequested){forceFull=true;reasons.push('force-full-verification');}
  if(dirty){forceFull=true;reasons.push('dirty-workspace');}
  if(!current.graphValid){forceFull=true;reasons.push('verification-graph-invalid');}
  if(!checkpointValidation.ok){forceFull=true;reasons.push(...checkpointValidation.issues.map(issue=>String(issue.code).toLowerCase()));}
  const uncovered=changedFiles.filter(file=>!matchPatterns(file,current.coveredPatterns)&&!matchPatterns(file,current.nonSemanticPatterns));
  if(uncovered.length){forceFull=true;reasons.push('unknown-dependency');}
  const previousGates=previousCheckpoint?.gates??{};
  for(const [gateId,identity] of Object.entries(current.gates)){
    const prior=previousGates[gateId];let state='REUSABLE',gateReasons=[];
    if(forceFull){state='UNKNOWN';gateReasons=['full-verification-fallback'];}
    else if(identity.reusePolicy==='never'){state='INVALIDATED';gateReasons=['gate-non-reusable'];}
    else if(!prior){state='UNKNOWN';gateReasons=['previous-evidence-missing'];}
    else if(!PASS_STATES.has(normalizeStatus(prior.status))){state='UNKNOWN';gateReasons=['previous-evidence-not-pass'];}
    else if(!prior.fingerprint){state='UNKNOWN';gateReasons=['previous-fingerprint-missing'];}
    else if(prior.fingerprint!==identity.fingerprint){state='INVALIDATED';gateReasons=componentReasons(prior,identity);if(!gateReasons.length)gateReasons=['fingerprint-mismatch'];}
    gates[gateId]={gateId,state,action:state==='REUSABLE'?'REUSE':'RERUN',reasons:gateReasons,identity,previous:prior??null};
  }
  if(!forceFull&&previousCheckpoint){
    if(canonicalJson(sorted(activeFailureIds))!==canonicalJson(sorted(previousCheckpoint.activeFailureIds??[]))){
      for(const gate of Object.values(gates))if(gate.identity.knownFailureConsumer&&gate.action==='REUSE'){
        gate.state='INVALIDATED';gate.action='RERUN';gate.reasons.push('known-failure-scope-change');
      }
    }
    let changed=true;
    while(changed){
      changed=false;
      for(const gate of Object.values(gates)){
        if(gate.action==='RERUN')continue;
        const dep=gate.identity.dependsOn.find(id=>gates[id]?.action==='RERUN');
        if(dep){gate.state='INVALIDATED';gate.action='RERUN';gate.reasons.push('dependency-invalidated:'+dep);changed=true;}
      }
    }
  }
  const values=Object.values(gates),reusable=values.filter(g=>g.action==='REUSE'),rerun=values.filter(g=>g.action==='RERUN');
  const invalidated=values.filter(g=>g.state==='INVALIDATED'),uncertain=values.filter(g=>g.state==='UNKNOWN');
  const tierDrivers=rerun.filter(g=>!g.reasons.includes('gate-non-reusable'));
  const semanticTier=semanticImpact.length?Math.max(...semanticImpact.map(unit=>Number(unit.impactTier??0))):0;
  const gateTier=tierDrivers.length?Math.max(...tierDrivers.map(g=>g.identity.impactTier||2)):0;
  const replayTier=forceFull?4:Math.min(4,Math.max(semanticTier,gateTier));
  const verificationMode=forceFull?'FULL':previousCheckpoint?(reusable.length?'RESUMED':'INCREMENTAL'):'FULL';
  const downstream=values.filter(g=>g.reasons.some(reason=>reason.startsWith('dependency-invalidated:'))).map(g=>g.gateId);
  const authorityChanged=values.filter(g=>g.reasons.includes('authority-change')).map(g=>g.gateId);
  const configChanged=values.filter(g=>g.reasons.includes('config-change')||g.reasons.includes('environment-change')||g.reasons.includes('toolchain-change')).map(g=>g.gateId);
  const semanticChanged=semanticImpact.length?semanticImpact.map(unit=>unit.id):values.filter(g=>g.reasons.includes('semantic-input-change')||g.reasons.includes('implementation-change')||g.reasons.includes('gate-version-change')).map(g=>g.gateId);
  const proofScopes=semanticImpact.map(unit=>({unitId:unit.id,scope:unit.scope,files:unit.files,pageType:unit.pageType,narrowed:unit.narrowed,reason:unit.reason}));
  return{
    contract:PLAN_CONTRACT,schemaVersion:current.schemaVersion,verificationMode,executionMode:current.executionMode??'SHADOW',replayTier,promotionPolicy:current.promotionPolicy??{},
    replayTierName:['Evidence Reuse','Local Replay','Dependency Replay','Subsystem Replay','Full Verification'][replayTier],
    sourceRevision:current.head,branch:current.branch,checkpointSourceCommit:previousCheckpoint?.sourceCommit??null,
    changedFiles,uncoveredChangedFiles:uncovered,activeFailureIds:sorted(activeFailureIds),reasons:uniq(reasons),
    reusableEvidenceSet:reusable.map(g=>g.gateId),invalidatedEvidenceSet:invalidated.map(g=>g.gateId),
    uncertainEvidenceSet:uncertain.map(g=>g.gateId),rerunSet:rerun.map(g=>g.gateId),
    evidence:{reused:reusable.length,rerun:rerun.length,invalidated:invalidated.length,unknown:uncertain.length,total:values.length},
    changeImpactSet:{
      changedFiles,changedSemanticUnits:semanticChanged,semanticImpact,proofScopes,changedAuthorities:authorityChanged,changedConfigurationUnits:configChanged,
      changedRuntimeInputs:changedFiles.filter(file=>file.startsWith('src/')||file.startsWith('public/')),
      changedProofInputs:invalidated.map(g=>g.gateId),affectedGates:rerun.map(g=>g.gateId),downstreamGates:downstream,reusableGates:reusable.map(g=>g.gateId),
    },
    metrics:{cacheHitRate:values.length?reusable.length/values.length:0,invalidationRatio:values.length?(invalidated.length+uncertain.length)/values.length:0},
    gates:Object.fromEntries(values.map(g=>[g.gateId,g])),decision:'PASS',
  };
}

export function createReplayPlan({registry,checkpointPath,activeFailureIds=[]}={}){
  const started=Date.now(),head=currentHead(),branch=currentBranch(),dirty=trackedWorkspaceDirty();
  const gateScope=String(process.env.SHOPERATION_VERIFICATION_GATE_SCOPE??'').split(',').map(value=>value.trim()).filter(Boolean);
  const current=buildRepositorySnapshot({registry,head,branch,gateScope}),loaded=loadCheckpoint(checkpointPath),checkpoint=loaded.checkpoint;
  const validation=loaded.validation??validateCheckpoint(checkpoint,{branch,head,requireAncestor:true});
  const changedFiles=validation.ok?changedFilesBetween(checkpoint.sourceCommit,head):[];
  const semanticImpact=validation.ok?classifySemanticUnits({registry,changedFiles,base:checkpoint.sourceCommit,head}):[];
  const forceFullRequested=['1','true','yes'].includes(String(process.env.SHOPERATION_FORCE_FULL_VERIFICATION??'').toLowerCase());
  const plan=planFromSnapshots({current,previousCheckpoint:checkpoint,checkpointValidation:validation,changedFiles,dirty,activeFailureIds,forceFullRequested,semanticImpact});
  plan.checkpointValidation=validation;plan.gateScope=gateScope;plan.plannerStartedAtMs=started;plan.plannerDurationMs=Date.now()-started;plan.metrics.dependencyResolutionMs=plan.plannerDurationMs;plan.generatedAt=new Date().toISOString();
  return{plan,current,checkpoint};
}

export function finalizeVerification({plan,outcomes={},priorCheckpoint=null,runId=null,stateVersion='shoporation-ci.v1'}={}){
  const executionMode=String(plan.executionMode??'SHADOW').toUpperCase();
  const discrepancies=[],gates={},truthEvidence=[];
  const priorStats=priorCheckpoint?.shadowStats??(priorCheckpoint?.complete?{passes:1,resumedPasses:priorCheckpoint.verificationMode==='RESUMED'?1:0,falseReuse:0}:{passes:0,resumedPasses:0,falseReuse:0});
  const promotion=plan.promotionPolicy??{};
  if(executionMode==='ACTIVE'&&priorStats.promotionEligible!==true)discrepancies.push({gateId:'CONTROL-PLANE',code:'ACTIVE_WITHOUT_PROMOTION_PROOF',planned:'ACTIVE',actual:'promotion-proof-missing'});
  if(executionMode==='ACTIVE'&&promotion.physicalSkippingEnabled!==true)discrepancies.push({gateId:'CONTROL-PLANE',code:'ACTIVE_SKIPPING_DISABLED',planned:'ACTIVE',actual:'physical-skipping-disabled'});
  for(const [gateId,planned] of Object.entries(plan.gates??{})){
    const raw=outcomes[gateId],normalized=normalizeStatus(raw),fullPass=PASS_STATES.has(normalized),prior=planned.previous??priorCheckpoint?.gates?.[gateId]??null;
    const reuseEquivalent=Boolean(prior&&PASS_STATES.has(normalizeStatus(prior.status))&&prior.fingerprint&&prior.fingerprint===planned.identity.fingerprint);
    const skippedOrMissing=!raw||normalized==='skipped'||normalized==='neutral'||normalized==='pending';
    if(executionMode==='SHADOW'&&planned.action==='REUSE'&&planned.identity.shadowComparable&&!fullPass)discrepancies.push({gateId,code:'SHADOW_FALSE_REUSE',planned:'REUSE',actual:raw??'missing'});
    if(executionMode==='ACTIVE'&&planned.action==='RERUN'&&!fullPass)discrepancies.push({gateId,code:'ACTIVE_RERUN_FAILED_OR_MISSING',planned:'RERUN',actual:raw??'missing'});
    if(executionMode==='ACTIVE'&&planned.action==='REUSE'&&!fullPass&&!reuseEquivalent)discrepancies.push({gateId,code:'ACTIVE_REUSE_EVIDENCE_INVALID',planned:'REUSE',actual:raw??'missing'});
    const reusableFallback=planned.action==='REUSE'&&skippedOrMissing&&reuseEquivalent;
    const effectivePass=fullPass||reusableFallback,execution=fullPass?'RERUN':reusableFallback?'REUSED':'RERUN';
    const originSourceCommit=fullPass?plan.sourceRevision:prior?.originSourceCommit??prior?.sourceCommit??plan.checkpointSourceCommit;
    const evidence={
      gateId,status:effectivePass?'PASS':raw??'MISSING',execution,sourceCommit:plan.sourceRevision,originSourceCommit,branch:plan.branch,stateVersion,runId,
      fingerprint:planned.identity.fingerprint,gateVersionHash:planned.identity.gateVersionHash,semanticInputHash:planned.identity.semanticInputHash,
      implementationHash:planned.identity.implementationHash,authorityHash:planned.identity.authorityHash,configurationHash:planned.identity.configurationHash,
      toolchainHash:planned.identity.toolchainHash,environmentHash:planned.identity.environmentHash,contextHash:planned.identity.contextHash,
      dependencyFingerprint:planned.identity.dependencyFingerprint,
      reuseProof:execution==='REUSED'?{fingerprintEquivalent:reuseEquivalent,previousFingerprint:prior?.fingerprint??null,currentFingerprint:planned.identity.fingerprint,checkpointSourceCommit:plan.checkpointSourceCommit,reasons:planned.reasons}:null,
    };
    gates[gateId]=evidence;
    truthEvidence.push({id:gateId,status:evidence.status,sourceCommit:plan.sourceRevision,branch:plan.branch,stateVersion,runId:runId??'resumable-verification',execution:evidence.execution,originSourceCommit:evidence.originSourceCommit,reuseProof:evidence.reuseProof});
  }
  const comparable=Object.values(plan.gates??{}).filter(g=>g.identity.shadowComparable);
  if(executionMode==='SHADOW'){
    for(const planned of comparable){
      const raw=outcomes[planned.gateId];
      if(!PASS_STATES.has(normalizeStatus(raw)))discrepancies.push({gateId:planned.gateId,code:raw==null?'SHADOW_FULL_EVIDENCE_MISSING':'SHADOW_FULL_VERIFICATION_FAILED',planned:planned.action,actual:raw??'missing'});
    }
  }
  const unique=[...new Map(discrepancies.map(item=>[item.gateId+':'+item.code,item])).values()];
  const comparison={mode:executionMode,compared:executionMode==='SHADOW'?comparable.length:Object.values(plan.gates??{}).filter(g=>g.action==='RERUN').length,discrepancies:unique,decision:unique.length?'BLOCK':'PASS'};
  const falseReuseThisRun=executionMode==='SHADOW'?unique.filter(item=>item.code==='SHADOW_FALSE_REUSE').length:0;
  const shadowStats={
    passes:priorStats.passes+(executionMode==='SHADOW'&&comparison.decision==='PASS'?1:0),
    resumedPasses:priorStats.resumedPasses+(executionMode==='SHADOW'&&comparison.decision==='PASS'&&plan.verificationMode==='RESUMED'?1:0),
    falseReuse:priorStats.falseReuse+falseReuseThisRun,
  };
  shadowStats.promotionEligible=shadowStats.passes>=Number(promotion.minimumShadowPasses??Infinity)&&shadowStats.resumedPasses>=Number(promotion.minimumResumedShadowPasses??Infinity)&&shadowStats.falseReuse<=Number(promotion.maximumFalseReuse??0)&&comparison.decision==='PASS'&&plan.uncertainEvidenceSet.length===0;
  const verificationRuntimeMs=plan.plannerStartedAtMs?Math.max(0,Date.now()-plan.plannerStartedAtMs):null;
  const referenceFullRuntimeMs=Number(promotion.referenceFullRuntimeMs??priorCheckpoint?.metrics?.referenceFullRuntimeMs??priorCheckpoint?.metrics?.verificationRuntimeMs??0)||null;
  const physicalRuntimeSavingMs=executionMode==='ACTIVE'&&referenceFullRuntimeMs&&verificationRuntimeMs!==null?Math.max(0,referenceFullRuntimeMs-verificationRuntimeMs):0;
  const metrics={...plan.metrics,verificationRuntimeMs,referenceFullRuntimeMs,physicalRuntimeSavingMs,physicalRuntimeSavingRatio:referenceFullRuntimeMs&&physicalRuntimeSavingMs?physicalRuntimeSavingMs/referenceFullRuntimeMs:0,physicalRuntimeSavingReason:executionMode==='ACTIVE'?'active-evidence-reuse':'shadow-mode-full-control-authoritative'};
  const manifest={
    contract:MANIFEST_CONTRACT,schemaVersion:plan.schemaVersion,sourceCommit:plan.sourceRevision,branch:plan.branch,stateVersion,runId,
    verificationMode:plan.verificationMode,executionMode,replayTier:plan.replayTier,checkpointSourceCommit:plan.checkpointSourceCommit,
    evidenceSummary:plan.evidence,changeImpactSet:plan.changeImpactSet,metrics,comparison,shadowComparison:comparison,shadowStats,promotionPolicy:promotion,finalConfidence:comparison.decision,
    gates,truthEvidence,generatedAt:new Date().toISOString(),decision:comparison.decision,
  };
  const checkpoint={
    contract:CHECKPOINT_CONTRACT,schemaVersion:plan.schemaVersion,complete:comparison.decision==='PASS',sourceCommit:plan.sourceRevision,
    branch:plan.branch,stateVersion,runId,activeFailureIds:plan.activeFailureIds,verificationMode:plan.verificationMode,executionMode,replayTier:plan.replayTier,
    gates,shadowStats,metrics:{verificationRuntimeMs,referenceFullRuntimeMs},createdAt:new Date().toISOString(),
  };
  checkpoint.checksum=checkpointChecksum(checkpoint);
  return{manifest,checkpoint,decision:comparison.decision};
}

export function atomicWriteJson(path,value){
  mkdirSync(dirname(path),{recursive:true});
  const tmp=path+'.tmp-'+process.pid;
  writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');
  renameSync(tmp,path);
}
export function explainGate(plan,gateId){
  const gate=plan?.gates?.[gateId];if(!gate)return null;
  return{gateId,action:gate.action,state:gate.state,reasons:gate.reasons,dependsOn:gate.identity.dependsOn,fingerprint:gate.identity.fingerprint,previousFingerprint:gate.previous?.fingerprint??null};
}
export const VERIFICATION_REUSE_CONTRACTS=Object.freeze({checkpoint:CHECKPOINT_CONTRACT,plan:PLAN_CONTRACT,manifest:MANIFEST_CONTRACT,schema:ENGINE_SCHEMA_VERSION});
