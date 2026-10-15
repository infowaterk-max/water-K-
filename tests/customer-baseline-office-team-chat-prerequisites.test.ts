import {describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
// @ts-ignore Canonical runtime ESM script intentionally has no TS type declaration.
import {evaluateOfficeBaselineLineage,OFFICE_BASELINE_MINIMUM_SOURCES,OFFICE_BASELINE_SUPERSEDED_SOURCES} from '../scripts/shoperation-office-baseline-lineage.mjs';

const root='supabase/customer-baseline/migrations/';
const names=[
 '20260909204503_digital_office_team_chat_2_foundation_v1.sql',
 '20260909204524_digital_office_team_chat_2_integrity_v1.sql',
 '20260909204547_digital_office_team_chat_owner_transfer_v1.sql',
] as const;
const files=names.map((name,i)=>root+String(i+52).padStart(4,'0')+'_'+name.slice(15));
const canonical=names.map(name=>readFileSync('supabase/migrations/'+name,'utf8'));
const applied=files.map(path=>readFileSync(path,'utf8'));

describe('Core #1186 U10A2-F4: Team Chat 2 source integrity 0052-0054',()=>{
 it('preserves all three canonical source SQL bodies and independently computed SHA-256 provenance',()=>{
  names.forEach((name,i)=>{
   const sha=createHash('sha256').update(canonical[i],'utf8').digest('hex');
   const header='-- Shoperation-Office-Source: '+name+' sha256='+sha+'\n';
   expect(applied[i].startsWith(header)).toBe(true);
   expect(applied[i].slice(header.length)).toBe(canonical[i]);
   expect(OFFICE_BASELINE_MINIMUM_SOURCES).toContain(name);
  });
  expect(OFFICE_BASELINE_SUPERSEDED_SOURCES).toHaveLength(2);
  names.forEach(name=>expect(OFFICE_BASELINE_SUPERSEDED_SOURCES.some((s:{source:string})=>s.source===name)).toBe(false));
 });
 it('keeps immutable 0047-0051 and appends exactly 0052-0054 as customer baseline files 53-55',()=>{
  const filesInBaseline=readdirSync(root).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort();
  expect(filesInBaseline).toHaveLength(55);
  expect(filesInBaseline[47]).toBe('0047_team_permissions_foundation_v1.sql');
  expect(filesInBaseline[51]).toBe('0051_digital_office_rls_helper_exposure_closure_v1.sql');
  expect(filesInBaseline.slice(-3)).toEqual(files.map(path=>path.slice(root.length)));
 });
 it('preserves owner/member constraints, service-role-only mention and object tables and the RPC authorization',()=>{
  expect(canonical[0]).toContain("check (participant_role in ('owner','member'))");
  expect(canonical[0]).toContain('office_thread_participants_active_owner_uidx');
  expect(canonical[0]).toContain('create table if not exists public.office_message_mentions');
  expect(canonical[0]).toContain('create table if not exists public.office_message_object_links');
  for(const table of ['office_message_mentions','office_message_object_links']){
   expect(canonical[0]).toContain('alter table public.'+table+' enable row level security');
   expect(canonical[0]).toContain('revoke all on table public.'+table+' from public,anon,authenticated');
   expect(canonical[0]).toContain('grant select,insert,update,delete on table public.'+table+' to service_role');
  }
  expect(canonical[0]).toContain('create or replace function public.admin_mutate_office_team_chat_v2(');
  expect(canonical[0]).toContain('revoke all on function public.admin_mutate_office_team_chat_v2(uuid,uuid,text,jsonb) from public,anon,authenticated');
  expect(canonical[0]).toContain('grant execute on function public.admin_mutate_office_team_chat_v2(uuid,uuid,text,jsonb) to service_role');
 });
 it('keeps mention/object integrity triggers enforcing service-role table-boundary checks',()=>{
  expect(canonical[1]).toContain('create or replace function private.enforce_office_message_mention_integrity_v1()');
  expect(canonical[1]).toContain('create or replace function private.enforce_office_message_object_integrity_v1()');
  expect(canonical[1]).toContain('create trigger office_message_mentions_integrity');
  expect(canonical[1]).toContain('create trigger office_message_object_links_integrity');
  expect(canonical[1]).toContain('OFFICE_MENTION_PARTICIPANT_REQUIRED');
  expect(canonical[1]).toContain('OFFICE_OBJECT_LINK_NOT_FOUND');
  expect(canonical[1]).toContain('private.office_chat_object_exists_v1(new.instance_id,new.object_type,new.object_id)');
 });
 it('never permits unauthenticated, other-owner or arbitrary browser owner-transfer calls',()=>{
  expect(canonical[2]).toContain('create or replace function public.admin_transfer_office_thread_owner_v1(');
  expect(canonical[2]).toContain('private.office_active_thread_owner_v1(p_instance_id,p_thread_id,p_actor)');
  expect(canonical[2]).toContain('OFFICE_OWNER_TRANSFER_TARGET_MEMBER_REQUIRED');
  expect(canonical[2]).toContain('OFFICE_OWNER_TRANSFER_FINAL_EVIDENCE_MISSING');
  expect(canonical[2]).toContain('revoke all on function public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated');
  expect(canonical[2]).toContain('grant execute on function public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid) to service_role');
  expect(canonical[2]).not.toContain('grant execute on function public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid) to authenticated');
 });
 it('remains BLOCKED with exactly four missing Office sources and no hosted Fresh Install proof',()=>{
  const state=evaluateOfficeBaselineLineage();
  expect(state.requiredSourceCount).toBe(11);
  expect(state.matchedSourceCount).toBe(7);
  expect(state.findings.filter((f:{code:string})=>f.code==='OFFICE_BASELINE_SOURCE_MISSING')).toHaveLength(4);
  expect(state.sourceLineageStatus).toBe('BLOCKED');
  expect(state.releaseReady).toBe(false);
  expect(state.realDatabaseProof).toBe('NOT_EVALUATED');
  const manifest=JSON.parse(readFileSync('supabase/customer-baseline/manifest.json','utf8'));
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('0052-0054');
 });
 it('blocks missing 0053 integrity or missing 0054 owner transfer and forged final source',()=>{
  const tmp=mkdtempSync(join(tmpdir(),'team-chat-f4-'));
  try{
   const dst=join(tmp,'supabase/customer-baseline/migrations'),src=join(tmp,'supabase/migrations');
   mkdirSync(dst,{recursive:true});mkdirSync(src,{recursive:true});
   names.forEach((name,i)=>{
    writeFileSync(join(src,name),canonical[i]);
    if(i===0){
     const hash=createHash('sha256').update(canonical[i]).digest('hex');
     writeFileSync(join(dst,files[i].slice(root.length)),'-- Shoperation-Office-Source: '+name+' sha256='+hash+'\n'+canonical[i]);
    }
   });
   const incomplete=evaluateOfficeBaselineLineage({root:tmp,requiredSources:[...names]});
   expect(incomplete.decision).toBe('BLOCK');
   expect(incomplete.findings).toContainEqual(expect.objectContaining({code:'OFFICE_BASELINE_SOURCE_MISSING',source:names[1]}));
   expect(incomplete.findings).toContainEqual(expect.objectContaining({code:'OFFICE_BASELINE_SOURCE_MISSING',source:names[2]}));
   for(let i=1;i<3;i++){
    const hash=createHash('sha256').update(canonical[i]).digest('hex');
    const body=i===2?'select true;\n':canonical[i];
    writeFileSync(join(dst,files[i].slice(root.length)),'-- Shoperation-Office-Source: '+names[i]+' sha256='+hash+'\n'+body);
   }
   const forged=evaluateOfficeBaselineLineage({root:tmp,requiredSources:[...names]});
   expect(forged.decision).toBe('BLOCK');
   expect(forged.findings).toContainEqual(expect.objectContaining({code:'OFFICE_SOURCE_BODY_DRIFT',source:names[2]}));
  }finally{rmSync(tmp,{recursive:true,force:true})}
 });
});
