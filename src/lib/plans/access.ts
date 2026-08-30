import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasPlanFeature, isPlanCode, type FeatureCode, type PlanCode } from './catalog';

export async function getCurrentPlan(): Promise<PlanCode> {
  const configuredDefault = process.env.WEBSHOP_DEFAULT_PLAN;
  const fallback: PlanCode = isPlanCode(configuredDefault) ? configuredDefault : 'pro';

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fallback;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return fallback;

  const { data } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', authData.user.id)
    .maybeSingle();

  return isPlanCode(data?.subscription_plan) ? data.subscription_plan : fallback;
}

export async function requirePlanFeature(feature: FeatureCode) {
  const plan = await getCurrentPlan();
  if (!hasPlanFeature(plan, feature)) redirect('/admin?reason=pro-required');
  return plan;
}
