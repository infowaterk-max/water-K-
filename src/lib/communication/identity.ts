import 'server-only';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export type CommunicationIdentity={brandName:string;fromName:string;siteUrl:string;supportEmail:string|null;primaryColor:string};

export async function getCommunicationIdentity():Promise<CommunicationIdentity>{
  const instance=await getCurrentWebshopInstance();
  const siteFallback=(process.env.NEXT_PUBLIC_SITE_URL||'https://waterk.hu').replace(/\/$/,'');
  return {
    brandName:instance?.brand.name||'Water-K',
    fromName:instance?.brand.emailFromName||instance?.brand.name||'Water-K',
    siteUrl:(instance?.brand.publicSiteUrl||siteFallback).replace(/\/$/,''),
    supportEmail:instance?.brand.supportEmail||null,
    primaryColor:instance?.brand.primaryColor||'#17231a',
  };
}

export function brandedSubject(subject:string,brandName:string){return subject.replaceAll('Water-K',brandName);}
