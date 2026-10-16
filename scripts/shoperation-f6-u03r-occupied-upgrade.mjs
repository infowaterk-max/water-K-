import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {composeOriginalSourceDiagnostic} from './shoperation-f6-u03k-office-local-replay.mjs';
import {buildCandidateManifest,checkCandidateManifest} from './shoperation-f6-u03l-release-candidate-acl.mjs';
import {boundLocalFixtureBootstrap} from './shoperation-f6-u03i-local-59-proof.mjs';
export const SCOPE='LOCAL_PG17_OCCUPIED_0046_0058_NOT_HOSTED';
export const OUT='artifacts/f6-u03r/occupied-upgrade';
const A47='-- F6U03I_ORIGINAL_SOURCE supabase/customer-baseline/migrations/0047_team_permissions_foundation_v1.sql';
const O='dddddddd-0000-4000-8000-000000000001',S='dddddddd-0000-4000-8000-000000000002',U='dddddddd-0000-4000-8000-000000000003',T='dddddddd-0000-4000-8000-000000000010';
const fail=x=>{throw Error(x)};
const guard="DO $g$ BEGIN IF current_database()<>'f6_u03i_fresh' OR current_user<>'postgres' OR current_setting('server_version_num')::int/10000<>17 THEN RAISE EXCEPTION 'F6U03R_WRONG_PG17_PEER'; END IF; END $g$;";
const persist=[
 "DO $g$ BEGIN IF (SELECT count(*) FROM public.organizations WHERE id='"+O+"')<>1",
 " OR (SELECT count(*) FROM public.webshop_instances WHERE id='"+S+"' AND organization_id='"+O+"' AND subscription_plan='alap')<>1",
 " OR (SELECT count(*) FROM auth.users WHERE id='"+U+"')<>1",
 " OR (SELECT count(*) FROM public.role_bindings WHERE instance_id='"+S+"' AND user_id='"+U+"' AND role_code='owner')<>1",
 " OR (SELECT count(*) FROM public.office_threads WHERE id='"+T+"' AND subject='F6R_KEEP_CUSTOMER' AND created_by='"+U+"')<>1",
 " OR (SELECT count(*) FROM public.office_messages WHERE thread_id='"+T+"' AND body='F6R_KEEP_MESSAGE')<>1",
 " OR (SELECT count(*) FROM public.office_tasks WHERE thread_id='"+T+"' AND title='F6R_KEEP_TASK')<>1",
 " THEN RAISE EXCEPTION 'F6U03R_LEGACY_DATA_LOST_OR_MODIFIED'; END IF; END $g$;"
].join('\n');
export function seedOld(){
 return [
 'BEGIN;',guard,
 "DO $g$ BEGIN IF to_regclass('public.office_thread_participants') IS NOT NULL THEN RAISE EXCEPTION 'F6U03R_NOT_LEGACY'; END IF; END $g$;",
 "INSERT INTO public.organizations(id,name,slug) VALUES ('"+O+"','F6R Existing','f6r-old');",
 "INSERT INTO public.webshop_instances(id,organization_id,name,slug,status,subscription_plan) VALUES ('"+S+"','"+O+"','F6R Existing Alap','f6r-old','active','alap');",
 "INSERT INTO auth.users(id,email) VALUES ('"+U+"','f6r@local.invalid');",
 "INSERT INTO public.role_bindings(organization_id,instance_id,user_id,role_code) VALUES ('"+O+"','"+S+"','"+U+"','owner');",
 "INSERT INTO public.office_threads(id,instance_id,subject,created_by) VALUES ('"+T+"','"+S+"','F6R_KEEP_CUSTOMER','"+U+"');",
 "INSERT INTO public.office_messages(instance_id,thread_id,kind,body,author_id) VALUES ('"+S+"','"+T+"','note','F6R_KEEP_MESSAGE','"+U+"');",
 "INSERT INTO public.office_tasks(instance_id,thread_id,title,created_by) VALUES ('"+S+"','"+T+"','F6R_KEEP_TASK','"+U+"');",
 persist,'COMMIT;'
 ].join('\n')+'\n';
}
export function observe(stage){
 const s=[
 guard,persist,
 "SELECT 'F6U03R_NATIVE='||jsonb_build_object(",
 " 'stage','"+stage+"','role',current_user,'db',current_database(),",
 " 'pgMajor',current_setting('server_version_num')::int/10000,",
 " 'stores',(SELECT count(*) FROM public.webshop_instances WHERE id='"+S+"' AND subscription_plan='alap'),",
 " 'owners',(SELECT count(*) FROM public.role_bindings WHERE instance_id='"+S+"' AND user_id='"+U+"'),",
 " 'threads',(SELECT count(*) FROM public.office_threads WHERE id='"+T+"' AND subject='F6R_KEEP_CUSTOMER'),",
 " 'messages',(SELECT count(*) FROM public.office_messages WHERE thread_id='"+T+"' AND body='F6R_KEEP_MESSAGE'),",
 " 'tasks',(SELECT count(*) FROM public.office_tasks WHERE thread_id='"+T+"' AND title='F6R_KEEP_TASK'),",
 " 'participantTable',to_regclass('public.office_thread_participants') IS NOT NULL,",
 " 'modernHelper',to_regprocedure('private.current_user_can_read_office_thread_v1(uuid,uuid)') IS NOT NULL,",
 " 'modernPolicy',(SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='office_threads' AND policyname='office_threads_store_all' AND qual LIKE '%current_user_can_read_office_thread_v1%')=1,",
 " 'authSelect',has_table_privilege('authenticated','public.office_threads','SELECT'))::text;"
 ];
 if(stage==='after')s.push("DO $g$ BEGIN IF (SELECT count(*) FROM public.office_thread_participants WHERE thread_id='"+T+"' AND user_id='"+U+"')<>1 THEN RAISE EXCEPTION 'F6U03R_PARTICIPANT_BACKFILL_MISSING'; END IF; END $g$;");
 return s.join('\n')+'\n';
}
export function compile(){
 const candidate=buildCandidateManifest(),source=composeOriginalSourceDiagnostic({mode:'commit'});
 if(checkCandidateManifest(candidate)!==true||source.manifest.uniqueOriginalFiles!==78)fail('F6U03R_UNVERIFIED_ORIGINAL_SOURCES');
 const at=source.sql.indexOf(A47),end=source.sql.indexOf('-- ORIGINAL AUTH BOOTSTRAP',at);
 if(at<0||end<=at||source.sql.indexOf(A47,at+1)!==-1)fail('F6U03R_SOURCE_ANCHOR_INVALID');
 const pre=source.sql.slice(0,at),later=source.sql.slice(at,end);
 const marker=/^-- (?:F6U03I_ORIGINAL_SOURCE|F6U03K_PINNED_ORIGINAL_MAIN_SOURCE) (.+\.sql)$/gm;
 const old=[...pre.matchAll(marker)].map(x=>x[1]),up=[...later.matchAll(marker)].map(x=>x[1]);
 if(old.length!==47||up.length!==31||old.at(-1)!=='supabase/customer-baseline/migrations/0046_alap_team_chat_plan_grant_reconcile.sql'||
    up[0]!=='supabase/customer-baseline/migrations/0047_team_permissions_foundation_v1.sql'||
    up.at(-1)!=='supabase/customer-baseline/migrations/0058_digital_office_plan_scoped_sql_guard_v2.sql'||
    JSON.stringify([...old,...up])!==JSON.stringify(candidate.sources.map(x=>x.path)))
    fail('F6U03R_NOT_ORIGINAL_47_PLUS_31_ORDER');
 const auth=readFileSync('supabase/customer-baseline/auth-bootstrap.sql','utf8');
 const make=fault=>['BEGIN;', "SET LOCAL lock_timeout='3s';","SET LOCAL statement_timeout='5min';",guard,
 "DO $g$ BEGIN IF to_regclass('public.office_thread_participants') IS NOT NULL THEN RAISE EXCEPTION 'F6U03R_NOT_OLD_SCHEMA'; END IF; END $g$;",
 persist,later,'-- ORIGINAL AUTH BOOTSTRAP',auth,persist,
 "DO $g$ BEGIN IF to_regclass('public.office_thread_participants') IS NULL OR to_regprocedure('private.current_user_can_read_office_thread_v1(uuid,uuid)') IS NULL THEN RAISE EXCEPTION 'F6U03R_MODERN_PRIVACY_MISSING'; END IF; END $g$;",
 fault?"DO $g$ BEGIN RAISE EXCEPTION 'F6U03R_INJECTED_ROLLBACK'; END $g$;":"SELECT 'F6U03R_UPGRADE_COMPLETE';",'COMMIT;'].join('\n')+'\n';
 const initial=pre.trimEnd()+'\nCOMMIT;\n';
 if(!initial.includes('ORIGINAL TARGET PREFLIGHT')||make(false).includes('ORIGINAL TARGET PREFLIGHT')||make(false).includes('ORIGINAL TARGET POSTFLIGHT'))fail('F6U03R_EMPTY_TARGET_GUARD_MISUSED');
 return {bootstrap:boundLocalFixtureBootstrap('f6_u03i_fresh'),legacy:initial,seed:seedOld(),
  rollback:make(true),upgrade:make(false),before:observe('before'),afterRollback:observe('after_rollback'),after:observe('after'),
  manifest:{scope:SCOPE,sources:78,old:47,forward:31,sourceSha256:candidate.candidateSha256,
   hostedTouched:false,providerJwtProven:false,managedApiProven:false,releaseAuthorized:false}};
}
export function assess({before,afterRollback,after,manifest}){
 if(!manifest||manifest.sources!==78||manifest.old!==47||manifest.forward!==31||manifest.hostedTouched!==false||manifest.releaseAuthorized!==false)fail('F6U03R_MANIFEST_REQUIRED');
 const parse=(log,name)=>{
  const lines=String(log).split('\n').filter(x=>x.startsWith('F6U03R_NATIVE='));
  if(lines.length!==1)fail('F6U03R_NATIVE_OBSERVATION_MISSING:'+name);
  let o;try{o=JSON.parse(lines[0].slice('F6U03R_NATIVE='.length))}catch{fail('F6U03R_BAD_JSON')}
  if(o.stage!==name||o.role!=='postgres'||o.db!=='f6_u03i_fresh'||o.pgMajor!==17||
   !['stores','owners','threads','messages','tasks'].every(k=>o[k]===1))fail('F6U03R_LEGACY_DATA_NOT_PRESERVED:'+name);
  return o;
 };
 const a=parse(before,'before'),b=parse(afterRollback,'after_rollback'),c=parse(after,'after');
 for(const x of [a,b])if(x.participantTable!==false||x.modernHelper!==false||x.modernPolicy!==false||x.authSelect!==false)fail('F6U03R_ROLLBACK_SCHEMA_DRIFT');
 if(c.participantTable!==true||c.modernHelper!==true||c.modernPolicy!==true||c.authSelect!==true)fail('F6U03R_MODERN_POLICY_NOT_INSTALLED');
 return {decision:'LOCAL_PG17_OCCUPIED_SOURCE_UPGRADE_ROLLBACK_VERIFIED',sourceCount:78,
  historicalTenantCustomerMessageTaskPreserved:true,participantBackfillVerified:true,rollbackVerified:true,
  hostedTouched:false,providerJwtProven:false,managedApiProven:false,releaseAuthorized:false};
}
function cli(){
 const [mode,target]=process.argv.slice(2);
 if(process.argv.length!==4||resolve(target||'')!==resolve(OUT))fail('F6U03R_LOCAL_ONLY');
 mkdirSync(resolve(OUT),{recursive:true});
 if(mode==='--emit'){
  const all=compile();
  for(const key of ['bootstrap','legacy','seed','rollback','upgrade','before','afterRollback','after'])
   writeFileSync(join(resolve(OUT),key==='afterRollback'?'after-rollback.sql':key+'.sql'),all[key]);
  writeFileSync(join(resolve(OUT),'manifest.json'),JSON.stringify(all.manifest,null,2)+'\n');return;
 }
 if(mode==='--assess'){
  const log=x=>readFileSync(join(resolve(OUT),x+'.log'),'utf8');
  const manifest=JSON.parse(readFileSync(join(resolve(OUT),'manifest.json'),'utf8'));
  const result=assess({before:log('before'),afterRollback:log('after-rollback'),after:log('after'),manifest});
  writeFileSync(join(resolve(OUT),'proof.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));return;
 }
 fail('F6U03R_EXECUTION_FORBIDDEN');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{cli()}catch(e){console.error(e.message);process.exitCode=1}}
