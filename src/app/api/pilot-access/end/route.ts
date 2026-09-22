import { NextResponse } from 'next/server';
import { PILOT_ACCEPTANCE_COOKIE } from '@/lib/storefront/pilot-access';

function sameOrigin(request:Request){
  const origin=request.headers.get('origin');
  return !origin||origin===new URL(request.url).origin;
}

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const response=NextResponse.redirect(new URL('/hamarosan',request.url),303);
  response.cookies.set(PILOT_ACCEPTANCE_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
  return response;
}
