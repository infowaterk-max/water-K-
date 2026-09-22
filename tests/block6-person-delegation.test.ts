import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260907130000_block6_person_delegation_authority.sql';

describe('Roadmap Block 6 person-based delegation',()=>{
  test('extends role_bindings with time-bound delegation instead of introducing a second RBAC model',()=>{
    const sql=read(migration).toLowerCase();
    const actions=read('src/app/admin/csapat/actions.ts');
    expect(sql).toContain('merchant_set_store_role_v2');
    expect(sql).toContain('p_valid_until timestamptz');
    expect(sql).toContain('insert into public.role_bindings');
    expect(sql).toContain('delegated_by,valid_from,valid_until');
    expect(sql).not.toContain('create table');
    expect(actions).toContain("admin.rpc('merchant_set_store_role_v2'");
    expect(actions).toContain('p_valid_until:validUntil');
  });

  test('backend prevents self lockout, owner escalation and expiring owner authority',()=>{
    const sql=read(migration);
    expect(sql).toContain('SELF_ROLE_MUTATION_FORBIDDEN');
    expect(sql).toContain('OWNER_ROLE_ASSIGNMENT_REQUIRES_OWNER');
    expect(sql).toContain('OWNER_ROLE_MUTATION_REQUIRES_OWNER');
    expect(sql).toContain('OWNER_ROLE_CANNOT_EXPIRE');
    expect(sql).toContain('LAST_WEBSHOP_OWNER');
    expect(sql).toContain('ORGANIZATION_ROLE_BINDING_READ_ONLY');
    expect(sql).toContain("'delegatedBy',p_actor_user_id");
    expect(sql).toContain("'delegationModel','role_bindings'");
  });

  test('revoked or expired RBAC history cannot fall back to legacy membership',()=>{
    const instanceAccess=read('src/lib/instances/access.ts');
    const adminApi=read('src/lib/auth/admin-api.ts');
    const requireAdmin=read('src/lib/auth/require-admin.ts');
    const storefront=read('src/lib/storefront/access.ts');
    const rbac=read('src/lib/auth/store-rbac.ts');
    const sql=read(migration).toLowerCase();
    expect(instanceAccess).toContain('bindings.length===0');
    expect(instanceAccess).toContain('!binding.revoked_at');
    expect(rbac).toContain('hasStoreRoleBindingHistory');
    expect(adminApi).toContain('hasStoreRoleBindingHistory(instance.id,user.id)');
    expect(requireAdmin).toContain('hasStoreRoleBindingHistory(instance.id,authData.user.id)');
    expect(storefront).toContain('hasStoreRoleBindingHistory(instance.id,user.id)');
    const middlewareGate=sql.slice(sql.indexOf('create or replace function private.can_access_admin_context_current'),sql.indexOf('-- organization-level reads'));
    expect(middlewareGate).not.toContain('legacy_candidates');
    expect(middlewareGate).not.toContain('webshop_instance_members');
    expect(middlewareGate).toContain('r.valid_until is null or r.valid_until>now()');
  });

  test('organization-scoped browser reads are tied to active role bindings',()=>{
    const sql=read(migration).toLowerCase();
    expect(sql).toContain('private.has_organization_role_current');
    expect(sql).toContain('r.revoked_at is null');
    expect(sql).toContain('r.valid_from<=now()');
    expect(sql).toContain('r.valid_until is null or r.valid_until>now()');
    expect(sql).toContain('drop policy if exists organizations_member_read');
    expect(sql).toContain('drop policy if exists feature_entitlements_scope_read');
    expect(sql).toContain('drop policy if exists organization_members_self_read');
    expect(sql).toContain('drop policy if exists role_bindings_scope_read');
    expect(sql).toContain('drop policy if exists admin_audit_tenant_read');
  });

  test('team UI exposes delegation validity while hiding unsafe owner/self mutations',()=>{
    const page=read('src/app/admin/csapat/page.tsx');
    const controls=read('src/components/admin/team-member-controls.tsx');
    expect(page).toContain('getActiveStoreRoles(scope.instanceId)');
    expect(page).toContain("binding.user_id===user?.id");
    expect(page).toContain("binding.role_code==='owner'&&!canAssignOwner");
    expect(page).toContain("timeZone:'Europe/Budapest'");
    expect(controls).toContain('Hozzáférés időtartama');
    expect(controls).toContain("{value:'24h',label:'24 óra'}");
    expect(controls).toContain("{value:'90d',label:'90 nap'}");
    expect(controls).toContain('Jelenlegi lejárat megtartása');
  });
});
