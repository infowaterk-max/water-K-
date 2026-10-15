import {describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
// @ts-ignore Canonical JavaScript module has no bundled TS declaration.
import {evaluateOfficeBaselineLineage,OFFICE_BASELINE_MINIMUM_SOURCES,OFFICE_BASELINE_SUPERSEDED_SOURCES} from '../scripts/shoperation-office-baseline-lineage.mjs';

const root='supabase/customer-baseline/migrations/';
const names=[
 '20260910070000_communication_hub_2_0_foundation_v1.sql',
 '20260910070100_communication_hub_2_0_mailbox_default_assignment_v1.sql',
 '20260910070200_communication_hub_2_0_advanced_guards_and_object_links_v1.sql',
] as const;
const files=names.map((name,i)=>root+String(i+55).padStart(4,'0')+'_'+name.slice(15));
const canonical=names.map(name=>readFileSync('supabase/migrations/'+name,'utf8'));
const applied=files.map(path=>readFileSync(path,'utf8'));

describe('Core #1186 U10A2-F5: Communication Hub source dependency and Alap customer-right preservation',()=>{
 it('requires original source bytes and SHA256 provenance for exactly 0055-0057',()=>{
  names.forEach((name,i)=>{
   const sha=createHash('sha256').update(canonical[i],'utf8').digest('hex');
   const marker='-- Shoperation-Office-Source: '+name+' sha256='+sha+'\n';
   expect(applied[i].startsWith(marker)).toBe(true);
   expect(applied[i].slice(marker.length)).toBe(canonical[i]);
   expect(OFFICE_BASELINE_MINIMUM_SOURCES).toContain(name);
  });
  expect(OFFICE_BASELINE_SUPERSEDED_SOURCES).toHaveLength(2);
 });
 it('appends 0055-0057, preserves 0046-0054 and leaves final 0058 strict Pro guard unapplied',()=>{
  const all=readdirSync(root).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort();
  expect(all).toHaveLength(58);
  expect(all[46]).toBe('0046_alap_team_chat_plan_grant_reconcile.sql');
  expect(all[54]).toBe('0054_digital_office_team_chat_owner_transfer_v1.sql');
  expect(all.slice(-3)).toEqual(files.map(f=>f.slice(root.length)));
  expect(all.some(x=>x.includes('strict_pro_sql_guard'))).toBe(false);
 });
 it('retains service-role-only attachment quarantine, delegation and clean-scan prerequisites',()=>{
  expect(canonical[0]).toContain('create or replace function public.service_prepare_inbound_office_attachments_v1(');
  expect(canonical[0]).toContain('create or replace function public.service_finalize_inbound_office_attachment_v1(');
  expect(canonical[0]).toContain('OFFICE_INBOUND_ATTACHMENT_CLEAN_EVIDENCE_REQUIRED');
  expect(canonical[0]).toContain('create or replace function public.admin_queue_office_email_v5(');
  expect(canonical[0]).toContain('office_message_delegation_integrity_v1');
  expect(canonical[0]).toContain('grant execute on function public.admin_queue_office_email_v5(uuid,uuid,jsonb) to service_role');
  expect(canonical[0]).toContain('revoke all on function public.admin_queue_office_email_v5(uuid,uuid,jsonb) from public,anon,authenticated');
 });
 it('uses mailbox responsibility as default only; never overwrites manual assignee',()=>{
  expect(canonical[1]).toContain("new.conversation_type<>'customer' or new.assigned_to is not null or new.mailbox_key is null");
  expect(canonical[1]).toContain('m.instance_id=new.instance_id');
  expect(canonical[1]).toContain('m.is_active=true');
  expect(canonical[1]).toContain('private.office_active_member_v1(new.instance_id,v_responsible)');
  expect(canonical[1]).toContain('before insert or update of mailbox_key on public.office_threads');
  expect(canonical[1]).toContain('revoke all on function private.office_customer_mailbox_default_assignee_v1() from public,anon,authenticated');
 });
 it('requires advanced Pro guard on v2/v6 service-only wrappers while revoking legacy v1/v5 service-role access',()=>{
  expect(canonical[2]).toContain('private.office_advanced_actor_v1(p_instance_id,p_actor)');
  expect(canonical[2]).toContain('OFFICE_EMAIL_ADVANCED_PLAN_REQUIRED');
  expect(canonical[2]).toContain('revoke all on function public.admin_update_office_mailbox_responsibility_v1(uuid,uuid,text,uuid) from service_role');
  expect(canonical[2]).toContain('revoke all on function public.admin_update_office_thread_relationships_v1(uuid,uuid,uuid,uuid,text,uuid) from service_role');
  expect(canonical[2]).toContain('revoke all on function public.admin_queue_office_email_v5(uuid,uuid,jsonb) from service_role');
  expect(canonical[2]).toContain('grant execute on function public.admin_queue_office_email_v6(uuid,uuid,jsonb) to service_role');
  expect(canonical[2]).toContain('private.office_chat_object_exists_v1(new.instance_id,new.object_type,new.object_id)');
 });
 it('blocks incorrect final strict-Pro SQL that would deny accepted Alap customer Office read',()=>{
  const strict=readFileSync('supabase/migrations/20261010093000_digital_office_strict_pro_sql_guard_v1.sql','utf8');
  const grants=readFileSync(root+'0046_alap_team_chat_plan_grant_reconcile.sql','utf8');
  expect(grants).toContain("plan_code = 'alap'");
  expect(grants).toContain("capability_code = 'officeCommunication'");
  expect(grants).toContain("capability_code = 'support'");
  expect(strict).toContain("w.subscription_plan='pro'");
  expect(strict).toContain("if v_thread.conversation_type='customer' then");
  expect(strict).toContain("private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunicationAdvanced')");
  expect(strict).toContain('as restrictive for select to authenticated');
  const all=readdirSync(root).filter(f=>/^\d{4}_.+\.sql$/.test(f));
  expect(all.some(f=>f.includes('strict_pro_sql_guard'))).toBe(false);
 });
 it('keeps source lineage 10/11 and full runtime readiness explicitly BLOCKED',()=>{
  const state=evaluateOfficeBaselineLineage();
  expect(state.requiredSourceCount).toBe(11);
  expect(state.matchedSourceCount).toBe(10);
  expect(state.findings.filter((f:{code:string})=>f.code==='OFFICE_BASELINE_SOURCE_MISSING')).toEqual([expect.objectContaining({source:'20261010093000_digital_office_strict_pro_sql_guard_v1.sql'})]);
  expect(state.sourceLineageStatus).toBe('BLOCKED');
  expect(state.releaseReady).toBe(false);
  expect(state.realDatabaseProof).toBe('NOT_EVALUATED');
  const manifest=JSON.parse(readFileSync('supabase/customer-baseline/manifest.json','utf8'));
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('0055-0057');
 });
 it('rejects partial communication Hub sources and tampered final 0057 Pro guard',()=>{
  const tmp=mkdtempSync(join(tmpdir(),'communication-hub-f5-'));
  try{
   const src=join(tmp,'supabase/migrations'),dst=join(tmp,'supabase/customer-baseline/migrations');
   mkdirSync(src,{recursive:true});mkdirSync(dst,{recursive:true});
   names.forEach((name,i)=>{
    writeFileSync(join(src,name),canonical[i]);
    if(i<2){
     const hash=createHash('sha256').update(canonical[i]).digest('hex');
     writeFileSync(join(dst,files[i].slice(root.length)),'-- Shoperation-Office-Source: '+name+' sha256='+hash+'\n'+canonical[i]);
    }
   });
   const missing=evaluateOfficeBaselineLineage({root:tmp,requiredSources:[...names]});
   expect(missing.decision).toBe('BLOCK');
   expect(missing.findings).toContainEqual(expect.objectContaining({code:'OFFICE_BASELINE_SOURCE_MISSING',source:names[2]}));
   const hash=createHash('sha256').update(canonical[2]).digest('hex');
   writeFileSync(join(dst,files[2].slice(root.length)),'-- Shoperation-Office-Source: '+names[2]+' sha256='+hash+'\nselect true;\n');
   const changed=evaluateOfficeBaselineLineage({root:tmp,requiredSources:[...names]});
   expect(changed.decision).toBe('BLOCK');
   expect(changed.findings).toContainEqual(expect.objectContaining({code:'OFFICE_SOURCE_BODY_DRIFT',source:names[2]}));
  }finally{rmSync(tmp,{recursive:true,force:true})}
 });
});
