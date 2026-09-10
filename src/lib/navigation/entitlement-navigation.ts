import type { StorePermission } from '@/lib/auth/store-rbac';
import type { StoreCapability } from '@/lib/auth/store-capabilities';
import type { FeatureCode } from '@/lib/plans/catalog';
import {
  FREQUENT_TASKS,
  MERCHANT_NAVIGATION,
  type AdminInstanceStatus,
  type AdminNavItem,
  type ResolvedAdminNavItem,
  type ResolvedAdminNavSection,
} from './admin-ia';

export type AdminFeatureGate=(feature:FeatureCode)=>boolean;

const audienceAllowed=(item:AdminNavItem,status?:AdminInstanceStatus)=>item.audience!=='pilot'||status==='pilot';
const allowed=(
  item:AdminNavItem,
  hasFeature:AdminFeatureGate,
  can:(permission?:StorePermission)=>boolean,
  canCapability:(capability?:StoreCapability)=>boolean,
  status?:AdminInstanceStatus,
)=>
  (!item.feature||hasFeature(item.feature))
  &&can(item.permission)
  &&canCapability(item.capability)
  &&audienceAllowed(item,status);

const resolveItem=(item:AdminNavItem):ResolvedAdminNavItem=>({
  id:item.id,
  href:item.href,
  label:item.label,
  description:item.description,
  group:item.group,
  reportFamily:item.reportFamily,
  evidenceKinds:item.evidenceKinds,
});

export function resolveEntitledMerchantNavigation(
  hasFeature:AdminFeatureGate,
  can:(permission?:StorePermission)=>boolean,
  status?:AdminInstanceStatus,
  canCapability:(capability?:StoreCapability)=>boolean=()=>true,
):ResolvedAdminNavSection[]{
  return MERCHANT_NAVIGATION.map(section=>({
    id:section.id,
    label:section.label,
    items:section.items.filter(item=>allowed(item,hasFeature,can,canCapability,status)).map(resolveItem),
  })).filter(section=>section.items.length>0);
}

export function resolveEntitledFrequentTasks(
  hasFeature:AdminFeatureGate,
  can:(permission?:StorePermission)=>boolean,
):ResolvedAdminNavItem[]{
  return FREQUENT_TASKS.filter(item=>allowed(item,hasFeature,can,()=>true)).map(resolveItem).slice(0,4);
}
