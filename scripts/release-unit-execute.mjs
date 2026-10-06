import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {
  finishActiveUnit,
  initializeExecutionState,
  loadRemoteExecutionState,
  persistRemoteExecutionState,
  prepareActiveUnit,
  stateRefFor,
} from './release-unit-github-runtime.mjs';

const args=process.argv.slice(2);
const value=name=>{const index=args.indexOf(name);return index>=0?args[index+1]??null:null;};
const has=name=>args.includes(name);
const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const source=value('--source');
if(!source)throw new Error('RELEASE_UNIT_SOURCE_COMMIT_REQUIRED');

if(has('--init')){
  const file=value('--decomposition');
  if(!file||!existsSync(file))throw new Error('RELEASE_UNIT_DECOMPOSITION_REQUIRED');
  const state=initializeExecutionState({decomposition:readJson(file),sourceCommit:source});
  const stateRef=value('--state-ref')??stateRefFor(state.parentTransactionId);
  const saved=persistRemoteExecutionState({state,stateRef});
  console.log(JSON.stringify({decision:'INITIALIZED',parentTransactionId:state.parentTransactionId,stateRef,...saved},null,2));
  process.exit(0);
}

const stateRef=value('--state-ref');
if(!stateRef)throw new Error('RELEASE_UNIT_STATE_REF_REQUIRED');
const loaded=loadRemoteExecutionState({stateRef});
if(!loaded.state)throw new Error('RELEASE_UNIT_STATE_NOT_FOUND');
let result;
const active=loaded.state.units.find(item=>item.releaseUnitId===loaded.state.activeUnitId);
if(active?.state==='PLANNED'){
  execFileSync('git',['fetch','--quiet','origin','main']);
  const currentMain=execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim();
  result=prepareActiveUnit({state:loaded.state,currentMainSha:currentMain,sourceCommit:source});
}else if(active?.state==='PR_OPEN'){
  result=finishActiveUnit({state:loaded.state});
}else if(loaded.state.closureEligible){
  result={state:loaded.state,decision:'PARENT_CLOSURE_ELIGIBLE'};
}else{
  throw new Error('RELEASE_UNIT_EXECUTION_STATE_UNSUPPORTED:'+String(active?.state??'none'));
}
let stateCommit=loaded.stateCommit;
if(result.state!==loaded.state){
  stateCommit=persistRemoteExecutionState({state:result.state,stateRef,expectedStateCommit:loaded.stateCommit}).stateCommit;
}
console.log(JSON.stringify({
  decision:result.decision,
  parentTransactionId:result.state.parentTransactionId,
  activeUnitId:result.state.activeUnitId,
  closureEligible:result.state.closureEligible,
  stateRef,
  stateCommit,
  reason:result.reason??null,
},null,2));
