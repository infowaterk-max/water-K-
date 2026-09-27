import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {emitInstantGuardFailure,collectGuardDiagnostics} from './lib/shoperation-control-plane-reporter.mjs';

const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const args=process.argv.slice(2);
const guardIndex=args.indexOf('--guard');
if(guardIndex<0||!args[guardIndex+1])throw new Error('SPECIALIST_GUARD_REQUIRED');
const guardId=args[guardIndex+1];
const separator=args.indexOf('--');
if(separator<0||!args[separator+1])throw new Error('SPECIALIST_COMMAND_REQUIRED');
const command=args[separator+1];
const commandArgs=args.slice(separator+2);
const guard=(registry.guards??[]).find(item=>item.id===guardId);
if(!guard)throw new Error('SPECIALIST_GUARD_NOT_REGISTERED:'+guardId);
if(guard.execution?.mode!=='external-specialist')throw new Error('SPECIALIST_GUARD_NOT_EXTERNAL:'+guardId);

let stdout='',stderr='';
const child=spawn(command,commandArgs,{env:process.env,stdio:['inherit','pipe','pipe'],shell:false});
child.stdout.on('data',chunk=>{const text=chunk.toString();stdout+=text;process.stdout.write(text)});
child.stderr.on('data',chunk=>{const text=chunk.toString();stderr+=text;process.stderr.write(text)});
const exitCode=await new Promise((resolve,reject)=>{
  child.on('error',reject);
  child.on('close',code=>resolve(code??1));
});
const rawOutput=stdout+'\n'+stderr;
const exactEvidencePath=typeof guard.evidence==='string'&&!guard.evidence.includes('*')&&!guard.evidence.includes('{')&&!guard.evidence.includes('[')?guard.evidence:null;
let upstreamEvidence=null;
if(exactEvidencePath){
  try{upstreamEvidence=JSON.parse(readFileSync(exactEvidencePath,'utf8'))}catch{}
}
const diagnostics=collectGuardDiagnostics({guardId,evidence:upstreamEvidence,processError:null,rawOutput});
const evidence={
  contract:'shoporation.external-specialist-evidence.v1',
  guardId,
  name:guard.name,
  responsibilityKey:guard.responsibilityKey,
  authority:guard.authority,
  command:[command,...commandArgs],
  exitCode,
  decision:exitCode===0?'PASS':'BLOCK',
  diagnostics,
  upstreamEvidencePath:upstreamEvidence?exactEvidencePath:null,
  taskId:JSON.parse(readFileSync('quality/development/active-plan.json','utf8')).taskId,
  sourceHead:(process.env.SHOPERATION_SOURCE_COMMIT??process.env.GITHUB_SHA??'').trim()||null,
};
mkdirSync('artifacts/shoperation-control-plane',{recursive:true});
const path='artifacts/shoperation-control-plane/specialist-'+guardId.toLowerCase()+'.json';
writeFileSync(path,JSON.stringify(evidence,null,2)+'\n');
if(exitCode!==0)emitInstantGuardFailure({guard,evidence:upstreamEvidence?{...upstreamEvidence,diagnostics}:evidence,rawOutput,stage:'external-specialist'});
else console.log('Shoperation specialist PASS: '+guardId+' — '+guard.name);
process.exit(exitCode);
