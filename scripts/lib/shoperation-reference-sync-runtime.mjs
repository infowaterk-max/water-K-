import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {buildCodebaseAtlas} from './shoperation-codebase-atlas-runtime.mjs';

const EXTS=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.css','.scss','.sql','.yml','.yaml','.md','.sh']);
const CODE_EXPR=/\.(?:ts|tsx|js|jsx|mjs|cjs)$/i;
const MACHINE=/^(src|tests|scripts|quality|\.github|deploy|supabase)\//;
const ASSET=/\.(?:webp|png|jpe?g|gif|svg|avif|ico|pdf)$/i;
const COMPONENT_KEY=/^(?:support|system|commerce|guided|layout|content|marketing|configurator|composer|compatibility|context|retention)\.[\w.-]+$/i;
const REFERENCE_CANDIDATE_LIMIT=1000;
export function boundReferenceCandidates(candidates,limit=REFERENCE_CANDIDATE_LIMIT){const total=(candidates??[]).length,processed=(candidates??[]).slice(0,limit),overflow=Math.max(0,total-processed.length);return{candidates:processed,coverage:{limit,totalCandidateCount:total,processedCandidateCount:processed.length,overflow,decision:overflow?'BLOCK':'PASS'}};}
const git=(args,options={})=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024,...options});
const isText=file=>EXTS.has(path.extname(file).toLowerCase());
const current=file=>{try{return existsSync(file)&&isText(file)?readFileSync(file,'utf8'):'';}catch{return'';}};
const at=(ref,file)=>{try{return git(['show',`${ref}:${file}`],{stdio:['ignore','pipe','ignore']});}catch{return'';}};
const escapeRegExp=value=>value.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');

const exportsOf=source=>new Set([
  ...source.matchAll(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)
].map(match=>match[1]));

export function exportsRemovedAcrossPathChange(beforeSource,afterSource){
  const after=exportsOf(afterSource);
  return [...exportsOf(beforeSource)].filter(symbol=>symbol.length>=5&&!after.has(symbol));
}

const routeForFile=file=>{
  const match=file.match(/^src\/app\/(.*)\/(?:page|route)\.(?:ts|tsx|js|jsx)$/);
  return match?'/'+match[1].split('/').filter(segment=>segment&&!/^\(.*\)$/.test(segment)&&!segment.startsWith('@')).join('/'):null;
};

function appRoutePattern(file){
  const match=String(file??'').match(/^src\/app\/(.*\/)?(?:page|route)\.(?:ts|tsx|js|jsx)$/);
  if(!match)return null;
  const raw=String(match[1]??'').replace(/\/$/,'');
  const parts=raw.split('/').filter(Boolean).filter(segment=>!/^\(.*\)$/.test(segment)&&!segment.startsWith('@'));
  const pattern=parts.map(segment=>{
    if(/^\[\[\.\.\.[^\]]+\]\]$/.test(segment))return'(?:/.*)?';
    if(/^\[\.\.\.[^\]]+\]$/.test(segment))return'/.+';
    if(/^\[[^\]]+\]$/.test(segment))return'/[^/]+';
    return'/'+escapeRegExp(segment);
  }).join('');
  return new RegExp('^'+(pattern||'/')+'/?$');
}
let servedRoutePatternsCache=null;
function servedRoutePatterns(){
  if(servedRoutePatternsCache)return servedRoutePatternsCache;
  let files='';
  try{files=git(['ls-files','src/app']);}catch{}
  servedRoutePatternsCache=files.split(/\r?\n/).filter(Boolean).map(appRoutePattern).filter(Boolean);
  return servedRoutePatternsCache;
}
function routeLiteralStillServed(route){
  const value=String(route??'').split('?')[0].split('#')[0]||'/';
  return servedRoutePatterns().some(pattern=>pattern.test(value));
}

