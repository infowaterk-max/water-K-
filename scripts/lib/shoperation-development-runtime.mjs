import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';

export const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
export const activeDevelopmentPlanPath=()=>String(process.env.SHOPERATION_ACTIVE_PLAN??'').trim()||'quality/development/active-plan.json';
export const readActiveDevelopmentPlan=()=>readJson(activeDevelopmentPlanPath());
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


function hasGlobPattern(value){return /[*?\[\]{}]/.test(String(value??''));}
export function exactPlannedPaths(patterns=[]){return [...new Set((patterns??[]).map(value=>String(value??'').trim()).filter(value=>value&&!hasGlobPattern(value)))].sort();}
function patternsMayOverlap(left,right){
  const a=String(left??''),b=String(right??'');
  if(!a||!b)return false;
  if(!hasGlobPattern(a))return globToRegExp(b).test(a);
  if(!hasGlobPattern(b))return globToRegExp(a).test(b);
  const prefix=value=>value.slice(0,Math.min(...['*','?','[','{'].map(token=>{const index=value.indexOf(token);return index<0?value.length:index;})));
  const ap=prefix(a),bp=prefix(b);
  return !ap||!bp||ap.startsWith(bp)||bp.startsWith(ap);
}
export function evaluateReleaseRiskFiles(files,{policy=releasePolicy}={}){
  const unique=[...new Set((files??[]).map(value=>String(value??'').trim()).filter(Boolean))].sort();
  const neutral=(policy.neutralPatterns??[]).map(globToRegExp);
  const subsystems=(policy.subsystems??[]).map(item=>({...item,matchers:(item.patterns??[]).map(globToRegExp)}));
  const classified=unique.map(file=>{
    if(neutral.some(matcher=>matcher.test(file)))return{file,subsystem:'evidence-neutral',risk:'neutral',points:0};
    const match=subsystems.find(item=>item.matchers.some(matcher=>matcher.test(file)));
    const risk=match?.risk??policy.fallback?.risk??'medium';
    return{file,subsystem:match?.name??policy.fallback?.subsystem??'unclassified-change',risk,points:Number(policy.riskWeights?.[risk]??0)};
  });
  const scoredSubsystems=[...new Map(classified.filter(item=>item.points>0).map(item=>[item.subsystem,{subsystem:item.subsystem,risk:item.risk,points:item.points}])).values()];
  const score=scoredSubsystems.reduce((sum,item)=>sum+item.points,0),highRisk=scoredSubsystems.filter(item=>item.risk==='high'),violations=[];
  if(score>Number(policy.maxPoints??0))violations.push({code:'PROJECTED_RELEASE_RISK_POINTS_EXCEEDED',score,maxPoints:policy.maxPoints});
  if(scoredSubsystems.length>Number(policy.maxSubsystems??0))violations.push({code:'PROJECTED_RELEASE_RISK_SUBSYSTEMS_EXCEEDED',subsystemCount:scoredSubsystems.length,maxSubsystems:policy.maxSubsystems});
  if(highRisk.length>1)violations.push({code:'PROJECTED_RELEASE_RISK_MULTIPLE_HIGH',subsystems:highRisk.map(item=>item.subsystem)});
  if(highRisk.length===1&&scoredSubsystems.length>1)violations.push({code:'PROJECTED_RELEASE_RISK_HIGH_NOT_ISOLATED',subsystem:highRisk[0].subsystem});
  return{contract:'shoporation.projected-release-risk.v1',score,maxPoints:policy.maxPoints,subsystemCount:scoredSubsystems.length,maxSubsystems:policy.maxSubsystems,subsystems:scoredSubsystems,files:classified,violations,decision:violations.length?'BLOCK':'PASS'};
}
export function deriveImplementationSkeleton({plannedFilePatterns=[],atlasFiles=[],executionRoute={},plannedDeletions=[],forbiddenPatterns=[]}={}){
  const atlasSet=new Set(atlasFiles??[]),deletions=new Set(plannedDeletions??[]);
  const mustCreate=exactPlannedPaths(plannedFilePatterns).filter(file=>!atlasSet.has(file)&&!deletions.has(file));
  const mustEdit=[...new Set([...(executionRoute?.MUST_EDIT??[]),...(executionRoute?.INSTRUCTION_REQUIRED??[])])].filter(file=>!mustCreate.includes(file)).sort();
  const mayEdit=[...new Set(executionRoute?.MAY_EDIT??[])].filter(file=>!mustEdit.includes(file)&&!mustCreate.includes(file)).sort();
  const impactedReadOnly=[...new Set(executionRoute?.IMPACTED_READ_ONLY??[])].filter(file=>!mustEdit.includes(file)&&!mayEdit.includes(file)&&!mustCreate.includes(file)).sort();
  const forbidden=[...new Set([...(executionRoute?.FORBIDDEN_ROUTE_TOMBSTONES??[]),...(executionRoute?.PLANNED_FORBIDDEN_ROUTE_DELETIONS??[]),...(forbiddenPatterns??[])])].sort();
  return{contract:'shoporation.implementation-skeleton.v1',mustEdit,mayEdit,impactedReadOnly,mustCreate,forbidden,proof:[...new Set(executionRoute?.PROOF??[])].sort(),authority:[...new Set(executionRoute?.AUTHORITY??[])].sort(),unknown:[...(executionRoute?.UNKNOWN??[])]};
}
function guardInputPatterns(guard){return [...new Set([...(guard?.verification?.semanticInputs??[]),...(guard?.verification?.configurationInputs??[]),...(guard?.verification?.authorityInputs??[])])];}
export function guardAppliesToFiles(guard,files=[]){
  if(guard?.chain?.alwaysApplicable===true)return true;
  const inputs=guardInputPatterns(guard);
  return (files??[]).some(file=>inputs.some(pattern=>patternsMayOverlap(file,pattern)));
}
export function compileGateChain({guardRegistry,plannedFiles=[],phase='PLAN',explicitGuardIds=[]}={}){
  const guards=(guardRegistry?.guards??[]).filter(item=>item?.blocking===true),byId=new Map(guards.map(item=>[item.id,item])),selected=new Set(),issues=[];
  const products=guardRegistry?.ecosystem?.dataProducts??{};
  const dependenciesFor=guard=>[...new Set([
    ...(guard?.verification?.dependsOn??[]),
    ...(guard?.chain?.consumes??[]).map(input=>products[input]?.producer).filter(producer=>byId.has(producer)&&producer!==guard?.id),
  ])];
  const explicit=new Set(explicitGuardIds??[]);
  for(const guard of guards)if(explicit.has(guard.id)||guardAppliesToFiles(guard,plannedFiles))selected.add(guard.id);
  const queue=[...selected];
  while(queue.length){
    const id=queue.shift(),guard=byId.get(id);
    if(!guard){issues.push({code:'GATE_CHAIN_GUARD_UNKNOWN',guardId:id});continue;}
    if(!guard.chain)issues.push({code:'GATE_CHAIN_CONTRACT_MISSING',guardId:id});
    for(const dep of dependenciesFor(guard)){
      if(!byId.has(dep)){issues.push({code:'GATE_CHAIN_DEPENDENCY_MISSING',guardId:id,dependency:dep});continue;}
      if(!selected.has(dep)){selected.add(dep);queue.push(dep);}
    }
  }
  const producerIssues=[];
  for(const id of selected){
    const guard=byId.get(id);if(!guard?.chain)continue;
    for(const input of guard.chain.consumes??[])if(!products[input]?.producer)producerIssues.push({code:'GATE_CHAIN_INPUT_PRODUCER_MISSING',guardId:id,input});
    for(const output of guard.chain.produces??[])if(products[output]?.producer&&products[output].producer!==id)producerIssues.push({code:'GATE_CHAIN_OUTPUT_PRODUCER_CONFLICT',guardId:id,output,declaredProducer:products[output].producer});
  }
  issues.push(...producerIssues);
  const ordered=[],visiting=new Set(),visited=new Set();
  const visit=id=>{
    if(visited.has(id))return;
    if(visiting.has(id)){issues.push({code:'GATE_CHAIN_DEPENDENCY_CYCLE',guardId:id});return;}
    visiting.add(id);
    const guard=byId.get(id);
    for(const dep of dependenciesFor(guard))if(selected.has(dep))visit(dep);
    visiting.delete(id);visited.add(id);ordered.push(id);
  };
  for(const id of [...selected].sort())visit(id);
  const currentPhaseGateIds=ordered.filter(id=>(byId.get(id)?.chain?.phases??[]).includes(phase));
  const futureGateIds=ordered.filter(id=>!currentPhaseGateIds.includes(id));
  const externalGateIds=ordered.filter(id=>byId.get(id)?.chain?.execution==='external');
  return{contract:'shoporation.gate-chain.v1',phase,orderedGateIds:ordered,currentPhaseGateIds,futureGateIds,externalGateIds,issues,decision:issues.length?'BLOCK':'PASS'};
}

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

