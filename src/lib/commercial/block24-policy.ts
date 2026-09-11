import {addonCapabilityCode} from '@/lib/entitlements/catalog';

export const BLOCK24_COMMERCIAL_POLICY_VERSION='block24-v1';
export const STOREFRONT_AI_COMMERCIAL_CAPABILITY=addonCapabilityCode('ai-assistant');
export const STOREFRONT_AI_CREDIT_WINDOW_SECONDS=30*24*60*60;
export const STOREFRONT_AI_CREDIT_COST=1;
export const STOREFRONT_AI_CREDIT_LIMIT_ENV='SHOPERATION_AI_STOREFRONT_CREDITS_PER_30D';

export type StorefrontAiCommercialDecision=
  | {ok:true;creditLimit:number;windowSeconds:number;creditCost:1;policyVersion:string}
  | {ok:false;reason:'addon-required'|'credit-policy-not-configured'};

function parsePositiveCreditLimit(raw:string|undefined):number|null{
  const value=raw?.trim();
  if(!value||!/^\d{1,6}$/.test(value))return null;
  const parsed=Number(value);
  return Number.isSafeInteger(parsed)&&parsed>0&&parsed<=100000?parsed:null;
}

export function resolveStorefrontAiCommercialDecision(input:{
  entitled:boolean;
  configuredCredits:string|undefined;
}):StorefrontAiCommercialDecision{
  if(!input.entitled)return{ok:false,reason:'addon-required'};
  const creditLimit=parsePositiveCreditLimit(input.configuredCredits);
  if(creditLimit===null)return{ok:false,reason:'credit-policy-not-configured'};
  return{
    ok:true,
    creditLimit,
    windowSeconds:STOREFRONT_AI_CREDIT_WINDOW_SECONDS,
    creditCost:STOREFRONT_AI_CREDIT_COST,
    policyVersion:BLOCK24_COMMERCIAL_POLICY_VERSION,
  };
}
