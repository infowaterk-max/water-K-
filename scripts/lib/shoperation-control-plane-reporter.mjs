import {appendFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const knowledge=readJson('quality/knowledge/shoperation-quality-knowledge.v1.json');
const directives=readJson('quality/knowledge/development-guard-policy.v1.json').directives??{};
const signatures=readJson('quality/knowledge/failure-signatures.v1.json');
const globalFailures=new Map((knowledge.knownFailures??[]).map(item=>[item.id,item]));

function tfTitles(){
  try{
    const source=readFileSync('src/lib/builder/template-factory/knowledge-registry.ts','utf8');
    const map=new Map();
    for(const match of source.matchAll(/id:'(TF-KF-\d+)'[\s\S]*?title:'([^']+)'/g))map.set(match[1],match[2]);
    return map;
  }catch{return new Map()}
}
const templateFailureTitles=tfTitles();

const clean=value=>String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim();
const escapeAnnotation=value=>clean(value).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A').replace(/:/g,'%3A').replace(/,/g,'%2C');

function signatureFailureId(code){
  const raw=String(code??'');
  const rule=(signatures.rules??[]).find(item=>
    item.match==='exact'?raw===item.pattern:item.match==='prefix'?raw.startsWith(item.pattern):raw.includes(item.pattern)
  );
  return rule?.failureId??null;
}

function failureMeta(failureId){
  if(!failureId)return null;
  const global=globalFailures.get(failureId);
  return {
    id:failureId,
    title:global?.title??templateFailureTitles.get(failureId)??null,
    remediation:directives[failureId]?.preventiveDirective??null,
  };
}

function issueFrom(value,guardId){
  if(typeof value==='string'){
    const code=value.includes(':')?value.split(':')[0]:guardId+'_BLOCK';
    const failureId=signatureFailureId(code);
    return {code,message:clean(value),failureId,...(failureMeta(failureId)??{})};
  }
  if(!value||typeof value!=='object')return null;
  const code=value.code??value.error??value.ruleId??guardId+'_BLOCK';
  const failureId=value.failureId??value.knownFailureId??signatureFailureId(code)??null;
  const authorityIds=[...(value.authorityRuleIds??[]),...(value.ruleId&&String(value.ruleId).includes('AUTH')?[value.ruleId]:[])];
  const message=clean(
    value.message??value.symptom??value.error??value.reason??value.title??
    [value.code,value.file,value.nodeId,value.dependencyId].filter(Boolean).join(' · ')
  )||clean(code);
  return {
    code:String(code),
    message,
    file:value.file??value.path??null,
    line:Number.isFinite(Number(value.line))?Number(value.line):null,
    column:Number.isFinite(Number(value.column??value.col))?Number(value.column??value.col):null,
    failureId,
    authorityRuleIds:authorityIds,
    ...failureMeta(failureId),
  };
}

export function collectGuardDiagnostics({guardId,evidence,processError,rawOutput}){
  const values=[];
  for(const key of ['issues','integrityIssues','violations','blockingFindings','contextIssues','errors','diagnostics']){
    const current=evidence?.[key];
    if(Array.isArray(current))values.push(...current);
  }
  if(evidence?.changeImpact?.unresolvedDomainFiles?.length){
    values.push(...evidence.changeImpact.unresolvedDomainFiles.map(file=>({code:'SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED',file,message:'Atlas domain scope unresolved: '+file})));
  }
  if(processError)values.push({code:guardId+'_PROCESS_FAILED',message:processError});
  const text=String(rawOutput??'').replace(/\\x1b\\[[0-9;]*m/g,'');
  let lastVitestFile=null;
  for(const line of text.split(/\\r?\\n/)){
    const ts=line.match(/^(.+?)\\((\\d+),(\\d+)\\):\\s+error\\s+(TS\\d+):\\s+(.+)$/);
    if(ts)values.push({code:ts[4],file:ts[1],line:Number(ts[2]),column:Number(ts[3]),message:ts[5]});
    const fail=line.match(/FAIL\\s+([^\\s]+)(?:\\s+>\\s+(.+))?/);
    if(fail){lastVitestFile=fail[1];values.push({code:'VITEST_TEST_FAILED',file:fail[1],message:fail[2]??('Regression test failed: '+fail[1])});}
    const assertion=line.match(/AssertionError[^:]*:\\s*(.+)$/);
    if(assertion)values.push({code:'VITEST_ASSERTION_FAILED',file:lastVitestFile,message:assertion[1]});
    const build=line.match(/(?:Type error|Module not found|Failed to compile|Build error)[: ]+(.+)/i);
    if(build)values.push({code:'BUILD_DIAGNOSTIC',message:build[1]});
  }
  if(!values.length&&evidence?.decision==='BLOCK')values.push({code:guardId+'_BLOCK',message:guardId+' blocked without structured issue details.'});
  const seen=new Set();
  return values.map(value=>issueFrom(value,guardId)).filter(Boolean).filter(item=>{
    const key=[item.code,item.file??'',item.line??'',item.message].join('|');
    if(seen.has(key))return false;
    seen.add(key);return true;
  }).slice(0,20);
}

function markdownReport({guard,diagnostics,stage='managed'}){
  const lines=[
    '## ❌ Shoperation BLOCK — '+guard.id,
    '',
    '**Modul:** '+(guard.name??guard.id),
    '**Fázis:** '+stage,
  ];
  for(const item of diagnostics){
    lines.push('','- **'+item.code+'** — '+item.message);
    if(item.file)lines.push('  - Hely: '+item.file+(item.line?':'+item.line:''));
    if(item.authorityRuleIds?.length)lines.push('  - Authority: '+item.authorityRuleIds.join(', '));
    if(item.failureId)lines.push('  - Known Failure: '+item.failureId+(item.title?' — '+item.title:''));
    if(item.remediation)lines.push('  - Javítási irány: '+item.remediation);
  }
  return lines.join('\n')+'\n';
}

export function emitInstantGuardFailure({guard,evidence=null,processError=null,rawOutput='',stage='managed'}){
  const diagnostics=collectGuardDiagnostics({guardId:guard.id,evidence,processError,rawOutput});
  const first=diagnostics[0];
  const banner=[
    '',
    '════════════════ SHOPERATION CONTROL PLANE ════════════════',
    'BLOCK: '+guard.id+' — '+(guard.name??''),
    'OK: '+(first?.message??(guard.name??guard.id)+' blocked.'),
  ];
  if(first?.failureId)banner.push('KNOWN FAILURE: '+first.failureId+(first.title?' — '+first.title:''));
  if(first?.authorityRuleIds?.length)banner.push('AUTHORITY: '+first.authorityRuleIds.join(', '));
  if(first?.file)banner.push('HELY: '+first.file+(first.line?':'+first.line:'')+(first.column?':'+first.column:''));
  if(first?.remediation)banner.push('JAVÍTÁS: '+first.remediation);
  banner.push('═══════════════════════════════════════════════════════════','');
  console.error(banner.join('\n'));

  if(process.env.GITHUB_ACTIONS==='true'){
    for(const item of diagnostics.slice(0,8)){
      const props=[];
      if(item.file)props.push('file='+escapeAnnotation(item.file));
      if(item.line)props.push('line='+item.line);
      if(item.column)props.push('col='+item.column);
      props.push('title='+escapeAnnotation(guard.id+' '+item.code));
      console.error('::error '+props.join(',')+'::'+escapeAnnotation(item.message));
    }
  }

  const report={contract:'shoporation.instant-failure-report.v1',guardId:guard.id,guardName:guard.name??guard.id,stage,diagnostics};
  mkdirSync('artifacts/shoperation-control-plane',{recursive:true});
  const slug=guard.id.toLowerCase();
  writeFileSync('artifacts/shoperation-control-plane/instant-'+slug+'.json',JSON.stringify(report,null,2)+'\n');
  writeFileSync('artifacts/shoperation-control-plane/instant-'+slug+'.md',markdownReport({guard,diagnostics,stage}));
  if(process.env.GITHUB_STEP_SUMMARY){
    try{appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdownReport({guard,diagnostics,stage})+'\n')}catch{}
  }
  return report;
}
