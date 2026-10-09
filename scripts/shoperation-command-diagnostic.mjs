import{spawn}from'node:child_process';
import{dirname}from'node:path';
import{appendFileSync,mkdirSync,writeFileSync}from'node:fs';

const separator=process.argv.indexOf('--');
if(separator<0||!process.argv[separator+1])throw new Error('SHOPERATION_COMMAND_DIAGNOSTIC_COMMAND_REQUIRED');
const command=process.argv[separator+1],args=process.argv.slice(separator+2);
const output=process.env.SHOPERATION_DIAGNOSTIC_OUTPUT?.trim();
if(!output)throw new Error('SHOPERATION_COMMAND_DIAGNOSTIC_OUTPUT_REQUIRED');
const gateId=process.env.SHOPERATION_DIAGNOSTIC_GATE?.trim()||'command';
const fallbackCode=process.env.SHOPERATION_DIAGNOSTIC_CODE?.trim()||'COMMAND_FAILED';
const expected=process.env.SHOPERATION_DIAGNOSTIC_EXPECTED?.trim()||'command exits with status 0';
const sourceCommit=(process.env.SHOPERATION_SOURCE_COMMIT??process.env.GITHUB_SHA??'').trim()||null;
const environment=(process.env.SHOPERATION_ENVIRONMENT??process.env.DEPLOY_ENVIRONMENT??process.env.VERCEL_ENV??'').trim()||null;
const runId=(process.env.SHOPERATION_CI_RUN_ID??process.env.GITHUB_RUN_ID??'').trim()||null;
const summaryPath=process.env.GITHUB_STEP_SUMMARY?.trim()||null;
const captureLimit=128*1024;
const secretValues=[process.env.GH_TOKEN,process.env.GITHUB_TOKEN,process.env.SHOPERATION_BASELINE_DB_URL]
  .filter(value=>typeof value==='string'&&value.length>=8);
const sanitize=value=>secretValues.reduce((out,secret)=>out.split(secret).join('[REDACTED]'),String(value??''));
const capture=(prior,chunk)=>{const next=prior+String(chunk);return next.length>captureLimit?next.slice(-captureLimit):next;};

let stdout='',stderr='',spawnError=null;
const child=spawn(command,args,{env:process.env,stdio:['inherit','pipe','pipe']});
child.stdout?.on('data',chunk=>{process.stdout.write(chunk);stdout=capture(stdout,chunk);});
child.stderr?.on('data',chunk=>{process.stderr.write(chunk);stderr=capture(stderr,chunk);});
child.on('error',error=>{spawnError=error;});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{if(child.pid&&!child.killed)child.kill(signal);});
const outcome=await new Promise(resolve=>child.on('close',(code,signal)=>resolve({code,signal})));
const result={status:outcome.code,signal:outcome.signal}; // Keep the original diagnostic exitCode contract.
const exitCode=Number.isInteger(result.status)?result.status:1;
const text=sanitize(stdout+'\n'+stderr+(spawnError?'\nError: '+spawnError.message:''));
const errors=[];
const seen=new Set();
const add=item=>{
  const sanitized={...item,reason:sanitize(item.reason),actual:sanitize(item.actual),rawError:item.rawError?sanitize(item.rawError):undefined,
    evidence:(item.evidence??[]).map(sanitize)};
  const key=String(sanitized.code)+'|'+String(sanitized.file??'')+'|'+String(sanitized.reason);
  if(seen.has(key))return;
  seen.add(key);errors.push(sanitized);
};

// Release executor returns a stable outer BLOCK and an exact nested code/reason.
// The nested machine code takes precedence; keep the original redacted error too.
let foundReleaseBlock=false;
for(const match of text.matchAll(/RELEASE_UNIT_EXECUTION_BLOCK:(\{[^\r\n]*\})/g)){
  let payload;
  try{payload=JSON.parse(match[1]);}catch{continue;}
  foundReleaseBlock=true;
  const reason=payload?.reason;
  const nested=typeof payload?.error==='string'?payload.error:'';
  const reasonText=typeof reason==='string'?reason:reason?.code??'RELEASE_UNIT_EXECUTION_BLOCK';
  const nestedCode=nested.match(/(?:^|:)\s*([A-Z][A-Z0-9_]{4,})(?=:|\b)/)?.[1]??null;
  const code=nestedCode??(typeof reason==='object'?reason?.code:null)??reasonText.match(/^[A-Z][A-Z0-9_]{4,}/)?.[0]??fallbackCode;
  add({code,reason:nested||reasonText,expected,actual:'release executor blocked: '+reasonText,
    rawError:'RELEASE_UNIT_EXECUTION_BLOCK:'+match[1],evidence:['gate='+gateId,'sourceCommit='+(sourceCommit??'unknown'),'runId='+(runId??'unknown')]});
}
for(const match of text.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm)){
  add({code:match[4],reason:match[5].trim(),file:match[1].trim(),expected,
    actual:'line '+match[2]+', column '+match[3]+': '+match[5].trim(),evidence:['gate='+gateId]});
}
for(const match of text.matchAll(/(?:^|\n)(?:.*?\bError:\s*)?([A-Z][A-Z0-9_]{4,})(?::([^\n]+))?/g)){
  const code=match[1];
  if(['ERROR','HTTPS','GITHUB','NODE_OPTIONS','SHOPERATION'].includes(code))continue;
  if(foundReleaseBlock&&code==='RELEASE_UNIT_EXECUTION_BLOCK')continue;
  const detail=(match[2]??'').trim();
  if(code.startsWith('TS')&&errors.some(x=>x.code===code))continue;
  if(detail||code===fallbackCode)add({code,reason:detail||code,expected,actual:detail||code,evidence:['gate='+gateId]});
}
const meaningful=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
  .filter(line=>!/^npm (?:warn|notice)/i.test(line)&&!/^> /.test(line));
if(exitCode!==0&&errors.length===0){
  const reason=meaningful.slice(-3).join(' | ').slice(0,1600)||command+' exited with '+(outcome.signal??exitCode);
  add({code:fallbackCode,reason,expected,actual:reason,
    rawError:reason,evidence:['gate='+gateId,'sourceCommit='+(sourceCommit??'unknown'),'runId='+(runId??'unknown')]});
}
const report={
  contract:'shoporation.command-diagnostic.v1',gateId,decision:exitCode===0?'PASS':'FAIL',
  sourceCommit,environment,runId,command:[command,...args].map(sanitize),
  exitCode:result.status,signal:result.signal??null,
  generatedAt:new Date().toISOString(),errors,
};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
if(exitCode!==0&&summaryPath){
  const first=errors[0]??{code:fallbackCode,reason:'unknown failure'};
  const safe=value=>sanitize(value).replace(/[\r\n|]/g,' ').slice(0,1000).replace(/\`/g,"'");
  appendFileSync(summaryPath,'\n### Shoperation exact failure diagnostic\n\n'
    +'- Gate: `'+safe(gateId)+'`\n'
    +'- Code: `'+safe(first.code)+'`\n'
    +'- Reason: '+safe(first.reason)+'\n'
    +'- Source: `'+safe(sourceCommit??'unknown')+'`\n'
    +'- Run: `'+safe(runId??'unknown')+'`\n'
    +'- Artifact: `'+safe(output)+'`\n');
}
process.exitCode=exitCode;
