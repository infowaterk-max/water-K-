import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicContentBySlug } from '@/lib/content/server';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export const dynamic='force-dynamic';

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params,item=await getPublicContentBySlug('landing',slug);
  if(!item)return{};
  return{title:item.seoTitle??item.title,description:item.seoDescription??item.excerpt??undefined,alternates:{canonical:`/oldal/${item.slug}`},openGraph:{type:'website',title:item.seoTitle??item.title,description:item.seoDescription??item.excerpt??undefined,url:`/oldal/${item.slug}`}};
}

export default async function LandingPage({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params,item=await getPublicContentBySlug('landing',slug);if(!item)notFound();
  const instance=await getCurrentWebshopInstance();
  const base=(instance?.brand.publicSiteUrl??process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3000').replace(/\/$/,'');
  const brandName=instance?.brand.name??'Webáruház';
  const paragraphs=item.body.split(/\n\s*\n/).filter(Boolean);
  const structured={'@context':'https://schema.org','@type':'WebPage',name:item.title,description:item.seoDescription??item.excerpt??undefined,url:`${base}/oldal/${item.slug}`,dateModified:item.updatedAt,isPartOf:{'@type':'WebSite',name:brandName,url:base}};
  return <main><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured)}}/><section className="hero"><div className="shell"><span className="eyebrow">{item.title}</span><h1>{item.heroTitle??item.title}</h1>{(item.heroSubtitle??item.excerpt)&&<p className="lead">{item.heroSubtitle??item.excerpt}</p>}{item.ctaLabel&&item.ctaHref&&<Link className="btn btnPrimary" href={item.ctaHref}>{item.ctaLabel}</Link>}</div></section><section className="section"><div className="shell"><div className="featurePanel">{paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div></div></section></main>;
}
