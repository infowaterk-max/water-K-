import { NextResponse } from 'next/server';
import { getWorkforceRequestContext } from '@/lib/auth/admin-api';
import { resolveWorkforceMfaRequirement,type WorkforcePlatformRole,type WorkforceStoreRole } from '@/lib/auth/workforce-assurance-policy';

export const dynamic='force-dynamic';

function roleLabel(platformRole:WorkforcePlatformRole,storeRoles:readonly WorkforceStoreRole[]){
  if(platformRole==='owner')return'Platformtulajdonos';
  if(platformRole==='admin')return'Platform admin';
  if(platformRole==='operator')return'Platform operátor';
  if(storeRoles.includes('owner'))return'Webshop tulajdonos';
  if(storeRoles.includes('admin'))return'Webshop admin';
  if(storeRoles.includes('catalog_manager'))return'Katalóguskezelő';
  if(storeRoles.includes('order_manager'))return'Rendeléskezelő';
  if(storeRoles.includes('marketing_manager'))return'Marketing munkatárs';
  if(storeRoles.includes('support'))return'Ügyfélszolgálat';
  if(storeRoles.includes('analyst'))return'Elemző';
  return'Megtekintő';
}

export async function GET(){
  const context=await getWorkforceRequestContext();
  if(context.status==='unauthenticated')return NextResponse.json({error:'AUTH_REQUIRED'},{status:401});
  if(context.status==='forbidden')return NextResponse.json({error:'WORKFORCE_ACCESS_REQUIRED'},{status:403});
  if(context.status!=='authorized')return NextResponse.json({error:'WORKFORCE_CONTEXT_UNAVAILABLE'},{status:503});

  const storeRoles=context.storeRoles as WorkforceStoreRole[];
  const assurance=resolveWorkforceMfaRequirement(
    {platformRole:context.platformRole,storeRoles},
    process.env.WORKFORCE_MFA_MODE,
  );
  return NextResponse.json({
    platformRole:context.platformRole,
    storeRoles,
    requiredFactors:assurance.requiredFactors,
    policyRequiredFactors:assurance.policyRequiredFactors,
    mfaMode:assurance.mfaMode,
    roleLabel:roleLabel(context.platformRole,storeRoles),
    instanceName:context.instanceName,
  });
}
