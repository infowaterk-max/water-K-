import 'server-only';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export type CommunicationIdentity={brandName:string;fromName:string;siteUrl:string;supportEmail:string|null;primaryColor:string};

export async function getCommunicationIdentity():Promise<CommunicationIdentity>{
  const instance=await getCurrentWebshopInstance();
  const siteFallback=(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000').replace(/\/$/,'');
  const brandFallback=process.env.WEBSHOP_BRAND_NAME?.trim()||'Shoperation';
  return {
    brandName:instance?.brand.name||brandFallback,
    fromName:instance?.brand.emailFromName||instance?.brand.name||brandFallback,
    siteUrl:(instance?.brand.publicSiteUrl||siteFallback).replace(/\/$/,''),
    supportEmail:instance?.brand.supportEmail||null,
    primaryColor:instance?.brand.primaryColor||'#17231a',
  };
}

export function brandedSubject(subject:string,brandName:string){
  const clean=subject.trim();
  return clean.startsWith(`${brandName} –`)||clean.startsWith(`${brandName}:`)?clean:`${brandName} – ${clean}`;
}
