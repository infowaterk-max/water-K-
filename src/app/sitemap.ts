import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/catalog-server';

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=(process.env.NEXT_PUBLIC_SITE_URL??'https://water-k-native.vercel.app').replace(/\/$/,'');
  const now=new Date();
  const staticRoutes=['','/webaruhaz','/szallitas-es-fizetes','/gyik','/kapcsolat','/aszf','/adatvedelem'];
  const products=await getProducts();
  return [
    ...staticRoutes.map((path,index)=>({url:`${base}${path}`,lastModified:now,changeFrequency:index===0?'weekly' as const:'monthly' as const,priority:index===0?1:index===1?0.9:0.5})),
    ...products.map(product=>({url:`${base}/termek/${product.slug}`,lastModified:now,changeFrequency:'weekly' as const,priority:0.8})),
  ];
}
