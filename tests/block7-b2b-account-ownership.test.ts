import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test}from'vitest';
const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migrationPath='supabase/migrations/20260908043000_block7_b2b_account_ownership.sql';
const baselinePath='supabase/customer-baseline/migrations/0002_block7_b2b_account_ownership.sql';

describe('Roadmap Block 7 B2B Account Ownership',()=>{
 test('customer B2B organization is separate from merchant organizations and tenant scoped',()=>{
  const sql=read(migrationPath);
  expect(sql).toContain('create table if not exists public.b2b_accounts');
  expect(sql).toContain('create table if not exists public.b2b_account_members');
  expect(sql).toContain('create table if not exists public.b2b_account_invitations');
  expect(sql).toMatch(/role text not null check\(role in \('owner','admin','buyer'\)\)/);
  expect(sql).toContain('unique(instance_id,user_id)');
  expect(sql).toContain("Separate from merchant public.organizations");
  expect(sql).toMatch(/foreign key\(account_id,instance_id\) references public\.b2b_accounts\(id,instance_id\)/);
 });

 test('membership lifecycle is backend-authoritative with hashed invitations and last-owner protection',()=>{
  const sql=read(migrationPath);
  for(const rpc of ['b2b_invite_member_v1','b2b_accept_invitation_v1','b2b_set_member_role_v1','b2b_transfer_ownership_v1','b2b_remove_member_v1','b2b_revoke_invitation_v1'])expect(sql).toContain(`public.${rpc}`);
  expect(sql).toContain("token_hash text not null unique");
  expect(sql).toContain("token_hash ~ '^[0-9a-f]{64}$'");
  expect(sql).toContain('LAST_B2B_ACCOUNT_OWNER');
  expect(sql).toContain('B2B_OWNER_TRANSFER_REQUIRED');
  expect(sql).toMatch(/revoke all on function public\.b2b_invite_member_v1[\s\S]*from public,anon,authenticated/);
  expect(sql).toMatch(/grant execute on function public\.b2b_invite_member_v1[\s\S]*to service_role/);
 });

 test('registration intent never grants B2B authority and organization approval drives the compatibility read-model',()=>{
  const sql=read(migrationPath);
  expect(sql).toContain('Registration may record a pending reseller intent');
  expect(sql).toMatch(/if new\.b2b_account_id is null[\s\S]*if new\.reseller_approved then raise exception 'B2B_ACCOUNT_REQUIRED'/);
  expect(sql).toContain('private.sync_b2b_member_relation_v1');
  expect(sql).toMatch(/a\.status='approved'[\s\S]*r\.role='reseller'[\s\S]*r\.reseller_approved=true/);
  expect(sql).toContain('B2B_ACCOUNT_APPROVAL_AUTHORITY_MISMATCH');
 });

 test('orders carry authoritative organization identity without widening payment authority',()=>{
  const sql=read(migrationPath),orgOrder=read('src/app/fiokom/b2b/rendeles/[id]/page.tsx'),ownOrder=read('src/app/fiokom/rendeles/[id]/page.tsx');
  expect(sql).toContain('alter table public.orders add column if not exists b2b_account_id uuid');
  expect(sql).toContain('orders_b2b_account_context');
  expect(sql).toContain('B2B_ORDER_ACCOUNT_MISMATCH');
  expect(sql).toContain('B2B_ORDER_TAX_MISMATCH');
  expect(orgOrder).toMatch(/eq\('b2b_account_id',context\.accountId\)/);
  expect(orgOrder).not.toContain('PaymentRetryButton');
  expect(ownOrder).toContain('PaymentRetryButton');
 });

 test('commercial B2B authority and audit trail follow the organization lifecycle',()=>{
  const sql=read(migrationPath);
  expect(sql).toContain('private.has_b2b_purchase_authority_v1');
  expect(sql).toContain('B2B_ACCOUNT_AUTHORITY_REQUIRED');
  expect(sql).toContain('private.reconcile_b2b_commercial_authority_v1');
  for(const action of ['b2b.account_requested','b2b.member_invited','b2b.member_joined','b2b.member_role_updated','b2b.ownership_transferred','b2b.member_removed','b2b.invitation_revoked','b2b.account_status_updated','b2b.account_commercial_reconciled'])expect(sql).toContain(action);
 });

 test('customer and merchant UIs are role-aware and person-level admin approval is no longer rendered',()=>{
  const account=read('src/app/fiokom/b2b/page.tsx'),panel=read('src/components/account/b2b-account-panel.tsx'),admin=read('src/app/admin/ugyfelek/page.tsx'),orgAdmin=read('src/app/admin/ugyfelek/b2b/page.tsx');
  expect(account).toContain('resolveB2BAccountContext');
  expect(account).toContain('B2BAccountPanel');
  expect(panel).toContain("currentRole==='owner'");
  expect(panel).toContain("currentRole==='admin'");
  expect(panel).toContain("member.role!=='owner'");
  expect(admin).not.toContain('CustomerRoleControl');
  expect(admin).toContain('/admin/ugyfelek/b2b');
  expect(orgAdmin).toContain('B2BAccountStatusControl');
 });

 test('Builder Foundation compatibility stays Alap-ready without bringing forward Page Schema or Visual Builder runtime',()=>{
  const manifest=read('src/lib/commerce/b2b-account-builder.ts');
  expect(manifest).toContain("componentKey:'account.b2b-organization'");
  expect(manifest).toContain("pageTypes:['account']");
  expect(manifest).toContain("minPlan:'alap'");
  expect(manifest).toContain("features:['customers','orders']");
  expect(manifest).not.toContain('dragDropRuntime:true');
  expect(manifest).not.toContain('inlineEditingRuntime:true');
 });

 test('fresh-customer path receives the exact same forward migration and remains fail-closed until clean-install proof',()=>{
  expect(read(baselinePath)).toBe(read(migrationPath));
  const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  const workflow=read('.github/workflows/fresh-install-proof.yml');
  expect(workflow).toContain("find supabase/customer-baseline/migrations");
 });

 test('Block 7 does not modify K&H or payment-attempt authority',()=>{
  const sql=read(migrationPath).toLowerCase();
  expect(sql).not.toContain('kh_vpos');
  expect(sql).not.toContain('payment_attempts');
  expect(sql).not.toContain('payment_provider_events');
 });
});
