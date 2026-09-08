import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('Team + Permissions 2.0 foundation',()=>{
  it('extends the existing role binding authority instead of replacing it',()=>{
    const migration=read('supabase/migrations/20260907203000_team_permissions_foundation_v1.sql');
    expect(migration).toContain('role_binding_id uuid not null references public.role_bindings(id)');
    expect(migration).toContain('source_role_binding_id uuid not null references public.role_bindings(id)');
    expect(migration).toContain('delegate_role_binding_id uuid not null references public.role_bindings(id)');
    expect(migration).toContain("join public.store_role_permission_presets rp on rp.role_code=rb.role_code");
  });

  it('keeps fine-grained authorization tables server-only and RLS protected',()=>{
    const migration=read('supabase/migrations/20260907203000_team_permissions_foundation_v1.sql');
    for(const table of ['store_permission_catalog','store_role_permission_presets','store_permission_overrides','store_delegations','store_delegation_permissions']){
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on table public.${table} from anon,authenticated`);
    }
    expect(migration).toContain("grant execute on function public.evaluate_store_capability_v1");
    expect(migration).toContain('to service_role');
  });

  it('makes explicit deny stronger than role, allow and delegation grants',()=>{
    const migration=read('supabase/migrations/20260907203000_team_permissions_foundation_v1.sql');
    const deny=migration.indexOf("o.effect='deny'");
    const allow=migration.indexOf("o.effect='allow'");
    const delegation=migration.indexOf("'source','delegation'");
    const role=migration.indexOf("'source',case when v_role_allowed then 'role'");
    expect(deny).toBeGreaterThan(0);
    expect(deny).toBeLessThan(allow);
    expect(allow).toBeLessThan(delegation);
    expect(delegation).toBeLessThan(role);
  });

  it('limits temporary delegation to the source persons resources and forbids critical delegation by catalog policy',()=>{
    const migration=read('supabase/migrations/20260907203000_team_permissions_foundation_v1.sql');
    expect(migration).toContain('p_resource_owner_user_id=d.source_user_id');
    expect(migration).toContain("('refunds.approve','refunds','Visszatérítés jóváhagyása'");
    expect(migration).toContain("('office.mailbox.manage','office','Postafiókok kezelése'");
    expect(migration).toContain("('team.permissions.manage','team','Egyedi jogosultságok kezelése'");
    expect(migration).toContain('where c.permission_code is null or not c.delegable');
  });

  it('does not model private chat content visibility as an owner-readable capability',()=>{
    const capabilities=read('src/lib/auth/store-capabilities.ts');
    const migration=read('supabase/migrations/20260907203000_team_permissions_foundation_v1.sql');
    expect(capabilities).toContain("'office.internal_chat'");
    expect(capabilities).not.toContain('office.private_chat.read');
    expect(migration).toContain('private internal chat contents are never represented by a capability');
  });

  it('exposes detailed access controls from the team surface and keeps mutations owner-gated',()=>{
    const controls=read('src/components/admin/team-member-controls.tsx');
    const page=read('src/app/admin/csapat/[userId]/page.tsx');
    const actions=read('src/app/admin/csapat/[userId]/actions.ts');
    expect(controls).toContain('Részletes hozzáférések');
    expect(page).toContain("actorRoles.includes('owner')");
    expect(page).toContain("binding.role_code!=='owner'");
    expect(actions).toContain("if(!scope.isPlatform&&!roles.includes('owner'))");
    expect(actions).toContain('merchant_replace_permission_overrides_v1');
    expect(actions).toContain('merchant_create_store_delegation_v2');
  });
});
