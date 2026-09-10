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
  | 'advancedAnalytics'
  | 'crm'
  | 'advancedCampaigns'
  | 'officeCommunication'
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
] as const satisfies readonly FeatureCode[];

/**
 * Reserved feature codes stay typed so their completed foundations can remain in
 * the codebase, but they are not active plan entitlements until a later release
 * explicitly enables them. Secure Attachments is intentionally dormant at launch.
 */
export const PLANNED_PRO_FEATURES = [
  'teamChatSecureAttachments',
  'apiAccess',
] as const satisfies readonly FeatureCode[];

export const PLANS: Record<PlanCode, PlanDefinition> = {
  alap: {
    code: 'alap',
    name: 'Alap',
    description: 'Versenyképes, teljes értékű webshop a napi értékesítéshez, tartalomhoz, marketinghez, üzemeltetéshez és belső Team Chattel.',
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
