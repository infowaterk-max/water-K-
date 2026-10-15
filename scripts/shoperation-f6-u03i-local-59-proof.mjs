import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateReviewedBaseline,REVIEWED_SOURCE_COMMIT} from './shoperation-disposable-fresh-replay.mjs';
import {compileAtomicReview} from './shoperation-fresh-disposable-reprovision.mjs';
import {fixtureBootstrapSql} from './shoperation-f6-u03g-positive-fixture.mjs';

export const SCOPE='ISOLATED_DOCKER_PG17_FRESH_59_FILES_ONLY';
export const HOSTED_EXECUTION_ENABLED=false;
export const LOCAL_DATABASES=Object.freeze({commit:'f6_u03i_fresh',rollback:'f6_u03i_abort'});
const fail=code=>{throw new Error(code);};
const hash=text=>createHash('sha256').update(text).digest('hex');
const COMPANIONS=[
 'supabase/customer-baseline/target-preflight.sql',
 'supabase/customer-baseline/auth-bootstrap.sql',
 'supabase/customer-baseline/seed.sql',
 'supabase/customer-baseline/target-postflight.sql'
];
const SAFE_OUTPUT='artifacts/f6-u03i/local-59';

export function boundLocalFixtureBootstrap(localDatabase){
 if(!Object.values(LOCAL_DATABASES).includes(localDatabase))fail('F6U03I_UNAPPROVED_FIXTURE_DB');
 const original=fixtureBootstrapSql();
 const pinned="'f6_u03g_fixture'";
 if(original.split(pinned).length!==2||!original.includes('F6U03G_WRONG_POSTGRES'))
  fail('F6U03I_ORIGINAL_LOCAL_FIXTURE_GUARD_DRIFT');
 return original.replace(pinned,"'"+localDatabase+"'");
}


export function composeLocalFresh59({root=process.cwd(),mode}={}){
 if(!Object.hasOwn(LOCAL_DATABASES,mode))fail('F6U03I_LOCAL_MODE_INVALID');
 const source=validateReviewedBaseline(root);
 const reviewed=compileAtomicReview(root);
 if(source.decision!=='REVIEW'||source.migrationCount!==59||
    reviewed.migrationCount!==59||reviewed.decision!=='REVIEW_ONLY'||
    reviewed.executionEnabled!==false||reviewed.hostedDatabaseTouched!==false)
  fail('F6U03I_ORIGINAL_SOURCE_OR_GUARD_DRIFT');
 const abort=reviewed.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
 const drop=reviewed.sql.indexOf('DROP SCHEMA private CASCADE;');
 if(abort<0||drop<=abort||!reviewed.mustAbortBeforeDestructiveSql)
  fail('F6U03I_HOSTED_GUARD_ABORT_MISSING');
 if(source.migrationFiles.length!==59||source.migrationFiles[0].includes('0001_')!==true||
    !source.migrationFiles.at(-1).endsWith('0058_digital_office_plan_scoped_sql_guard_v2.sql'))
  fail('F6U03I_CANONICAL_59_FILE_SET_DRIFT');
 const read=path=>readFileSync(resolve(root,path),'utf8');
 const localDb=LOCAL_DATABASES[mode];
 const preflight=read(COMPANIONS[0]),auth=read(COMPANIONS[1]),
       seed=read(COMPANIONS[2]),postflight=read(COMPANIONS[3]);
 const targetGuard="DO $f6_local$ BEGIN IF current_database()<>'"+localDb+
  "' OR current_user<>'postgres' OR current_setting('server_version_num')::integer/10000<>17 OR to_regclass('auth.users') IS NULL THEN RAISE EXCEPTION 'F6U03I_LOCAL_PG17_PEER_REQUIRED'; END IF; END $f6_local$;";
 const statements=[
  'BEGIN;', "SET LOCAL lock_timeout = '3s';",
  "SET LOCAL statement_timeout = '5min';",targetGuard,
  '-- ORIGINAL TARGET PREFLIGHT',
  preflight,
  ...source.migrationFiles.map(path=>'-- F6U03I_ORIGINAL_SOURCE '+path+'\n'+read(path)),
  '-- ORIGINAL AUTH BOOTSTRAP',auth,
  '-- ORIGINAL NEUTRAL SEED',seed,
  '-- ORIGINAL TARGET POSTFLIGHT',postflight
 ];
 if(mode==='rollback'){
  statements.push("DO $f6_rollback$ BEGIN RAISE EXCEPTION 'F6U03I_INJECTED_ABORT_BEFORE_COMMIT'; END $f6_rollback$;");
 }
 statements.push('COMMIT;');
 const sql=statements.join('\n\n')+'\n';
 if((sql.match(/^BEGIN;$/gm)||[]).length!==1||(sql.match(/^COMMIT;$/gm)||[]).length!==1||
    sql.indexOf('ORIGINAL TARGET PREFLIGHT')>sql.indexOf('F6U03I_ORIGINAL_SOURCE')||
    sql.indexOf('ORIGINAL TARGET POSTFLIGHT')<sql.indexOf('0058_digital_office_plan_scoped_sql_guard_v2.sql')||
    (mode==='rollback'&&sql.indexOf('F6U03I_INJECTED_ABORT_BEFORE_COMMIT')>sql.lastIndexOf('COMMIT;')))
  fail('F6U03I_ATOMIC_SQL_ORDER_OR_ROLLBACK_DRIFT');
 const manifest=Object.freeze({
  contract:'shoporation.f6-u03i.local-59-sql-source.v1',scope:SCOPE,mode,
  sourceCount:59,reviewedSourceCommit:REVIEWED_SOURCE_COMMIT,
  sourceSetSha256:source.sourceSetSha256,
  localDatabase:localDb,sqlSha256:hash(sql),
  sqlStatementsAreUnchanged:true,allFilesInsideOneTransaction:true,
  originalPreflightIncluded:true,originalPostflightIncluded:true,
  forcedAbortBeforeCommit:mode==='rollback',
  hostedDatabaseTouched:false,hosted59MigrationsApplied:0,
  hostedExecutionEnabled:HOSTED_EXECUTION_ENABLED,
  providerManagedAuthStorageProven:false,signedInAlapProRlsProven:false,
  originalPaths:source.migrationFiles
 });
 return Object.freeze({sql,manifest});
}

