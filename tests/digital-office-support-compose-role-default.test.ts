import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20261019073857_office_support_compose_default_v1.sql');
const foundation=read('supabase/migrations/20260908034000_digital_office_composer_drafts_foundation_v1.sql');
const roles=read('supabase/migrations/20260907203000_team_permissions_foundation_v1.sql');

describe('Office inherited support email composition authority',()=>{
  it('adds one idempotent support preset, with no user-specific bypass or other-role grant',()=>{
    expect(migration).toContain("values ('support','office.email.compose','all')");
    expect(migration).toContain('on conflict (role_code,permission_code)');
    expect(migration).toContain('do update set default_scope = excluded.default_scope');
    expect((migration.match(/insert into public\.store_role_permission_presets/g)??[]).length).toBe(1);
    expect(migration).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.store_permission_overrides\b/i);
    expect(migration).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.office_mailboxes\b/i);
    for(const role of ['viewer','analyst','order_manager','marketing_manager','catalog_manager']){
      expect(migration).not.toContain("'"+role+"','office.email.compose'");
    }
  });

  it('fails closed if the historical SQL permission foundation is absent',()=>{
    expect(migration).toContain("to_regclass('public.store_permission_catalog') is null");
    expect(migration).toContain("to_regclass('public.store_role_permission_presets') is null");
    expect(migration).toContain('OFFICE_SUPPORT_COMPOSE_PERMISSION_FOUNDATION_MISSING');
    expect(migration).toContain('OFFICE_SUPPORT_COMPOSE_CATALOG_ENTRY_MISSING');
    expect(migration).toContain("permission_code = 'office.email.compose'");
    expect(foundation).toContain("'office.email.compose','office','Új ügyfél-e-mail írása'");
  });

  it('keeps owner explicit deny above inherited support preset in the canonical evaluator',()=>{
    const deny=roles.indexOf("o.effect='deny'");
    const deniedReturn=roles.indexOf("'source','explicit_deny'",deny);
    const role=roles.indexOf('join public.store_role_permission_presets rp',deniedReturn);
    expect(deny).toBeGreaterThan(0);
    expect(deniedReturn).toBeGreaterThan(deny);
    expect(role).toBeGreaterThan(deniedReturn);
    expect(foundation).toContain('private.office_can_compose_new_email_v1');
    expect(foundation).toContain("'OFFICE_EMAIL_COMPOSE_PERMISSION_REQUIRED'");
  });

  it('preserves original immutable opt-in historical source and requires a configured sender to send',()=>{
    expect(foundation).toContain('Intentionally NO write to store_role_permission_presets here');
    expect(foundation).toContain("'OFFICE_MAILBOX_NOT_CONFIGURED'");
    expect(foundation).toContain('m.is_active=true');
    expect(migration).not.toContain('admin_queue_office_email');
    expect(migration).not.toContain('grant execute');
  });
});
