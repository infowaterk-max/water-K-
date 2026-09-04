'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';

const uuid=z.string().uuid();
const discountPercent=z.number().min(0).max(100);

async function channelAccess(){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)throw new Error('Nincs jogosultság.');
  const scope=await requireCurrentStoreContext('catalog.manage');
  return{actor,scope,admin:createAdminClient()};
}

function refreshSalesChannelViews(){
  revalidatePath('/admin/termekek');
  revalidatePath('/webaruhaz');
  revalidatePath('/penztar');
}

export async function setB2BChannelEnabledAction(formData:FormData){
  const enabled=String(formData.get('enabled')??'false')==='true';
  const{actor,scope,admin}=await channelAccess();
  const{data,error}=await admin.rpc('admin_mutate_sales_channel_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_action:'set_channel_enabled',
    p_payload:{channel:'b2b',enabled},
  });
  if(error)throw new Error('A B2B mód módosítása nem sikerült.');
  const result=(data??{}) as {channel?:string;enabled?:boolean};
  if(result.channel!=='b2b'||result.enabled!==enabled)throw new Error('A B2B mód mentése nem igazolható.');
  refreshSalesChannelViews();
}

export async function setB2BProductVisibilityAction(formData:FormData){
  const parsed=uuid.safeParse(String(formData.get('productId')??''));
  if(!parsed.success)throw new Error('Érvénytelen termékazonosító.');
  const visible=String(formData.get('visible')??'false')==='true';
  const{actor,scope,admin}=await channelAccess();
  const{data,error}=await admin.rpc('admin_mutate_sales_channel_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_action:'set_product_visibility',
    p_payload:{channel:'b2b',productId:parsed.data,visible},
  });
  if(error)throw new Error('A B2B termékláthatóság módosítása nem sikerült.');
  const result=(data??{}) as {channel?:string;productId?:string;visible?:boolean};
  if(result.channel!=='b2b'||result.productId!==parsed.data||result.visible!==visible)throw new Error('A B2B termékláthatóság mentése nem igazolható.');
  refreshSalesChannelViews();
}

export async function setB2CProductPromotionAction(formData:FormData){
  const product=uuid.safeParse(String(formData.get('productId')??''));
  if(!product.success)throw new Error('Érvénytelen termékazonosító.');
  const clear=String(formData.get('clear')??'false')==='true';
  const raw=String(formData.get('discountPercent')??'').trim().replace(',','.');
  const parsed=clear?null:discountPercent.safeParse(Number(raw));
  if(!clear&&(!parsed||!parsed.success))throw new Error('Az akció százaléka 0 és 100 közötti szám legyen.');
  const value=clear?null:parsed!.data;
  const{actor,scope,admin}=await channelAccess();
  const{data,error}=await admin.rpc('admin_set_product_promotion_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_product_id:product.data,
    p_discount_percent:value,
  });
  if(error)throw new Error('Az akció módosítása nem sikerült.');
  const result=(data??{}) as {productId?:string;channel?:string;discountPercent?:number|null};
  const saved=result.discountPercent==null?null:Number(result.discountPercent);
  if(result.productId!==product.data||result.channel!=='b2c'||saved!==value)throw new Error('Az akció mentése nem igazolható.');
  refreshSalesChannelViews();
}
