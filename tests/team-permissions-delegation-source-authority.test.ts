import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('Team Permissions delegation source authority',()=>{
  it('requires the source person to hold each transferred capability directly',()=>{
    const migration=read('supabase/migrations/20260907204500_team_permissions_delegation_source_authority_v1.sql');
    expect(migration).toContain('store_source_can_delegate_capability_v1');
    expect(migration).toContain('matching_deny');
    expect(migration).toContain('matching_allow');
    expect(migration).toContain('matching_role');
    expect(migration).toContain('STORE_DELEGATION_SOURCE_PERMISSION_REQUIRED');
  });

  it('does not use existing delegations as a source of re-delegatable authority',()=>{
    const migration=read('supabase/migrations/20260907204500_team_permissions_delegation_source_authority_v1.sql');
    const helper=migration.slice(migration.indexOf('create or replace function private.store_source_can_delegate_capability_v1'),migration.indexOf('create or replace function public.merchant_create_store_delegation_v1'));
    expect(helper).toContain('store_role_permission_presets');
    expect(helper).toContain('store_permission_overrides');
    expect(helper).not.toContain('store_delegations');
    expect(helper).not.toContain('store_delegation_permissions');
  });

  it('keeps the source authority helper private and unavailable to browser roles',()=>{
    const migration=read('supabase/migrations/20260907204500_team_permissions_delegation_source_authority_v1.sql');
    expect(migration).toContain('revoke all on function private.store_source_can_delegate_capability_v1(uuid,uuid,uuid,text) from public,anon,authenticated');
    expect(migration).toContain('grant execute on function public.merchant_create_store_delegation_v1');
    expect(migration).toContain('to service_role');
  });
});