export function validateIsolatedObservation({manifest,realPg17,originalSqlCompleted,positivePostflight,appTables,appFunctions,appPolicies,transactionRolledBack}={}){
 if(!manifest||manifest.scope!==SCOPE||manifest.sourceCount!==59||
    manifest.hostedExecutionEnabled!==false||realPg17!==true)
  fail('F6U03I_REAL_59_PROOF_REQUIRED');
 if(manifest.mode==='commit'){
  if(originalSqlCompleted!==true||positivePostflight!==true||
    !Number.isInteger(appTables)||appTables<175||
    !Number.isInteger(appFunctions)||appFunctions<344||
    !Number.isInteger(appPolicies)||appPolicies<126)
   fail('F6U03I_59_MIGRATION_POSTFLIGHT_OR_PERSISTENCE_FAILED');
  return {scope:SCOPE,decision:'LOCAL_POSTFLIGHT_VERIFIED_ONLY',all59Committed:true,
   hostedExecutionAuthorized:false,providerManagedAuthStorageProven:false,signedInAlapProRlsProven:false};
 }
 if(manifest.mode!=='rollback'||originalSqlCompleted!==false||
    transactionRolledBack!==true||appTables!==0||appFunctions!==0||appPolicies!==0)
  fail('F6U03I_INCOMPLETE_ROLLBACK');
 return {scope:SCOPE,decision:'EXPECTED_FAULT_ROLLED_BACK',all59Committed:false,
  hostedExecutionAuthorized:false,providerManagedAuthStorageProven:false,signedInAlapProRlsProven:false};
}

function cli(){
 const [op,path]=process.argv.slice(2),out=resolve(SAFE_OUTPUT);
 if(process.argv.length!==4||op!=='--emit-bundle'||resolve(path||'')!==out)
  fail('F6U03I_NO_HOSTED_OR_UNSCOPED_CLI');
 const good=composeLocalFresh59({mode:'commit'}),bad=composeLocalFresh59({mode:'rollback'});
 mkdirSync(out,{recursive:true});
 writeFileSync(join(out,'bootstrap-fresh.sql'),boundLocalFixtureBootstrap(LOCAL_DATABASES.commit));
 writeFileSync(join(out,'bootstrap-abort.sql'),boundLocalFixtureBootstrap(LOCAL_DATABASES.rollback));
 writeFileSync(join(out,'commit.sql'),good.sql);
 writeFileSync(join(out,'rollback.sql'),bad.sql);
 writeFileSync(join(out,'manifest.json'),JSON.stringify({commit:good.manifest,rollback:bad.manifest},null,2));
 console.log(JSON.stringify({scope:SCOPE,sourceCount:good.manifest.sourceCount,
  commitSha256:good.manifest.sqlSha256,rollbackSha256:bad.manifest.sqlSha256,
  preparedOnly:true,hostedTouched:false}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1}
}
