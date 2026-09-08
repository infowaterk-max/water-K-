import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');
const privacyMigrations=[
  'supabase/migrations/20260908022500_digital_office_privacy_foundation_v1.sql',
  'supabase/migrations/20260908023000_digital_office_privacy_membership_hardening_v1.sql',
  'supabase/migrations/20260908023500_digital_office_private_author_read_sync_v1.sql',
  'supabase/migrations/20260908024000_digital_office_rls_helper_exposure_closure_v1.sql',
];

describe('Digital Office role preset stability',()=>{
  it('does not rewrite existing role permission presets from Digital Office privacy migrations',()=>{
    for(const path of privacyMigrations){
      const sql=read(path).toLowerCase();
      expect(sql).not.toContain('insert into public.store_role_permission_presets');
      expect(sql).not.toContain('update public.store_role_permission_presets');
      expect(sql).not.toContain('delete from public.store_role_permission_presets');
    }
  });

  it('keeps role presets stable and personal customization on the override layer',()=>{
    const foundation=read('supabase/migrations/20260907203000_team_permissions_foundation_v1.sql');
    const controls=read('src/components/admin/team-permission-controls.tsx');
    const actions=read('src/app/admin/csapat/[userId]/actions.ts');
    expect(foundation).toContain('create table if not exists public.store_permission_overrides');
    expect(foundation).toContain('merchant_replace_permission_overrides_v1');
    expect(controls).toContain('Szerepkör + extra');
    expect(controls).toContain('A szerepkör definíciója változatlan marad');
    expect(controls).toContain('extraPermissionCode');
    expect(actions).toContain('merchant_replace_permission_overrides_v1');
    expect(actions).not.toContain(".from('store_role_permission_presets').update(");
    expect(actions).not.toContain(".from('store_role_permission_presets').insert(");
    expect(actions).not.toContain(".from('store_role_permission_presets').delete(");
  });
});
