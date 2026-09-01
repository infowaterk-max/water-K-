import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getPlatformRole } from '@/lib/auth/platform-operator';
import { getFeatureEntitlementDecision } from '@/lib/entitlements/access';
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

async function platformHasFullAccess() {
  try { return (await getPlatformRole()) !== null; } catch { return false; }
}

export async function hasCurrentPlanFeature(feature: FeatureCode): Promise<boolean> {
  if (await platformHasFullAccess()) return true;
  const instance=await getCurrentWebshopInstance();
  if(instance){
    const explicit=await getFeatureEntitlementDecision(instance.id,feature);
    if(explicit!==null)return explicit.enabled;
    return hasPlanFeature(instance.subscriptionPlan,feature);
  }
  return hasPlanFeature(await getCurrentPlan(),feature);
}

export async function requirePlanFeature(feature: FeatureCode) {
  if (await platformHasFullAccess()) return 'pro' satisfies PlanCode;
  const plan=await getCurrentPlan();
  if (!(await hasCurrentPlanFeature(feature))) redirect(`/admin/csomag?reason=pro-required&feature=${encodeURIComponent(feature)}`);
  return plan;
}

export async function getCurrentAddons(): Promise<AddonCode[]> {
  const [plan,instance] = await Promise.all([getCurrentPlan(),getCurrentWebshopInstance()]);
  if (instance) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.from('webshop_instance_addons').select('addon_code').eq('instance_id',instance.id).eq('enabled',true);
      const enabled = parseAddonList((data??[]).map(row=>row.addon_code).join(','));
      return enabled.filter(addon=>ADDONS[addon].compatiblePlans.includes(plan));
    } catch { return []; }
  }
  const configured = parseAddonList(process.env.WEBSHOP_ENABLED_ADDONS);
  return configured.filter((addon) => ADDONS[addon].compatiblePlans.includes(plan));
}

export async function hasAddon(addon: AddonCode): Promise<boolean> {
  const enabled = await getCurrentAddons();
  return enabled.includes(addon);
}

export async function requireAddon(addon: AddonCode) {
  if (!(await hasAddon(addon))) redirect(`/admin/csomag?reason=addon-required&addon=${encodeURIComponent(addon)}`);
  return addon;
}
