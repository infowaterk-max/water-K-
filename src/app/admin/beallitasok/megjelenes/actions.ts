'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';

const target=(state:string)=>`/admin/beallitasok/megjelenes?social=${state}`;
const providers=['facebook','instagram','youtube','tiktok','linkedin'] as const;

function normalizeUrl(value:FormDataEntryValue|null){
  const raw=String(value??'').trim();
  if(!raw)return null;
  if(raw.length>500)return undefined;
  try{
    const parsed=new URL(raw);
    if(parsed.protocol!=='https:'&&parsed.protocol!=='http:')return undefined;
    return parsed.toString();
  }catch{return undefined}
}

export async function updateStorefrontSocialLinksAction(formData:FormData){
  const actor=await getAdminRequestUser('store.manage');
  if(!actor)redirect(target('forbidden'));
  const scope=await requireCurrentStoreContext('store.manage');
  const socialLinks:Record<string,string>={};
  for(const provider of providers){
    const value=normalizeUrl(formData.get(provider));
    if(value===undefined)redirect(target('invalid'));
    if(value)socialLinks[provider]=value;
  }
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_mutate_storefront_social_links_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_social_links:socialLinks,
  });
  const evidence=(data??{}) as {instanceId?:string};
  if(error||evidence.instanceId!==scope.instanceId){
    console.error('storefront social settings persistence failed',error?.message??'missing evidence');
    redirect(target('error'));
  }
  revalidatePath('/admin/beallitasok/megjelenes');
  revalidatePath('/','layout');
  redirect(target('saved'));
}
