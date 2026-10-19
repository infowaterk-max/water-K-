import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const correction=read('supabase/migrations/20261019090000_office_support_compose_default_v1.sql');
const historical=read('supabase/migrations/20260908034000_digital_office_composer_drafts_foundation_v1.sql');
const roleFoundation=read('supabase/migrations/20260907203000_team_permissions_foundation_v1.sql');
const composerPage=read('src/app/admin/kommunikacio/iroda/uj/page.tsx');
const composerActions=read('src/app/admin/kommunikacio/iroda/composer-actions.ts');
const advancedControls=read('src/components/admin/team-permission-controls.tsx');
const digitalOfficeLayout=read('src/app/admin/kommunikacio/layout.tsx');

describe('Support role customer-email compose is inherited and owner-revocable',()=>{
  it('applies only a forward-only support preset, without rewriting historic SQL or overrides',()=>{
    expect(historical).toContain('Intentionally NO write to store_role_permission_presets here');
    expect(correction).toContain("('support','office.email.compose','all')");
    expect(correction).toContain('on conflict (role_code,permission_code)');
    expect(correction).toContain('do update set default_scope = excluded.default_scope');
    expect(correction).toContain('OFFICE_SUPPORT_COMPOSE_PERMISSION_FOUNDATION_MISSING');
    expect(correction).toContain('OFFICE_SUPPORT_COMPOSE_CATALOG_ENTRY_MISSING');
    expect(correction).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.store_permission_overrides\b/i);
    expect(correction).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.office_mailboxes\b/i);
    expect(correction).not.toContain("('order_manager','office.email.compose'");
    expect(correction).not.toContain("('viewer','office.email.compose'");
  });

  it('honors the canonical deny-before-inherited-role authorization order',()=>{
    const deny=roleFoundation.indexOf("o.effect='deny'");
    const deniedReturn=roleFoundation.indexOf("'source','explicit_deny'",deny);
    const inherited=roleFoundation.indexOf('join public.store_role_permission_presets rp',deniedReturn);
    expect(deny).toBeGreaterThan(0);
    expect(deniedReturn).toBeGreaterThan(deny);
    expect(inherited).toBeGreaterThan(deniedReturn);
    expect(advancedControls).toContain('<option value="deny">Egyedi tiltás</option>');
    expect(advancedControls).toContain('<summary><strong>Haladó eltérések</strong> · tiltás, adatkör, lejárat</summary>');
  });

  it('renders composer only after server capability proof and does not demand an extra grant',()=>{
    expect(composerPage).toContain("const canCompose=isOwner||await hasStoreCapability(scope.instanceId,actor.id,'office.email.compose')");
    expect(composerPage).toContain('{canCompose&&!foundationError&&<OfficeNewEmailComposer');
    expect(composerPage).toContain('egyedi tiltást és az aktív szerepkört');
    expect(composerPage).not.toContain('hasComposeExtra');
    expect(composerPage).not.toContain('extra jogosultság szükséges');
    expect(historical).toContain("private.office_can_compose_new_email_v1");
    expect(historical).toContain("'OFFICE_EMAIL_COMPOSE_PERMISSION_REQUIRED'");
  });

  it('retains Pro Digital Office, revision-safe draft and verified-mailbox send boundary',()=>{
    expect(digitalOfficeLayout).toContain("requirePlanFeature('officeCommunicationAdvanced')");
    expect(composerActions).toContain("requirePlanFeature('officeCommunicationAdvanced')");
    expect(composerActions).toContain("db.rpc('admin_mutate_office_draft_v3'");
    expect(composerActions).toContain("db.rpc('admin_queue_office_email_v6'");
    expect(composerActions).toContain('draftRevision:input.draftRevision');
    expect(composerActions).toContain("'OFFICE_MAILBOX_LOOKUP_FAILED'");
    expect(historical).toContain("'OFFICE_MAILBOX_NOT_CONFIGURED'");
    expect(correction).not.toContain('grant execute');
  });
});
