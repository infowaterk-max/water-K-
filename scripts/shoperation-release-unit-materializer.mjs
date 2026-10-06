import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {decomposeReleaseScope,globToRegExp,reconcileReleaseUnitManifest,sealReleaseUnitManifest,validateReleaseUnitManifest} from './lib/shoperation-development-runtime.mjs';
import {buildCodebaseAtlas,classifyAtlasPath} from './lib/shoperation-codebase-atlas-runtime.mjs';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const normalize=value=>String(value??'').trim().replaceAll('\\','/');
const opFootprint=operation=>[...new Set([normalize(operation?.path),operation?.type==='rename'?normalize(operation?.sourcePath):''].filter(Boolean))];
const matches=(file,patterns=[])=>patterns.some(pattern=>globToRegExp(pattern).test(file));
function git(cwd,args,{encoding='utf8'}={}){return execFileSync('git',args,{cwd,encoding,stdio:['ignore','pipe','pipe']}).toString().trim();}
function gitBuffer(cwd,args){return execFileSync('git',args,{cwd,stdio:['ignore','pipe','pipe']});}
function revExists(cwd,rev){try{execFileSync('git',['cat-file','-e',rev],{cwd,stdio:'ignore'});return true;}catch{return false;}}
function inspectPath(cwd,rev,file){
  const spec=`${rev}:${file}`;if(!revExists(cwd,spec))return{exists:false,file,blob:null,sha256:null};
  const blob=git(cwd,['rev-parse',spec]),content=gitBuffer(cwd,['show',spec]);
  return{exists:true,file,blob,sha256:createHash('sha256').update(content).digest('hex')};
}
function sourceForOperation(cwd,manifest,operation){
  if(operation.type==='delete'||operation.generatedArtifact?.mode==='regenerate')return{exists:true,file:operation.path,blob:null,sha256:null,regenerate:true};
  const sourceCommit=operation.sourceCommit??manifest.materialization?.sourceCommit??null;
  const sourcePath=operation.sourcePathAtSource??operation.path;
  if(!sourceCommit)return{exists:false,file:sourcePath,blob:null,sha256:null,reason:'SOURCE_COMMIT_MISSING'};
  return{...inspectPath(cwd,sourceCommit,sourcePath),sourceCommit,sourcePath};
}
export function preflightReleaseUnitMaterialization({manifest,currentHead,inspectTarget,inspectSource}={}){
  const issues=[...validateReleaseUnitManifest(manifest).issues],results=[],lease=manifest?.targetBaseLease??{};
  if(lease.mode!=='EXACT'||!lease.sha)issues.push({code:'MATERIALIZATION_EXACT_LEASE_REQUIRED',actual:lease.mode??null});
  else if(currentHead!==lease.sha)issues.push({code:'MATERIALIZATION_TARGET_BASE_LEASE_MISMATCH',expected:lease.sha,actual:currentHead});
  const intended=new Set(manifest?.intendedFiles??[]),forbidden=manifest?.forbiddenPaths??[],readOnly=manifest?.readOnlyPaths??[];
  for(const operation of manifest?.operations??[]){
    for(const file of opFootprint(operation)){
      if(!intended.has(file))issues.push({code:'MATERIALIZATION_OPERATION_OUTSIDE_MANIFEST',file});
      if(matches(file,forbidden))issues.push({code:'MATERIALIZATION_FORBIDDEN_PATH',file});
      if(matches(file,readOnly))issues.push({code:'MATERIALIZATION_READ_ONLY_PATH',file});
    }
    if(operation.generatedArtifact&&!['regenerate','sealed'].includes(operation.generatedArtifact.mode))issues.push({code:'MATERIALIZATION_GENERATED_SEMANTICS_INVALID',file:operation.path});
    const target=inspectTarget(operation.path),source=inspectSource(operation);
    if(operation.generatedArtifact?.mode==='sealed'){
      const expected=operation.generatedArtifact.sha256??null;
      if(!expected)issues.push({code:'MATERIALIZATION_GENERATED_SEALED_HASH_REQUIRED',file:operation.path});
      else if(source.exists&&source.sha256!==expected)issues.push({code:'MATERIALIZATION_GENERATED_SEALED_HASH_MISMATCH',file:operation.path,expected,actual:source.sha256});
    }
    let status='pending',reason=null;
    if(operation.type==='delete'){
      if(!target.exists){status='already-applied';reason='target-already-absent';}
    }else if(operation.type==='rename'){
      const oldTarget=inspectTarget(operation.sourcePath);
      if(!source.exists)issues.push({code:'MATERIALIZATION_SOURCE_MISSING',file:source.file,reason:source.reason??null});
      else if(!oldTarget.exists&&target.exists&&target.blob===source.blob){status='already-applied';reason='rename-destination-already-matches';}
      else if(oldTarget.exists&&!target.exists){status='pending';}
      else issues.push({code:'MATERIALIZATION_RENAME_STATE_CONFLICT',sourcePath:operation.sourcePath,path:operation.path,sourceExists:oldTarget.exists,targetExists:target.exists});
    }else if(operation.generatedArtifact?.mode==='regenerate'){
      const expected=operation.generatedArtifact.sha256??null;
      if(expected&&target.exists&&target.sha256===expected){status='already-applied';reason='regenerated-artifact-already-matches';}
    }else{
      if(!source.exists)issues.push({code:'MATERIALIZATION_SOURCE_MISSING',file:source.file,reason:source.reason??null});
      else if(target.exists&&target.blob===source.blob){status='already-applied';reason='target-already-matches-source';}
      else if(operation.type==='create'&&target.exists)issues.push({code:'MATERIALIZATION_CREATE_TARGET_EXISTS',file:operation.path});
      else if(operation.type==='modify'&&!target.exists)issues.push({code:'MATERIALIZATION_MODIFY_TARGET_MISSING',file:operation.path});
    }
    results.push({operation,status,reason,target,source});
  }
  const decision=issues.length?'BLOCK':results.every(item=>item.status==='already-applied')?'ALREADY_APPLIED':'PASS';
  return{contract:'shoporation.release-unit-materialization-preflight.v1',releaseUnitId:manifest?.releaseUnitId??null,currentHead,results,issues,decision};
}
function changedFiles(cwd){
  const tracked=git(cwd,['diff','--name-only','HEAD']).split(/\r?\n/).filter(Boolean);
  const untracked=git(cwd,['ls-files','--others','--exclude-standard']).split(/\r?\n/).filter(Boolean);
  return [...new Set([...tracked,...untracked].map(normalize).filter(Boolean))].sort();
}
function writeFromSource(cwd,worktree,manifest,operation){
  const sourceCommit=operation.sourceCommit??manifest.materialization?.sourceCommit;
  const sourcePath=operation.sourcePathAtSource??operation.path;
  if(!sourceCommit)throw new Error(`SOURCE_COMMIT_MISSING:${operation.path}`);
  const target=path.join(worktree,operation.path);mkdirSync(path.dirname(target),{recursive:true});
  writeFileSync(target,gitBuffer(cwd,['show',`${sourceCommit}:${sourcePath}`]));
}
export function materializeReleaseUnit({manifest,cwd=process.cwd(),apply=false,commitMessage=null}={}){
  const currentHead=git(cwd,['rev-parse','HEAD']);
  const preflight=preflightReleaseUnitMaterialization({
    manifest,currentHead,
    inspectTarget:file=>inspectPath(cwd,currentHead,file),
    inspectSource:operation=>sourceForOperation(cwd,manifest,operation),
  });
  if(!apply||preflight.decision!=='PASS')return{...preflight,applied:false};
  if(git(cwd,['status','--porcelain']))return{...preflight,decision:'BLOCK',applied:false,issues:[...preflight.issues,{code:'MATERIALIZATION_WORKTREE_NOT_CLEAN'}]};
  const branch=git(cwd,['branch','--show-current']);
  if(!branch)return{...preflight,decision:'BLOCK',applied:false,issues:[...preflight.issues,{code:'MATERIALIZATION_BRANCH_REQUIRED'}]};
  const root=mkdtempSync(path.join(tmpdir(),'shoperation-release-unit-')),worktree=path.join(root,'worktree');
  let newCommit=null,refUpdated=false;
  try{
    git(cwd,['worktree','add','--detach',worktree,currentHead]);
    for(const result of preflight.results.filter(item=>item.status==='pending')){
      const operation=result.operation;
      if(operation.type==='delete')rmSync(path.join(worktree,operation.path),{recursive:true,force:true});
      else if(operation.type==='rename'){
        rmSync(path.join(worktree,operation.sourcePath),{recursive:true,force:true});
        writeFromSource(cwd,worktree,manifest,operation);
      }else if(operation.generatedArtifact?.mode!=='regenerate')writeFromSource(cwd,worktree,manifest,operation);
    }
    const regenerationCommands=new Map();
    for(const result of preflight.results.filter(item=>item.status==='pending'&&item.operation.generatedArtifact?.mode==='regenerate')){
      const command=result.operation.generatedArtifact.command;
      if(!Array.isArray(command)||!command.length)throw new Error(`GENERATE_COMMAND_INVALID:${result.operation.path}`);
      regenerationCommands.set(JSON.stringify(command),command);
    }
    for(const command of regenerationCommands.values())execFileSync(command[0],command.slice(1),{cwd:worktree,stdio:['ignore','pipe','pipe'],env:process.env});
    const changed=changedFiles(worktree);
    const allowed=new Set([...(manifest.intendedFiles??[]),...(manifest.operations??[]).flatMap(operation=>operation.type==='rename'?[operation.sourcePath]:[])].map(normalize));
    const unexpected=changed.filter(file=>!allowed.has(file));
    if(unexpected.length)throw new Error(`MATERIALIZATION_UNEXPECTED_SCOPE:${unexpected.join(',')}`);
    git(worktree,['add','-A','--','.']);
    if(!git(worktree,['diff','--cached','--name-only']))return{...preflight,decision:'ALREADY_APPLIED',applied:false};
    execFileSync('git',['-c','user.name=Shoperation Control Plane','-c','user.email=control-plane@local','commit','-m',commitMessage??`Materialize ${manifest.releaseUnitId}`],{cwd:worktree,stdio:['ignore','pipe','pipe']});
    newCommit=git(worktree,['rev-parse','HEAD']);
    const parent=git(worktree,['rev-parse','HEAD^']);
    if(parent!==currentHead)throw new Error(`MATERIALIZATION_PARENT_MISMATCH:${parent}:${currentHead}`);
    git(cwd,['update-ref',`refs/heads/${branch}`,newCommit,currentHead]);refUpdated=true;
    git(cwd,['reset','--hard',newCommit]);
    return{...preflight,decision:'PASS',applied:true,commit:newCommit,previousHead:currentHead,branch};
  }catch(error){
    return{...preflight,decision:'BLOCK',applied:refUpdated,commit:newCommit,issues:[...preflight.issues,{code:refUpdated?'MATERIALIZATION_REF_APPLIED_WORKTREE_FAILURE':'MATERIALIZATION_BATCH_ABORTED',message:String(error)}]};
  }finally{
    try{git(cwd,['worktree','remove','--force',worktree]);}catch{}
    rmSync(root,{recursive:true,force:true});
  }
}
export function reconcileReleaseUnitToCurrentBase({manifest,cwd=process.cwd(),newBaseSha=null,predecessorUnitId=null}={}){
  const currentHead=git(cwd,['rev-parse','HEAD']),base=newBaseSha??currentHead;
  if(base!==currentHead)return{decision:'BLOCK',issues:[{code:'RELEASE_UNIT_RECONCILE_BASE_NOT_CURRENT_HEAD',expected:currentHead,actual:base}],manifest:null};
  const atlas=buildCodebaseAtlas(),guardRegistry=readJson('quality/knowledge/guard-registry.v1.json');
  const fileMetadata=Object.fromEntries((manifest.intendedFiles??[]).map(file=>[file,classifyAtlasPath(file)]));
  const fresh=decomposeReleaseScope({
    transactionIdentity:manifest.transactionIdentity,
    parentTransactionIdentity:manifest.parentTransactionIdentity,
    baseSha:base,
    files:manifest.intendedFiles,
    operations:manifest.operations,
    atlas,
    guardRegistry,
    implementationSkeleton:{forbidden:manifest.forbiddenPaths??[],impactedReadOnly:manifest.readOnlyPaths??[]},
    fileMetadata,
    forbiddenPatterns:manifest.forbiddenPaths??[],
    readOnlyPaths:manifest.readOnlyPaths??[],
  });
  if(fresh.decision!=='PASS'||fresh.manifests.length!==1)return{decision:'BLOCK',issues:[{code:'RELEASE_UNIT_RECONCILE_REDECOMPOSITION_REQUIRED',freshDecision:fresh.decision,unitCount:fresh.manifests.length,releaseIssues:fresh.issues}],manifest:null};
  return reconcileReleaseUnitManifest(manifest,{newBaseSha:base,predecessorUnitId:predecessorUnitId??manifest.targetBaseLease?.predecessorUnitId,recomputedUnit:fresh.manifests[0]});
}
function argValue(args,name){const index=args.indexOf(name);return index>=0?args[index+1]??null:null;}
async function main(){
  const args=process.argv.slice(2),manifestPath=argValue(args,'--manifest');
  if(!manifestPath)throw new Error('RELEASE_UNIT_MANIFEST_PATH_REQUIRED');
  let manifest=readJson(manifestPath),result=null;
  const sealSource=argValue(args,'--seal-source');
  if(sealSource){
    result=sealReleaseUnitManifest(manifest,{sourceCommit:sealSource});
    if(result.decision==='PASS'){manifest=result.manifest;writeFileSync(argValue(args,'--output')??manifestPath,JSON.stringify(manifest,null,2)+'\n');}
  }else if(args.includes('--reconcile')){
    result=reconcileReleaseUnitToCurrentBase({manifest,newBaseSha:argValue(args,'--new-base'),predecessorUnitId:argValue(args,'--predecessor')});
    if(result.decision==='PASS'){manifest=result.manifest;writeFileSync(argValue(args,'--output')??manifestPath,JSON.stringify(manifest,null,2)+'\n');}
  }else{
    result=materializeReleaseUnit({manifest,apply:args.includes('--apply'),commitMessage:argValue(args,'--message')});
  }
  console.log(JSON.stringify(result,null,2));
  if(result.decision==='BLOCK')process.exit(1);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error);process.exit(1);});
