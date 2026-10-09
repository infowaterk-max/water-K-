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
  | 'apiAccess'
  | 'interactiveSceneCommerce'
  | 'recipeCommerce'
  | 'releaseCommerce';

export type PlanDefinition = {code:PlanCode;name:string;description:string;features:readonly FeatureCode[];};
export type PlanFeatureDenialReason='pro-required'|'feature-disabled';

const ALAP_FEATURES = [
  'catalog','inventory','orders','returns','customers','coupons','basicAnalytics','marketingBasics','contentMarketing','importExport','bulkOperations','wishlists','stockNotifications','productRecommendations','reviews','searchFiltering','commerceIntegrations','support','officeCommunication','releaseCommerce',
] as const satisfies readonly FeatureCode[];

const PRO_FEATURES = [
  ...ALAP_FEATURES,
  'teamChat','advancedAnalytics','crm','advancedCampaigns','officeCommunicationAdvanced','automation','procurement','cashflow','executiveAnalytics','advancedIntegrations','apiAccess','interactiveSceneCommerce','recipeCommerce',
] as const satisfies readonly FeatureCode[];

/** Reserved feature codes remain typed but fail closed until a later explicit release. */
export const PLANNED_PRO_FEATURES = ['teamChatSecureAttachments'] as const satisfies readonly FeatureCode[];

/** Internal staff chat and advanced office workflow must never be granted by an Alap
 * entitlement row, including legacy plan sync or higher-priority manual/trial grants.
 * Core transactional customer email uses officeCommunication and is not included here. */
export const STRICT_PRO_OFFICE_FEATURES = ['teamChat','officeCommunicationAdvanced'] as const satisfies readonly FeatureCode[];
export function isStrictProOfficeFeature(feature:string):boolean{
  return STRICT_PRO_OFFICE_FEATURES.some(code=>code===feature);
}
export function isOfficeFeatureAllowedBySubscription(subscriptionPlan:unknown,feature:string):boolean{
  return !isStrictProOfficeFeature(feature)||subscriptionPlan==='pro';
}


export const PLANS: Record<PlanCode, PlanDefinition> = {
  alap:{code:'alap',name:'Alap',description:'Versenyképes, teljes értékű webshop a napi értékesítéshez, tartalomhoz, marketinghez, üzemeltetéshez, normál ügyfél-e-mail kommunikációval.',features:ALAP_FEATURES},
  pro:{code:'pro',name:'Pro',description:'Az Alap minden funkciója fejlett ügyféllevelezési csapatfunkciókkal, CRM-mel, automatizálással és üzleti döntéstámogatással.',features:PRO_FEATURES},
};
export function isPlanCode(value:unknown):value is PlanCode{return value==='alap'||value==='pro';}
export function hasPlanFeature(plan:PlanCode,feature:FeatureCode):boolean{return PLANS[plan].features.some(candidate=>candidate===feature);}
export function getPlanFeatureDenialReason(plan:PlanCode,feature:FeatureCode):PlanFeatureDenialReason{
  return plan==='alap'&&!hasPlanFeature('alap',feature)&&hasPlanFeature('pro',feature)?'pro-required':'feature-disabled';
}
