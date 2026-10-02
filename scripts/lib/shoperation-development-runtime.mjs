import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';

export const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
export const releasePolicy=readJson('deploy/release-risk-policy.json');
export const knowledge=readJson('quality/knowledge/shoperation-quality-knowledge.v1.json');
export const scopePolicy=readJson('quality/knowledge/knowledge-scope-policy.v1.json');
export const guardPolicy=readJson('quality/knowledge/development-guard-policy.v1.json');

export function stableDigest(value){
  let hash=2166136261;
  const text=typeof value==='string'?value:JSON.stringify(value);
  for(let i=0;i<text.length;i+=1){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16).padStart(8,'0');
}
export function globToRegExp(glob){
  let out='^';
  for(let i=0;i<glob.length;i+=1){
    const ch=glob[i];
    if(ch==='*'){
      if(glob[i+1]==='*'){i+=1;if(glob[i+1]==='/'){i+=1;out+='(?:.*/)?';}else out+='.*';}
      else out+='[^/]*';
    }else if(ch==='?')out+='[^/]';
    else if('\\.^$+{}()|[]'.includes(ch))out+=`\\${ch}`;
    else out+=ch;
  }
  return new RegExp(`${out}$`);
}
const neutralMatchers=releasePolicy.neutralPatterns.map(globToRegExp);
const subsystemMatchers=releasePolicy.subsystems.map(item=>({...item,matchers:item.patterns.map(globToRegExp)}));
const DEVELOPMENT_METADATA_FILES=new Set(['quality/development/active-plan.json']);
export function isNeutralFile(file){return neutralMatchers.some(matcher=>matcher.test(file));}
export function isDevelopmentMetadataFile(file){return DEVELOPMENT_METADATA_FILES.has(String(file??''));}
const BLOCKING_GATE_DECISIONS=new Set(['BLOCK','FAIL','FAILED','FAILURE','STALE','CONFLICT','UNRESOLVED','UNKNOWN']);
export function isBlockingGateDecision(value){return BLOCKING_GATE_DECISIONS.has(String(value??'').trim().toUpperCase());}
export function aggregateGateDecision({localBlocking=false,childDecisions=[]}={}){return localBlocking||childDecisions.some(isBlockingGateDecision)?'BLOCK':'PASS';}
export function guardFindingFingerprint(finding){return stableDigest({ruleId:finding?.ruleId??null,file:finding?.file??null,line:Number(finding?.line??0),code:finding?.code??'',message:finding?.message??''});}
export function matchGuardException(finding,exceptions=[]){const findingFingerprint=guardFindingFingerprint(finding);const exception=(exceptions??[]).find(item=>item?.ruleId===finding?.ruleId&&item?.file===finding?.file&&item?.findingFingerprint===findingFingerprint)??null;return{findingFingerprint,exception};}