function gitCommitExists(sha){
  try{execFileSync('git',['cat-file','-e',`${sha}^{commit}`],{stdio:'ignore'});return true;}catch{return false;}
}
function gitIsAncestor(base,head){
  try{execFileSync('git',['merge-base','--is-ancestor',base,head],{stdio:'ignore'});return true;}catch{return false;}
}
export function resolveCanonicalDevelopmentTransactionIdentity({
  plan,
  eventBaseSha='',
  eventHeadSha='',
  commitExists=gitCommitExists,
  isAncestor=gitIsAncestor,
}={}){
  const base=String(plan?.changeBaseSha??'').trim(),eventBase=String(eventBaseSha??'').trim(),head=String(eventHeadSha??'').trim();
  if(!base)return{decision:'BLOCK',code:'CI_TRANSACTION_BASE_REQUIRED',base:null,head:head||null};
  if(!head)return{decision:'BLOCK',code:'CI_TRANSACTION_HEAD_REQUIRED',base,head:null};
  if(eventBase&&eventBase!==base)return{decision:'BLOCK',code:'CI_TRANSACTION_BASE_MISMATCH',base,head,eventBase};
  if(!commitExists(base))return{decision:'BLOCK',code:'CI_TRANSACTION_BASE_UNRESOLVED',base,head,eventBase:eventBase||null};
  if(!commitExists(head))return{decision:'BLOCK',code:'CI_TRANSACTION_HEAD_UNRESOLVED',base,head,eventBase:eventBase||null};
  if(!isAncestor(base,head))return{decision:'BLOCK',code:'CI_TRANSACTION_ANCESTRY_INVALID',base,head,eventBase:eventBase||null};
  const authority=plan?.releaseUnitContext?.planAuthority??'quality/development/active-plan.json#changeBaseSha';
  return{decision:'PASS',code:null,base,head,eventBase:eventBase||null,authority};
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
  const explicitSources=[
    ['DEVELOPMENT_HEAD_SHA',process.env.DEVELOPMENT_HEAD_SHA],
    ['QUALITY_HEAD_SHA',process.env.QUALITY_HEAD_SHA],
    ['SHOPERATION_REPLAY_HEAD',process.env.SHOPERATION_REPLAY_HEAD],
  ];
  const declared=explicitSources.map(([source,value])=>({source,value:String(value??'').trim()})).find(item=>item.value);
  if(declared){
    if(/^0+$/.test(declared.value))return{head:null,resolution:'UNRESOLVED_EXPLICIT',requestedHead:declared.value,source:declared.source};
    try{git(['cat-file','-e',`${declared.value}^{commit}`]);return{head:declared.value,resolution:'EXPLICIT',requestedHead:declared.value,source:declared.source};}
    catch{return{head:null,resolution:'UNRESOLVED_EXPLICIT',requestedHead:declared.value,source:declared.source};}
  }
  const eventPath=String(process.env.GITHUB_EVENT_PATH??'').trim();
  if(eventPath&&existsSync(eventPath))try{
    const event=JSON.parse(readFileSync(eventPath,'utf8')),candidate=String(event?.pull_request?.head?.sha??'').trim();
    if(candidate&&!/^0+$/.test(candidate)){git(['cat-file','-e',`${candidate}^{commit}`]);return{head:candidate,resolution:'PULL_REQUEST_HEAD',requestedHead:candidate,source:'GITHUB_EVENT_PATH'};}
  }catch{}
  const github=String(process.env.GITHUB_SHA??'').trim();
  if(github&&!/^0+$/.test(github)){try{git(['cat-file','-e',`${github}^{commit}`]);return{head:github,resolution:'GITHUB_SHA',requestedHead:github,source:'GITHUB_SHA'};}catch{}}
  return{head:'HEAD',resolution:'LOCAL_HEAD',requestedHead:null,source:'git'};
}
export function getChangedFiles({baseSha=null}={}){
  const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
  const requestedBase=String(baseSha??'').trim();
  const base=resolveDevelopmentBase({changeBaseSha:requestedBase||null});
  const headIdentity=resolveDevelopmentHead();
  const head=headIdentity.head;
  const baseResolution=requestedBase?(base===requestedBase?'DECLARED':'UNRESOLVED'):(base?'FALLBACK':'UNRESOLVED');
  if(!base||!head)return {base:base??null,requestedBase:requestedBase||null,baseResolution,head:head??null,requestedHead:headIdentity.requestedHead??null,headResolution:headIdentity.resolution,headSource:headIdentity.source??null,files:[],deletedFiles:[],materialFiles:[],materialDeletedFiles:[],metadataFiles:[],changes:[]};
  const output=git(['diff','--name-status','--diff-filter=ACMRD',base,head]);
  const parsed=parseChangedFileStatus(output);
  const metadataFiles=parsed.files.filter(isDevelopmentMetadataFile);
  const materialFiles=parsed.files.filter(file=>!isDevelopmentMetadataFile(file));
  const materialDeletedFiles=parsed.deletedFiles.filter(file=>!isDevelopmentMetadataFile(file));
  return {base,requestedBase:requestedBase||null,baseResolution,head,requestedHead:headIdentity.requestedHead??null,headResolution:headIdentity.resolution,headSource:headIdentity.source??null,...parsed,materialFiles,materialDeletedFiles,metadataFiles};
}
export function runVitest(files){
  if(!files.length)return {status:0,stdout:'',stderr:''};
  const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['vitest','run',...files],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return {status:result.status??1,stdout:result.stdout??'',stderr:result.stderr??''};
}
export function ensureFile(file){if(!existsSync(file))throw new Error(`Required file missing: ${file}`);}



