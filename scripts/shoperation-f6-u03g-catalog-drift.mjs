import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TRANSACTION_GUARD_SQL} from './shoperation-f6-u03f-target-transaction-guard.mjs';
import {selectHistorical0046} from './shoperation-f6-u03g-positive-fixture.mjs';

export const SCOPE='LOCAL_HISTORICAL_0046_KIND_FINGERPRINT_ONLY';
export const HOSTED_EXECUTION_ENABLED=false;
export const TARGET_SNAPSHOT_PROJECT='istjjkdcvsvilrycqecd';
export const EXPECTED_KINDS=Object.freeze([
 Object.freeze({kind:'column',count:1981,md5:'3d1877e2cec4d6fdccf0533ccd9245e2'}),
 Object.freeze({kind:'constraint',count:1161,md5:'f5a8bb48fdfb6acbc3a6aeddba6d4556'}),
 Object.freeze({kind:'fn',count:380,md5:'557b5282f7d7b589436954940bcb0a4d'}),
 Object.freeze({kind:'index',count:615,md5:'89c25f46ce63535ba9d7626906b22a7b'}),
 Object.freeze({kind:'policy',count:126,md5:'63aa91ed618266d7abcf716835436704'}),
 Object.freeze({kind:'relation',count:250,md5:'f27ea2f2f9a7e2e96c89f8d48cd8ecdb'}),
 Object.freeze({kind:'trigger',count:108,md5:'2a00a4e40d0e459944aa6c8269a8e5c0'}),
]);
export const EXPECTED_OBJECT_COUNT=4621;
export const HOSTED_RAW_MD5='e312b40ad91150ce937f4aa00db587f3';
const fail=code=>{throw new Error(code)};
const MD5=/^[0-9a-f]{32}$/;
const FINAL="SELECT count(*),md5(string_agg(k||E'\\t'||coalesce(v,'<NULL>'),E'\\n' ORDER BY k,v)) FROM object_defs";
const KIND_SELECT="SELECT split_part(k,':',1) AS object_kind,count(*) AS definitions,md5(string_agg(k||E'\\t'||coalesce(v,'<NULL>'),E'\\n' ORDER BY k,v)) AS object_md5 FROM object_defs GROUP BY 1 ORDER BY 1";
if(EXPECTED_KINDS.length!==7||EXPECTED_KINDS.reduce((s,x)=>s+x.count,0)!==EXPECTED_OBJECT_COUNT
 ||new Set(EXPECTED_KINDS.map(x=>x.kind)).size!==7||EXPECTED_KINDS.some(x=>!MD5.test(x.md5)))
 fail('F6U03G_INVALID_PINNED_HOSTED_CATALOG');