const DELETED_ROUTE_GLOBAL_REFERENCE_KINDS=new Set([
  'file-path','asset-path','route-literal','component-key','registry-key','config-key','route-key','schema-field','data-attribute','css-variable','css-class',
]);
export function filterDeletedRouteReferenceCandidates(candidates,deletedFiles=[]){
  const deletedRoutes=new Set((deletedFiles??[]).filter(file=>Boolean(routeForFile(file))));
  return (candidates??[]).filter(candidate=>!deletedRoutes.has(candidate.originFile)||DELETED_ROUTE_GLOBAL_REFERENCE_KINDS.has(candidate.kind));
}

function implementationExpression(line){
  const value=line.trim().replace(/[;,]\s*$/,'');
  const bareObjectKey=/^(?:['"`][^'"`]+['"`]|[A-Za-z_$][\w$-]*)\s*:\s*\{$/;
  if(value.length<16||value.length>200||bareObjectKey.test(value)||/^(?:\/\/|\/\*|\*|#|import\b|export\s+type\b)/.test(value)||/\b(?:expect|toContain|toMatch|describe|it|test)\s*\(/.test(value)||!/[A-Za-z_$]/.test(value)||!/[.()[\]\/ :=<>-]/.test(value))return'';
  return value;
}

export function extractReferenceCandidatesFromLine(line,file){
  if(file==='quality/development/active-plan.json'||file==='AGENTS.md'||file.startsWith('docs/')||file.endsWith('.md'))return[];
  const out=[];
  const add=(kind,value,severity='block')=>{const normalized=String(value??'').trim();if(normalized.length>=4)out.push({kind,value:normalized,severity,originFile:file});};
  for(const match of line.matchAll(/['"`]([^'"`\n]{4,200})['"`]/g)){
    const value=match[1],prefix=line.slice(Math.max(0,match.index-40),match.index);
    if(ASSET.test(value)||value.includes('/storefront-demo/'))add('asset-path',value);
    else if(/^data-[\w-]+$/.test(value))add('data-attribute',value);
    else if(COMPONENT_KEY.test(value))add('component-key',value);
    else if(/^\/[\w@.+~:/?=&%-]+$/.test(value))add('route-literal',value,'review');
    else if(/(?:componentKey|registryKey|configKey|routeKey|schemaKey)\s*[:=]\s*$/.test(prefix))add(/componentKey/.test(prefix)?'component-key':/registryKey/.test(prefix)?'registry-key':/configKey/.test(prefix)?'config-key':/routeKey/.test(prefix)?'route-key':'schema-field',value);
    else if(/(?:aria-label|title|label|heading|buttonLabel|placeholder)\s*=\s*$/.test(prefix))add('display-text',value);
  }
  for(const match of line.matchAll(/>([^<>{}\n]{4,120})</g)){
    const value=match[1].replace(/\s+/g,' ').trim();
    if(/[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]/.test(value))add('display-text',value);
  }
  for(const match of line.matchAll(/\b(data-[\w-]{4,})\b/g))add('data-attribute',match[1]);
  const cssVariables=new Set();
  for(const match of line.matchAll(/\bvar\(\s*(--[a-z0-9_-]{4,})/gi))cssVariables.add(match[1]);
  for(const match of line.matchAll(/\b(?:getPropertyValue|setProperty|removeProperty)\(\s*['"`](--[a-z0-9_-]{4,})['"`]/gi))cssVariables.add(match[1]);
  for(const match of line.matchAll(/['"`](--[a-z0-9_-]{4,})['"`]\s*:/gi))cssVariables.add(match[1]);
  if(/\.(?:css|scss)$/.test(file)){
    for(const match of line.matchAll(/(?:^|[;{]\s*)(--[a-z0-9_-]{4,})\s*:/gi))cssVariables.add(match[1]);
  }
  for(const value of cssVariables)add('css-variable',value);
  if(/\.(?:css|scss)$/.test(file))for(const match of line.matchAll(/\.([A-Za-z_][\w-]{3,})/g))add('css-class',match[1]);
  if(CODE_EXPR.test(file)){const expression=implementationExpression(line);if(expression)add('implementation-expression',expression);}
  return out;
}

export function reconcileReferenceRelocations(candidates,addedCandidates){
  const key=item=>`${item.kind}\0${item.value}`;
  const additions=new Map();
  for(const item of addedCandidates??[]){
    const k=key(item),rows=additions.get(k)??[];
    rows.push(item);additions.set(k,rows);
  }
  const remaining=[],relocations=[];
  for(const candidate of candidates??[]){
    const destinations=[...new Set((additions.get(key(candidate))??[])
      .map(item=>item.originFile)
      .filter(file=>file&&file!==candidate.originFile))].sort();
    if(destinations.length){
      relocations.push({
        kind:candidate.kind,
        value:candidate.value,
        fromFile:candidate.originFile,
        toFiles:destinations,
      });
    }else remaining.push(candidate);
  }
  return{remaining,relocations};
}

function diffData(base,head){
  let patch='',names='';
  try{patch=git(['diff','--find-renames','--unified=0','--no-color',base,head,'--']);}catch{}
  try{names=git(['diff','--find-renames','--name-status',base,head,'--']);}catch{}
  const candidates=[],addedCandidates=[],changed=[];let file='',hunk=0,removed=[],added=[];
  const flush=()=>{
    const before=removed.flatMap(line=>extractReferenceCandidatesFromLine(line,file));
    const after=added.flatMap(line=>extractReferenceCandidatesFromLine(line,file));
    addedCandidates.push(...after);
    for(const reference of before){
      candidates.push(reference);
      const replacement=after.find(item=>item.kind===reference.kind&&item.value!==reference.value);
      if(replacement)changed.push({kind:reference.kind,file,from:reference.value,to:replacement.value,hunk});
    }
    removed=[];added=[];
  };
  for(const line of patch.split(/\r?\n/)){
    if(line.startsWith('diff --git ')){flush();file='';}
    else if(line.startsWith('+++ ')){const value=line.slice(4).replace(/^b\//,'').trim();if(value!='/dev/null')file=value;}
    else if(line.startsWith('--- ')&&!file){const value=line.slice(4).replace(/^a\//,'').trim();if(value!='/dev/null')file=value;}
    else if(line.startsWith('@@ ')){flush();hunk+=1;}
    else if(line.startsWith('-')&&!line.startsWith('---'))removed.push(line.slice(1));
    else if(line.startsWith('+')&&!line.startsWith('+++'))added.push(line.slice(1));
  }
  flush();
  const files=[];
  for(const line of names.split(/\r?\n/).filter(Boolean)){
    const parts=line.split('\t'),status=parts[0][0],oldPath=parts[1],newPath=(status==='R'||status==='C')?parts[2]:(status==='D'?null:parts[1]);
    files.push({status,old:oldPath,neu:newPath});
    if(status==='D'||status==='R'){
      candidates.push({kind:'file-path',value:oldPath,severity:'block',originFile:oldPath});
      if(oldPath.startsWith('public/'))candidates.push({kind:'asset-path',value:'/'+oldPath.slice(7),severity:'block',originFile:oldPath});
      const route=routeForFile(oldPath);if(route)candidates.push({kind:'route-literal',value:route,severity:'review',originFile:oldPath});
    }
  }
  const movedByOld=new Map(files.filter(item=>item.status==='R'||item.status==='C').map(item=>[item.old,item.neu]));
  const absentAtBase=new Set(files.filter(item=>['A','R','C'].includes(item.status)).map(item=>item.neu).filter(Boolean));
  for(const fileName of new Set(files.flatMap(item=>[item.old,item.neu]).filter(Boolean))){
    if(!isText(fileName))continue;
    const before=absentAtBase.has(fileName)?'':at(base,fileName),relocatedTo=movedByOld.get(fileName),after=at(head,relocatedTo??fileName);if(!before)continue;
    for(const symbol of exportsRemovedAcrossPathChange(before,after))candidates.push({kind:'export-symbol',value:symbol,severity:'block',originFile:fileName,relocatedTo:relocatedTo??null});
  }
  const deletedFiles=files.filter(item=>item.status==='D').map(item=>item.old);
  const highSignalCandidates=filterDeletedRouteReferenceCandidates(candidates,deletedFiles);
  const relocation=reconcileReferenceRelocations(highSignalCandidates,addedCandidates);
  const seen=new Set();
  const uniqueCandidates=relocation.remaining.filter(candidate=>{
    const key=`${candidate.kind}|${candidate.value}|${candidate.originFile}`;if(seen.has(key))return false;seen.add(key);
    const source=at(head,candidate.originFile);if(!source)return true;
    if(candidate.kind==='export-symbol')return!exportsOf(source).has(candidate.value);
    if(candidate.kind==='css-class')return!new RegExp(`\\.${escapeRegExp(candidate.value)}(?![\\w-])`).test(source);
    return!source.includes(candidate.value);
  });
  const bounded=boundReferenceCandidates(uniqueCandidates);
  return{
    files,
    relocations:relocation.relocations,
    candidates:bounded.candidates,
    candidateCoverage:bounded.coverage,
    changed,
  };
}

function grep(patterns,ref){
  if(!patterns.length)return[];
  let output='';const args=['grep','-n','-F','-f','-'];if(ref)args.push(ref);args.push('--');
  try{output=git(args,{input:patterns.join('\n')+'\n'});}catch(error){output=String(error?.stdout??'');}
  return output.split(/\r?\n/).filter(Boolean).map(raw=>{
    if(ref&&raw.startsWith(ref+':'))raw=raw.slice(ref.length+1);
    const match=raw.match(/^(.*?):(\d+):(.*)$/);
    return match?{file:match[1],line:Number(match[2]),text:match[3],source:'lexical'}:null;
  }).filter(item=>item&&isText(item.file)&&item.file!=='quality/development/active-plan.json');
}

function semanticConsumers(atlas,candidates){
  const rows=[],seen=new Set();
  for(const candidate of candidates){
    const files=new Set();
    if(candidate.kind==='component-key')for(const file of atlas.literalIndex?.[candidate.value]??[])files.add(file);
    if(candidate.kind==='export-symbol')for(const file of atlas.referenceIndex?.[candidate.value]??[])files.add(file);
    for(const node of atlas.semanticGraph?.nodes??[])if(node.name===candidate.value&&node.file)files.add(node.file);
    for(const edge of atlas.semanticGraph?.edges??[])if(edge.label===candidate.value&&edge.fromFile)files.add(edge.fromFile);
    for(const file of files){
      if(file===candidate.originFile)continue;
      const key=`${file}|${candidate.value}`;if(seen.has(key))continue;seen.add(key);
      rows.push({file,line:0,text:`[semantic:${candidate.kind}] ${candidate.value}`,source:'semantic'});
    }
  }
  return rows;
}

const negative=row=>/\.not\.(?:toContain|toMatch|toEqual)|forbiddenApproaches/.test(row.text)||/^\s*(?:\/\/|\/\*|\*|#)/.test(row.text);
const matches=(row,candidate)=>candidate.kind==='export-symbol'?new RegExp(`\\b${escapeRegExp(candidate.value)}\\b`).test(row.text):candidate.kind==='css-class'?(row.text.includes('.'+candidate.value)||row.text.includes(candidate.value)):row.text.includes(candidate.value);
let referenceSyncChangedFiles=new Set();
let activeTemplateRootsCache=null;
function activeTemplateSourceRoots(){
  if(activeTemplateRootsCache)return activeTemplateRootsCache;
  const catalog=current('src/lib/builder/storefront-template-catalog.ts');
  const roots=[...catalog.matchAll(/from\s+['"`]@\/lib\/builder\/templates\/([^'"`]+)['"`]/g)]
    .map(match=>'src/lib/builder/templates/'+match[1].replace(/\/$/,''));
  activeTemplateRootsCache=[...new Set(roots)].sort();
  return activeTemplateRootsCache;
}
function activeTemplateRootContains(file,root){
  return file===root||file===root+'.ts'||file===root+'.tsx'||file===root+'.js'||file===root+'.jsx'||file.startsWith(root+'/');
}
function isRetiredTemplateSourceHistory(file){
  if(!file.startsWith('src/lib/builder/templates/'))return false;
  if(referenceSyncChangedFiles.has(file))return false;
  return!activeTemplateSourceRoots().some(root=>activeTemplateRootContains(file,root));
}

function tombstoneEvidence(row,candidate){
  if(!/^(?:tests|scripts)\//.test(row.file)||!['file-path','route-literal','route-key'].includes(candidate.kind))return false;
  const source=current(row.file);
  const lines=source.split(/\r?\n/),index=Math.max(0,(row.line||1)-1);
  const context=lines.slice(Math.max(0,index-8),Math.min(lines.length,index+9)).join('\n');
  const evidenceText=[row.text??'',context].join('\n');
  return/\b(?:deleted|deletedRoute|tombstone|plannedDeletion|plannedDeletions|forbiddenRoute|forbiddenStates|INSTRUCTION_REQUIRED|INSTRUCTION_REQUIREMENTS|PO_INSTRUCTIONS|self-test)\b/i.test(evidenceText);
}
function classification(row,candidate){
  if(row.file===candidate.originFile||negative(row))return'ignored';
  if(row.file==='AGENTS.md'||row.file.startsWith('docs/')||row.file.endsWith('.md'))return'evidence';
  if(isRetiredTemplateSourceHistory(row.file))return'evidence';
  if(row.file==='quality/knowledge/po-instructions.v1.json')return'evidence';
  if(tombstoneEvidence(row,candidate))return'evidence';
  if(candidate.kind==='display-text')return'ignored';
  if(candidate.kind==='route-literal'&&routeLiteralStillServed(candidate.value))return'ignored';
  if(candidate.severity==='review')return'review';
  if(candidate.kind==='implementation-expression')return/^(tests|scripts|quality|\.github)\//.test(row.file)?'block':'review';
  return MACHINE.test(row.file)?'block':'review';
}

export function evaluateCandidateConsumers(candidates,before,after){
  return candidates.map(candidate=>{
    const beforeConsumers=before.filter(row=>matches(row,candidate));
    const afterConsumers=after.filter(row=>matches(row,candidate)).map(row=>({...row,classification:classification(row,candidate)}));
    const afterFiles=new Set(afterConsumers.map(row=>row.file));
    return{
      candidate,beforeConsumers,afterConsumers,
      staleConsumers:afterConsumers.filter(row=>row.classification==='block'),
      reviewConsumers:afterConsumers.filter(row=>row.classification==='review'),
      evidenceConsumers:afterConsumers.filter(row=>row.classification==='evidence'),
      updatedConsumers:[...new Set(beforeConsumers.map(row=>row.file).filter(file=>!afterFiles.has(file)&&file!==candidate.originFile))],
    };
  }).filter(item=>item.afterConsumers.length||item.updatedConsumers.length);
}

export function evaluateReferenceSynchronization({base,head}){
  if(!base)return{contract:'shoporation.reference-sync.v2',base,head,decision:'BLOCK',reason:'REFERENCE_SYNC_BASE_REQUIRED',staleConsumers:[],reviewConsumers:[],updatedConsumers:[]};
  if(!head)return{contract:'shoporation.reference-sync.v2',base,head,decision:'BLOCK',reason:'REFERENCE_SYNC_HEAD_REQUIRED',staleConsumers:[],reviewConsumers:[],updatedConsumers:[]};
  let resolvedHead='',checkoutHead='';try{resolvedHead=git(['rev-parse',head]).trim();checkoutHead=git(['rev-parse','HEAD']).trim();}catch{}
  if(!resolvedHead||!checkoutHead||resolvedHead!==checkoutHead)return{contract:'shoporation.reference-sync.v2',base,head,decision:'BLOCK',reason:'REFERENCE_SYNC_CHECKOUT_HEAD_MISMATCH',identity:{resolvedHead:resolvedHead||null,checkoutHead:checkoutHead||null},staleConsumers:[],reviewConsumers:[],updatedConsumers:[]};
  const diff=diffData(base,head),patterns=[...new Set(diff.candidates.map(item=>item.value))];
  referenceSyncChangedFiles=new Set(diff.files.flatMap(item=>[item.old,item.neu]).filter(Boolean));
  activeTemplateRootsCache=null;
  const before=grep(patterns,base);
  const atlas=buildCodebaseAtlas();
  const after=[...grep(patterns,head),...semanticConsumers(atlas,diff.candidates)];
  const consumers=evaluateCandidateConsumers(diff.candidates,before,after);
  const staleConsumers=consumers.flatMap(item=>item.staleConsumers.map(row=>({reference:item.candidate,...row})));
  const reviewConsumers=consumers.flatMap(item=>item.reviewConsumers.map(row=>({reference:item.candidate,...row})));
  const updatedConsumers=[...new Set(consumers.flatMap(item=>item.updatedConsumers))];
  return{
    contract:'shoporation.reference-sync.v2',base,head,identity:{resolvedHead,checkoutHead},
    semanticGraph:{contract:atlas.semanticGraph?.contract??null,typeCheckerAvailable:atlas.semanticGraph?.typeCheckerAvailable===true},
    before:{changedFiles:diff.files.map(item=>item.old),candidateCount:diff.candidateCoverage?.totalCandidateCount??diff.candidates.length,processedCandidateCount:diff.candidates.length,consumerHitCount:before.length},
    after:{changedFiles:diff.files.map(item=>item.neu).filter(Boolean),consumerHitCount:after.length},
    coverage:diff.candidateCoverage??{limit:REFERENCE_CANDIDATE_LIMIT,totalCandidateCount:diff.candidates.length,processedCandidateCount:diff.candidates.length,overflow:0,decision:'PASS'},
    removedReferences:diff.candidates,relocatedReferences:diff.relocations??[],changedReferences:diff.changed,consumers,staleConsumers,reviewConsumers,updatedConsumers,
    decision:(staleConsumers.length||(diff.candidateCoverage?.overflow??0)>0)?'BLOCK':'PASS',
  };
}

if(process.argv.includes('--self-test')){
  const candidates=[
    {kind:'implementation-expression',value:'window.location.assign(routes.cart)',severity:'block',originFile:'src/runtime.tsx'},
    {kind:'asset-path',value:'/storefront-demo/loot-vault-v2/hero.webp',severity:'block',originFile:'public/storefront-demo/loot-vault-v2/hero.webp'},
    {kind:'component-key',value:'layout.container',severity:'block',originFile:'src/provider.ts'},
  ];
  const after=[
    {file:'tests/runtime.test.ts',line:1,text:"expect(source).toContain('window.location.assign(routes.cart)')"},
    {file:'tests/negative.test.ts',line:1,text:"expect(source).not.toContain('window.location.assign(routes.cart)')"},
    {file:'src/package.json',line:1,text:'"/storefront-demo/loot-vault-v2/hero.webp"'},
    {file:'src/consumer.ts',line:0,text:'[semantic:component-key] layout.container',source:'semantic'},
  ];
  const stale=evaluateCandidateConsumers(candidates,[],after).flatMap(item=>item.staleConsumers);
  if(stale.length!==3||stale.some(item=>item.file.includes('negative')))throw new Error('REFERENCE_SYNC_SELF_TEST_FAILED');
  const before='export async function startPlatformPilotAcceptanceAction(){}\nexport const KEEP_ME=1;';
  const unchanged='export async function startPlatformPilotAcceptanceAction(){}\nexport const KEEP_ME=1;';
  const renamed='export async function startStorefrontPilotAcceptanceAction(){}\nexport const KEEP_ME=1;';
  if(exportsRemovedAcrossPathChange(before,unchanged).length!==0)throw new Error('REFERENCE_SYNC_RENAME_UNCHANGED_EXPORT_FALSE_POSITIVE');
  const movedRemoved=exportsRemovedAcrossPathChange(before,renamed);
  if(!movedRemoved.includes('startPlatformPilotAcceptanceAction')||movedRemoved.includes('KEEP_ME'))throw new Error('REFERENCE_SYNC_RENAME_REMOVED_EXPORT_FALSE_NEGATIVE');
  const bareKeyCandidates=extractReferenceCandidatesFromLine("'GUARD-EDIT-TIME':{",'scripts/example.mjs');
  if(bareKeyCandidates.some(item=>item.kind==='implementation-expression'))throw new Error('REFERENCE_SYNC_BARE_OBJECT_KEY_FALSE_POSITIVE');
  const substantiveCandidates=extractReferenceCandidatesFromLine("const decision=aggregateGateDecision({localBlocking:true,childDecisions:['BLOCK']})",'scripts/example.mjs');
  if(!substantiveCandidates.some(item=>item.kind==='implementation-expression'))throw new Error('REFERENCE_SYNC_HIGH_SIGNAL_EXPRESSION_FALSE_NEGATIVE');
  const overflowProbe=boundReferenceCandidates(Array.from({length:1001},(_,index)=>({kind:'route-literal',value:'/r'+index,originFile:'src/x.ts'})));
  if(overflowProbe.coverage.decision!=='BLOCK'||overflowProbe.coverage.overflow!==1||overflowProbe.candidates.length!==1000)throw new Error('REFERENCE_SYNC_OVERFLOW_FAIL_OPEN');
  const deletedRoute='src/app/szallitas-es-fizetes/page.tsx';
  const deletedRouteCandidates=filterDeletedRouteReferenceCandidates([
    {kind:'display-text',value:'Szállítás és fizetés',originFile:deletedRoute},
    {kind:'implementation-expression',value:'export default async function ShippingPaymentPage()',originFile:deletedRoute},
    {kind:'export-symbol',value:'generateMetadata',originFile:deletedRoute},
    {kind:'route-literal',value:'/szallitas-es-fizetes',severity:'review',originFile:deletedRoute},
    {kind:'file-path',value:deletedRoute,severity:'block',originFile:deletedRoute},
  ],[deletedRoute]);
  if(deletedRouteCandidates.some(item=>['display-text','implementation-expression','export-symbol'].includes(item.kind)))throw new Error('REFERENCE_SYNC_DELETED_ROUTE_GENERIC_FALSE_POSITIVE');
  if(!deletedRouteCandidates.some(item=>item.kind==='route-literal')||!deletedRouteCandidates.some(item=>item.kind==='file-path'))throw new Error('REFERENCE_SYNC_DELETED_ROUTE_IDENTITY_FALSE_NEGATIVE');
  const evidenceProbe=evaluateCandidateConsumers(
    [{kind:'file-path',value:deletedRoute,severity:'block',originFile:deletedRoute}],
    [],
    [
      {file:'quality/knowledge/po-instructions.v1.json',line:1,text:`"src/app/szallitas-es-fizetes/page.tsx"`},
      {file:'tests/example.test.ts',line:2,text:`const deleted='src/app/szallitas-es-fizetes/page.tsx';`},
      {file:'src/live-consumer.ts',line:3,text:`const source='src/app/szallitas-es-fizetes/page.tsx';`},
    ],
  )[0];
  if(evidenceProbe.evidenceConsumers.length!==2||evidenceProbe.staleConsumers.length!==1||evidenceProbe.staleConsumers[0]?.file!=='src/live-consumer.ts')throw new Error('REFERENCE_SYNC_TOMBSTONE_EVIDENCE_CLASSIFICATION_FAILED');
  const displayProbe=evaluateCandidateConsumers(
    [{kind:'display-text',value:'Független felirat',severity:'block',originFile:'src/origin.tsx'}],
    [],
    [{file:'src/unrelated.tsx',line:1,text:'<span>Független felirat</span>'}],
  )[0];
  if(displayProbe?.staleConsumers?.length||displayProbe?.reviewConsumers?.length)throw new Error('REFERENCE_SYNC_DISPLAY_TEXT_IDENTITY_FALSE_POSITIVE');
  const servedAliasProbe=evaluateCandidateConsumers(
    [{kind:'route-literal',value:'/oldal/szallitas',severity:'review',originFile:'src/origin.tsx'}],
    [],
    [{file:'src/consumer.ts',line:1,text:"const href='/oldal/szallitas';"}],
  )[0];
  if(servedAliasProbe?.staleConsumers?.length||servedAliasProbe?.reviewConsumers?.length)throw new Error('REFERENCE_SYNC_SERVED_ROUTE_FALSE_POSITIVE');
  const missingRouteProbe=evaluateCandidateConsumers(
    [{kind:'route-literal',value:'/__reference-sync-definitely-missing__',severity:'review',originFile:'src/origin.tsx'}],
    [],
    [{file:'src/consumer.ts',line:1,text:"const href='/__reference-sync-definitely-missing__';"}],
  )[0];
  if(missingRouteProbe?.reviewConsumers?.length!==1)throw new Error('REFERENCE_SYNC_MISSING_ROUTE_FALSE_NEGATIVE');
  const savedChangedFiles=referenceSyncChangedFiles;
  referenceSyncChangedFiles=new Set();
  const legacyTemplateProbe=evaluateCandidateConsumers(
    [{kind:'route-literal',value:'/oldal/szallitas',severity:'review',originFile:'src/origin.tsx'}],
    [],
    [{file:'src/lib/builder/templates/legacy-example.ts',line:1,text:"const href='/oldal/szallitas';"}],
  )[0];
  referenceSyncChangedFiles=new Set(['src/lib/builder/templates/legacy-example.ts']);
  const changedLegacyProbe=evaluateCandidateConsumers(
    [{kind:'route-literal',value:'/__reference-sync-definitely-missing__',severity:'review',originFile:'src/origin.tsx'}],
    [],
    [{file:'src/lib/builder/templates/legacy-example.ts',line:1,text:"const href='/__reference-sync-definitely-missing__';"}],
  )[0];
  referenceSyncChangedFiles=savedChangedFiles;
  if(legacyTemplateProbe?.reviewConsumers?.length||legacyTemplateProbe?.staleConsumers?.length||legacyTemplateProbe?.evidenceConsumers?.length!==1)throw new Error('REFERENCE_SYNC_RETIRED_TEMPLATE_HISTORY_FALSE_BLOCK');
  if(changedLegacyProbe?.reviewConsumers?.length!==1)throw new Error('REFERENCE_SYNC_CHANGED_RETIRED_TEMPLATE_FALSE_PASS');
  console.log('Reference Sync self-test: PASS; rename-export-identity=PASS; deleted-route-generic=IGNORED; display-text=NON_IDENTITY; served-route=COMPATIBLE; legacy-template-source=EVIDENCE; changed-legacy=CHECKED; tombstone-evidence=PASS; coverage-overflow=BLOCK');
}
