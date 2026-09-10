import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { addonCapabilityCode, isCapabilityReleased } from '@/lib/entitlements/catalog';
import { getFeatureEntitlementDecision, getFeatureEntitlementDecisions } from '@/lib/entitlements/access';
import { hasPlanFeature, isPlanCode, type FeatureCode, type PlanCode } from './catalog';
import { ADDONS, parseAddonList, type AddonCode } from './addons';

export async function getCurrentPlan(): Promise<PlanCode> {
  const configuredDefault = process.env.WEBSHOP_DEFAULT_PLAN;
  const fallback: PlanCode = isPlanCode(configuredDefault) ? configuredDefault : 'alap';
  const instance = await getCurrentWebshopInstance();
  if (instance) return instance.subscriptionPlan;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fallback;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return fallback;
  const { data } = await supabase.from('profiles').select('subscription_plan').eq('id', authData.user.id).maybeSingle();
  return isPlanCode(data?.subscription_plan) ? data.subscription_plan : fallback;
}

export function isRuntimeFeatureReleased(feature: FeatureCode): boolean {
  return isCapabilityReleased(feature);
}

export async function hasCurrentPlanFeature(feature: FeatureCode): Promise<boolean> {
  if (!isRuntimeFeatureReleased(feature)) return false;
  const instance=await getCurrentWebshopInstance();
  if(instance){
    const explicit=await getFeatureEntitlementDecision(instance.id,feature);
    return explicit?.enabled===true;
  }
  return hasPlanFeature(await getCurrentPlan(),feature);
}

export async function requirePlanFeature(feature: FeatureCode) {
  if (!isRuntimeFeatureReleased(feature)) redirect(`/admin/csomag?reason=not-released&feature=${encodeURIComponent(feature)}`);
  const plan=await getCurrentPlan();
  if (!(await hasCurrentPlanFeature(feature))) {
    const reason=plan==='alap'&&hasPlanFeature('pro',feature)?'pro-required':'feature-disabled';
    redirect(`/admin/csomag?reason=${reason}&feature=${encodeURIComponent(feature)}`);
  }
  return plan;
}

export async function getCurrentAddons(): Promise<AddonCode[]> {
  const [plan,instance] = await Promise.all([getCurrentPlan(),getCurrentWebshopInstance()]);
  if (instance) {
    const addonCodes=Object.keys(ADDONS) as AddonCode[];
    const capabilityCodes=addonCodes.map(addonCapabilityCode);
    const decisions=await getFeatureEntitlementDecisions(instance.id,capabilityCodes);
    return addonCodes.filter(addon=>
      ADDONS[addon].compatiblePlans.includes(plan)
      && decisions.get(addonCapabilityCode(addon))?.enabled===true
    );
  }
  const configured = parseAddonList(process.env.WEBSHOP_ENABLED_ADDONS);
  return configured.filter((addon) => ADDONS[addon].compatiblePlans.includes(plan));
}

export async function hasAddon(addon: AddonCode): Promise<boolean> {
  const instance=await getCurrentWebshopInstance();
  if(instance){
    const plan=await getCurrentPlan();
    if(!ADDONS[addon].compatiblePlans.includes(plan))return false;
    return (await getFeatureEntitlementDecision(instance.id,addonCapabilityCode(addon)))?.enabled===true;
  }
  return (await getCurrentAddons()).includes(addon);
}

export async function requireAddon(addon: AddonCode) {
  if (!(await hasAddon(addon))) redirect(`/admin/csomag?reason=addon-required&addon=${encodeURIComponent(addon)}`);
  return addon;
}
