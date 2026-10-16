import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildCandidateManifest,checkCandidateManifest} from './shoperation-f6-u03l-release-candidate-acl.mjs';
export const CONTRACT='shoporation.f6-u03n.local-schema-discovery.v1';
export const TARGET='artifacts/f6-u03n/two-tenant-local';
export const REQUIRES=['auth.users','public.organizations','public.webshop_instances','public.role_bindings','public.feature_entitlements','public.entitlement_capabilities','public.office_threads','public.office_messages','public.office_tasks','public.office_thread_participants'];
const fail=m=>{throw Error(m)};
export function generateReadOnlySchemaSQL(){return String.raw`
WITH t(name) AS (SELECT unnest(ARRAY['auth.users','public.organizations','public.webshop_instances','public.role_bindings','public.feature_entitlements','public.entitlement_capabilities','public.office_threads','public.office_messages','public.office_tasks','public.office_thread_participants'])),
 tbl AS (SELECT name,to_regclass(name) AS oid FROM t),
 cols AS (SELECT tbl.name AS table_name,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS sql_type,a.attnotnull AS required,pg_get_expr(d.adbin,d.adrelid) AS default_sql
   FROM tbl JOIN pg_attribute a ON a.attrelid=tbl.oid AND a.attnum>0 AND NOT a.attisdropped
   LEFT JOIN pg_attrdef d ON d.adrelid=tbl.oid AND d.adnum=a.attnum),
 fk AS (SELECT tbl.name AS table_name,c.conname AS name,c.contype AS type,pg_get_constraintdef(c.oid,true) AS definition FROM tbl JOIN pg_constraint c ON c.conrelid=tbl.oid)
SELECT jsonb_build_object(
 'contract','shoporation.f6-u03n.local-schema-discovery.v1','database',current_database(),
 'pgMajor',current_setting('server_version_num')::integer/10000,
 'tables',(SELECT jsonb_agg(jsonb_build_object('name',name,'exists',oid IS NOT NULL) ORDER BY name) FROM tbl),
 'columns',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY table_name,name),'[]'::jsonb) FROM cols c),
 'constraints',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY table_name,name),'[]'::jsonb) FROM fk c),
 'authUidDefinition',pg_get_functiondef('auth.uid()'::regprocedure),
 'authJwtDefinition',pg_get_functiondef('auth.jwt()'::regprocedure),
 'authenticatedBypass',(SELECT rolbypassrls FROM pg_roles WHERE rolname='authenticated'),
 'anonBypass',(SELECT rolbypassrls FROM pg_roles WHERE rolname='anon')
)::text;
`}
export function evaluateDiscovery(d,manifest){
 if(!d||d.contract!==CONTRACT||!manifest||checkCandidateManifest(manifest)!==true)fail('F6U03N_INVALID_SOURCE');
 if(d.database!=='f6_u03i_fresh'||d.pgMajor!==17||d.authenticatedBypass!==false||d.anonBypass!==false||
   !Array.isArray(d.tables)||!Array.isArray(d.columns)||!Array.isArray(d.constraints)||d.tables.length!==REQUIRES.length||
   REQUIRES.some(s=>!d.tables.some(t=>t.name===s&&t.exists===true))||
   typeof d.authUidDefinition!=='string'||!/NULL::uuid/i.test(d.authUidDefinition))
  fail('F6U03N_INCOMPLETE_SCHEMA_OR_NULL_SHIM_MISSING');
 return {contract:'shoporation.f6-u03n.local-schema-readiness.v1',decision:'LOCAL_SCHEMA_DISCOVERED_TENANT_RLS_NOT_PROVEN',
  sourceCount:78,candidateSha256:manifest.candidateSha256,
  schemaHash:createHash('sha256').update(JSON.stringify(d)).digest('hex'),
  tables:d.tables.length,columns:d.columns.length,constraints:d.constraints.length,
  localAuthUidReturnsNull:true,syntheticJwt:false,realSignedSupabaseJwtProven:false,
  localTenantPositiveNegativeProven:false,hostedTouched:false,releaseAuthorized:false};
}
export function localRoleSmokeSql(){
 return [
  'BEGIN;',
  "DO $f6n$ BEGIN IF current_database()<>'f6_u03i_fresh' OR current_user<>'postgres' OR current_setting('server_version_num')::integer/10000<>17 THEN RAISE EXCEPTION 'F6U03N_WRONG_LOCAL_ROLE_TARGET'; END IF; END $f6n$;",
  "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f6uid$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $f6uid$;",
  "CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $f6jwt$ SELECT jsonb_build_object('sub',NULLIF(current_setting('request.jwt.claim.sub',true),''),'role',NULLIF(current_setting('request.jwt.claim.role',true),'')) $f6jwt$;",
  'COMMIT;',
  'BEGIN;',
  'SET LOCAL ROLE authenticated;',
  "SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);",
  "SELECT set_config('request.jwt.claim.role','authenticated',true);",
  "SELECT 'F6U03N_ROLE='||jsonb_build_object('case','authenticated','role',current_user,'user',auth.uid(),'bypass',(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user),'jwt',auth.jwt()->>'sub')::text;",
  'ROLLBACK;',
  'BEGIN;',
  'SET LOCAL ROLE anon;',
  "SELECT 'F6U03N_ROLE='||jsonb_build_object('case','anon','role',current_user,'user',auth.uid(),'bypass',(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user))::text;",
  'ROLLBACK;'
 ].join('\n')+'\n';
}
export function validateRoleSmoke(log){
 if(typeof log!=='string')throw Error('F6U03N_MISSING_LOCAL_ROLE_LOG');
 const rows=log.split('\n').filter(x=>x.startsWith('F6U03N_ROLE='))
  .map(x=>JSON.parse(x.slice('F6U03N_ROLE='.length)));
 if(rows.length!==2)throw Error('F6U03N_POSITIVE_NEGATIVE_ROLE_SMOKE_MISSING');
 const auth=rows.find(x=>x.case==='authenticated'),anon=rows.find(x=>x.case==='anon');
 if(!auth||!anon||auth.role!=='authenticated'||auth.bypass!==false||
    auth.user!=='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'||
    auth.jwt!==auth.user||anon.role!=='anon'||anon.bypass!==false||anon.user!==null)
  throw Error('F6U03N_LOCAL_AUTH_ROLE_STATE_MISMATCH');
 return {decision:'LOCAL_PROVIDER_CLAIM_SHIM_PROVEN_NOT_TENANT_RLS',
  localAuthProviderOverridden:true,syntheticJwt:true,providerSignedJwtProven:false,
  positiveOfficeRowsProven:false,negativeCrossTenantRowsProven:false,
  actualRoleCases:2,hostedTouched:false,releaseAuthorized:false};
}
export const TENANT_IDS=Object.freeze({
 AOrg:'aaaaaaaa-0000-4000-8000-000000000001',
 AStore:'aaaaaaaa-0000-4000-8000-000000000002',
 AUser:'aaaaaaaa-0000-4000-8000-000000000003',
 ACustomer:'aaaaaaaa-0000-4000-8000-000000000010',
 AInternal:'aaaaaaaa-0000-4000-8000-000000000011',
 BOrg:'bbbbbbbb-0000-4000-8000-000000000001',
 BStore:'bbbbbbbb-0000-4000-8000-000000000002',
 BUser:'bbbbbbbb-0000-4000-8000-000000000003',
 BCustomer:'bbbbbbbb-0000-4000-8000-000000000010',
 BInternal:'bbbbbbbb-0000-4000-8000-000000000011',
 Stranger:'cccccccc-0000-4000-8000-000000000003'
});
export function twoTenantSeedSql(){
 return String.raw`
-- F6-U03n: SYNTHETIC LOCAL DOCKER PG17 ONLY; all source Office tables are real.
BEGIN;
DO $f6n$ BEGIN
 IF current_database()<>'f6_u03i_fresh' OR current_user<>'postgres'
   OR current_setting('server_version_num')::integer/10000<>17
 THEN RAISE EXCEPTION 'F6U03N_NO_HOSTED_FIXTURE'; END IF;
END $f6n$;
INSERT INTO public.organizations(id,name,slug)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001','F6n A','f6n-local-a'),
       ('bbbbbbbb-0000-4000-8000-000000000001','F6n B','f6n-local-b');
INSERT INTO public.webshop_instances(id,organization_id,name,slug,status,subscription_plan)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000001','F6n Alap','f6n-local-a','active','alap'),
       ('bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000001','F6n Pro','f6n-local-b','active','pro');
INSERT INTO auth.users(id,email) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000003','a-owner@f6n.invalid'),
 ('bbbbbbbb-0000-4000-8000-000000000003','b-owner@f6n.invalid'),
 ('cccccccc-0000-4000-8000-000000000003','stranger@f6n.invalid');
INSERT INTO public.role_bindings(organization_id,instance_id,user_id,role_code) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000003','owner'),
 ('bbbbbbbb-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000003','owner');
INSERT INTO public.entitlement_capabilities(capability_code,capability_kind,release_state)
VALUES ('officeCommunication','feature','released'),('teamChat','feature','released')
ON CONFLICT (capability_code) DO NOTHING;
INSERT INTO public.feature_entitlements(organization_id,instance_id,feature_code,source,enabled) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','officeCommunication','plan',true),
 ('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','teamChat','manual',true),
 ('bbbbbbbb-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','officeCommunication','plan',true),
 ('bbbbbbbb-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','teamChat','plan',true) ON CONFLICT DO NOTHING;
INSERT INTO public.office_threads(id,instance_id,subject,conversation_type,created_by,assigned_to) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000010','aaaaaaaa-0000-4000-8000-000000000002','A customer','customer','aaaaaaaa-0000-4000-8000-000000000003','aaaaaaaa-0000-4000-8000-000000000003'),
 ('aaaaaaaa-0000-4000-8000-000000000011','aaaaaaaa-0000-4000-8000-000000000002','A internal','internal_private','aaaaaaaa-0000-4000-8000-000000000003',null),
 ('bbbbbbbb-0000-4000-8000-000000000010','bbbbbbbb-0000-4000-8000-000000000002','B customer','customer','bbbbbbbb-0000-4000-8000-000000000003','bbbbbbbb-0000-4000-8000-000000000003'),
 ('bbbbbbbb-0000-4000-8000-000000000011','bbbbbbbb-0000-4000-8000-000000000002','B internal','internal_private','bbbbbbbb-0000-4000-8000-000000000003',null);
INSERT INTO public.office_thread_participants(instance_id,thread_id,user_id,participant_role)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000011','aaaaaaaa-0000-4000-8000-000000000003','owner'),
       ('bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000011','bbbbbbbb-0000-4000-8000-000000000003','owner')
ON CONFLICT (instance_id,thread_id,user_id) DO NOTHING;
INSERT INTO public.office_messages(instance_id,thread_id,kind,body,author_id)
SELECT instance_id,id,'note','F6N_SYNTHETIC_LOCAL_ONLY',created_by FROM public.office_threads
WHERE id IN ('aaaaaaaa-0000-4000-8000-000000000010','aaaaaaaa-0000-4000-8000-000000000011','bbbbbbbb-0000-4000-8000-000000000010','bbbbbbbb-0000-4000-8000-000000000011');
INSERT INTO public.office_tasks(instance_id,thread_id,title,created_by)
SELECT instance_id,id,'F6N_SYNTHETIC_LOCAL_ONLY',created_by FROM public.office_threads
WHERE id IN ('aaaaaaaa-0000-4000-8000-000000000010','aaaaaaaa-0000-4000-8000-000000000011','bbbbbbbb-0000-4000-8000-000000000010','bbbbbbbb-0000-4000-8000-000000000011');
DO $f6n$ BEGIN
 IF NOT EXISTS(
   SELECT 1 FROM public.feature_entitlements e
   WHERE e.instance_id='aaaaaaaa-0000-4000-8000-000000000002' AND e.feature_code='officeCommunication' AND e.enabled=true
 ) OR NOT EXISTS(
   SELECT 1 FROM public.feature_entitlements e
   WHERE e.instance_id='bbbbbbbb-0000-4000-8000-000000000002' AND e.feature_code='teamChat' AND e.enabled=true
 ) OR NOT EXISTS(
   SELECT 1 FROM public.feature_entitlements e
   WHERE e.instance_id='aaaaaaaa-0000-4000-8000-000000000002' AND e.feature_code='teamChat' AND e.source='manual' AND e.enabled=true
 ) THEN RAISE EXCEPTION 'F6U03N_REQUIRED_ENTITLEMENT_SEED_NOT_MATERIALIZED'; END IF;
 IF (SELECT count(*) FROM public.organizations WHERE slug LIKE 'f6n-local-%')<>2
    OR (SELECT count(*) FROM public.office_threads WHERE subject LIKE 'A %' OR subject LIKE 'B %')<>4
    OR (SELECT count(DISTINCT organization_id) FROM public.webshop_instances WHERE slug LIKE 'f6n-local-%')<>2
 THEN RAISE EXCEPTION 'F6U03N_POSITIVE_TENANT_SEED_MISSING'; END IF;
END $f6n$;
COMMIT;
`;
}
export function tenantRowProbeSql(){
 const t=TENANT_IDS;
 const items=[
  ['A_owner','authenticated',t.AUser],
  ['B_owner','authenticated',t.BUser],
  ['stranger','authenticated',t.Stranger]
 ];
 const roleRows=items.map(([name,role,sub])=>[
  'BEGIN;','SET LOCAL ROLE '+role+';',
  "SELECT set_config('request.jwt.claim.sub','"+sub+"',true);",
  "SELECT set_config('request.jwt.claim.role','"+role+"',true);",
  "SELECT 'F6U03N_TENANT='||jsonb_build_object('case','"+name+"','role',current_user,'sub',auth.uid(),"+
   "'bypass',(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user),"+
   "'threads',(SELECT coalesce(jsonb_agg(id::text ORDER BY id),'[]'::jsonb) FROM public.office_threads),"+
   "'messages',(SELECT count(*) FROM public.office_messages),"+
   "'tasks',(SELECT count(*) FROM public.office_tasks))::text;",
  'ROLLBACK;'
 ].join('\n')).join('\n');
 return roleRows+'\n';
}
export function validateTenantRowProbe(log){
 if(typeof log!=='string')throw Error('F6U03N_MISSING_ROLE_ROW_OUTPUT');
 const rows=log.split('\n').filter(x=>x.startsWith('F6U03N_TENANT='))
  .map(x=>JSON.parse(x.slice('F6U03N_TENANT='.length)));
 if(rows.length!==3||new Set(rows.map(x=>x.case)).size!==3)
  throw Error('F6U03N_MISSING_POSITIVE_OR_NEGATIVE_TENANT_ROLE_CASE');
 for(const r of rows)
  if(r.role!=='authenticated'||r.bypass!==false||!Array.isArray(r.threads)||
     !Number.isSafeInteger(r.messages)||!Number.isSafeInteger(r.tasks))
   throw Error('F6U03N_NOT_NATIVE_AUTHENTICATED_ROW_EVIDENCE');
 const a=rows.find(x=>x.case==='A_owner'),b=rows.find(x=>x.case==='B_owner'),stranger=rows.find(x=>x.case==='stranger');
 if(!a||!b||!stranger||a.sub!==TENANT_IDS.AUser||b.sub!==TENANT_IDS.BUser||
    stranger.sub!==TENANT_IDS.Stranger||
    JSON.stringify(a.threads)!==JSON.stringify([TENANT_IDS.ACustomer])||
    JSON.stringify(b.threads)!==JSON.stringify([TENANT_IDS.BCustomer,TENANT_IDS.BInternal].sort())||
    stranger.threads.length!==0||
    a.messages!==1||a.tasks!==1||b.messages!==2||b.tasks!==2||
    stranger.messages!==0||stranger.tasks!==0)
  throw Error('F6U03N_ACTUAL_ALAP_PRO_TENANT_RLS_ASSERTION_FAILED');
 return {decision:'LOCAL_PG17_TWO_TENANT_SIMULATED_JWT_RLS_VERIFIED_NOT_HOSTED',
   positiveTenantRoleCases:2,negativeRoleCases:1,crossTenantRowsVisible:0,
   localTenantPositiveNegativeProven:true,syntheticJwt:true,
   signedSupabaseJwtProven:false,hostedTouched:false,releaseAuthorized:false};
}
function main(){
 const [mode,path]=process.argv.slice(2);
 if(process.argv.length!==4||resolve(path||'')!==resolve(TARGET))fail('F6U03N_LOCAL_ARTIFACT_ONLY');
 mkdirSync(resolve(TARGET),{recursive:true});
 if(mode==='--emit-discovery'){
  const m=buildCandidateManifest();if(checkCandidateManifest(m)!==true)fail('F6U03N_ORIGINAL_SOURCE_UNVERIFIED');
  writeFileSync(join(resolve(TARGET),'read-only-fixture-schema.sql'),generateReadOnlySchemaSQL());
  writeFileSync(join(resolve(TARGET),'candidate.json'),JSON.stringify(m,null,2)+'\n');return;
 }
 if(mode==='--emit-role-smoke'){
  const readiness=JSON.parse(readFileSync(join(resolve(TARGET),'readiness.json'),'utf8'));
  if(readiness.decision!=='LOCAL_SCHEMA_DISCOVERED_TENANT_RLS_NOT_PROVEN'||readiness.localTenantPositiveNegativeProven!==false)
   fail('F6U03N_SCHEMA_READINESS_REQUIRED');
  writeFileSync(join(resolve(TARGET),'role-smoke-local-only.sql'),localRoleSmokeSql());return;
 }
 if(mode==='--assess-role-smoke'){
  const log=readFileSync(join(resolve(TARGET),'role-smoke.log'),'utf8');
  const result=validateRoleSmoke(log);
  writeFileSync(join(resolve(TARGET),'role-smoke-evidence.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));return;
 }
 if(mode==='--emit-tenant-fixture'){
  const smoke=JSON.parse(readFileSync(join(resolve(TARGET),'role-smoke-evidence.json'),'utf8'));
  if(smoke.actualRoleCases!==2||smoke.providerSignedJwtProven!==false)fail('F6U03N_ROLE_SMOKE_REQUIRED');
  writeFileSync(join(resolve(TARGET),'two-tenant-fixture.sql'),twoTenantSeedSql());
  writeFileSync(join(resolve(TARGET),'tenant-role-select.sql'),tenantRowProbeSql());return;
 }
 if(mode==='--assess-tenant-rows'){
  const result=validateTenantRowProbe(readFileSync(join(resolve(TARGET),'tenant-role-select.log'),'utf8'));
  writeFileSync(join(resolve(TARGET),'tenant-role-evidence.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));return;
 }
 if(mode==='--assess-discovery'){
  const d=JSON.parse(readFileSync(join(resolve(TARGET),'native-fixture-schema.json'),'utf8'));
  const m=JSON.parse(readFileSync(join(resolve(TARGET),'candidate.json'),'utf8'));
  const result=evaluateDiscovery(d,m);
  writeFileSync(join(resolve(TARGET),'readiness.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));return;
 }
 fail('F6U03N_UNSUPPORTED_OR_HOSTED_MODE');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{main()}catch(e){console.error(e.message);process.exitCode=1}}
