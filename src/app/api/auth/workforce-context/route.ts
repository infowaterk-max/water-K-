import { NextResponse } from 'next/server';
import { getWorkforceRequestContext } from '@/lib/auth/admin-api';
import {
  parseWorkforceSensitiveBoundary,
  type WorkforcePlatformRole,
  type WorkforceStoreRole,
} from '@/lib/auth/workforce-assurance-policy';

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

export async function GET(request:Request){
  const rawBoundary=new URL(request.url).searchParams.get('boundary');
  const requestedBoundary=parseWorkforceSensitiveBoundary(rawBoundary);
  if(requestedBoundary===null){
    return NextResponse.json({error:'WORKFORCE_BOUNDARY_INVALID'},{status:400});
  }

  const context=await getWorkforceRequestContext(requestedBoundary);
  if(context.status==='unauthenticated')return NextResponse.json({error:'AUTH_REQUIRED'},{status:401});
  if(context.status==='forbidden')return NextResponse.json({error:'WORKFORCE_ACCESS_REQUIRED'},{status:403});
  if(context.status!=='authorized')return NextResponse.json({error:'WORKFORCE_CONTEXT_UNAVAILABLE'},{status:503});

  const storeRoles=context.storeRoles as WorkforceStoreRole[];
  return NextResponse.json({
    platformRole:context.platformRole,
    storeRoles,
    requiredFactors:context.requiredFactors,
    sensitiveBoundary:context.sensitiveBoundary,
    roleLabel:roleLabel(context.platformRole,storeRoles),
    instanceName:context.instanceName,
  });
}
