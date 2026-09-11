import rawPolicy from './commercial-policy.json';
import {ADDONS,type AddonCode} from './addons';
import {PLANS,type FeatureCode,type PlanCode} from './catalog';

export type CommercialCampaign='standard'|'founding';
export type CommercialBillingMode='usage'|'separate'|'custom';

type AddonCommercialPolicy={
  billingMode:CommercialBillingMode;
  variableCostRequired:boolean;
  fixedMonthlyNetHuf:number|null;
  includedCredits:number|null;
  overageNetHuf:number|null;
};

type CommercialPolicy={
  schemaVersion:number;
  currency:'HUF';
  vatMode:'net-plus-vat';
  plans:Record<PlanCode,{monthlyNetHuf:number;foundingMonthlyNetHuf:number}>;
  founding:{discountGuaranteeMonths:number;availability:'limited-launch-cohort'};
  trial:{durationDays:number;fullProductEvaluation:boolean;mutatesPersistedPlan:false};
  addons:Record<AddonCode,AddonCommercialPolicy>;
  providerContractOwner:'merchant';
  commercialAuthority:'informational-only-entitlements-remain-authoritative';
};

export const SHOPERATION_COMMERCIAL_POLICY=rawPolicy as CommercialPolicy;

export function getPlanMonthlyNetHuf(plan:PlanCode,campaign:CommercialCampaign='standard'){
  const price=SHOPERATION_COMMERCIAL_POLICY.plans[plan];
  return campaign==='founding'?price.foundingMonthlyNetHuf:price.monthlyNetHuf;
}

export function formatNetHuf(value:number){
  return `${new Intl.NumberFormat('hu-HU').format(value)} Ft + ÁFA`;
}

export function commercialAddonLabel(addon:AddonCode){
  const policy=SHOPERATION_COMMERCIAL_POLICY.addons[addon];
  if(policy.billingMode==='usage')return'Külön Add-on + használatalapú díj';
  if(policy.billingMode==='custom')return'Egyedi kereskedelmi ajánlat';
  return'Külön árazott Add-on';
}

export type CommercialCombinationInput={
  currentPlan:PlanCode;
  requiredFeatures:readonly FeatureCode[];
  requiredAddons:readonly AddonCode[];
  campaign?:CommercialCampaign;
  addonMonthlyNetHuf?:Partial<Record<AddonCode,number>>;
};

export type CommercialCombinationRecommendation={
  comparable:boolean;
  currentPlan:PlanCode;
  recommendedPlan:PlanCode|null;
  currentMonthlyNetHuf:number|null;
  recommendedMonthlyNetHuf:number|null;
  savingsNetHuf:number|null;
  missingAddonPrices:AddonCode[];
};

function supports(plan:PlanCode,requiredFeatures:readonly FeatureCode[],requiredAddons:readonly AddonCode[]){
  return requiredFeatures.every(feature=>PLANS[plan].features.includes(feature))
    &&requiredAddons.every(addon=>ADDONS[addon].compatiblePlans.includes(plan));
}

export function recommendCheaperCommercialCombination(input:CommercialCombinationInput):CommercialCombinationRecommendation{
  const campaign=input.campaign??'standard';
  const missingAddonPrices=input.requiredAddons.filter(addon=>{
    const policy=SHOPERATION_COMMERCIAL_POLICY.addons[addon];
    if(policy.billingMode==='usage'||policy.billingMode==='custom')return true;
    return input.addonMonthlyNetHuf?.[addon]==null&&policy.fixedMonthlyNetHuf==null;
  });
  if(missingAddonPrices.length){
    return{comparable:false,currentPlan:input.currentPlan,recommendedPlan:null,currentMonthlyNetHuf:null,recommendedMonthlyNetHuf:null,savingsNetHuf:null,missingAddonPrices};
  }
  const addonCost=input.requiredAddons.reduce((sum,addon)=>sum+(input.addonMonthlyNetHuf?.[addon]??SHOPERATION_COMMERCIAL_POLICY.addons[addon].fixedMonthlyNetHuf??0),0);
  const candidates=(['alap','pro'] as const).filter(plan=>supports(plan,input.requiredFeatures,input.requiredAddons)).map(plan=>({plan,total:getPlanMonthlyNetHuf(plan,campaign)+addonCost}));
  const current=candidates.find(candidate=>candidate.plan===input.currentPlan)??null;
  const recommended=[...candidates].sort((a,b)=>a.total-b.total)[0]??null;
  return{
    comparable:true,
    currentPlan:input.currentPlan,
    recommendedPlan:recommended?.plan??null,
    currentMonthlyNetHuf:current?.total??null,
    recommendedMonthlyNetHuf:recommended?.total??null,
    savingsNetHuf:current&&recommended?Math.max(0,current.total-recommended.total):null,
    missingAddonPrices:[],
  };
}
