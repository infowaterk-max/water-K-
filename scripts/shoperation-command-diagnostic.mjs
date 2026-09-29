import{spawnSync}from'node:child_process';
import{dirname}from'node:path';
import{mkdirSync,writeFileSync}from'node:fs';

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
const result=spawnSync(command,args,{encoding:'utf8',env:process.env,maxBuffer:64*1024*1024});
const stdout=result.stdout??'',stderr=result.stderr??'';
if(stdout)process.stdout.write(stdout);
if(stderr)process.stderr.write(stderr);

const text=`${stdout}\n${stderr}`;
const errors=[];
const seen=new Set();
const add=item=>{const key=`${item.code}|${item.file??''}|${item.reason}`;if(seen.has(key))return;seen.add(key);errors.push(item);};
for(const match of text.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm)){
  add({code:match[4],reason:match[5].trim(),file:match[1].trim(),expected,actual:`line ${match[2]}, column ${match[3]}: ${match[5].trim()}`,evidence:[`gate=${gateId}`]});
}
for(const match of text.matchAll(/(?:^|\n)(?:.*?\bError:\s*)?([A-Z][A-Z0-9_]{4,})(?::([^\n]+))?/g)){
  const code=match[1];
  if(['ERROR','HTTPS','GITHUB','NODE_OPTIONS','SHOPERATION'].includes(code))continue;
  const detail=(match[2]??'').trim();
  if(code.startsWith('TS')&&errors.some(x=>x.code===code))continue;
  if(detail||code===fallbackCode)add({code,reason:detail||code,expected,actual:detail||code,evidence:[`gate=${gateId}`]});
}
const meaningful=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter(line=>!/^npm (?:warn|notice)/i.test(line)&&!/^> /.test(line));
if((result.status??1)!==0&&errors.length===0){
  const reason=meaningful.slice(-3).join(' | ').slice(0,1600)||`${command} exited with ${result.status??'unknown'}`;
  add({code:fallbackCode,reason,expected,actual:reason,evidence:[`gate=${gateId}`]});
}
const report={
  contract:'shoporation.command-diagnostic.v1',
  gateId,
  decision:(result.status??1)===0?'PASS':'FAIL',
  sourceCommit,
  environment,
  command:[command,...args],
  exitCode:result.status,
  signal:result.signal??null,
  generatedAt:new Date().toISOString(),
  errors,
};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
if((result.status??1)!==0)process.exit(result.status??1);