if(process.argv.includes('--ci-transaction-self-test')){
  const commitExists=sha=>sha==='base'||sha==='head',isAncestor=(base,head)=>base==='base'&&head==='head';
  const pass=resolveCanonicalDevelopmentTransactionIdentity({plan:{changeBaseSha:'base'},eventBaseSha:'base',eventHeadSha:'head',commitExists,isAncestor});
  const mismatch=resolveCanonicalDevelopmentTransactionIdentity({plan:{changeBaseSha:'base'},eventBaseSha:'other',eventHeadSha:'head',commitExists,isAncestor});
  const ancestry=resolveCanonicalDevelopmentTransactionIdentity({plan:{changeBaseSha:'base'},eventHeadSha:'head',commitExists,isAncestor:()=>false});
  const ok=pass.decision==='PASS'&&mismatch.code==='CI_TRANSACTION_BASE_MISMATCH'&&ancestry.code==='CI_TRANSACTION_ANCESTRY_INVALID';
  console.log(`Development CI transaction self-test: ${ok?'PASS':'FAIL'}`);
  if(!ok)process.exitCode=1;
}

if(process.argv.includes('--ci-transaction-env')){
  const activePlan=readActiveDevelopmentPlan();
  const identity=resolveCanonicalDevelopmentTransactionIdentity({
    plan:activePlan,
    eventBaseSha:process.env.CI_EVENT_BASE_SHA,
    eventHeadSha:process.env.CI_EVENT_HEAD_SHA??process.env.GITHUB_SHA,
  });
  if(identity.decision!=='PASS'){
    console.error(`${identity.code}: canonical Development Transaction identity is invalid; planBase=${identity.base??'null'} eventBase=${identity.eventBase??'null'} head=${identity.head??'null'}`);
    process.exit(1);
  }
  for(const name of ['QUALITY_BASE_SHA','DEVELOPMENT_BASE_SHA','RELEASE_BASE_SHA'])console.log(`${name}=${identity.base}`);
  for(const name of ['QUALITY_HEAD_SHA','DEVELOPMENT_HEAD_SHA','RELEASE_HEAD_SHA','SHOPERATION_REPLAY_HEAD'])console.log(`${name}=${identity.head}`);
  console.log(`SHOPERATION_CANONICAL_BASE_SHA=${identity.base}`);
  console.log(`SHOPERATION_CANONICAL_HEAD_SHA=${identity.head}`);
  process.exit(0);
}

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
