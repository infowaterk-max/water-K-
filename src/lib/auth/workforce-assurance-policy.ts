export type WorkforcePlatformRole='owner'|'admin'|'operator'|null;
export type WorkforceStoreRole='owner'|'admin'|'catalog_manager'|'order_manager'|'marketing_manager'|'support'|'analyst'|'viewer';
export type WorkforceSensitiveBoundary='none'|'permissions'|'provider-credentials'|'integration-api'|'refund'|'security';
export type WorkforceMfaActivationMode='prepared'|'enforced';

export type WorkforceAssurancePolicyInput={
  platformRole?:WorkforcePlatformRole;
  storeRoles?:readonly WorkforceStoreRole[];
  sensitiveBoundary?:WorkforceSensitiveBoundary;
};

export type WorkforceMfaStep='ready'|'enroll'|'challenge';

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

export function resolveWorkforceMfaActivationMode(value:string|null|undefined):WorkforceMfaActivationMode{
  return String(value??'').trim()==='enforced'?'enforced':'prepared';
}

export function resolveWorkforceMfaRequirement(
  input:WorkforceAssurancePolicyInput,
  activationValue:string|null|undefined,
):{
  mfaMode:WorkforceMfaActivationMode;
  policyRequiredFactors:0|1|2;
  requiredFactors:0|1|2;
}{
  const mfaMode=resolveWorkforceMfaActivationMode(activationValue);
  const policyRequiredFactors=requiredWorkforceTotpFactors(input);
  return{
    mfaMode,
    policyRequiredFactors,
    requiredFactors:mfaMode==='enforced'?policyRequiredFactors:0,
  };
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
