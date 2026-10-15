import {describe,expect,it} from 'vitest';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
// @ts-ignore Intentional ESM JavaScript runtime module without a declaration file.
import {evaluateOfficeBaselineLineage,OFFICE_BASELINE_MINIMUM_SOURCES,OFFICE_BASELINE_SUPERSEDED_SOURCES} from '../scripts/shoperation-office-baseline-lineage.mjs';

const root='supabase/customer-baseline/migrations/';
const names=[
 '20260908022500_digital_office_privacy_foundation_v1.sql',
 '20260908023000_digital_office_privacy_membership_hardening_v1.sql',
 '20260908023500_digital_office_private_author_read_sync_v1.sql',
 '20260908024000_digital_office_rls_helper_exposure_closure_v1.sql',
] as const;
const files=names.map((name,i)=>root+String(i+48).padStart(4,'0')+'_'+name.slice(15));
const canonical=names.map(name=>readFileSync('supabase/migrations/'+name,'utf8'));
const applied=files.map(name=>readFileSync(name,'utf8'));

describe('Core #1186 U10A2-F3: atomic Office privacy source dependency 0048-0051',()=>{
 it('preserves all four exact ordered immutable Office SQL sources with SHA-256 provenance',()=>{
  names.forEach((name,i)=>{
   const sha=createHash('sha256').update(canonical[i],'utf8').digest('hex');
   const header='-- Shoperation-Office-Source: '+name+' sha256='+sha+'\n';
   expect(applied[i].startsWith(header)).toBe(true);
   expect(applied[i].slice(header.length)).toBe(canonical[i]);
   expect(OFFICE_BASELINE_MINIMUM_SOURCES).toContain(name);
  });
  expect(OFFICE_BASELINE_SUPERSEDED_SOURCES).toHaveLength(2);
  expect(names.some(name=>OFFICE_BASELINE_SUPERSEDED_SOURCES.some((s:{source:string})=>s.source===name))).toBe(false);
 });
 it('requires chronological, contiguous 0048-0051 and a 52-file append-only customer baseline',()=>{
  const all=readdirSync(root).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort();
  expect(all).toHaveLength(55);
  expect(all[47]).toBe('0047_team_permissions_foundation_v1.sql');
  expect(all.slice(48,52)).toEqual(files.map(f=>f.slice(root.length)));
 });
 it('preserves participant RLS, eligible assignees, author read-state, browser actor closure',()=>{
  expect(canonical[0]).toContain('create table if not exists public.office_thread_participants');
  expect(canonical[0]).toContain('alter table public.office_thread_participants enable row level security');
  expect(canonical[0]).toContain('revoke all on table public.office_thread_participants from anon,authenticated');
  expect(canonical[0]).toContain('create or replace function public.can_read_office_thread_v1(');
  expect(canonical[0]).toContain('grant execute on function public.can_read_office_thread_v1(uuid,uuid,uuid) to authenticated,service_role');
  expect(canonical[1]).toContain('private.enforce_customer_office_assignee_v1');
  expect(canonical[1]).toContain('office_leave_private_thread_v1');
  expect(canonical[2]).toContain('private.sync_private_office_author_read_v1');
  expect(canonical[2]).toContain('office_messages_private_author_read_sync');
  expect(canonical[3]).toContain('revoke all on function public.can_read_office_thread_v1(uuid,uuid,uuid) from public,anon,authenticated');
  expect(canonical[3]).toContain('grant execute on function public.can_read_office_thread_v1(uuid,uuid,uuid) to service_role');
  expect(canonical[3]).toContain('private.current_user_can_read_office_thread_v1(instance_id,id)');
  expect(canonical[3]).toContain('private.current_user_can_read_office_thread_v1(instance_id,thread_id)');
  expect(canonical[3]).not.toContain('grant execute on function public.can_read_office_thread_v1(uuid,uuid,uuid) to authenticated');
 });
 it('reports four verified source bodies but seven remaining blockers, never database-ready',()=>{
  const r=evaluateOfficeBaselineLineage();
  expect(r.requiredSourceCount).toBe(11);
  expect(r.matchedSourceCount).toBe(7);
  expect(r.findings.filter((x:{code:string})=>x.code==='OFFICE_BASELINE_SOURCE_MISSING')).toHaveLength(4);
  expect(r.sourceLineageStatus).toBe('BLOCKED');
  expect(r.releaseReady).toBe(false);
  expect(r.realDatabaseProof).toBe('NOT_EVALUATED');
  const m=JSON.parse(readFileSync('supabase/customer-baseline/manifest.json','utf8'));
  expect(m.status).toBe('snapshot-reviewed');
  expect(m.freshInstallProofRequired).toBe(true);
  expect(m.proofContractSha256).toBeNull();
  expect(m.notes).toContain('0048-0051');
 });
 it('rejects missing final 0051 closure and source-tampered 0051 payload',()=>{
  const temp=mkdtempSync(join(tmpdir(),'office-privacy-chain-'));
  try{
   const src=join(temp,'supabase/migrations'),dst=join(temp,'supabase/customer-baseline/migrations');
   mkdirSync(src,{recursive:true});mkdirSync(dst,{recursive:true});
   names.forEach((name,i)=>{
    writeFileSync(join(src,name),canonical[i]);
    if(i<3){
     const sha=createHash('sha256').update(canonical[i]).digest('hex');
     writeFileSync(join(dst,files[i].slice(root.length)),'-- Shoperation-Office-Source: '+name+' sha256='+sha+'\n'+canonical[i]);
    }
   });
   const partial=evaluateOfficeBaselineLineage({root:temp,requiredSources:[...names]});
   expect(partial.decision).toBe('BLOCK');
   expect(partial.findings).toContainEqual(expect.objectContaining({code:'OFFICE_BASELINE_SOURCE_MISSING',source:names[3]}));
   const sha=createHash('sha256').update(canonical[3]).digest('hex');
   writeFileSync(join(dst,files[3].slice(root.length)),'-- Shoperation-Office-Source: '+names[3]+' sha256='+sha+'\n'+'select true;\n');
   const forged=evaluateOfficeBaselineLineage({root:temp,requiredSources:[...names]});
   expect(forged.decision).toBe('BLOCK');
   expect(forged.findings).toContainEqual(expect.objectContaining({code:'OFFICE_SOURCE_BODY_DRIFT',source:names[3]}));
  }finally{rmSync(temp,{recursive:true,force:true})}
 });
});