export function parseTemplateFactoryFailures(){
  const source=readFileSync('src/lib/builder/template-factory/knowledge-registry.ts','utf8');
  const matches=[...source.matchAll(/id:'(TF-KF-\d+)'/g)],items=[];
  for(let i=0;i<matches.length;i++){
    const start=matches[i].index,end=i+1<matches.length?matches[i+1].index:source.indexOf(']);',start);
    const s=source.slice(start,end);
    const field=name=>{
      const marker=`${name}:'`,at=s.indexOf(marker);if(at<0)return '';
      let out='',j=at+marker.length;
      for(;j<s.length;j++){const ch=s[j];if(ch==="'"&&s[j-1]!=="\\")break;out+=ch;}
      return out.replaceAll("\\'","'");
    };
    const arr=name=>{const m=s.match(new RegExp(`${name}:\\[([^\\]]*)\\]`));return m?[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]):[];};
    items.push({id:matches[i][1],title:field('title'),symptom:field('symptom'),rootCause:field('rootCause'),invariantIds:arr('invariantIds'),regressionTests:arr('regressionTests')});
  }
  return items;
}
export function getAllFailures(){
  const global=knowledge.knownFailures.map(item=>({...item,provider:'global'}));
  const tf=parseTemplateFactoryFailures().map(item=>({...item,provider:'template-factory',applicability:{mode:'subsystem',subsystems:knowledge.templateFactoryFailureApplicability[item.id]??[]}}));
  return [...global,...tf];
}
export function resolveDevelopmentScope({files=[],task='',forceFull=false}){
  const direct=new Set(),unresolvedFiles=[],intentSubsystems=new Set();let knowledgeInfrastructureChanged=false;
  for(const file of files){
    if(scopePolicy.knowledgeInfrastructurePrefixes.some(prefix=>file.startsWith(prefix))){knowledgeInfrastructureChanged=true;continue;}
    if(isNeutralFile(file))continue;
    const hits=subsystemMatchers.filter(item=>item.matchers.some(matcher=>matcher.test(file)));
    if(!hits.length)unresolvedFiles.push(file);
    for(const hit of hits)direct.add(hit.name);
  }
  const normalizedTask=String(task).toLowerCase();
  for(const matcher of guardPolicy.intentMatchers)if(new RegExp(matcher.pattern,'i').test(normalizedTask))for(const subsystem of matcher.subsystems){intentSubsystems.add(subsystem);direct.add(subsystem);}
  const impacted=new Set(direct),queue=[...direct];
  while(queue.length){const current=queue.shift();for(const dependency of scopePolicy.dependencies[current]??[])if(!impacted.has(dependency)){impacted.add(dependency);queue.push(dependency);}}
  const fullReplay=Boolean(forceFull||knowledgeInfrastructureChanged);
  const globalIds=knowledge.knownFailures.filter(f=>fullReplay||f.applicability.mode==='always'||f.applicability.subsystems.some(s=>impacted.has(s))).map(f=>f.id);
  const tfIds=parseTemplateFactoryFailures().filter(f=>fullReplay||(knowledge.templateFactoryFailureApplicability[f.id]??[]).some(s=>impacted.has(s))).map(f=>f.id);
  const activeFailureIds=[...new Set([...knowledge.globalBaselineFailureIds,...globalIds,...tfIds])];
  return {directSubsystems:[...direct].sort(),intentSubsystems:[...intentSubsystems].sort(),impactedSubsystems:[...impacted].sort(),knowledgeInfrastructureChanged,fullReplay,unresolvedFiles,activeFailureIds};
}
export function resolveDevelopmentBase({changeBaseSha=null}={}){
  const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
  const declared=String(changeBaseSha??'').trim();
  if(declared){
    if(/^0+$/.test(declared))return null;
    try{git(['cat-file','-e',`${declared}^{commit}`]);return declared;}catch{return null;}
  }
  const candidates=[process.env.DEVELOPMENT_BASE_SHA,process.env.QUALITY_BASE_SHA,process.env.RELEASE_BASE_SHA].map(value=>String(value??'').trim()).filter(Boolean);
  for(const candidate of candidates)if(!/^0+$/.test(candidate)){try{git(['cat-file','-e',`${candidate}^{commit}`]);return candidate;}catch{}}
  for(const candidate of ['origin/main','main','HEAD^']){try{git(['cat-file','-e',`${candidate}^{commit}`]);return candidate;}catch{}}
  return null;
}
export function parseChangedFileStatus(output){
  const changes=[];
  for(const line of String(output??'').split(/\r?\n/).filter(Boolean)){
    const parts=line.split('\t'),rawStatus=parts[0]??'',status=rawStatus[0]??'';
    if(!['A','C','M','R','D'].includes(status))continue;
    if((status==='R'||status==='C')&&parts.length>=3){
      changes.push({status,rawStatus,previousFile:parts[1],file:parts[2]});
    }else if(parts[1]){
      changes.push({status,rawStatus,file:parts[1]});
    }
  }
  const files=[...new Set(changes.map(change=>change.file))];
  const deletedFiles=[...new Set(changes.filter(change=>change.status==='D').map(change=>change.file))];
  return{changes,files,deletedFiles};
}
export function resolveDevelopmentHead(){
  const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
  const explicit=[process.env.DEVELOPMENT_HEAD_SHA,process.env.QUALITY_HEAD_SHA,process.env.SHOPERATION_REPLAY_HEAD].map(value=>String(value??'').trim()).filter(Boolean);
  for(const candidate of explicit)if(!/^0+$/.test(candidate)){try{git(['cat-file','-e',`${candidate}^{commit}`]);return{head:candidate,resolution:'EXPLICIT'};}catch{}}
  const eventPath=String(process.env.GITHUB_EVENT_PATH??'').trim();
  if(eventPath&&existsSync(eventPath))try{
    const event=JSON.parse(readFileSync(eventPath,'utf8')),candidate=String(event?.pull_request?.head?.sha??'').trim();
    if(candidate&&!/^0+$/.test(candidate)){git(['cat-file','-e',`${candidate}^{commit}`]);return{head:candidate,resolution:'PULL_REQUEST_HEAD'};}
  }catch{}
  const github=String(process.env.GITHUB_SHA??'').trim();
  if(github&&!/^0+$/.test(github)){try{git(['cat-file','-e',`${github}^{commit}`]);return{head:github,resolution:'GITHUB_SHA'};}catch{}}
  return{head:'HEAD',resolution:'LOCAL_HEAD'};
}
export function getChangedFiles({baseSha=null}={}){
  const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
  const requestedBase=String(baseSha??'').trim();
  const base=resolveDevelopmentBase({changeBaseSha:requestedBase||null});
  const headIdentity=resolveDevelopmentHead();
  const head=headIdentity.head;
  const baseResolution=requestedBase?(base===requestedBase?'DECLARED':'UNRESOLVED'):(base?'FALLBACK':'UNRESOLVED');
  if(!base)return {base:null,requestedBase:requestedBase||null,baseResolution,head,headResolution:headIdentity.resolution,files:[],deletedFiles:[],materialFiles:[],materialDeletedFiles:[],metadataFiles:[],changes:[]};
  const output=git(['diff','--name-status','--diff-filter=ACMRD',base,head]);
  const parsed=parseChangedFileStatus(output);
  const metadataFiles=parsed.files.filter(isDevelopmentMetadataFile);
  const materialFiles=parsed.files.filter(file=>!isDevelopmentMetadataFile(file));
  const materialDeletedFiles=parsed.deletedFiles.filter(file=>!isDevelopmentMetadataFile(file));
  return {base,requestedBase:requestedBase||null,baseResolution,head,headResolution:headIdentity.resolution,...parsed,materialFiles,materialDeletedFiles,metadataFiles};
}
export function runVitest(files){
  if(!files.length)return {status:0,stdout:'',stderr:''};
  const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['vitest','run',...files],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return {status:result.status??1,stdout:result.stdout??'',stderr:result.stderr??''};
}
export function ensureFile(file){if(!existsSync(file))throw new Error(`Required file missing: ${file}`);}


