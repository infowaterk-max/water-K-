'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createPilotAcceptanceToken,
  PILOT_ACCEPTANCE_COOKIE,
  PILOT_ACCEPTANCE_MAX_AGE_SECONDS,
} from '@/lib/storefront/pilot-access';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugify=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

export async function startPlatformPilotAcceptanceAction(formData:FormData){
  if(process.env.VERCEL_ENV!=='preview')redirect('/admin/platform?acceptance=preview-only');
  const actor=await requirePlatformOperator();
  const instanceId=String(formData.get('instanceId')??'').trim();
  const flow=String(formData.get('flow')??'builder').trim();
  if(!UUID.test(instanceId))redirect('/admin/platform?acceptance=invalid');

  const admin=createAdminClient();
  const{data:instance,error:instanceError}=await admin
    .from('webshop_instances')
    .select('id,organization_id,status')
    .eq('id',instanceId)
    .eq('status','pilot')
    .maybeSingle();
  if(instanceError||!instance?.organization_id)redirect('/admin/platform?acceptance=not-found');

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
  if(!allowed)redirect(`/admin/platform/acceptance/${instanceId}?reason=forbidden`);

  let token:string;
  try{token=createPilotAcceptanceToken(instanceId)}
  catch{redirect(`/admin/platform/acceptance/${instanceId}?reason=session`)}

  const store=await cookies();
  store.set(PILOT_ACCEPTANCE_COOKIE,token,{
    httpOnly:true,
    secure:process.env.NODE_ENV==='production',
    sameSite:'lax',
    path:'/',
    maxAge:PILOT_ACCEPTANCE_MAX_AGE_SECONDS,
  });
  if(flow==='checkout')redirect(`/admin/platform/acceptance/${instanceId}/checkout`);
  if(flow==='b2b-rfq'){
    const{data:channel,error:channelError}=await admin
      .from('webshop_sales_channels')
      .select('enabled')
      .eq('instance_id',instanceId)
      .eq('channel_code','b2b')
      .maybeSingle();
    if(channelError||channel?.enabled!==true)redirect(`/admin/platform/acceptance/${instanceId}?reason=b2b-channel`);

    const{data:visible,error:visibleError}=await admin
      .from('product_channel_settings')
      .select('product_id')
      .eq('instance_id',instanceId)
      .eq('channel_code','b2b')
      .eq('visible',true)
      .limit(1);
    const productId=visible?.[0]?.product_id;
    if(visibleError||!productId)redirect(`/admin/platform/acceptance/${instanceId}?reason=b2b-product`);

    const{data:variant,error:variantError}=await admin
      .from('product_variants')
      .select('id,label,active,products!inner(slug,active)')
      .eq('instance_id',instanceId)
      .eq('product_id',productId)
      .eq('active',true)
      .eq('products.active',true)
      .order('created_at',{ascending:true})
      .limit(1)
      .maybeSingle();
    const product=variant?.products as unknown as{slug?:string}|null;
    if(variantError||!variant?.id||!product?.slug)redirect(`/admin/platform/acceptance/${instanceId}?reason=b2b-product`);
    const suffix=slugify(String(variant.label??''))||slugify(String(variant.id));
    redirect(`/termek/${product.slug}${suffix?`-${suffix}`:''}`);
  }
  redirect('/admin/tartalom/builder?page=home&acceptance=platform');
}
