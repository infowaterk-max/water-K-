export type PlanCode = 'alap' | 'pro';

export type FeatureCode =
  | 'catalog'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'coupons'
  | 'basicAnalytics'
  | 'integrations'
  | 'support'
  | 'advancedAnalytics'
  | 'crm'
  | 'campaigns'
  | 'communication'
  | 'automation'
  | 'procurement'
  | 'cashflow'
  | 'executiveAnalytics'
  | 'apiAccess';

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  description: string;
  features: readonly FeatureCode[];
};

const ALAP_FEATURES = [
  'catalog','inventory','orders','customers','coupons','basicAnalytics','integrations','support',
] as const satisfies readonly FeatureCode[];

const PRO_FEATURES = [
  ...ALAP_FEATURES,
  'advancedAnalytics','crm','campaigns','communication','automation','procurement','cashflow','executiveAnalytics','apiAccess',
] as const satisfies readonly FeatureCode[];

export const PLANS: Record<PlanCode, PlanDefinition> = {
  alap: {
    code: 'alap',
    name: 'Alap',
    description: 'Teljes értékű webshop a napi értékesítéshez és üzemeltetéshez.',
    features: ALAP_FEATURES,
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    description: 'Az Alap csomag minden funkciója fejlett üzleti, CRM és automatizálási eszközökkel.',
    features: PRO_FEATURES,
  },
};

export function isPlanCode(value: unknown): value is PlanCode {
  return value === 'alap' || value === 'pro';
}

export function hasPlanFeature(plan: PlanCode, feature: FeatureCode): boolean {
  return PLANS[plan].features.includes(feature as never);
}
