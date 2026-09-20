import { NextResponse } from 'next/server';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createPilotAcceptanceToken,
  PILOT_ACCEPTANCE_COOKIE,
  PILOT_ACCEPTANCE_MAX_AGE_SECONDS,
} from '@/lib/storefront/pilot-access';

export const dynamic='force-dynamic';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request:Request,{params}:{params:Promise<{instanceId:string}>}){
  if(process.env.VERCEL_ENV!=='preview')return NextResponse.redirect(new URL('/admin/platform?acceptance=preview-only',request.url));
  const actor=await getAdminRequestUser('store.read');
  if(!actor)return NextResponse.redirect(new URL('/admin/login',request.url));
  const{instanceId}=await params;
  if(!UUID.test(instanceId))return NextResponse.redirect(new URL('/admin/platform?acceptance=invalid',request.url));

  const admin=createAdminClient();
  const{data:instance,error:instanceError}=await admin
    .from('webshop_instances')
    .select('id,organization_id,status')
    .eq('id',instanceId)
    .eq('status','pilot')
    .maybeSingle();
  if(instanceError||!instance?.organization_id)return NextResponse.redirect(new URL('/admin/platform?acceptance=not-found',request.url));

  const now=new Date().toISOString();
  const{data:bindings,error:bindingError}=await admin
    .from('role_bindings')
    .select('role_code,valid_from,valid_until,revoked_at,organization_id,instance_id')
    .eq('user_id',actor.id)
    .eq('organization_id',instance.organization_id)
    .or(`instance_id.eq.${instanceId},instance_id.is.null`)
    .is('revoked_at',null)
    .lte('valid_from',now);
  const allowed=!bindingError&&(bindings??[]).some(binding=>
    (binding.instance_id===instanceId||binding.instance_id===null)
    &&(binding.role_code==='owner'||binding.role_code==='admin')
    &&(!binding.valid_until||binding.valid_until>now)
  );
  if(!allowed)return NextResponse.redirect(new URL(`/admin/platform/acceptance/${instanceId}?reason=forbidden`,request.url));

  const{data:channel,error:channelError}=await admin
    .from('webshop_sales_channels')
    .select('enabled')
    .eq('instance_id',instanceId)
    .eq('channel_code','b2b')
    .maybeSingle();
  if(channelError||channel?.enabled!==true)return NextResponse.redirect(new URL(`/admin/platform/acceptance/${instanceId}?reason=b2b-channel`,request.url));

  let token:string;
  try{token=createPilotAcceptanceToken(instanceId)}
  catch{return NextResponse.redirect(new URL(`/admin/platform/acceptance/${instanceId}?reason=session`,request.url))}

  const response=NextResponse.redirect(new URL('/fiokom/ajanlatkeresek',request.url),303);
  response.cookies.set(PILOT_ACCEPTANCE_COOKIE,token,{
    httpOnly:true,
    secure:process.env.NODE_ENV==='production',
    sameSite:'lax',
    path:'/',
    maxAge:PILOT_ACCEPTANCE_MAX_AGE_SECONDS,
  });
  return response;
}
