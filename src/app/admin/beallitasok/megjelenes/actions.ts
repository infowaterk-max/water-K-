'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';

const target=(state:string)=>`/admin/beallitasok/megjelenes?social=${state}`;
const providers=['facebook','instagram','youtube','tiktok','x','twitch','linkedin','pinterest'] as const;
type Provider=typeof providers[number];
const providerHosts:Record<Provider,readonly string[]>={
  facebook:['facebook.com'],instagram:['instagram.com'],youtube:['youtube.com'],tiktok:['tiktok.com'],x:['x.com'],twitch:['twitch.tv'],linkedin:['linkedin.com'],pinterest:['pinterest.com'],
};
const hostMatches=(host:string,allowed:readonly string[])=>allowed.some(domain=>host===domain||host.endsWith(`.${domain}`));

function normalizeUrl(provider:Provider,value:FormDataEntryValue|null){
  const raw=String(value??'').trim();
  if(!raw)return null;
  if(raw.length>500)return undefined;
  try{
    const parsed=new URL(raw);
    if(parsed.protocol!=='https:'||!hostMatches(parsed.hostname.toLowerCase(),providerHosts[provider]))return undefined;
    return parsed.toString();
  }catch{return undefined}
}

export async function updateStorefrontSocialLinksAction(formData:FormData){
  const actor=await getAdminRequestUser('store.manage');
  if(!actor)redirect(target('forbidden'));
  const scope=await requireCurrentStoreContext('store.manage');
  const socialLinks:Record<string,string>={};
  for(const provider of providers){
    const value=normalizeUrl(provider,formData.get(provider));
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
