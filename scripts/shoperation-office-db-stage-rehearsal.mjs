import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {evaluateOfficeDbReadiness,OFFICE_TABLES} from './shoperation-office-db-readiness.mjs';

export const OFFICE_STAGING_PROJECT_ID='rfuvzgumbardvbvqjxdq';
export const REQUIRED_OFFICE_ROLE_PROOFS=Object.freeze([
  'anon_select_denied','alap_office_select_denied','pro_participant_select_allowed',
  'pro_nonparticipant_select_denied','cross_tenant_select_denied',
  'post_downgrade_office_select_denied','expired_entitlement_denied',
  'actor_rpc_spoof_denied','service_rpc_enforced','alap_support_unchanged',
]);

// Run through the connected Supabase read-only SQL interface, NOT a service key.
// No tenant identities, message bodies or customer addresses are selected.
export const OFFICE_STAGE_EXPOSURE_READONLY_SQL=String.raw`select jsonb_build_object(
  'contract','shoporation.office-stage-exposure-snapshot.v1',
  'capturedAt',now(),
  'tableAccess',(
    select coalesce(jsonb_agg(jsonb_build_object(
      'table',t.n,
      'authenticatedSelect',has_table_privilege('authenticated',format('public.%I',t.n),'SELECT'),
      'authenticatedInsert',has_table_privilege('authenticated',format('public.%I',t.n),'INSERT'),
      'serviceSelect',has_table_privilege('service_role',format('public.%I',t.n),'SELECT')
    )),'[]'::jsonb)
    from (values ('office_threads'),('office_messages'),('office_tasks')) t(n)
  ),
  'dependencies',jsonb_build_object(
    'evaluateStoreCapabilityPresent',to_regprocedure('public.evaluate_store_capability_v1(uuid,uuid,text,uuid,uuid,text,text)') is not null,
    'privateCurrentUserReaderPresent',to_regprocedure('private.current_user_can_read_office_thread_v1(uuid,uuid)') is not null,
    'participantTablePresent',to_regclass('public.office_thread_participants') is not null,
    'normalizedPlanSyncPresent',to_regprocedure('private.sync_webshop_plan_entitlements(uuid)') is not null,
    'normalizedGrantTablePresent',to_regclass('public.plan_capability_grants') is not null
  ),
  'rowCounts',jsonb_build_object(
    'office_threads',(select count(*) from public.office_threads),
    'office_messages',(select count(*) from public.office_messages),
    'office_tasks',(select count(*) from public.office_tasks)
  )
) as office_stage_exposure;`;

const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const isPositiveInteger=v=>Number.isSafeInteger(v)&&v>=0;
const normalizeTime=(v,now,maxHours)=>{
  const t=Date.parse(String(v??''));
  return Number.isFinite(t)&&t<=now.getTime()&&now.getTime()-t<=maxHours*3600000;
};
const finding=(code,details={})=>({code,...details});

