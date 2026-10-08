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
import {advanceParentPostMergeMainCi,closeParentReleaseExecution,dispatchArmedParentMainCi,finishParentClosurePersistence} from './release-unit-parent-close.mjs';

const args=process.argv.slice(2);
const value=name=>{const index=args.indexOf(name);return index>=0?args[index+1]??null:null;};
const has=name=>args.includes(name);
const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const releaseExecutionBlockDiagnostic=result=>({reason:result?.reason??null,error:result?.error??null});
const source=value('--source');
if(!source)throw new Error('RELEASE_UNIT_SOURCE_COMMIT_REQUIRED');

if(has('--drive')){
  const reportPath=value('--decomposition-report');
  if(!reportPath||!existsSync(reportPath))throw new Error('RELEASE_UNIT_DECOMPOSITION_REPORT_REQUIRED');
  const report=readJson(reportPath),decomposition=report.releaseDecomposition;
  if(!decomposition||decomposition.decision!=='PASS')throw new Error('RELEASE_UNIT_DECOMPOSITION_NOT_PASS');
  const parentId=decomposition.releaseUnits?.[0]?.transaction?.parentTransactionId??decomposition.releaseUnits?.[0]?.transaction?.id;
  if(!parentId)throw new Error('RELEASE_UNIT_PARENT_TRANSACTION_REQUIRED');
  const stateRef=value('--state-ref')??stateRefFor(parentId);
  let loaded=loadRemoteExecutionState({stateRef});
  if(!loaded.state){
    const initial=initializeExecutionState({decomposition,sourceCommit:source});
    const saved=persistRemoteExecutionState({state:initial,stateRef});
    loaded={state:initial,stateCommit:saved.stateCommit};
  }else if(loaded.state.executionSourceCommit!==source){
    throw new Error('RELEASE_UNIT_EXECUTION_SOURCE_DRIFT');
  }
  const maxPolls=Math.max(1,Number(process.env.SHOPERATION_RELEASE_EXECUTION_MAX_POLLS??180));
  const pollMs=Math.max(1000,Number(process.env.SHOPERATION_RELEASE_EXECUTION_POLL_MS??10000));
  for(let poll=0;poll<maxPolls;poll+=1){
    const state=loaded.state;
    let result;
    if(state.closureComplete&&state.closurePersistence?.state==='PR_OPEN'){
      result=finishParentClosurePersistence({state,sourceCommit:source});
    }else if(state.closureComplete&&state.closurePersistence?.state==='POST_MERGE_CI_PENDING'){
      result=advanceParentPostMergeMainCi({state,sourceCommit:source});
    }else if(state.closureComplete&&state.closurePersistence?.state==='MERGED'){
      console.log(JSON.stringify({decision:'PARENT_CLOSED',parentTransactionId:state.parentTransactionId,stateRef,stateCommit:loaded.stateCommit},null,2));
      process.exit(0);
    }else if(state.closureEligible){
      result=closeParentReleaseExecution({state,sourceCommit:source});
    }else{
      const active=state.units.find(item=>item.releaseUnitId===state.activeUnitId);
      if(['PLANNED','STALE'].includes(active?.state)){
        execFileSync('git',['fetch','--quiet','origin','main']);
        const currentMain=execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim();
        result=prepareActiveUnit({state,currentMainSha:currentMain,sourceCommit:source});
      }else if(active?.state==='PR_OPEN'){
        result=finishActiveUnit({state});
      }else{
        throw new Error('RELEASE_UNIT_EXECUTION_STATE_UNSUPPORTED:'+String(active?.state??'none'));
      }
    }
    if(result.state!==state){
      const saved=persistRemoteExecutionState({state:result.state,stateRef,expectedStateCommit:loaded.stateCommit});
      loaded={state:result.state,stateCommit:saved.stateCommit};
    }
    if(result.decision==='DISPATCH_ARMED'){
      // A durable CAS must succeed before this process may perform the
      // non-idempotent GitHub workflow_dispatch side effect.
      const dispatched=dispatchArmedParentMainCi({state:loaded.state,sourceCommit:source});
      if(dispatched.state!==loaded.state){
        const saved=persistRemoteExecutionState({state:dispatched.state,stateRef,expectedStateCommit:loaded.stateCommit});
        loaded={state:dispatched.state,stateCommit:saved.stateCommit};
      }
      if(dispatched.decision==='BLOCK')
        throw new Error('RELEASE_UNIT_EXECUTION_BLOCK:'+JSON.stringify(releaseExecutionBlockDiagnostic(dispatched)));
      await sleep(pollMs);continue;
    }
    if(result.decision==='PENDING'){await sleep(pollMs);continue;}
    if(result.decision==='BLOCK')throw new Error('RELEASE_UNIT_EXECUTION_BLOCK:'+JSON.stringify(releaseExecutionBlockDiagnostic(result)));
    if(result.decision==='PARENT_CLOSED'){
      console.log(JSON.stringify({decision:result.decision,parentTransactionId:result.state.parentTransactionId,stateRef,stateCommit:loaded.stateCommit},null,2));
      process.exit(0);
    }
  }
  throw new Error('RELEASE_UNIT_EXECUTION_POLL_LIMIT');
}

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
if(['PLANNED','STALE'].includes(active?.state)){
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
