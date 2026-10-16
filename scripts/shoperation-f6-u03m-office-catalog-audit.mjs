import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildCandidateManifest,checkCandidateManifest} from './shoperation-f6-u03l-release-candidate-acl.mjs';
export const CONTRACT='shoporation.f6-u03m.native-application-catalog.v1';
export const SCOPE='LOCAL_PG17_OFFICE_CATALOG_REVIEW_NOT_RELEASE';
export const TARGET='artifacts/f6-u03m/office-catalog';
const fail=x=>{throw new Error(x)};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const related=/office|team_chat|team_|communication|support|thread|inbox|ticket/i;
export const office=x=>related.test(x.name||x.table_name||'')||x.body_touches_office===true;
export function nativeCatalogSQL(){return String.raw`-- READ ONLY: PostgreSQL17 native catalog after 78 original SQL sources.
WITH rel AS (
 SELECT format('%I.%I',n.nspname,c.relname) AS name,n.nspname AS schema,
        c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS force_rls,
        has_schema_privilege('anon',n.oid,'USAGE') AS anon_schema_usage,
        has_schema_privilege('authenticated',n.oid,'USAGE') AS auth_schema_usage,
        has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
        has_table_privilege('authenticated',c.oid,'SELECT') AS auth_select,
        has_table_privilege('anon',c.oid,'INSERT') AS anon_insert,
        has_table_privilege('authenticated',c.oid,'INSERT') AS auth_insert,
        has_table_privilege('anon',c.oid,'UPDATE') AS anon_update,
        has_table_privilege('authenticated',c.oid,'UPDATE') AS auth_update,
        has_table_privilege('anon',c.oid,'DELETE') AS anon_delete,
        has_table_privilege('authenticated',c.oid,'DELETE') AS auth_delete
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p')
), funcs AS (
 SELECT format('%I.%I',n.nspname,p.proname)||'('||
    pg_get_function_identity_arguments(p.oid)||')' AS name,n.nspname AS schema,
    p.prosecdef AS security_definer,
    has_schema_privilege('anon',n.oid,'USAGE') AS anon_schema_usage,
    has_schema_privilege('authenticated',n.oid,'USAGE') AS auth_schema_usage,
    p.prosrc ~* '(office_|team_chat|team_|communication|support|thread|inbox|ticket)' AS body_touches_office,
    has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_execute,
    has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute,
    EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
            WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','private')
), policies AS (
 SELECT format('%I.%I',n.nspname,c.relname) AS table_name,
    p.polname AS name,p.polcmd AS command,p.polpermissive AS permissive,
    pg_get_expr(p.polqual,p.polrelid) AS using_expr,
    pg_get_expr(p.polwithcheck,p.polrelid) AS check_expr,
    ARRAY(SELECT CASE WHEN z.role_oid=0 THEN 'PUBLIC'
      ELSE coalesce(r.rolname,'UNKNOWN_ROLE') END
      FROM unnest(p.polroles) z(role_oid)
      LEFT JOIN pg_roles r ON r.oid=z.role_oid ORDER BY 1) AS roles
 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('public','private')
), triggers AS (
 SELECT format('%I.%I',n.nspname,c.relname) AS table_name,
    t.tgname AS name,t.tgenabled AS enabled,pg_get_triggerdef(t.oid,true) AS definition
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('public','private') AND NOT t.tgisinternal
)
SELECT jsonb_build_object(
 'contract','shoporation.f6-u03m.native-application-catalog.v1',
 'relations',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.name),'[]'::jsonb) FROM rel x),
 'functions',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.name),'[]'::jsonb) FROM funcs x),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.table_name,x.name),'[]'::jsonb) FROM policies x),
 'triggers',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.table_name,x.name),'[]'::jsonb) FROM triggers x)
)::text;
`;}
export function validateCatalog(d){
 if(!d||d.contract!==CONTRACT||
   !['relations','functions','policies','triggers'].every(x=>Array.isArray(d[x])))
   fail('F6U03M_INVALID_CATALOG');
 const {relations:r,functions:f,policies:p,triggers:t}=d;
 const uniq=(a,k)=>new Set(a.map(k)).size===a.length;
 if(r.filter(x=>x.schema==='public').length<190||
    f.filter(x=>x.schema==='public').length<379||
    p.filter(x=>x.table_name.startsWith('public.')).length<129||
    t.length<1||!uniq(r,x=>x.name)||!uniq(f,x=>x.name)||
    !uniq(p,x=>x.table_name+'/'+x.name)||!uniq(t,x=>x.table_name+'/'+x.name))
   fail('F6U03M_INCOMPLETE_CATALOG');
 const rs=['rls_enabled','force_rls','anon_schema_usage','auth_schema_usage','anon_select','auth_select','anon_insert',
  'auth_insert','anon_update','auth_update','anon_delete','auth_delete'];
 const fs=['security_definer','body_touches_office','anon_schema_usage','auth_schema_usage','anon_execute','auth_execute','service_execute','public_execute'];
 if(r.some(x=>typeof x.name!=='string'||rs.some(k=>typeof x[k]!=='boolean'))||
   f.some(x=>typeof x.name!=='string'||fs.some(k=>typeof x[k]!=='boolean'))||
   p.some(x=>!Array.isArray(x.roles)||!['r','a','w','d','*'].includes(x.command)||
      typeof x.table_name!=='string'||(x.using_expr!==null&&typeof x.using_expr!=='string')||
      (x.check_expr!==null&&typeof x.check_expr!=='string'))||
   t.some(x=>!['O','D','R','A'].includes(x.enabled)||typeof x.table_name!=='string'))
   fail('F6U03M_CATALOG_FIELD_DRIFT');
 const v2=f.find(x=>x.name.startsWith('public.record_inbound_office_email_v2('));
 const v3=f.find(x=>x.name.startsWith('public.record_inbound_office_email_v3('));
 if(!v2||!v3||!v2.security_definer||!v3.security_definer||
   v2.anon_execute||v2.auth_execute||v2.service_execute||v2.public_execute||
   v3.anon_execute||v3.auth_execute||v3.public_execute||!v3.service_execute)
   fail('F6U03M_INBOUND_ACL_REGRESSION');
 return true;
}
export function findOfficeRisks(d){
 const a=[];
 const add=(rule,kind,object,reason,priority='review')=>a.push({
  rule,kind,object,reason,priority,semanticReviewRequired:true});
 for(const x of d.relations||[]){
  if(!office(x))continue;
  const browser=['anon_select','auth_select','anon_insert','auth_insert','anon_update',
   'auth_update','anon_delete','auth_delete'].some(k=>x[k]);
  if(!x.rls_enabled)add('OFFICE_RLS_DISABLED','relation',x.name,
   'Related table has RLS disabled; evaluate effective schema and API exposure',
   browser&&(x.anon_schema_usage||x.auth_schema_usage)?'high':'review');
  if(browser)add('OFFICE_BROWSER_TABLE_GRANT','relation',x.name,
   'Browser table privilege requires tenant predicate and API review');
 }
 for(const x of d.functions||[]){
  if(office(x)&&x.security_definer&&(x.anon_execute||x.auth_execute||x.public_execute)){
   const direct=(x.anon_schema_usage&&x.anon_execute)||(x.auth_schema_usage&&x.auth_execute);
   add('OFFICE_EXPOSED_SECURITY_DEFINER','function',x.name,
    direct?'Privileged function is SQL-executable with browser role and schema USAGE; provider Data API exposure and tenant boundary require review':'Privileged function EXECUTE/PUBLIC grant exists but direct browser schema USAGE is not proven; review inherited rights and managed API exposure',
    direct?'high':'review');
  }
 }
 for(const x of d.policies||[]){
  if(!office({name:x.table_name}))continue;
  if(['w','*'].includes(x.command)&&x.check_expr===null)
   add('OFFICE_UPDATE_CHECK_REVIEW','policy',x.table_name+'/'+x.name,
    'No explicit WITH CHECK: PostgreSQL USING fallback may apply; semantic review');
  if(x.roles.includes('PUBLIC'))
   add('OFFICE_PUBLIC_POLICY_REVIEW','policy',x.table_name+'/'+x.name,
    'Policy includes PUBLIC; inspect ownership predicate and effective grants');
 }
 for(const x of d.triggers||[]){
  if(office({name:x.table_name})&&['D','R'].includes(x.enabled))
   add('OFFICE_TRIGGER_NOT_ALWAYS_ON','trigger',x.table_name+'/'+x.name,
    'Disabled or replica-only trigger; assess integrity/audit invariant','high');
 }
 return a.sort((x,y)=>x.rule.localeCompare(y.rule)||x.object.localeCompare(y.object));
}
export function reportCatalog(d,m){
 validateCatalog(d);
 if(!m||m.sources?.length!==78||m.releaseAuthorized!==false||
    checkCandidateManifest(m)!==true)fail('F6U03M_SOURCE_PROVENANCE_REQUIRED');
 const focus={relations:d.relations.filter(office).length,
  functions:d.functions.filter(office).length,
  policies:d.policies.filter(x=>office({name:x.table_name})).length,
  triggers:d.triggers.filter(x=>office({name:x.table_name})).length};
 if(!focus.relations||!focus.functions||!focus.policies)
  fail('F6U03M_NO_OFFICE_OBJECTS');
 const findings=findOfficeRisks(d);
 return {contract:'shoporation.f6-u03m.office-catalog-review.v1',
  decision:'OFFICE_CATALOG_REVIEW_REQUIRED_NOT_RELEASE',scope:SCOPE,
  sourceCount:78,candidateSha256:m.candidateSha256,catalogSha256:hash(d),
  counts:{relations:d.relations.length,functions:d.functions.length,
   policies:d.policies.length,triggers:d.triggers.length},
  relevantCounts:focus,findingsCount:findings.length,findings,
  releaseAuthorized:false,hostedTouched:false,providerManagedProven:false,
  signedInAlapProRlsProven:false,semanticReviewComplete:false,
  openRequirements:['All Office policy/RPC/grant semantic review','real signed-in Alap/Pro tenant RLS',
   'managed Supabase Auth/Storage','approved versioned release SQL package','hosted backup/restore/TLS and identity']};
}
function cli(){
 const [mode,target]=process.argv.slice(2);
 if(process.argv.length!==4||resolve(target||'')!==resolve(TARGET))
  fail('F6U03M_LOCAL_ONLY_CLI');
 mkdirSync(resolve(TARGET),{recursive:true});
 if(mode==='--emit-readonly'){
  const m=buildCandidateManifest();
  if(checkCandidateManifest(m)!==true)fail('F6U03M_SOURCE_INVALID');
  writeFileSync(join(resolve(TARGET),'native-catalog-readonly.sql'),nativeCatalogSQL());
  writeFileSync(join(resolve(TARGET),'source-manifest.json'),JSON.stringify(m,null,2)+'\n');
  console.log(JSON.stringify({sources:78,releaseAuthorized:false,scope:SCOPE}));return;
 }
 if(mode==='--classify'){
  const d=JSON.parse(readFileSync(join(resolve(TARGET),'raw-native-catalog.json'),'utf8'));
  const m=JSON.parse(readFileSync(join(resolve(TARGET),'source-manifest.json'),'utf8'));
  const report=reportCatalog(d,m);
  writeFileSync(join(resolve(TARGET),'office-catalog-review.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({decision:report.decision,counts:report.counts,
    relevant:report.relevantCounts,findings:report.findingsCount,releaseAuthorized:false}));
  return;
 }
 fail('F6U03M_NO_HOSTED_EXECUTION');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1;}
}
