import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {globToRegExp,getAllFailures,releasePolicy} from './shoperation-development-runtime.mjs';

const policy=JSON.parse(readFileSync('quality/knowledge/codebase-atlas-policy.v1.json','utf8'));
const textExtensions=new Set(policy.textExtensions),sourceExtensions=new Set(policy.sourceExtensions);
const surfaceMatchers=policy.surfaceRules.map(rule=>({...rule,matchers:rule.patterns.map(globToRegExp)}));
const subsystemMatchers=releasePolicy.subsystems.map(item=>({...item,matchers:item.patterns.map(globToRegExp)}));

const normalize=value=>value.replaceAll('\\','/');
const trackedFiles=()=>execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\r?\n/).map(normalize).filter(Boolean).filter(file=>!policy.excludedPrefixes.some(prefix=>file.startsWith(prefix)));
const isText=file=>textExtensions.has(path.extname(file).toLowerCase());
const classifySubsystems=file=>subsystemMatchers.filter(item=>item.matchers.some(m=>m.test(file))).map(item=>item.name);
const classifySurfaces=file=>surfaceMatchers.filter(item=>item.matchers.some(m=>m.test(file))).map(item=>item.id);

function routeForFile(file){
  const match=file.match(/^src\/app\/(.*)\/(page|route)\.(?:ts|tsx|js|jsx)$/)||file.match(/^src\/app\/(page|route)\.(?:ts|tsx|js|jsx)$/);
  if(!match)return null;
  const raw=match.length===3?match[1]:'';
  const kind=match.length===3?match[2]:match[1];
  const segments=(raw??'').split('/').filter(Boolean).filter(segment=>!/^\(.*\)$/.test(segment)&&!segment.startsWith('@')).map(segment=>{
    const optional=segment.match(/^\[\[\.\.\.([^\]]+)\]\]$/);if(optional)return`*${optional[1]}?`;
    const catchAll=segment.match(/^\[\.\.\.([^\]]+)\]$/);if(catchAll)return`*${catchAll[1]}`;
    const dynamic=segment.match(/^\[([^\]]+)\]$/);if(dynamic)return`:${dynamic[1]}`;
    return segment;
  });
  return {path:'/'+segments.join('/'),kind:kind==='route'?'api':'page'};
}
function extractImports(source){
  const specs=new Set();
  for(const re of [/\bfrom\s*['"]([^'"]+)['"]/g,/\bimport\s*['"]([^'"]+)['"]/g,/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g])for(const m of source.matchAll(re))specs.add(m[1]);
  return [...specs];
}
function extractExports(source){
  const names=new Set();
  for(const m of source.matchAll(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g))names.add(m[1]);
  for(const m of source.matchAll(/\bexport\s*\{([^}]+)\}/g))for(const part of m[1].split(',')){const name=part.trim().split(/\s+as\s+/i).at(-1)?.trim();if(name&&/^[A-Za-z_$][\w$]*$/.test(name))names.add(name);}
  return [...names].sort();
}
function extractReferenceTerms(source){
  const terms=new Set();
  for(const m of source.matchAll(/\b[A-Za-z_][A-Za-z0-9_$]{3,}\b/g)){
    const value=m[0];
    if(value.includes('_')||/[a-z][A-Z]/.test(value)||/^[A-Z][A-Za-z0-9_$]+$/.test(value))terms.add(value);
  }
  return [...terms].sort();
}
function extractLiteralKeys(source){
  const keys=new Set();
  for(const m of source.matchAll(/componentKey\s*:\s*['"]([^'"]+)['"]/g))keys.add(m[1]);
  for(const m of source.matchAll(/data-storefront-component\s*=\s*['"]([^'"]+)['"]/g))keys.add(m[1]);
  for(const m of source.matchAll(/['"]((?:support|system|commerce|guided|layout|content|marketing|configurator|composer|compatibility|context|retention)\.[a-z0-9._-]+)['"]/gi))keys.add(m[1]);
  return [...keys].sort();
}
function resolveImport(fromFile,spec,fileSet){
  if(!(spec.startsWith('.')||spec.startsWith('@/')))return null;
  const base=spec.startsWith('@/')?path.posix.join('src',spec.slice(2)):path.posix.normalize(path.posix.join(path.posix.dirname(fromFile),spec));
  const candidates=[base,base+'.ts',base+'.tsx',base+'.js',base+'.jsx',base+'.mjs',base+'.cjs',base+'.json',base+'.css',path.posix.join(base,'index.ts'),path.posix.join(base,'index.tsx'),path.posix.join(base,'index.js'),path.posix.join(base,'index.mjs')].map(normalize);
  return candidates.find(candidate=>fileSet.has(candidate))??null;
}

export function buildCodebaseAtlas(){
  const files=trackedFiles(),fileSet=new Set(files),nodes=[],unresolvedInternalImports=[];
  for(const file of files){
    const ext=path.extname(file).toLowerCase(),text=isText(file)&&existsSync(file)?readFileSync(file,'utf8'):'';
    const imports=sourceExtensions.has(ext)?extractImports(text):[];
    const resolvedImports=[],externalImports=[];
    for(const spec of imports){
      const resolved=resolveImport(file,spec,fileSet);
      if(resolved)resolvedImports.push(resolved);
      else if(spec.startsWith('.')||spec.startsWith('@/'))unresolvedInternalImports.push({from:file,specifier:spec});
      else externalImports.push(spec);
    }
    const route=routeForFile(file);
    nodes.push({
      path:file,extension:ext,kind:route?'route':file.startsWith('tests/')?'test':file.startsWith('supabase/')?'database':sourceExtensions.has(ext)?'code':'supporting',
      route,subsystems:classifySubsystems(file),surfaces:classifySurfaces(file),
      imports:[...new Set(resolvedImports)].sort(),externalImports:[...new Set(externalImports)].sort(),
      exports:sourceExtensions.has(ext)?extractExports(text):[],literalKeys:text?extractLiteralKeys(text):[],referenceTerms:text?extractReferenceTerms(text):[],
    });
  }
  const byPath=new Map(nodes.map(node=>[node.path,node])),reverse=Object.create(null);
  for(const node of nodes)for(const target of node.imports){(reverse[target]??=[]).push(node.path);}
  for(const key of Object.keys(reverse))reverse[key]=[...new Set(reverse[key])].sort();
  const routes=nodes.filter(node=>node.route).map(node=>({file:node.path,...node.route}));
  const literalIndex=Object.create(null);for(const node of nodes)for(const key of node.literalKeys){(literalIndex[key]??=[]).push(node.path);}
  for(const key of Object.keys(literalIndex))literalIndex[key]=[...new Set(literalIndex[key])].sort();
  const exportIndex=Object.create(null);for(const node of nodes)for(const symbol of node.exports){(exportIndex[symbol]??=[]).push(node.path);}
  for(const key of Object.keys(exportIndex))exportIndex[key]=[...new Set(exportIndex[key])].sort();
  const referenceIndex=Object.create(null);for(const node of nodes)for(const term of node.referenceTerms){(referenceIndex[term]??=[]).push(node.path);}
  for(const key of Object.keys(referenceIndex))referenceIndex[key]=[...new Set(referenceIndex[key])].sort();
  const subsystemCounts=Object.create(null);for(const node of nodes)for(const subsystem of node.subsystems)subsystemCounts[subsystem]=(subsystemCounts[subsystem]??0)+1;
  const duplicateRoutes=Object.entries(routes.reduce((acc,item)=>{const key=`${item.kind}:${item.path}`;(acc[key]??=[]).push(item.file);return acc;},{})).filter(([,value])=>value.length>1).map(([routeKey,files])=>({routeKey,files}));
  const allFailures=getAllFailures();
  return {
    contract:'shoporation.codebase-atlas.v1',generatedAt:new Date().toISOString(),
    summary:{trackedFiles:files.length,indexedNodes:nodes.length,codeNodes:nodes.filter(n=>n.kind==='code').length,testNodes:nodes.filter(n=>n.kind==='test').length,routeNodes:routes.length,importEdges:nodes.reduce((n,x)=>n+x.imports.length,0),exportedSymbols:Object.keys(exportIndex).length,literalKeys:Object.keys(literalIndex).length,referenceTerms:Object.keys(referenceIndex).length,unresolvedInternalImports:unresolvedInternalImports.length,duplicateRoutes:duplicateRoutes.length,subsystemCounts},
    nodes,routes,reverseImports:reverse,literalIndex,exportIndex,referenceIndex,unresolvedInternalImports,duplicateRoutes,
    knownFailureIndex:Object.fromEntries(allFailures.map(f=>[f.id,{title:f.title,provider:f.provider,applicability:f.applicability,regressionTests:f.regressionTests}])),
  };
}

function traverseReverse(atlas,startPaths){
  const byPath=new Map(atlas.nodes.map(node=>[node.path,node])),queue=[...startPaths],visited=new Set(startPaths),routes=[],tests=[],consumers=[];
  while(queue.length&&visited.size<=policy.maxImpactTraversal){
    const current=queue.shift();
    for(const next of atlas.reverseImports[current]??[]){
      if(visited.has(next))continue;visited.add(next);queue.push(next);consumers.push(next);
      const node=byPath.get(next);if(node?.route)routes.push({file:next,...node.route});if(node?.kind==='test')tests.push(next);
    }
  }
  return {consumers:[...new Set(consumers)].slice(0,policy.maxImpactResults),routes:[...new Map(routes.map(r=>[`${r.kind}:${r.path}`,r])).values()].slice(0,policy.maxImpactResults),tests:[...new Set(tests)].slice(0,policy.maxImpactResults),traversed:visited.size};
}
export function impactForAtlasPattern(atlas,pattern){
  const matcher=globToRegExp(pattern),matches=atlas.nodes.filter(node=>matcher.test(node.path)).map(node=>node.path);
  const exact=atlas.nodes.some(node=>node.path===pattern)?[pattern]:[];
  const start=exact.length?exact:matches.slice(0,policy.maxImpactResults);
  const nodeMap=new Map(atlas.nodes.map(node=>[node.path,node])),impact=traverseReverse(atlas,start);
  const subsystems=[...new Set(start.flatMap(file=>nodeMap.get(file)?.subsystems??classifySubsystems(file)))].sort();
  const surfaces=[...new Set(start.flatMap(file=>nodeMap.get(file)?.surfaces??classifySurfaces(file)))].sort();
  const componentKeys=[...new Set(start.flatMap(file=>nodeMap.get(file)?.literalKeys??[]))].sort();
  const exports=[...new Set(start.flatMap(file=>nodeMap.get(file)?.exports??[]))].sort();
  const failureIds=getAllFailures().filter(f=>f.applicability.mode==='always'||f.applicability.subsystems.some(s=>subsystems.includes(s))).map(f=>f.id);
  return {pattern,matchedFiles:start,matchCount:matches.length||exact.length,subsystems,surfaces,componentKeys,exports,...impact,knownFailureIds:[...new Set(failureIds)].sort()};
}
export function lookupAtlasTerm(atlas,term){
  const files=new Set([...(atlas.literalIndex[term]??[]),...(atlas.exportIndex[term]??[]),...(atlas.referenceIndex[term]??[])]);
  for(const node of atlas.nodes)if(node.path.includes(term))files.add(node.path);
  return {term,files:[...files].sort()};
}
export function validateCodebaseAtlas(atlas){
  const issues=[];
  for(const check of policy.criticalLookups){
    const found=new Set(lookupAtlasTerm(atlas,check.term).files);
    for(const required of check.requiredFiles)if(!found.has(required))issues.push({code:'ATLAS_CRITICAL_LOOKUP_MISSING',term:check.term,file:required});
  }
  if(!atlas.nodes.length)issues.push({code:'ATLAS_EMPTY'});
  return {contract:'shoporation.codebase-atlas-validation.v1',issues,ok:issues.length===0};
}
export function writeCodebaseAtlasArtifacts(atlas){
  mkdirSync('artifacts/shoperation-atlas',{recursive:true});
  writeFileSync('artifacts/shoperation-atlas/codebase-atlas.json',JSON.stringify(atlas,null,2)+'\n');
  const md=['# Shoperation Codebase Atlas','',`Generated: ${atlas.generatedAt}`,`Tracked files: ${atlas.summary.trackedFiles}`,`Routes: ${atlas.summary.routeNodes}`,`Import edges: ${atlas.summary.importEdges}`,`Exported symbols: ${atlas.summary.exportedSymbols}`,`Literal/component keys: ${atlas.summary.literalKeys}`,`Unresolved internal imports: ${atlas.summary.unresolvedInternalImports}`,'','## Subsystem coverage',...Object.entries(atlas.summary.subsystemCounts).sort().map(([k,v])=>`- ${k}: ${v}`)];
  writeFileSync('artifacts/shoperation-atlas/codebase-atlas.md',md.join('\n')+'\n');
}
