import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasPlanFeature, PLANNED_PRO_FEATURES } from '../src/lib/plans/catalog';
import { capabilityReleaseState, isCapabilityReleased } from '../src/lib/entitlements/catalog';

const planAccess = readFileSync(join(process.cwd(), 'src/lib/plans/access.ts'), 'utf8');
const entitlementAccess = readFileSync(join(process.cwd(), 'src/lib/entitlements/access.ts'), 'utf8');
const block11Migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260910124500_block11_entitlement_contract_v1.sql'),
  'utf8',
);
const launchMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260910041011_team_chat_secure_attachments_launch_gate_v1.sql'),
  'utf8',
);

describe('Team Chat 2.1 Secure Attachments launch gate', () => {
  it('does not grant Secure Attachments to either launch package', () => {
    expect(hasPlanFeature('alap', 'teamChatSecureAttachments')).toBe(false);
    expect(hasPlanFeature('pro', 'teamChatSecureAttachments')).toBe(false);
    expect(PLANNED_PRO_FEATURES).toContain('teamChatSecureAttachments');
  });

  it('keeps Secure Attachments reserved before every runtime entitlement source, including platform override', () => {
    expect(capabilityReleaseState('teamChatSecureAttachments')).toBe('reserved');
    expect(isCapabilityReleased('teamChatSecureAttachments')).toBe(false);
    expect(planAccess).toContain('if (!isRuntimeFeatureReleased(feature)) return false;');
    expect(entitlementAccess).toContain("source:releaseState==='reserved'?'reserved':'unknown'");
    expect(entitlementAccess).not.toContain('getPlatformRole');
    expect(block11Migration).toContain("('teamChatSecureAttachments','reserved','feature')");
    expect(block11Migration).toContain("FEATURE_OVERRIDE_CAPABILITY_NOT_RELEASED");
  });

  it('keeps production plan provisioning aligned with the launch model', () => {
    expect(launchMigration).toContain("'commerceIntegrations','support','teamChat'");
    expect(launchMigration).toContain("'officeCommunication','automation','procurement','cashflow','executiveAnalytics'");
    expect(launchMigration).toContain("'managed_by','tenant_plan_sync_v3'");
    expect(launchMigration).toContain("set search_path=''");
    expect(launchMigration).toContain('revoke all on function private.sync_webshop_plan_entitlements(uuid) from public,anon,authenticated,service_role');

    const proBranch = launchMigration.slice(launchMigration.indexOf("elsif v_plan='pro'"), launchMigration.indexOf("else\n    raise exception 'TENANT_PLAN_SYNC_UNKNOWN_PLAN"));
    expect(proBranch).toContain("'teamChat'");
    expect(proBranch).not.toContain("'teamChatSecureAttachments'");
    expect(block11Migration).not.toContain("('pro','teamChatSecureAttachments')");
  });
});
