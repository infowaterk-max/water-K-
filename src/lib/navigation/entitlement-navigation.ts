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

/**
 * Temporary IA placement for the dedicated Visual Builder workspace.
 * Keep this outside MERCHANT_NAVIGATION so the upcoming admin-menu redesign
 * can move or remove the entry without coupling the Builder route to today's IA.
 */
const TEMPORARY_VISUAL_BUILDER_NAV_ITEM:AdminNavItem={
  id:'visual-builder',
  href:'/admin/tartalom/builder',
  label:'Webshop szerkesztő',
  description:'A webshop oldalainak vizuális szerkesztése, reszponzív nézetekkel, mentéssel és publikálással.',
  feature:'contentMarketing',
  permission:'store.manage',
  group:'Megjelenés',
};

export function resolveEntitledMerchantNavigation(
  hasFeature:AdminFeatureGate,
  can:(permission?:StorePermission)=>boolean,
  status?:AdminInstanceStatus,
  canCapability:(capability?:StoreCapability)=>boolean=()=>true,
):ResolvedAdminNavSection[]{
  return MERCHANT_NAVIGATION.map(section=>{
    const items=section.items.filter(item=>allowed(item,hasFeature,can,canCapability,status)).map(resolveItem);
    if(section.id==='content-appearance'&&allowed(TEMPORARY_VISUAL_BUILDER_NAV_ITEM,hasFeature,can,canCapability,status)){
      items.unshift(resolveItem(TEMPORARY_VISUAL_BUILDER_NAV_ITEM));
    }
    return{id:section.id,label:section.label,items};
  }).filter(section=>section.items.length>0);
}

export function resolveEntitledFrequentTasks(
  hasFeature:AdminFeatureGate,
  can:(permission?:StorePermission)=>boolean,
):ResolvedAdminNavItem[]{
  return FREQUENT_TASKS.filter(item=>allowed(item,hasFeature,can,()=>true)).map(resolveItem).slice(0,4);
}