if(process.argv.includes('--exception-self-test')){
  const first={ruleId:'DEV-REVIEW-X',file:'src/a.ts',line:1,code:'x',message:'review'};
  const second={...first,file:'src/b.ts'};
  const fp=guardFindingFingerprint(first);
  const exact=matchGuardException(first,[{ruleId:first.ruleId,file:first.file,findingFingerprint:fp,reason:'intentional'}]);
  const unrelated=matchGuardException(second,[{ruleId:first.ruleId,file:first.file,findingFingerprint:fp,reason:'intentional'}]);
  const ok=exact.exception?.reason==='intentional'&&unrelated.exception===null&&exact.findingFingerprint!==unrelated.findingFingerprint;
  console.log(`Development exception self-test: ${ok?'PASS':'FAIL'}`);
  if(!ok)process.exitCode=1;
}

if(process.argv.includes('--decision-self-test')){
  const ok=aggregateGateDecision({childDecisions:['PASS','PASS']})==='PASS'
    &&aggregateGateDecision({childDecisions:['PASS','BLOCK']})==='BLOCK'
    &&aggregateGateDecision({localBlocking:true,childDecisions:['PASS']})==='BLOCK'
    &&aggregateGateDecision({childDecisions:['UNKNOWN']})==='BLOCK';
  console.log(`Development decision self-test: ${ok?'PASS':'FAIL'}`);
  if(!ok)process.exitCode=1;
}

if(process.argv.includes('--change-status-self-test')){
  const parsed=parseChangedFileStatus([
    'M\tsrc/modified.ts',
    'D\tsrc/deleted.ts',
    'R100\tsrc/old.ts\tsrc/new.ts',
    'A\tsrc/added.ts',
  ].join('\n'));
  const ok=JSON.stringify(parsed.files)===JSON.stringify(['src/modified.ts','src/deleted.ts','src/new.ts','src/added.ts'])
    &&JSON.stringify(parsed.deletedFiles)===JSON.stringify(['src/deleted.ts'])
    &&parsed.changes.find(item=>item.status==='R')?.previousFile==='src/old.ts';
  console.log(`Development change-status self-test: ${ok?'PASS':'FAIL'}`);
  if(!ok)process.exitCode=1;
}
