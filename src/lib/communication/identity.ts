import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance, type WebshopInstance } from '@/lib/instances/access';

export type CommunicationIdentity={instanceId:string;brandName:string;fromName:string;siteUrl:string;supportEmail:string|null;primaryColor:string};

function fromInstance(instance:WebshopInstance):CommunicationIdentity{
  const siteFallback=(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000').replace(/\/$/,'');
  const brandFallback=process.env.WEBSHOP_BRAND_NAME?.trim()||'Shoperation';
  return {
    instanceId:instance.id,
    brandName:instance.brand.name||brandFallback,
    fromName:instance.brand.emailFromName||instance.brand.name||brandFallback,
    siteUrl:(instance.brand.publicSiteUrl||siteFallback).replace(/\/$/,''),
    supportEmail:instance.brand.supportEmail||null,
    primaryColor:instance.brand.primaryColor||'#17231a',
  };
}

export async function getCommunicationIdentity():Promise<CommunicationIdentity>{
  const instance=await getCurrentWebshopInstance();
  if(!instance)throw new Error('COMMUNICATION_INSTANCE_REQUIRED');
  return fromInstance(instance);
}

export async function getCommunicationIdentityForInstance(instanceId:string):Promise<CommunicationIdentity>{
  const admin=createAdminClient();
  const{data,error}=await admin.from('webshop_instances')
    .select('id,organization_id,slug,name,subscription_plan,status,brand_name,brand_tagline,logo_url,primary_color,support_email,support_phone,public_site_url,email_from_name,storefront_config')
    .eq('id',instanceId).in('status',['pilot','active']).maybeSingle();
  if(error||!data)throw new Error('COMMUNICATION_INSTANCE_NOT_FOUND');
  const instance:WebshopInstance={
    id:data.id,organizationId:data.organization_id,slug:data.slug,name:data.name,subscriptionPlan:data.subscription_plan,
    status:data.status,brand:{name:data.brand_name?.trim()||data.name,tagline:data.brand_tagline,logoUrl:data.logo_url,primaryColor:data.primary_color,
      supportEmail:data.support_email,supportPhone:data.support_phone,publicSiteUrl:data.public_site_url,emailFromName:data.email_from_name},
    storefront:data.storefront_config&&typeof data.storefront_config==='object'&&!Array.isArray(data.storefront_config)?data.storefront_config:{},
  } as WebshopInstance;
  return fromInstance(instance);
}

export function brandedSubject(subject:string,brandName:string){
  const clean=subject.trim();
  return clean.startsWith(`${brandName} –`)||clean.startsWith(`${brandName}:`)?clean:`${brandName} – ${clean}`;
}
