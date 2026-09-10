import { ADDONS, isAddonCode, type AddonCode } from '@/lib/plans/addons';
import { PLANNED_PRO_FEATURES, PLANS, type FeatureCode } from '@/lib/plans/catalog';

export type AddonCapabilityCode = `addon:${AddonCode}`;
export type EntitlementCapabilityCode = FeatureCode | AddonCapabilityCode;
export type CapabilityReleaseState = 'released' | 'reserved' | 'unknown';

const releasedPlanFeatures = new Set<string>([
  ...PLANS.alap.features,
  ...PLANS.pro.features,
]);
const reservedFeatures = new Set<string>(PLANNED_PRO_FEATURES);

export function addonCapabilityCode(addon: AddonCode): AddonCapabilityCode {
  return `addon:${addon}`;
}

export function capabilityReleaseState(capabilityCode: string): CapabilityReleaseState {
  if (reservedFeatures.has(capabilityCode)) return 'reserved';
  if (releasedPlanFeatures.has(capabilityCode)) return 'released';
  if (capabilityCode.startsWith('addon:')) {
    const addonCode = capabilityCode.slice('addon:'.length);
    if (isAddonCode(addonCode) && ADDONS[addonCode]) return 'released';
  }
  return 'unknown';
}

export function isCapabilityReleased(capabilityCode: string): boolean {
  return capabilityReleaseState(capabilityCode) === 'released';
}
