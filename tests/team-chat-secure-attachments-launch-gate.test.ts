import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasPlanFeature, PLANNED_PRO_FEATURES } from '../src/lib/plans/catalog';

const planAccess = readFileSync(join(process.cwd(), 'src/lib/plans/access.ts'), 'utf8');

describe('Team Chat 2.1 Secure Attachments launch gate', () => {
  it('does not grant Secure Attachments to either launch package', () => {
    expect(hasPlanFeature('alap', 'teamChatSecureAttachments')).toBe(false);
    expect(hasPlanFeature('pro', 'teamChatSecureAttachments')).toBe(false);
    expect(PLANNED_PRO_FEATURES).toContain('teamChatSecureAttachments');
  });

  it('requires an explicit later release flag before any entitlement or platform bypass can enable it', () => {
    expect(planAccess).toContain("feature === 'teamChatSecureAttachments'");
    expect(planAccess).toContain("process.env.TEAM_CHAT_SECURE_ATTACHMENTS_RELEASED === 'true'");

    const featureCheck = planAccess.indexOf('export async function hasCurrentPlanFeature');
    const releaseGate = planAccess.indexOf('if (!isRuntimeFeatureReleased(feature)) return false;', featureCheck);
    const platformBypass = planAccess.indexOf('if (await platformHasFullAccess()) return true;', featureCheck);
    expect(releaseGate).toBeGreaterThan(featureCheck);
    expect(platformBypass).toBeGreaterThan(releaseGate);

    const requireCheck = planAccess.indexOf('export async function requirePlanFeature');
    const requireReleaseGate = planAccess.indexOf('if (!isRuntimeFeatureReleased(feature)) redirect', requireCheck);
    const requirePlatformBypass = planAccess.indexOf("if (await platformHasFullAccess()) return 'pro'", requireCheck);
    expect(requireReleaseGate).toBeGreaterThan(requireCheck);
    expect(requirePlatformBypass).toBeGreaterThan(requireReleaseGate);
  });
});
