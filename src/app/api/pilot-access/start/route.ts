import { NextResponse } from 'next/server';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { createAdminClient } from '@/lib/supabase/admin';
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


const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const previewTargets:Record<string,string>={
  'b2b-rfq':'/fiokom/ajanlatkeresek',
  sales:'/admin/ertekesites',
  returns:'/admin/visszaru',
  storefront:'/webaruhaz?pilot=acceptance',
};

export async function GET(request:Request){
  if(process.env.VERCEL_ENV!=='preview')return NextResponse.json({error:'A közvetlen pilot acceptance belépő csak Preview környezetben érhető el.'},{status:404});
  const actor=await getAdminRequestUser('store.read');
  if(!actor)return NextResponse.redirect(new URL('/fiokom?reason=login',request.url),303);

  const url=new URL(request.url),instanceId=(url.searchParams.get('instanceId')??'').trim(),next=(url.searchParams.get('next')??'storefront').trim();
  if(!UUID.test(instanceId)||!previewTargets[next])return NextResponse.json({error:'Érvénytelen pilot acceptance kérés.'},{status:400});

  const admin=createAdminClient();
  const{data:instance,error:instanceError}=await admin
    .from('webshop_instances')
    .select('id,organization_id,status')
    .eq('id',instanceId)
    .eq('status','pilot')
    .maybeSingle();
  if(instanceError||!instance?.organization_id)return NextResponse.json({error:'A pilot webshop nem található.'},{status:404});

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
  if(!allowed)return NextResponse.json({error:'Ehhez a pilot webshophoz nincs aktív owner/admin tenant-binding.'},{status:403});

  if(next==='b2b-rfq'){
    const{data:channel,error:channelError}=await admin
      .from('webshop_sales_channels')
      .select('enabled')
      .eq('instance_id',instanceId)
      .eq('channel_code','b2b')
      .maybeSingle();
    if(channelError||channel?.enabled!==true)return NextResponse.json({error:'A B2B értékesítési csatorna nem aktív.'},{status:409});
  }

  let token:string;
  try{token=createPilotAcceptanceToken(instanceId)}
  catch{return NextResponse.json({error:'A pilot acceptance munkamenet nem indítható.'},{status:503})}

  const response=NextResponse.redirect(new URL(previewTargets[next],request.url),303);
  response.cookies.set(PILOT_ACCEPTANCE_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:PILOT_ACCEPTANCE_MAX_AGE_SECONDS});
  return response;
}
