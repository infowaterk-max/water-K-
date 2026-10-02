import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {globToRegExp,getAllFailures,releasePolicy} from './shoperation-development-runtime.mjs';

const policy=JSON.parse(readFileSync('quality/knowledge/codebase-atlas-policy.v2.json','utf8'));
const domainRegistry=JSON.parse(readFileSync(policy.domainAuthoritySource,'utf8'));
const constitution=JSON.parse(readFileSync(policy.constitutionSource,'utf8'));
const poInstructionRegistry=policy.poInstructionSource&&existsSync(policy.poInstructionSource)?JSON.parse(readFileSync(policy.poInstructionSource,'utf8')):{contract:'shoporation.po-instructions.v1',instructions:[]};
const textExtensions=new Set(policy.textExtensions),sourceExtensions=new Set(policy.sourceExtensions);
const surfaceMatchers=policy.surfaceRules.map(rule=>({...rule,matchers:rule.patterns.map(globToRegExp)}));
const subsystemMatchers=releasePolicy.subsystems.map(item=>({...item,matchers:item.patterns.map(globToRegExp)}));
const patternSpecificity=pattern=>{
  const literal=String(pattern).replace(/\*\*?|\?/g,'').length;
  const wildcards=(String(pattern).match(/\*/g)??[]).length;
  return literal*10-wildcards;
};
const domainMatchers=domainRegistry.domains.map(domain=>({...domain,matchers:domain.canonicalPaths.map(pattern=>({pattern,matcher:globToRegExp(pattern),specificity:patternSpecificity(pattern)}))}));

const normalize=value=>value.replaceAll('\\','/');
const trackedFiles=()=>execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\r?\n/).map(normalize).filter(Boolean).filter(file=>!policy.excludedPrefixes.some(prefix=>file.startsWith(prefix)));
const isText=file=>textExtensions.has(path.extname(file).toLowerCase());
const classifySubsystems=file=>subsystemMatchers.filter(item=>item.matchers.some(m=>m.test(file))).map(item=>item.name);
const classifySurfaces=file=>surfaceMatchers.filter(item=>item.matchers.some(m=>m.test(file))).map(item=>item.id);
const classifyDomains=file=>{
  const matches=domainMatchers.flatMap(domain=>domain.matchers.filter(item=>item.matcher.test(file)).map(item=>({domainId:domain.id,pattern:item.pattern,specificity:item.specificity})));
  if(!matches.length)return[];
  const max=Math.max(...matches.map(item=>item.specificity));
  return [...new Set(matches.filter(item=>item.specificity===max).map(item=>item.domainId))].sort();
};
const domainById=new Map(domainRegistry.domains.map(domain=>[domain.id,domain]));
const domainAuthorities=domainIds=>[...new Set(domainIds.map(id=>domainById.get(id)?.owner).filter(Boolean))].sort();
const domainTruthKeys=domainIds=>[...new Set(domainIds.flatMap(id=>domainById.get(id)?.truthOwnership??[]))].sort();

function routeForFile(file){
  const match=file.match(/^src\/app\/(.*)\/(page|route)\.(?:ts|tsx|js|jsx)$/)||file.match(/^src\/app\/(page|route)\.(?:ts|tsx|js|jsx)$/);
  if(!match)return null;
  const raw=match.length===3?match[1]:'',kind=match.length===3?match[2]:match[1];
  const segments=(raw??'').split('/').filter(Boolean).filter(segment=>!/^\(.*\)$/.test(segment)&&!segment.startsWith('@')).map(segment=>{
    const optional=segment.match(/^\[\[\.\.\.([^\]]+)\]\]$/);if(optional)return`*${optional[1]}?`;
    const catchAll=segment.match(/^\[\.\.\.([^\]]+)\]$/);if(catchAll)return`*${catchAll[1]}`;
    const dynamic=segment.match(/^\[([^\]]+)\]$/);if(dynamic)return`:${dynamic[1]}`;
    return segment;
  });
  return {path:'/'+segments.join('/'),kind:kind==='route'?'api':'page'};
}
export function classifyAtlasPath(file){
  const domains=classifyDomains(file);
  return{
    path:file,
    route:routeForFile(file),
    subsystems:classifySubsystems(file),
    surfaces:classifySurfaces(file),
    domains,
    authorities:domainAuthorities(domains),
    truthKeys:domainTruthKeys(domains),
  };
}
export function extractImports(source){
  const specs=new Set();
  const file=ts.createSourceFile('atlas-source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const add=node=>{if(node&&ts.isStringLiteralLike(node))specs.add(node.text);};
  const visit=node=>{
    if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))add(node.moduleSpecifier);
    else if(ts.isCallExpression(node)&&node.arguments.length){
      if(node.expression.kind===ts.SyntaxKind.ImportKeyword)add(node.arguments[0]);
      else if(ts.isIdentifier(node.expression)&&node.expression.text==='require')add(node.arguments[0]);
    }
    ts.forEachChild(node,visit);
  };
  visit(file);
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
  for(const m of source.matchAll(/\b[A-Za-z_][A-Za-z0-9_$]{3,}\b/g)){const value=m[0];if(value.includes('_')||/[a-z][A-Z]/.test(value)||/^[A-Z][A-Za-z0-9_$]+$/.test(value))terms.add(value);}
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
export function domainDependencyClosure(domainIds){
  const seen=new Set(),queue=[...domainIds];
  while(queue.length){const id=queue.shift();if(seen.has(id))continue;seen.add(id);for(const dep of domainById.get(id)?.dependsOn??[])if(!seen.has(dep))queue.push(dep);}
  return [...seen].sort();
}
function architectureProjection(domainIds){
  const closure=domainDependencyClosure(domainIds),domains=closure.map(id=>domainById.get(id)).filter(Boolean);
  return {
    directDomains:[...domainIds].sort(),
    domains:closure,
    authorities:[...new Set(domains.map(domain=>domain.owner))].sort(),
    truthKeys:[...new Set(domains.flatMap(domain=>domain.truthOwnership))].sort(),
    boundaryRules:[...new Set(domains.flatMap(domain=>domain.boundaryRules))],
    evidenceObligations:[...new Set(domains.flatMap(domain=>domain.evidenceObligations))],
    principles:[...new Set(domains.flatMap(domain=>domain.principles))].sort(),
  };
}


