import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/catalog-server';
import { getPublicContent } from '@/lib/content/server';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const instance=await getCurrentWebshopInstance();
  const deploymentHost=process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()||process.env.VERCEL_URL?.trim();
  const fallback=process.env.NEXT_PUBLIC_SITE_URL?.trim()||(deploymentHost?`https://${deploymentHost}`:'http://localhost:3000');
  const base=(instance?.brand.publicSiteUrl?.trim()||fallback).replace(/\/$/,'');
  const now=new Date();
  const staticRoutes=['','/webaruhaz','/blog','/szallitas-es-fizetes','/gyik','/kapcsolat','/aszf','/adatvedelem'];
  const [products,blog,landing]=await Promise.all([getProducts(),getPublicContent('blog'),getPublicContent('landing')]);
  return [
    ...staticRoutes.map((path,index)=>({url:`${base}${path}`,lastModified:now,changeFrequency:index===0?'weekly' as const:'monthly' as const,priority:index===0?1:index===1?0.9:0.5})),
    ...products.map(product=>({url:`${base}/termek/${product.slug}`,lastModified:now,changeFrequency:'weekly' as const,priority:0.8})),
    ...blog.map(item=>({url:`${base}/blog/${item.slug}`,lastModified:new Date(item.updatedAt),changeFrequency:'monthly' as const,priority:0.7})),
    ...landing.map(item=>({url:`${base}/oldal/${item.slug}`,lastModified:new Date(item.updatedAt),changeFrequency:'monthly' as const,priority:0.7})),
  ];
}
