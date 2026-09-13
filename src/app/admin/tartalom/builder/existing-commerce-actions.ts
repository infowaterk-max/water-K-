'use server';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {getStorefrontExistingCommerceBundleForInstance} from '@/lib/builder/storefront-existing-commerce-server';
export async function listExistingCommerceEngineOptionsAction(){const scope=await requireCurrentStoreContext('store.read');const bundle=await getStorefrontExistingCommerceBundleForInstance(scope.instanceId);return bundle.options;}
