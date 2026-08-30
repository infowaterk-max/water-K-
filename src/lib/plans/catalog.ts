export type PlanCode = 'alap' | 'pro';

export type FeatureCode =
  | 'catalog'
  | 'inventory'
  | 'orders'
  | 'returns'
  | 'customers'
  | 'coupons'
  | 'basicAnalytics'
  | 'marketingBasics'
  | 'commerceIntegrations'
  | 'support'
  | 'advancedAnalytics'
  | 'crm'
  | 'advancedCampaigns'
  | 'officeCommunication'
  | 'automation'
  | 'procurement'
  | 'cashflow'
  | 'executiveAnalytics'
  | 'advancedIntegrations'
  | 'apiAccess';

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  description: string;
  features: readonly FeatureCode[];
};

const ALAP_FEATURES = [
  'catalog',
  'inventory',
  'orders',
  'returns',
  'customers',
  'coupons',
  'basicAnalytics',
  'marketingBasics',
  'commerceIntegrations',
  'support',
] as const satisfies readonly FeatureCode[];

const PRO_FEATURES = [
  ...ALAP_FEATURES,
  'advancedAnalytics',
  'crm',
  'advancedCampaigns',
  'officeCommunication',
  'automation',
  'procurement',
  'cashflow',
  'executiveAnalytics',
  'advancedIntegrations',
  'apiAccess',
] as const satisfies readonly FeatureCode[];

export const PLANS: Record<PlanCode, PlanDefinition> = {
  alap: {
    code: 'alap',
    name: 'Alap',
    description: 'Versenyképes, teljes értékű webshop a napi értékesítéshez, marketinghez és üzemeltetéshez.',
    features: ALAP_FEATURES,
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    description: 'Az Alap minden funkciója digitális irodával, fejlett CRM-mel, automatizálással és üzleti döntéstámogatással.',
    features: PRO_FEATURES,
  },
};

export function isPlanCode(value: unknown): value is PlanCode {
  return value === 'alap' || value === 'pro';
}

export function hasPlanFeature(plan: PlanCode, feature: FeatureCode): boolean {
  return PLANS[plan].features.some((candidate) => candidate === feature);
}
