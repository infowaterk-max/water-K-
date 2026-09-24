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
export function isNeutralFile(file){return neutralMatchers.some(matcher=>matcher.test(file));}

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
  const candidates=[changeBaseSha,process.env.DEVELOPMENT_BASE_SHA,process.env.QUALITY_BASE_SHA,process.env.RELEASE_BASE_SHA].map(value=>String(value??'').trim()).filter(Boolean);
  for(const explicit of candidates)if(!/^0+$/.test(explicit)){try{git(['cat-file','-e',`${explicit}^{commit}`]);return explicit;}catch{}}
  for(const candidate of ['origin/main','main','HEAD^']){try{git(['cat-file','-e',`${candidate}^{commit}`]);return candidate;}catch{}}
  return null;
}
export function getChangedFiles({baseSha=null}={}){
  const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
  const explicit=String(baseSha??process.env.DEVELOPMENT_BASE_SHA??'').trim();
  const base=resolveDevelopmentBase({changeBaseSha:explicit});
  const head=(process.env.DEVELOPMENT_HEAD_SHA??process.env.GITHUB_SHA??'HEAD').trim()||'HEAD';
  if(!base)return {base:null,head,files:[]};
  const output=git(['diff','--name-only','--diff-filter=ACMR',base,head]);
  return {base,head,files:output?output.split(/\r?\n/).filter(Boolean):[]};
}
export function runVitest(files){
  if(!files.length)return {status:0,stdout:'',stderr:''};
  const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['vitest','run',...files],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return {status:result.status??1,stdout:result.stdout??'',stderr:result.stderr??''};
}
export function ensureFile(file){if(!existsSync(file))throw new Error(`Required file missing: ${file}`);}
