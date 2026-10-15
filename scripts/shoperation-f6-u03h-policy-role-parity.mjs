import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileCatalogQueries} from './shoperation-f6-u03g-catalog-drift.mjs';
import {selectHistorical0046} from './shoperation-f6-u03g-positive-fixture.mjs';

export const SCOPE='LOCAL_HISTORICAL_0046_POLICY_ROLE_OID_DIAGNOSTIC_ONLY';
export const HOSTED_EXECUTION_ENABLED=false;
export const HOSTED_REFERENCE=Object.freeze({
 projectRef:'istjjkdcvsvilrycqecd',observedDate:'2026-10-15',policyCount:126,
 rawMd5:'63aa91ed618266d7abcf716835436704',
 namedMd5:'e5dc03a08c272c6b993b45306c5f664d',
 roles:Object.freeze([
  Object.freeze({name:'anon',oid:'16484',policies:2}),
  Object.freeze({name:'authenticated',oid:'16485',policies:124})
 ])
});
const fail=code=>{throw new Error(code)};
const ROW_PATTERN=/^(0|[1-9][0-9]*)\|([0-9a-f]{32})$/;
const RAW_TAIL="SELECT count(*),md5(string_agg(k||E'\\t'||coalesce(v,'<NULL>'),E'\\n' ORDER BY k,v)) FROM object_defs";
const POLICY_TAIL="SELECT count(*),md5(string_agg(k||E'\\t'||coalesce(v,'<NULL>'),E'\\n' ORDER BY k,v)) FROM object_defs WHERE k LIKE 'policy:%'";
const roleName="CASE WHEN rr.role_oid=0 THEN 'PUBLIC' ELSE coalesce(role_reg.rolname,'!UNKNOWN_ROLE:'||rr.role_oid::text) END";
const ROLE_NAME_EXPRESSION="(SELECT string_agg("+roleName+",',' ORDER BY "+roleName+") FROM unnest(p.polroles) AS rr(role_oid) LEFT JOIN pg_roles role_reg ON role_reg.oid=rr.role_oid)";
const ROLE_SQL="SELECT COALESCE(r.rolname,'!UNKNOWN_ROLE') AS role_name,role_entry.role_oid::text AS role_oid,count(*)::text AS policy_count FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL unnest(p.polroles) AS role_entry(role_oid) LEFT JOIN pg_roles r ON r.oid=role_entry.role_oid WHERE n.nspname IN('public','private') GROUP BY 1,2 ORDER BY 1,2;\n";
export function compilePolicyQueries(){
 const q=compileCatalogQueries();
 const original=q.original.trim();
 if(original.split('p.polroles::text').length!==2)fail('F6U03H_CANONICAL_POLICY_ROLE_CLAUSE_DRIFT');
 if(!original.endsWith(RAW_TAIL+';'))fail('F6U03H_CANONICAL_CATALOG_TERMINAL_DRIFT');
 const prefix=original.slice(0,-(RAW_TAIL+';').length);
 if(!prefix.startsWith('WITH object_defs AS (')||prefix.includes(';'))fail('F6U03H_CANONICAL_QUERY_UNSAFE');
 return Object.freeze({
  sourceGuardSha256:q.canonicalGuardSha256,
  rawPolicy:prefix+POLICY_TAIL+';\n',
  namedPolicy:prefix.replace('p.polroles::text',ROLE_NAME_EXPRESSION)+POLICY_TAIL+';\n',
  roles:ROLE_SQL
 });
}
export function parsePolicyDigest(value){
 const m=typeof value==='string'&&value.trim().match(ROW_PATTERN);
 if(!m||Number(m[1])!==HOSTED_REFERENCE.policyCount)fail('F6U03H_POLICY_COUNT_OR_MD5_INVALID');
 return {count:Number(m[1]),md5:m[2]};
}
export function parseRoles(value){
 if(typeof value!=='string')fail('F6U03H_ROLES_MISSING');
 const lines=value.trim().split(/\r?\n/),names=new Set();
 if(lines.length!==2)fail('F6U03H_ROLE_SET_DRIFT');
 const roles=lines.map(row=>{
  const m=row.match(/^([a-z_]+)\|([1-9][0-9]*)\|(0|[1-9][0-9]*)$/);
  if(!m||!Number.isSafeInteger(Number(m[2]))||!Number.isSafeInteger(Number(m[3])))
   fail('F6U03H_ROLE_MALFORMED');
  if(names.has(m[1]))fail('F6U03H_DUPLICATE_ROLE');
  names.add(m[1]);
  return {name:m[1],oid:m[2],policies:Number(m[3])};
 }).sort((a,b)=>a.name.localeCompare(b.name));
 for(let i=0;i<2;i++){
  if(roles[i].name!==HOSTED_REFERENCE.roles[i].name||roles[i].policies!==HOSTED_REFERENCE.roles[i].policies)
   fail('F6U03H_POLICY_ROLE_MEMBERSHIP_DRIFT');
 }
 if(roles[0].oid===roles[1].oid)fail('F6U03H_ROLE_OIDS_COLLIDE');
 return roles;
}
export function classifyRoleOidParity({rawDigest,namedDigest,roleRows,manifest,realPg17,all47Committed}={}){
 if(realPg17!==true||all47Committed!==true||manifest?.sourceCount!==47||
    manifest?.scope!=='LOCAL_HISTORICAL_0046_ONLY')
  fail('F6U03H_REAL_47_FILE_REPLAY_REQUIRED');
 const selection=selectHistorical0046();
 if(manifest.sourceSetSha256!==selection.sourceSetSha256||manifest.files?.length!==47)
  fail('F6U03H_HISTORICAL_SOURCE_SET_DRIFT');
 const raw=parsePolicyDigest(rawDigest),stable=parsePolicyDigest(namedDigest),roles=parseRoles(roleRows);
 const oidsDiffer=roles.some((r,i)=>r.oid!==HOSTED_REFERENCE.roles[i].oid);
 const rawMatches=raw.md5===HOSTED_REFERENCE.rawMd5;
 const normalizedMatches=stable.md5===HOSTED_REFERENCE.namedMd5;
 const verdict=normalizedMatches && !rawMatches && oidsDiffer
  ?'RAW_OID_SERIALIZATION_ONLY'
  : normalizedMatches&&rawMatches&&!oidsDiffer
  ?'RAW_AND_NAMED_POLICY_CATALOG_EQUAL'
  :'POLICY_DIFFERENCE_NOT_FULLY_EXPLAINED';
 // For a verified isolated run, equality under explicit role-name substitution is
 // evidence about these 126 catalog definitions only, NEVER full provider or RLS proof.
 return Object.freeze({
  contract:'shoporation.f6-u03h.role-oid-diagnostic.v1',scope:SCOPE,
  decision:'DIAGNOSTIC_COMPLETE',verdict,actualPolicyCount:raw.count,
  referenceDate:HOSTED_REFERENCE.observedDate,referenceProject:HOSTED_REFERENCE.projectRef,
  sourceSetSha256:selection.sourceSetSha256,historicalSourcesExecuted:47,
  rawMatches,normalizedMatches,oidsDiffer,localRawMd5:raw.md5,hostedRawMd5:HOSTED_REFERENCE.rawMd5,
  localNamedMd5:stable.md5,hostedNamedMd5:HOSTED_REFERENCE.namedMd5,
  localRoles:roles,hostedRoles:HOSTED_REFERENCE.roles,
  canonicalGuardSha256:compilePolicyQueries().sourceGuardSha256,
  hostedSupabaseTouched:false,hosted59MigrationsApplied:0,hostedResetAuthorized:HOSTED_EXECUTION_ENABLED,
  fullStrictGuardAccepted:false,providerRoleSessionsProven:false,authenticatedAlapProRlsProven:false
 });
}
const DIR='artifacts/f6-u03h/policy-role';
function main(){
 const [op,path]=process.argv.slice(2),dir=resolve(process.cwd(),DIR);
 if(process.argv.length!==4||resolve(path||'')!==dir)fail('F6U03H_LOCAL_DIAGNOSTIC_CLI_ONLY');
 if(op==='--emit-sql'){
  mkdirSync(dir,{recursive:true});
  const q=compilePolicyQueries();
  writeFileSync(resolve(dir,'raw-policy.sql'),q.rawPolicy);
  writeFileSync(resolve(dir,'named-policy.sql'),q.namedPolicy);
  writeFileSync(resolve(dir,'role-ids.sql'),q.roles);
  writeFileSync(resolve(dir,'source-sha256.txt'),q.sourceGuardSha256+'\n');
  console.log('F6U03H_READ_ONLY_POLICY_SQL_READY');
 }else if(op==='--classify'){
  const manifest=JSON.parse(readFileSync(resolve('artifacts/f6-u03g/schema/manifest.json'),'utf8'));
  const result=classifyRoleOidParity({
   rawDigest:readFileSync(resolve(dir,'raw-policy.txt'),'utf8'),
   namedDigest:readFileSync(resolve(dir,'named-policy.txt'),'utf8'),
   roleRows:readFileSync(resolve(dir,'role-ids.txt'),'utf8'),
   manifest,realPg17:true,all47Committed:true
  });
  console.log(JSON.stringify(result,null,2));
 }else fail('F6U03H_UNKNOWN_OR_HOSTED_OPERATION');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{main()}catch(e){console.error(e.message);process.exitCode=1}
}