/** Metadata and requested role-proof plan only. NEVER performs DDL, remote I/O or authorization. */
export function evaluateOfficeDbStagingRehearsal(
  {snapshot,exposure,projectId,sourceSha,roleProofs=[]}={},
  {now=new Date(),maxAgeHours=24}={}
){
  const findings=[];
  const block=(code,details)=>findings.push(finding(code,details));
  if(projectId!==OFFICE_STAGING_PROJECT_ID)block('OFFICE_STAGE_TARGET_MISMATCH');
  if(typeof sourceSha!=='string'||!/^[a-f0-9]{40}$/i.test(sourceSha))block('OFFICE_STAGE_SOURCE_IDENTITY_MISSING');
  const readiness=evaluateOfficeDbReadiness(snapshot,{now,maxAgeHours});
  if(readiness.decision!=='REVIEW')block('OFFICE_STAGE_BASELINE_NOT_READY',{codes:readiness.findings.map(x=>x.code)});
  if(!record(exposure)||exposure.contract!=='shoporation.office-stage-exposure-snapshot.v1')
    block('OFFICE_STAGE_EXPOSURE_CONTRACT_INVALID');
  if(!normalizeTime(exposure?.capturedAt,now,maxAgeHours))
    block('OFFICE_STAGE_EXPOSURE_STALE_OR_INVALID');
  const tableAccess=Array.isArray(exposure?.tableAccess)?exposure.tableAccess:[];
  if(tableAccess.length!==OFFICE_TABLES.length||new Set(tableAccess.map(x=>x?.table)).size!==OFFICE_TABLES.length)
    block('OFFICE_STAGE_TABLE_ACCESS_INCOMPLETE');
  for(const table of OFFICE_TABLES){
    const row=tableAccess.find(x=>x?.table===table);
    if(!row||row.authenticatedSelect!==true||row.serviceSelect!==true)
      block('OFFICE_STAGE_READ_GRANT_MISSING',{table});
    if(!row||row.authenticatedInsert!==false)
      block('OFFICE_STAGE_BROWSER_WRITE_NOT_REVOKED',{table});
  }
  const deps=record(exposure?.dependencies)?exposure.dependencies:{};
  if(deps.evaluateStoreCapabilityPresent!==true)
    block('OFFICE_STAGE_CAPABILITY_FUNCTION_MISSING');
  if(deps.privateCurrentUserReaderPresent!==true||deps.participantTablePresent!==true)
    block('OFFICE_STAGE_PRIVATE_READ_DEPENDENCY_MISSING');
  if(deps.normalizedPlanSyncPresent!==true||deps.normalizedGrantTablePresent!==true)
    block('OFFICE_STAGE_BLOCK11_AUTHORITY_MISSING');
  const rowCounts=record(exposure?.rowCounts)?exposure.rowCounts:{};
  for(const table of OFFICE_TABLES){
    if(!isPositiveInteger(rowCounts[table]))block('OFFICE_STAGE_ROW_COUNT_UNKNOWN',{table});
  }
  // Role evidence has to be collected in a separate disposable actor/tenant test context.
  // Passing metadata or an empty Office table must NEVER substitute for those tests.
  const proofs=Array.isArray(roleProofs)?roleProofs:[];
  for(const code of REQUIRED_OFFICE_ROLE_PROOFS){
    if(!proofs.some(p=>p?.id===code&&p?.status==='PASS'
      &&p?.projectId===projectId&&p?.sourceSha===sourceSha))
      block('OFFICE_STAGE_ROLE_BEHAVIOR_UNVERIFIED',{caseId:code});
  }
  const stages=[
    {id:'S1',task:'Freeze exact target, source, schema catalog and ledger identifiers',requires:['project-id','source-sha','ledger-hash']},
    {id:'S2',task:'Verify backup/snapshot restore capability and rollback runbook',requires:['backup-proof','restore-proof']},
    {id:'S3',task:'Synthesize missing capability, participant, ACL and private current-user dependencies',requires:['dependency-contract','Block11-preservation']},
    {id:'S4',task:'Review a newly generated compatible SQL migration in a disposable DB clone',requires:['sql-review','atomic-rollback']},
    {id:'S5',task:'Run authenticated Alap/Pro, tenant, membership, downgrade and actor-RPC allow/deny matrix',requires:[...REQUIRED_OFFICE_ROLE_PROOFS]},
    {id:'S6',task:'Apply an independently approved change only to staging, then recapture RLS/ACL/entitlement lineage',requires:['change-approval','staging-proof']},
  ];
  return{
    contract:'shoporation.office-db-staging-rehearsal.v1',
    target:'staging',
    projectId:projectId??null,
    sourceSha:sourceSha??null,
    decision:findings.length?'BLOCK':'REVIEW',
    claim:findings.length?'STAGING_REMEDIATION_NOT_READY':'ROLE_MATRIX_METADATA_CANDIDATE_ONLY',
    authoritative:false,
    ddlApplied:false,
    currentRoleProofsVerified:false,
    forbiddenMigrationReplay:['20260909204825_team_chat_plan_split_v1','20260910061815_customer_email_plan_split_v1'],
    findings,stages,
    nextAction:'Generate a Block11-compatible SQL migration only after disposable role/tenant rehearsal; never replay historical fixed-plan sync.',
  };
}
async function main(args){
  if(args.includes('--sql')){console.log(OFFICE_STAGE_EXPOSURE_READONLY_SQL);return;}
  const arg=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:null};
  try{
    const catalogPath=arg('--snapshot'),exposurePath=arg('--exposure');
    const snapshot=catalogPath?JSON.parse(readFileSync(catalogPath,'utf8')):null;
    const exposure=exposurePath?JSON.parse(readFileSync(exposurePath,'utf8')):null;
    const r=evaluateOfficeDbStagingRehearsal({
      snapshot,exposure,projectId:arg('--project-id'),sourceSha:arg('--source-sha'),
    });
    console.log(JSON.stringify(r,null,2));
    if(r.decision!=='REVIEW')process.exitCode=1;
  }catch(e){
    console.error(JSON.stringify({contract:'shoporation.office-db-staging-rehearsal.v1',decision:'BLOCK',
      findings:[{code:'OFFICE_STAGE_REHEARSAL_INPUT_INVALID',message:String(e?.message??e)}]}));
    process.exitCode=2;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void main(process.argv.slice(2));
