'use server';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {getFeatureEntitlementDecision} from '@/lib/entitlements/access';
import {getStorefrontReleaseCommerceBundleForInstance} from '@/lib/builder/storefront-release-commerce-server';
export async function listReleaseCommerceOptionsAction(){const scope=await requireCurrentStoreContext('store.read');const entitlement=await getFeatureEntitlementDecision(scope.instanceId,'releaseCommerce');if(entitlement?.enabled!==true)return[];return(await getStorefrontReleaseCommerceBundleForInstance(scope.instanceId)).options;}
