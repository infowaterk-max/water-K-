import {describe,expect,it} from 'vitest';
import {getPlanFeatureDenialReason,hasPlanFeature,isPlanCode,PLANNED_PRO_FEATURES,PLANS,isOfficeFeatureAllowedBySubscription,isStrictProOfficeFeature,type FeatureCode} from '../src/lib/plans/catalog';
const ALAP_REQUIRED:FeatureCode[]=['catalog','inventory','orders','returns','customers','coupons','basicAnalytics','marketingBasics','contentMarketing','importExport','bulkOperations','wishlists','stockNotifications','productRecommendations','reviews','searchFiltering','commerceIntegrations','support','officeCommunication','releaseCommerce'];
const PRO_ONLY:FeatureCode[]=['teamChat','advancedAnalytics','crm','advancedCampaigns','officeCommunicationAdvanced','automation','procurement','cashflow','executiveAnalytics','advancedIntegrations','apiAccess','interactiveSceneCommerce','recipeCommerce'];
describe('business plan entitlement matrix',()=>{
  it('keeps every Alap capability enabled in both packages',()=>{for(const feature of ALAP_REQUIRED){expect(hasPlanFeature('alap',feature),`Alap should include ${feature}`).toBe(true);expect(hasPlanFeature('pro',feature),`Pro should inherit ${feature}`).toBe(true);}});
  it('keeps implemented Pro-only capabilities unavailable in Alap',()=>{for(const feature of PRO_ONLY){expect(hasPlanFeature('alap',feature),`Alap must not include ${feature}`).toBe(false);expect(hasPlanFeature('pro',feature),`Pro should include ${feature}`).toBe(true);}});
  it('does not mislabel disabled Alap capabilities as Pro-required',()=>{expect(getPlanFeatureDenialReason('alap','importExport')).toBe('feature-disabled');expect(getPlanFeatureDenialReason('alap','catalog')).toBe('feature-disabled');expect(getPlanFeatureDenialReason('alap','advancedAnalytics')).toBe('pro-required');expect(getPlanFeatureDenialReason('pro','advancedAnalytics')).toBe('feature-disabled');});
  it('keeps Team Chat Pro-only and core customer email in both packages while Secure Attachments remains unreleased',()=>{expect(hasPlanFeature('alap','teamChat')).toBe(false);expect(hasPlanFeature('pro','teamChat')).toBe(true);expect(hasPlanFeature('alap','officeCommunication')).toBe(true);expect(hasPlanFeature('pro','officeCommunication')).toBe(true);expect(hasPlanFeature('alap','officeCommunicationAdvanced')).toBe(false);expect(hasPlanFeature('pro','officeCommunicationAdvanced')).toBe(true);expect(hasPlanFeature('alap','teamChatSecureAttachments')).toBe(false);expect(hasPlanFeature('pro','teamChatSecureAttachments')).toBe(false);expect(PLANNED_PRO_FEATURES).toContain('teamChatSecureAttachments');});
  it('denies Pro internal chat for Alap despite stale or external feature entitlement grants',()=>{
    expect(isStrictProOfficeFeature('teamChat')).toBe(true);
    expect(isStrictProOfficeFeature('officeCommunicationAdvanced')).toBe(true);
    for(const plan of ['alap',null,'legacy',undefined]){
      expect(isOfficeFeatureAllowedBySubscription(plan,'teamChat')).toBe(false);
      expect(isOfficeFeatureAllowedBySubscription(plan,'officeCommunicationAdvanced')).toBe(false);
    }
    expect(isOfficeFeatureAllowedBySubscription('pro','teamChat')).toBe(true);
    expect(isOfficeFeatureAllowedBySubscription('pro','officeCommunicationAdvanced')).toBe(true);
    for(const plan of ['alap','pro']){
      expect(isOfficeFeatureAllowedBySubscription(plan,'officeCommunication')).toBe(true);
      expect(isOfficeFeatureAllowedBySubscription(plan,'support')).toBe(true);
    }
    expect(getPlanFeatureDenialReason('alap','teamChat')).toBe('pro-required');
  });
  it('releases API Access only in Pro while planned capabilities remain disabled',()=>{expect(hasPlanFeature('alap','apiAccess')).toBe(false);expect(hasPlanFeature('pro','apiAccess')).toBe(true);expect(PLANNED_PRO_FEATURES).not.toContain('apiAccess');for(const feature of PLANNED_PRO_FEATURES){expect(hasPlanFeature('alap',feature)).toBe(false);expect(hasPlanFeature('pro',feature)).toBe(false);}});
  it('preserves accepted Street Drop package compatibility through shared Release Commerce',()=>{expect(hasPlanFeature('alap','releaseCommerce')).toBe(true);expect(hasPlanFeature('pro','releaseCommerce')).toBe(true);});
  it('prevents accidental package drift',()=>{expect(new Set(PLANS.alap.features).size).toBe(ALAP_REQUIRED.length);expect(new Set(PLANS.pro.features).size).toBe(ALAP_REQUIRED.length+PRO_ONLY.length);for(const feature of PLANS.alap.features)expect(PLANS.pro.features).toContain(feature);});
  it('accepts only supported persisted package codes',()=>{expect(isPlanCode('alap')).toBe(true);expect(isPlanCode('pro')).toBe(true);expect(isPlanCode('bronze')).toBe(false);expect(isPlanCode('gold')).toBe(false);expect(isPlanCode('')).toBe(false);expect(isPlanCode(null)).toBe(false);});
});
