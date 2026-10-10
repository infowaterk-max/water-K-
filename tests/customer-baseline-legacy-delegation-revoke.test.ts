import{describe,expect,it}from'vitest';
import{readFileSync,readdirSync}from'node:fs';
import{createHash}from'node:crypto';
const root='supabase/customer-baseline/migrations/';
const sourceFile='supabase/migrations/20260907205600_team_permissions_disable_legacy_delegation_creator.sql';
const read=(f:string)=>readFileSync(f,'utf8');
const original=read(sourceFile);
const migration=read(root+'0049_team_permissions_disable_legacy_delegation_creator.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const boundary='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F2C — legacy delegation v1 service-role revoke',()=>{
 it('is an append-only SHA256-identical copy of canonical source migration',()=>{
  const sha=createHash('sha256').update(original).digest('hex');
  expect(migration).toContain('-- Canonical source: '+sourceFile+'\n');
  expect(migration).toContain('-- Canonical SHA256: '+sha+'\n');
  expect(migration.slice(migration.indexOf(boundary)+boundary.length)).toBe(original);
 });
 it('follows 0047 and 0048, retaining original 0001–0048 ordering',()=>{
  const names=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const index=names.indexOf('0047_team_permissions_foundation_v1.sql');
  expect(index).toBeGreaterThanOrEqual(0);
  expect(names[index+1]).toBe('0048_team_permissions_scoped_delegation_v2.sql');
  expect(names[index+2]).toBe('0049_team_permissions_disable_legacy_delegation_creator.sql');
  expect(names.length).toBeGreaterThanOrEqual(50);
 });
 it('revokes only old v1 service-role EXECUTE and preserves v2 positive grant',()=>{
  const expected='revoke execute on function public.merchant_create_store_delegation_v1(uuid,uuid,uuid,uuid,text[],timestamptz,timestamptz,text) from service_role;';
  expect(original).toContain(expected);
  expect(original).not.toContain('merchant_create_store_delegation_v2');
  expect(original).not.toMatch(/\bdrop\s+function\b/i);
  const v2=read(root+'0048_team_permissions_scoped_delegation_v2.sql');
  expect(v2).toContain('grant execute on function public.merchant_create_store_delegation_v2(');
  expect(v2).toContain('to service_role;');
 });
 it('keeps Fresh Install unproven and Alap/Team Chat authorities untouched',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('Office 0050+ dependency chain is still incomplete');
  const old=read(root+'0046_alap_team_chat_plan_grant_reconcile.sql');
  expect(old).toContain("capability_code = 'teamChat'");
  expect(old).toContain("capability_code = 'officeCommunication'");
  expect(old).toContain("capability_code = 'support'");
 });
});
