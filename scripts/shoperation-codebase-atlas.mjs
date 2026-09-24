import {buildCodebaseAtlas,impactForAtlasPattern,lookupAtlasTerm,validateCodebaseAtlas,writeCodebaseAtlasArtifacts} from './lib/shoperation-codebase-atlas-runtime.mjs';
const args=process.argv.slice(2),value=name=>{const i=args.indexOf(name);return i>=0?args[i+1]??'':null;};
const atlas=buildCodebaseAtlas(),validation=validateCodebaseAtlas(atlas);writeCodebaseAtlasArtifacts(atlas);
const queryFile=value('--query-file'),lookup=value('--lookup');
if(queryFile)console.log(JSON.stringify(impactForAtlasPattern(atlas,queryFile),null,2));
if(lookup)console.log(JSON.stringify(lookupAtlasTerm(atlas,lookup),null,2));
console.log(`Codebase Atlas: ${validation.ok?'PASS':'BLOCK'}; files=${atlas.summary.indexedNodes}; routes=${atlas.summary.routeNodes}; imports=${atlas.summary.importEdges}; symbols=${atlas.summary.exportedSymbols}; keys=${atlas.summary.literalKeys}.`);
for(const issue of validation.issues)console.error(JSON.stringify(issue));
if(!validation.ok&&args.includes('--check'))process.exit(1);