const semanticId=(kind,file,name='')=>`${kind}:${file}${name?':'+name:''}`;
const rel=file=>normalize(path.relative(process.cwd(),file));
function hasModifier(node,kind){return Boolean(node.modifiers?.some(mod=>mod.kind===kind));}
function containsJsx(node){
  let found=false;
  const visit=child=>{
    if(found)return;
    if(ts.isJsxElement(child)||ts.isJsxSelfClosingElement(child)||ts.isJsxFragment(child)){found=true;return;}
    ts.forEachChild(child,visit);
  };
  ts.forEachChild(node,visit);
  return found;
}
function declarationKind(node,name,sourceFile){
  if(ts.isClassDeclaration(node))return'class';
  if(ts.isMethodDeclaration(node))return'method';
  if(ts.isFunctionDeclaration(node)){
    if(/^use[A-Z0-9_]/.test(name))return'hook';
    if(sourceFile.statements.some(statement=>ts.isExpressionStatement(statement)&&statement.expression?.text==='use server'))return'server-action';
    if(/^[A-Z][A-Za-z0-9_$]*$/.test(name)&&containsJsx(node))return'react-component';
    return'function';
  }
  if(ts.isInterfaceDeclaration(node)||ts.isTypeAliasDeclaration(node)||ts.isEnumDeclaration(node))return'schema-type';
  if(ts.isVariableDeclaration(node)){
    if(/^use[A-Z0-9_]/.test(name))return'hook';
    const initializer=node.initializer;
    if(initializer&&/^[A-Z][A-Za-z0-9_$]*$/.test(name)&&(ts.isArrowFunction(initializer)||ts.isFunctionExpression(initializer)))return'react-component';
    if(initializer&&ts.isCallExpression(initializer)&&ts.isIdentifier(initializer.expression)&&initializer.expression.text==='createContext')return'context';
  }
  return null;
}
function contextualLiteralKind(node){
  const value=node.text;
  const parent=node.parent;
  const key=ts.isPropertyAssignment(parent)||ts.isPropertyDeclaration(parent)||ts.isJsxAttribute(parent)
    ?(parent.name&&('text' in parent.name?parent.name.text:parent.name.getText?.()))
    :'';
  if(key==='componentKey'||/^(?:support|system|commerce|guided|layout|content|marketing|configurator|composer|compatibility|context|retention)\.[a-z0-9._-]+$/i.test(value))return'component-key';
  if(/(?:registry|config)Key$/i.test(String(key)))return String(key).toLowerCase().includes('registry')?'registry-key':'config-key';
  if(/^(?:label|title|text|heading|buttonLabel|ariaLabel|placeholder)$/i.test(String(key)))return'display-text';
  if(/^--[a-z0-9_-]+$/i.test(value))return'css-variable';
  return null;
}
function localBindingNames(binding){
  if(ts.isIdentifier(binding))return[binding.text];
  if(ts.isArrayBindingPattern(binding)||ts.isObjectBindingPattern(binding))return binding.elements.flatMap(element=>ts.isBindingElement(element)?localBindingNames(element.name):[]);
  return[];
}
function declarationBehavior(nodeMap,id){
  const name=String(nodeMap.get(id)?.name??'');
  return{
    wraps:/Wrapper$/i.test(name),
    adapts:/Adapter$/i.test(name),
  };
}
function semanticRouteName(route){return`${route.kind}:${route.path}`;}
function buildSemanticGraph({files,fileSet,fileNodes,literalIndex,exportIndex,referenceIndex}){
  const nodeMap=new Map(),edgeMap=new Map(),unknowns=[];
  const addNode=node=>{if(!nodeMap.has(node.id))nodeMap.set(node.id,node);return node.id;};
  const addEdge=edge=>{const key=`${edge.from}|${edge.type}|${edge.to}|${edge.label??''}`;if(!edgeMap.has(key))edgeMap.set(key,edge);};
  for(const file of files)addNode({id:semanticId('file',file),kind:'file',file,name:file});
  for(const meta of fileNodes){
    const fileId=semanticId('file',meta.path);
    for(const authority of meta.authorities??[]){
      const authorityId=addNode({id:`authority:${authority}`,kind:'authority',file:null,name:authority});
      addEdge({from:authorityId,to:fileId,type:'authority-of',fromFile:null,toFile:meta.path,label:authority});
    }
    if(meta.route){
      const kind=meta.route.kind==='api'?'api-handler':'route';
      const routeId=addNode({id:semanticId(kind,meta.path,semanticRouteName(meta.route)),kind,file:meta.path,name:meta.route.path,routeKind:meta.route.kind});
      addEdge({from:fileId,to:routeId,type:'resolves-route',fromFile:meta.path,toFile:meta.path,label:meta.route.path});
    }
    if(meta.kind==='test'){
      const testId=addNode({id:semanticId('test',meta.path,'test'),kind:'test',file:meta.path,name:meta.path});
      addEdge({from:fileId,to:testId,type:'implements',fromFile:meta.path,toFile:meta.path,label:'test'});
      if(/(?:proof|acceptance|evidence|stress|adversarial)/i.test(meta.path)){
        const proofId=addNode({id:semanticId('proof',meta.path,'proof'),kind:'proof',file:meta.path,name:meta.path});
        addEdge({from:testId,to:proofId,type:'proves',fromFile:meta.path,toFile:meta.path,label:'behavioral-proof'});
      }
    }
  }
  const knownFailures=getAllFailures();
  for(const failure of knownFailures){
    const failureId=addNode({id:`known-failure:${failure.id}`,kind:'known-failure',file:null,name:failure.id,title:failure.title});
    for(const testPattern of failure.regressionTests??[]){
      const matcher=globToRegExp(testPattern);
      for(const meta of fileNodes)if(meta.kind==='test'&&matcher.test(meta.path)){
        const testId=addNode({id:semanticId('test',meta.path,'test'),kind:'test',file:meta.path,name:meta.path});
        addEdge({from:testId,to:failureId,type:'proves',fromFile:meta.path,toFile:null,label:failure.id});
      }
    }
  }
  let program=null,checker=null;
  try{
    const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
    const parsed=ts.parseJsonConfigFileContent(config.config??{},ts.sys,process.cwd(),undefined,'tsconfig.json');
    program=ts.createProgram({rootNames:parsed.fileNames,options:{...parsed.options,noEmit:true}});
    checker=program.getTypeChecker();
  }catch(error){unknowns.push({kind:'type-program',reason:'TYPE_PROGRAM_UNAVAILABLE',detail:String(error)});}
  const sourceByFile=new Map();
  for(const sourceFile of program?.getSourceFiles?.()??[]){
    const file=rel(sourceFile.fileName);
    if(fileSet.has(file))sourceByFile.set(file,sourceFile);
  }
  const targetCache=new Map();
  const targetFor=node=>{
    if(!checker)return null;
    const sourceFile=node?.getSourceFile?.();
    const sourcePath=sourceFile?rel(sourceFile.fileName):'unknown';
    const cacheKey=ts.isIdentifier(node)?`${sourcePath}::${node.text}`:null;
    if(cacheKey&&targetCache.has(cacheKey))return targetCache.get(cacheKey);
    try{
      let symbol=checker.getSymbolAtLocation(node);
      if(!symbol)return null;
      if(symbol.flags&ts.SymbolFlags.Alias)symbol=checker.getAliasedSymbol(symbol);
      const decl=(symbol.declarations??[]).find(item=>fileSet.has(rel(item.getSourceFile().fileName)));
      if(!decl)return null;
      const file=rel(decl.getSourceFile().fileName),name=symbol.getName?.()??node.getText?.()??'symbol';
      const kind=declarationKind(decl,name,decl.getSourceFile())??(ts.isImportSpecifier(decl)?'imported-symbol':'export');
      const result={id:addNode({id:semanticId(kind,file,name),kind,file,name}),file,name,kind};
      if(cacheKey)targetCache.set(cacheKey,result);
      return result;
    }catch{
      if(cacheKey)targetCache.set(cacheKey,null);
      return null;
    }
  };
  for(const [file,sourceFile] of sourceByFile){
    const fileId=semanticId('file',file);
    const moduleId=addNode({id:semanticId('module',file,'module'),kind:'module',file,name:file});
    addEdge({from:fileId,to:moduleId,type:'implements',fromFile:file,toFile:file,label:'module'});
    const declarationStack=[];
    const stateBindings=new Map();
    const importedLocals=new Set();
    for(const statement of sourceFile.statements)if(ts.isImportDeclaration(statement)){
      const clause=statement.importClause;
      if(clause?.name)importedLocals.add(clause.name.text);
      if(clause?.namedBindings&&ts.isNamedImports(clause.namedBindings))for(const element of clause.namedBindings.elements)importedLocals.add(element.name.text);
      if(clause?.namedBindings&&ts.isNamespaceImport(clause.namedBindings))importedLocals.add(clause.namedBindings.name.text);
    }
    const visit=node=>{
      let pushed=false;
      const nameNode=node.name&&ts.isIdentifier(node.name)?node.name:null;
      if(nameNode){
        const name=nameNode.text,kind=declarationKind(node,name,sourceFile);
        if(kind){
          const id=addNode({id:semanticId(kind,file,name),kind,file,name,exported:hasModifier(node,ts.SyntaxKind.ExportKeyword)});
          declarationStack.push(id);pushed=true;
          if(hasModifier(node,ts.SyntaxKind.ExportKeyword))addEdge({from:fileId,to:id,type:'exports',file});
        }
      }
      const origin=declarationStack.at(-1)??fileId;
      if(ts.isImportDeclaration(node)&&ts.isStringLiteralLike(node.moduleSpecifier)){
        const targetFile=resolveImport(file,node.moduleSpecifier.text,fileSet);
        const clause=node.importClause;
        const imported=[];
        if(clause?.name)imported.push({local:clause.name.text,imported:'default',node:clause.name});
        if(clause?.namedBindings&&ts.isNamedImports(clause.namedBindings))for(const element of clause.namedBindings.elements)imported.push({local:element.name.text,imported:element.propertyName?.text??element.name.text,node:element.name});
        if(clause?.namedBindings&&ts.isNamespaceImport(clause.namedBindings))imported.push({local:clause.namedBindings.name.text,imported:'*',node:clause.namedBindings.name});
        for(const binding of imported){
          const importedId=addNode({id:semanticId('imported-symbol',file,binding.local),kind:'imported-symbol',file,name:binding.local,importedName:binding.imported,moduleSpecifier:node.moduleSpecifier.text,targetFile});
          addEdge({from:fileId,to:importedId,type:'imports',fromFile:file,toFile:file,label:binding.imported});
          const target=targetFor(binding.node);
          if(target)addEdge({from:importedId,to:target.id,type:'references',fromFile:file,toFile:target.file,label:binding.imported});
          else if(targetFile)addEdge({from:importedId,to:semanticId('file',targetFile),type:'references',fromFile:file,toFile:targetFile,label:binding.imported});
        }
      }
      if(ts.isVariableDeclaration(node)&&ts.isArrayBindingPattern(node.name)&&node.initializer&&ts.isCallExpression(node.initializer)){
        const callee=node.initializer.expression.getText(sourceFile);
        if(callee==='useState'||callee.endsWith('.useState')){
          const names=localBindingNames(node.name);
          if(names[0]){
            const stateId=addNode({id:semanticId('config-key',file,`state:${names[0]}`),kind:'config-key',subkind:'state',file,name:names[0]});
            stateBindings.set(names[0],{id:stateId,mode:'read'});
            if(names[1])stateBindings.set(names[1],{id:stateId,mode:'write'});
          }
        }
      }
      if(ts.isTypeReferenceNode(node)){
        const target=targetFor(node.typeName);
        if(target)addEdge({from:origin,to:target.id,type:'uses-schema',fromFile:file,toFile:target.file,label:node.typeName.getText(sourceFile)});
      }
      if(ts.isHeritageClause(node)){
        for(const heritage of node.types){
          const target=targetFor(heritage.expression);
          if(target)addEdge({from:origin,to:target.id,type:node.token===ts.SyntaxKind.ImplementsKeyword?'implements':'uses-schema',fromFile:file,toFile:target.file,label:heritage.expression.getText(sourceFile)});
        }
      }
      if(ts.isPropertyAssignment(node)){
        const propertyName=node.name&&('text' in node.name?String(node.name.text):node.name.getText(sourceFile));
        if(/(?:component|registry|config|route|schema)Key$/i.test(propertyName)){
          const kind=/componentKey/i.test(propertyName)?'component-key':/registryKey/i.test(propertyName)?'registry-key':'config-key';
          const keyId=addNode({id:semanticId(kind,file,`property:${propertyName}`),kind,file,name:propertyName});
          addEdge({from:origin,to:keyId,type:'registers',fromFile:file,toFile:file,label:propertyName});
        }
        if(propertyName==='templateKey'&&ts.isStringLiteralLike(node.initializer)){
          const presetId=addNode({id:semanticId('template-preset',file,node.initializer.text),kind:'template-preset',file,name:node.initializer.text});
          addEdge({from:origin,to:presetId,type:'registers',fromFile:file,toFile:file,label:node.initializer.text});
        }
      }
      if(ts.isIdentifier(node)&&stateBindings.has(node.text)&&node!==nameNode){
        const state=stateBindings.get(node.text);
        addEdge({from:origin,to:state.id,type:state.mode==='write'?'writes-state':'reads-state',fromFile:file,toFile:file,label:node.text});
      }
      if(ts.isIdentifier(node)&&node!==nameNode&&importedLocals.has(node.text)){
        const target=targetFor(node);
        if(target&&target.file!==file)addEdge({from:origin,to:target.id,type:'references',fromFile:file,toFile:target.file,label:node.text});
      }
      if(ts.isCallExpression(node)){
        const target=targetFor(node.expression);
        if(target&&target.file!==file){
          addEdge({from:origin,to:target.id,type:'calls',fromFile:file,toFile:target.file,label:target.name});
          const behavior=declarationBehavior(nodeMap,origin);
          if(behavior.wraps)addEdge({from:origin,to:target.id,type:'wraps',fromFile:file,toFile:target.file,label:target.name});
          if(behavior.adapts)addEdge({from:origin,to:target.id,type:'adapts',fromFile:file,toFile:target.file,label:target.name});
        }
        const callee=node.expression.getText(sourceFile);
        if(ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='rpc'&&node.arguments[0]&&ts.isStringLiteralLike(node.arguments[0])){
          const rpcName=node.arguments[0].text;
          const rpcId=addNode({id:semanticId('rpc',file,rpcName),kind:'rpc',file,name:rpcName});
          addEdge({from:origin,to:rpcId,type:'invokes-rpc',fromFile:file,toFile:file,label:rpcName});
        }
        if((callee==='redirect'||callee.endsWith('.push')||callee.endsWith('.replace'))&&node.arguments[0]&&ts.isStringLiteralLike(node.arguments[0])&&node.arguments[0].text.startsWith('/')){
          const routeName=node.arguments[0].text;
          const routeId=addNode({id:`route-literal:${routeName}`,kind:'route',file:null,name:routeName,literal:true});
          addEdge({from:origin,to:routeId,type:'resolves-route',fromFile:file,toFile:null,label:routeName});
        }
        if(/^use[A-Z]/.test(callee)){
          const hookId=target?.id??addNode({id:semanticId('hook',file,callee),kind:'hook',file,name:callee,unresolved:!target});
          addEdge({from:origin,to:hookId,type:'uses-hook',fromFile:file,toFile:target?.file??file,label:callee});
        }
        if(callee==='useContext'){
          const arg=node.arguments[0];const contextTarget=arg?targetFor(arg):null;
          if(contextTarget)addEdge({from:origin,to:contextTarget.id,type:'consumes-context',fromFile:file,toFile:contextTarget.file,label:contextTarget.name});
        }
      }
      if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
        const target=targetFor(node.tagName);
        if(target){
          addEdge({from:origin,to:target.id,type:'renders',fromFile:file,toFile:target.file,label:node.tagName.getText(sourceFile)});
          const behavior=declarationBehavior(nodeMap,origin);
          if(behavior.wraps)addEdge({from:origin,to:target.id,type:'wraps',fromFile:file,toFile:target.file,label:target.name});
          if(behavior.adapts)addEdge({from:origin,to:target.id,type:'adapts',fromFile:file,toFile:target.file,label:target.name});
        }
        if(ts.isPropertyAccessExpression(node.tagName)&&node.tagName.name.text==='Provider'){
          const contextTarget=targetFor(node.tagName.expression);
          const providerName=node.tagName.getText(sourceFile);
          const providerId=addNode({id:semanticId('provider',file,providerName),kind:'provider',file,name:providerName});
          if(contextTarget)addEdge({from:providerId,to:contextTarget.id,type:'provides-context',fromFile:file,toFile:contextTarget.file,label:contextTarget.name});
          addEdge({from:origin,to:providerId,type:'renders',fromFile:file,toFile:file,label:providerName});
        }
        for(const prop of node.attributes.properties)if(ts.isJsxAttribute(prop)){
          const propId=addNode({id:semanticId('config-key',file,`jsx-prop:${prop.name.text}`),kind:'config-key',file,name:prop.name.text});
          addEdge({from:origin,to:propId,type:'passes-prop',fromFile:file,toFile:file,label:prop.name.text});
        }
      }
      if(ts.isStringLiteralLike(node)){
        const kind=contextualLiteralKind(node);
        if(kind){
          const id=addNode({id:semanticId(kind,file,node.text),kind,file,name:node.text});
          addEdge({from:origin,to:id,type:kind==='component-key'?'registers':kind==='css-variable'?'styles':'references',fromFile:file,toFile:file,label:node.text});
          if(kind==='component-key'&&/(?:templates|storefront-template|page-schema|builder)/i.test(file)){
            const pageComponentId=addNode({id:semanticId('page-schema-component',file,node.text),kind:'page-schema-component',file,name:node.text});
            addEdge({from:pageComponentId,to:id,type:'implements',fromFile:file,toFile:file,label:node.text});
          }
        }
      }
      ts.forEachChild(node,visit);
      if(pushed)declarationStack.pop();
    };
    visit(sourceFile);
    const sourceText=sourceFile.getFullText();
    for(const match of sourceText.matchAll(/(--[a-z0-9_-]{3,})/gi)){
      const token=match[1];
      const cssId=addNode({id:`css-variable:shared:${token}`,kind:'css-variable',file:null,name:token});
      const designId=addNode({id:`design-token:${token}`,kind:'design-token',file:null,name:token});
      addEdge({from:semanticId('file',file),to:cssId,type:'styles',fromFile:file,toFile:null,label:token});
      addEdge({from:cssId,to:designId,type:'implements',fromFile:null,toFile:null,label:token});
    }
    for(const match of sourceText.matchAll(/var\(\s*(--[a-z0-9_-]{3,})/gi)){
      const token=match[1];
      const designId=addNode({id:`design-token:${token}`,kind:'design-token',file:null,name:token});
      addEdge({from:semanticId('file',file),to:designId,type:'inherits-token',fromFile:file,toFile:null,label:token});
    }
    for(const match of sourceText.matchAll(/(?:override|overrides)\s*[:=][^\n]{0,120}(--[a-z0-9_-]{3,})/gi)){
      const token=match[1];
      const designId=addNode({id:`design-token:${token}`,kind:'design-token',file:null,name:token});
      addEdge({from:semanticId('file',file),to:designId,type:'overrides',fromFile:file,toFile:null,label:token});
    }
    const targetTemplate=sourceText.match(/\btemplateKey\s*:\s*['"]([^'"]+)['"]/i)?.[1]??null;
    const foundationTemplate=sourceText.match(/\bfoundationTemplateKey\s*:\s*['"]([^'"]+)['"]/i)?.[1]??null;
    if(targetTemplate&&foundationTemplate&&targetTemplate!==foundationTemplate){
      const targetId=addNode({id:`template-preset:shared:${targetTemplate}`,kind:'template-preset',file:null,name:targetTemplate});
      const foundationId=addNode({id:`template-preset:shared:${foundationTemplate}`,kind:'template-preset',file:null,name:foundationTemplate});
      addEdge({from:targetId,to:foundationId,type:'overrides',fromFile:file,toFile:null,label:'template-foundation'});
    }
  }
  for(const file of files){
    if(sourceByFile.has(file)||!isText(file)||!existsSync(file))continue;
    const sourceText=readFileSync(file,'utf8');
    for(const match of sourceText.matchAll(/(--[a-z0-9_-]{3,})/gi)){
      const token=match[1];
      const cssId=addNode({id:`css-variable:shared:${token}`,kind:'css-variable',file:null,name:token});
      const designId=addNode({id:`design-token:${token}`,kind:'design-token',file:null,name:token});
      addEdge({from:semanticId('file',file),to:cssId,type:'styles',fromFile:file,toFile:null,label:token});
      addEdge({from:cssId,to:designId,type:'implements',fromFile:null,toFile:null,label:token});
    }
    for(const match of sourceText.matchAll(/var\(\s*(--[a-z0-9_-]{3,})/gi)){
      const token=match[1];
      const designId=addNode({id:`design-token:${token}`,kind:'design-token',file:null,name:token});
      addEdge({from:semanticId('file',file),to:designId,type:'inherits-token',fromFile:file,toFile:null,label:token});
    }
  }
  for(const [value,paths] of Object.entries(literalIndex)){
    if(paths.length<2)continue;
    const keyId=addNode({id:`component-key:shared:${value}`,kind:'component-key',file:null,name:value,shared:true});
    for(const file of paths)addEdge({from:semanticId('file',file),to:keyId,type:'shares-contract',fromFile:file,toFile:null,label:value});
    for(const from of paths)for(const to of paths)if(from!==to)addEdge({from:semanticId('file',from),to:semanticId('file',to),type:'shares-contract',fromFile:from,toFile:to,label:value});
  }
  for(const [symbol,providers] of Object.entries(exportIndex)){
    const consumers=referenceIndex[symbol]??[];
    for(const provider of providers)for(const consumer of consumers)if(provider!==consumer)addEdge({from:semanticId('file',consumer),to:semanticId('file',provider),type:'references',fromFile:consumer,toFile:provider,label:symbol});
  }
  const semanticContracts=new Map();
  for(const node of nodeMap.values()){
    if(!node.file||!['component-key','registry-key','config-key','display-text'].includes(node.kind))continue;
    const key=`${node.kind}:${node.name}`;
    const filesForKey=semanticContracts.get(key)??new Set();
    filesForKey.add(node.file);semanticContracts.set(key,filesForKey);
  }
  for(const [key,fileGroup] of semanticContracts){
    const contractFiles=[...fileGroup];
    if(contractFiles.length<2||contractFiles.length>20)continue;
    for(const from of contractFiles)for(const to of contractFiles)if(from!==to)addEdge({from:semanticId('file',from),to:semanticId('file',to),type:'shares-contract',fromFile:from,toFile:to,label:key});
  }
  for(const node of fileNodes)for(const unresolved of node.imports??[])void unresolved;
  const edges=[...edgeMap.values()].slice(0,policy.semanticGraph?.maxEdges??250000);
  const reverseFileEdges=Object.create(null);
  for(const edge of edges)if(edge.fromFile&&edge.toFile&&edge.fromFile!==edge.toFile)(reverseFileEdges[edge.toFile]??=[]).push(edge.fromFile);
  for(const key of Object.keys(reverseFileEdges))reverseFileEdges[key]=[...new Set(reverseFileEdges[key])].sort();
  for(const item of poInstructionRegistry.instructions??[]){
    const id=addNode({id:`po-instruction:${item.id}`,kind:'po-instruction',file:policy.poInstructionSource,name:item.id,lifecycle:item.lifecycle});
    for(const pattern of item.affectedPatterns??[])for(const file of files)if(globToRegExp(pattern).test(file))addEdge({from:id,to:semanticId('file',file),type:'instruction-applies-to',fromFile:policy.poInstructionSource,toFile:file,label:item.id});
  }
  return{contract:policy.semanticGraph?.contract??'shoporation.semantic-execution-graph.v1',nodes:[...nodeMap.values()],edges:[...edgeMap.values()].slice(0,policy.semanticGraph?.maxEdges??250000),reverseFileEdges,unknowns:unknowns.slice(0,policy.semanticGraph?.maxUnknowns??5000),typeCheckerAvailable:Boolean(checker)};
}
let atlasProcessCache=null;
export function buildCodebaseAtlas(){
  if(atlasProcessCache)return atlasProcessCache;
  const files=trackedFiles(),fileSet=new Set(files),nodes=[],unresolvedInternalImports=[];
  for(const file of files){
    const ext=path.extname(file).toLowerCase(),source=isText(file)&&existsSync(file)?readFileSync(file,'utf8'):'';
    const imports=sourceExtensions.has(ext)?extractImports(source):[],resolvedImports=[],externalImports=[];
    for(const spec of imports){const resolved=resolveImport(file,spec,fileSet);if(resolved)resolvedImports.push(resolved);else if(spec.startsWith('.')||spec.startsWith('@/'))unresolvedInternalImports.push({from:file,specifier:spec});else externalImports.push(spec);}
    const route=routeForFile(file),domains=classifyDomains(file);
    nodes.push({
      path:file,extension:ext,kind:route?'route':file.startsWith('tests/')?'test':file.startsWith('supabase/')?'database':sourceExtensions.has(ext)?'code':'supporting',
      route,subsystems:classifySubsystems(file),surfaces:classifySurfaces(file),domains,authorities:domainAuthorities(domains),truthKeys:domainTruthKeys(domains),
      imports:[...new Set(resolvedImports)].sort(),externalImports:[...new Set(externalImports)].sort(),
      exports:sourceExtensions.has(ext)?extractExports(source):[],literalKeys:source?extractLiteralKeys(source):[],referenceTerms:source?extractReferenceTerms(source):[],
    });
  }
  const reverse=Object.create(null);for(const node of nodes)for(const target of node.imports){(reverse[target]??=[]).push(node.path);}for(const key of Object.keys(reverse))reverse[key]=[...new Set(reverse[key])].sort();
  const routes=nodes.filter(node=>node.route).map(node=>({file:node.path,...node.route}));
  const makeIndex=(selector)=>{const index=Object.create(null);for(const node of nodes)for(const key of selector(node)){(index[key]??=[]).push(node.path);}for(const key of Object.keys(index))index[key]=[...new Set(index[key])].sort();return index;};
  const literalIndex=makeIndex(node=>node.literalKeys),exportIndex=makeIndex(node=>node.exports),referenceIndex=makeIndex(node=>node.referenceTerms),domainIndex=makeIndex(node=>node.domains),authorityIndex=makeIndex(node=>node.authorities),truthIndex=makeIndex(node=>node.truthKeys);
  const semanticGraph=buildSemanticGraph({files,fileSet,fileNodes:nodes,literalIndex,exportIndex,referenceIndex});
  const subsystemCounts=Object.create(null);for(const node of nodes)for(const subsystem of node.subsystems)subsystemCounts[subsystem]=(subsystemCounts[subsystem]??0)+1;
  const domainCounts=Object.fromEntries(domainRegistry.domains.map(domain=>[domain.id,domainIndex[domain.id]?.length??0]));
  const duplicateRoutes=Object.entries(routes.reduce((acc,item)=>{const key=`${item.kind}:${item.path}`;(acc[key]??=[]).push(item.file);return acc;},{})).filter(([,value])=>value.length>1).map(([routeKey,files])=>({routeKey,files}));
  const allFailures=getAllFailures();
  const truthOwnerIndex=Object.fromEntries(domainRegistry.domains.flatMap(domain=>domain.truthOwnership.map(truth=>[truth,{domainId:domain.id,owner:domain.owner}])));
  const atlas={
    contract:'shoporation.codebase-atlas.v2',generatedAt:new Date().toISOString(),
    architecture:{constitutionContract:constitution.contract,domainContract:domainRegistry.contract,authorityOrder:constitution.authorityOrder,domainCount:domainRegistry.domains.length,truthOwnerCount:Object.keys(truthOwnerIndex).length},
    summary:{trackedFiles:files.length,indexedNodes:nodes.length,codeNodes:nodes.filter(n=>n.kind==='code').length,testNodes:nodes.filter(n=>n.kind==='test').length,routeNodes:routes.length,importEdges:nodes.reduce((n,x)=>n+x.imports.length,0),exportedSymbols:Object.keys(exportIndex).length,literalKeys:Object.keys(literalIndex).length,referenceTerms:Object.keys(referenceIndex).length,semanticNodes:semanticGraph.nodes.length,semanticEdges:semanticGraph.edges.length,semanticUnknowns:semanticGraph.unknowns.length,typeCheckerAvailable:semanticGraph.typeCheckerAvailable,unresolvedInternalImports:unresolvedInternalImports.length,duplicateRoutes:duplicateRoutes.length,subsystemCounts,domainCounts},
    nodes,routes,reverseImports:reverse,literalIndex,exportIndex,referenceIndex,domainIndex,authorityIndex,truthIndex,truthOwnerIndex,semanticGraph,poInstructions:poInstructionRegistry.instructions??[],unresolvedInternalImports,duplicateRoutes,
    domainIndexDefinition:Object.fromEntries(domainRegistry.domains.map(domain=>[domain.id,{name:domain.name,owner:domain.owner,dependsOn:domain.dependsOn,truthOwnership:domain.truthOwnership,boundaryRules:domain.boundaryRules,evidenceObligations:domain.evidenceObligations}])),
    knownFailureIndex:Object.fromEntries(allFailures.map(f=>[f.id,{title:f.title,provider:f.provider,applicability:f.applicability,regressionTests:f.regressionTests}])),
  };
  atlasProcessCache=atlas;
  return atlas;
}
function fallbackSemanticConsumers(atlas,current,byPath){
  const node=byPath.get(current);if(!node)return[];
  const out=new Set();
  for(const key of node.literalKeys??[])for(const file of atlas.literalIndex?.[key]??[])if(file!==current)out.add(file);
  for(const symbol of node.exports??[])for(const file of atlas.referenceIndex?.[symbol]??[])if(file!==current)out.add(file);
  return [...out];
}
function traverseReverse(atlas,startPaths){
  const byPath=new Map(atlas.nodes.map(node=>[node.path,node])),queue=[...startPaths],visited=new Set(startPaths),routes=[],tests=[],consumers=[];
  while(queue.length&&visited.size<=policy.maxImpactTraversal){
    const current=queue.shift();
    const nextFiles=[...(atlas.reverseImports?.[current]??[]),...(atlas.semanticGraph?.reverseFileEdges?.[current]??[]),...fallbackSemanticConsumers(atlas,current,byPath)];
    for(const next of nextFiles){if(visited.has(next))continue;visited.add(next);queue.push(next);consumers.push(next);const node=byPath.get(next);if(node?.route)routes.push({file:next,...node.route});if(node?.kind==='test')tests.push(next);}
  }
  return {consumers:[...new Set(consumers)].slice(0,policy.maxImpactResults),routes:[...new Map(routes.map(r=>[`${r.kind}:${r.path}`,r])).values()].slice(0,policy.maxImpactResults),tests:[...new Set(tests)].slice(0,policy.maxImpactResults),traversed:visited.size};
}
export function impactForAtlasPattern(atlas,pattern){
  const matcher=globToRegExp(pattern),matches=atlas.nodes.filter(node=>matcher.test(node.path)).map(node=>node.path),exact=atlas.nodes.some(node=>node.path===pattern)?[pattern]:[],start=exact.length?exact:matches.slice(0,policy.maxImpactResults);
  const nodeMap=new Map(atlas.nodes.map(node=>[node.path,node])),impact=traverseReverse(atlas,start);
  const subsystems=[...new Set(start.flatMap(file=>nodeMap.get(file)?.subsystems??classifySubsystems(file)))].sort(),surfaces=[...new Set(start.flatMap(file=>nodeMap.get(file)?.surfaces??classifySurfaces(file)))].sort(),directDomains=[...new Set(start.flatMap(file=>nodeMap.get(file)?.domains??classifyDomains(file)))].sort();
  const architecture=architectureProjection(directDomains),componentKeys=[...new Set(start.flatMap(file=>nodeMap.get(file)?.literalKeys??[]))].sort(),exports=[...new Set(start.flatMap(file=>nodeMap.get(file)?.exports??[]))].sort();
  const failureIds=getAllFailures().filter(f=>f.applicability.mode==='always'||f.applicability.subsystems.some(s=>subsystems.includes(s))).map(f=>f.id);
  return {contract:'shoporation.atlas-impact.v2',pattern,matchedFiles:start,matchCount:matches.length||exact.length,subsystems,surfaces,componentKeys,exports,...architecture,...impact,knownFailureIds:[...new Set(failureIds)].sort()};
}
export function releaseClosureForAtlasPatterns(atlas,patterns){
  const impacts=patterns.map(pattern=>impactForAtlasPattern(atlas,pattern)),knownFailureIds=[...new Set(impacts.flatMap(x=>x.knownFailureIds))].sort();
  const regressionTests=[...new Set(knownFailureIds.flatMap(id=>atlas.knownFailureIndex[id]?.regressionTests??[]))].sort();
  return {
    contract:'shoporation.atlas-release-closure.v2',
    patterns,
    matchedFiles:[...new Set(impacts.flatMap(x=>x.matchedFiles))].sort(),
    consumers:[...new Set(impacts.flatMap(x=>x.consumers))].sort(),
    routes:[...new Map(impacts.flatMap(x=>x.routes).map(r=>[`${r.kind}:${r.path}`,r])).values()],
    domains:[...new Set(impacts.flatMap(x=>x.domains))].sort(),
    authorities:[...new Set(impacts.flatMap(x=>x.authorities))].sort(),
    truthKeys:[...new Set(impacts.flatMap(x=>x.truthKeys))].sort(),
    boundaryRules:[...new Set(impacts.flatMap(x=>x.boundaryRules))],
    evidenceObligations:[...new Set(impacts.flatMap(x=>x.evidenceObligations))],
    knownFailureIds,
    regressionTests,
    discoveredTests:[...new Set(impacts.flatMap(x=>x.tests))].sort(),
  };
}
export function lookupAtlasTerm(atlas,term){
  const files=new Set([...(atlas.literalIndex[term]??[]),...(atlas.exportIndex[term]??[]),...(atlas.referenceIndex[term]??[]),...(atlas.domainIndex[term]??[]),...(atlas.authorityIndex[term]??[]),...(atlas.truthIndex[term]??[])]);
  for(const node of atlas.nodes)if(node.path.includes(term))files.add(node.path);
  const truthOwner=atlas.truthOwnerIndex[term]??null,domain=atlas.domainIndexDefinition[term]??null;
  return {term,files:[...files].sort(),truthOwner,domain};
}

function executionPolicyFor({sourceDomain,targetDomain,from,to}){
  const rules=domainRegistry.executionDependencyPolicies?.rules??[];
  const matches=rules.filter(rule=>
    rule.sourceDomain===sourceDomain
    &&rule.targetDomain===targetDomain
    &&(rule.fromPatterns??[]).some(pattern=>globToRegExp(pattern).test(from))
    &&(rule.toPatterns??[]).some(pattern=>globToRegExp(pattern).test(to))
  );
  if(matches.length!==1)return matches.length>1?{decision:'ambiguous',rules:matches}:null;
  return matches[0];
}
export function reconcileAuthorityDependencies(atlas){
  const byPath=new Map(atlas.nodes.map(node=>[node.path,node])),discrepancies=[],edges=[];
  for(const source of atlas.nodes){
    if(!source.domains?.length)continue;
    const closure=new Set(domainDependencyClosure(source.domains));
    for(const targetPath of source.imports??[]){
      const target=byPath.get(targetPath);if(!target?.domains?.length)continue;
      if(source.domains.length!==1||target.domains.length!==1){
        const row={classification:'ambiguous-mapping',from:source.path,to:target.path,sourceDomains:source.domains,targetDomains:target.domains};
        discrepancies.push(row);edges.push({...row,reconciled:false});continue;
      }
      const sourceDomain=source.domains[0],targetDomain=target.domains[0];
      if(closure.has(targetDomain)){
        edges.push({classification:'declared-authority-dependency',from:source.path,to:target.path,sourceDomain,targetDomain,reconciled:true});
        continue;
      }
      const policyRule=executionPolicyFor({sourceDomain,targetDomain,from:source.path,to:target.path});
      if(policyRule?.decision==='allow'){
        edges.push({classification:'allowed-execution-edge',policyId:policyRule.id,edgeClass:policyRule.edgeClass,from:source.path,to:target.path,sourceDomain,targetDomain,reconciled:true,transfersTruthOwnership:policyRule.transfersTruthOwnership===true});
        continue;
      }
      if(policyRule?.decision==='deny'){
        const row={classification:'illegal-dependency',policyId:policyRule.id,edgeClass:policyRule.edgeClass,from:source.path,to:target.path,sourceDomain,targetDomain,rationale:policyRule.rationale};
        discrepancies.push(row);edges.push({...row,reconciled:false});continue;
      }
      if(policyRule?.decision==='ambiguous'){
        const row={classification:'ambiguous-mapping',from:source.path,to:target.path,sourceDomain,targetDomain,policyIds:policyRule.rules.map(rule=>rule.id)};
        discrepancies.push(row);edges.push({...row,reconciled:false});continue;
      }
      const row={classification:'missing-authority-edge',from:source.path,to:target.path,sourceDomain,targetDomain};
      discrepancies.push(row);edges.push({...row,reconciled:false});
    }
  }
  const learningCandidates=discrepancies.map(row=>({
    missingEdge:{from:row.from,to:row.to},
    edgeType:row.classification,
    whyMissed:row.classification==='missing-authority-edge'
      ?'Actual code import exists outside declared authority closure and no explicit execution policy matches.'
      :row.classification==='ambiguous-mapping'
        ?'Canonical path ownership or execution policy does not resolve to exactly one authority relationship.'
        :'An explicit dependency policy classifies the actual code edge as forbidden.',
    confidence:row.classification==='illegal-dependency'?1:row.classification==='missing-authority-edge'?0.95:0.6,
    extractionStrategy:row.classification==='ambiguous-mapping'
      ?'Refine canonical path specificity or add a narrower canonical path; do not infer ownership from broad directory overlap.'
      :'Reconcile the import through the domain DAG or one narrow executionDependencyPolicies rule with no truth-ownership transfer.',
    reviewRequired:true,
  }));
  return{
    contract:'shoporation.authority-dependency-reconciliation.v2',
    policyContract:domainRegistry.executionDependencyPolicies?.contract??null,
    edges,
    counts:edges.reduce((acc,row)=>{acc[row.classification]=(acc[row.classification]??0)+1;return acc;},{}),
    discrepancies,
    learningCandidates,
    learningMode:'reviewable-not-auto-promoted',
    decision:discrepancies.length?'BLOCK':'PASS',
  };
}
function forbiddenStatePresentInFile(file,forbidden){
  if(!existsSync(file)||!isText(file))return false;
  const source=readFileSync(file,'utf8');
  const parts=String(forbidden).split(':'),kind=parts.shift(),value=parts.join(':');
  if(!value)return false;
  if(kind==='route'||kind==='route-key')return source.includes("'"+value+"'")||source.includes('"'+value+'"');
  return source.includes(value);
}
function staticRouteFile(route){
  const value=String(route??'').trim();
  if(!value.startsWith('/')||value==='/'||/[:*?\[\]]/.test(value))return null;
  return `src/app/${value.slice(1)}/page.tsx`;
}
function forbiddenStaticRouteFiles(instruction){
  return [...new Set((instruction.forbiddenStates??[]).flatMap(forbidden=>{
    const parts=String(forbidden).split(':'),kind=parts.shift(),value=parts.join(':');
    if(kind!=='route'||!value)return[];
    const file=staticRouteFile(value);
    return file?[file]:[];
  }))].sort();
}
function forbiddenStaticRouteTombstones(instruction,tombstones){
  const deleted=new Set(tombstones);
  return forbiddenStaticRouteFiles(instruction).filter(file=>deleted.has(file));
}
function forbiddenStaticRoutePlannedDeletions(instruction,plannedDeletions){
  const planned=new Set(plannedDeletions);
  return forbiddenStaticRouteFiles(instruction).filter(file=>planned.has(file));
}
function instructionRequiredChanges(atlas,instruction,{tombstones=[],plannedDeletions=[]}={}){
  const files=atlas.nodes.map(node=>node.path);
  const scoped=[...new Set((instruction.affectedPatterns??[]).flatMap(pattern=>files.filter(file=>globToRegExp(pattern).test(file))))];
  const forbiddenFiles=scoped.filter(file=>(instruction.forbiddenStates??[]).some(forbidden=>forbiddenStatePresentInFile(file,forbidden)));
  const forbiddenRouteTombstones=forbiddenStaticRouteTombstones(instruction,tombstones);
  const plannedForbiddenRouteDeletions=forbiddenStaticRoutePlannedDeletions(instruction,plannedDeletions);
  const requiredRouteFiles=(instruction.affectedRoutes??[]).map(staticRouteFile).filter(Boolean);
  return{
    instructionId:instruction.id,
    forbiddenFiles,
    forbiddenRouteTombstones,
    plannedForbiddenRouteDeletions,
    requiredRouteFiles,
    required:[...new Set([...forbiddenFiles,...forbiddenRouteTombstones,...plannedForbiddenRouteDeletions,...requiredRouteFiles])].sort(),
  };
}
export function buildExecutionRoute(atlas,patterns,{tombstones=[],plannedDeletions=[]}={}){
  const impacts=patterns.map(pattern=>impactForAtlasPattern(atlas,pattern));
  const tombstoneMatches=[...new Set(
    tombstones.filter(file=>patterns.some(pattern=>globToRegExp(pattern).test(file)))
  )].sort();
  const plannedDeletionMatches=[...new Set(
    plannedDeletions.filter(file=>patterns.some(pattern=>globToRegExp(pattern).test(file)))
  )].sort();
  const liveMatched=[...new Set(impacts.flatMap(x=>x.matchedFiles))].sort();
  const matched=[...new Set([...liveMatched,...tombstoneMatches,...plannedDeletionMatches])].sort();
  const impactedReadOnly=[...new Set(impacts.flatMap(x=>x.consumers).filter(file=>!matched.includes(file)))].sort();
  const proof=[...new Set(impacts.flatMap(x=>x.tests))].sort();
  const authority=[...new Set([
    ...impacts.flatMap(x=>x.authorities),
    ...tombstoneMatches.flatMap(file=>classifyAtlasPath(file).authorities),
  ])].sort();
  const semanticUnknowns=(atlas.semanticGraph?.unknowns??[]).filter(item=>!item.file||liveMatched.includes(item.file));
  const unresolvedImports=(atlas.unresolvedInternalImports??[]).filter(item=>liveMatched.includes(item.from));
  const applicable=(atlas.poInstructions??[]).filter(item=>item.lifecycle==='active'&&(item.affectedPatterns??[]).some(pattern=>matched.some(file=>globToRegExp(pattern).test(file))));
  const instructionRequirements=applicable.map(item=>instructionRequiredChanges(atlas,item,{tombstones:tombstoneMatches,plannedDeletions:plannedDeletionMatches}));
  const instructionRequired=[...new Set(instructionRequirements.flatMap(item=>item.required))].sort();
  const forbiddenRouteTombstones=[...new Set(instructionRequirements.flatMap(item=>item.forbiddenRouteTombstones??[]))].sort();
  const plannedForbiddenRouteDeletions=[...new Set(instructionRequirements.flatMap(item=>item.plannedForbiddenRouteDeletions??[]))].sort();
  const adapterEdges=(atlas.semanticGraph?.edges??[]).filter(edge=>
    ['wraps','adapts','overrides'].includes(edge.type)
    &&((edge.fromFile&&liveMatched.includes(edge.fromFile))||(edge.toFile&&liveMatched.includes(edge.toFile)))
  );
  const overrideLegacyAlternate=[...new Set([
    ...adapterEdges.flatMap(edge=>[edge.fromFile,edge.toFile]).filter(Boolean),
    ...impactedReadOnly.filter(file=>/(?:legacy|override|adapter|wrapper|alternate|fallback)/i.test(file)),
  ])].sort();
  const mayEdit=[...new Set(overrideLegacyAlternate.filter(file=>!matched.includes(file)))].sort();
  return{
    contract:'shoporation.semantic-execution-route.v1',
    requestPatterns:patterns,
    MUST_EDIT:matched,
    TOMBSTONES:tombstoneMatches,
    PLANNED_DELETIONS:plannedDeletionMatches,
    INSTRUCTION_REQUIRED:instructionRequired,
    INSTRUCTION_REQUIREMENTS:instructionRequirements,
    FORBIDDEN_ROUTE_TOMBSTONES:forbiddenRouteTombstones,
    PLANNED_FORBIDDEN_ROUTE_DELETIONS:plannedForbiddenRouteDeletions,
    MAY_EDIT:mayEdit,
    IMPACTED_READ_ONLY:impactedReadOnly.filter(file=>!mayEdit.includes(file)),
    AUTHORITY:authority,
    OVERRIDE_LEGACY_ALTERNATE:overrideLegacyAlternate,
    PROOF:proof,
    PO_INSTRUCTIONS:applicable.map(item=>item.id).sort(),
    UNKNOWN:[...semanticUnknowns,...unresolvedImports],
    decision:(semanticUnknowns.length||unresolvedImports.length)?'BLOCK':'PASS',
  };
}

export function resolveAtlasArchitectureForPath(atlas,file,{tombstones=[],plannedDeletions=[],executionRoute=null}={}){
  const node=(atlas.nodes??[]).find(item=>item.path===file);
  const classified=node??classifyAtlasPath(file);
  const domains=[...(classified.domains??[])].sort();
  const authorities=[...(classified.authorities??domainAuthorities(domains))].sort();
  const route=classified.route??routeForFile(file);
  const gitDeleted=tombstones.includes(file);
  const plannedDeletion=!gitDeleted&&plannedDeletions.includes(file);
  const tombstoneInstructionIds=(executionRoute?.INSTRUCTION_REQUIREMENTS??[])
    .filter(item=>(item.forbiddenRouteTombstones??[]).includes(file))
    .map(item=>item.instructionId)
    .filter(Boolean);
  const plannedInstructionIds=(executionRoute?.INSTRUCTION_REQUIREMENTS??[])
    .filter(item=>(item.plannedForbiddenRouteDeletions??[]).includes(file))
    .map(item=>item.instructionId)
    .filter(Boolean);
  const instructionIds=[...new Set([...tombstoneInstructionIds,...plannedInstructionIds])].sort();
  const instructionGovernedTombstone=Boolean(gitDeleted&&route&&tombstoneInstructionIds.length);
  const instructionGovernedPlannedDeletion=Boolean(plannedDeletion&&route&&plannedInstructionIds.length);
  return{
    path:file,
    pathDerived:{domains,authorities},
    routeAuthority:route?{...route,state:gitDeleted?'deleted-tombstone':plannedDeletion?'planned-deletion':'current-or-planned'}:null,
    poInstructionAuthority:{
      instructionIds,
      governsDeletion:instructionGovernedTombstone,
      authorizesPlannedDeletion:instructionGovernedPlannedDeletion,
    },
    resolved:Boolean(domains.length||instructionGovernedTombstone||instructionGovernedPlannedDeletion),
  };
}

export function applicablePoInstructions(atlas,files){
  return (atlas.poInstructions??[]).filter(item=>item.lifecycle==='active'&&(item.affectedPatterns??[]).some(pattern=>files.some(file=>globToRegExp(pattern).test(file))));
}

export function evaluatePoInstructionStates(atlas,files){
  const applicable=applicablePoInstructions(atlas,files),violations=[];
  for(const instruction of applicable){
    const scopedFiles=[...new Set((instruction.affectedPatterns??[]).flatMap(pattern=>files.filter(file=>globToRegExp(pattern).test(file))))];
    for(const forbidden of instruction.forbiddenStates??[]){
      const parts=String(forbidden).split(':'),kind=parts.shift(),value=parts.join(':');if(!value)continue;
      for(const file of scopedFiles)if(forbiddenStatePresentInFile(file,forbidden))violations.push({instructionId:instruction.id,forbiddenState:forbidden,file,kind,value});
    }
  }
  return{contract:'shoporation.po-instruction-state.v1',applicableInstructionIds:applicable.map(item=>item.id),violations,decision:violations.length?'BLOCK':'PASS'};
}
export function validateCodebaseAtlas(atlas){
  const issues=[];
  if(policy.contract!=='shoporation.codebase-atlas-policy.v2')issues.push({code:'ATLAS_POLICY_CONTRACT_INVALID'});
  if(atlas.contract!=='shoporation.codebase-atlas.v2')issues.push({code:'ATLAS_CONTRACT_INVALID'});
  if(constitution.contract!==policy.architectureContracts.constitution)issues.push({code:'ATLAS_CONSTITUTION_CONTRACT_MISMATCH'});
  if(domainRegistry.contract!==policy.architectureContracts.domains)issues.push({code:'ATLAS_DOMAIN_CONTRACT_MISMATCH'});
  for(const check of policy.criticalLookups){const found=new Set(lookupAtlasTerm(atlas,check.term).files);for(const required of check.requiredFiles)if(!found.has(required))issues.push({code:'ATLAS_CRITICAL_LOOKUP_MISSING',term:check.term,file:required});}
  if(!atlas.nodes.length)issues.push({code:'ATLAS_EMPTY'});
  if(atlas.semanticGraph?.contract!==(policy.semanticGraph?.contract??'shoporation.semantic-execution-graph.v1'))issues.push({code:'ATLAS_SEMANTIC_GRAPH_CONTRACT_INVALID'});
  if(!atlas.semanticGraph?.typeCheckerAvailable)issues.push({code:'ATLAS_TYPECHECKER_UNAVAILABLE'});
  const authorityReality=reconcileAuthorityDependencies(atlas);for(const discrepancy of authorityReality.discrepancies)issues.push({code:'ATLAS_AUTHORITY_DEPENDENCY_DRIFT',...discrepancy});
  for(const instruction of poInstructionRegistry.instructions??[]){if(!instruction.id||instruction.lifecycle!=='active'||!instruction.positiveRequirement||(instruction.affectedPatterns??[]).length===0)issues.push({code:'ATLAS_PO_INSTRUCTION_INVALID',instructionId:instruction.id??null});}
  const truthKeys=domainRegistry.domains.flatMap(domain=>domain.truthOwnership),uniqueTruth=new Set(truthKeys);
  if(uniqueTruth.size!==truthKeys.length)issues.push({code:'ATLAS_TRUTH_OWNER_DUPLICATE'});
  return {contract:'shoporation.codebase-atlas-validation.v2',issues,ok:issues.length===0};
}
export function writeCodebaseAtlasArtifacts(atlas){
  mkdirSync('artifacts/shoperation-atlas',{recursive:true});
  writeFileSync('artifacts/shoperation-atlas/codebase-atlas.json',JSON.stringify(atlas,null,2)+'\n');
  const md=['# Shoperation Codebase Atlas 2.0','',`Generated: ${atlas.generatedAt}`,`Tracked files: ${atlas.summary.trackedFiles}`,`Routes: ${atlas.summary.routeNodes}`,`Import edges: ${atlas.summary.importEdges}`,`Domains: ${atlas.architecture.domainCount}`,`Truth owners: ${atlas.architecture.truthOwnerCount}`,`Unresolved internal imports: ${atlas.summary.unresolvedInternalImports}`,'','## Domain coverage',...Object.entries(atlas.summary.domainCounts).sort().map(([k,v])=>`- ${k}: ${v}`)];
  writeFileSync('artifacts/shoperation-atlas/codebase-atlas.md',md.join('\n')+'\n');
}