export function compileCatalogQueries(guard=TRANSACTION_GUARD_SQL){
 if(guard!==TRANSACTION_GUARD_SQL)fail('F6U03G_CANONICAL_GUARD_MUTATED');
 const m=guard.match(/EXECUTE \$f6_catalog\$([\s\S]*?)\$f6_catalog\$ INTO catalog_items,canonical_hash;/);
 if(!m||guard.match(/EXECUTE \$f6_catalog\$/g)?.length!==1)fail('F6U03G_CANONICAL_CATALOG_NOT_FOUND');
 const source=m[1].trim();
 if(!source.startsWith('WITH object_defs AS (')||!source.endsWith(FINAL))fail('F6U03G_CANONICAL_CATALOG_DRIFT');
 if(source.includes(';')||source.includes('@@')||!source.includes('pg_get_functiondef(p.oid)'))
  fail('F6U03G_CATALOG_SOURCE_UNSAFE');
 const prefix=source.slice(0,-FINAL.length);
 if(!prefix.endsWith('\n'))fail('F6U03G_CATALOG_TERMINAL_SHAPE_DRIFT');
 return Object.freeze({original:source+';\n',grouped:prefix+KIND_SELECT+';\n',
  canonicalGuardSha256:createHash('sha256').update(guard).digest('hex')});
}
export function parseKindRows(raw){
 if(typeof raw!=='string'||!raw.trim())fail('F6U03G_KIND_ROWS_MISSING');
 const lines=raw.trim().split(/\r?\n/);
 if(lines.length!==7)fail('F6U03G_KIND_SET_DRIFT');
 const rows=lines.map(line=>{
  const m=line.trim().match(/^([a-z]+)\|(0|[1-9][0-9]*)\|([0-9a-f]{32})$/);
  if(!m)fail('F6U03G_KIND_ROW_MALFORMED');
  const count=Number(m[2]);
  if(!Number.isSafeInteger(count))fail('F6U03G_KIND_COUNT_INVALID');
  return {kind:m[1],count,md5:m[3]};
 });
 const known=new Set(EXPECTED_KINDS.map(x=>x.kind));
 if(new Set(rows.map(x=>x.kind)).size!==7||rows.some(x=>!known.has(x.kind)))
  fail('F6U03G_KIND_NAMES_DRIFT');
 return rows.sort((a,b)=>a.kind.localeCompare(b.kind));
}
export function parseRawCatalog(raw){
 if(typeof raw!=='string')fail('F6U03G_RAW_CATALOG_MISSING');
 const m=raw.trim().match(/^(0|[1-9][0-9]*)\|([0-9a-f]{32})$/);
 if(!m||!Number.isSafeInteger(Number(m[1])))fail('F6U03G_RAW_CATALOG_MALFORMED');
 return {count:Number(m[1]),md5:m[2]};
}
export function classifyCatalogObservation({kindRows,rawCatalog,manifest,realPg17,atomicReplayCommitted}={}){
 if(realPg17!==true||atomicReplayCommitted!==true||manifest?.sourceCount!==47
  ||manifest?.scope!=='LOCAL_HISTORICAL_0046_ONLY')
  fail('F6U03G_HISTORICAL_REPLAY_PROOF_REQUIRED');
 const historical=selectHistorical0046();
 if(manifest.sourceSetSha256!==historical.sourceSetSha256
  ||!Array.isArray(manifest.files)||manifest.files.length!==47)
  fail('F6U03G_HISTORICAL_SOURCE_MANIFEST_DRIFT');
 const rows=parseKindRows(kindRows),raw=parseRawCatalog(rawCatalog);
 const actualTotal=rows.reduce((s,x)=>s+x.count,0);
 if(actualTotal!==raw.count)fail('F6U03G_CLASS_TOTAL_VS_RAW_DRIFT');
 const compared=EXPECTED_KINDS.map(expected=>{
  const found=rows.find(x=>x.kind===expected.kind);
  return {kind:expected.kind,expectedCount:expected.count,actualCount:found.count,
   countMatches:found.count===expected.count,hashMatches:found.md5===expected.md5,
   actualMd5:found.md5,expectedMd5:expected.md5};
 });
 const mismatchedKinds=compared.filter(x=>!x.countMatches||!x.hashMatches).map(x=>x.kind);
 const rawHashMatches=raw.count===EXPECTED_OBJECT_COUNT&&raw.md5===HOSTED_RAW_MD5;
 if(!mismatchedKinds.length&&!rawHashMatches)fail('F6U03G_GROUP_RAW_PARITY_CONTRADICTION');
 return Object.freeze({
  contract:'shoperation.f6-u03g.catalog-drift.v1',scope:SCOPE,
  decision:'DIAGNOSTIC_COMPLETE',classParity:mismatchedKinds.length?'BLOCKED':'GROUP_HASHES_MATCH_ONLY',
  hostedSnapshotProjectRef:TARGET_SNAPSHOT_PROJECT,referenceDate:'2026-10-15',
  canonicalGuardSha256:compileCatalogQueries().canonicalGuardSha256,
  originalSourceSetSha256:historical.sourceSetSha256,
  historic0046Sources:47,expectedObjects:EXPECTED_OBJECT_COUNT,actualObjects:actualTotal,
  actualRawMd5:raw.md5,expectedRawMd5:HOSTED_RAW_MD5,rawHashMatches,groups:compared,mismatchedKinds,
  originalFullGuardAccepted:false,hostedSupabaseTouched:false,
  hosted59MigrationsApplied:0,hostedResetAuthorized:HOSTED_EXECUTION_ENABLED,
  providerEventTriggersProven:false,authenticatedAlapProRlsProven:false,
 });
}
const OUT_DIR='artifacts/f6-u03g/catalog-drift';
function cli(){
 const args=process.argv.slice(2),dir=resolve(process.cwd(),OUT_DIR);
 if(args.length===2&&args[0]==='--emit-sql'&&resolve(args[1])===dir){
  const q=compileCatalogQueries();
  mkdirSync(dir,{recursive:true});
  writeFileSync(resolve(dir,'original.sql'),q.original);
  writeFileSync(resolve(dir,'grouped.sql'),q.grouped);
  writeFileSync(resolve(dir,'query-identity.json'),JSON.stringify({scope:SCOPE,sha256:q.canonicalGuardSha256,
   hostedExecutionEnabled:false,referenceDate:'2026-10-15'},null,2));
  console.log('F6U03G_CANONICAL_READ_ONLY_QUERIES_READY');
 }else if(args.length===2&&args[0]==='--classify'&&resolve(args[1])===dir){
  const manifest=JSON.parse(readFileSync(resolve(process.cwd(),'artifacts/f6-u03g/schema/manifest.json'),'utf8'));
  const result=classifyCatalogObservation({kindRows:readFileSync(resolve(dir,'kinds.txt'),'utf8'),
   rawCatalog:readFileSync(resolve(dir,'raw.txt'),'utf8'),manifest,realPg17:true,atomicReplayCommitted:true});
  console.log(JSON.stringify(result,null,2));
 }else fail('F6U03G_NO_HOSTED_OR_UNSCOPED_EXECUTION');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1}
}
