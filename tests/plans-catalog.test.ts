import { describe, expect, it } from 'vitest';
import { hasPlanFeature, isPlanCode, PLANNED_PRO_FEATURES, PLANS, type FeatureCode } from '../src/lib/plans/catalog';

const ALAP_REQUIRED: FeatureCode[] = [
  'catalog',
  'inventory',
  'orders',
  'returns',
  'customers',
  'coupons',
  'basicAnalytics',
  'marketingBasics',
  'contentMarketing',
  'importExport',
  'bulkOperations',
  'wishlists',
  'stockNotifications',
  'productRecommendations',
  'reviews',
  'searchFiltering',
  'commerceIntegrations',
  'support',
];

const PRO_ONLY: FeatureCode[] = [
  'advancedAnalytics',
  'crm',
  'advancedCampaigns',
  'officeCommunication',
  'automation',
  'procurement',
  'cashflow',
  'executiveAnalytics',
  'advancedIntegrations',
];

describe('business plan entitlement matrix', () => {
  it('keeps every Alap capability enabled in both packages', () => {
    for (const feature of ALAP_REQUIRED) {
      expect(hasPlanFeature('alap', feature), `Alap should include ${feature}`).toBe(true);
      expect(hasPlanFeature('pro', feature), `Pro should inherit ${feature}`).toBe(true);
    }
  });

  it('keeps implemented Pro-only capabilities unavailable in Alap', () => {
    for (const feature of PRO_ONLY) {
      expect(hasPlanFeature('alap', feature), `Alap must not include ${feature}`).toBe(false);
      expect(hasPlanFeature('pro', feature), `Pro should include ${feature}`).toBe(true);
    }
  });

  it('keeps planned Pro capabilities disabled until implementation is complete', () => {
    expect(PLANNED_PRO_FEATURES).toContain('apiAccess');
    for (const feature of PLANNED_PRO_FEATURES) {
      expect(hasPlanFeature('alap', feature)).toBe(false);
      expect(hasPlanFeature('pro', feature)).toBe(false);
    }
  });

  it('prevents accidental package drift', () => {
    expect(new Set(PLANS.alap.features).size).toBe(ALAP_REQUIRED.length);
    expect(new Set(PLANS.pro.features).size).toBe(ALAP_REQUIRED.length + PRO_ONLY.length);
    for (const feature of PLANS.alap.features) {
      expect(PLANS.pro.features).toContain(feature);
    }
  });

  it('accepts only supported persisted package codes', () => {
    expect(isPlanCode('alap')).toBe(true);
    expect(isPlanCode('pro')).toBe(true);
    expect(isPlanCode('bronze')).toBe(false);
    expect(isPlanCode('gold')).toBe(false);
    expect(isPlanCode('')).toBe(false);
    expect(isPlanCode(null)).toBe(false);
  });
});
