import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateReviewedBaseline} from './shoperation-disposable-fresh-replay.mjs';
import {compileAtomicReview} from './shoperation-fresh-disposable-reprovision.mjs';

export const SCOPE='SOURCE_ONLY_OFFICE_DAG_CANDIDATES_59_BASELINE_BLOCKED';
export const HOSTED_EXECUTION_ENABLED=false;
export const MAIN_SOURCE_AUTHORITY='dc726ea075d6918883595442d446e37c023731e4';
export const OUTPUT='artifacts/f6-u03j/office-dag';
export const MAIN_OFFICE_SOURCES=Object.freeze([
 '20260908030000_digital_office_real_inbound_foundation_v1.sql',
 '20260908030500_digital_office_mailbox_normalization_v1.sql',
 '20260908031000_digital_office_real_inbound_least_privilege_v1.sql',
 '20260908034000_digital_office_composer_drafts_foundation_v1.sql',
 '20260908034500_digital_office_reply_queue_guard_v1.sql',
 '20260908034600_digital_office_drafts_tenant_integrity_v1.sql',
 '20260909203208_digital_office_draft_revision_guard_v1.sql',
 '20260909203242_digital_office_reply_draft_singleton_v1.sql',
 '20260909203604_digital_office_recipient_envelope_v1.sql',
 '20260909203629_digital_office_attachment_metadata_integrity_v1.sql',
 '20260909204635_digital_office_private_attachments_v1.sql',
 '20260909204653_digital_office_private_attachment_failclosed_v1.sql',
 '20260909204709_digital_office_private_attachment_cleanup_v1.sql',
 '20260909204751_digital_office_attachment_quarantine_scan_v1.sql',
 '20260909204810_digital_office_attachment_scan_cleanup_hardening_v1.sql',
 '20260909204847_digital_office_team_chat_retention_v1.sql',
 '20260909204935_digital_office_block8_fk_indexes_v1.sql',
 '20260910070300_communication_hub_2_0_fk_indexes_v1.sql'
]);
export const MISSING_RELEASE_TABLE_CREATORS=Object.freeze([
 'office_mailboxes','office_thread_email_routes','office_drafts','office_attachments'
]);
const fail=x=>{throw new Error(x)};
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000}).trim();
const blobSha=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
// Conservative anchor matcher, NOT a general SQL parser. Ignoring comments prevents
// a comment such as "-- CREATE TABLE" from satisfying a required DDL provenance edge.
export function staticDdl(sql){
 if(typeof sql!=='string')fail('F6U03J_SQL_TEXT_REQUIRED');
 const uncommented=sql.replace(/\/\*[\s\S]*?\*\//g,'').split('\n').filter(line=>!/^\s*--/.test(line)).join('\n');
 const read=(pattern)=>[...uncommented.matchAll(pattern)].map(x=>x[1].toLowerCase());
 const created=read(/^\s*create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z_0-9]*)\b/gim);
 const altered=read(/^\s*alter\s+table\s+(?:if\s+exists\s+)?public\.([a-z_][a-z_0-9]*)\b/gim);
 const referenced=read(/\b(?:public)\.(office_[a-z_0-9]+)\b/gim);
 return {created:[...new Set(created)].sort(),altered:[...new Set(altered)].sort(),referenced:[...new Set(referenced)].sort()};
}
export function classifyDagEvidence({missing,sourceCount,validMainSources}={}){
 if(sourceCount!==59||validMainSources!==true||!Array.isArray(missing))
  fail('F6U03J_SOURCE_CHAIN_EVIDENCE_MISSING');
 if(!MISSING_RELEASE_TABLE_CREATORS.every(x=>missing.includes(x)))
  fail('F6U03J_UNEXPECTED_BASELINE_CLOSURE_REQUIRES_NEW_REVIEW');
 return Object.freeze({decision:'BLOCKED_59_SOURCE_DAG',
  sourceOnly:true,atomic59Proven:false,originalPostflightPassed:false,
  fullRollbackProven:false,managedProviderProven:false,signedInAlapProRlsProven:false,
  hostedDatabaseTouched:false,hostedResetAuthorized:HOSTED_EXECUTION_ENABLED});
}
export function inspectOfficeGap({root=process.cwd(),sourceRead}={}){
 const verified=validateReviewedBaseline(root);
 const review=compileAtomicReview(root);
 if(verified.migrationCount!==59||review.migrationCount!==59||review.executionEnabled!==false)
  fail('F6U03J_FROZEN_BASELINE_DRIFT');
 const abort=review.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
 if(abort<0||review.sql.indexOf('DROP SCHEMA private CASCADE;')<=abort)
  fail('F6U03J_HOSTED_ABORT_DRIFT');
 try{git(root,['cat-file','-e',MAIN_SOURCE_AUTHORITY+'^{commit}']);}
 catch{fail('F6U03J_SOURCE_MAIN_COMMIT_MISSING')}
 const base=verified.migrationFiles.map(path=>readFileSync(resolve(root,path),'utf8'));
 const baselineCreators=new Set(base.flatMap(sql=>staticDdl(sql).created));
 const missing=MISSING_RELEASE_TABLE_CREATORS.filter(t=>!baselineCreators.has(t));
 const historical=[];
 for(const filename of MAIN_OFFICE_SOURCES){
  const path='supabase/migrations/'+filename;
  const data=readFileSync(resolve(root,path));
  const tree=git(root,['ls-tree',MAIN_SOURCE_AUTHORITY,'--',path]);
  const match=/^100644 blob ([0-9a-f]{40})\b/.exec(tree);
  if(!match||blobSha(data)!==match[1])fail('F6U03J_PINNED_MAIN_SOURCE_DRIFT:'+filename);
  const parsed=staticDdl(sourceRead?.[filename]??data.toString('utf8'));
  historical.push({name:filename,path,blob:match[1],sha256:sha256(data),
   ...parsed});
 }
 const creators=new Map();
 for(let i=0;i<historical.length;i++){
  for(const t of historical[i].created){
   if(creators.has(t))fail('F6U03J_DUPLICATE_UPSTREAM_CREATOR:'+t);
   creators.set(t,i);
  }
 }
 for(const tab of MISSING_RELEASE_TABLE_CREATORS)
  if(!creators.has(tab))fail('F6U03J_MISSING_CANONICAL_CREATOR:'+tab);
 const edges=[];
 for(let i=0;i<historical.length;i++){
  const h=historical[i];
  const depTargets=[...new Set([...h.altered,...h.referenced])];
  for(const table of depTargets){
   const predecessor=creators.get(table);
   if(predecessor===undefined||predecessor===i)continue;
   if(predecessor>i)fail('F6U03J_SOURCE_PREDECESSOR_ORDER_DRIFT:'+table);
   edges.push({predecessor:historical[predecessor].name,dependent:h.name,table});
  }
 }
 const migration0055=verified.migrationFiles.find(f=>f.includes('/0055_communication_hub_2_0_foundation_v1.sql'));
 if(!migration0055)fail('F6U03J_0055_MIGRATION_MISSING');
 const affected=staticDdl(readFileSync(resolve(root,migration0055),'utf8'));
 if(!affected.altered.includes('office_mailboxes'))fail('F6U03J_0055_MAILBOX_DEPENDENCY_CHANGED');
 const status=classifyDagEvidence({missing,sourceCount:verified.migrationCount,validMainSources:historical.length===MAIN_OFFICE_SOURCES.length});
 const report={
  contract:'shoporation.f6-u03j.office-gap.v1',scope:SCOPE,
  authorityMainSha:MAIN_SOURCE_AUTHORITY,approved59SourceSha256:verified.sourceSetSha256,
  reviewedFileCount:verified.migrationCount,
  ...status,missingRequiredTables:missing,
  blockingMigration:migration0055,blockingTable:'public.office_mailboxes',
  canonicalCreators:MISSING_RELEASE_TABLE_CREATORS.map(table=>({
   table,source:historical[creators.get(table)].name,
   sha256:historical[creators.get(table)].sha256
  })),
  candidateSources:historical,orderedTableDependencyEdges:edges,
  scopeLimitations:['STATIC_DDL_NOT_GENERAL_SQL_PARSER','FUNCTION_TRIGGER_DEPENDENCIES_NOT_CLOSED',
   'SUPERSEDED_LEGACY_SQL_NOT_APPROVED_FOR_REPLAY','SQL_GRANTS_JWT_RLS_UNVERIFIED',
   'NO_HOSTED_OR_LOCAL_SQL_EXECUTION']
 };
 return Object.freeze(report);
}
function cli(){
 const [operation,target]=process.argv.slice(2),dir=resolve(OUTPUT);
 if(process.argv.length!==4||operation!=='--emit-json'||resolve(target||'')!==dir)
  fail('F6U03J_NO_SQL_OR_UNSCOPED_EXECUTION');
 const r=inspectOfficeGap();
 mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,'office-source-dag.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify({decision:r.decision,missing:r.missingRequiredTables,
  candidates:r.candidateSources.length,edges:r.orderedTableDependencyEdges.length,
  sourceOnly:true,hostedTouched:false},null,2));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1}
}
