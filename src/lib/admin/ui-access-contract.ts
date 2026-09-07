import type { StorePermission } from '@/lib/auth/store-rbac';
import type { FeatureCode } from '@/lib/plans/catalog';

export const ADMIN_UI_ACCESS_CONTRACT_VERSION='shoporation.admin-ui-access.v1' as const;

export type AdminUiAccessMode='hidden'|'read-only'|'enabled'|'upgrade-required';
export type AdminUiAccessReason='audience'|'permission'|'feature'|'available';
export type AdminUiAudience='all'|'pilot';

/**
 * Stable, configuration-friendly access contract for admin/storefront components.
 * The requirement describes what a component needs; the inputs contain the
 * already-resolved runtime capability/RBAC state. Keeping those concerns split
 * makes the same contract reusable by the later Page Schema/Templates layer.
 */
export type AdminUiAccessRequirement={
  id:string;
  feature?:FeatureCode;
  readPermission?:StorePermission;
  managePermission?:StorePermission;
  audience?:AdminUiAudience;
};

export type AdminUiAccessInputs={
  featureEnabled?:boolean;
  canRead?:boolean;
  canManage?:boolean;
  audienceAllowed?:boolean;
};

export type AdminUiAccessDecision={
  contract:typeof ADMIN_UI_ACCESS_CONTRACT_VERSION;
  id:string;
  mode:AdminUiAccessMode;
  reason:AdminUiAccessReason;
  feature?:FeatureCode;
  readPermission?:StorePermission;
  managePermission?:StorePermission;
  featureEnabled:boolean;
  canRead:boolean;
  canManage:boolean;
  audienceAllowed:boolean;
};

export function resolveAdminUiAccess(
  requirement:AdminUiAccessRequirement,
  inputs:AdminUiAccessInputs={},
):AdminUiAccessDecision{
  const featureEnabled=inputs.featureEnabled??true;
  const canRead=inputs.canRead??true;
  const canManage=inputs.canManage??canRead;
  const audienceAllowed=inputs.audienceAllowed??true;
  const base={
    contract:ADMIN_UI_ACCESS_CONTRACT_VERSION,
    id:requirement.id,
    feature:requirement.feature,
    readPermission:requirement.readPermission,
    managePermission:requirement.managePermission,
    featureEnabled,
    canRead,
    canManage,
    audienceAllowed,
  };

  // Fail closed before capability upsell so unauthorized users do not learn
  // about components they are not allowed to read.
  if(!audienceAllowed)return{...base,mode:'hidden',reason:'audience'};
  if(requirement.readPermission&&!canRead)return{...base,mode:'hidden',reason:'permission'};
  if(requirement.feature&&!featureEnabled)return{...base,mode:'upgrade-required',reason:'feature'};
  if(requirement.managePermission&&!canManage)return{...base,mode:'read-only',reason:'permission'};
  return{...base,mode:'enabled',reason:'available'};
}
