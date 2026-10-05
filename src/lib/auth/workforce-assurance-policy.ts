export type WorkforcePlatformRole='owner'|'admin'|'operator'|null;
export type WorkforceStoreRole='owner'|'admin'|'catalog_manager'|'order_manager'|'marketing_manager'|'support'|'analyst'|'viewer';
export type WorkforceSensitiveBoundary='none'|'permissions'|'provider-credentials'|'integration-api'|'refund'|'security';

export type WorkforceAssurancePolicyInput={
  platformRole?:WorkforcePlatformRole;
  storeRoles?:readonly WorkforceStoreRole[];
  sensitiveBoundary?:WorkforceSensitiveBoundary;
};

export type WorkforceMfaStep='ready'|'enroll'|'challenge';

const WORKFORCE_SENSITIVE_BOUNDARIES:readonly WorkforceSensitiveBoundary[]=[
  'none','permissions','provider-credentials','integration-api','refund','security',
];

export function parseWorkforceSensitiveBoundary(value:unknown):WorkforceSensitiveBoundary|null{
  if(value===null||value===undefined||value==='')return'none';
  return typeof value==='string'&&(WORKFORCE_SENSITIVE_BOUNDARIES as readonly string[]).includes(value)
    ?value as WorkforceSensitiveBoundary
    :null;
}

export function combineWorkforceSensitiveBoundaries(
  ...boundaries:readonly WorkforceSensitiveBoundary[]
):WorkforceSensitiveBoundary{
  return boundaries.find(boundary=>boundary!=='none')??'none';
}

export function sensitiveBoundaryForWorkforceStoreRoles(
  storeRoles:readonly WorkforceStoreRole[],
):WorkforceSensitiveBoundary{
  if(storeRoles.includes('order_manager'))return'refund';
  return'none';
}

export function sensitiveBoundaryForWorkforcePermission(permission:string|null|undefined):WorkforceSensitiveBoundary{
  if(permission==='store.manage')return'security';
  if(permission==='integrations.manage')return'integration-api';
  if(permission==='orders.manage')return'refund';
  return'none';
}

export function requiredWorkforceTotpFactors({
  platformRole=null,
  storeRoles=[],
  sensitiveBoundary='none',
}:WorkforceAssurancePolicyInput):0|1|2{
  if(platformRole==='owner')return 2;
  if(platformRole==='admin')return 1;
  if(storeRoles.includes('owner')||storeRoles.includes('admin'))return 1;
  if(sensitiveBoundary!=='none')return 1;
  return 0;
}

export function resolveWorkforceMfaStep({
  requiredFactors,
  verifiedFactorCount,
  currentLevel,
}:{
  requiredFactors:number;
  verifiedFactorCount:number;
  currentLevel:string|null;
}):WorkforceMfaStep{
  if(requiredFactors<=0)return'ready';
  if(verifiedFactorCount<=0)return'enroll';
  if(currentLevel!=='aal2')return'challenge';
  if(verifiedFactorCount<requiredFactors)return'enroll';
  return'ready';
}
