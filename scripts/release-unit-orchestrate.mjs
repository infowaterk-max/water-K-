import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {applyReleaseUnitEvent,createReleaseParentExecution,recordReleaseParentClosureWithProofContext} from './lib/shoperation-release-unit-runtime.mjs';

const args=process.argv.slice(2);
const value=name=>{const index=args.indexOf(name);return index>=0?args[index+1]??null:null;};
const has=name=>args.includes(name);
const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const writeJson=(file,value)=>{const tmp=file+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2)+'\n','utf8');renameSync(tmp,file);};
const sourcePlanAt=sourceCommit=>{const source=String(sourceCommit??'').trim();if(!/^[0-9a-f]{40}$/i.test(source))throw new Error('RELEASE_PARENT_CLOSURE_SOURCE_COMMIT_REQUIRED');return JSON.parse(execFileSync('git',['show',source+':quality/development/active-plan.json'],{encoding:'utf8'}));};
const output=value('--output')??'artifacts/shoperation-development-guard/release-unit-execution.json';

let state;
if(has('--init')){
  const decomposition=value('--decomposition');
  if(!decomposition||!existsSync(decomposition))throw new Error('RELEASE_UNIT_DECOMPOSITION_PATH_REQUIRED');
  state=createReleaseParentExecution(readJson(decomposition));
}else{
  const statePath=value('--state'),eventPath=value('--event');
  if(!statePath||!eventPath||!existsSync(statePath)||!existsSync(eventPath))throw new Error('RELEASE_UNIT_STATE_AND_EVENT_REQUIRED');
  state=readJson(statePath);
  const event=readJson(eventPath);
  state=event.type==='PARENT_CLOSE'
    ?recordReleaseParentClosureWithProofContext(state,{truth:event.truth,lifecyclePlan:event.lifecyclePlan,currentMainSha:event.currentMainSha,trustedMainAdvance:event.trustedMainAdvance??null,sourcePlan:sourcePlanAt(event.sourceCommit),sourceCommit:event.sourceCommit})
    :applyReleaseUnitEvent(state,event);
}
writeJson(output,state);
console.log('Release Unit Orchestration: parent='+state.parentTransactionId+'; active='+(state.activeUnitId??'none')+'; closureEligible='+state.closureEligible+'; closureComplete='+state.closureComplete+'.');
