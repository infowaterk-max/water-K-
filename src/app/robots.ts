import type { MetadataRoute } from 'next';

export default function robots():MetadataRoute.Robots{
  const base=(process.env.NEXT_PUBLIC_SITE_URL??'https://water-k-native.vercel.app').replace(/\/$/,'');
  return {
    rules:[
      {userAgent:'*',allow:'/',disallow:['/admin/','/api/','/fiokom/','/kosar','/penztar','/rendeles-sikeres']},
    ],
    sitemap:`${base}/sitemap.xml`,
    host:base,
  };
}
