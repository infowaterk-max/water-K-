import{describe,expect,it}from'vitest';
import{readFileSync,readdirSync}from'node:fs';
import{createHash}from'node:crypto';

const root='supabase/customer-baseline/migrations/';
const sourcePath='supabase/migrations/20260907203000_team_permissions_foundation_v1.sql';
const baselinePath=root+'0047_team_permissions_foundation_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const source=read(sourcePath);
const baseline=read(baselinePath);
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json')) as {
 status:string;freshInstallProofRequired:boolean;notes:string;sourcePolicy:string;defaultPlan:string;proofContractSha256:string|null;
};
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';

describe('Core #1186 U10A2-F1: first append-only Team Permissions Fresh Install prerequisite',()=>{
 it('preserves the exact canonical 20260907203000 source SQL bytes with SHA-256 provenance',()=>{
   expect(baseline).toContain(marker);
   const body=baseline.slice(baseline.indexOf(marker)+marker.length);
   const hash=createHash('sha256').update(source,'utf8').digest('hex');
   expect(body).toBe(source);
   expect(baseline).toContain('-- Canonical SHA256: '+hash+'\n');
   expect(baseline).toContain('-- Canonical source: '+sourcePath+'\n');
 });
 it('keeps historical customer migrations immutable and appends exactly 0047 in order',()=>{
   const files=readdirSync(root).filter(f=>f.endsWith('.sql')).sort();
   expect(files[0]).toBe('0001_shoperation_v1_schema.sql');
   expect(files.at(-2)).toBe('0046_alap_team_chat_plan_grant_reconcile.sql');
   expect(files.at(-1)).toBe('0047_team_permissions_foundation_v1.sql');
   expect(files.length).toBe(48);
 });
 it('preserves prerequisite role/instance/audit tables in earlier customer snapshot',()=>{
   const historical=read(root+'0001_shoperation_v1_schema.sql').toLowerCase();
   for(const name of ['"public"."role_bindings"','"public"."webshop_instances"','"public"."admin_audit_log"']){
     expect(historical).toContain(name);
   }
   for(const table of ['store_permission_catalog','store_role_permission_presets','store_permission_overrides','store_delegations','store_delegation_permissions']){
     expect(source).toContain('create table if not exists public.'+table);
     expect(source).toContain('alter table public.'+table+' enable row level security');
     expect(source).toContain('revoke all on table public.'+table+' from anon,authenticated');
   }
 });
 it('retains canonical service-role guarded capability and delegation RPC functions',()=>{
   for(const fn of ['evaluate_store_capability_v1','merchant_replace_permission_overrides_v1','merchant_create_store_delegation_v1','merchant_revoke_store_delegation_v1']){
     expect(source).toContain('create or replace function public.'+fn+'(');
     expect(source).toContain('revoke all on function public.'+fn+'(');
   }
   expect(source).toContain('grant execute on function public.evaluate_store_capability_v1(');
   expect(source).toContain('to service_role');
 });
 it('marks new 0047 real-target Fresh Install proof as pending, never silently DONE',()=>{
   expect(manifest.defaultPlan).toBe('alap');
   expect(manifest.sourcePolicy).toBe('schema-snapshot-only');
   expect(manifest.freshInstallProofRequired).toBe(true);
   expect(manifest.status).toBe('snapshot-reviewed');
   expect(manifest.proofContractSha256).toBeNull();
   expect(manifest.notes).toContain('new canonical Team Permissions foundation 0047');
   expect(manifest.notes).toContain('role/RLS behavioral proof are still BLOCKED');
   expect(baseline).toContain('UNVERIFIED');
 });
 it('preserves Alap customer communication grant and independent Team Chat Pro grant',()=>{
   const existing=read(root+'0046_alap_team_chat_plan_grant_reconcile.sql');
   expect(existing).toContain("plan_code = 'alap'");
   expect(existing).toContain("capability_code = 'teamChat'");
   expect(existing).toContain("capability_code = 'officeCommunication'");
   expect(existing).toContain("capability_code = 'support'");
 });
});
