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
  | 'contentMarketing'
  | 'importExport'
  | 'bulkOperations'
  | 'wishlists'
  | 'stockNotifications'
  | 'productRecommendations'
  | 'reviews'
  | 'searchFiltering'
  | 'commerceIntegrations'
  | 'support'
  | 'teamChat'
  | 'officeCommunication'
  | 'advancedAnalytics'
  | 'crm'
  | 'advancedCampaigns'
  | 'officeCommunicationAdvanced'
  | 'teamChatSecureAttachments'
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
  'teamChat',
  'officeCommunication',
] as const satisfies readonly FeatureCode[];

const PRO_FEATURES = [
  ...ALAP_FEATURES,
  'advancedAnalytics',
  'crm',
  'advancedCampaigns',
  'officeCommunicationAdvanced',
  'automation',
  'procurement',
  'cashflow',
  'executiveAnalytics',
  'advancedIntegrations',
  'apiAccess',
] as const satisfies readonly FeatureCode[];

/** Reserved feature codes remain typed but fail closed until a later explicit release. */
export const PLANNED_PRO_FEATURES = [
  'teamChatSecureAttachments',
] as const satisfies readonly FeatureCode[];

export const PLANS: Record<PlanCode, PlanDefinition> = {
  alap: {
    code: 'alap',
    name: 'Alap',
    description: 'Versenyképes, teljes értékű webshop a napi értékesítéshez, tartalomhoz, marketinghez, üzemeltetéshez, belső Team Chattel és normál ügyfél-e-mail levelezéssel.',
    features: ALAP_FEATURES,
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    description: 'Az Alap minden funkciója fejlett ügyféllevelezési csapatfunkciókkal, CRM-mel, automatizálással és üzleti döntéstámogatással.',
    features: PRO_FEATURES,
  },
};

export function isPlanCode(value: unknown): value is PlanCode {
  return value === 'alap' || value === 'pro';
}

export function hasPlanFeature(plan: PlanCode, feature: FeatureCode): boolean {
  return PLANS[plan].features.some((candidate) => candidate === feature);
}
