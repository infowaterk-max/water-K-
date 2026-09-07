import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('Team Permissions scoped delegation v2',()=>{
  it('supports all, topic and mailbox delegation scopes',()=>{
    const migration=read('supabase/migrations/20260907205500_team_permissions_scoped_delegation_v2.sql');
    expect(migration).toContain("scope_type in ('all','topic','mailbox')");
    expect(migration).toContain("d.scope_type='topic'");
    expect(migration).toContain("d.scope_type='mailbox'");
    expect(migration).toContain('p_topic_code=d.scope_value');
    expect(migration).toContain('p_mailbox_key=d.scope_value');
  });

  it('keeps substitution tied to resources owned by or assigned to the source person',()=>{
    const migration=read('supabase/migrations/20260907205500_team_permissions_scoped_delegation_v2.sql');
    expect(migration).toContain('p_resource_owner_user_id=d.source_user_id');
    expect(migration).toContain('p_resource_assigned_user_id=d.source_user_id');
  });

  it('prevents broad delegation from widening around a personal deny',()=>{
    const migration=read('supabase/migrations/20260907205500_team_permissions_scoped_delegation_v2.sql');
    expect(migration).toContain("p_scope_type='all'");
    expect(migration).toContain("o.effect='deny'");
    expect(migration).toContain('STORE_DELEGATION_SOURCE_PERMISSION_REQUIRED');
  });

  it('uses the scoped v2 RPC from the team action',()=>{
    const actions=read('src/app/admin/csapat/[userId]/actions.ts');
    const controls=read('src/components/admin/team-permission-controls.tsx');
    expect(actions).toContain('merchant_create_store_delegation_v2');
    expect(actions).toContain('p_scope_type:delegationScope.data');
    expect(actions).toContain('p_scope_value:normalizedScopeValue');
    expect(controls).toContain('delegationScopeType');
    expect(controls).toContain('delegationScopeValue');
  });
});
