import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {getFeatureEntitlementDecisions} from '@/lib/entitlements/access';
import {isPlanCode,PLANS,type FeatureCode,type PlanCode} from '@/lib/plans/catalog';
import type {StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';

const ENTITLEMENT_GATED_STOREFRONT_FEATURES=['interactiveSceneCommerce','recipeCommerce','releaseCommerce'] as const satisfies readonly FeatureCode[];
const gatedSet=new Set<FeatureCode>(ENTITLEMENT_GATED_STOREFRONT_FEATURES);
async function resolvePlan(instanceId:string,knownPlan?:PlanCode):Promise<PlanCode|null>{if(knownPlan)return knownPlan;const admin=createAdminClient();const{data,error}=await admin.from('webshop_instances').select('subscription_plan').eq('id',instanceId).maybeSingle();if(error||!isPlanCode(data?.subscription_plan))return null;return data.subscription_plan;}
/** Ordinary plan features keep plan authority; Special Commerce additionally requires DB entitlement and fails closed. */
export async function getStorefrontRuntimeCapabilityForInstance(instanceId:string,knownPlan?:PlanCode):Promise<StorefrontRuntimeCapabilityContext|null>{const plan=await resolvePlan(instanceId,knownPlan);if(!plan)return null;const planned=[...PLANS[plan].features];const decisions=await getFeatureEntitlementDecisions(instanceId,ENTITLEMENT_GATED_STOREFRONT_FEATURES);const features=planned.filter(feature=>!gatedSet.has(feature)||decisions.get(feature)?.enabled===true);return{plan,features};}
