import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateFixture,PROJECT_REF} from './shoperation-f6-u03u-provider-http-proof.mjs';

export const CONTRACT='shoporation.f6-u03v.fixture-state-readonly.v1';
export const OUT='artifacts/f6-u03v/fixture-state';
export const HOSTED_MUTATION_AUTHORIZED=false;
const fail=code=>{throw Error('F6U03V_'+code)};
const counts=['authUsers','alapStore','proStore','alapCustomerThread','alapInternalThread',
 'proCustomerThread','proInternalThread','alapActiveOwner','proActiveOwner',
 'revokedFormerRole','revokedActiveRoles','alapCustomerParticipant',
 'proCustomerParticipant','proInternalParticipant','alapCustomerEntitlement','proAdvancedEntitlement'];
const exact=(obj,fields)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join(',')===fields.slice().sort().join(',');
const sha=value=>createHash('sha256').update(value).digest('hex');
const q=x=>"'"+String(x).replaceAll("'","''")+"'";

export function fixtureBinding(fixture){
 validateFixture(fixture);
 return sha(JSON.stringify(fixture));
}
export function buildReadOnlyPrerequisiteSql(){
 return [
 'SELECT jsonb_build_object(',
 " 'contract','shoporation.f6-u03v.fixture-prerequisites.v1',",
 " 'capturedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'),",
 " 'database',current_database(),'role',current_user,",
 " 'pgVersion',current_setting('server_version_num')::int,",
 " 'participantsPresent',to_regclass('public.office_thread_participants') IS NOT NULL,",
 " 'authUsers',(SELECT count(*) FROM auth.users),",
 " 'migrationRows',(SELECT count(*) FROM supabase_migrations.schema_migrations),",
 " 'officeTableRls',(SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.office_threads')),",
 " 'participantsTableRls',(SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.office_thread_participants'))",
 ') AS f6_u03v_readonly;'
 ].join('\n')+'\n';
}
export function assessPrerequisites({projectRef,source,observation,now=Date.now()}={}){
 if(projectRef!==PROJECT_REF||source!=='connected-supabase-readonly')fail('WRONG_PROJECT_OR_OBSERVATION_SOURCE');
 if(!exact(observation,['contract','capturedAt','database','role','pgVersion','participantsPresent',
  'authUsers','migrationRows','officeTableRls','participantsTableRls']))fail('INVALID_PREFLIGHT_SHAPE');
 if(observation.contract!=='shoporation.f6-u03v.fixture-prerequisites.v1'||
  observation.database!=='postgres'||observation.role!=='postgres'||
  !Number.isInteger(observation.pgVersion)||Math.floor(observation.pgVersion/10000)!==17)
  fail('WRONG_POSTGRES_IDENTITY');
 const age=Date.parse(observation.capturedAt);
 if(!Number.isFinite(age)||now-age>900000||age-now>30000)fail('STALE_OBSERVATION');
 if(!Number.isSafeInteger(observation.authUsers)||observation.authUsers<0||
  !Number.isSafeInteger(observation.migrationRows)||observation.migrationRows<0||
  typeof observation.participantsPresent!=='boolean'||
  typeof observation.officeTableRls!=='boolean'||
  (observation.participantsTableRls!==null&&typeof observation.participantsTableRls!=='boolean'))
  fail('MALFORMED_PREFLIGHT');
 const blockers=[];
 if(!observation.participantsPresent)blockers.push('MODERN_OFFICE_PARTICIPANTS_MISSING');
 if(observation.authUsers<3)blockers.push('THREE_REAL_AUTH_USERS_MISSING');
 if(observation.officeTableRls!==true||observation.participantsTableRls!==true)
  blockers.push('OFFICE_RLS_NOT_ENABLED_OR_SCHEMA_MISSING');
 if(observation.migrationRows===0)blockers.push('MANAGED_MIGRATION_LEDGER_EMPTY');
 blockers.push('SIGNED_PROVIDER_JWT_POSTGREST_NOT_PROVEN');
 blockers.push('OWNER_BACKUP_KEY_CUSTODY_AND_FULL_RECOVERY_UNPROVEN');
 return Object.freeze({contract:CONTRACT,projectRef,
  decision:'BLOCKED_PENDING_INDEPENDENT_FIXTURE_AND_PROVIDER_PROOF',
  participantsPresent:observation.participantsPresent,authUserCount:observation.authUsers,
  migrationRows:observation.migrationRows,blockers,
  canExecuteFixtureSql:observation.participantsPresent&&observation.authUsers>=3&&
    observation.officeTableRls===true&&observation.participantsTableRls===true,
  hostedTouched:false,signedProviderJwtProven:false,releaseAuthorized:false});
}
export function buildReadOnlyFixtureSql(fixture){
 validateFixture(fixture);
 const a=fixture.alap,b=fixture.pro,x=fixture.revoked;
 const valid="revoked_at IS NULL AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>now())";
 const entitlement="enabled=true AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>now())";
 const clause=(table,pred)=>"(SELECT count(*) FROM "+table+" WHERE "+pred+")";
 const t=(id,store)=>clause('public.office_threads',"id="+q(id)+"::uuid AND instance_id="+q(store)+"::uuid");
 const member=(id,store,user)=>clause('public.office_thread_participants',"thread_id="+q(id)+"::uuid AND instance_id="+q(store)+"::uuid AND user_id="+q(user)+"::uuid AND left_at IS NULL");
 const role=(user,store)=>clause('public.role_bindings',"user_id="+q(user)+"::uuid AND instance_id="+q(store)+"::uuid AND role_code='owner' AND "+valid);
 const entitlementFor=(store,code)=>clause('public.feature_entitlements',"instance_id="+q(store)+"::uuid AND feature_code="+q(code)+" AND "+entitlement);
 const values={
  authUsers:clause('auth.users',"id IN ("+[a.userId,b.userId,x.userId].map(id=>q(id)+"::uuid").join(',')+")"),
  alapStore:clause('public.webshop_instances',"id="+q(a.storeId)+"::uuid AND subscription_plan='alap' AND status='active'"),
  proStore:clause('public.webshop_instances',"id="+q(b.storeId)+"::uuid AND subscription_plan='pro' AND status='active'"),
  alapCustomerThread:t(a.customerThreadId,a.storeId),
  alapInternalThread:t(a.internalThreadId,a.storeId),
  proCustomerThread:t(b.customerThreadId,b.storeId),
  proInternalThread:t(b.internalThreadId,b.storeId),
  alapActiveOwner:role(a.userId,a.storeId),
  proActiveOwner:role(b.userId,b.storeId),
  revokedFormerRole:clause('public.role_bindings',"user_id="+q(x.userId)+"::uuid AND instance_id="+q(b.storeId)+"::uuid AND revoked_at IS NOT NULL AND revoked_at<=now()"),
  revokedActiveRoles:clause('public.role_bindings',"user_id="+q(x.userId)+"::uuid AND "+valid),
  alapCustomerParticipant:member(a.customerThreadId,a.storeId,a.userId),
  proCustomerParticipant:member(b.customerThreadId,b.storeId,b.userId),
  proInternalParticipant:member(b.internalThreadId,b.storeId,b.userId),
  alapCustomerEntitlement:entitlementFor(a.storeId,'officeCommunication'),
  proAdvancedEntitlement:entitlementFor(b.storeId,'officeCommunicationAdvanced')
 };
 if(Object.keys(values).sort().join(',')!==counts.slice().sort().join(','))fail('SQL_OBSERVATION_COVERAGE_DRIFT');
 return [
 '-- F6-U03v: read-only fixture state probe. Run only if 0048 prerequisites pass.',
 '-- Contains test UUIDs. Never commit real fixture SQL or evidence.',
 'SELECT jsonb_build_object(',
 " 'contract',"+q(CONTRACT)+",",
 " 'capturedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'),",
 " 'database',current_database(),'role',current_user,",
 " 'pgVersion',current_setting('server_version_num')::int,",
 " 'fixtureSha256',"+q(fixtureBinding(fixture))+",",
 ...Object.entries(values).map(([name,value],i)=>" '"+name+"',"+value+(i===counts.length-1?'':',')),
 ') AS f6_u03v_fixture_readonly;'
 ].join('\n')+'\n';
}
export function assessFixtureObservation({projectRef,source,fixture,observation,now=Date.now()}={}){
 if(projectRef!==PROJECT_REF||source!=='connected-supabase-readonly')
  fail('WRONG_PROJECT_OR_UNATTESTED_OBSERVATION');
 validateFixture(fixture);
 const all=['contract','capturedAt','database','role','pgVersion','fixtureSha256',...counts];
 if(!exact(observation,all))fail('INVALID_FIXTURE_OBSERVATION');
 if(observation.contract!==CONTRACT||observation.database!=='postgres'||
  observation.role!=='postgres'||!Number.isInteger(observation.pgVersion)||
  Math.floor(observation.pgVersion/10000)!==17)fail('WRONG_POSTGRES_IDENTITY');
 if(observation.fixtureSha256!==fixtureBinding(fixture))fail('FIXTURE_SHA_MISMATCH');
 const seen=Date.parse(observation.capturedAt);
 if(!Number.isFinite(seen)||seen>now+30000||now-seen>900000)fail('STALE_OBSERVATION');
 if(counts.some(k=>!Number.isSafeInteger(observation[k])||observation[k]<0))
  fail('INVALID_OBSERVED_COUNT');
 const expected=Object.fromEntries(counts.map(k=>[k,k==='authUsers'?3:k==='revokedActiveRoles'?0:1]));
 const faults=counts.filter(k=>observation[k]!==expected[k]).map(k=>'FIXTURE_STATE_MISMATCH_'+k.toUpperCase());
 const clean=faults.length===0;
 return Object.freeze({
  contract:CONTRACT,projectRef,scope:'BOUND_CALLER_SUPPLIED_READONLY_DB_COUNTS',
  decision:clean?'FIXTURE_ROW_STATE_MATCHES_BOUND_SNAPSHOT_NOT_PROVIDER_PROOF':'BLOCKED_FIXTURE_ROW_STATE_MISMATCH',
  fixtureSha256:observation.fixtureSha256,checkedCountFields:counts.length,
  observedAt:observation.capturedAt,faults,
  sourceBinding:'CALLER_SUPPLIED_NOT_CRYPTOGRAPHICALLY_ATTESTED',
  fixtureRowsObservedClean:clean,roleRevocationObservedClean:clean,
  independentProviderFixtureProven:false,signedProviderJwtProven:false,
  postgrestRlsProven:false,legacyMigrationProvenanceReconciled:false,
  hostedTouched:false,releaseAuthorized:false
 });
}
function cli(){
 const args=process.argv.slice(2);
 if(args.length===1&&args[0]==='--preflight'){
  console.log(JSON.stringify({contract:CONTRACT,decision:'BLOCKED_HOSTED_0048_AUTH_FIXTURES_NOT_YET_PRESENT',
   hostedTouched:false,releaseAuthorized:false}));return;
 }
 if(args.length===2&&args[0]==='--emit-prerequisites'&&resolve(args[1])===resolve(OUT)){
  mkdirSync(resolve(OUT),{recursive:true});
  writeFileSync(join(resolve(OUT),'prerequisites-readonly.sql'),buildReadOnlyPrerequisiteSql());
  console.log(JSON.stringify({contract:CONTRACT,decision:'PREREQUISITE_SELECT_EMITTED_NO_HOSTED_SQL',
   hostedTouched:false,releaseAuthorized:false}));return;
 }
 if(args.length===3&&args[0]==='--emit-fixture'&&resolve(args[2])===resolve(OUT)){
  if(!args[1]||args[1].startsWith('artifacts/')||args[1].startsWith('tests/'))
    fail('EXTERNAL_FIXTURE_FILE_REQUIRED');
  const fixture=JSON.parse(readFileSync(resolve(args[1]),'utf8'));
  mkdirSync(resolve(OUT),{recursive:true});
  writeFileSync(join(resolve(OUT),'fixture-readonly.sql'),buildReadOnlyFixtureSql(fixture),{mode:0o600});
  console.log(JSON.stringify({contract:CONTRACT,decision:'OWNER_FIXTURE_SELECT_EMITTED_OFFLINE_NO_HOSTED_SQL',
   hostedTouched:false,releaseAuthorized:false}));return;
 }
 fail('UNAPPROVED_CLI_OR_HOSTED_EXECUTION_FORBIDDEN');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(/^F6U03V_/.test(e.message)?e.message:'F6U03V_FAILURE');
  process.exitCode=1;}
}
