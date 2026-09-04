import { NextResponse } from 'next/server';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { createPilotAcceptanceToken, PILOT_ACCEPTANCE_COOKIE, PILOT_ACCEPTANCE_MAX_AGE_SECONDS } from '@/lib/storefront/pilot-access';

function sameOrigin(request:Request){
  const origin=request.headers.get('origin');
  return !origin||origin===new URL(request.url).origin;
}

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const user=await getAdminRequestUser('store.read');
  if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const instance=await getCurrentWebshopInstance();
  if(!instance||instance.status!=='pilot')return NextResponse.json({error:'Nincs pilot webshop.'},{status:409});
  let token:string;
  try{token=createPilotAcceptanceToken(instance.id)}catch{return NextResponse.json({error:'A pilot acceptance munkamenet nem indítható.'},{status:503})}
  const response=NextResponse.redirect(new URL('/webaruhaz?pilot=acceptance',request.url),303);
  response.cookies.set(PILOT_ACCEPTANCE_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:PILOT_ACCEPTANCE_MAX_AGE_SECONDS});
  return response;
}
